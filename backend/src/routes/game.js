const express = require('express');
const { verifyFirebaseToken } = require('../middleware/auth');
const { firestore, docData, serverTimestamp } = require('../firestore');
const { grantXpAndLevelUp } = require('../utils/leveling');
const { applyLoot } = require('../utils/loot');
const { claimWheelTurns } = require('../utils/dailyLimit');

const router = express.Router();

function xpRewardForEnemy(enemy) {
  const maxHp = enemy?.max_hp || 15;
  return Math.max(10, Math.min(80, Math.round(maxHp * 1.5)));
}

async function ownedCharacter(uid, characterId) {
  const character = docData(await firestore.collection('characters').doc(characterId).get());
  return character?.ownerUid === uid ? character : null;
}

async function ownedSession(uid, sessionId) {
  const session = docData(await firestore.collection('sessions').doc(sessionId).get());
  return session?.ownerUid === uid ? session : null;
}

router.use(verifyFirebaseToken);

router.get('/sessions', async (req, res) => {
  const { characterId } = req.query;
  if (!characterId) return res.status(400).json({ error: 'characterId gerekli' });
  try {
    if (!await ownedCharacter(req.firebaseUser.uid, characterId)) {
      return res.status(404).json({ error: 'Karakter bulunamadı' });
    }
    const snapshot = await firestore.collection('sessions')
      .where('characterId', '==', characterId)
      .get();
    const sessions = snapshot.docs.map(docData).sort((left, right) => {
      const leftTime = new Date(left.updated_at || 0).getTime();
      const rightTime = new Date(right.updated_at || 0).getTime();
      return rightTime - leftTime;
    });
    return res.json({ sessions });
  } catch (err) {
    return res.status(500).json({ error: 'Oturumlar alınamadı' });
  }
});

router.post('/sessions', async (req, res) => {
  const { characterId, scenario, title } = req.body;
  try {
    if (!await ownedCharacter(req.firebaseUser.uid, characterId)) {
      return res.status(404).json({ error: 'Karakter bulunamadı' });
    }
    const ref = firestore.collection('sessions').doc();
    await ref.set({
      id: ref.id,
      characterId,
      character_id: characterId,
      ownerUid: req.firebaseUser.uid,
      scenario: scenario || 'custom',
      title: title || 'Yeni Macera',
      story_summary: '',
      current_enemy: null,
      current_scene: 'camp',
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
    });
    return res.json({ sessionId: ref.id });
  } catch (err) {
    return res.status(500).json({ error: 'Oturum oluşturulamadı' });
  }
});

router.delete('/sessions/:sessionId', async (req, res) => {
  try {
    const session = await ownedSession(req.firebaseUser.uid, req.params.sessionId);
    if (!session) return res.status(404).json({ error: 'Oturum bulunamadı' });
    const ref = firestore.collection('sessions').doc(req.params.sessionId);
    const messages = await ref.collection('messages').get();
    const batch = firestore.batch();
    messages.docs.forEach((doc) => batch.delete(doc.ref));
    batch.delete(ref);
    await batch.commit();
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: 'Oturum silinemedi' });
  }
});

router.get('/sessions/:sessionId', async (req, res) => {
  try {
    const session = await ownedSession(req.firebaseUser.uid, req.params.sessionId);
    if (!session) return res.status(404).json({ error: 'Oturum bulunamadı' });
    return res.json({ session });
  } catch (err) {
    return res.status(500).json({ error: 'Oturum alınamadı' });
  }
});

router.get('/sessions/:sessionId/messages', async (req, res) => {
  try {
    const session = await ownedSession(req.firebaseUser.uid, req.params.sessionId);
    if (!session) return res.status(404).json({ error: 'Oturum bulunamadı' });
    const snapshot = await firestore.collection('sessions').doc(req.params.sessionId)
      .collection('messages')
      .orderBy('created_at', 'asc')
      .get();
    return res.json({ messages: snapshot.docs.map(docData) });
  } catch (err) {
    return res.status(500).json({ error: 'Mesajlar alınamadı' });
  }
});

router.post('/combat/attack', async (req, res) => {
  const { characterId, sessionId, targetAC } = req.body;
  if (!characterId) return res.status(400).json({ error: 'characterId gerekli' });

  try {
    const character = await ownedCharacter(req.firebaseUser.uid, characterId);
    if (!character) return res.status(404).json({ error: 'Karakter bulunamadı' });
    if (character.status === 'dead' || character.status === 'unconscious' || character.hp <= 0) {
      return res.status(403).json({ error: 'Ölü veya baygın karakter savaşamaz' });
    }

    const session = sessionId ? await ownedSession(req.firebaseUser.uid, sessionId) : null;
    if (sessionId && !session) return res.status(404).json({ error: 'Oturum bulunamadı' });

    const characterRef = firestore.collection('characters').doc(characterId);
    const [inventorySnapshot, perksSnapshot, followersSnapshot] = await Promise.all([
      characterRef.collection('inventory').get(),
      characterRef.collection('perks').get(),
      characterRef.collection('npcs').where('is_follower', '==', 1).get(),
    ]);
    const inventory = inventorySnapshot.docs.map(docData);
    const perkIds = perksSnapshot.docs.map((doc) => doc.data().perk_id || doc.id);
    const followers = followersSnapshot.docs.map(docData)
      .filter((follower) => !follower.follower_status || follower.follower_status === 'active');
    const { calcPerkBonuses } = require('../data/skillTree');
    const perkBonuses = calcPerkBonuses(character.class, perkIds);
    const weapon = inventory.find((item) => item.type === 'weapon' && item.equipped)
      || { name: 'Yumruk', description: '1d4 ezici hasar.' };

    const isRanged = /menzilli|yay|sapan/i.test(weapon.description || '');
    const isFinesse = /hançer|kısa kılıç|finesse/i.test(weapon.name || '');
    const strengthModifier = Math.floor((character.strength - 10) / 2);
    const dexterityModifier = Math.floor((character.dexterity - 10) / 2);
    const attackModifier = isRanged
      ? dexterityModifier
      : isFinesse ? Math.max(strengthModifier, dexterityModifier) : strengthModifier;
    const proficiencyBonus = Math.ceil(character.level / 4) + 1;
    const attackRoll = Math.floor(Math.random() * 20) + 1;
    const attackTotal = attackRoll + attackModifier + proficiencyBonus;
    const isCritical = attackRoll === 20
      || Boolean(perkBonuses.critChance && Math.random() * 100 < perkBonuses.critChance && attackRoll >= 15);
    const isCritFail = attackRoll === 1;

    const enemies = Array.isArray(session?.current_enemy)
      ? session.current_enemy.map((enemy) => ({ ...enemy }))
      : session?.current_enemy?.name ? [{ ...session.current_enemy }] : [];
    const enemy = enemies.find((entry) => entry.hp > 0) || null;
    const enemyAC = Number(enemy?.ac || targetAC || 13);
    const isHit = isCritical || (!isCritFail && attackTotal >= enemyAC);
    const damageMatch = (weapon.description || '').match(/(\d+)d(\d+)/);
    const damageCount = damageMatch ? Number(damageMatch[1]) : 1;
    const damageSides = damageMatch ? Number(damageMatch[2]) : 4;
    const damageRolls = [];
    let damageTotal = 0;

    if (isHit) {
      const rollCount = isCritical ? damageCount * 2 : damageCount;
      for (let index = 0; index < rollCount; index += 1) {
        const roll = Math.floor(Math.random() * damageSides) + 1;
        damageRolls.push(roll);
        damageTotal += roll;
      }
      damageTotal = Math.max(1, damageTotal + attackModifier + (perkBonuses.bonusDamage || 0));
    }

    if (enemy && isHit) enemy.hp = Math.max(0, enemy.hp - damageTotal);
    if (enemy?.hp <= 0) enemy.dead = true;

    let followerAssist = null;
    if (enemy && enemy.hp > 0 && followers.length) {
      const follower = followers[Math.floor(Math.random() * followers.length)];
      const followerRoll = Math.floor(Math.random() * 20) + 1;
      const followerHit = followerRoll + 2 >= enemyAC;
      const followerDamage = followerHit ? Math.floor(Math.random() * 6) + 2 : 0;
      if (followerHit) enemy.hp = Math.max(0, enemy.hp - followerDamage);
      if (enemy.hp <= 0) enemy.dead = true;
      followerAssist = {
        name: follower.name,
        isHit: followerHit,
        damage: followerDamage,
        summary: followerHit
          ? `${follower.name} da saldırdı ve ${followerDamage} hasar verdi!`
          : `${follower.name} da saldırdı ama ıskaladı.`,
      };
    }

    if (session && enemy) {
      const aliveEnemies = enemies.filter((entry) => entry.hp > 0);
      await firestore.collection('sessions').doc(sessionId).update({
        current_enemy: aliveEnemies.length ? aliveEnemies : null,
        updated_at: serverTimestamp(),
      });
    }

    let xpGained = 0;
    let loot = null;
    let updatedCharacter = null;
    if (enemy?.dead) {
      loot = await applyLoot(characterId, enemy);
      xpGained = xpRewardForEnemy(enemy);
      updatedCharacter = (await grantXpAndLevelUp(characterId, xpGained)).character;
    }

    const enemyResponse = enemy
      ? { name: enemy.name, hp: enemy.hp, max_hp: enemy.max_hp, ac: enemy.ac, dead: Boolean(enemy.dead) }
      : null;
    const aliveEnemyResponses = enemy ? enemies
      .filter((entry) => entry.hp > 0)
      .map((entry) => ({ name: entry.name, hp: entry.hp, max_hp: entry.max_hp, ac: entry.ac })) : null;

    return res.json({
      weapon: weapon.name,
      attackRoll,
      attackMod: attackModifier + proficiencyBonus,
      attackTotal,
      enemyAC,
      isHit,
      isCritical,
      isCritFail,
      damageRolls,
      damageDice: `${isCritical ? damageCount * 2 : damageCount}d${damageSides}`,
      damageTotal,
      damageMod: attackModifier,
      enemy: enemyResponse,
      enemies: aliveEnemyResponses,
      followerAssist,
      xpGained,
      loot,
      character: updatedCharacter,
      summary: isCritFail
        ? 'Kritik başarısızlık! Saldırı ıskaladı.'
        : isCritical
          ? `KRİTİK İSABET! ${damageTotal} hasar!`
          : isHit ? `İsabet! ${damageTotal} hasar.` : 'Saldırı ıskaladı.',
    });
  } catch (err) {
    console.error('Combat Firestore error:', err.stack || err.message);
    return res.status(500).json({ error: 'Savaş işlemi tamamlanamadı' });
  }
});

const WHEEL_REWARDS = [
  { id: 'gold_15', type: 'gold', value: 15, weight: 22, label: '15 Altın', icon: 'coins' },
  { id: 'gold_30', type: 'gold', value: 30, weight: 14, label: '30 Altın', icon: 'coins' },
  { id: 'gold_50', type: 'gold', value: 50, weight: 8, label: '50 Altın', icon: 'coins' },
  { id: 'potion_heal', type: 'item', item: { name: 'Küçük İyileşme İksiri', type: 'potion', description: '2d4+2 HP iyileştirir.', quantity: 1 }, weight: 16, label: 'İyileşme İksiri', icon: 'potion' },
  { id: 'potion_mana', type: 'item', item: { name: 'Mana İksiri', type: 'potion', description: 'Bir büyü slotunu yeniler.', quantity: 1 }, weight: 10, label: 'Mana İksiri', icon: 'potion' },
  { id: 'extra_turns_5', type: 'turns', value: 5, weight: 18, label: '+5 Hamle Hakkı', icon: 'turns' },
  { id: 'temp_boost_str', type: 'temp_stat', stat: 'strength', value: 2, durationHours: 1, weight: 6, label: '+2 Güç (1 saat)', icon: 'stat' },
  { id: 'temp_boost_dex', type: 'temp_stat', stat: 'dexterity', value: 2, durationHours: 1, weight: 4, label: '+2 Çeviklik (1 saat)', icon: 'stat' },
  { id: 'rare_amulet', type: 'item', item: { name: 'Kader Tılsımı', type: 'misc', description: 'Kaderin sana gülümsediği anlarda parlar.' }, weight: 2, label: 'Kader Tılsımı', icon: 'rare' },
];

function getTodayIstanbul() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Istanbul' });
}

function pickWheelReward() {
  const total = WHEEL_REWARDS.reduce((sum, reward) => sum + reward.weight, 0);
  let roll = Math.random() * total;
  for (const reward of WHEEL_REWARDS) {
    if (roll < reward.weight) return reward;
    roll -= reward.weight;
  }
  return WHEEL_REWARDS[WHEEL_REWARDS.length - 1];
}

router.post('/wheel-spin', async (req, res) => {
  const { characterId } = req.body;
  if (!characterId) return res.status(400).json({ error: 'characterId gerekli' });

  try {
    const character = await ownedCharacter(req.firebaseUser.uid, characterId);
    if (!character) return res.status(404).json({ error: 'Karakter bulunamadı' });

    const characterRef = firestore.collection('characters').doc(characterId);
    const today = getTodayIstanbul();
    if (character.last_wheel_spin_date === today) {
      return res.status(429).json({ error: 'Bugün zaten Kader Çarkı\'nı çevirdin', nextSpin: 'yarın' });
    }

    const reward = pickWheelReward();
    const batch = firestore.batch();
    batch.update(characterRef, { last_wheel_spin_date: today, updated_at: serverTimestamp() });

    let appliedMessage = '';
    if (reward.type === 'gold') {
      batch.update(characterRef, { gold: (character.gold || 0) + reward.value });
      appliedMessage = `${reward.value} altın kazandın!`;
    } else if (reward.type === 'item') {
      const itemRef = characterRef.collection('inventory').doc();
      batch.set(itemRef, {
        id: itemRef.id,
        name: reward.item.name,
        type: reward.item.type,
        description: reward.item.description,
        quantity: reward.item.quantity || 1,
        equipped: 0,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      });
      appliedMessage = `${reward.item.name} envanterine eklendi!`;
    } else if (reward.type === 'turns') {
      const turnStatus = await claimWheelTurns(req.firebaseUser.uid, reward.value);
      appliedMessage = `Bugün ${reward.value} ekstra hamle kazandın!`;
      if (turnStatus.premium) appliedMessage = 'Premium kullanıcılar için ekstra hamle kaydedildi.';
    } else if (reward.type === 'temp_stat') {
      const expiresAt = new Date(Date.now() + reward.durationHours * 60 * 60 * 1000);
      const tempBoosts = character.temp_stat_boosts || {};
      tempBoosts[reward.stat] = { value: reward.value, expires_at: expiresAt.toISOString() };
      batch.update(characterRef, { temp_stat_boosts: tempBoosts });
      appliedMessage = `${reward.stat} +${reward.value} (1 saat)!`;
    }

    await batch.commit();
    const updatedCharacter = docData(await characterRef.get());
    const inventorySnapshot = await characterRef.collection('inventory').get();
    const inventory = inventorySnapshot.docs.map(docData);

    return res.json({ ok: true, reward, message: appliedMessage, character: updatedCharacter, inventory });
  } catch (err) {
    console.error('Wheel spin error:', err.stack || err.message);
    return res.status(500).json({ error: 'Çark çevrilemedi' });
  }
});

router.post('/roll', (req, res) => {
  const { dice, count = 1, modifier = 0 } = req.body;
  const sides = parseInt(dice?.replace('d', ''), 10) || 20;
  const rolls = [];
  let total = 0;
  for (let index = 0; index < count; index += 1) {
    const roll = Math.floor(Math.random() * sides) + 1;
    rolls.push(roll);
    total += roll;
  }
  total += parseInt(modifier, 10);
  res.json({ dice: `${count}d${sides}`, rolls, modifier, total });
});

module.exports = router;
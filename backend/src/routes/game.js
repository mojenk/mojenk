const express = require('express');
const { verifyFirebaseToken } = require('../middleware/auth');
const { firestore, docData, serverTimestamp } = require('../firestore');
const { grantXpAndLevelUp } = require('../utils/leveling');
const { applyLoot } = require('../utils/loot');

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
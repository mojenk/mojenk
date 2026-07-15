const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { verifyFirebaseToken } = require('../middleware/auth');
const { firestore, docData, serverTimestamp } = require('../firestore');
const { deleteCharacterCascade } = require('../utils/deleteCharacterCascade');
const { determineFollowerRole, followerMaxHp } = require('../utils/follower');

const router = express.Router();

const STARTING_ITEMS = {
  Savaşçı: [
    { name: 'Kılıç', type: 'weapon', description: '1d8 kesici hasar.', equipped: 1 },
    { name: 'Kalkan', type: 'armor', description: '+2 AC bonus.', equipped: 1, ac_bonus: 2 },
    { name: 'Küçük İyileşme İksiri', type: 'potion', description: '2d4+2 HP iyileştirir.', quantity: 2 },
  ],
  Büyücü: [
    { name: 'Asa', type: 'weapon', description: '1d6 ezici hasar.', equipped: 1 },
    { name: 'Büyü Kitabı', type: 'misc', description: 'Temel büyüler içerir.' },
    { name: 'Mana İksiri', type: 'potion', description: 'Bir büyü slotunu yeniler.', quantity: 1 },
    { name: 'Küçük İyileşme İksiri', type: 'potion', description: '2d4+2 HP iyileştirir.', quantity: 2 },
  ],
  Hırsız: [
    { name: 'Hançer', type: 'weapon', description: '1d4 delici hasar. Sinsi saldırıda ekstra 1d6.', equipped: 1 },
    { name: 'Kısa Kılıç', type: 'weapon', description: '1d6 delici hasar.' },
    { name: 'Deri Zırh', type: 'armor', description: '+1 AC bonus.', equipped: 1, ac_bonus: 1 },
    { name: 'Kanca İpi', type: 'misc', description: 'Tırmanmak için kullanılır.' },
    { name: 'Küçük İyileşme İksiri', type: 'potion', description: '2d4+2 HP iyileştirir.', quantity: 2 },
  ],
  Rahip: [
    { name: 'Topuz', type: 'weapon', description: '1d6 ezici hasar.', equipped: 1 },
    { name: 'Kutsal Sembol', type: 'misc', description: 'İyileştirme büyüleri için gerekli.' },
    { name: 'Zincir Gömlek', type: 'armor', description: '+3 AC bonus.', equipped: 1, ac_bonus: 3 },
    { name: 'Küçük İyileşme İksiri', type: 'potion', description: '2d4+2 HP iyileştirir.', quantity: 3 },
  ],
  Avcı: [
    { name: 'Uzun Yay', type: 'weapon', description: '1d8 delici hasar (menzilli).', equipped: 1 },
    { name: 'Kısa Kılıç', type: 'weapon', description: '1d6 delici hasar.' },
    { name: 'Deri Zırh', type: 'armor', description: '+1 AC bonus.', equipped: 1, ac_bonus: 1 },
    { name: 'Ok Kılıfı (20 ok)', type: 'misc', description: 'Yay için oklar.' },
    { name: 'Küçük İyileşme İksiri', type: 'potion', description: '2d4+2 HP iyileştirir.', quantity: 2 },
  ],
  Barbar: [
    { name: 'Büyük Balta', type: 'weapon', description: '1d12 kesici hasar.', equipped: 1 },
    { name: 'Deri Zırh', type: 'armor', description: '+1 AC bonus.', equipped: 1, ac_bonus: 1 },
    { name: 'El Baltası', type: 'weapon', description: '1d6 kesici hasar (fırlatılabilir).' },
    { name: 'Küçük İyileşme İksiri', type: 'potion', description: '2d4+2 HP iyileştirir.', quantity: 2 },
  ],
};

const RACE_BONUSES = {
  İnsan: { strength: 1, dexterity: 1, constitution: 1, intelligence: 1, wisdom: 1, charisma: 1 },
  Elf: { dexterity: 2, wisdom: 1 },
  Cüce: { constitution: 2, strength: 1 },
  'Yarı-Ork': { strength: 2, constitution: 1 },
  Hobit: { dexterity: 2, charisma: 1 },
  İblissoyu: { charisma: 2, intelligence: 1 },
};

const CLASS_BONUSES = {
  Savaşçı: { strength: 1 },
  Büyücü: { intelligence: 1 },
  Hırsız: { dexterity: 1 },
  Rahip: { wisdom: 1 },
  Avcı: { dexterity: 1 },
  Barbar: { strength: 1 },
};

const HIT_DICE = { Savaşçı: 10, Rahip: 10, Barbar: 12, Büyücü: 8, Hırsız: 8, Avcı: 8 };
const POINT_COST = { 8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9 };
const MAX_POINTS = 27;
const MAX_STAT = 20;

function rollDie(sides) {
  return Math.floor(Math.random() * sides) + 1;
}

function parseAcBonus(description) {
  const match = (description || '').match(/\+(\d+)\s*AC/i);
  return match ? parseInt(match[1], 10) : 0;
}

async function getOwnedCharacter(req, res, id) {
  const character = docData(await firestore.collection('characters').doc(id).get());
  if (!character) {
    res.status(404).json({ error: 'Karakter bulunamadı' });
    return null;
  }
  if (character.ownerUid !== req.firebaseUser.uid) {
    res.status(403).json({ error: 'Bu karakter size ait değil' });
    return null;
  }
  return character;
}

async function listSubcollection(characterId, name, orderField = 'created_at', direction = 'asc') {
  let query = firestore.collection('characters').doc(characterId).collection(name);
  if (orderField) query = query.orderBy(orderField, direction);
  const snapshot = await query.get();
  return snapshot.docs.map(docData);
}

async function calculateArmorClass(character, inventory) {
  const dexMod = Math.floor(((character.dexterity || 10) - 10) / 2);
  return 10 + inventory
    .filter((item) => item.type === 'armor' && item.equipped)
    .reduce((sum, item) => sum + parseAcBonus(item.description), dexMod);
}

router.use(verifyFirebaseToken);

router.get('/', async (req, res) => {
  try {
    const snapshot = await firestore.collection('characters')
      .where('ownerUid', '==', req.firebaseUser.uid)
      .get();
    const characters = snapshot.docs.map(docData).sort((left, right) => {
      const leftTime = new Date(left.created_at || 0).getTime();
      const rightTime = new Date(right.created_at || 0).getTime();
      return rightTime - leftTime;
    });
    res.json({ characters });
  } catch (err) {
    console.error('List characters Firestore error:', err.message);
    res.status(500).json({ error: 'Karakterler alınamadı' });
  }
});

router.get('/fallen', async (req, res) => {
  try {
    const snapshot = await firestore.collection('fallenHeroes')
      .where('ownerUid', '==', req.firebaseUser.uid)
      .limit(50)
      .get();
    const heroes = snapshot.docs.map(docData).sort((left, right) => {
      const leftTime = new Date(left.died_at || 0).getTime();
      const rightTime = new Date(right.died_at || 0).getTime();
      return rightTime - leftTime;
    });
    res.json({ heroes });
  } catch (err) {
    res.status(500).json({ error: 'Şöhret salonu alınamadı' });
  }
});

router.get('/:id/npcs', async (req, res) => {
  try {
    const character = await getOwnedCharacter(req, res, req.params.id);
    if (!character) return;
    res.json({ npcs: await listSubcollection(req.params.id, 'npcs', 'updated_at', 'desc') });
  } catch (err) {
    res.status(500).json({ error: 'NPC listesi alınamadı' });
  }
});

router.get('/:id/quests', async (req, res) => {
  try {
    const character = await getOwnedCharacter(req, res, req.params.id);
    if (!character) return;
    res.json({ quests: await listSubcollection(req.params.id, 'quests', 'created_at', 'desc') });
  } catch (err) {
    res.status(500).json({ error: 'Görevler alınamadı' });
  }
});

router.get('/:id/perks', async (req, res) => {
  try {
    const character = await getOwnedCharacter(req, res, req.params.id);
    if (!character) return;
    const perks = await listSubcollection(req.params.id, 'perks');
    const { SKILL_TREE, TIER_LEVELS } = require('../data/skillTree');
    res.json({
      className: character.class,
      level: character.level,
      pendingPoints: character.pending_perk_points || 0,
      unlockedIds: perks.map((perk) => perk.perk_id || perk.id),
      tree: SKILL_TREE[character.class] || [],
      tierLevels: TIER_LEVELS,
    });
  } catch (err) {
    res.status(500).json({ error: 'Yetenek ağacı alınamadı' });
  }
});

router.post('/', async (req, res) => {
  const { name, race, charClass, strength, dexterity, constitution, intelligence, wisdom, charisma, background } = req.body;
  if (!name || !race || !charClass) return res.status(400).json({ error: 'Eksik alan' });

  const statValues = [strength, dexterity, constitution, intelligence, wisdom, charisma];
  if (statValues.some((value) => typeof value !== 'number' || value < 8 || value > 15)) {
    return res.status(400).json({ error: 'Statlar 8-15 arasında olmalı' });
  }
  const totalCost = statValues.reduce((sum, value) => sum + (POINT_COST[value] || 0), 0);
  if (totalCost > MAX_POINTS) return res.status(400).json({ error: `Puan bütçesi aşıldı (${totalCost}/${MAX_POINTS})` });

  const raceBonus = RACE_BONUSES[race] || {};
  const classBonus = CLASS_BONUSES[charClass] || {};
  const finalStats = Object.fromEntries(
    Object.entries({ strength, dexterity, constitution, intelligence, wisdom, charisma })
      .map(([stat, value]) => [stat, Math.min(MAX_STAT, value + (raceBonus[stat] || 0) + (classBonus[stat] || 0))])
  );
  const startingItems = STARTING_ITEMS[charClass] || [];
  const armorBonus = startingItems
    .filter((item) => item.type === 'armor' && item.equipped)
    .reduce((sum, item) => sum + (item.ac_bonus || parseAcBonus(item.description)), 0);
  const hp = 10 + Math.floor((finalStats.constitution - 10) / 2);
  try {
    const characterRef = firestore.collection('characters').doc();
    const batch = firestore.batch();
    const character = {
      id: characterRef.id,
      ownerUid: req.firebaseUser.uid,
      user_id: req.firebaseUser.uid,
      name: name.trim(),
      race,
      class: charClass,
      background: background || '',
      ...finalStats,
      hp,
      max_hp: hp,
      armor_class: 10 + Math.floor((finalStats.dexterity - 10) / 2) + armorBonus,
      status: 'alive',
      gold: 100,
      level: 1,
      experience: 0,
      pending_stat_point: 0,
      pending_perk_points: 0,
      death_saves_success: 0,
      death_saves_fail: 0,
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
    };
    batch.set(characterRef, character);
    startingItems.forEach((item) => {
      const itemRef = characterRef.collection('inventory').doc();
      batch.set(itemRef, {
        id: itemRef.id,
        ...item,
        quantity: item.quantity || 1,
        equipped: item.equipped || 0,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      });
    });
    await batch.commit();
    res.json({ character: docData(await characterRef.get()) });
  } catch (err) {
    console.error('Create character Firestore error:', err.stack || err.message);
    res.status(500).json({ error: 'Karakter oluşturulamadı' });
  }
});

router.patch('/:id/hp', async (req, res) => {
  try {
    const character = await getOwnedCharacter(req, res, req.params.id);
    if (!character) return;
    const hp = Math.max(0, Math.min(character.max_hp, Number(req.body.hp)));
    await firestore.collection('characters').doc(req.params.id).update({
      hp,
      status: hp <= 0 ? 'unconscious' : character.status,
      updated_at: serverTimestamp(),
    });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'HP güncellenemedi' });
  }
});

router.post('/:id/inventory', async (req, res) => {
  try {
    const character = await getOwnedCharacter(req, res, req.params.id);
    if (!character) return;
    const itemRef = firestore.collection('characters').doc(req.params.id).collection('inventory').doc();
    await itemRef.set({
      id: itemRef.id,
      name: req.body.name,
      type: req.body.type || 'misc',
      description: req.body.description || '',
      quantity: Number(req.body.quantity) || 1,
      equipped: 0,
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
    });
    res.json({ ok: true, itemId: itemRef.id });
  } catch (err) {
    res.status(500).json({ error: 'Eşya eklenemedi' });
  }
});

router.post('/:id/inventory/:itemId/use', async (req, res) => {
  const { id, itemId } = req.params;
  try {
    const character = await getOwnedCharacter(req, res, id);
    if (!character) return;
    const itemRef = firestore.collection('characters').doc(id).collection('inventory').doc(itemId);
    const item = docData(await itemRef.get());
    if (!item) return res.status(404).json({ error: 'Eşya bulunamadı' });
    if (item.type !== 'potion') return res.status(400).json({ error: 'Bu eşya kullanılamaz' });

    const healMatch = item.description.match(/(\d+)d(\d+)\+?(\d*)/);
    let healAmount = 0;
    if (healMatch) {
      for (let index = 0; index < Number(healMatch[1]); index += 1) healAmount += rollDie(Number(healMatch[2]));
      healAmount += Number(healMatch[3] || 0);
    } else {
      healAmount = rollDie(8) + 1;
    }
    const newHp = Math.min(character.max_hp, character.hp + healAmount);
    const batch = firestore.batch();
    batch.update(firestore.collection('characters').doc(id), { hp: newHp, updated_at: serverTimestamp() });
    if ((item.quantity || 1) > 1) {
      batch.update(itemRef, { quantity: item.quantity - 1, updated_at: serverTimestamp() });
    } else {
      batch.delete(itemRef);
    }
    await batch.commit();
    const updated = docData(await firestore.collection('characters').doc(id).get());
    const inventory = await listSubcollection(id, 'inventory');
    res.json({ ok: true, message: `${item.name} kullanıldı! +${healAmount} HP`, healAmount, character: updated, inventory });
  } catch (err) {
    res.status(500).json({ error: 'Eşya kullanılamadı' });
  }
});

router.post('/:id/inventory/:itemId/equip', async (req, res) => {
  const { id, itemId } = req.params;
  try {
    const character = await getOwnedCharacter(req, res, id);
    if (!character) return;
    const inventory = await listSubcollection(id, 'inventory');
    const item = inventory.find((entry) => entry.id === itemId);
    if (!item) return res.status(404).json({ error: 'Eşya bulunamadı' });
    if (!['weapon', 'armor'].includes(item.type)) return res.status(400).json({ error: 'Bu eşya kuşanılamaz' });

    const batch = firestore.batch();
    if (!item.equipped) {
      inventory.forEach((entry) => {
        if (entry.id === itemId || !entry.equipped || entry.type !== item.type) return;
        const isShield = item.name.toLowerCase().includes('kalkan');
        const entryIsShield = entry.name.toLowerCase().includes('kalkan');
        if (item.type === 'weapon' || isShield === entryIsShield) {
          batch.update(firestore.collection('characters').doc(id).collection('inventory').doc(entry.id), {
            equipped: 0,
            updated_at: serverTimestamp(),
          });
          entry.equipped = 0;
        }
      });
    }
    batch.update(firestore.collection('characters').doc(id).collection('inventory').doc(itemId), {
      equipped: item.equipped ? 0 : 1,
      updated_at: serverTimestamp(),
    });
    item.equipped = item.equipped ? 0 : 1;
    const armorClass = await calculateArmorClass(character, inventory);
    batch.update(firestore.collection('characters').doc(id), { armor_class: armorClass, updated_at: serverTimestamp() });
    await batch.commit();
    res.json({
      ok: true,
      character: docData(await firestore.collection('characters').doc(id).get()),
      inventory: await listSubcollection(id, 'inventory'),
    });
  } catch (err) {
    res.status(500).json({ error: 'Eşya kuşanılamadı' });
  }
});

router.post('/:id/inventory/:itemId/drop', async (req, res) => {
  const { id, itemId } = req.params;
  try {
    const character = await getOwnedCharacter(req, res, id);
    if (!character) return;
    const itemRef = firestore.collection('characters').doc(id).collection('inventory').doc(itemId);
    const item = docData(await itemRef.get());
    if (!item) return res.status(404).json({ error: 'Eşya bulunamadı' });
    await itemRef.delete();
    const inventory = await listSubcollection(id, 'inventory');
    const armorClass = await calculateArmorClass(character, inventory);
    await firestore.collection('characters').doc(id).update({ armor_class: armorClass, updated_at: serverTimestamp() });
    res.json({ ok: true, character: { ...character, armor_class: armorClass }, inventory });
  } catch (err) {
    res.status(500).json({ error: 'Eşya bırakılamadı' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const character = await getOwnedCharacter(req, res, req.params.id);
    if (!character) return;
    res.json({ ok: true, deleted: await deleteCharacterCascade(req.params.id) });
  } catch (err) {
    res.status(500).json({ error: 'Karakter silinemedi' });
  }
});

router.patch('/:id/level-up-stat', async (req, res) => {
  const validStats = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'];
  const stat = req.body.stat;
  if (!validStats.includes(stat)) return res.status(400).json({ error: 'Geçersiz stat' });
  try {
    const character = await getOwnedCharacter(req, res, req.params.id);
    if (!character) return;
    if (!character.pending_stat_point) return res.status(400).json({ error: 'Bekleyen stat puanı yok' });
    if (character[stat] >= MAX_STAT) return res.status(400).json({ error: 'Bu stat zaten maksimumda' });

    const updates = {
      [stat]: character[stat] + 1,
      pending_stat_point: character.pending_stat_point - 1,
      updated_at: serverTimestamp(),
    };
    if (stat === 'constitution') {
      const previousModifier = Math.floor((character.constitution - 10) / 2);
      const newModifier = Math.floor((updates.constitution - 10) / 2);
      const hpBonus = (newModifier - previousModifier) * character.level;
      updates.hp = character.hp + hpBonus;
      updates.max_hp = character.max_hp + hpBonus;
    }
    if (stat === 'dexterity') {
      const inventory = await listSubcollection(req.params.id, 'inventory');
      updates.armor_class = await calculateArmorClass({ ...character, dexterity: updates.dexterity }, inventory);
    }
    await firestore.collection('characters').doc(req.params.id).update(updates);
    res.json({ character: docData(await firestore.collection('characters').doc(req.params.id).get()) });
  } catch (err) {
    res.status(500).json({ error: 'Stat artırılamadı' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const character = await getOwnedCharacter(req, res, req.params.id);
    if (!character) return;
    const inventory = await listSubcollection(req.params.id, 'inventory');
    res.json({ character, inventory });
  } catch (err) {
    res.status(500).json({ error: 'Karakter alınamadı' });
  }
});

router.post('/:id/npcs/:npcId/hire', async (req, res) => {
  const { id, npcId } = req.params;
  try {
    const character = await getOwnedCharacter(req, res, id);
    if (!character) return;
    const npcRef = firestore.collection('characters').doc(id).collection('npcs').doc(npcId);
    const npc = docData(await npcRef.get());
    if (!npc) return res.status(404).json({ error: 'NPC bulunamadı' });
    if (npc.is_follower) return res.status(400).json({ error: 'Bu NPC zaten takipçin' });
    if (!npc.hire_cost) return res.status(400).json({ error: 'Bu NPC işe alınamaz' });
    if (character.gold < npc.hire_cost) return res.status(400).json({ error: 'Yeterli altının yok' });

    const maxHp = followerMaxHp(character.level);
    const batch = firestore.batch();
    batch.update(firestore.collection('characters').doc(id), { gold: character.gold - npc.hire_cost, updated_at: serverTimestamp() });
    batch.update(npcRef, {
      is_follower: 1,
      hire_cost: null,
      follower_role: determineFollowerRole(`${npc.description || ''} ${npc.notes || ''}`),
      follower_max_hp: maxHp,
      follower_hp: maxHp,
      follower_level: npc.follower_level || 1,
      follower_xp: npc.follower_xp || 0,
      follower_morale: npc.follower_morale || 60,
      follower_loyalty: npc.follower_loyalty || 60,
      follower_status: 'active',
      updated_at: serverTimestamp(),
    });
    await batch.commit();
    res.json({
      npc: docData(await npcRef.get()),
      character: docData(await firestore.collection('characters').doc(id).get()),
    });
  } catch (err) {
    res.status(500).json({ error: 'NPC işe alınamadı' });
  }
});

router.post('/:id/npcs/:npcId/dismiss', async (req, res) => {
  const { id, npcId } = req.params;
  try {
    const character = await getOwnedCharacter(req, res, id);
    if (!character) return;
    const npcRef = firestore.collection('characters').doc(id).collection('npcs').doc(npcId);
    const npc = docData(await npcRef.get());
    if (!npc) return res.status(404).json({ error: 'NPC bulunamadı' });
    await npcRef.update({
      is_follower: 0,
      follower_status: 'left',
      follower_hp: null,
      follower_max_hp: null,
      follower_role: null,
      updated_at: serverTimestamp(),
    });
    res.json({ npc: docData(await npcRef.get()) });
  } catch (err) {
    res.status(500).json({ error: 'Takipçi ayrılamadı' });
  }
});

router.patch('/:id/quests/:questId/abandon', async (req, res) => {
  try {
    const character = await getOwnedCharacter(req, res, req.params.id);
    if (!character) return;
    const questRef = firestore.collection('characters').doc(req.params.id).collection('quests').doc(req.params.questId);
    const quest = docData(await questRef.get());
    if (!quest || quest.status !== 'active') return res.status(404).json({ error: 'Aktif görev bulunamadı' });
    await questRef.update({ status: 'abandoned', completed_at: serverTimestamp(), updated_at: serverTimestamp() });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Görev bırakılamadı' });
  }
});

router.post('/:id/perks', async (req, res) => {
  const perkId = req.body.perkId;
  if (!perkId) return res.status(400).json({ error: 'perkId gerekli' });
  try {
    const character = await getOwnedCharacter(req, res, req.params.id);
    if (!character) return;
    if ((character.pending_perk_points || 0) <= 0) return res.status(400).json({ error: 'Yetenek puanın yok.' });

    const perks = await listSubcollection(req.params.id, 'perks');
    const existingIds = perks.map((perk) => perk.perk_id || perk.id);
    const { canUnlockPerk, calcPerkBonuses } = require('../data/skillTree');
    const check = canUnlockPerk(character.class, perkId, character.level, existingIds);
    if (!check.ok) return res.status(400).json({ error: check.reason });

    const allIds = [...existingIds, perkId];
    const previousBonuses = calcPerkBonuses(character.class, existingIds);
    const bonuses = calcPerkBonuses(character.class, allIds);
    const hpGain = (bonuses.bonusHP || 0) - (previousBonuses.bonusHP || 0);
    const characterRef = firestore.collection('characters').doc(req.params.id);
    const batch = firestore.batch();
    batch.set(characterRef.collection('perks').doc(perkId), {
      id: perkId,
      perk_id: perkId,
      tier: check.tier,
      created_at: serverTimestamp(),
    });
    batch.update(characterRef, {
      pending_perk_points: character.pending_perk_points - 1,
      hp: character.hp + Math.max(0, hpGain),
      max_hp: character.max_hp + Math.max(0, hpGain),
      updated_at: serverTimestamp(),
    });
    await batch.commit();
    res.json({ ok: true, character: docData(await characterRef.get()), perk: check.perk, bonuses });
  } catch (err) {
    res.status(500).json({ error: 'Yetenek açılamadı' });
  }
});

function getLevelUpHpGain(characterClass, constitutionModifier) {
  return Math.max(1, rollDie(HIT_DICE[characterClass] || 8) + constitutionModifier);
}

router.patch('/:id/reward', async (req, res) => {
  try {
    const character = await getOwnedCharacter(req, res, req.params.id);
    if (!character) return;
    const { sessionId, turnCount } = req.body;
    if (!sessionId || !Number.isInteger(turnCount) || turnCount <= 0 || turnCount % 15 !== 0) {
      return res.status(400).json({ error: 'Geçersiz hamle ödülü' });
    }
    const sessionRef = firestore.collection('sessions').doc(sessionId);
    const session = docData(await sessionRef.get());
    const sessionCharacterId = session?.character_id || session?.characterId;
    if (!session || sessionCharacterId !== req.params.id || (session.turn_count || 0) < turnCount) {
      return res.status(400).json({ error: 'Hamle ödülü doğrulanamadı' });
    }
    const claimRef = sessionRef.collection('rewardClaims').doc(`turn_${turnCount}`);
    const characterRef = firestore.collection('characters').doc(req.params.id);
    const newGold = Math.max(0, (character.gold || 0) + 10);
    await firestore.runTransaction(async (transaction) => {
      const claim = await transaction.get(claimRef);
      if (claim.exists) {
        const error = new Error('Ödül zaten alındı');
        error.code = 'ALREADY_CLAIMED';
        throw error;
      }
      transaction.update(characterRef, { gold: newGold, updated_at: serverTimestamp() });
      transaction.set(claimRef, {
        character_id: req.params.id,
        turn_count: turnCount,
        reward_gold: 10,
        claimed_at: serverTimestamp(),
      });
    });
    const newXp = character.xp || 0;
    res.json({ ok: true, gold: newGold, xp: newXp });
  } catch (err) {
    if (err.code === 'ALREADY_CLAIMED') {
      return res.status(409).json({ error: err.message });
    }
    console.error('Reward error:', err.message);
    res.status(500).json({ error: 'Ödül uygulanamadı' });
  }
});

module.exports = router;
module.exports.getLevelUpHpGain = getLevelUpHpGain;
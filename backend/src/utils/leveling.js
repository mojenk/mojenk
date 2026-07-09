const { firestore, docData, serverTimestamp } = require('../firestore');
const { getLevelUpHpGain } = require('../routes/character');

const XP_PER_LEVEL = 300;
const FOLLOWER_XP_PER_LEVEL = 200;
const MAX_LEVEL = 20;

async function grantXpAndLevelUp(characterId, xpAmount) {
  const xp = Math.max(0, Math.round(xpAmount || 0));
  const characterRef = firestore.collection('characters').doc(characterId);
  const character = docData(await characterRef.get());
  if (!character) {
    return { character: null, leveledUp: false, oldLevel: 0, newLevel: 0, followerEvents: [] };
  }

  const oldLevel = character.level || 1;
  let currentXp = (character.experience || 0) + xp;
  let levelsGained = 0;
  while (currentXp >= XP_PER_LEVEL && oldLevel + levelsGained < MAX_LEVEL) {
    currentXp -= XP_PER_LEVEL;
    levelsGained += 1;
  }

  const newLevel = oldLevel + levelsGained;
  const updates = {
    experience: currentXp,
    updated_at: serverTimestamp(),
  };
  if (levelsGained > 0) {
    const constitutionModifier = Math.floor(((character.constitution || 10) - 10) / 2);
    const hpGain = getLevelUpHpGain(character.class, constitutionModifier) * levelsGained;
    updates.level = newLevel;
    updates.max_hp = character.max_hp + hpGain;
    updates.hp = Math.min(updates.max_hp, character.hp + hpGain);
    updates.pending_stat_point = (character.pending_stat_point || 0) + levelsGained;
    updates.pending_perk_points = (character.pending_perk_points || 0) + levelsGained;
  }
  await characterRef.update(updates);

  const followerEvents = [];
  if (xp > 0) {
    const followerXp = Math.max(1, Math.round(xp * 0.4));
    const snapshot = await characterRef.collection('npcs').where('is_follower', '==', 1).get();
    const batch = firestore.batch();
    snapshot.docs.forEach((doc) => {
      const follower = docData(doc);
      if (follower.follower_status && follower.follower_status !== 'active') return;
      let level = follower.follower_level || 1;
      let currentFollowerXp = (follower.follower_xp || 0) + followerXp;
      const followerUpdates = { updated_at: serverTimestamp() };
      if (currentFollowerXp >= FOLLOWER_XP_PER_LEVEL && level < MAX_LEVEL) {
        currentFollowerXp -= FOLLOWER_XP_PER_LEVEL;
        level += 1;
        const hpBonus = 4 + Math.floor(level / 3);
        const maxHp = (follower.follower_max_hp || 20) + hpBonus;
        followerUpdates.follower_level = level;
        followerUpdates.follower_max_hp = maxHp;
        followerUpdates.follower_hp = Math.min(maxHp, (follower.follower_hp || maxHp) + hpBonus);
        followerUpdates.follower_morale = Math.min(100, (follower.follower_morale || 60) + 5);
        followerUpdates.follower_loyalty = Math.min(100, (follower.follower_loyalty || 60) + 5);
        followerEvents.push({ event: 'follower_levelup', name: follower.name, newLevel: level, hpBonus });
      }
      followerUpdates.follower_xp = currentFollowerXp;
      batch.update(doc.ref, followerUpdates);
    });
    if (!snapshot.empty) await batch.commit();
  }

  return {
    character: docData(await characterRef.get()),
    leveledUp: newLevel > oldLevel,
    oldLevel,
    newLevel,
    followerEvents,
  };
}

module.exports = { grantXpAndLevelUp, XP_PER_LEVEL, FOLLOWER_XP_PER_LEVEL };
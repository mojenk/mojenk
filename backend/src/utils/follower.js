const { firestore, docData, serverTimestamp } = require('../firestore');

const ROLE_LABELS_TR = {
  warrior: 'Savaşçı',
  healer: 'Şifacı',
  guardian: 'Koruyucu',
  rogue: 'Hilebaz',
  archer: 'Okçu',
};

function determineFollowerRole(text = '') {
  const normalized = text.toLowerCase();
  if (/şifa|rahip|hekim|iyileştir/.test(normalized)) return 'healer';
  if (/okçu|yay|nişancı/.test(normalized)) return 'archer';
  if (/hırsız|gizli|hile|suikast/.test(normalized)) return 'rogue';
  if (/kalkan|koruyucu|muhafız/.test(normalized)) return 'guardian';
  return 'warrior';
}

function followerMaxHp(level = 1) {
  return 16 + Math.max(1, Number(level)) * 4;
}

function calcFollowerMoodChange(event) {
  const changes = {
    victory: { morale: 8, loyalty: 5 },
    defeat: { morale: -10, loyalty: -5 },
    protected: { morale: 5, loyalty: 10 },
    quest_complete: { morale: 6, loyalty: 4 },
    quest_failed: { morale: -8, loyalty: -4 },
  };
  return changes[event] || { morale: 0, loyalty: 0 };
}

async function applyFollowerMoodEvent(characterId, followerName, event) {
  const snapshot = await firestore.collection('characters').doc(characterId).collection('npcs')
    .where('name', '==', followerName)
    .limit(1)
    .get();
  if (snapshot.empty) return null;
  const doc = snapshot.docs[0];
  const follower = docData(doc);
  if (!follower.is_follower) return null;
  const change = calcFollowerMoodChange(event);
  const morale = Math.max(0, Math.min(100, (follower.follower_morale || 60) + change.morale));
  const loyalty = Math.max(0, Math.min(100, (follower.follower_loyalty || 60) + change.loyalty));
  const leaveChance = morale < 20 && loyalty < 20 ? 0.15 : morale < 10 || loyalty < 10 ? 0.05 : 0;
  const left = leaveChance > 0 && Math.random() < leaveChance;
  await doc.ref.update({
    follower_morale: morale,
    follower_loyalty: loyalty,
    is_follower: left ? 0 : 1,
    follower_status: left ? 'left' : 'active',
    notes: left ? `${follower.notes || ''}\nDüşük moral ve sadakat nedeniyle gruptan ayrıldı.`.trim() : follower.notes || '',
    updated_at: serverTimestamp(),
  });
  return { ...follower, follower_morale: morale, follower_loyalty: loyalty, left };
}

async function applyAllFollowersMoodEvent(characterId, event) {
  const snapshot = await firestore.collection('characters').doc(characterId).collection('npcs')
    .where('is_follower', '==', 1)
    .get();
  const results = [];
  for (const doc of snapshot.docs) {
    const follower = docData(doc);
    if (!follower.follower_status || follower.follower_status === 'active') {
      results.push(await applyFollowerMoodEvent(characterId, follower.name, event));
    }
  }
  return results.filter(Boolean);
}

module.exports = {
  determineFollowerRole,
  followerMaxHp,
  ROLE_LABELS_TR,
  calcFollowerMoodChange,
  applyFollowerMoodEvent,
  applyAllFollowersMoodEvent,
};
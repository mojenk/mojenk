const express = require('express');
const router = express.Router();
const { verifyFirebaseToken } = require('../middleware/auth');
const { firestore, docData } = require('../firestore');

const RACE_ICON = {
  'İnsan': '/races/insan.png',
  'Elf': '/races/elf.png',
  'Cüce': '/races/cuce.png',
  'Yarı-Ork': '/races/yariork.png',
  'Hobit': '/races/hobit.png',
  'İblissoyu': '/races/iblissoyu.png',
  'Gnom': '/races/gnom.png',
  'Ejderha Doğumlu': '/races/ejderhadogumlu.png',
  'Melek Soylu': '/races/meleksoylu.png',
};

async function fetchTop(orderField, limit = 50) {
  const snap = await firestore.collection('characters')
    .orderBy(orderField, 'desc')
    .limit(limit)
    .get();
  const chars = snap.docs.map(docData).filter((c) => c && c.name);
  const uids = [...new Set(chars.map((c) => c.ownerUid).filter(Boolean))];
  const usernames = {};
  await Promise.all(uids.map(async (uid) => {
    try {
      const u = docData(await firestore.collection('users').doc(uid).get());
      usernames[uid] = u?.username || null;
    } catch { /* noop */ }
  }));
  return chars.map((c) => ({
    id: c.id,
    name: c.name,
    race: c.race || null,
    class: c.class || c.character_class || null,
    level: c.level || 1,
    gold: c.gold || 0,
    experience: c.experience || 0,
    title: c.equipped_title || null,
    owner: usernames[c.ownerUid] || null,
    is_own: false,
    portrait: RACE_ICON[c.race] || null,
    status: c.status || 'alive',
  }));
}

router.get('/', verifyFirebaseToken, async (req, res) => {
  try {
    const [byLevel, byGold] = await Promise.all([
      fetchTop('level'),
      fetchTop('gold'),
    ]);
    // Seviye aynıysa deneyim ile kır
    byLevel.sort((a, b) => (b.level - a.level) || (b.experience - a.experience));
    const mark = (list) => list.map((e, i) => ({ ...e, rank: i + 1 }));
    const markOwn = async (list) => {
      const snap = await firestore.collection('characters')
        .where('ownerUid', '==', req.firebaseUser.uid).get();
      const ownIds = new Set(snap.docs.map((d) => d.id));
      return list.map((e) => ({ ...e, is_own: ownIds.has(e.id) }));
    };
    res.json({
      level: await markOwn(mark(byLevel)),
      gold: await markOwn(mark(byGold)),
    });
  } catch (err) {
    console.error('leaderboard error:', err.message);
    res.status(500).json({ error: 'Liderlik tablosu alınamadı' });
  }
});

module.exports = router;

const express = require('express');
const { firestore, docData } = require('../firestore');

const router = express.Router();

function isActiveAnnouncement(doc) {
  const data = docData(doc);
  if (!data || data.active !== true) return false;
  if (data.expiresAt) {
    const expiry = data.expiresAt.toDate ? data.expiresAt.toDate() : new Date(data.expiresAt);
    if (expiry.getTime() < Date.now()) return false;
  }
  return true;
}

router.get('/', async (req, res) => {
  try {
    const snapshot = await firestore
      .collection('announcements')
      .where('active', '==', true)
      .orderBy('created_at', 'desc')
      .limit(20)
      .get();
    const announcements = snapshot.docs.filter(isActiveAnnouncement).map(docData);
    res.json({ announcements });
  } catch (err) {
    console.error('announcements error:', err);
    res.status(500).json({ error: 'Duyurular alınamadı', detail: err.message });
  }
});

module.exports = router;

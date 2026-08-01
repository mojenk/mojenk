const express = require('express');
const router = express.Router();
const { verifyFirebaseToken } = require('../middleware/auth');
const { getAchievementState } = require('../utils/achievements');

router.use(verifyFirebaseToken);

// GET /api/achievements — kullanıcının başarımları ve ilerlemesi
router.get('/', async (req, res) => {
  try {
    const state = await getAchievementState(req.firebaseUser.uid);
    res.json(state);
  } catch (err) {
    console.error('Achievements error:', err.message);
    res.status(500).json({ error: 'Başarımlar yüklenemedi' });
  }
});

module.exports = router;

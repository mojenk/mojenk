const express = require('express');
const router = express.Router();
const { verifyFirebaseToken } = require('../middleware/auth');
const { hasSetting } = require('../settings');
const { firestore, docData, serverTimestamp } = require('../firestore');

router.post('/gemini-key', verifyFirebaseToken, async (req, res) => {
  res.status(410).json({ error: 'Gemini anahtarı yalnızca Firebase Secret Manager üzerinden yapılandırılabilir' });
});

router.post('/admin', verifyFirebaseToken, async (req, res) => {
  try {
    if (await hasSetting('ADMIN_UIDS')) {
      return res.status(409).json({ error: 'Zaten yapılandırılmış' });
    }
    await setSetting('ADMIN_UIDS', req.firebaseUser.uid);
    const ref = firestore.collection('users').doc(req.firebaseUser.uid);
    const existing = docData(await ref.get());
    await ref.set({
      id: req.firebaseUser.uid,
      uid: req.firebaseUser.uid,
      firebase_uid: req.firebaseUser.uid,
      username: existing?.username || req.firebaseUser.name || req.firebaseUser.email?.split('@')[0] || `admin_${req.firebaseUser.uid.slice(0, 6)}`,
      email: req.firebaseUser.email || existing?.email || null,
      isAdmin: true,
      created_at: existing?.created_at || serverTimestamp(),
      updated_at: serverTimestamp(),
    }, { merge: true });
    res.json({ ok: true, uid: req.firebaseUser.uid });
  } catch (err) {
    console.error('setup/admin error:', err.message);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

module.exports = router;

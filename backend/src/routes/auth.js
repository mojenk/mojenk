const express = require('express');
const router = express.Router();
const { verifyFirebaseToken } = require('../middleware/auth');
const { firestore, docData, serverTimestamp } = require('../firestore');

router.get('/me', verifyFirebaseToken, async (req, res) => {
  const { uid, email, name, picture } = req.firebaseUser;
  const fallbackUsername = (name || email?.split('@')[0] || `kahraman_${uid.slice(0, 6)}`)
    .toString()
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9_ğüşöçıİĞÜŞÖÇ-]/g, '')
    .slice(0, 50) || `kahraman_${uid.slice(0, 6)}`;

  try {
    const ref = firestore.collection('users').doc(uid);
    const existing = docData(await ref.get());
    const user = {
      id: uid,
      uid,
      firebase_uid: uid,
      username: existing?.username || fallbackUsername,
      email: email || existing?.email || null,
      picture: picture || existing?.picture || null,
      isGuest: !email,
      created_at: existing?.created_at || serverTimestamp(),
      updated_at: serverTimestamp(),
    };
    await ref.set(user, { merge: true });
    const saved = docData(await ref.get());
    return res.json({ user: saved });
  } catch (err) {
    console.error('auth/me Firestore error:', err.stack || err.message);
    return res.status(500).json({ error: 'Firestore kullanıcı kaydı oluşturulamadı' });
  }
});

module.exports = router;
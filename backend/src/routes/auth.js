const express = require('express');
const router = express.Router();
const { verifyFirebaseToken } = require('../middleware/auth');
const { firestore, docData, serverTimestamp, deleteCharacterTree, admin } = require('../firestore');

const { isPremium } = require('../utils/premium');

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
      is_premium: await isPremium(uid),
      last_active_at: serverTimestamp(),
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

router.post('/heartbeat', verifyFirebaseToken, async (req, res) => {
  try {
    const ref = firestore.collection('users').doc(req.firebaseUser.uid);
    await ref.set({ last_active_at: serverTimestamp() }, { merge: true });
    return res.json({ ok: true });
  } catch (err) {
    console.error('auth/heartbeat error:', err.message);
    return res.status(500).json({ error: 'Sunucu hatası' });
  }
});

router.post('/fcm-token', verifyFirebaseToken, async (req, res) => {
  const { token, platform } = req.body;
  if (!token || typeof token !== 'string') {
    return res.status(400).json({ error: 'FCM token gerekli' });
  }
  try {
    const ref = firestore.collection('users').doc(req.firebaseUser.uid);
    await ref.set({
      fcm_tokens: admin.firestore.FieldValue.arrayUnion({
        token,
        platform: platform || 'unknown',
        created_at: serverTimestamp(),
      }),
      last_active_at: serverTimestamp(),
    }, { merge: true });
    return res.json({ ok: true });
  } catch (err) {
    console.error('auth/fcm-token error:', err.message);
    return res.status(500).json({ error: 'Sunucu hatası' });
  }
});

router.delete('/me', verifyFirebaseToken, async (req, res) => {
  const uid = req.firebaseUser.uid;
  try {
    const charsSnap = await firestore.collection('characters').where('user_id', '==', uid).get();
    for (const charDoc of charsSnap.docs) {
      await deleteCharacterTree(charDoc.id);
    }
    await firestore.collection('users').doc(uid).delete();
    await admin.auth().deleteUser(uid);
    return res.json({ ok: true });
  } catch (err) {
    console.error('Account deletion error:', err.stack || err.message);
    return res.status(500).json({ error: 'Hesap silinemedi' });
  }
});

module.exports = router;
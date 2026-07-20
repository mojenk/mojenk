const express = require('express');
const { verifyFirebaseToken } = require('../middleware/auth');
const { firestore, docData, serverTimestamp } = require('../firestore');
const { grantXpAndLevelUp } = require('../utils/leveling');
const { deleteCharacterCascade } = require('../utils/deleteCharacterCascade');

const { sendNotificationToAll } = require('../utils/notifications');

const router = express.Router();

async function requireAdmin(req, res, next) {
  const setting = await firestore.collection('appSettings').doc('ADMIN_UIDS').get();
  const raw = setting.exists ? String(setting.data().value || '') : '';
  const adminUids = raw.split(',').map((value) => value.trim()).filter(Boolean);
  if (!adminUids.includes(req.firebaseUser.uid)) {
    return res.status(403).json({ error: 'Admin yetkisi gerekli' });
  }
  return next();
}

router.use(verifyFirebaseToken, requireAdmin);

router.get('/check', (req, res) => {
  res.json({ isAdmin: true });
});

router.get('/characters', async (req, res) => {
  try {
    const search = String(req.query.username || '').toLocaleLowerCase('tr');
    const filters = {
      race: req.query.race,
      class: req.query.class,
      status: req.query.status,
      minLevel: Number(req.query.minLevel || 0),
    };
    const [charactersSnapshot, usersSnapshot] = await Promise.all([
      firestore.collection('characters').orderBy('created_at', 'desc').limit(500).get(),
      firestore.collection('users').limit(500).get(),
    ]);
    const users = new Map(usersSnapshot.docs.map((doc) => [doc.id, docData(doc)]));
    const characters = charactersSnapshot.docs
      .map(docData)
      .map((character) => ({
        ...character,
        owner_username: users.get(character.ownerUid)?.username || 'Bilinmeyen',
        owner_email: users.get(character.ownerUid)?.email || null,
        firebase_uid: character.ownerUid,
      }))
      .filter((character) => !search
        || character.name?.toLocaleLowerCase('tr').includes(search)
        || character.owner_username?.toLocaleLowerCase('tr').includes(search)
        || character.owner_email?.toLocaleLowerCase('tr').includes(search)
        || character.ownerUid?.toLocaleLowerCase('tr').includes(search))
      .filter((character) => !filters.race || character.race === filters.race)
      .filter((character) => !filters.class || character.class === filters.class)
      .filter((character) => !filters.status || character.status === filters.status)
      .filter((character) => !filters.minLevel || character.level >= filters.minLevel);
    return res.json({ characters });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/characters/:id/cheat', async (req, res) => {
  try {
    const characterRef = firestore.collection('characters').doc(req.params.id);
    const character = docData(await characterRef.get());
    if (!character) return res.status(404).json({ error: 'Karakter bulunamadı' });
    const { gold = 0, xp = 0, level = 0, hp = 0, maxHp = 0, stat = null, item = null, perkPoint = 0 } = req.body;
    const updates = { updated_at: serverTimestamp() };
    if (gold) updates.gold = Math.max(0, (character.gold || 0) + Number(gold));
    if (hp) updates.hp = Math.max(0, Math.min((character.max_hp || 1) + Number(maxHp || 0), (character.hp || 0) + Number(hp)));
    if (maxHp) {
      updates.max_hp = Math.max(1, (character.max_hp || 1) + Number(maxHp));
      updates.hp = Math.min(updates.max_hp, (updates.hp ?? character.hp) + Number(maxHp));
    }
    if (level) updates.level = Math.max(1, (character.level || 1) + Number(level));
    if (perkPoint) updates.pending_perk_points = Math.max(0, (character.pending_perk_points || 0) + Number(perkPoint));
    if (stat && ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'].includes(stat)) {
      updates[stat] = Math.min(20, (character[stat] || 10) + 1);
    }
    await characterRef.update(updates);
    let xpResult = null;
    if (xp) xpResult = await grantXpAndLevelUp(req.params.id, xp);
    if (item) {
      const itemRef = characterRef.collection('inventory').doc();
      await itemRef.set({
        id: itemRef.id,
        item_id: item.id || item.name,
        name: item.name,
        description: item.description || '',
        type: item.type || 'misc',
        value: item.value || 0,
        quantity: item.quantity || 1,
        equipped: 0,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      });
    }
    return res.json({ ok: true, character: docData(await characterRef.get()), xpResult });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.patch('/characters/:id', async (req, res) => {
  const allowed = ['name', 'race', 'class', 'strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma', 'hp', 'max_hp', 'gold', 'level'];
  const updates = Object.fromEntries(allowed.filter((key) => req.body[key] !== undefined).map((key) => [key, req.body[key]]));
  if (!Object.keys(updates).length) return res.status(400).json({ error: 'Güncellenecek alan yok' });
  try {
    const ref = firestore.collection('characters').doc(req.params.id);
    if (!(await ref.get()).exists) return res.status(404).json({ error: 'Karakter bulunamadı' });
    await ref.update({ ...updates, updated_at: serverTimestamp() });
    return res.json({ ok: true, character: docData(await ref.get()) });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/characters/:id/delete', async (req, res) => {
  try {
    return res.json({ ok: true, deleted: await deleteCharacterCascade(req.params.id) });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.get('/users', async (req, res) => {
  try {
    const snapshot = await firestore.collection('users').orderBy('created_at', 'desc').limit(500).get();
    return res.json({ users: snapshot.docs.map(docData) });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.patch('/users/:uid/premium', async (req, res) => {
  try {
    const { isPremium, expiresAt } = req.body;
    const userRef = firestore.collection('users').doc(req.params.uid);
    const userDoc = await userRef.get();
    if (!userDoc.exists) return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
    const updates = {
      is_premium: Boolean(isPremium),
      premium_updated_at: serverTimestamp(),
      premium_updated_by: req.firebaseUser.uid,
    };
    if (expiresAt) {
      updates.premium_until = new Date(expiresAt);
    } else if (isPremium === false) {
      updates.premium_until = null;
    }
    await userRef.update(updates);
    return res.json({ ok: true, user: docData(await userRef.get()) });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.get('/announcements', async (req, res) => {
  const snapshot = await firestore.collection('announcements').orderBy('created_at', 'desc').limit(100).get();
  res.json({ announcements: snapshot.docs.map(docData) });
});

router.post('/announcements', async (req, res) => {
  const { title, content, type = 'info', expiresAt = null, sendPush = false } = req.body;
  if (!title || !content) return res.status(400).json({ error: 'Başlık ve içerik gerekli' });
  const ref = firestore.collection('announcements').doc();
  await ref.set({
    id: ref.id,
    title,
    content,
    type,
    active: true,
    createdBy: req.firebaseUser.uid,
    expiresAt: expiresAt ? new Date(expiresAt) : null,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  });
  let pushResult = { sent: 0 };
  if (sendPush) {
    pushResult = await sendNotificationToAll({ title, body: content });
  }
  return res.json({ announcement: docData(await ref.get()), pushResult });
});

router.patch('/announcements/:id', async (req, res) => {
  const ref = firestore.collection('announcements').doc(req.params.id);
  await ref.update({ active: Boolean(req.body.active), updated_at: serverTimestamp() });
  res.json({ announcement: docData(await ref.get()) });
});

router.delete('/announcements/:id', async (req, res) => {
  await firestore.collection('announcements').doc(req.params.id).delete();
  res.json({ ok: true });
});

router.get('/world-events', async (req, res) => {
  const snapshot = await firestore.collection('worldEvents').orderBy('created_at', 'desc').limit(100).get();
  res.json({ events: snapshot.docs.map(docData) });
});

router.post('/world-events', async (req, res) => {
  const { title, description, type = 'event', active = true } = req.body;
  if (!title || !description) return res.status(400).json({ error: 'Başlık ve açıklama gerekli' });
  const ref = firestore.collection('worldEvents').doc();
  await ref.set({
    id: ref.id,
    title,
    description,
    type,
    active,
    createdBy: req.firebaseUser.uid,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  });
  res.json({ event: docData(await ref.get()) });
});

router.patch('/world-events/:id', async (req, res) => {
  const ref = firestore.collection('worldEvents').doc(req.params.id);
  await ref.update({ active: Boolean(req.body.active), updated_at: serverTimestamp() });
  res.json({ event: docData(await ref.get()) });
});

router.delete('/world-events/:id', async (req, res) => {
  await firestore.collection('worldEvents').doc(req.params.id).delete();
  res.json({ ok: true });
});

module.exports = router;
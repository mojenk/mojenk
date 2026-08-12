const express = require('express');
const { verifyFirebaseToken } = require('../middleware/auth');
const { firestore, docData, serverTimestamp, deleteCharacterTree, admin } = require('../firestore');
const { grantXpAndLevelUp } = require('../utils/leveling');
const { deleteCharacterCascade } = require('../utils/deleteCharacterCascade');

const { sendNotificationToAll, sendNotificationToUser } = require('../utils/notifications');

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

// ── Dashboard İstatistikleri ───────────────────────────────────────────────
router.get('/stats', async (req, res) => {
  try {
    const today = new Date();
    const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);

    const [
      usersSnap,
      charactersSnap,
      announcementsSnap,
      worldEventsSnap,
      recentUsersSnap,
      recentCharactersSnap,
      recentMessagesSnap,
    ] = await Promise.all([
      firestore.collection('users').count().get(),
      firestore.collection('characters').count().get(),
      firestore.collection('announcements').where('active', '==', true).count().get(),
      firestore.collection('worldEvents').where('active', '==', true).count().get(),
      firestore.collection('users').where('created_at', '>=', sevenDaysAgo).orderBy('created_at', 'desc').get(),
      firestore.collection('characters').where('created_at', '>=', sevenDaysAgo).orderBy('created_at', 'desc').get(),
      firestore.collection('messages').where('created_at', '>=', sevenDaysAgo).orderBy('created_at', 'desc').limit(7000).get(),
    ]);

    const usersDocs = usersSnap.data().count;
    const charactersDocs = charactersSnap.data().count;
    const activeAnnouncements = announcementsSnap.data().count;
    const activeWorldEvents = worldEventsSnap.data().count;

    // Son 7 gün günlük yeni kullanıcı/karakter/mesaj
    const daily = {};
    for (let i = 0; i < 7; i += 1) {
      const d = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().slice(0, 10);
      daily[key] = { users: 0, characters: 0, messages: 0 };
    }

    recentUsersSnap.docs.forEach((doc) => {
      const data = docData(doc);
      const date = data.created_at?.toDate?.() || new Date(data.created_at);
      const key = date.toISOString().slice(0, 10);
      if (daily[key]) daily[key].users += 1;
    });

    recentCharactersSnap.docs.forEach((doc) => {
      const data = docData(doc);
      const date = data.created_at?.toDate?.() || new Date(data.created_at);
      const key = date.toISOString().slice(0, 10);
      if (daily[key]) daily[key].characters += 1;
    });

    recentMessagesSnap.docs.forEach((doc) => {
      const data = docData(doc);
      const date = data.created_at?.toDate?.() || new Date(data.created_at);
      const key = date.toISOString().slice(0, 10);
      if (daily[key]) daily[key].messages += 1;
    });

    const dailyArray = Object.entries(daily)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, v]) => ({ date, ...v }));

    // Ekonomi / durum özeti (örneklem)
    const allCharacters = await firestore.collection('characters').limit(500).get();
    let totalGold = 0;
    let totalXp = 0;
    let totalLevel = 0;
    let downCount = 0;
    let deadCount = 0;
    allCharacters.docs.forEach((doc) => {
      const c = docData(doc);
      totalGold += c.gold || 0;
      totalXp += c.xp || 0;
      totalLevel += c.level || 1;
      if (c.status === 'unconscious') downCount += 1;
      if (c.status === 'dead') deadCount += 1;
    });
    const sampleSize = allCharacters.docs.length || 1;

    const premiumUsersSnap = await firestore.collection('users').where('is_premium', '==', true).count().get();

    res.json({
      totals: {
        users: usersDocs,
        characters: charactersDocs,
        activeAnnouncements,
        activeWorldEvents,
        premiumUsers: premiumUsersSnap.data().count,
      },
      economy: {
        totalGold,
        totalXp,
        avgLevel: +(totalLevel / sampleSize).toFixed(2),
        avgGold: +(totalGold / sampleSize).toFixed(0),
        avgXp: +(totalXp / sampleSize).toFixed(0),
        downCount,
        deadCount,
      },
      daily: dailyArray,
    });
  } catch (err) {
    console.error('Admin stats error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── Karakterler ────────────────────────────────────────────────────────────
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
    const characterCounts = await firestore.collection('characters').select('ownerUid').get();
    const countsByUser = {};
    characterCounts.docs.forEach((doc) => {
      const { ownerUid } = docData(doc);
      countsByUser[ownerUid] = (countsByUser[ownerUid] || 0) + 1;
    });
    const users = snapshot.docs.map((doc) => {
      const data = docData(doc);
      return {
        ...data,
        characterCount: countsByUser[doc.id] || 0,
        fcmTokens: data.fcmTokens || data.fcmToken ? [data.fcmToken].filter(Boolean) : [],
      };
    });
    return res.json({ users });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Belirli bir süre önce girmiş misafir (guest/anonymous) kullanıcıları toplu sil
router.post('/users/cleanup-guests', async (req, res) => {
  try {
    const hours = Number(req.body?.hours) > 0 ? Number(req.body.hours) : 24;
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);

    const snapshot = await firestore.collection('users').where('isGuest', '==', true).get();
    const targets = snapshot.docs.filter((doc) => {
      const data = docData(doc);
      const createdAt = data.created_at instanceof Date ? data.created_at : null;
      return createdAt && createdAt >= cutoff;
    });

    let deletedUsers = 0;
    let deletedCharacters = 0;
    const errors = [];

    for (const userDoc of targets) {
      const uid = userDoc.id;
      try {
        const charsSnap = await firestore.collection('characters').where('ownerUid', '==', uid).get();
        for (const charDoc of charsSnap.docs) {
          await deleteCharacterTree(charDoc.id);
          deletedCharacters += 1;
        }
        await firestore.collection('users').doc(uid).delete();
        try {
          await admin.auth().deleteUser(uid);
        } catch (authErr) {
          if (authErr.code !== 'auth/user-not-found') throw authErr;
        }
        deletedUsers += 1;
      } catch (err) {
        errors.push({ uid, error: err.message });
      }
    }

    return res.json({ ok: true, scanned: snapshot.size, deletedUsers, deletedCharacters, errors });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.patch('/users/:uid/suspend', async (req, res) => {
  try {
    const { suspended, reason } = req.body;
    const userRef = firestore.collection('users').doc(req.params.uid);
    const userDoc = await userRef.get();
    if (!userDoc.exists) return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
    const updates = {
      is_suspended: Boolean(suspended),
      suspension_updated_at: serverTimestamp(),
      suspension_updated_by: req.firebaseUser.uid,
    };
    if (reason !== undefined) updates.suspension_reason = reason || null;
    await userRef.update(updates);
    return res.json({ ok: true, user: docData(await userRef.get()) });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/users/:uid/push-test', async (req, res) => {
  try {
    const { title = 'Test Bildirimi', body = 'Push servisi çalışıyor.' } = req.body;
    const userDoc = await firestore.collection('users').doc(req.params.uid).get();
    if (!userDoc.exists) return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
    const user = docData(userDoc);
    const tokens = (user.fcmTokens || []).filter(Boolean);
    if (user.fcmToken) tokens.push(user.fcmToken);
    const uniqueTokens = [...new Set(tokens)];
    if (!uniqueTokens.length) return res.status(400).json({ error: 'Kullanıcının kayıtlı FCM tokeni yok' });
    const result = await sendNotificationToUser(req.params.uid, { title, body });
    return res.json({ ok: true, sent: result.sent || 0, failed: result.failed || 0 });
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

// ── Uygulama Ayarları (Oyun Dengesi) ───────────────────────────────────────
const DEFAULT_APP_SETTINGS = {
  freeDailyTurns: 40,
  bonusPerAd: 15,
  maxBonusAdsPerDay: 0, // 0 = sınırsız reklamlı ek hamle
  premiumDailyWheelSpins: 3,
  adRewardGold: 10,
  adRewardXp: 0,
  shopPriceMultiplier: 1,
  goldRewardMin: 2,
  goldRewardMax: 50,
};

router.get('/settings', async (req, res) => {
  try {
    const doc = await firestore.collection('appSettings').doc('global').get();
    const current = doc.exists ? docData(doc) : {};
    res.json({ settings: { ...DEFAULT_APP_SETTINGS, ...current } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/settings', async (req, res) => {
  try {
    const allowed = Object.keys(DEFAULT_APP_SETTINGS);
    const updates = {};
    allowed.forEach((key) => {
      if (req.body[key] !== undefined) {
        const num = Number(req.body[key]);
        if (!Number.isNaN(num)) updates[key] = num;
      }
    });
    if (!Object.keys(updates).length) return res.status(400).json({ error: 'Güncellenecek geçerli alan yok' });
    updates.updated_at = serverTimestamp();
    updates.updated_by = req.firebaseUser.uid;
    await firestore.collection('appSettings').doc('global').set(updates, { merge: true });
    res.json({ ok: true, settings: { ...DEFAULT_APP_SETTINGS, ...updates } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── İçerik Yönetimi ────────────────────────────────────────────────────────
const { CATALOG, RARITY } = require('../data/items');
const SCENARIOS = require('../data/scenarios');
const RACES = require('../data/races');
const CLASSES = require('../data/classes');

router.get('/items', async (req, res) => {
  try {
    const items = Object.entries(CATALOG).map(([id, item]) => ({
      id,
      ...item,
      rarity: item.rarity || RARITY.COMMON,
      image: item.image || null,
    }));
    res.json({ items });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/items/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const item = CATALOG[id];
    if (!item) return res.status(404).json({ error: 'Eşya bulunamadı' });
    const allowed = ['name', 'description', 'type', 'value', 'rarity', 'image', 'shopVisible'];
    const updates = {};
    allowed.forEach((key) => {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    });
    if (!Object.keys(updates).length) return res.status(400).json({ error: 'Güncellenecek alan yok' });
    Object.assign(item, updates);
    res.json({ ok: true, item: { id, ...item } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/items', async (req, res) => {
  try {
    const { id, name, description = '', type = 'misc', value = 0, rarity = RARITY.COMMON, image = null, shopVisible = false } = req.body;
    if (!id || !name) return res.status(400).json({ error: 'id ve name gerekli' });
    if (CATALOG[id]) return res.status(409).json({ error: 'Bu id ile eşya zaten var' });
    CATALOG[id] = { name, description, type, value, rarity, image, shopVisible };
    res.status(201).json({ ok: true, item: { id, ...CATALOG[id] } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/content/scenarios', async (req, res) => {
  try {
    res.json({ scenarios: SCENARIOS.map((s) => ({ id: s.id, title: s.title, description: s.description, image: s.image })) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/content/races', async (req, res) => {
  try {
    res.json({ races: RACES.map((r) => ({ id: r.id, name: r.name, description: r.description, image: r.image })) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/content/classes', async (req, res) => {
  try {
    res.json({ classes: CLASSES.map((c) => ({ id: c.id, name: c.name, description: c.description, image: c.image })) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
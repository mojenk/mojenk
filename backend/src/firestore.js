const admin = require('./firebaseAdmin');
const { getFirestore, Timestamp, FieldValue } = require('firebase-admin/firestore');

const firestore = getFirestore(admin.getApp());
firestore.settings({ ignoreUndefinedProperties: true });

function normalizeValue(value) {
  if (value && typeof value.toDate === 'function') return value.toDate();
  if (Array.isArray(value)) return value.map(normalizeValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, normalizeValue(item)]));
  }
  return value;
}

function docData(doc) {
  if (!doc?.exists) return null;
  return normalizeValue({ id: doc.id, ...doc.data() });
}

function now() {
  return Timestamp.now();
}

function serverTimestamp() {
  return FieldValue.serverTimestamp();
}

function increment(value) {
  return FieldValue.increment(value);
}

async function deleteCollection(query, batchSize = 400) {
  let snapshot = await query.limit(batchSize).get();
  let deleted = 0;
  while (!snapshot.empty) {
    const batch = firestore.batch();
    snapshot.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
    deleted += snapshot.size;
    if (snapshot.size < batchSize) break;
    snapshot = await query.limit(batchSize).get();
  }
  return deleted;
}

async function deleteCharacterTree(characterId, options = {}) {
  const characterRef = firestore.collection('characters').doc(characterId);
  const sessionSnapshot = await firestore.collection('sessions').where('characterId', '==', characterId).get();
  let deletedMessages = 0;

  for (const sessionDoc of sessionSnapshot.docs) {
    deletedMessages += await deleteCollection(sessionDoc.ref.collection('messages'));
    await sessionDoc.ref.delete();
  }

  const childCollections = ['inventory', 'npcs', 'quests', 'perks'];
  const deleted = {
    messages: deletedMessages,
    game_sessions: sessionSnapshot.size,
    inventory_items: 0,
    npcs: 0,
    quests: 0,
    character_perks: 0,
    fallen_heroes: 0,
    characters: 0,
  };

  const keys = {
    inventory: 'inventory_items',
    npcs: 'npcs',
    quests: 'quests',
    perks: 'character_perks',
  };

  for (const collectionName of childCollections) {
    deleted[keys[collectionName]] = await deleteCollection(characterRef.collection(collectionName));
  }

  if (!options.keepFallenHeroRecord) {
    const fallenSnapshot = await firestore.collection('fallenHeroes').where('characterId', '==', characterId).get();
    const batch = firestore.batch();
    fallenSnapshot.docs.forEach((doc) => batch.delete(doc.ref));
    if (!fallenSnapshot.empty) await batch.commit();
    deleted.fallen_heroes = fallenSnapshot.size;
  }

  const characterDoc = await characterRef.get();
  if (characterDoc.exists) {
    await characterRef.delete();
    deleted.characters = 1;
  }

  return deleted;
}

module.exports = {
  admin,
  firestore,
  docData,
  normalizeValue,
  now,
  serverTimestamp,
  increment,
  deleteCollection,
  deleteCharacterTree,
};
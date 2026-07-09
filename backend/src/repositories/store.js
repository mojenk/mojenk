const { firestore, docData, serverTimestamp } = require('../firestore');

const ROOT_COLLECTIONS = {
  users: 'users',
  characters: 'characters',
  game_sessions: 'sessions',
  fallen_heroes: 'fallenHeroes',
  announcements: 'announcements',
  world_events: 'worldEvents',
  app_settings: 'appSettings',
};

const CHILD_COLLECTIONS = {
  messages: { name: 'messages', parent: 'sessions', parentField: 'session_id' },
  inventory_items: { name: 'inventory', parent: 'characters', parentField: 'character_id' },
  npcs: { name: 'npcs', parent: 'characters', parentField: 'character_id' },
  quests: { name: 'quests', parent: 'characters', parentField: 'character_id' },
  character_perks: { name: 'perks', parent: 'characters', parentField: 'character_id' },
};

function rootCollection(table) {
  const name = ROOT_COLLECTIONS[table];
  if (!name) throw new Error(`Unknown root table: ${table}`);
  return firestore.collection(name);
}

function childCollection(table, parentId) {
  const config = CHILD_COLLECTIONS[table];
  if (!config) throw new Error(`Unknown child table: ${table}`);
  return firestore.collection(config.parent).doc(parentId).collection(config.name);
}

async function getById(table, id, parentId = null) {
  const ref = parentId ? childCollection(table, parentId).doc(id) : rootCollection(table).doc(id);
  return docData(await ref.get());
}

async function setById(table, id, data, parentId = null, merge = true) {
  const ref = parentId ? childCollection(table, parentId).doc(id) : rootCollection(table).doc(id);
  await ref.set({ ...data, updated_at: serverTimestamp() }, { merge });
  return getById(table, id, parentId);
}

async function create(table, data, id, parentId = null) {
  const collection = parentId ? childCollection(table, parentId) : rootCollection(table);
  const ref = id ? collection.doc(id) : collection.doc();
  await ref.set({
    ...data,
    id: ref.id,
    created_at: data.created_at || serverTimestamp(),
    updated_at: serverTimestamp(),
  });
  return getById(table, ref.id, parentId);
}

async function remove(table, id, parentId = null) {
  const ref = parentId ? childCollection(table, parentId).doc(id) : rootCollection(table).doc(id);
  const snap = await ref.get();
  if (!snap.exists) return false;
  await ref.delete();
  return true;
}

async function listRoot(table, filters = [], order = null, limit = 200) {
  let query = rootCollection(table);
  for (const [field, operator, value] of filters) query = query.where(field, operator, value);
  if (order) query = query.orderBy(order.field, order.direction || 'asc');
  if (limit) query = query.limit(limit);
  const snapshot = await query.get();
  return snapshot.docs.map(docData);
}

async function listChildren(table, parentId, order = null, limit = 200) {
  let query = childCollection(table, parentId);
  if (order) query = query.orderBy(order.field, order.direction || 'asc');
  if (limit) query = query.limit(limit);
  const snapshot = await query.get();
  return snapshot.docs.map(docData);
}

async function findChildById(table, id) {
  const config = CHILD_COLLECTIONS[table];
  const snapshot = await firestore.collectionGroup(config.name).where('id', '==', id).limit(1).get();
  if (snapshot.empty) return null;
  const doc = snapshot.docs[0];
  return { data: docData(doc), ref: doc.ref };
}

module.exports = {
  ROOT_COLLECTIONS,
  CHILD_COLLECTIONS,
  rootCollection,
  childCollection,
  getById,
  setById,
  create,
  remove,
  listRoot,
  listChildren,
  findChildById,
};
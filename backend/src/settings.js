const { firestore, docData, serverTimestamp } = require('./firestore');

const cache = {};

async function getSetting(key, envFallback) {
  if (cache[key] !== undefined) return cache[key];
  try {
    const row = docData(await firestore.collection('appSettings').doc(key).get());
    if (row) {
      cache[key] = row.value;
      return row.value;
    }
  } catch (err) {
    console.error('getSetting DB error:', err.message);
  }
  const envVal = envFallback ? process.env[envFallback] : undefined;
  if (envVal) {
    cache[key] = envVal;
    return envVal;
  }
  return null;
}

async function setSetting(key, value) {
  await firestore.collection('appSettings').doc(key).set({ value, updated_at: serverTimestamp() }, { merge: true });
  cache[key] = value;
}

async function hasSetting(key) {
  if (cache[key] !== undefined) return true;
  const row = await firestore.collection('appSettings').doc(key).get();
  return row.exists;
}

module.exports = { getSetting, setSetting, hasSetting };

const { firestore, docData, serverTimestamp } = require('./firestore');

async function getSetting(key, envFallback) {
  try {
    const row = docData(await firestore.collection('appSettings').doc(key).get());
    if (row) {
      return row.value;
    }
  } catch (err) {
    console.error('getSetting DB error:', err.message);
  }
  const envVal = envFallback ? process.env[envFallback] : undefined;
  return envVal || null;
}

async function setSetting(key, value) {
  await firestore.collection('appSettings').doc(key).set({ value, updated_at: serverTimestamp() }, { merge: true });
}

async function hasSetting(key) {
  const row = await firestore.collection('appSettings').doc(key).get();
  return row.exists;
}

module.exports = { getSetting, setSetting, hasSetting };

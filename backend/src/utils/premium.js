const { firestore, docData } = require('../firestore');

async function isPremium(uid) {
  try {
    const doc = await firestore.collection('users').doc(uid).get();
    const data = docData(doc);
    if (!data) return false;
    if (!data.is_premium) return false;
    if (data.premium_until && new Date(data.premium_until) < new Date()) return false;
    return true;
  } catch (err) {
    return false;
  }
}

module.exports = { isPremium };

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

// RevenueCat dışı, kendi backend'imizden premium verme (test/demo veya kod ile).
// days = null ise süresiz.
async function grantPremium(uid, days = null, source = 'manual') {
  const userRef = firestore.collection('users').doc(uid);
  const premiumUntil = days ? new Date(Date.now() + days * 24 * 60 * 60 * 1000) : null;
  await userRef.set({
    is_premium: true,
    premium_until: premiumUntil,
    premium_updated_at: new Date(),
    premium_updated_by: source,
  }, { merge: true });
  return { is_premium: true, premium_until: premiumUntil };
}

module.exports = { isPremium, grantPremium };

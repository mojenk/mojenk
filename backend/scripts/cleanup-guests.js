// One-off maintenance script: deletes guest (anonymous) users created within
// the last N hours, along with their characters. Run via GitHub Actions using
// the already-authorized FIREBASE_SERVICE_ACCOUNT deploy credentials.
const { firestore, docData, deleteCharacterTree, admin } = require('../src/firestore');

async function main() {
  const hours = Number(process.env.CLEANUP_HOURS) > 0 ? Number(process.env.CLEANUP_HOURS) : 24;
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

  console.log(JSON.stringify({ scanned: snapshot.size, deletedUsers, deletedCharacters, errors }, null, 2));
}

main().then(() => process.exit(0)).catch((err) => {
  console.error(err);
  process.exit(1);
});

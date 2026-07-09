const { firestore, docData, serverTimestamp } = require('../firestore');

function generateLoot(enemy) {
  const maxHp = Number(enemy?.max_hp || 15);
  const gold = Math.max(1, Math.round(maxHp * (0.4 + Math.random() * 0.6)));
  const items = [];
  if (Math.random() < 0.28) {
    items.push({
      name: Math.random() < 0.65 ? 'Küçük İyileşme İksiri' : 'Nadir Malzeme',
      type: Math.random() < 0.65 ? 'potion' : 'misc',
      description: Math.random() < 0.65 ? '2d4+2 HP iyileştirir.' : 'Tüccarlar için değerli bir ganimet.',
    });
  }
  return { gold, items };
}

async function applyLoot(characterId, enemy) {
  const loot = generateLoot(enemy);
  const characterRef = firestore.collection('characters').doc(characterId);
  const character = docData(await characterRef.get());
  if (!character) return loot;
  const inventorySnapshot = await characterRef.collection('inventory').get();
  const inventory = inventorySnapshot.docs.map(docData);
  const batch = firestore.batch();
  batch.update(characterRef, {
    gold: (character.gold || 0) + loot.gold,
    updated_at: serverTimestamp(),
  });
  loot.items.forEach((item) => {
    const existing = inventory.find((entry) => entry.name === item.name && ['potion', 'misc'].includes(item.type));
    if (existing) {
      batch.update(characterRef.collection('inventory').doc(existing.id), {
        quantity: (existing.quantity || 1) + 1,
        updated_at: serverTimestamp(),
      });
    } else {
      const itemRef = characterRef.collection('inventory').doc();
      batch.set(itemRef, {
        id: itemRef.id,
        ...item,
        quantity: 1,
        equipped: 0,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      });
    }
  });
  await batch.commit();
  return loot;
}

module.exports = { generateLoot, applyLoot };
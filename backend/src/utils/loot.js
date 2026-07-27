const { firestore, docData, serverTimestamp } = require('../firestore');
const { CATALOG } = require('../data/items');

function generateLoot(enemy, scenario) {
  const maxHp = Number(enemy?.max_hp || 15);
  const gold = Math.max(1, Math.round(maxHp * (0.4 + Math.random() * 0.6)));
  const items = [];
  if (Math.random() < 0.28) {
    const pool = scenario
      ? CATALOG.filter((entry) => entry.scenarios.includes(scenario) || entry.scenarios.includes('all'))
      : CATALOG;
    const consumablePool = pool.filter((entry) => ['potion', 'misc'].includes(entry.type));
    const source = consumablePool.length ? consumablePool : pool;
    if (source.length) {
      const pick = source[Math.floor(Math.random() * source.length)];
      items.push({
        name: pick.name,
        type: pick.type,
        description: pick.description,
        image: pick.image || null,
      });
    }
  }
  return { gold, items };
}

async function applyLoot(characterId, enemy, scenario) {
  const loot = generateLoot(enemy, scenario);
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
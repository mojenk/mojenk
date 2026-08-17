const express = require('express');
const { verifyFirebaseToken } = require('../middleware/auth');
const { firestore, docData, serverTimestamp } = require('../firestore');
const { CATALOG, RARITY } = require('../data/items');

const router = express.Router();

function estimateSellPrice(item) {
  const catalogItem = CATALOG.find((entry) => entry.name === item.name);
  if (catalogItem) return catalogItem.sellPrice;
  if (item.type === 'potion') return 15;
  if (item.type === 'weapon') return 30;
  if (item.type === 'armor') return 40;
  return 5;
}

// Envanter kapasitesi: temel slot + tasinan "carry_bonus" esyalari.
const INVENTORY_BASE_LIMIT = 24;
function getCarryBonus(inventory) {
  return inventory.reduce((sum, entry) => {
    const def = CATALOG.find((catalogEntry) => catalogEntry.id === entry.id || catalogEntry.name === entry.name);
    return sum + ((def && def.carry_bonus) || entry.carry_bonus || 0);
  }, 0);
}

router.get('/catalog', (req, res) => {
  const { scenario } = req.query;
  let items = CATALOG.filter((item) => item.rarity === RARITY.COMMON);
  if (scenario) {
    items = items.filter((item) => item.scenarios.includes(scenario) || item.scenarios.includes('all'));
  }
  res.json({ items });
});

// Karakterin envanter doluluk/kapasite bilgisi
router.get('/inventory-status', verifyFirebaseToken, async (req, res) => {
  const { characterId } = req.query;
  if (!characterId) return res.status(400).json({ error: 'characterId gerekli' });
  try {
    const characterRef = firestore.collection('characters').doc(characterId);
    const character = docData(await characterRef.get());
    if (!character || character.ownerUid !== req.firebaseUser.uid) {
      return res.status(404).json({ error: 'Karakter bulunamadı' });
    }
    const inventory = (await characterRef.collection('inventory').get()).docs.map(docData);
    const capacity = INVENTORY_BASE_LIMIT + getCarryBonus(inventory);
    return res.json({ used: inventory.length, capacity });
  } catch (err) {
    return res.status(500).json({ error: 'Sunucu hatası' });
  }
});

router.use(verifyFirebaseToken);

router.post('/buy', async (req, res) => {
  const { characterId, itemId } = req.body;
  const item = CATALOG.find((entry) => entry.id === itemId && entry.rarity === RARITY.COMMON);
  if (!characterId || !item) return res.status(400).json({ error: 'Geçersiz ürün veya karakter' });

  try {
    const characterRef = firestore.collection('characters').doc(characterId);
    const character = docData(await characterRef.get());
    if (!character || character.ownerUid !== req.firebaseUser.uid) {
      return res.status(404).json({ error: 'Karakter bulunamadı' });
    }
    if ((character.gold || 0) < item.price) {
      return res.status(400).json({ error: `Yeterli altın yok. Gerekli: ${item.price}, Mevcut: ${character.gold || 0}` });
    }

    const inventorySnapshot = await characterRef.collection('inventory').get();
    const inventory = inventorySnapshot.docs.map(docData);
    const existing = inventory
      .find((entry) => entry.name === item.name && ['potion', 'misc'].includes(item.type));
    // Kapasite kontrolu: mevcut yigina ekleme yeni slot kaplamaz
    if (!existing && inventory.length >= INVENTORY_BASE_LIMIT + getCarryBonus(inventory)) {
      return res.status(400).json({
        error: `Envanterin dolu (${INVENTORY_BASE_LIMIT + getCarryBonus(inventory)} eşya). Bir şeyler sat ya da Sırt Çantası gibi kapasite artıran bir eşya taşı.`,
      });
    }
    const batch = firestore.batch();
    batch.update(characterRef, { gold: character.gold - item.price, updated_at: serverTimestamp() });
    if (existing) {
      batch.update(characterRef.collection('inventory').doc(existing.id), {
        quantity: (existing.quantity || 1) + 1,
        updated_at: serverTimestamp(),
      });
    } else {
      const itemRef = characterRef.collection('inventory').doc();
      batch.set(itemRef, {
        id: itemRef.id,
        name: item.name,
        type: item.type,
        description: item.description,
        image: item.image || null,
        quantity: 1,
        equipped: 0,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      });
    }
    await batch.commit();
    return res.json({ success: true, gold: character.gold - item.price, message: `${item.name} satın alındı!` });
  } catch (err) {
    return res.status(500).json({ error: 'Satın alma tamamlanamadı' });
  }
});

router.post('/sell', async (req, res) => {
  const { characterId, inventoryItemId } = req.body;
  if (!characterId || !inventoryItemId) return res.status(400).json({ error: 'Eksik alan' });

  try {
    const characterRef = firestore.collection('characters').doc(characterId);
    const character = docData(await characterRef.get());
    if (!character || character.ownerUid !== req.firebaseUser.uid) {
      return res.status(404).json({ error: 'Karakter bulunamadı' });
    }
    const itemRef = characterRef.collection('inventory').doc(inventoryItemId);
    const item = docData(await itemRef.get());
    if (!item) return res.status(404).json({ error: 'Eşya bulunamadı' });
    if (item.equipped) return res.status(400).json({ error: 'Kuşanılmış eşya satılamaz. Önce çıkar.' });

    const sellPrice = estimateSellPrice(item);
    const batch = firestore.batch();
    batch.update(characterRef, { gold: (character.gold || 0) + sellPrice, updated_at: serverTimestamp() });
    if ((item.quantity || 1) > 1) {
      batch.update(itemRef, { quantity: item.quantity - 1, updated_at: serverTimestamp() });
    } else {
      batch.delete(itemRef);
    }
    await batch.commit();
    return res.json({
      success: true,
      gold: (character.gold || 0) + sellPrice,
      sellPrice,
      message: `${item.name} satıldı (+${sellPrice} altın)`,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Satış tamamlanamadı' });
  }
});

module.exports = router;
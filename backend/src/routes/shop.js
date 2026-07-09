const express = require('express');
const { verifyFirebaseToken } = require('../middleware/auth');
const { firestore, docData, serverTimestamp } = require('../firestore');
const { CATALOG } = require('../data/items');

const router = express.Router();

function estimateSellPrice(item) {
  const catalogItem = CATALOG.find((entry) => entry.name === item.name);
  if (catalogItem) return catalogItem.sellPrice;
  if (item.type === 'potion') return 15;
  if (item.type === 'weapon') return 30;
  if (item.type === 'armor') return 40;
  return 5;
}

router.get('/catalog', (req, res) => {
  res.json({ items: CATALOG });
});

router.use(verifyFirebaseToken);

router.post('/buy', async (req, res) => {
  const { characterId, itemId } = req.body;
  const item = CATALOG.find((entry) => entry.id === itemId);
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
    const existing = inventorySnapshot.docs
      .map(docData)
      .find((entry) => entry.name === item.name && ['potion', 'misc'].includes(item.type));
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
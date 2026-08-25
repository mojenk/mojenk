const express = require('express');
const { verifyFirebaseToken } = require('../middleware/auth');
const { firestore, docData, serverTimestamp } = require('../firestore');
const { CATALOG, RARITY, findCatalog, getMountCarryBonus } = require('../data/items');

const router = express.Router();

const COMPANION_TYPES = ['pet', 'mount'];
const COSMETIC_KIND_FIELD = { title: 'equipped_title', frame: 'equipped_frame', dice_skin: 'equipped_dice_skin' };

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
  // Temel esyalar sadece common; evcil hayvan/binek/kozmetik her rarity'de satilir
  let items = CATALOG.filter((item) => item.rarity === RARITY.COMMON
    || COMPANION_TYPES.includes(item.type) || item.type === 'cosmetic');
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
    const capacity = INVENTORY_BASE_LIMIT + getCarryBonus(inventory) + getMountCarryBonus(character);
    return res.json({ used: inventory.length, capacity });
  } catch (err) {
    return res.status(500).json({ error: 'Sunucu hatası' });
  }
});

router.use(verifyFirebaseToken);

router.post('/buy', async (req, res) => {
  const { characterId, itemId } = req.body;
  const item = CATALOG.find((entry) => entry.id === itemId
    && (entry.rarity === RARITY.COMMON || COMPANION_TYPES.includes(entry.type) || entry.type === 'cosmetic'));
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

    // Evcil hayvan / binek / kozmetik: envanter slotu kaplamaz, karakter kartina islenir
    if (COMPANION_TYPES.includes(item.type) || item.type === 'cosmetic') {
      const ownedField = item.type === 'pet' ? 'owned_pets' : item.type === 'mount' ? 'owned_mounts' : 'owned_cosmetics';
      const owned = Array.isArray(character[ownedField]) ? character[ownedField] : [];
      if (owned.includes(item.id)) {
        return res.status(400).json({ error: `${item.name} zaten sende var` });
      }
      const update = { gold: character.gold - item.price, updated_at: serverTimestamp() };
      update[ownedField] = [...owned, item.id];
      // Ilk evcil hayvan/binek otomatik aktif olsun
      if (item.type === 'pet' && !character.active_pet) update.active_pet = item.id;
      if (item.type === 'mount' && !character.active_mount) update.active_mount = item.id;
      if (item.type === 'cosmetic' && item.cosmetic_kind && COSMETIC_KIND_FIELD[item.cosmetic_kind]) {
        const eqField = COSMETIC_KIND_FIELD[item.cosmetic_kind];
        if (!character[eqField]) update[eqField] = item.cosmetic_value;
      }
      await characterRef.update(update);
      return res.json({ success: true, gold: character.gold - item.price, message: `${item.name} satın alındı!` });
    }

    const inventorySnapshot = await characterRef.collection('inventory').get();
    const inventory = inventorySnapshot.docs.map(docData);
    const existing = inventory
      .find((entry) => entry.name === item.name && ['potion', 'misc'].includes(item.type));
    // Kapasite kontrolu: mevcut yigina ekleme yeni slot kaplamaz
    const capacity = INVENTORY_BASE_LIMIT + getCarryBonus(inventory) + getMountCarryBonus(character);
    if (!existing && inventory.length >= capacity) {
      return res.status(400).json({
        error: `Envanterin dolu (${capacity} eşya). Bir şeyler sat ya da Sırt Çantası gibi kapasite artıran bir eşya taşı.`,
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

// Evcil hayvan / binek aktiflestir (itemId null = ayir)
router.post('/companion/activate', async (req, res) => {
  const { characterId, itemId, slot } = req.body; // slot: 'pet' | 'mount'
  if (!characterId || !['pet', 'mount'].includes(slot)) {
    return res.status(400).json({ error: 'Geçersiz istek' });
  }
  try {
    const characterRef = firestore.collection('characters').doc(characterId);
    const character = docData(await characterRef.get());
    if (!character || character.ownerUid !== req.firebaseUser.uid) {
      return res.status(404).json({ error: 'Karakter bulunamadı' });
    }
    const ownedField = slot === 'pet' ? 'owned_pets' : 'owned_mounts';
    const activeField = slot === 'pet' ? 'active_pet' : 'active_mount';
    const owned = Array.isArray(character[ownedField]) ? character[ownedField] : [];
    if (itemId !== null && !owned.includes(itemId)) {
      return res.status(400).json({ error: 'Bu hayvan sende yok' });
    }
    const def = itemId ? findCatalog(itemId) : null;
    if (itemId && (!def || def.type !== slot)) return res.status(400).json({ error: 'Geçersiz hayvan' });
    await characterRef.update({ [activeField]: itemId, updated_at: serverTimestamp() });
    return res.json({ success: true, active: itemId, message: itemId ? `${def.name} artık yanında!` : 'Hayvan ayrıldı' });
  } catch (err) {
    return res.status(500).json({ error: 'İşlem tamamlanamadı' });
  }
});

// Kozmetik kus an (itemId null = cikar)
router.post('/cosmetic/equip', async (req, res) => {
  const { characterId, itemId, kind } = req.body; // kind: 'title' | 'frame' | 'dice_skin'
  if (!characterId || !COSMETIC_KIND_FIELD[kind]) return res.status(400).json({ error: 'Geçersiz istek' });
  try {
    const characterRef = firestore.collection('characters').doc(characterId);
    const character = docData(await characterRef.get());
    if (!character || character.ownerUid !== req.firebaseUser.uid) {
      return res.status(404).json({ error: 'Karakter bulunamadı' });
    }
    const owned = Array.isArray(character.owned_cosmetics) ? character.owned_cosmetics : [];
    if (itemId !== null && !owned.includes(itemId)) {
      return res.status(400).json({ error: 'Bu kozmetik sende yok' });
    }
    const def = itemId ? findCatalog(itemId) : null;
    if (itemId && (!def || def.cosmetic_kind !== kind)) return res.status(400).json({ error: 'Geçersiz kozmetik' });
    const field = COSMETIC_KIND_FIELD[kind];
    await characterRef.update({ [field]: itemId ? def.cosmetic_value : null, updated_at: serverTimestamp() });
    return res.json({ success: true, equipped: itemId ? def.cosmetic_value : null });
  } catch (err) {
    return res.status(500).json({ error: 'İşlem tamamlanamadı' });
  }
});

module.exports = router;
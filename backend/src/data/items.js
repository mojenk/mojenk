// ── Shared Item Catalog ──────────────────────────────────────────────────
// Used by both the shop (buy/sell) and the loot system (enemy drops),
// so combat rewards and shop economy stay consistent with each other.
//
// `rarity` drives loot drop-table weighting (see utils/loot.js) and frontend
// color coding. Bands roughly follow price: common <=20, uncommon 21-50,
// rare 51-100, epic 101-160, legendary 161+.
const RARITY = {
  COMMON: 'common',
  UNCOMMON: 'uncommon',
  RARE: 'rare',
  EPIC: 'epic',
  LEGENDARY: 'legendary',
};

const CATALOG = [
  // Potions & consumables
  { id: 'potion_small',   name: 'Küçük Can İksiri',   type: 'potion', price: 30,  sellPrice: 15,  description: '2d6+8 HP yeniler',                    category: 'Tüketici', rarity: RARITY.UNCOMMON },
  { id: 'potion_medium',  name: 'Orta Can İksiri',    type: 'potion', price: 60,  sellPrice: 30,  description: '4d8+15 HP yeniler',                   category: 'Tüketici', rarity: RARITY.RARE },
  { id: 'potion_large',   name: 'Büyük Can İksiri',   type: 'potion', price: 95,  sellPrice: 48,  description: '6d10+27 HP yeniler',                  category: 'Tüketici', rarity: RARITY.RARE },
  { id: 'elixir_dragon',  name: 'Ejderha Kanı İksiri', type: 'potion', price: 195, sellPrice: 98,  description: '8d10+40 HP yeniler, efsanevi şifa',   category: 'Tüketici', rarity: RARITY.LEGENDARY },
  { id: 'salve_minor',    name: 'Yara Merhemi',        type: 'potion', price: 15,  sellPrice: 7,   description: '1d4+2 HP yeniler',                    category: 'Tüketici', rarity: RARITY.COMMON },
  { id: 'antidote',       name: 'Panzehir',            type: 'misc',   price: 30,  sellPrice: 15,  description: 'Zehiri iyileştirir',                  category: 'Tüketici', rarity: RARITY.UNCOMMON },
  // Weapons
  { id: 'dagger',         name: 'Hançer',              type: 'weapon', price: 30,  sellPrice: 15,  description: '1d4 hızlı kesici hasar',              category: 'Silah', rarity: RARITY.UNCOMMON },
  { id: 'sling',          name: 'Sapan',               type: 'weapon', price: 20,  sellPrice: 10,  description: 'Menzilli silah, 1d4 künt hasar',      category: 'Silah', rarity: RARITY.COMMON },
  { id: 'spear',          name: 'Mızrak',              type: 'weapon', price: 55,  sellPrice: 27,  description: '1d8 delici hasar, uzun menzil avantajı', category: 'Silah', rarity: RARITY.RARE },
  { id: 'sword_iron',     name: 'Demir Kılıç',         type: 'weapon', price: 80,  sellPrice: 40,  description: '1d8 kesici hasar',                    category: 'Silah', rarity: RARITY.RARE },
  { id: 'bow',            name: 'Uzun Yay',            type: 'weapon', price: 90,  sellPrice: 45,  description: 'Menzilli silah, 1d8 delici hasar',    category: 'Silah', rarity: RARITY.RARE },
  { id: 'axe',            name: 'Savaş Baltası',       type: 'weapon', price: 100, sellPrice: 50,  description: '1d10 ezici kesici hasar',             category: 'Silah', rarity: RARITY.RARE },
  { id: 'staff',          name: 'Büyücü Asası',        type: 'weapon', price: 105, sellPrice: 53,  description: '1d6 arkane hasar, büyüyü güçlendirir', category: 'Silah', rarity: RARITY.EPIC },
  { id: 'crossbow',       name: 'Arbalet',             type: 'weapon', price: 115, sellPrice: 58,  description: 'Menzilli silah, 1d10 delici hasar',   category: 'Silah', rarity: RARITY.EPIC },
  { id: 'warhammer',      name: 'Savaş Çekici',        type: 'weapon', price: 125, sellPrice: 63,  description: '1d10 ezici hasar, zırh delme gücü',   category: 'Silah', rarity: RARITY.EPIC },
  { id: 'sword_steel',    name: 'Çelik Kılıç',         type: 'weapon', price: 140, sellPrice: 70,  description: '1d12 ustaca dövülmüş kesici hasar',   category: 'Silah', rarity: RARITY.EPIC },
  { id: 'greatsword',     name: 'İki Elli Kılıç',      type: 'weapon', price: 195, sellPrice: 98,  description: '2d6 ağır kesici hasar',               category: 'Silah', rarity: RARITY.LEGENDARY },
  // Armor
  { id: 'cloak_fur',      name: 'Kürk Pelerin',        type: 'armor',  price: 25,  sellPrice: 12,  description: '+1 AC, soğuğa karşı korur',           category: 'Zırh', rarity: RARITY.UNCOMMON },
  { id: 'shield',         name: 'Kalkan',              type: 'armor',  price: 50,  sellPrice: 25,  description: '+1 AC, sol el',                       category: 'Zırh', rarity: RARITY.UNCOMMON },
  { id: 'armor_leather',  name: 'Deri Zırh',           type: 'armor',  price: 70,  sellPrice: 35,  description: '+2 AC',                               category: 'Zırh', rarity: RARITY.RARE },
  { id: 'shield_steel',   name: 'Çelik Kalkan',        type: 'armor',  price: 90,  sellPrice: 45,  description: '+2 AC, sol el',                       category: 'Zırh', rarity: RARITY.RARE },
  { id: 'armor_chain',    name: 'Zincir Zırh',         type: 'armor',  price: 130, sellPrice: 65,  description: '+4 AC',                               category: 'Zırh', rarity: RARITY.EPIC },
  { id: 'armor_half_plate', name: 'Yarı Plaka Zırh',   type: 'armor',  price: 185, sellPrice: 93,  description: '+5 AC',                               category: 'Zırh', rarity: RARITY.LEGENDARY },
  { id: 'armor_plate',    name: 'Plaka Zırh',          type: 'armor',  price: 245, sellPrice: 123, description: '+6 AC',                               category: 'Zırh', rarity: RARITY.LEGENDARY },
  // Misc / gear
  { id: 'torch',          name: 'Meşale',              type: 'misc',   price: 8,   sellPrice: 4,   description: 'Karanlığı aydınlatır',                category: 'Çeşitli', rarity: RARITY.COMMON },
  { id: 'waterskin',      name: 'Su Tulumu',           type: 'misc',   price: 6,   sellPrice: 3,   description: 'Yolculuk için su taşır',              category: 'Çeşitli', rarity: RARITY.COMMON },
  { id: 'rope',           name: 'Halat (15m)',         type: 'misc',   price: 15,  sellPrice: 7,   description: 'Tırmanma ve bağlama',                 category: 'Çeşitli', rarity: RARITY.COMMON },
  { id: 'map',            name: 'Bölge Haritası',      type: 'misc',   price: 20,  sellPrice: 10,  description: 'Bilinmeyen bölgeleri gösterir',       category: 'Çeşitli', rarity: RARITY.COMMON },
  { id: 'lantern',        name: 'Fener',               type: 'misc',   price: 25,  sellPrice: 12,  description: 'Geniş bir alanı aydınlatır',          category: 'Çeşitli', rarity: RARITY.UNCOMMON },
  { id: 'lockpicks',      name: 'Kilit Maşası',        type: 'misc',   price: 40,  sellPrice: 20,  description: 'Kilitli kapılar için',                category: 'Çeşitli', rarity: RARITY.UNCOMMON },
  { id: 'trap_kit',       name: 'Tuzak Seti',          type: 'misc',   price: 35,  sellPrice: 17,  description: 'Basit av tuzakları kurar',            category: 'Çeşitli', rarity: RARITY.UNCOMMON },
  { id: 'weapon_poison',  name: 'Silah Zehiri',        type: 'misc',   price: 45,  sellPrice: 22,  description: 'Silaha sürülen etkili zehir',         category: 'Çeşitli', rarity: RARITY.UNCOMMON },
  { id: 'rations',        name: 'Seyahat Kumanyası',   type: 'misc',   price: 12,  sellPrice: 5,   description: '3 günlük yiyecek',                    category: 'Çeşitli', rarity: RARITY.COMMON },
];

module.exports = { CATALOG, RARITY };

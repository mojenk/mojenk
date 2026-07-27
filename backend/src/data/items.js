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

// Scenario grouping used to filter which items appear per scenario shop/loot pool.
// MEDIEVAL_FANTASY scenarios support classic swords/armor/potions.
// 'all' means the item is generic enough to fit every scenario (rope, map, etc.)
const MEDIEVAL_FANTASY = ['dungeon', 'forest', 'tavern', 'city', 'dragon', 'mountain', 'sea', 'caravan', 'custom'];

const CATALOG = [
  // Potions & consumables (classic fantasy magic — not for realistic/scifi/western)
  { id: 'potion_small',   name: 'Küçük Can İksiri',   type: 'potion', price: 30,  sellPrice: 15,  description: '2d6+8 HP yeniler',                    category: 'Tüketici', rarity: RARITY.UNCOMMON, scenarios: MEDIEVAL_FANTASY },
  { id: 'potion_medium',  name: 'Orta Can İksiri',    type: 'potion', price: 60,  sellPrice: 30,  description: '4d8+15 HP yeniler',                   category: 'Tüketici', rarity: RARITY.RARE, scenarios: MEDIEVAL_FANTASY },
  { id: 'potion_large',   name: 'Büyük Can İksiri',   type: 'potion', price: 95,  sellPrice: 48,  description: '6d10+27 HP yeniler',                  category: 'Tüketici', rarity: RARITY.RARE, scenarios: MEDIEVAL_FANTASY },
  { id: 'elixir_dragon',  name: 'Ejderha Kanı İksiri', type: 'potion', price: 195, sellPrice: 98,  description: '8d10+40 HP yeniler, efsanevi şifa',   category: 'Tüketici', rarity: RARITY.LEGENDARY, scenarios: MEDIEVAL_FANTASY },
  { id: 'salve_minor',    name: 'Yara Merhemi',        type: 'potion', price: 15,  sellPrice: 7,   description: '1d4+2 HP yeniler',                    category: 'Tüketici', rarity: RARITY.COMMON, scenarios: MEDIEVAL_FANTASY },
  { id: 'antidote',       name: 'Panzehir',            type: 'misc',   price: 30,  sellPrice: 15,  description: 'Zehiri iyileştirir',                  category: 'Tüketici', rarity: RARITY.UNCOMMON, scenarios: [...MEDIEVAL_FANTASY, 'realistic', 'horror'] },
  // Weapons (classic melee/ranged — not for realistic/scifi/western)
  { id: 'dagger',         name: 'Hançer',              type: 'weapon', price: 30,  sellPrice: 15,  description: '1d4 hızlı kesici hasar',              category: 'Silah', rarity: RARITY.UNCOMMON, scenarios: [...MEDIEVAL_FANTASY, 'realistic'] },
  { id: 'sling',          name: 'Sapan',               type: 'weapon', price: 20,  sellPrice: 10,  description: 'Menzilli silah, 1d4 künt hasar',      category: 'Silah', rarity: RARITY.COMMON, scenarios: MEDIEVAL_FANTASY },
  { id: 'spear',          name: 'Mızrak',              type: 'weapon', price: 55,  sellPrice: 27,  description: '1d8 delici hasar, uzun menzil avantajı', category: 'Silah', rarity: RARITY.RARE, scenarios: MEDIEVAL_FANTASY },
  { id: 'sword_iron',     name: 'Demir Kılıç',         type: 'weapon', price: 80,  sellPrice: 40,  description: '1d8 kesici hasar',                    category: 'Silah', rarity: RARITY.RARE, scenarios: MEDIEVAL_FANTASY },
  { id: 'bow',            name: 'Uzun Yay',            type: 'weapon', price: 90,  sellPrice: 45,  description: 'Menzilli silah, 1d8 delici hasar',    category: 'Silah', rarity: RARITY.RARE, scenarios: MEDIEVAL_FANTASY },
  { id: 'axe',            name: 'Savaş Baltası',       type: 'weapon', price: 100, sellPrice: 50,  description: '1d10 ezici kesici hasar',             category: 'Silah', rarity: RARITY.RARE, scenarios: MEDIEVAL_FANTASY },
  { id: 'staff',          name: 'Büyücü Asası',        type: 'weapon', price: 105, sellPrice: 53,  description: '1d6 arkane hasar, büyüyü güçlendirir', category: 'Silah', rarity: RARITY.EPIC, scenarios: MEDIEVAL_FANTASY },
  { id: 'crossbow',       name: 'Arbalet',             type: 'weapon', price: 115, sellPrice: 58,  description: 'Menzilli silah, 1d10 delici hasar',   category: 'Silah', rarity: RARITY.EPIC, scenarios: MEDIEVAL_FANTASY },
  { id: 'warhammer',      name: 'Savaş Çekici',        type: 'weapon', price: 125, sellPrice: 63,  description: '1d10 ezici hasar, zırh delme gücü',   category: 'Silah', rarity: RARITY.EPIC, scenarios: MEDIEVAL_FANTASY },
  { id: 'sword_steel',    name: 'Çelik Kılıç',         type: 'weapon', price: 140, sellPrice: 70,  description: '1d12 ustaca dövülmüş kesici hasar',   category: 'Silah', rarity: RARITY.EPIC, scenarios: MEDIEVAL_FANTASY },
  { id: 'greatsword',     name: 'İki Elli Kılıç',      type: 'weapon', price: 195, sellPrice: 98,  description: '2d6 ağır kesici hasar',               category: 'Silah', rarity: RARITY.LEGENDARY, scenarios: MEDIEVAL_FANTASY },
  // Armor (classic — not for realistic/scifi/western)
  { id: 'cloak_fur',      name: 'Kürk Pelerin',        type: 'armor',  price: 25,  sellPrice: 12,  description: '+1 AC, soğuğa karşı korur',           category: 'Zırh', rarity: RARITY.UNCOMMON, scenarios: [...MEDIEVAL_FANTASY, 'mountain', 'realistic'] },
  { id: 'shield',         name: 'Kalkan',              type: 'armor',  price: 50,  sellPrice: 25,  description: '+1 AC, sol el',                       category: 'Zırh', rarity: RARITY.UNCOMMON, scenarios: MEDIEVAL_FANTASY },
  { id: 'armor_leather',  name: 'Deri Zırh',           type: 'armor',  price: 70,  sellPrice: 35,  description: '+2 AC',                               category: 'Zırh', rarity: RARITY.RARE, scenarios: MEDIEVAL_FANTASY },
  { id: 'shield_steel',   name: 'Çelik Kalkan',        type: 'armor',  price: 90,  sellPrice: 45,  description: '+2 AC, sol el',                       category: 'Zırh', rarity: RARITY.RARE, scenarios: MEDIEVAL_FANTASY },
  { id: 'armor_chain',    name: 'Zincir Zırh',         type: 'armor',  price: 130, sellPrice: 65,  description: '+4 AC',                               category: 'Zırh', rarity: RARITY.EPIC, scenarios: MEDIEVAL_FANTASY },
  { id: 'armor_half_plate', name: 'Yarı Plaka Zırh',   type: 'armor',  price: 185, sellPrice: 93,  description: '+5 AC',                               category: 'Zırh', rarity: RARITY.LEGENDARY, scenarios: MEDIEVAL_FANTASY },
  { id: 'armor_plate',    name: 'Plaka Zırh',          type: 'armor',  price: 245, sellPrice: 123, description: '+6 AC',                               category: 'Zırh', rarity: RARITY.LEGENDARY, scenarios: MEDIEVAL_FANTASY },
  // Misc / gear (timeless adventuring gear — fits every scenario)
  { id: 'torch',          name: 'Meşale',              type: 'misc',   price: 8,   sellPrice: 4,   description: 'Karanlığı aydınlatır',                category: 'Çeşitli', rarity: RARITY.COMMON, scenarios: ['all'] },
  { id: 'waterskin',      name: 'Su Tulumu',           type: 'misc',   price: 6,   sellPrice: 3,   description: 'Yolculuk için su taşır',              category: 'Çeşitli', rarity: RARITY.COMMON, scenarios: ['all'] },
  { id: 'rope',           name: 'Halat (15m)',         type: 'misc',   price: 15,  sellPrice: 7,   description: 'Tırmanma ve bağlama',                 category: 'Çeşitli', rarity: RARITY.COMMON, scenarios: ['all'] },
  { id: 'map',            name: 'Bölge Haritası',      type: 'misc',   price: 20,  sellPrice: 10,  description: 'Bilinmeyen bölgeleri gösterir',       category: 'Çeşitli', rarity: RARITY.COMMON, scenarios: ['all'] },
  { id: 'lantern',        name: 'Fener',               type: 'misc',   price: 25,  sellPrice: 12,  description: 'Geniş bir alanı aydınlatır',          category: 'Çeşitli', rarity: RARITY.UNCOMMON, scenarios: ['all'] },
  { id: 'lockpicks',      name: 'Kilit Maşası',        type: 'misc',   price: 40,  sellPrice: 20,  description: 'Kilitli kapılar için',                category: 'Çeşitli', rarity: RARITY.UNCOMMON, scenarios: ['all'] },
  { id: 'trap_kit',       name: 'Tuzak Seti',          type: 'misc',   price: 35,  sellPrice: 17,  description: 'Basit av tuzakları kurar',            category: 'Çeşitli', rarity: RARITY.UNCOMMON, scenarios: [...MEDIEVAL_FANTASY, 'realistic', 'western'] },
  { id: 'weapon_poison',  name: 'Silah Zehiri',        type: 'misc',   price: 45,  sellPrice: 22,  description: 'Silaha sürülen etkili zehir',         category: 'Çeşitli', rarity: RARITY.UNCOMMON, scenarios: MEDIEVAL_FANTASY },
  { id: 'rations',        name: 'Seyahat Kumanyası',   type: 'misc',   price: 12,  sellPrice: 5,   description: '3 günlük yiyecek',                    category: 'Çeşitli', rarity: RARITY.COMMON, scenarios: ['all'] },

  // ── Scenario-themed unique items (one image each, only sold/found in their own scenario) ──
  { id: 'dungeon_key',     name: 'Pas Tutmuş Zindan Anahtarı', type: 'misc',   price: 18,  sellPrice: 9,   description: 'Eski hücrelerin kilidini açar',        category: 'Çeşitli', rarity: RARITY.UNCOMMON, scenarios: ['dungeon'], image: '/items/dungeon_key.png' },
  { id: 'chain_gauntlet',  name: 'Kırık Zincir Eldiveni',      type: 'armor',  price: 45,  sellPrice: 22,  description: '+1 AC, zindan enkazından toplanmış',   category: 'Zırh', rarity: RARITY.UNCOMMON, scenarios: ['dungeon'], image: '/items/chain_gauntlet.png' },

  { id: 'elf_bow',         name: 'Elf Yayı',                   type: 'weapon', price: 120, sellPrice: 60,  description: 'Menzilli silah, 1d8+2 delici hasar',   category: 'Silah', rarity: RARITY.EPIC, scenarios: ['forest'], image: '/items/elf_bow.png' },
  { id: 'nature_charm',    name: 'Doğa Ruhu Muskası',          type: 'misc',   price: 40,  sellPrice: 20,  description: 'Ormanın koruyucu ruhlarını yatıştırır', category: 'Çeşitli', rarity: RARITY.RARE, scenarios: ['forest'], image: '/items/nature_charm.png' },

  { id: 'poison_goblet',   name: 'Zehirli Şarap Kadehi',       type: 'misc',   price: 25,  sellPrice: 12,  description: 'Şüpheli bir tüccara satılabilir kanıt', category: 'Çeşitli', rarity: RARITY.UNCOMMON, scenarios: ['tavern'], image: '/items/poison_goblet.png' },
  { id: 'bard_lute',       name: "Ozanın Lavtası",             type: 'misc',   price: 55,  sellPrice: 27,  description: 'Meyhanede karizma bonusu sağlar',      category: 'Çeşitli', rarity: RARITY.RARE, scenarios: ['tavern'], image: '/items/bard_lute.png' },

  { id: 'assassin_dagger', name: 'Suikastçı Hançeri',          type: 'weapon', price: 110, sellPrice: 55,  description: '1d6 gizli saldırıda ekstra hasar',     category: 'Silah', rarity: RARITY.EPIC, scenarios: ['city'], image: '/items/assassin_dagger.png' },
  { id: 'forged_seal',     name: 'Sahte Kimlik Mührü',         type: 'misc',   price: 65,  sellPrice: 32,  description: 'Şehir kapılarından sorgusuz geçirir',  category: 'Çeşitli', rarity: RARITY.RARE, scenarios: ['city'], image: '/items/forged_seal.png' },

  { id: 'dragon_shield',   name: 'Ejderha Pulu Kalkanı',       type: 'armor',  price: 210, sellPrice: 105, description: '+3 AC, ateşe karşı direnç',            category: 'Zırh', rarity: RARITY.LEGENDARY, scenarios: ['dragon'], image: '/items/dragon_shield.png' },
  { id: 'fire_ward_potion', name: 'Alev Dayanıklı İksir',      type: 'potion', price: 90,  sellPrice: 45,  description: 'Bir tur boyunca ateş hasarını yok sayar', category: 'Tüketici', rarity: RARITY.EPIC, scenarios: ['dragon'], image: '/items/fire_ward_potion.png' },

  { id: 'ice_axe',         name: 'Buz Baltası',                type: 'weapon', price: 95,  sellPrice: 47,  description: '1d10 hasar, buzda tutunmayı kolaylaştırır', category: 'Silah', rarity: RARITY.RARE, scenarios: ['mountain'], image: '/items/ice_axe.png' },
  { id: 'climbing_crampon', name: 'Dağ Tırmanma Kramponu',     type: 'misc',   price: 35,  sellPrice: 17,  description: 'Dik yamaçlarda düşme riskini azaltır', category: 'Çeşitli', rarity: RARITY.UNCOMMON, scenarios: ['mountain'], image: '/items/climbing_crampon.png' },

  { id: 'pirate_cutlass',  name: 'Korsan Kılıcı',              type: 'weapon', price: 100, sellPrice: 50,  description: '1d8 kesici hasar, yakın dövüşte hızlı', category: 'Silah', rarity: RARITY.RARE, scenarios: ['sea'], image: '/items/pirate_cutlass.png' },
  { id: 'ship_lantern',    name: 'Deniz Feneri',               type: 'misc',   price: 30,  sellPrice: 15,  description: 'Fırtınalı gecelerde yol gösterir',     category: 'Çeşitli', rarity: RARITY.UNCOMMON, scenarios: ['sea'], image: '/items/ship_lantern.png' },

  { id: 'caravan_whip',    name: 'Kervan Kırbacı',             type: 'weapon', price: 40,  sellPrice: 20,  description: '1d6 hasar, hayvanları yönlendirir',    category: 'Silah', rarity: RARITY.UNCOMMON, scenarios: ['caravan'], image: '/items/caravan_whip.png' },
  { id: 'spice_pouch',     name: 'Baharat Torbası',            type: 'misc',   price: 50,  sellPrice: 25,  description: 'Kervan pazarlarında değerli takas malı', category: 'Çeşitli', rarity: RARITY.RARE, scenarios: ['caravan'], image: '/items/spice_pouch.png' },

  { id: 'hunting_knife',   name: 'Av Bıçağı',                  type: 'weapon', price: 35,  sellPrice: 17,  description: '1d4 kesici hasar, pratik ve sağlam',   category: 'Silah', rarity: RARITY.UNCOMMON, scenarios: ['realistic'], image: '/items/hunting_knife.png' },
  { id: 'first_aid_kit',   name: 'İlk Yardım Çantası',         type: 'misc',   price: 45,  sellPrice: 22,  description: 'Yaraları gerçekçi biçimde sarar, kan kaybını durdurur', category: 'Çeşitli', rarity: RARITY.RARE, scenarios: ['realistic'], image: '/items/first_aid_kit.png' },

  { id: 'blessed_cross',   name: 'Kutsal Haç Kolyesi',         type: 'misc',   price: 40,  sellPrice: 20,  description: 'Karanlık varlıklara karşı koruma verir', category: 'Çeşitli', rarity: RARITY.RARE, scenarios: ['horror'], image: '/items/blessed_cross.png' },
  { id: 'flicker_lantern', name: 'Titrek Fener',               type: 'misc',   price: 22,  sellPrice: 11,  description: 'Yaklaşan tehlike hissedince titrer',   category: 'Çeşitli', rarity: RARITY.UNCOMMON, scenarios: ['horror'], image: '/items/flicker_lantern.png' },

  { id: 'energy_sword',    name: 'Enerji Kılıcı',              type: 'weapon', price: 220, sellPrice: 110, description: '2d6 enerji hasarı, zırhı yakar',       category: 'Silah', rarity: RARITY.LEGENDARY, scenarios: ['scifi'], image: '/items/energy_sword.png' },
  { id: 'nano_vest',       name: 'Nano Zırh Yeleği',           type: 'armor',  price: 180, sellPrice: 90,  description: '+5 AC, kendini otomatik onarır',       category: 'Zırh', rarity: RARITY.LEGENDARY, scenarios: ['scifi'], image: '/items/nano_vest.png' },

  { id: 'revolver',        name: 'Altı Patlar Tabanca',        type: 'weapon', price: 130, sellPrice: 65,  description: 'Menzilli silah, 1d10 delici hasar',    category: 'Silah', rarity: RARITY.EPIC, scenarios: ['western'], image: '/items/revolver.png' },
  { id: 'dynamite_stick',  name: 'Dinamit Çubuğu',             type: 'weapon', price: 70,  sellPrice: 35,  description: '2d8 alan hasarı, riskli kullanım',     category: 'Silah', rarity: RARITY.RARE, scenarios: ['western'], image: '/items/dynamite_stick.png' },

  { id: 'mystery_relic',   name: 'Gizemli Emanet Kutusu',      type: 'misc',   price: 60,  sellPrice: 30,  description: 'İçinde ne olduğu maceranın sonunda belli olur', category: 'Çeşitli', rarity: RARITY.RARE, scenarios: ['custom'], image: '/items/mystery_relic.png' },
];

module.exports = { CATALOG, RARITY };

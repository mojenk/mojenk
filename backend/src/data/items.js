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
  // ── MAĞAZA (Common) — Yeni maceraya başlarken satın alınabilecek temel donanım ──
  { id: 'potion_small',   name: 'Küçük Can İksiri',   type: 'potion', price: 30,  sellPrice: 15,  description: '2d6+8 HP yeniler',                    category: 'Tüketici', rarity: RARITY.COMMON, scenarios: MEDIEVAL_FANTASY, image: '/items/potion_small.png' },
  { id: 'salve_minor',    name: 'Yara Merhemi',        type: 'potion', price: 15,  sellPrice: 7,   description: '1d4+2 HP yeniler',                    category: 'Tüketici', rarity: RARITY.COMMON, scenarios: MEDIEVAL_FANTASY, image: '/items/salve_minor.png' },
  { id: 'antidote',       name: 'Panzehir',            type: 'misc',   price: 30,  sellPrice: 15,  description: 'Zehiri iyileştirir',                  category: 'Tüketici', rarity: RARITY.COMMON, scenarios: [...MEDIEVAL_FANTASY, 'realistic', 'horror'], image: '/items/antidote.png' },

  { id: 'dagger',         name: 'Hançer',              type: 'weapon', price: 30,  sellPrice: 15,  description: '1d4+1 hızlı kesici hasar',            category: 'Silah', rarity: RARITY.COMMON, scenarios: [...MEDIEVAL_FANTASY, 'realistic'], image: '/items/dagger.png' },
  { id: 'sling',          name: 'Sapan',               type: 'weapon', price: 20,  sellPrice: 10,  description: 'Menzilli silah, 1d4+1 künt hasar',    category: 'Silah', rarity: RARITY.COMMON, scenarios: MEDIEVAL_FANTASY, image: '/items/sling.png' },
  { id: 'sword_iron',     name: 'Demir Kılıç',         type: 'weapon', price: 80,  sellPrice: 40,  description: '1d8+1 kesici hasar',                  category: 'Silah', rarity: RARITY.COMMON, scenarios: MEDIEVAL_FANTASY, image: '/items/sword_iron.png' },
  { id: 'sword_short',    name: 'Kısa Kılıç',          type: 'weapon', price: 45,  sellPrice: 22,  description: '1d6+1 hızlı kesici hasar, dar alanlarda ideal', category: 'Silah', rarity: RARITY.COMMON, scenarios: MEDIEVAL_FANTASY, image: '/items/sword_short.png' },
  { id: 'sword_long',     name: 'Uzun Kılıç',          type: 'weapon', price: 70,  sellPrice: 35,  description: '1d8+2 kesici hasar, uzun erişim avantajı', category: 'Silah', rarity: RARITY.COMMON, scenarios: MEDIEVAL_FANTASY, image: '/items/sword_long.png' },
  { id: 'spear',          name: 'Mızrak',              type: 'weapon', price: 55,  sellPrice: 27,  description: '1d8+1 delici hasar, uzun erişim avantajı', category: 'Silah', rarity: RARITY.COMMON, scenarios: MEDIEVAL_FANTASY, image: '/items/spear.png' },

  { id: 'shield_buckler', name: 'Küçük Kalkan',        type: 'armor',  price: 35,  sellPrice: 17,  description: '+1 AC, hafif ve çevik',               category: 'Zırh', rarity: RARITY.COMMON, scenarios: MEDIEVAL_FANTASY, image: '/items/shield_buckler.png' },
  { id: 'shield',         name: 'Kalkan',              type: 'armor',  price: 50,  sellPrice: 25,  description: '+1 AC, sol el',                       category: 'Zırh', rarity: RARITY.COMMON, scenarios: MEDIEVAL_FANTASY, image: '/items/shield.png' },
  { id: 'armor_gambeson', name: 'Yastıklı Zırh',       type: 'armor',  price: 55,  sellPrice: 27,  description: '+2 AC, hafif ve sessiz',              category: 'Zırh', rarity: RARITY.COMMON, scenarios: MEDIEVAL_FANTASY, image: '/items/armor_gambeson.png' },
  { id: 'armor_leather',  name: 'Deri Zırh',           type: 'armor',  price: 70,  sellPrice: 35,  description: '+2 AC',                               category: 'Zırh', rarity: RARITY.COMMON, scenarios: MEDIEVAL_FANTASY, image: '/items/armor_leather.png' },
  { id: 'bracers_leather',name: 'Deri Kolçak',         type: 'armor',  price: 25,  sellPrice: 12,  description: '+1 AC, bilek koruma',                 category: 'Zırh', rarity: RARITY.COMMON, scenarios: MEDIEVAL_FANTASY, image: '/items/bracers_leather.png' },
  { id: 'cloak_fur',      name: 'Kürk Pelerin',        type: 'armor',  price: 25,  sellPrice: 12,  description: '+1 AC, soğuğa karşı korur',           category: 'Zırh', rarity: RARITY.COMMON, scenarios: [...MEDIEVAL_FANTASY, 'mountain', 'realistic'], image: '/items/cloak_fur.png' },
  { id: 'helm_reinforced',name: 'Takviyeli Miğfer',    type: 'armor',  price: 60,  sellPrice: 30,  description: '+1 AC, baş koruması',                 category: 'Zırh', rarity: RARITY.COMMON, scenarios: MEDIEVAL_FANTASY, image: '/items/helm_reinforced.png' },

  { id: 'torch',          name: 'Meşale',              type: 'misc',   price: 8,   sellPrice: 4,   description: 'Karanlığı aydınlatır',                category: 'Çeşitli', rarity: RARITY.COMMON, scenarios: ['all'], image: '/items/torch.png' },
  { id: 'waterskin',      name: 'Su Tulumu',           type: 'misc',   price: 6,   sellPrice: 3,   description: 'Yolculuk için su taşır',              category: 'Çeşitli', rarity: RARITY.COMMON, scenarios: ['all'], image: '/items/waterskin.png' },
  { id: 'rope',           name: 'Halat (15m)',         type: 'misc',   price: 15,  sellPrice: 7,   description: 'Tırmanma ve bağlama',                 category: 'Çeşitli', rarity: RARITY.COMMON, scenarios: ['all'], image: '/items/rope.png' },
  { id: 'map',            name: 'Bölge Haritası',      type: 'misc',   price: 20,  sellPrice: 10,  description: 'Bilinmeyen bölgeleri gösterir',       category: 'Çeşitli', rarity: RARITY.COMMON, scenarios: ['all'], image: '/items/map.png' },
  { id: 'lantern',        name: 'Fener',               type: 'misc',   price: 25,  sellPrice: 12,  description: 'Geniş bir alanı aydınlatır',          category: 'Çeşitli', rarity: RARITY.COMMON, scenarios: ['all'], image: '/items/lantern.png' },
  { id: 'rations',        name: 'Seyahat Kumanyası',   type: 'misc',   price: 12,  sellPrice: 5,   description: '3 günlük yiyecek',                    category: 'Çeşitli', rarity: RARITY.COMMON, scenarios: ['all'], image: '/items/rations.png' },
  { id: 'pickaxe',        name: 'Kazma',               type: 'misc',   price: 18,  sellPrice: 9,   description: 'Kaya ve maden kırmak için',           category: 'Çeşitli', rarity: RARITY.COMMON, scenarios: ['dungeon', 'mountain', 'realistic', 'western'], image: '/items/pickaxe.png' },

  // ── HİKAYE ÖDÜLÜ (Uncommon+) — mağazada satılmaz, sadece hazine arama / savaş ganimeti ile bulunur ──
  { id: 'potion_medium',  name: 'Orta Can İksiri',    type: 'potion', price: 60,  sellPrice: 30,  description: '4d8+15 HP yeniler',                   category: 'Tüketici', rarity: RARITY.RARE, scenarios: MEDIEVAL_FANTASY, image: '/items/potion_medium.png' },
  { id: 'potion_large',   name: 'Büyük Can İksiri',   type: 'potion', price: 95,  sellPrice: 48,  description: '6d10+27 HP yeniler',                  category: 'Tüketici', rarity: RARITY.RARE, scenarios: MEDIEVAL_FANTASY, image: '/items/potion_large.png' },
  { id: 'elixir_dragon',  name: 'Ejderha Kanı İksiri', type: 'potion', price: 195, sellPrice: 98,  description: '8d10+40 HP yeniler, efsanevi şifa',   category: 'Tüketici', rarity: RARITY.LEGENDARY, scenarios: MEDIEVAL_FANTASY, image: '/items/elixir_dragon.png' },
  { id: 'bow',            name: 'Uzun Yay',            type: 'weapon', price: 90,  sellPrice: 45,  description: 'Menzilli silah, 1d8 delici hasar',    category: 'Silah', rarity: RARITY.UNCOMMON, scenarios: MEDIEVAL_FANTASY, image: '/items/bow.png' },
  { id: 'axe',            name: 'Savaş Baltası',       type: 'weapon', price: 100, sellPrice: 50,  description: '1d10 ezici kesici hasar',             category: 'Silah', rarity: RARITY.RARE, scenarios: MEDIEVAL_FANTASY, image: '/items/axe.png' },
  { id: 'staff',          name: 'Büyücü Asası',        type: 'weapon', price: 105, sellPrice: 53,  description: '1d6 arkane hasar, büyüyü güçlendirir', category: 'Silah', rarity: RARITY.RARE, scenarios: MEDIEVAL_FANTASY, image: '/items/staff.png' },
  { id: 'crossbow',       name: 'Arbalet',             type: 'weapon', price: 115, sellPrice: 58,  description: 'Menzilli silah, 1d10 delici hasar',   category: 'Silah', rarity: RARITY.RARE, scenarios: MEDIEVAL_FANTASY, image: '/items/crossbow.png' },
  { id: 'warhammer',      name: 'Savaş Çekici',        type: 'weapon', price: 125, sellPrice: 63,  description: '1d10 ezici hasar, zırh delme gücü',   category: 'Silah', rarity: RARITY.EPIC, scenarios: MEDIEVAL_FANTASY, image: '/items/warhammer.png' },
  { id: 'sword_broad',    name: 'Geniş Kılıç',        type: 'weapon', price: 95,  sellPrice: 47,  description: '1d10 ağır kesici hasar, güçlü vuruşlar', category: 'Silah', rarity: RARITY.UNCOMMON, scenarios: MEDIEVAL_FANTASY, image: '/items/sword_broad.png' },
  { id: 'sword_twin',     name: 'Çift Kılıç',         type: 'weapon', price: 110, sellPrice: 55,  description: '1d6+1 çift el hasarı, hızlı kombolar', category: 'Silah', rarity: RARITY.RARE, scenarios: MEDIEVAL_FANTASY, image: '/items/sword_twin.png' },
  { id: 'sword_scimitar', name: 'Kıvrık Kılıç',       type: 'weapon', price: 85,  sellPrice: 42,  description: '1d8+1 kesici hasar, hafif ve keskin', category: 'Silah', rarity: RARITY.UNCOMMON, scenarios: [...MEDIEVAL_FANTASY, 'sea'], image: '/items/sword_scimitar.png' },
  { id: 'sword_rapier',   name: 'Noktalayıcı Kılıç',  type: 'weapon', price: 120, sellPrice: 60,  description: '1d8 delici hasar, ince zırh delici', category: 'Silah', rarity: RARITY.RARE, scenarios: MEDIEVAL_FANTASY, image: '/items/sword_rapier.png' },
  { id: 'sword_cleaver',  name: 'Kasap Kılıcı',       type: 'weapon', price: 130, sellPrice: 65,  description: '1d12 yırtıcı hasar, vahşi darbeler', category: 'Silah', rarity: RARITY.EPIC, scenarios: MEDIEVAL_FANTASY, image: '/items/sword_cleaver.png' },
  { id: 'sword_flame',    name: 'Alev Kılıcı',        type: 'weapon', price: 210, sellPrice: 105, description: '1d10+1d6 ateş hasarı, efsanevi güç', category: 'Silah', rarity: RARITY.LEGENDARY, scenarios: MEDIEVAL_FANTASY, image: '/items/sword_flame.png' },
  { id: 'greatsword',     name: 'İki Elli Kılıç',      type: 'weapon', price: 195, sellPrice: 98,  description: '2d6 ağır kesici hasar',               category: 'Silah', rarity: RARITY.LEGENDARY, scenarios: MEDIEVAL_FANTASY, image: '/items/greatsword.png' },

  { id: 'shield_heater',  name: 'Çelik Kalkan',        type: 'armor',  price: 90,  sellPrice: 45,  description: '+2 AC, sol el',                       category: 'Zırh', rarity: RARITY.UNCOMMON, scenarios: MEDIEVAL_FANTASY, image: '/items/shield_heater.png' },
  { id: 'armor_chainmail',name: 'Zincir Gömlek',       type: 'armor',  price: 110, sellPrice: 55,  description: '+3 AC',                               category: 'Zırh', rarity: RARITY.RARE, scenarios: MEDIEVAL_FANTASY, image: '/items/armor_chainmail.png' },
  { id: 'armor_chain',    name: 'Zincir Zırh',         type: 'armor',  price: 130, sellPrice: 65,  description: '+4 AC',                               category: 'Zırh', rarity: RARITY.EPIC, scenarios: MEDIEVAL_FANTASY, image: '/items/armor_chainmail.png' },
  { id: 'armor_half_plate', name: 'Yarı Plaka Zırh',   type: 'armor',  price: 185, sellPrice: 93,  description: '+5 AC',                               category: 'Zırh', rarity: RARITY.LEGENDARY, scenarios: MEDIEVAL_FANTASY, image: '/items/armor_plate_cuirass.png' },
  { id: 'armor_plate',    name: 'Plaka Zırh',          type: 'armor',  price: 245, sellPrice: 123, description: '+6 AC',                               category: 'Zırh', rarity: RARITY.LEGENDARY, scenarios: MEDIEVAL_FANTASY, image: '/items/armor_plate_cuirass.png' },
  { id: 'armor_elven_leaf', name: 'Elf Yaprak Zırhı',  type: 'armor',  price: 150, sellPrice: 75,  description: '+4 AC, sessiz hareket',               category: 'Zırh', rarity: RARITY.EPIC, scenarios: ['forest', 'city'], image: '/items/armor_elven_leaf.png' },

  { id: 'poison_vial',    name: 'Zehir Şişesi',        type: 'misc',   price: 45,  sellPrice: 22,  description: 'Silaha sürülen etkili zehir',         category: 'Çeşitli', rarity: RARITY.UNCOMMON, scenarios: MEDIEVAL_FANTASY, image: '/items/poison_vial.png' },
  { id: 'bone_amulet',    name: 'Kemik Tılsım',        type: 'misc',   price: 55,  sellPrice: 27,  description: 'Ölüleri uzak tutan tılsım',           category: 'Çeşitli', rarity: RARITY.RARE, scenarios: ['dungeon', 'horror'], image: '/items/bone_amulet.png' },
  { id: 'barbed_wire',    name: 'Dikenli Tel',         type: 'misc',   price: 35,  sellPrice: 17,  description: 'Savunma hattı veya tuzak için',       category: 'Çeşitli', rarity: RARITY.UNCOMMON, scenarios: ['western', 'realistic', 'horror'], image: '/items/barbed_wire.png' },
  { id: 'lockpicks',      name: 'Kilit Maşası',        type: 'misc',   price: 40,  sellPrice: 20,  description: 'Kilitli kapılar için',                category: 'Çeşitli', rarity: RARITY.UNCOMMON, scenarios: ['all'], image: '/items/lockpicks.png' },
  { id: 'trap_kit',       name: 'Tuzak Seti',          type: 'misc',   price: 35,  sellPrice: 17,  description: 'Basit av tuzakları kurar',            category: 'Çeşitli', rarity: RARITY.UNCOMMON, scenarios: [...MEDIEVAL_FANTASY, 'realistic', 'western'], image: '/items/trap_kit.png' },

  // ── EVCİL HAYVANLAR & BİNEKLER — mağazadan alınır, envanter slotu kaplamaz ──
  // dice_luck_bonus: zar sansina kucuk katki (0.05 = %5). carry_bonus: envanter kapasitesi.
  { id: 'pet_wolf',       name: 'Kurt Yavrusu',      type: 'pet',   price: 150, sellPrice: 0, description: 'Sadık bir kurt. Zar şansı +%5, hikayede yanında savaşır.', category: 'Evcil Hayvan', rarity: RARITY.RARE, scenarios: ['all'], dice_luck_bonus: 0.05 },
  { id: 'pet_owl',        name: 'Bilge Baykuş',      type: 'pet',   price: 100, sellPrice: 0, description: 'Gece gözcüsü. Zar şansı +%3, tuzak ve tehlikeleri önceden sezer.', category: 'Evcil Hayvan', rarity: RARITY.UNCOMMON, scenarios: ['all'], dice_luck_bonus: 0.03 },
  { id: 'pet_raven',      name: 'Kuzgun',            type: 'pet',   price: 120, sellPrice: 0, description: 'Kehanet kuşu. Zar şansı +%4, sırları kulağına fısıldar.', category: 'Evcil Hayvan', rarity: RARITY.UNCOMMON, scenarios: ['all'], dice_luck_bonus: 0.04 },
  { id: 'pet_cat',        name: 'Gölge Kedisi',      type: 'pet',   price: 90,  sellPrice: 0, description: 'Sessiz avcı. Zar şansı +%2, gizlilik anlarında yardım eder.', category: 'Evcil Hayvan', rarity: RARITY.COMMON, scenarios: ['all'], dice_luck_bonus: 0.02 },
  { id: 'mount_horse',    name: 'Binek Atı',         type: 'mount', price: 200, sellPrice: 0, description: 'Hızlı ve sadık. Zar şansı +%3, kaçış ve yolculuklarda avantaj.', category: 'Binek', rarity: RARITY.RARE, scenarios: ['all'], dice_luck_bonus: 0.03 },
  { id: 'mount_mule',     name: 'Yük Katırı',        type: 'mount', price: 120, sellPrice: 0, description: 'İnatçı ve dayanıklı. Envanter kapasitesi +8.', category: 'Binek', rarity: RARITY.UNCOMMON, scenarios: ['all'], carry_bonus: 8 },

  // ── KOZMETİK: UNVANLAR — karakter adının yanında görünür ──
  { id: 'title_dragon_slayer',    name: 'Ejder Avcısı',         type: 'cosmetic', cosmetic_kind: 'title', cosmetic_value: 'Ejder Avcısı',         price: 300, sellPrice: 0, description: 'Adının yanında «Ejder Avcısı» unvanı görünür.',        category: 'Unvan', rarity: RARITY.LEGENDARY, scenarios: ['all'] },
  { id: 'title_shadow_walker',    name: 'Gölge Yürüyen',        type: 'cosmetic', cosmetic_kind: 'title', cosmetic_value: 'Gölge Yürüyen',        price: 200, sellPrice: 0, description: 'Adının yanında «Gölge Yürüyen» unvanı görünür.',       category: 'Unvan', rarity: RARITY.EPIC, scenarios: ['all'] },
  { id: 'title_fate_writer',      name: 'Kader Yazıcısı',       type: 'cosmetic', cosmetic_kind: 'title', cosmetic_value: 'Kader Yazıcısı',       price: 250, sellPrice: 0, description: 'Adının yanında «Kader Yazıcısı» unvanı görünür.',      category: 'Unvan', rarity: RARITY.EPIC, scenarios: ['all'] },
  { id: 'title_dungeon_conqueror',name: 'Zindan Fatihi',        type: 'cosmetic', cosmetic_kind: 'title', cosmetic_value: 'Zindan Fatihi',        price: 200, sellPrice: 0, description: 'Adının yanında «Zindan Fatihi» unvanı görünür.',       category: 'Unvan', rarity: RARITY.EPIC, scenarios: ['all'] },
  { id: 'title_caravan_lord',     name: 'Kervan Lordu',         type: 'cosmetic', cosmetic_kind: 'title', cosmetic_value: 'Kervan Lordu',         price: 180, sellPrice: 0, description: 'Adının yanında «Kervan Lordu» unvanı görünür.',        category: 'Unvan', rarity: RARITY.RARE, scenarios: ['all'] },
  { id: 'title_arena_champion',   name: 'Arena Şampiyonu',      type: 'cosmetic', cosmetic_kind: 'title', cosmetic_value: 'Arena Şampiyonu',      price: 220, sellPrice: 0, description: 'Adının yanında «Arena Şampiyonu» unvanı görünür.',     category: 'Unvan', rarity: RARITY.EPIC, scenarios: ['all'] },
  { id: 'title_immortal',         name: 'Ölümsüz',              type: 'cosmetic', cosmetic_kind: 'title', cosmetic_value: 'Ölümsüz',              price: 400, sellPrice: 0, description: 'Adının yanında «Ölümsüz» unvanı görünür.',             category: 'Unvan', rarity: RARITY.LEGENDARY, scenarios: ['all'] },

  // ── KOZMETİK: PORTRE ÇERÇEVELERİ — karakter portresinin etrafını süsler ──
  { id: 'frame_gold',     name: 'Altın Çerçeve',     type: 'cosmetic', cosmetic_kind: 'frame', cosmetic_value: 'gold',     price: 150, sellPrice: 0, description: 'Portreni altın bir çerçeveyle süsler.',   category: 'Çerçeve', rarity: RARITY.RARE, scenarios: ['all'] },
  { id: 'frame_emerald',  name: 'Zümrüt Çerçeve',    type: 'cosmetic', cosmetic_kind: 'frame', cosmetic_value: 'emerald',  price: 150, sellPrice: 0, description: 'Portreni zümrüt bir çerçeveyle süsler.',  category: 'Çerçeve', rarity: RARITY.RARE, scenarios: ['all'] },
  { id: 'frame_crimson',  name: 'Kızıl Çerçeve',     type: 'cosmetic', cosmetic_kind: 'frame', cosmetic_value: 'crimson',  price: 150, sellPrice: 0, description: 'Portreni kızıl bir çerçeveyle süsler.',   category: 'Çerçeve', rarity: RARITY.RARE, scenarios: ['all'] },

  // ── GERCEK PARA PAKETLERI (Google Play urun ID'leri; magazada kart olarak gorunur) ──
  { id: 'pack_titles', name: 'Unvan Paketi (7 unvan)', type: 'pack', pack_grants: ['title_dragon_slayer','title_shadow_walker','title_fate_writer','title_dungeon_conqueror','title_caravan_lord','title_arena_champion','title_immortal'], price: 0, sellPrice: 0, play_product_id: 'pack_titles', description: 'Tüm unvanların kilidini açar: Ejder Avcısı, Gölge Yürüyen, Kader Yazıcısı, Zindan Fatihi, Kervan Lordu, Arena Şampiyonu, Ölümsüz.', category: 'Paket', rarity: RARITY.LEGENDARY, scenarios: ['all'] },
  { id: 'pack_frames', name: 'Çerçeve Paketi (3 çerçeve)', type: 'pack', pack_grants: ['frame_gold','frame_emerald','frame_crimson'], price: 0, sellPrice: 0, play_product_id: 'pack_frames', description: 'Tüm portre çerçevelerinin kilidini açar: Altın, Zümrüt, Kızıl.', category: 'Paket', rarity: RARITY.LEGENDARY, scenarios: ['all'] },

  // ── KOZMETİK: ZAR TEMALARI — zar animasyonunun rengini değiştirir ──
  { id: 'dice_skin_ember', image: '/items/dice_ember.png', play_product_id: 'dice_ember',  name: 'Kor Zar',      type: 'cosmetic', cosmetic_kind: 'dice_skin', cosmetic_value: 'ember',  price: 120, sellPrice: 0, description: 'Zarların ateşli kor rengiyle yanar.',    category: 'Zar Teması', rarity: RARITY.RARE, scenarios: ['all'] },
  { id: 'dice_skin_frost', image: '/items/dice_frost.png', play_product_id: 'dice_frost',  name: 'Buz Zarı',     type: 'cosmetic', cosmetic_kind: 'dice_skin', cosmetic_value: 'frost',  price: 120, sellPrice: 0, description: 'Zarların buz mavisiyle parlar.',         category: 'Zar Teması', rarity: RARITY.RARE, scenarios: ['all'] },
  { id: 'dice_skin_shadow', image: '/items/dice_shadow.png', play_product_id: 'dice_shadow', name: 'Gölge Zarı',   type: 'cosmetic', cosmetic_kind: 'dice_skin', cosmetic_value: 'shadow', price: 120, sellPrice: 0, description: 'Zarların karanlık morla kaplanır.',      category: 'Zar Teması', rarity: RARITY.RARE, scenarios: ['all'] },
  { id: 'dice_skin_royal', image: '/items/dice_royal.png', play_product_id: 'dice_royal',  name: 'Kraliyet Zarı',type: 'cosmetic', cosmetic_kind: 'dice_skin', cosmetic_value: 'royal',  price: 180, sellPrice: 0, description: 'Zarların saf altın ihtişamıyla döner.',  category: 'Zar Teması', rarity: RARITY.EPIC, scenarios: ['all'] },
  { id: 'dice_skin_arcane', image: '/items/dice_arcane.png', play_product_id: 'dice_arcane', name: 'Arkane Zar',   type: 'cosmetic', cosmetic_kind: 'dice_skin', cosmetic_value: 'arcane', price: 150, sellPrice: 0, description: 'Zarların büyülü turkuazla ışıldar.',     category: 'Zar Teması', rarity: RARITY.RARE, scenarios: ['all'] },

  // ── Senaryo-temalı eşyalar (her senaryoya özel, mağazada satılmaz, sadece hikayede bulunur) ──
  { id: 'dungeon_key',     name: 'Pas Tutmuş Zindan Anahtarı', type: 'misc',   price: 18,  sellPrice: 9,   description: 'Eski hücrelerin kilidini açar',        category: 'Çeşitli', rarity: RARITY.UNCOMMON, scenarios: ['dungeon'], image: '/items/dungeon_key.png' },
  { id: 'chain_gauntlet',  name: 'Kırık Zincir Eldiveni',      type: 'armor',  price: 45,  sellPrice: 22,  description: '+1 AC, zindan enkazından toplanmış',   category: 'Zırh', rarity: RARITY.UNCOMMON, scenarios: ['dungeon'], image: '/items/chain_gauntlet.png' },
  { id: 'dungeon_helm',    name: 'Zindan Muhafızı Migferi',    type: 'armor',  price: 60,  sellPrice: 30,  description: '+2 AC, ağır ve pas kokulu',             category: 'Zırh', rarity: RARITY.RARE, scenarios: ['dungeon'], image: '/items/dungeon_helm.png' },

  { id: 'elf_bow',         name: 'Elf Yayı',                   type: 'weapon', price: 120, sellPrice: 60,  description: 'Menzilli silah, 1d8+2 delici hasar',   category: 'Silah', rarity: RARITY.EPIC, scenarios: ['forest'], image: '/items/elf_bow.png' },
  { id: 'nature_charm',    name: 'Doğa Ruhu Muskası',          type: 'misc',   price: 40,  sellPrice: 20,  description: 'Ormanın koruyucu ruhlarını yatıştırır', category: 'Çeşitli', rarity: RARITY.RARE, scenarios: ['forest'], image: '/items/nature_charm.png' },
  { id: 'fae_cloak',       name: 'Orman Perisi Pelerini',      type: 'armor',  price: 95,  sellPrice: 47,  description: '+2 AC, gölgelerde fark edilmeyi zorlaştırır', category: 'Zırh', rarity: RARITY.RARE, scenarios: ['forest'], image: '/items/fae_cloak.png' },

  { id: 'poison_goblet',   name: 'Zehirli Şarap Kadehi',       type: 'misc',   price: 25,  sellPrice: 12,  description: 'Şüpheli bir tüccara satılabilir kanıt', category: 'Çeşitli', rarity: RARITY.UNCOMMON, scenarios: ['tavern'], image: '/items/poison_goblet.png' },
  { id: 'bard_lute',       name: "Ozanın Lavtası",             type: 'misc',   price: 55,  sellPrice: 27,  description: 'Meyhanede karizma bonusu sağlar',      category: 'Çeşitli', rarity: RARITY.RARE, scenarios: ['tavern'], image: '/items/bard_lute.png' },
  { id: 'loaded_dice',     name: 'Kumarbaz Zar Takımı',        type: 'misc',   price: 35,  sellPrice: 17,  description: 'Hileli zarlar, meyhane kumarında avantaj', category: 'Çeşitli', rarity: RARITY.UNCOMMON, scenarios: ['tavern'], image: '/items/loaded_dice.png' },

  { id: 'assassin_dagger', name: 'Suikastçı Hançeri',          type: 'weapon', price: 110, sellPrice: 55,  description: '1d6 gizli saldırıda ekstra hasar',     category: 'Silah', rarity: RARITY.EPIC, scenarios: ['city'], image: '/items/assassin_dagger.png' },
  { id: 'forged_seal',     name: 'Sahte Kimlik Mührü',         type: 'misc',   price: 65,  sellPrice: 32,  description: 'Şehir kapılarından sorgusuz geçirir',  category: 'Çeşitli', rarity: RARITY.RARE, scenarios: ['city'], image: '/items/forged_seal.png' },
  { id: 'guard_shield',    name: 'Şehir Muhafız Kalkanı',      type: 'armor',  price: 85,  sellPrice: 42,  description: '+2 AC, kent arması işlenmiş',          category: 'Zırh', rarity: RARITY.RARE, scenarios: ['city'], image: '/items/guard_shield.png' },

  { id: 'dragon_shield',   name: 'Ejderha Pulu Kalkanı',       type: 'armor',  price: 210, sellPrice: 105, description: '+3 AC, ateşe karşı direnç',            category: 'Zırh', rarity: RARITY.LEGENDARY, scenarios: ['dragon'], image: '/items/dragon_shield.png' },
  { id: 'fire_ward_potion', name: 'Alev Dayanıklı İksir',      type: 'potion', price: 90,  sellPrice: 45,  description: 'Bir tur boyunca ateş hasarını yok sayar', category: 'Tüketici', rarity: RARITY.EPIC, scenarios: ['dragon'], image: '/items/fire_ward_potion.png' },
  { id: 'dragon_tooth',    name: 'Ejderha Dişi Kolyesi',       type: 'misc',   price: 130, sellPrice: 65,  description: 'Efsanevi bir avın nişanesi, korku salar', category: 'Çeşitli', rarity: RARITY.EPIC, scenarios: ['dragon'], image: '/items/dragon_tooth.png' },

  { id: 'ice_axe',         name: 'Buz Baltası',                type: 'weapon', price: 95,  sellPrice: 47,  description: '1d10 hasar, buzda tutunmayı kolaylaştırır', category: 'Silah', rarity: RARITY.RARE, scenarios: ['mountain'], image: '/items/ice_axe.png' },
  { id: 'climbing_crampon', name: 'Dağ Tırmanma Kramponu',     type: 'misc',   price: 35,  sellPrice: 17,  description: 'Dik yamaçlarda düşme riskini azaltır', category: 'Çeşitli', rarity: RARITY.UNCOMMON, scenarios: ['mountain'], image: '/items/climbing_crampon.png' },
  { id: 'giant_club',      name: 'Dağ Devi Topuzu',            type: 'weapon', price: 150, sellPrice: 75,  description: '2d6 ezici hasar, çok ağır',            category: 'Silah', rarity: RARITY.EPIC, scenarios: ['mountain'], image: '/items/giant_club.png' },

  { id: 'pirate_cutlass',  name: 'Korsan Kılıcı',              type: 'weapon', price: 100, sellPrice: 50,  description: '1d8 kesici hasar, yakın dövüşte hızlı', category: 'Silah', rarity: RARITY.RARE, scenarios: ['sea'], image: '/items/pirate_cutlass.png' },
  { id: 'ship_lantern',    name: 'Deniz Feneri',               type: 'misc',   price: 30,  sellPrice: 15,  description: 'Fırtınalı gecelerde yol gösterir',     category: 'Çeşitli', rarity: RARITY.UNCOMMON, scenarios: ['sea'], image: '/items/ship_lantern.png' },
  { id: 'harpoon',         name: 'Denizci Zıpkını',            type: 'weapon', price: 85,  sellPrice: 42,  description: '1d10 delici hasar, uzun menzil',       category: 'Silah', rarity: RARITY.RARE, scenarios: ['sea'], image: '/items/harpoon.png' },

  { id: 'caravan_whip',    name: 'Kervan Kırbacı',             type: 'weapon', price: 40,  sellPrice: 20,  description: '1d6 hasar, hayvanları yönlendirir',    category: 'Silah', rarity: RARITY.UNCOMMON, scenarios: ['caravan'], image: '/items/caravan_whip.png' },
  { id: 'spice_pouch',     name: 'Baharat Torbası',            type: 'misc',   price: 50,  sellPrice: 25,  description: 'Kervan pazarlarında değerli takas malı', category: 'Çeşitli', rarity: RARITY.RARE, scenarios: ['caravan'], image: '/items/spice_pouch.png' },
  { id: 'caravan_spear',   name: 'Kervan Nöbetçi Mızrağı',     type: 'weapon', price: 65,  sellPrice: 32,  description: '1d8 delici hasar, uzun menzil avantajı', category: 'Silah', rarity: RARITY.UNCOMMON, scenarios: ['caravan'], image: '/items/caravan_spear.png' },

  { id: 'hunting_knife',   name: 'Av Bıçağı',                  type: 'weapon', price: 35,  sellPrice: 17,  description: '1d4 kesici hasar, pratik ve sağlam',   category: 'Silah', rarity: RARITY.UNCOMMON, scenarios: ['realistic'], image: '/items/hunting_knife.png' },
  { id: 'first_aid_kit',   name: 'İlk Yardım Çantası',         type: 'misc',   price: 45,  sellPrice: 22,  description: 'Yaraları gerçekçi biçimde sarar, kan kaybını durdurur', category: 'Çeşitli', rarity: RARITY.RARE, scenarios: ['realistic'], image: '/items/first_aid_kit.png' },
  { id: 'tactical_vest',   name: 'Taktik Yelek',               type: 'armor',  price: 100, sellPrice: 50,  description: '+3 AC, sağlam ve pratik',              category: 'Zırh', rarity: RARITY.RARE, scenarios: ['realistic'], image: '/items/tactical_vest.png' },

  { id: 'blessed_cross',   name: 'Kutsal Haç Kolyesi',         type: 'misc',   price: 40,  sellPrice:  20, description: 'Karanlık varlıklara karşı koruma verir', category: 'Çeşitli', rarity: RARITY.RARE, scenarios: ['horror'], image: '/items/blessed_cross.png' },
  { id: 'flicker_lantern', name: 'Titrek Fener',               type: 'misc',   price: 22,  sellPrice: 11,  description: 'Yaklaşan tehlike hissedince titrer',   category: 'Çeşitli', rarity: RARITY.UNCOMMON, scenarios: ['horror'], image: '/items/flicker_lantern.png' },
  { id: 'ancient_talisman', name: 'Kadim Tılsım',              type: 'misc',   price: 75,  sellPrice: 37,  description: 'Eski bir koruma büyüsü taşır',         category: 'Çeşitli', rarity: RARITY.RARE, scenarios: ['horror'], image: '/items/ancient_talisman.png' },

  { id: 'energy_sword',    name: 'Enerji Kılıcı',              type: 'weapon', price: 220, sellPrice: 110, description: '2d6 enerji hasarı, zırhı yakar',       category: 'Silah', rarity: RARITY.LEGENDARY, scenarios: ['scifi'], image: '/items/energy_sword.png' },
  { id: 'nano_vest',       name: 'Nano Zırh Yeleği',           type: 'armor',  price: 180, sellPrice: 90,  description: '+5 AC, kendini otomatik onarır',       category: 'Zırh', rarity: RARITY.LEGENDARY, scenarios: ['scifi'], image: '/items/nano_vest.png' },
  { id: 'plasma_pistol',   name: 'Plazma Tabancası',           type: 'weapon', price: 140, sellPrice: 70,  description: 'Menzilli silah, 1d10 enerji hasarı',   category: 'Silah', rarity: RARITY.EPIC, scenarios: ['scifi'], image: '/items/plasma_pistol.png' },

  { id: 'revolver',        name: 'Altı Patlar Tabanca',        type: 'weapon', price: 130, sellPrice: 65,  description: 'Menzilli silah, 1d10 delici hasar',    category: 'Silah', rarity: RARITY.EPIC, scenarios: ['western'], image: '/items/revolver.png' },
  { id: 'dynamite_stick',  name: 'Dinamit Çubuğu',             type: 'weapon', price: 70,  sellPrice: 35,  description: '2d8 alan hasarı, riskli kullanım',     category: 'Silah', rarity: RARITY.RARE, scenarios: ['western'], image: '/items/dynamite_stick.png' },
  { id: 'winchester_rifle', name: 'Winchester Tüfeği',         type: 'weapon', price: 160, sellPrice: 80,  description: 'Menzilli silah, 1d12 delici hasar',    category: 'Silah', rarity: RARITY.EPIC, scenarios: ['western'], image: '/items/winchester_rifle.png' },
  { id: 'sheriff_badge',   name: 'Şerif Yıldızı',              type: 'misc',   price: 55,  sellPrice: 27,  description: 'Batı kasabasında otorite simgesi',     category: 'Çeşitli', rarity: RARITY.RARE, scenarios: ['western'], image: '/items/sheriff_badge.png' },
  { id: 'cowboy_hat',      name: 'Kovboy Şapkası',             type: 'armor',  price: 30,  sellPrice: 15,  description: '+1 AC, güneş ve yumruk korur',         category: 'Zırh', rarity: RARITY.UNCOMMON, scenarios: ['western'], image: '/items/cowboy_hat.png' },
  { id: 'duster_coat',     name: 'Uzun Deri Pardösü',          type: 'armor',  price: 75,  sellPrice: 37,  description: '+2 AC, tozlu yollarda koruma',         category: 'Zırh', rarity: RARITY.RARE, scenarios: ['western'], image: '/items/duster_coat.png' },

  { id: 'mystery_relic',   name: 'Gizemli Emanet Kutusu',      type: 'misc',   price: 60,  sellPrice: 30,  description: 'İçinde ne olduğu maceranın sonunda belli olur', category: 'Çeşitli', rarity: RARITY.RARE, scenarios: ['custom'], image: '/items/mystery_relic.png' },
  { id: 'fate_dice',       name: "Kader'in Zarı",              type: 'misc',   price: 100, sellPrice: 50,  description: 'Kaderi değiştirdiğine inanılan gizemli bir zar', category: 'Çeşitli', rarity: RARITY.EPIC, scenarios: ['custom'], image: '/items/fate_dice.png' },

  // ── Modern/Western/Sci-Fi/Korku senaryolarının MAĞAZA (Common) donanımı ──
  // Bu senaryolarda kılıç/zırh satılmaz; dönemine uygun temel ekipman satılır.
  { id: 'pistol_basic',    name: 'Basit Tabanca',              type: 'weapon', price: 75,  sellPrice: 37,  description: 'Menzilli silah, 1d8+1 delici hasar',   category: 'Silah', rarity: RARITY.COMMON, scenarios: ['western', 'realistic'], image: '/items/pistol_basic.png' },
  { id: 'lasso',           name: 'Kement',                     type: 'weapon', price: 25,  sellPrice: 12,  description: 'Hedefi bağlar, 1d4 künt hasar',        category: 'Silah', rarity: RARITY.COMMON, scenarios: ['western'], image: '/items/lasso.png' },
  { id: 'canteen',         name: 'Matara',                     type: 'misc',   price: 10,  sellPrice: 5,   description: 'Çölde su taşır',                       category: 'Çeşitli', rarity: RARITY.COMMON, scenarios: ['western', 'realistic', 'scifi'], image: '/items/canteen.png' },
  { id: 'bandolier',       name: 'Fişeklik',                   type: 'armor',  price: 40,  sellPrice: 20,  description: '+1 AC, ekstra mermi taşır',            category: 'Zırh', rarity: RARITY.COMMON, scenarios: ['western', 'realistic'], image: '/items/bandolier.png' },

  { id: 'laser_pistol',    name: 'Lazer Tabancası',            type: 'weapon', price: 85,  sellPrice: 42,  description: 'Menzilli silah, 1d8+1 enerji hasarı',  category: 'Silah', rarity: RARITY.COMMON, scenarios: ['scifi'], image: '/items/laser_pistol.png' },
  { id: 'stim_injector',   name: 'Stim Enjektörü',             type: 'potion', price: 35,  sellPrice: 17,  description: '2d6+8 HP yeniler, anında etki',        category: 'Tüketici', rarity: RARITY.COMMON, scenarios: ['scifi'], image: '/items/stim_injector.png' },
  { id: 'multi_tool',      name: 'Çok Amaçlı Tarayıcı',        type: 'misc',   price: 30,  sellPrice: 15,  description: 'Cihazları tarar ve onarır',            category: 'Çeşitli', rarity: RARITY.COMMON, scenarios: ['scifi'], image: '/items/multi_tool.png' },
  { id: 'jumpsuit_vest',   name: 'Hafif Zırh Yeleği',          type: 'armor',  price: 65,  sellPrice: 32,  description: '+2 AC, hafif kompozit plaka',          category: 'Zırh', rarity: RARITY.COMMON, scenarios: ['scifi'], image: '/items/jumpsuit_vest.png' },
  { id: 'shield_energy',   name: 'Enerji Kalkanı',             type: 'armor',  price: 120, sellPrice: 60,  description: '+3 AC, enerji bariyeri üretir',        category: 'Zırh', rarity: RARITY.RARE, scenarios: ['scifi'], image: '/items/shield_energy.png' },

  { id: 'flashlight',      name: 'El Feneri',                  type: 'misc',   price: 20,  sellPrice: 10,  description: 'Karanlığı aydınlatır, pili sınırlı',   category: 'Çeşitli', rarity: RARITY.COMMON, scenarios: ['horror', 'realistic', 'scifi'], image: '/items/flashlight.png' },
  { id: 'candles',         name: 'Mum Demeti',                 type: 'misc',   price: 8,   sellPrice: 4,   description: 'Loş ışık verir, ritüellerde kullanılır', category: 'Çeşitli', rarity: RARITY.COMMON, scenarios: ['horror'], image: '/items/candles.png' },
  { id: 'holy_water',      name: 'Kutsal Su',                  type: 'potion', price: 30,  sellPrice: 15,  description: 'Karanlık varlıklara 2d6 hasar verir',  category: 'Tüketici', rarity: RARITY.COMMON, scenarios: ['horror'], image: '/items/holy_water.png' },
  { id: 'crowbar',         name: 'Levye',                      type: 'weapon', price: 35,  sellPrice: 17,  description: '1d6+1 künt hasar, kapı açar',          category: 'Silah', rarity: RARITY.COMMON, scenarios: ['horror', 'realistic', 'scifi'], image: '/items/crowbar.png' },

  { id: 'pocket_knife',    name: 'Çakı',                       type: 'weapon', price: 20,  sellPrice: 10,  description: '1d4 kesici hasar, her işe yarar',      category: 'Silah', rarity: RARITY.COMMON, scenarios: ['realistic', 'horror', 'scifi', 'western'], image: '/items/pocket_knife.png' },
  { id: 'duct_tape',       name: 'Koli Bandı',                 type: 'misc',   price: 12,  sellPrice: 6,   description: 'Eşyaları onarır ve birleştirir',       category: 'Çeşitli', rarity: RARITY.COMMON, scenarios: ['realistic', 'horror', 'scifi'], image: '/items/duct_tape.png' },
  { id: 'backpack_hiking', name: 'Sırt Çantası',               type: 'misc',   price: 45,  sellPrice: 22,  description: 'Envanter kapasiteni +8 artırır',    category: 'Çeşitli', rarity: RARITY.COMMON, scenarios: ['realistic', 'horror', 'scifi', 'western'], image: '/items/backpack_hiking.png', carry_bonus: 8 },
  { id: 'binoculars',      name: 'Dürbün',                     type: 'misc',   price: 40,  sellPrice: 20,  description: 'Uzaktaki tehlikeleri görmeni sağlar',  category: 'Çeşitli', rarity: RARITY.COMMON, scenarios: ['realistic', 'horror', 'scifi', 'western'], image: '/items/binoculars.png' },
  { id: 'heavy_jacket',    name: 'Kalın Ceket',                type: 'armor',  price: 50,  sellPrice: 25,  description: '+2 AC, soğuk ve darbelere karşı korur', category: 'Zırh', rarity: RARITY.COMMON, scenarios: ['horror', 'realistic'], image: '/items/heavy_jacket.png' },
  { id: 'whiskey_bottle',  name: 'Viski Şişesi',               type: 'potion', price: 22,  sellPrice: 11,  description: '1d6+4 HP yeniler, cesaret verir',      category: 'Tüketici', rarity: RARITY.COMMON, scenarios: ['western', 'realistic'], image: '/items/whiskey_bottle.png' },
];

module.exports = { CATALOG, RARITY };

// ── Ağırlıklı nadirlik seçimi ──────────────────────────────────────────────
// Hazine arama (treasure_search) ve savaş ganimeti (loot.js) tarafından
// ortak kullanılır, böylece drop-rate tüm oyunda tutarlı kalır.
const RARITY_ORDER = [RARITY.COMMON, RARITY.UNCOMMON, RARITY.RARE, RARITY.EPIC, RARITY.LEGENDARY];
const RARITY_WEIGHTS = { [RARITY.COMMON]: 60, [RARITY.UNCOMMON]: 25, [RARITY.RARE]: 10, [RARITY.EPIC]: 4, [RARITY.LEGENDARY]: 1 };

function rollRarity() {
  const total = Object.values(RARITY_WEIGHTS).reduce((a, b) => a + b, 0);
  let roll = Math.random() * total;
  for (const rarity of RARITY_ORDER) {
    roll -= RARITY_WEIGHTS[rarity];
    if (roll <= 0) return rarity;
  }
  return RARITY.COMMON;
}

function pickWeightedItem(scenario) {
  const pool = scenario
    ? CATALOG.filter((entry) => entry.scenarios.includes(scenario) || entry.scenarios.includes('all'))
    : CATALOG;
  if (!pool.length) return null;
  const targetRarity = rollRarity();
  const startIdx = RARITY_ORDER.indexOf(targetRarity);
  // Hedef rarity'de eşya yoksa en yakın komşu tiere doğru genişleterek ara.
  for (let radius = 0; radius < RARITY_ORDER.length; radius += 1) {
    const candidates = [startIdx - radius, startIdx + radius]
      .filter((idx) => idx >= 0 && idx < RARITY_ORDER.length)
      .map((idx) => RARITY_ORDER[idx]);
    for (const rarity of candidates) {
      const matches = pool.filter((entry) => entry.rarity === rarity);
      if (matches.length) return matches[Math.floor(Math.random() * matches.length)];
    }
  }
  return pool[Math.floor(Math.random() * pool.length)];
}

module.exports.rollRarity = rollRarity;
module.exports.pickWeightedItem = pickWeightedItem;

// ── Evcil hayvan / binek / kozmetik yardimcilari ──
function findCatalog(idOrName) {
  return CATALOG.find((e) => e.id === idOrName || e.name === idOrName) || null;
}

// Karakterin aktif evcil hayvan + bineginden gelen zar sansi bonusu
function getCompanionLuckBonus(character) {
  if (!character) return 0;
  let bonus = 0;
  for (const id of [character.active_pet, character.active_mount]) {
    const def = id ? findCatalog(id) : null;
    if (def && def.dice_luck_bonus) bonus += def.dice_luck_bonus;
  }
  return Math.min(0.15, bonus);
}

// Aktif binegin tasima bonusu
function getMountCarryBonus(character) {
  if (!character || !character.active_mount) return 0;
  const def = findCatalog(character.active_mount);
  return (def && def.carry_bonus) || 0;
}

module.exports.getCompanionLuckBonus = getCompanionLuckBonus;
module.exports.getMountCarryBonus = getMountCarryBonus;
module.exports.findCatalog = findCatalog;

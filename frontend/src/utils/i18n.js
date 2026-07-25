import { useState, useEffect } from 'react';

const TR = {
  // Nav / common
  back: 'Geri',
  loading: 'Yükleniyor...',
  logout: 'Çıkış',
  version: "Kader'in Sesi — v1.0",
  app_desc: 'AI destekli D&D macera oyunu',
  cancel: 'Vazgeç',
  delete: 'Sil',
  confirm: 'Onayla',
  close: 'Kapat',
  retry: 'Tekrar Dene',
  save: 'Kaydet',
  continue: 'Devam Et',

  // Settings
  settings_title: 'AYARLAR',
  sound_title: 'SES',
  sound_effects: 'Ses Efektleri',
  volume: (v) => `Ses: ${v}%`,
  theme_title: 'TEMA',
  dark_mode: 'Karanlık Mod',
  light_mode: 'Aydınlık Mod',
  dark_desc: 'Orta Çağ loş palet',
  light_desc: 'Parşömen & gündüz palet',
  text_size_title: 'METİN BOYUTU',
  text_small: 'Küçük',
  text_medium: 'Orta',
  text_large: 'Büyük',
  text_size_note: 'Boyut sayfayı yenilediğinizde kalıcı olur',
  lang_title: 'DİL',
  lang_note_tr: 'Türkçe anlatı',
  lang_note_en: 'İngilizce anlatı',
  tone_title: 'ANLATI TONU',
  tone_note: 'Bir sonraki mesajından itibaren geçerli olur',
  tone_saving: 'Kaydediliyor...',
  tone_dramatic_label: 'Dramatik',
  tone_dramatic_desc: 'Duygusal, gerilimli ve tiyatsal',
  tone_comedic_label: 'Mizahi',
  tone_comedic_desc: 'Hafif, esprili ve neşeli',
  tone_dark_label: 'Karanlık',
  tone_dark_desc: 'Kasvetli, sert ve acımasız',
  tone_epic_label: 'Epik',
  tone_epic_desc: 'Görkemli, kahramanlık ve destansı',
  privacy_policy: 'Gizlilik Politikası',
  danger_zone: 'TEHLİKELİ BÖLGE',
  delete_account_desc: 'Hesabını ve tüm karakter, oturum ve oyun verilerini kalıcı olarak silersin. Bu işlem geri alınamaz.',
  delete_account_btn: 'Hesabımı Sil',
  deleting: 'Siliniyor...',
  delete_account_confirm1: 'Hesabını ve tüm karakter/oyun verilerini kalıcı olarak silmek istediğine emin misin? Bu işlem geri alınamaz.',
  delete_account_confirm2: 'Son onay: Hesabın kalıcı olarak silinecek. Devam etmek istiyor musun?',
  delete_account_fail: 'Hesap silinemedi, lütfen tekrar dene',
  admin_claimed: 'Yönetici yetkisi bu hesaba tanındı. Sayfayı yenile.',
  admin_fail: 'İşlem başarısız',

  premium_title: 'PREMIUM',
  premium_active_badge: 'Premium Aktif',
  premium_until_label: 'Bitiş tarihi',
  premium_lifetime: 'Süresiz',
  premium_benefits_title: 'Premium avantajları',
  premium_benefit_no_ads: 'Reklamsız oyun',
  premium_benefit_unlimited_moves: 'Sınırsız hamle hakkı',
  premium_benefit_wheel_spins: 'Kader Çarkı: günlük 3 çevirme hakkı',
  premium_not_active_desc: 'Reklamları kaldır, sınırsız hamle hakkı ve günde 3 kader çarkı hakkı kazan.',
  premium_loading_offerings: 'Paketler yükleniyor...',
  premium_no_offerings: 'Şu anda satın alınabilir bir paket bulunamadı.',
  premium_web_note: 'Premium satın alma yalnızca mobil uygulamada kullanılabilir.',
  premium_purchase_btn: 'Satın Al',
  premium_purchasing: 'İşleniyor...',
  premium_restore_btn: 'Satın Alımları Geri Yükle',
  premium_restoring: 'Geri yükleniyor...',
  premium_purchase_success: 'Premium etkinleştirildi!',
  premium_purchase_error: 'Satın alma tamamlanamadı, tekrar dene',
  premium_purchase_cancelled: 'Satın alma iptal edildi',
  premium_restore_none: 'Geri yüklenecek aktif bir satın alım bulunamadı',

  // Characters page
  my_heroes: 'KAHRAMANLARIM',
  new_hero: '+ Yeni Kahraman',
  hall_of_fame_btn: 'Onur Listesi',
  settings_btn: 'Ayarlar',
  no_characters: 'Henüz kahraman yok',
  no_chars_sub: 'Seni bekleyen bir macera var!',
  continue_adventure: 'Maceraya Devam',
  new_adventure: 'Yeni Macera',
  delete_confirm: 'Silmek istediğine emin misin?',
  delete_hero_title: 'Kahramanı Sil?',
  delete_hero_desc: (name) => `${name} ve tüm maceraları kalıcı olarak silinecek.`,
  data_load_fail: 'Veriler yüklenemedi',
  delete_fail: 'Silme başarısız',
  hero_created_notice: (name) => `${name} oluşturuldu. Macerayı başlatmak için kartındaki "Yeni Macera" düğmesine bas.`,

  // Login page
  feature_battles_title: 'Epik Savaşlar',
  feature_battles_desc: 'Zar at, düşmanlarını yen',
  feature_stories_title: 'Derin Hikayeler',
  feature_stories_desc: 'AI destekli anlatı',
  feature_world_title: 'Geniş Dünya',
  feature_world_desc: 'Sonsuz macera seni bekliyor',
  google_login: 'Google ile Giriş Yap',
  guest_login: 'Misafir Olarak Devam Et',
  login_loading: '⏳ Kapılar Açılıyor...',

  // Game page
  send: 'Gönder',
  type_action: 'Bir eylem yaz...',
  chat_error_retry: 'Tekrar dene',

  // Create character
  step_name: 'İsim',
  step_race: 'Irk',
  step_class: 'Sınıf',
  step_attributes: 'Özellikler',
  creating: '⏳ Oluşturuluyor...',
  create_hero_btn: 'Kahramanı Yarat!',
  continue_btn: 'Devam Et →',

  // Stat names
  stat_strength: 'Güç',
  stat_dexterity: 'Çeviklik',
  stat_constitution: 'Anayasa',
  stat_intelligence: 'Zeka',
  stat_wisdom: 'Bilgelik',
  stat_charisma: 'Karizma',
  stat_abbr_strength: 'GÜÇ',
  stat_abbr_dexterity: 'ÇEV',
  stat_abbr_constitution: 'DAY',
  stat_abbr_intelligence: 'ZEK',
  stat_abbr_wisdom: 'BİL',
  stat_abbr_charisma: 'KAR',

  // Race names
  race_human: 'İnsan',
  race_elf: 'Elf',
  race_dwarf: 'Cüce',
  race_halfork: 'Yarı-Ork',
  race_hobbit: 'Hobit',
  race_tiefling: 'İblissoyu',
  race_human_desc: 'Uyarlanabilir ve kararlı, her mesleğe elverişli.',
  race_elf_desc: 'Uzun ömürlü, zarif ve doğayla iç içe. Çeviklik bonusu.',
  race_dwarf_desc: 'Dayanıklı, gururlu ve madenlerin ustası. Anayasa bonusu.',
  race_halfork_desc: 'Vahşi güç ve savaş azmi. Güç ve anayasa bonusu.',
  race_hobbit_desc: 'Küçük, sessiz ve şanslı. Çeviklik ve karizma bonusu.',
  race_tiefling_desc: 'Cehennem izi taşıyan gizemli yarı-insan. Zeka ve karizma bonusu.',

  // Class names
  class_warrior: 'Savaşçı',
  class_mage: 'Büyücü',
  class_rogue: 'Hırsız',
  class_cleric: 'Rahip',
  class_ranger: 'Avcı',
  class_barbarian: 'Barbar',
  class_warrior_desc: 'Güçlü dövüşçü, her silahı kullanabilir',
  class_mage_desc: 'Güçlü büyüler, ama zayıf zırh',
  class_rogue_desc: 'Gizlilik ve hile ustası',
  class_cleric_desc: 'İyileştirici ve ilahi büyü kullanıcısı',
  class_ranger_desc: 'Uzak mesafe ve iz sürme uzmanı',
  class_barbarian_desc: 'Öfkeli savaşçı, en yüksek HP',

  // Character sheet tabs
  tab_stats: 'Özellikler',
  tab_inventory: 'Envanter',
  tab_background: 'Geçmiş',

  // Follower roles
  role_warrior: 'Savaşçı',
  role_archer: 'Okçu',
  role_mage: 'Büyücü',
  role_healer: 'Şifacı',

  // Scenarios
  scenario_dungeon_name: 'Karanlık Zindan',
  scenario_dungeon_desc: 'Tehlikeli zindanlar, tuzaklar ve lanetli hazineler',
  scenario_dungeon_tag: 'Klasik',
  scenario_forest_name: 'Gizemli Orman',
  scenario_forest_desc: 'Antik büyüler, kayıp köyler ve mistik yaratıklar',
  scenario_forest_tag: 'Popüler',
  scenario_tavern_name: 'Taverna Sırları',
  scenario_tavern_desc: 'Entrikalar, sırlar ve tehlikeli görevler',
  scenario_tavern_tag: 'Sosyal',
  scenario_city_name: 'Şehir Karanlığı',
  scenario_city_desc: 'Suç örgütleri, siyasi entrikalar ve gizem',
  scenario_city_tag: 'Entrika',
  scenario_dragon_name: 'Ejderha Arayışı',
  scenario_dragon_desc: 'Efsanevi canavara karşı ölüm kalım mücadelesi',
  scenario_dragon_tag: 'Epik',
  scenario_mountain_name: 'Dağların Çağrısı',
  scenario_mountain_desc: 'Kayıp tapınaklar, fırtınalar ve zirvedeki ölümsüz bilge',
  scenario_mountain_tag: 'Yolculuk',
  scenario_sea_name: 'Deniz Yolculuğu',
  scenario_sea_desc: 'Korsan gemileri, batık hazineler ve fırtınalı denizler',
  scenario_sea_tag: 'Açık Dünya',
  scenario_caravan_name: 'Kervan Yolu',
  scenario_caravan_desc: 'Ticaret kervanı, yol haydutları ve çöl kasabaları',
  scenario_caravan_tag: 'Yolculuk',
  scenario_realistic_name: 'Gerçekçi Macera',
  scenario_realistic_desc: 'Büyü yok, canavar yok — sadece insan dramı, siyaset ve hayatta kalma',
  scenario_realistic_tag: 'Hardcore',
  scenario_horror_name: 'Korku Kâbusu',
  scenario_horror_desc: 'Lanetli malikaneler, karanlık varlıklar ve tüyler ürperten gizemler',
  scenario_horror_tag: 'Korku',
  scenario_scifi_name: 'Yıldızlararası Görev',
  scenario_scifi_desc: 'Uzay gemileri, yapay zekalar, uzaylı ırklar ve unutulmuş koloniler',
  scenario_scifi_tag: 'Bilim Kurgu',
  scenario_western_name: 'Vahşi Batı',
  scenario_western_desc: 'Silahşörler, çöl kasabaları, tren soygunları ve kanun kaçakları',
  scenario_western_tag: 'Western',
  scenario_custom_name: 'Serbest Macera',
  scenario_custom_desc: "AI'nın sürpriz senaryosuyla özgür keşif",
  scenario_custom_tag: 'Sürpriz',
  scenario_choose: 'Bir senaryo seç',
  scenario_back: 'Geri',
  scenario_start: 'Macerayı Başlat!',
  scenario_starting: 'Macera Başlıyor...',
  scenario_fail: 'Oturum oluşturulamadı',
  scenario_page_title: 'SENARYO SEÇ',
  scenario_page_sub: 'Nasıl bir macera istersin?',

  // Shop
  shop_title: 'TÜCCAR DÜKKANI',
  buy_tab: '🛒 Satın Al',
  sell_tab: '💰 Sat',
  buy_btn: 'Al',
  sell_btn: 'Sat',
  no_sell_items: 'Satılacak eşya yok',
  no_sell_sub: 'Kuşanılmış eşyalar satılamaz',

  // Hall of fame
  hall_title: 'ONUR LİSTESİ',
  hall_subtitle: 'Yolculuğunu tamamlayan kahramanlar',
  no_fallen: 'Henüz düşen kahraman yok',
  no_fallen_sub: 'Her kahraman kendi efsanesini yazar',
  adventure_summary: 'Macera özeti',
  hide_summary: 'Gizle',
  fallen_badge: 'DÜŞTÜ',
  back_to_menu: 'Ana Menüye Dön',

  // Death overlay
  hero_fell: 'KAHRAMANIN DÜŞTÜ',
  final_save_btn: 'Son Kurtuluş Zarını At (d20)',
  final_journey: 'SON YOLCULUK',

  // Tutorial
  tutorial_title: "KADER'İN SESİ'NE HOŞ GELDİN",
  tutorial_subtitle: 'AI destekli bir D&D macerası seni bekliyor.',
  tutorial_step1_title: 'Anlatıcıyı Dinle',
  tutorial_step1_text: 'Senaryo metnini oku; hikaye senin kararlarınla ilerler. Her yanıt senin seçimlerine göre şekillenir.',
  tutorial_step2_title: 'Seçim Yap',
  tutorial_step2_text: 'Anlatıcı sana A, B, C seçenekleri sunar. İstediğin seçeneğe dokun. Ya da…',
  tutorial_step3_title: 'Özgürce Hareket Et',
  tutorial_step3_text: 'Alttaki metin kutusuna kendi eylemini yazıp gönderebilirsin. Ormanda dolaş, konuş, saldır — hayal gücün sınırı.',
  tutorial_step4_title: 'Zar At',
  tutorial_step4_text: 'Zar simgesine dokun; d20 atarsın. Zar sonucuna göre AI senin başarını veya başarısızlığını anlatır.',
  tutorial_step5_title: 'Günlük Hamle Hakkın',
  tutorial_step5_text: 'Her gün ücretsiz 40 hamle hakkın var. Hakların bitince kısa reklam izleyerek ek hamle kazanabilirsin.',
  tutorial_step6_title: 'Yan Menüler',
  tutorial_step6_text: 'Çanta, görevler, NPC\'ler ve yetenek ağacı için ekranın kenarlarındaki simgelere dokun.',
  tutorial_step7_title: 'Kader Çarkı',
  tutorial_step7_text: 'Her gün üst baradaki çark simgesine dokunarak ücretsiz ödül çevir. Altın, iksir, ekstra hamle ve nadir eşya kazanabilirsin. Premium kullanıcılar günde 3 kez çevirir.',
  tutorial_step8_title: 'Anlatıcı Tonu',
  tutorial_step8_text: 'Ayarlar menüsünden hikaye anlatımını Dramatik, Mizahi, Karanlık veya Epik olarak değiştirebilirsin. Bir sonraki mesajından itibaren geçerli olur.',
  tutorial_start: 'Maceraya Başla',
  tutorial_next: 'İleri',
  tutorial_prev: 'Geri',
  tutorial_step: (n, total) => `${n} / ${total}`,
};

const EN = {
  // Nav / common
  back: 'Back',
  loading: 'Loading...',
  logout: 'Logout',
  version: 'Voice of Fate — v1.0',
  app_desc: 'AI-powered D&D adventure game',
  cancel: 'Cancel',
  delete: 'Delete',
  confirm: 'Confirm',
  close: 'Close',
  retry: 'Retry',
  save: 'Save',
  continue: 'Continue',

  // Settings
  settings_title: 'SETTINGS',
  sound_title: 'SOUND',
  sound_effects: 'Sound Effects',
  volume: (v) => `Volume: ${v}%`,
  theme_title: 'THEME',
  dark_mode: 'Dark Mode',
  light_mode: 'Light Mode',
  dark_desc: 'Medieval dark palette',
  light_desc: 'Parchment & daylight palette',
  text_size_title: 'TEXT SIZE',
  text_small: 'Small',
  text_medium: 'Medium',
  text_large: 'Large',
  text_size_note: 'Size is saved when you refresh the page',
  lang_title: 'LANGUAGE',
  lang_note_tr: 'Turkish narration',
  lang_note_en: 'English narration',
  tone_title: 'NARRATOR TONE',
  tone_note: 'Takes effect from your next message',
  tone_saving: 'Saving...',
  tone_dramatic_label: 'Dramatic',
  tone_dramatic_desc: 'Emotional, tense, and theatrical',
  tone_comedic_label: 'Comedic',
  tone_comedic_desc: 'Light, witty, and cheerful',
  tone_dark_label: 'Dark',
  tone_dark_desc: 'Gloomy, harsh, and merciless',
  tone_epic_label: 'Epic',
  tone_epic_desc: 'Majestic, heroic, and legendary',
  privacy_policy: 'Privacy Policy',
  danger_zone: 'DANGER ZONE',
  delete_account_desc: 'Permanently deletes your account, all characters, sessions, and game data. This cannot be undone.',
  delete_account_btn: 'Delete My Account',
  deleting: 'Deleting...',
  delete_account_confirm1: 'Are you sure you want to permanently delete your account and all character/game data? This cannot be undone.',
  delete_account_confirm2: 'Final confirmation: Your account will be permanently deleted. Do you want to continue?',
  delete_account_fail: 'Failed to delete account, please try again',
  admin_claimed: 'Admin role granted to this account. Reload the page.',
  admin_fail: 'Operation failed',

  premium_title: 'PREMIUM',
  premium_active_badge: 'Premium Active',
  premium_until_label: 'Expires on',
  premium_lifetime: 'Lifetime',
  premium_benefits_title: 'Premium benefits',
  premium_benefit_no_ads: 'Ad-free gameplay',
  premium_benefit_unlimited_moves: 'Unlimited moves',
  premium_benefit_wheel_spins: 'Wheel of Fate: 3 daily spins',
  premium_not_active_desc: 'Remove ads, get unlimited moves, and 3 Wheel of Fate spins per day.',
  premium_loading_offerings: 'Loading packages...',
  premium_no_offerings: 'No purchasable package is available right now.',
  premium_web_note: 'Premium purchases are only available on the mobile app.',
  premium_purchase_btn: 'Buy',
  premium_purchasing: 'Processing...',
  premium_restore_btn: 'Restore Purchases',
  premium_restoring: 'Restoring...',
  premium_purchase_success: 'Premium activated!',
  premium_purchase_error: 'Purchase could not be completed, try again',
  premium_purchase_cancelled: 'Purchase cancelled',
  premium_restore_none: 'No active purchase was found to restore',

  // Characters page
  my_heroes: 'MY HEROES',
  new_hero: '+ New Hero',
  hall_of_fame_btn: 'Hall of Fame',
  settings_btn: 'Settings',
  no_characters: 'No heroes yet',
  no_chars_sub: 'An adventure awaits you!',
  continue_adventure: 'Continue Adventure',
  new_adventure: 'New Adventure',
  delete_confirm: 'Are you sure you want to delete?',
  delete_hero_title: 'Delete Hero?',
  delete_hero_desc: (name) => `${name} and all adventures will be permanently deleted.`,
  data_load_fail: 'Failed to load data',
  delete_fail: 'Delete failed',
  hero_created_notice: (name) => `${name} created. Press "New Adventure" on their card to start.`,

  // Login page
  feature_battles_title: 'Epic Battles',
  feature_battles_desc: 'Roll dice, defeat your enemies',
  feature_stories_title: 'Deep Stories',
  feature_stories_desc: 'AI-powered narration',
  feature_world_title: 'Vast World',
  feature_world_desc: 'Endless adventure awaits',
  google_login: 'Sign in with Google',
  guest_login: 'Continue as Guest',
  login_loading: '⏳ Gates Opening...',

  // Game page
  send: 'Send',
  type_action: 'Type an action...',
  chat_error_retry: 'Retry',

  // Create character
  step_name: 'Name',
  step_race: 'Race',
  step_class: 'Class',
  step_attributes: 'Attributes',
  creating: '⏳ Creating...',
  create_hero_btn: 'Create Hero!',
  continue_btn: 'Continue →',

  // Stat names
  stat_strength: 'Strength',
  stat_dexterity: 'Dexterity',
  stat_constitution: 'Constitution',
  stat_intelligence: 'Intelligence',
  stat_wisdom: 'Wisdom',
  stat_charisma: 'Charisma',
  stat_abbr_strength: 'STR',
  stat_abbr_dexterity: 'DEX',
  stat_abbr_constitution: 'CON',
  stat_abbr_intelligence: 'INT',
  stat_abbr_wisdom: 'WIS',
  stat_abbr_charisma: 'CHA',

  // Race names
  race_human: 'Human',
  race_elf: 'Elf',
  race_dwarf: 'Dwarf',
  race_halfork: 'Half-Orc',
  race_hobbit: 'Hobbit',
  race_tiefling: 'Tiefling',
  race_human_desc: 'Adaptable and determined, suited for any profession.',
  race_elf_desc: 'Long-lived, graceful, and in tune with nature. Dexterity bonus.',
  race_dwarf_desc: 'Sturdy, proud, and master of mines. Constitution bonus.',
  race_halfork_desc: 'Wild strength and battle resolve. Strength and constitution bonus.',
  race_hobbit_desc: 'Small, stealthy, and lucky. Dexterity and charisma bonus.',
  race_tiefling_desc: 'Mysterious half-human bearing infernal heritage. Intelligence and charisma bonus.',

  // Class names
  class_warrior: 'Warrior',
  class_mage: 'Mage',
  class_rogue: 'Rogue',
  class_cleric: 'Cleric',
  class_ranger: 'Ranger',
  class_barbarian: 'Barbarian',
  class_warrior_desc: 'Powerful fighter, can use any weapon',
  class_mage_desc: 'Powerful spells, but weak armor',
  class_rogue_desc: 'Master of stealth and trickery',
  class_cleric_desc: 'Healer and divine spellcaster',
  class_ranger_desc: 'Expert in ranged combat and tracking',
  class_barbarian_desc: 'Raging warrior with the highest HP',

  // Character sheet tabs
  tab_stats: 'Attributes',
  tab_inventory: 'Inventory',
  tab_background: 'Background',

  // Follower roles
  role_warrior: 'Warrior',
  role_archer: 'Archer',
  role_mage: 'Mage',
  role_healer: 'Healer',

  // Scenarios
  scenario_dungeon_name: 'Dark Dungeon',
  scenario_dungeon_desc: 'Treacherous dungeons, traps, and cursed treasures',
  scenario_dungeon_tag: 'Classic',
  scenario_forest_name: 'Mysterious Forest',
  scenario_forest_desc: 'Ancient magic, lost villages, and mystical creatures',
  scenario_forest_tag: 'Popular',
  scenario_tavern_name: 'Tavern Secrets',
  scenario_tavern_desc: 'Intrigues, secrets, and dangerous quests',
  scenario_tavern_tag: 'Social',
  scenario_city_name: 'City of Shadows',
  scenario_city_desc: 'Crime guilds, political intrigue, and mystery',
  scenario_city_tag: 'Intrigue',
  scenario_dragon_name: 'Dragon Hunt',
  scenario_dragon_desc: 'A life-or-death battle against a legendary beast',
  scenario_dragon_tag: 'Epic',
  scenario_mountain_name: 'Call of the Mountains',
  scenario_mountain_desc: 'Lost temples, storms, and an immortal sage at the peak',
  scenario_mountain_tag: 'Journey',
  scenario_sea_name: 'Sea Voyage',
  scenario_sea_desc: 'Pirate ships, sunken treasures, and stormy seas',
  scenario_sea_tag: 'Open World',
  scenario_caravan_name: 'Caravan Road',
  scenario_caravan_desc: 'Trade caravan, highway bandits, and desert towns',
  scenario_caravan_tag: 'Journey',
  scenario_realistic_name: 'Realistic Adventure',
  scenario_realistic_desc: 'No magic, no monsters — only human drama, politics, and survival',
  scenario_realistic_tag: 'Hardcore',
  scenario_horror_name: 'Horror Nightmare',
  scenario_horror_desc: 'Cursed mansions, dark entities, and spine-chilling mysteries',
  scenario_horror_tag: 'Horror',
  scenario_scifi_name: 'Interstellar Mission',
  scenario_scifi_desc: 'Starships, AI minds, alien races, and forgotten colonies',
  scenario_scifi_tag: 'Sci-Fi',
  scenario_western_name: 'Wild West',
  scenario_western_desc: 'Gunslingers, desert towns, train heists, and outlaws',
  scenario_western_tag: 'Western',
  scenario_custom_name: 'Free Adventure',
  scenario_custom_desc: 'Free exploration with an AI-chosen surprise scenario',
  scenario_custom_tag: 'Surprise',
  scenario_choose: 'Choose a scenario',
  scenario_back: 'Back',
  scenario_start: 'Start Adventure!',
  scenario_starting: 'Adventure Starting...',
  scenario_fail: 'Failed to create session',
  scenario_page_title: 'CHOOSE SCENARIO',
  scenario_page_sub: 'What kind of adventure do you want?',

  // Shop
  shop_title: 'MERCHANT SHOP',
  buy_tab: '🛒 Buy',
  sell_tab: '💰 Sell',
  buy_btn: 'Buy',
  sell_btn: 'Sell',
  no_sell_items: 'No items to sell',
  no_sell_sub: 'Equipped items cannot be sold',

  // Hall of fame
  hall_title: 'HALL OF FAME',
  hall_subtitle: 'Heroes who completed their journey',
  no_fallen: 'No fallen heroes yet',
  no_fallen_sub: 'Every hero writes their own legend',
  adventure_summary: 'Adventure summary',
  hide_summary: 'Hide',
  fallen_badge: 'FALLEN',
  back_to_menu: 'Back to Main Menu',

  // Death overlay
  hero_fell: 'YOUR HERO HAS FALLEN',
  final_save_btn: 'Roll the Final Death Save (d20)',
  final_journey: 'FINAL JOURNEY',

  // Tutorial
  tutorial_title: 'WELCOME TO VOICE OF FATE',
  tutorial_subtitle: 'An AI-powered D&D adventure awaits you.',
  tutorial_step1_title: 'Listen to the Narrator',
  tutorial_step1_text: 'Read the scene text; the story progresses with your decisions. Every response is shaped by your choices.',
  tutorial_step2_title: 'Make a Choice',
  tutorial_step2_text: 'The narrator will offer A, B, C options. Tap the one you want. Or…',
  tutorial_step3_title: 'Act Freely',
  tutorial_step3_text: 'Type your own action in the text box below and send it. Wander, talk, attack — your imagination is the limit.',
  tutorial_step4_title: 'Roll the Dice',
  tutorial_step4_text: 'Tap the dice icon to roll a d20. The AI narrates your success or failure based on the result.',
  tutorial_step5_title: 'Daily Move Limit',
  tutorial_step5_text: 'You have 40 free moves per day. When they run out, watch a short ad to earn extra moves.',
  tutorial_step6_title: 'Side Menus',
  tutorial_step6_text: 'Tap the icons at the edges of the screen for bag, quests, NPCs, and the skill tree.',
  tutorial_step7_title: 'Wheel of Fate',
  tutorial_step7_text: 'Tap the wheel icon in the top bar each day for a free reward spin. Win gold, potions, extra moves, or rare items. Premium users get 3 spins per day.',
  tutorial_step8_title: 'Narrator Tone',
  tutorial_step8_text: 'From Settings, change the story narration to Dramatic, Comedic, Dark, or Epic. Takes effect from your next message.',
  tutorial_start: 'Begin Adventure',
  tutorial_next: 'Next',
  tutorial_prev: 'Back',
  tutorial_step: (n, total) => `${n} / ${total}`,
};

const DICTS = { tr: TR, en: EN };

const LANG_CHANGE_EVENT = 'dnd_lang_change';

function detectDefaultLang() {
  try {
    const nav = navigator.language || (navigator.languages && navigator.languages[0]) || 'tr';
    return nav.toLowerCase().startsWith('tr') ? 'tr' : 'en';
  } catch { return 'tr'; }
}

export function getLang() {
  try {
    const saved = localStorage.getItem('dnd_lang');
    if (saved) return saved;
    const detected = detectDefaultLang();
    localStorage.setItem('dnd_lang', detected);
    return detected;
  } catch { return 'tr'; }
}

export function setLang(lang) {
  try {
    localStorage.setItem('dnd_lang', lang);
    window.dispatchEvent(new CustomEvent(LANG_CHANGE_EVENT, { detail: { lang } }));
  } catch {}
}

/** Hook that re-renders the component whenever the language changes. */
export function useLang() {
  const [lang, setLangState] = useState(getLang);

  useEffect(() => {
    const handler = (e) => setLangState(e.detail?.lang || getLang());
    window.addEventListener(LANG_CHANGE_EVENT, handler);
    return () => window.removeEventListener(LANG_CHANGE_EVENT, handler);
  }, []);

  return lang;
}

/** Translate a key with the current (or given) language. */
export function t(key, ...args) {
  const lang = getLang();
  const dict = DICTS[lang] || TR;
  const val = dict[key] ?? TR[key] ?? key;
  return typeof val === 'function' ? val(...args) : val;
}

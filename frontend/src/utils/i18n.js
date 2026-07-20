const TR = {
  // Nav / common
  back: 'Geri',
  loading: 'Yükleniyor...',
  logout: 'Çıkış',
  version: "Kader'in Sesi — v1.0",
  app_desc: 'AI destekli D&D macera oyunu',

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

  // Game page
  send: 'Gönder',
  type_action: 'Bir eylem yaz...',
  chat_error_retry: 'Tekrar dene',

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
  tutorial_step6_text: 'Çanta, görevler, NPC’ler ve yetenek ağacı için ekranın kenarlarındaki simgelere dokun.',
  tutorial_start: 'Maceraya Başla',
  tutorial_next: 'İleri',
  tutorial_prev: 'Geri',
  tutorial_step: (n, total) => `${n} / ${total}`,
};

const EN = {
  back: 'Back',
  loading: 'Loading...',
  logout: 'Logout',
  version: 'Voice of Fate — v1.0',
  app_desc: 'AI-powered D&D adventure game',

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
  text_size_note: 'Size takes effect after page refresh',
  lang_title: 'LANGUAGE',

  my_heroes: 'MY HEROES',
  new_hero: '+ New Hero',
  hall_of_fame_btn: 'Hall of Fame',
  settings_btn: 'Settings',
  no_characters: 'No heroes yet',
  no_chars_sub: 'An adventure awaits!',
  continue_adventure: 'Continue Adventure',
  new_adventure: 'New Adventure',
  delete_confirm: 'Are you sure you want to delete?',

  send: 'Send',
  type_action: 'Type an action...',
  chat_error_retry: 'Try again',

  shop_title: 'MERCHANT SHOP',
  buy_tab: '🛒 Buy',
  sell_tab: '💰 Sell',
  buy_btn: 'Buy',
  sell_btn: 'Sell',
  no_sell_items: 'No items to sell',
  no_sell_sub: 'Equipped items cannot be sold',

  hall_title: 'HALL OF FAME',
  hall_subtitle: 'Heroes who completed their journey',
  no_fallen: 'No fallen heroes yet',
  no_fallen_sub: 'Every hero writes their own legend',
  adventure_summary: 'Adventure summary',
  hide_summary: 'Hide',
  fallen_badge: 'FALLEN',
  back_to_menu: 'Back to Main Menu',

  hero_fell: 'YOUR HERO HAS FALLEN',
  final_save_btn: 'Roll Final Death Save (d20)',
  final_journey: 'FINAL JOURNEY',

  // Level up
  level_up_title: 'LEVEL UP!',

  // Tutorial
  tutorial_title: "WELCOME TO VOICE OF FATE",
  tutorial_subtitle: 'An AI-powered D&D adventure awaits you.',
  tutorial_step1_title: 'Listen to the Narrator',
  tutorial_step1_text: 'Read the scenario text; the story advances with your decisions. Every response is shaped by your choices.',
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
  tutorial_start: 'Begin Adventure',
  tutorial_next: 'Next',
  tutorial_prev: 'Back',
  tutorial_step: (n, total) => `${n} / ${total}`,
};

const DICTS = { tr: TR, en: EN };

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
  try { localStorage.setItem('dnd_lang', lang); } catch {}
}

/** Translate a key with the current (or given) language. */
export function t(key, ...args) {
  const lang = getLang();
  const dict = DICTS[lang] || TR;
  const val = dict[key] ?? TR[key] ?? key;
  return typeof val === 'function' ? val(...args) : val;
}

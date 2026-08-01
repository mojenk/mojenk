// ── Sesli Anlatım (TTS) ────────────────────────────────────────────────────
// Web Speech API tabanlı. Tarayıcıda ve Android WebView'da çalışır.
// Desteklenmeyen ortamlarda tüm fonksiyonlar sessizce no-op olur.

const STORAGE_KEY = 'dnd_tts_enabled';
const RATE_KEY = 'dnd_tts_rate';
const PITCH_KEY = 'dnd_tts_pitch';
const GENDER_KEY = 'dnd_tts_gender';   // 'male' | 'female' | 'auto'
const VOICE_KEY = 'dnd_tts_voice';     // kullanıcının elle seçtiği voiceURI

let listeners = new Set();
let speakingId = null;
let voiceCache = null;

export function isTtsSupported() {
  return typeof window !== 'undefined' && 'speechSynthesis' in window && typeof window.SpeechSynthesisUtterance === 'function';
}

export function isTtsEnabled() {
  try { return localStorage.getItem(STORAGE_KEY) === '1'; } catch { return false; }
}

export function setTtsEnabled(enabled) {
  try { localStorage.setItem(STORAGE_KEY, enabled ? '1' : '0'); } catch {}
  if (!enabled) stopSpeech();
}

export function getTtsRate() {
  try {
    const value = parseFloat(localStorage.getItem(RATE_KEY));
    return Number.isFinite(value) ? Math.min(1.5, Math.max(0.6, value)) : 0.95;
  } catch { return 0.95; }
}

export function setTtsRate(rate) {
  try { localStorage.setItem(RATE_KEY, String(rate)); } catch {}
}

/** Ses tonu (perde). Düşük değer daha kalın/erkeksi bir anlatım verir. */
export function getTtsPitch() {
  try {
    const value = parseFloat(localStorage.getItem(PITCH_KEY));
    return Number.isFinite(value) ? Math.min(1.3, Math.max(0.5, value)) : 0.8;
  } catch { return 0.8; }
}

export function setTtsPitch(pitch) {
  try { localStorage.setItem(PITCH_KEY, String(pitch)); } catch {}
}

export function getTtsGender() {
  try { return localStorage.getItem(GENDER_KEY) || 'male'; } catch { return 'male'; }
}

export function setTtsGender(gender) {
  try { localStorage.setItem(GENDER_KEY, gender); } catch {}
  voiceCache = null;
}

export function getPreferredVoiceUri() {
  try { return localStorage.getItem(VOICE_KEY) || ''; } catch { return ''; }
}

export function setPreferredVoiceUri(uri) {
  try {
    if (uri) localStorage.setItem(VOICE_KEY, uri);
    else localStorage.removeItem(VOICE_KEY);
  } catch {}
  voiceCache = null;
}

// ── Ses seçimi ─────────────────────────────────────────────────────────────
// Web Speech API ses listesi asenkron dolar; ilk çağrıda boş dönebilir.
// Bu yüzden `voiceschanged` olayını dinliyor ve listeyi tazeliyoruz.

// Platformlarda bilinen ERKEK sesleri (yüksek puan alır)
const KNOWN_MALE = [
  // Windows / Edge
  'tolga', 'david', 'mark', 'guy', 'christopher', 'eric', 'roger', 'steffan', 'ahmet',
  // macOS / iOS
  'alex', 'daniel', 'fred', 'oliver', 'rishi', 'aaron', 'gordon',
  // Google / Android
  'google uk english male', 'erkek',
];
const KNOWN_FEMALE = [
  'emel', 'filiz', 'seda', 'zira', 'aria', 'jenny', 'michelle', 'susan',
  'samantha', 'karen', 'moira', 'tessa', 'victoria', 'allison', 'ava', 'nicky',
  'google uk english female', 'google türkçe', 'kadın',
];
// Doğal/nöral sesler belirgin şekilde daha kaliteli
const QUALITY_MARKERS = ['natural', 'neural', 'premium', 'enhanced', 'online', 'wavenet', 'studio', 'siri'];

// Kısa isimlerin başka kelimelerin içinde yanlış eşleşmesini önlemek için
// kelime sınırı ile arıyoruz ("alex" → "Alex" evet, "Alexandra" hayır).
function matchesAny(haystack, keys) {
  return keys.some((key) => {
    if (key.includes(' ')) return haystack.includes(key);
    return new RegExp(`(^|[^a-zçğıöşü])${key}([^a-zçğıöşü]|$)`, 'i').test(haystack);
  });
}

function scoreVoice(voice, langPrefix, gender) {
  const name = `${voice.name || ''} ${voice.voiceURI || ''}`.toLowerCase();
  const lang = (voice.lang || '').toLowerCase().replace('_', '-');
  let score = 0;

  // Dil uyumu şart
  if (!lang.startsWith(langPrefix)) return -Infinity;
  if (langPrefix === 'en' && lang.startsWith('en-gb')) score += 12; // anlatıcı için daha uygun ton
  if (langPrefix === 'en' && lang.startsWith('en-us')) score += 8;

  const isKnownMale = matchesAny(name, KNOWN_MALE);
  const isKnownFemale = matchesAny(name, KNOWN_FEMALE);
  // Android ses kodları: en-us-x-iom-local → 3 harfli kodun sonu m=erkek, f=kadın
  const androidMale = /-x-[a-z]{2}m(\b|-)/.test(name);
  const androidFemale = /-x-[a-z]{2}f(\b|-)/.test(name);
  const genericMale = /\bmale\b|#male|_m\b|\(male\)/.test(name) && !/female/.test(name);
  const genericFemale = /female|#female|_f\b|\(female\)/.test(name);

  const maleHit = isKnownMale || androidMale || genericMale;
  const femaleHit = isKnownFemale || androidFemale || genericFemale;

  if (gender === 'male') {
    if (maleHit) score += 100;
    if (femaleHit) score -= 90;
  } else if (gender === 'female') {
    if (femaleHit) score += 100;
    if (maleHit) score -= 90;
  }

  // Kalite işaretleri
  QUALITY_MARKERS.forEach((marker) => { if (name.includes(marker)) score += 25; });
  if (name.includes('microsoft')) score += 15;
  if (name.includes('google')) score += 12;
  // Ağ üzerinden gelen sesler genelde daha doğal
  if (voice.localService === false) score += 18;
  // Robotik eSpeak/Android varsayılanları geride kalsın
  if (name.includes('espeak') || name.includes('compact') || name.includes('pico')) score -= 60;

  return score;
}

/** Tarayıcının sunduğu tüm sesler (dil bazlı filtrelenebilir). */
export function getAvailableVoices(langPrefix = null) {
  if (!isTtsSupported()) return [];
  let voices = [];
  try { voices = window.speechSynthesis.getVoices() || []; } catch { return []; }
  if (!langPrefix) return voices;
  return voices.filter((voice) => (voice.lang || '').toLowerCase().startsWith(langPrefix));
}

/** Ayarlardaki tercihlere göre o dil için en uygun sesi seçer. */
export function resolveVoice(langPrefix) {
  const voices = getAvailableVoices();
  if (!voices.length) return null;

  // Kullanıcı elle bir ses seçtiyse ve dili uyuyorsa onu kullan
  const preferredUri = getPreferredVoiceUri();
  if (preferredUri) {
    const manual = voices.find((voice) => voice.voiceURI === preferredUri);
    if (manual && (manual.lang || '').toLowerCase().startsWith(langPrefix)) return manual;
  }

  const gender = getTtsGender();
  const cacheKey = `${langPrefix}|${gender}|${voices.length}`;
  if (voiceCache?.key === cacheKey) return voiceCache.voice;

  let best = null;
  let bestScore = -Infinity;
  voices.forEach((voice) => {
    const score = scoreVoice(voice, langPrefix, gender);
    if (score > bestScore) { bestScore = score; best = voice; }
  });
  if (bestScore === -Infinity) best = null;

  voiceCache = { key: cacheKey, voice: best };
  return best;
}

if (isTtsSupported() && typeof window.speechSynthesis.addEventListener === 'function') {
  window.speechSynthesis.addEventListener('voiceschanged', () => { voiceCache = null; });
}

/** Konuşma durumu değiştiğinde çağrılacak dinleyici ekler; kaldırma fonksiyonu döner. */
export function onSpeechChange(callback) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function emit() {
  listeners.forEach((callback) => {
    try { callback(speakingId); } catch {}
  });
}

/** Anlatıcı metnini oyuncuya okunacak hale getirir (markdown, event JSON'ları vb. temizlenir). */
export function cleanForSpeech(text) {
  return String(text || '')
    .replace(/\{[^{}]*"event"[^{}]*\}/g, ' ')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/\[[^\]]*\]\(([^)]*)\)/g, '$1')
    .replace(/[*_#>`~]/g, '')
    // Kısa duraklamalar anlatımı daha doğal yapar
    .replace(/([.!?…])\s+/g, '$1 ')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 4000);
}

// Chrome uzun metinlerde ~15 sn sonra konuşmayı kesiyor; parçalara bölerek aşıyoruz.
function splitIntoChunks(text, maxLength = 190) {
  const sentences = text.match(/[^.!?…]+[.!?…]*\s*/g) || [text];
  const chunks = [];
  let current = '';
  sentences.forEach((sentence) => {
    if ((current + sentence).length > maxLength && current) {
      chunks.push(current.trim());
      current = sentence;
    } else {
      current += sentence;
    }
  });
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

/**
 * Metni seslendirir. Aynı id tekrar verilirse konuşmayı durdurur (toggle).
 * @param {string} text  Okunacak metin
 * @param {object} options { id, lang: 'tr'|'en' }
 */
export function speak(text, options = {}) {
  if (!isTtsSupported()) return false;
  const { id = 'default', lang = 'tr' } = options;

  if (speakingId === id) {
    stopSpeech();
    return false;
  }

  const clean = cleanForSpeech(text);
  if (!clean) return false;

  window.speechSynthesis.cancel();

  const langPrefix = lang === 'en' ? 'en' : 'tr';
  const voice = resolveVoice(langPrefix);
  const rate = getTtsRate();
  const pitch = getTtsPitch();
  const chunks = splitIntoChunks(clean);

  speakingId = id;
  emit();

  const finish = () => {
    if (speakingId === id) {
      speakingId = null;
      emit();
    }
  };

  chunks.forEach((chunk, index) => {
    const utterance = new window.SpeechSynthesisUtterance(chunk);
    utterance.lang = voice?.lang || (lang === 'en' ? 'en-GB' : 'tr-TR');
    if (voice) utterance.voice = voice;
    utterance.rate = rate;
    utterance.pitch = pitch;
    utterance.volume = 1;
    if (index === chunks.length - 1) utterance.onend = finish;
    utterance.onerror = finish;
    window.speechSynthesis.speak(utterance);
  });

  return true;
}

export function stopSpeech() {
  if (!isTtsSupported()) return;
  try { window.speechSynthesis.cancel(); } catch {}
  if (speakingId !== null) {
    speakingId = null;
    emit();
  }
}

export function getSpeakingId() {
  return speakingId;
}

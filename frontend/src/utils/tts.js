// ── Sesli Anlatım (TTS) ────────────────────────────────────────────────────
// Web Speech API tabanlı. Tarayıcıda ve Android WebView'da çalışır.
// Desteklenmeyen ortamlarda tüm fonksiyonlar sessizce no-op olur.

const STORAGE_KEY = 'dnd_tts_enabled';
const RATE_KEY = 'dnd_tts_rate';

let listeners = new Set();
let speakingId = null;

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
    return Number.isFinite(value) ? Math.min(1.5, Math.max(0.6, value)) : 1;
  } catch { return 1; }
}

export function setTtsRate(rate) {
  try { localStorage.setItem(RATE_KEY, String(rate)); } catch {}
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
    .replace(/[*_#>`~]/g, '')
    .replace(/\[[^\]]*\]\(([^)]*)\)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 4000);
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
  const utterance = new window.SpeechSynthesisUtterance(clean);
  utterance.lang = lang === 'en' ? 'en-US' : 'tr-TR';
  utterance.rate = getTtsRate();
  utterance.pitch = 0.95;

  // Dile uygun bir ses varsa onu tercih et
  try {
    const voices = window.speechSynthesis.getVoices() || [];
    const match = voices.find((voice) => voice.lang?.toLowerCase().startsWith(lang === 'en' ? 'en' : 'tr'));
    if (match) utterance.voice = match;
  } catch {}

  const finish = () => {
    if (speakingId === id) {
      speakingId = null;
      emit();
    }
  };
  utterance.onend = finish;
  utterance.onerror = finish;

  speakingId = id;
  emit();
  window.speechSynthesis.speak(utterance);
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

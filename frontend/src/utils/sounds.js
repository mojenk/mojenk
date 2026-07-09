/**
 * SoundManager — Web Audio API sentetik ses motoru
 * Sıfır dosya boyutu: tüm sesler oscillator ile üretilir
 */

let audioCtx = null;
let enabled = true;
let volume = 0.5;

function getCtx() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

function loadSettings() {
  try {
    const s = JSON.parse(localStorage.getItem('sound_settings'));
    if (s) {
      enabled = s.enabled !== false;
      volume = typeof s.volume === 'number' ? s.volume : 0.5;
    }
  } catch {}
}
loadSettings();

function saveSettings() {
  localStorage.setItem('sound_settings', JSON.stringify({ enabled, volume }));
}

export function isSoundEnabled() { return enabled; }
export function getSoundVolume() { return volume; }

export function toggleSound(val) {
  enabled = typeof val === 'boolean' ? val : !enabled;
  saveSettings();
  return enabled;
}

export function setVolume(val) {
  volume = Math.max(0, Math.min(1, val));
  saveSettings();
}

/* ─── Ses efektleri ─── */

function playTone(freq, duration, type = 'sine', vol = 1, fadeOut = true) {
  if (!enabled) return;
  const ctx = getCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ctx.currentTime);
  gain.gain.setValueAtTime(vol * volume * 0.3, ctx.currentTime);
  if (fadeOut) {
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  }
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + duration);
}

function playNoise(duration, vol = 0.3) {
  if (!enabled) return;
  const ctx = getCtx();
  const bufferSize = ctx.sampleRate * duration;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * 0.5;
  }
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(800, ctx.currentTime);
  gain.gain.setValueAtTime(vol * volume * 0.25, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  source.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  source.start();
}

// Buton tıklama — kısa metalik tık
export function playClick() {
  playTone(800, 0.06, 'square', 0.4);
  setTimeout(() => playTone(1200, 0.04, 'square', 0.2), 30);
}

// Sayfa geçişi — parşömen açılma
export function playPageTransition() {
  playNoise(0.15, 0.4);
  playTone(300, 0.2, 'sine', 0.3);
  setTimeout(() => playTone(450, 0.15, 'sine', 0.2), 100);
}

// Zar atma — takırdama
export function playDiceRoll() {
  for (let i = 0; i < 6; i++) {
    setTimeout(() => {
      playTone(400 + Math.random() * 600, 0.05, 'square', 0.5);
      playNoise(0.03, 0.6);
    }, i * 80);
  }
  // Son vuruş
  setTimeout(() => {
    playTone(600, 0.15, 'triangle', 0.6);
    playNoise(0.08, 0.5);
  }, 520);
}

// Zar sonucu — başarılı
export function playDiceResult(isNat20 = false) {
  if (isNat20) {
    // Fanfar benzeri
    playTone(523, 0.15, 'triangle', 0.6);
    setTimeout(() => playTone(659, 0.15, 'triangle', 0.6), 120);
    setTimeout(() => playTone(784, 0.3, 'triangle', 0.7), 240);
    setTimeout(() => playTone(1047, 0.5, 'triangle', 0.8), 400);
  } else {
    playTone(523, 0.12, 'triangle', 0.5);
    setTimeout(() => playTone(659, 0.18, 'triangle', 0.4), 100);
  }
}

// Hasar — düşük vurma sesi
export function playDamage() {
  playTone(150, 0.2, 'sawtooth', 0.6);
  playNoise(0.1, 0.7);
  setTimeout(() => playTone(100, 0.3, 'sawtooth', 0.4), 50);
}

// İyileşme — yumuşak yükselen ton
export function playHeal() {
  playTone(400, 0.15, 'sine', 0.4);
  setTimeout(() => playTone(500, 0.15, 'sine', 0.4), 120);
  setTimeout(() => playTone(600, 0.2, 'sine', 0.5), 240);
  setTimeout(() => playTone(800, 0.3, 'sine', 0.3), 380);
}

// Level up — zafer fanfarı
export function playLevelUp() {
  const notes = [523, 587, 659, 784, 880, 1047];
  notes.forEach((freq, i) => {
    setTimeout(() => playTone(freq, 0.2, 'triangle', 0.5 + i * 0.05), i * 100);
  });
  setTimeout(() => {
    playTone(1047, 0.6, 'sine', 0.6);
    playTone(1319, 0.6, 'sine', 0.4);
  }, 650);
}

// Altın kazanma — şıngırtı
export function playGold() {
  for (let i = 0; i < 3; i++) {
    setTimeout(() => {
      playTone(2000 + Math.random() * 1000, 0.08, 'sine', 0.3);
    }, i * 60);
  }
}

// Büyü efekti — gizemli
export function playMagic() {
  playTone(350, 0.4, 'sine', 0.35);
  setTimeout(() => playTone(440, 0.35, 'sine', 0.3), 100);
  setTimeout(() => playTone(550, 0.3, 'sine', 0.25), 220);
  setTimeout(() => playTone(700, 0.5, 'sine', 0.2), 350);
}

// Narrator yanıt geldi — kısa mistik ton
export function playNarrator() {
  playTone(280, 0.3, 'sine', 0.3);
  setTimeout(() => playTone(350, 0.25, 'sine', 0.25), 150);
}

// Typewriter tık — hafif
export function playTypewriterTick() {
  playTone(1400, 0.015, 'square', 0.12);
}

// Mesaj gönder — whoosh
export function playSend() {
  playTone(400, 0.08, 'sine', 0.4);
  setTimeout(() => playTone(800, 0.1, 'sine', 0.3), 40);
  playNoise(0.06, 0.3);
}

// Düşük HP uyarı — kalp atışı
export function playHeartbeat() {
  playTone(60, 0.15, 'sine', 0.7);
  setTimeout(() => playTone(55, 0.12, 'sine', 0.5), 180);
}

// Hata / başarısız
export function playError() {
  playTone(200, 0.15, 'sawtooth', 0.4);
  setTimeout(() => playTone(150, 0.25, 'sawtooth', 0.5), 120);
}

// Nat1 — kötü zar
export function playNat1() {
  playTone(200, 0.2, 'sawtooth', 0.5);
  setTimeout(() => playTone(140, 0.3, 'sawtooth', 0.6), 150);
  setTimeout(() => playTone(80, 0.4, 'sawtooth', 0.4), 350);
}

// Kılıç vuruşu — keskin metalik isabet
export function playSwordHit() {
  playNoise(0.06, 0.8);
  playTone(500, 0.08, 'sawtooth', 0.7);
  setTimeout(() => playTone(300, 0.15, 'sawtooth', 0.5), 40);
  setTimeout(() => playNoise(0.04, 0.5), 80);
}

// Saldırı ıskalama — havayı kesen ses
export function playSwordMiss() {
  playTone(600, 0.1, 'sine', 0.3);
  setTimeout(() => playTone(300, 0.15, 'sine', 0.2), 50);
  playNoise(0.08, 0.25);
}

// Kritik isabet — patlama efekti
export function playCriticalHit() {
  playNoise(0.12, 0.9);
  playTone(200, 0.15, 'sawtooth', 0.8);
  setTimeout(() => {
    playTone(400, 0.1, 'square', 0.6);
    playNoise(0.08, 0.7);
  }, 60);
  setTimeout(() => {
    playTone(523, 0.2, 'triangle', 0.5);
    playTone(659, 0.2, 'triangle', 0.4);
  }, 150);
  setTimeout(() => playTone(784, 0.3, 'triangle', 0.5), 280);
}

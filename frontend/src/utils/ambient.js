/**
 * AmbientEngine v2 — Bölge bazlı dinamik ortam sesleri
 * Web Audio API ile tamamen sentetik (dosyasız) ortam ambiyans motoru.
 * 14 farklı sahne: forest, dungeon, tavern, city, combat, cave, swamp,
 * ocean, mountain, temple, camp, ruins, storm, desert
 *
 * AI narrator hikaye içindeki bölge değişikliklerini scene_change event'i
 * ile bildirir ve ambiyans otomatik geçiş yapar.
 */
import { isSoundEnabled, getSoundVolume } from './sounds';

let audioCtx = null;
let masterGain = null;
let currentSceneId = null;
let currentLayers = [];
let currentToken = { cancelled: true, timers: [] };
let crossfadeTimer = null;

function getCtx() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

function ensureMaster() {
  const ctx = getCtx();
  if (!masterGain) {
    masterGain = ctx.createGain();
    masterGain.gain.value = 0;
    masterGain.connect(ctx.destination);
  }
  return masterGain;
}

function noiseBuffer(ctx, seconds = 3) {
  const bufferSize = Math.floor(ctx.sampleRate * seconds);
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
}

/* ── Sürekli katmanlar (loop) ── */

function makeNoiseLoop({ filterType = 'lowpass', freq = 800, q = 0.7, gain = 0.2 }) {
  const ctx = getCtx();
  const source = ctx.createBufferSource();
  source.buffer = noiseBuffer(ctx, 4);
  source.loop = true;
  const filter = ctx.createBiquadFilter();
  filter.type = filterType;
  filter.frequency.value = freq;
  filter.Q.value = q;
  const g = ctx.createGain();
  g.gain.value = gain;
  source.connect(filter);
  filter.connect(g);
  g.connect(ensureMaster());
  try { source.start(); } catch {}
  return { stop: () => { try { source.stop(); } catch {} } };
}

function makeDrone({ freq = 60, type = 'sine', gain = 0.1, lfoFreq = 0, lfoDepth = 0 }) {
  const ctx = getCtx();
  const osc = ctx.createOscillator();
  osc.type = type;
  osc.frequency.value = freq;
  const g = ctx.createGain();
  g.gain.value = gain;
  osc.connect(g);
  g.connect(ensureMaster());
  try { osc.start(); } catch {}

  let lfo = null;
  if (lfoFreq > 0) {
    lfo = ctx.createOscillator();
    lfo.frequency.value = lfoFreq;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = lfoDepth;
    lfo.connect(lfoGain);
    lfoGain.connect(g.gain);
    try { lfo.start(); } catch {}
  }
  return { stop: () => { try { osc.stop(); } catch {} try { lfo && lfo.stop(); } catch {} } };
}

/* ── Kısa doku sesleri (tek seferlik, rastgele tetiklenir) ── */

function textureTone(freq, duration, type = 'sine', vol = 0.3, glideTo = null) {
  if (!isSoundEnabled()) return;
  const ctx = getCtx();
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ctx.currentTime);
  if (glideTo) osc.frequency.exponentialRampToValueAtTime(glideTo, ctx.currentTime + duration);
  const v = Math.max(0.0001, vol * getSoundVolume() * 0.35);
  g.gain.setValueAtTime(v, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
  osc.connect(g);
  g.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + duration + 0.05);
}

function textureNoise(duration, vol = 0.3, filterFreq = 1000, filterType = 'lowpass') {
  if (!isSoundEnabled()) return;
  const ctx = getCtx();
  const source = ctx.createBufferSource();
  source.buffer = noiseBuffer(ctx, duration);
  const filter = ctx.createBiquadFilter();
  filter.type = filterType;
  filter.frequency.value = filterFreq;
  const g = ctx.createGain();
  const v = Math.max(0.0001, vol * getSoundVolume() * 0.35);
  g.gain.setValueAtTime(v, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
  source.connect(filter);
  filter.connect(g);
  g.connect(ctx.destination);
  source.start();
}

function scheduleRandom(fn, minMs, maxMs, token) {
  const delay = minMs + Math.random() * (maxMs - minMs);
  const id = setTimeout(() => {
    if (token.cancelled) return;
    try { fn(); } catch {}
    scheduleRandom(fn, minMs, maxMs, token);
  }, delay);
  token.timers.push(id);
}

/* ══════════════════════════════════════════════════════════════
   ██  SAHNE TANIMLARI  ██
   ══════════════════════════════════════════════════════════════ */

// ── ORMAN ──
function buildForest(token) {
  const layers = [
    makeNoiseLoop({ filterType: 'bandpass', freq: 1800, q: 0.5, gain: 0.045 }),
    makeNoiseLoop({ filterType: 'lowpass', freq: 400, q: 0.3, gain: 0.02 }),  // hafif rüzgar alt katman
  ];
  // Kuş cıvıltısı — çeşitli kuşlar
  scheduleRandom(() => {
    const base = 1800 + Math.random() * 900;
    textureTone(base, 0.1, 'sine', 0.3, base * 1.3);
    setTimeout(() => textureTone(base * 1.2, 0.08, 'sine', 0.22, base * 0.9), 110);
    if (Math.random() > 0.6) {
      setTimeout(() => textureTone(base * 0.8, 0.12, 'sine', 0.18, base * 1.1), 250);
    }
  }, 2000, 5500, token);
  // İkinci kuş türü — kısa kesik ötüş
  scheduleRandom(() => {
    const f = 2400 + Math.random() * 600;
    for (let i = 0; i < 3 + Math.floor(Math.random() * 3); i++) {
      setTimeout(() => textureTone(f + Math.random() * 100, 0.04, 'sine', 0.2), i * 70);
    }
  }, 5000, 12000, token);
  // Böcek sesi — cırcır
  scheduleRandom(() => {
    const count = 4 + Math.floor(Math.random() * 6);
    for (let i = 0; i < count; i++) {
      setTimeout(() => textureTone(3800 + Math.random() * 600, 0.025, 'square', 0.1), i * 55);
    }
  }, 1200, 3500, token);
  // Rüzgar esintisi
  scheduleRandom(() => textureNoise(1.0 + Math.random() * 0.8, 0.18, 900, 'bandpass'), 5000, 10000, token);
  // Yaprak hışırtısı
  scheduleRandom(() => textureNoise(0.15 + Math.random() * 0.1, 0.12, 3500, 'highpass'), 3000, 7000, token);
  // Uzak ağaçkakan
  scheduleRandom(() => {
    for (let i = 0; i < 4; i++) {
      setTimeout(() => textureTone(900, 0.02, 'square', 0.15), i * 60);
    }
  }, 15000, 30000, token);
  return layers;
}

// ── ZİNDAN / DUNGEON ──
function buildDungeon(token) {
  const layers = [
    makeDrone({ freq: 42, type: 'sine', gain: 0.08 }),
    makeDrone({ freq: 63, type: 'sine', gain: 0.04, lfoFreq: 0.08, lfoDepth: 0.02 }), // ürkütücü harmonik
    makeNoiseLoop({ filterType: 'lowpass', freq: 180, q: 0.5, gain: 0.06 }),
  ];
  // Su damlası — yankılı
  scheduleRandom(() => {
    const f = 1100 + Math.random() * 400;
    textureTone(f, 0.12, 'sine', 0.3, f * 0.45);
    setTimeout(() => textureTone(f * 0.9, 0.08, 'sine', 0.12, f * 0.35), 200); // yankı
  }, 2500, 6000, token);
  // İkinci su damlası (farklı tondan)
  scheduleRandom(() => {
    textureTone(800 + Math.random() * 200, 0.1, 'sine', 0.2, 400);
  }, 4000, 9000, token);
  // Uzak zincir/metal sesi
  scheduleRandom(() => textureNoise(0.15 + Math.random() * 0.1, 0.3, 500, 'bandpass'), 8000, 16000, token);
  // Alçak rumbling — yerin altındaki tehlike
  scheduleRandom(() => textureTone(30 + Math.random() * 12, 1.5, 'sawtooth', 0.18), 12000, 22000, token);
  // Ürkütücü fısıltı benzeri ses
  scheduleRandom(() => textureNoise(0.4 + Math.random() * 0.3, 0.08, 2200, 'bandpass'), 10000, 20000, token);
  // Uzak çığlık/inleme
  scheduleRandom(() => {
    textureTone(280 + Math.random() * 60, 0.6, 'sine', 0.08, 180);
  }, 18000, 35000, token);
  return layers;
}

// ── TAVERNA ──
function buildTavern(token) {
  const layers = [
    makeNoiseLoop({ filterType: 'bandpass', freq: 450, q: 0.6, gain: 0.06 }), // kalabalık uğultusu
    makeNoiseLoop({ filterType: 'bandpass', freq: 2200, q: 1.2, gain: 0.035 }), // ateş çıtırtısı
    makeDrone({ freq: 110, type: 'sine', gain: 0.015 }), // sıcak alt ton
  ];
  // Ateş çıtırtısı patlamaları
  scheduleRandom(() => textureNoise(0.08 + Math.random() * 0.06, 0.5, 3000 + Math.random() * 1500, 'highpass'), 500, 1600, token);
  // Bardak şıngırtısı
  scheduleRandom(() => {
    textureTone(900 + Math.random() * 400, 0.09, 'triangle', 0.4);
    setTimeout(() => textureTone(1400 + Math.random() * 300, 0.06, 'triangle', 0.25), 40);
  }, 4000, 8000, token);
  // Kahkaha/uğultu vurgusu
  scheduleRandom(() => textureNoise(0.3 + Math.random() * 0.2, 0.22, 350, 'lowpass'), 5000, 11000, token);
  // Uzak müzik benzeri (lir/flüt tınısı)
  scheduleRandom(() => {
    const notes = [330, 392, 440, 523, 587];
    const n = notes[Math.floor(Math.random() * notes.length)];
    textureTone(n, 0.2, 'sine', 0.1);
    setTimeout(() => textureTone(n * 1.25, 0.15, 'sine', 0.08), 220);
  }, 8000, 15000, token);
  // Odun atma sesi
  scheduleRandom(() => {
    textureNoise(0.12, 0.35, 1200, 'lowpass');
    setTimeout(() => textureNoise(0.08, 0.2, 4000, 'highpass'), 100);
  }, 12000, 22000, token);
  return layers;
}

// ── ŞEHİR ──
function buildCity(token) {
  const layers = [
    makeNoiseLoop({ filterType: 'lowpass', freq: 550, q: 0.6, gain: 0.05 }),
    makeNoiseLoop({ filterType: 'bandpass', freq: 1200, q: 0.3, gain: 0.02 }), // uzak uğultu
    makeDrone({ freq: 70, type: 'sine', gain: 0.025 }),
  ];
  // Araba/tekerlek gıcırtısı
  scheduleRandom(() => {
    textureTone(180 + Math.random() * 60, 0.25, 'sawtooth', 0.22, 120);
    textureNoise(0.2, 0.18, 600, 'bandpass');
  }, 5000, 10000, token);
  // Uzak pazar sesi/bağırış
  scheduleRandom(() => textureTone(500 + Math.random() * 300, 0.18, 'triangle', 0.18), 3000, 7000, token);
  // Ayak sesi — birden fazla adım
  scheduleRandom(() => {
    const steps = 3 + Math.floor(Math.random() * 4);
    for (let i = 0; i < steps; i++) {
      setTimeout(() => textureNoise(0.05, 0.18, 700 + Math.random() * 300, 'bandpass'), i * 300);
    }
  }, 4000, 9000, token);
  // Çan sesi
  scheduleRandom(() => {
    textureTone(880, 0.6, 'sine', 0.15);
    setTimeout(() => textureTone(880, 0.4, 'sine', 0.08), 600);
  }, 20000, 40000, token);
  // Köpek havlaması
  scheduleRandom(() => {
    textureTone(350, 0.08, 'sawtooth', 0.15, 280);
    setTimeout(() => textureTone(380, 0.07, 'sawtooth', 0.12, 300), 200);
  }, 15000, 30000, token);
  return layers;
}

// ── SAVAŞ / COMBAT ──
function buildCombat(token) {
  const layers = [
    makeDrone({ freq: 52, type: 'sawtooth', gain: 0.09, lfoFreq: 0.35, lfoDepth: 0.04 }),
    makeDrone({ freq: 78, type: 'sine', gain: 0.04, lfoFreq: 0.5, lfoDepth: 0.02 }), // gerilim harmonik
    makeNoiseLoop({ filterType: 'highpass', freq: 2500, q: 0.4, gain: 0.025 }),
  ];
  // Kalp atışı — çift vuruş
  scheduleRandom(() => {
    textureTone(55, 0.15, 'sine', 0.35);
    setTimeout(() => textureTone(50, 0.12, 'sine', 0.25), 180);
  }, 1200, 2200, token);
  // Uzak metal çarpışması
  scheduleRandom(() => {
    textureNoise(0.06, 0.3, 2000, 'highpass');
    textureTone(600 + Math.random() * 400, 0.05, 'square', 0.2);
  }, 3000, 6000, token);
  return layers;
}

// ── MAĞARA / CAVE ──
function buildCave(token) {
  const layers = [
    makeDrone({ freq: 38, type: 'sine', gain: 0.1 }),
    makeDrone({ freq: 57, type: 'sine', gain: 0.05, lfoFreq: 0.05, lfoDepth: 0.03 }),
    makeNoiseLoop({ filterType: 'lowpass', freq: 120, q: 0.8, gain: 0.07 }), // derin rüzgar
  ];
  // Yoğun su damlası — yankılı mağara akustiği
  scheduleRandom(() => {
    const f = 900 + Math.random() * 500;
    textureTone(f, 0.15, 'sine', 0.35, f * 0.4);
    setTimeout(() => textureTone(f * 0.85, 0.1, 'sine', 0.15, f * 0.3), 250);
    setTimeout(() => textureTone(f * 0.7, 0.08, 'sine', 0.06, f * 0.2), 450); // üçüncü yankı
  }, 1800, 5000, token);
  // Taş düşme
  scheduleRandom(() => {
    textureNoise(0.1, 0.3, 800, 'lowpass');
    setTimeout(() => textureNoise(0.05, 0.15, 600, 'lowpass'), 200);
  }, 8000, 18000, token);
  // Yarasa kanat çırpma
  scheduleRandom(() => {
    for (let i = 0; i < 5 + Math.floor(Math.random() * 5); i++) {
      setTimeout(() => textureNoise(0.02, 0.15, 4000 + Math.random() * 1000, 'highpass'), i * 40);
    }
  }, 10000, 25000, token);
  // Derin uğultu
  scheduleRandom(() => textureTone(25 + Math.random() * 8, 2.0, 'sine', 0.12), 15000, 28000, token);
  return layers;
}

// ── BATAKLИК / SWAMP ──
function buildSwamp(token) {
  const layers = [
    makeNoiseLoop({ filterType: 'lowpass', freq: 300, q: 0.6, gain: 0.06 }), // nemli hava
    makeNoiseLoop({ filterType: 'bandpass', freq: 2500, q: 0.8, gain: 0.03 }), // böcek zemini
    makeDrone({ freq: 48, type: 'sine', gain: 0.04, lfoFreq: 0.1, lfoDepth: 0.02 }),
  ];
  // Kurbağa — derin vıraklama
  scheduleRandom(() => {
    const f = 120 + Math.random() * 40;
    textureTone(f, 0.15, 'square', 0.2);
    setTimeout(() => textureTone(f * 0.9, 0.12, 'square', 0.15), 200);
    if (Math.random() > 0.5) setTimeout(() => textureTone(f * 1.1, 0.1, 'square', 0.12), 450);
  }, 2000, 5000, token);
  // İkinci kurbağa türü — yüksek ton
  scheduleRandom(() => {
    for (let i = 0; i < 2 + Math.floor(Math.random() * 3); i++) {
      setTimeout(() => textureTone(600 + Math.random() * 200, 0.04, 'sine', 0.15), i * 120);
    }
  }, 3000, 7000, token);
  // Yoğun böcek vızıltısı
  scheduleRandom(() => {
    for (let i = 0; i < 6 + Math.floor(Math.random() * 6); i++) {
      setTimeout(() => textureTone(3500 + Math.random() * 800, 0.02, 'square', 0.08), i * 45);
    }
  }, 1000, 3000, token);
  // Su kabarcığı
  scheduleRandom(() => {
    textureTone(400 + Math.random() * 300, 0.06, 'sine', 0.2, 200);
    setTimeout(() => textureTone(350 + Math.random() * 200, 0.04, 'sine', 0.1, 150), 100);
  }, 3000, 8000, token);
  // Ağır adım — bataklıkta yürüme
  scheduleRandom(() => textureNoise(0.2, 0.2, 350, 'lowpass'), 6000, 14000, token);
  return layers;
}

// ── OKYANUS / DENİZ / OCEAN ──
function buildOcean(token) {
  const layers = [
    makeNoiseLoop({ filterType: 'lowpass', freq: 600, q: 0.3, gain: 0.08 }), // dalga zemini
    makeNoiseLoop({ filterType: 'bandpass', freq: 1500, q: 0.5, gain: 0.03 }), // köpük
    makeDrone({ freq: 55, type: 'sine', gain: 0.06, lfoFreq: 0.12, lfoDepth: 0.04 }), // dalga ritmi
  ];
  // Dalga geliş-gidiş
  scheduleRandom(() => {
    textureNoise(1.5 + Math.random() * 1.0, 0.25, 700, 'lowpass');
    setTimeout(() => textureNoise(0.8, 0.12, 1800, 'bandpass'), 800); // köpük çekilmesi
  }, 3000, 7000, token);
  // Martı
  scheduleRandom(() => {
    const f = 1600 + Math.random() * 400;
    textureTone(f, 0.25, 'sine', 0.2, f * 0.7);
    if (Math.random() > 0.5) setTimeout(() => textureTone(f * 1.1, 0.2, 'sine', 0.15, f * 0.6), 400);
  }, 6000, 14000, token);
  // Rüzgar
  scheduleRandom(() => textureNoise(1.2 + Math.random() * 0.8, 0.15, 1200, 'bandpass'), 5000, 11000, token);
  // Gemi gıcırtısı (tahta)
  scheduleRandom(() => {
    textureTone(200 + Math.random() * 80, 0.3, 'sawtooth', 0.08, 140);
  }, 10000, 20000, token);
  return layers;
}

// ── DAĞ / MOUNTAIN ──
function buildMountain(token) {
  const layers = [
    makeNoiseLoop({ filterType: 'bandpass', freq: 800, q: 0.3, gain: 0.06 }), // güçlü rüzgar
    makeNoiseLoop({ filterType: 'highpass', freq: 3000, q: 0.4, gain: 0.02 }), // ince rüzgar ıslığı
    makeDrone({ freq: 65, type: 'sine', gain: 0.03 }),
  ];
  // Rüzgar uğultusu
  scheduleRandom(() => textureNoise(1.5 + Math.random() * 1.0, 0.22, 600, 'bandpass'), 3000, 7000, token);
  // Kartal çığlığı
  scheduleRandom(() => {
    const f = 1200 + Math.random() * 300;
    textureTone(f, 0.4, 'sine', 0.2, f * 0.6);
  }, 12000, 25000, token);
  // Taş düşme/kayma
  scheduleRandom(() => {
    textureNoise(0.15, 0.25, 500, 'lowpass');
    setTimeout(() => textureNoise(0.08, 0.12, 400, 'lowpass'), 200);
    setTimeout(() => textureNoise(0.05, 0.06, 300, 'lowpass'), 350);
  }, 10000, 22000, token);
  // Rüzgar ıslığı (melodili)
  scheduleRandom(() => {
    textureTone(700 + Math.random() * 300, 0.5, 'sine', 0.08, 500);
  }, 7000, 15000, token);
  return layers;
}

// ── TAPINAK / TEMPLE ──
function buildTemple(token) {
  const layers = [
    makeDrone({ freq: 65, type: 'sine', gain: 0.06 }),
    makeDrone({ freq: 98, type: 'sine', gain: 0.04 }), // beşli harmonik
    makeDrone({ freq: 130, type: 'sine', gain: 0.02 }), // oktav
  ];
  // Korodaki ilahi tınısı — uzun notalar
  scheduleRandom(() => {
    const notes = [196, 220, 262, 294, 330]; // G3-E4 arası kutsal tonlar
    const n = notes[Math.floor(Math.random() * notes.length)];
    textureTone(n, 1.2, 'sine', 0.08);
    setTimeout(() => textureTone(n * 1.5, 0.8, 'sine', 0.05), 400);
  }, 6000, 14000, token);
  // Çan — reverb benzeri
  scheduleRandom(() => {
    textureTone(523, 0.8, 'sine', 0.15);
    setTimeout(() => textureTone(523, 0.5, 'sine', 0.06), 500);
    setTimeout(() => textureTone(523, 0.3, 'sine', 0.02), 900);
  }, 15000, 30000, token);
  // Meşale çıtırtısı
  scheduleRandom(() => textureNoise(0.06 + Math.random() * 0.04, 0.2, 3500, 'highpass'), 1000, 3000, token);
  // Uzak ayak sesi (yavaş adımlar)
  scheduleRandom(() => {
    textureNoise(0.04, 0.1, 500, 'bandpass');
    setTimeout(() => textureNoise(0.04, 0.08, 500, 'bandpass'), 600);
  }, 10000, 20000, token);
  return layers;
}

// ── KAMP / CAMP ──
function buildCamp(token) {
  const layers = [
    makeNoiseLoop({ filterType: 'bandpass', freq: 2800, q: 1.0, gain: 0.04 }), // kamp ateşi
    makeNoiseLoop({ filterType: 'bandpass', freq: 1200, q: 0.4, gain: 0.025 }), // hafif gece rüzgarı
    makeDrone({ freq: 85, type: 'sine', gain: 0.02 }), // sıcak alt ton
  ];
  // Ateş çıtırtısı — yoğun
  scheduleRandom(() => textureNoise(0.06 + Math.random() * 0.05, 0.45, 3500 + Math.random() * 1500, 'highpass'), 400, 1200, token);
  // Büyük çıtırtı (odun kırılması)
  scheduleRandom(() => {
    textureNoise(0.1, 0.5, 2000, 'highpass');
    setTimeout(() => textureNoise(0.15, 0.25, 1500, 'bandpass'), 80);
  }, 6000, 14000, token);
  // Gece böcekleri — cırcır
  scheduleRandom(() => {
    const count = 5 + Math.floor(Math.random() * 8);
    for (let i = 0; i < count; i++) {
      setTimeout(() => textureTone(4000 + Math.random() * 500, 0.02, 'square', 0.07), i * 50);
    }
  }, 1500, 4000, token);
  // Baykuş — iki tonlu ötüş
  scheduleRandom(() => {
    textureTone(400, 0.3, 'sine', 0.15);
    setTimeout(() => textureTone(330, 0.4, 'sine', 0.12), 500);
  }, 8000, 18000, token);
  // Kurt uluma (çok uzak)
  scheduleRandom(() => {
    textureTone(220, 1.0, 'sine', 0.06, 180);
  }, 25000, 50000, token);
  return layers;
}

// ── HARABELер / RUINS ──
function buildRuins(token) {
  const layers = [
    makeNoiseLoop({ filterType: 'bandpass', freq: 600, q: 0.4, gain: 0.05 }), // terk edilmiş rüzgar
    makeDrone({ freq: 50, type: 'sine', gain: 0.06, lfoFreq: 0.06, lfoDepth: 0.03 }),
  ];
  // Rüzgarın arasından geçen ıslık
  scheduleRandom(() => {
    const f = 500 + Math.random() * 400;
    textureTone(f, 0.6, 'sine', 0.1, f * 0.7);
  }, 4000, 10000, token);
  // Taş düşmesi / moloz
  scheduleRandom(() => {
    textureNoise(0.12, 0.28, 600, 'lowpass');
    const count = 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < count; i++) {
      setTimeout(() => textureNoise(0.04, 0.12, 500, 'lowpass'), 150 + i * 120);
    }
  }, 7000, 16000, token);
  // Gizemli tınlama — eski büyü kalıntısı
  scheduleRandom(() => {
    textureTone(262, 0.8, 'sine', 0.06);
    setTimeout(() => textureTone(330, 0.6, 'sine', 0.04), 300);
  }, 12000, 24000, token);
  // Gıcırdayan kapı/tahta
  scheduleRandom(() => {
    textureTone(150 + Math.random() * 50, 0.4, 'sawtooth', 0.1, 100);
  }, 10000, 22000, token);
  // Karga
  scheduleRandom(() => {
    textureTone(500, 0.08, 'sawtooth', 0.18, 350);
    setTimeout(() => textureTone(480, 0.06, 'sawtooth', 0.12, 340), 200);
  }, 8000, 18000, token);
  return layers;
}

// ── FIRTINA / STORM ──
function buildStorm(token) {
  const layers = [
    makeNoiseLoop({ filterType: 'lowpass', freq: 800, q: 0.5, gain: 0.1 }), // şiddetli rüzgar
    makeNoiseLoop({ filterType: 'bandpass', freq: 2000, q: 0.6, gain: 0.04 }), // yağmur
    makeNoiseLoop({ filterType: 'highpass', freq: 4000, q: 0.3, gain: 0.025 }), // yağmur ince katman
  ];
  // Gök gürültüsü — uzak
  scheduleRandom(() => {
    textureTone(40 + Math.random() * 15, 1.5, 'sawtooth', 0.3);
    textureNoise(1.8, 0.35, 400, 'lowpass');
    // Yankı
    setTimeout(() => {
      textureTone(35 + Math.random() * 10, 1.0, 'sawtooth', 0.15);
      textureNoise(1.2, 0.15, 300, 'lowpass');
    }, 600);
  }, 8000, 18000, token);
  // Şimşek — anlık parlama sesi
  scheduleRandom(() => {
    textureNoise(0.03, 0.6, 6000, 'highpass');
    textureTone(2000, 0.02, 'square', 0.4);
  }, 10000, 22000, token);
  // Rüzgar girdabı
  scheduleRandom(() => {
    textureNoise(1.0 + Math.random() * 0.5, 0.3, 500, 'bandpass');
  }, 3000, 6000, token);
  // Yağmur yoğunluk değişimi
  scheduleRandom(() => {
    textureNoise(0.4, 0.2, 3000 + Math.random() * 1000, 'bandpass');
  }, 2000, 4500, token);
  return layers;
}

// ── ÇÖL / DESERT ──
function buildDesert(token) {
  const layers = [
    makeNoiseLoop({ filterType: 'bandpass', freq: 500, q: 0.3, gain: 0.04 }), // kuru rüzgar
    makeDrone({ freq: 75, type: 'sine', gain: 0.03 }),
  ];
  // Kum fırtınası esintisi
  scheduleRandom(() => {
    textureNoise(0.8 + Math.random() * 0.6, 0.2, 1500, 'bandpass');
  }, 4000, 9000, token);
  // Çıngırak yılanı
  scheduleRandom(() => {
    const count = 8 + Math.floor(Math.random() * 10);
    for (let i = 0; i < count; i++) {
      setTimeout(() => textureNoise(0.015, 0.18, 5000 + Math.random() * 1500, 'highpass'), i * 30);
    }
  }, 12000, 28000, token);
  // Uzak kartal
  scheduleRandom(() => {
    textureTone(1100 + Math.random() * 300, 0.35, 'sine', 0.12, 800);
  }, 15000, 30000, token);
  // Rüzgar ıslığı (kum tepelerinden)
  scheduleRandom(() => {
    textureTone(600 + Math.random() * 200, 0.5, 'sine', 0.06, 400);
  }, 6000, 13000, token);
  // Sessizliğin basıncı (çok düşük drone vuruş)
  scheduleRandom(() => {
    textureTone(30, 0.8, 'sine', 0.1);
  }, 10000, 20000, token);
  return layers;
}

/* ══════════════════════════════════════════════════════════════ */

const SCENES = {
  forest: buildForest,
  dungeon: buildDungeon,
  tavern: buildTavern,
  city: buildCity,
  combat: buildCombat,
  cave: buildCave,
  swamp: buildSwamp,
  ocean: buildOcean,
  mountain: buildMountain,
  temple: buildTemple,
  camp: buildCamp,
  ruins: buildRuins,
  storm: buildStorm,
  desert: buildDesert,
};

// Senaryo başlangıcını ambiyans temasına eşler.
export function mapScenarioToAmbience(scenario) {
  const map = {
    tavern: 'tavern',
    dungeon: 'dungeon',
    forest: 'forest',
    city: 'city',
    dragon: 'cave',
    cave: 'cave',
    swamp: 'swamp',
    ocean: 'ocean',
    mountain: 'mountain',
    temple: 'temple',
    camp: 'camp',
    ruins: 'ruins',
    storm: 'storm',
    desert: 'desert',
  };
  return map[scenario] || 'forest';
}

// AI'dan gelen scene_change event'ini ambiyans sahnesine eşler.
// Türkçe ve İngilizce bölge isimlerini destekler.
export function detectAmbienceFromScene(sceneStr) {
  if (!sceneStr) return null;
  const s = sceneStr.toLowerCase().trim();
  const keywords = {
    tavern:   ['tavern', 'taverna', 'han', 'meyhane', 'inn', 'pub', 'bar'],
    dungeon:  ['dungeon', 'zindan', 'hapishane', 'yeraltı', 'underground', 'prison'],
    forest:   ['forest', 'orman', 'ağaçlık', 'woodland', 'woods', 'grove', 'çalılık'],
    city:     ['city', 'şehir', 'kent', 'kasaba', 'town', 'village', 'köy', 'pazar', 'market', 'sokak', 'street', 'kale', 'castle', 'saray', 'palace'],
    cave:     ['cave', 'mağara', 'kovuk', 'cavern', 'grotto', 'ejderha ini', 'dragon lair'],
    swamp:    ['swamp', 'bataklık', 'marsh', 'bog', 'wetland', 'sazlık'],
    ocean:    ['ocean', 'okyanus', 'deniz', 'sea', 'gemi', 'ship', 'liman', 'port', 'harbor', 'sahil', 'beach', 'coast', 'kıyı', 'nehir', 'river', 'göl', 'lake'],
    mountain: ['mountain', 'dağ', 'zirve', 'peak', 'summit', 'tepe', 'hill', 'uçurum', 'cliff', 'geçit', 'pass', 'yamaç'],
    temple:   ['temple', 'tapınak', 'kilise', 'church', 'cathedral', 'altar', 'shrine', 'türbe', 'monastery', 'manastır', 'kutsal'],
    camp:     ['camp', 'kamp', 'ateş', 'campfire', 'bivouac', 'dinlenme', 'rest', 'gece', 'night', 'çadır', 'tent'],
    ruins:    ['ruins', 'harabe', 'kalıntı', 'yıkıntı', 'terk edilmiş', 'abandoned', 'virane', 'ören', 'mezarlık', 'cemetery', 'graveyard', 'crypt', 'mahzen'],
    storm:    ['storm', 'fırtına', 'yağmur', 'rain', 'thunder', 'gök gürültüsü', 'şimşek', 'lightning', 'kasırga', 'tipi', 'blizzard'],
    desert:   ['desert', 'çöl', 'kum', 'sand', 'vaha', 'oasis', 'kurak', 'arid', 'wasteland'],
    combat:   ['combat', 'savaş', 'dövüş', 'fight', 'battle', 'arena'],
  };

  for (const [scene, words] of Object.entries(keywords)) {
    for (const w of words) {
      if (s.includes(w)) return scene;
    }
  }
  return null;
}

// Mevcut sahne adını döndürür
export function getCurrentScene() {
  return currentSceneId;
}

// Tüm sahne listesi (debug/settings için)
export function getAvailableScenes() {
  return Object.keys(SCENES);
}

function stopCurrentLayers() {
  currentToken.cancelled = true;
  currentToken.timers.forEach(clearTimeout);
  currentLayers.forEach((l) => l.stop());
  currentLayers = [];
}

export function startAmbience(sceneType) {
  const scene = SCENES[sceneType] ? sceneType : 'forest';
  if (currentSceneId === scene) return;
  if (crossfadeTimer) clearTimeout(crossfadeTimer);
  ensureSyncInterval();

  const master = ensureMaster();
  const ctx = getCtx();
  const now = ctx.currentTime;
  master.gain.cancelScheduledValues(now);
  master.gain.setValueAtTime(master.gain.value, now);
  master.gain.linearRampToValueAtTime(0, now + 0.6);

  crossfadeTimer = setTimeout(() => {
    stopCurrentLayers();
    currentSceneId = scene;
    currentToken = { cancelled: false, timers: [] };
    currentLayers = SCENES[scene](currentToken);
    const ctx2 = getCtx();
    const target = isSoundEnabled() ? getSoundVolume() * 0.55 : 0;
    master.gain.cancelScheduledValues(ctx2.currentTime);
    master.gain.setValueAtTime(0, ctx2.currentTime);
    master.gain.linearRampToValueAtTime(target, ctx2.currentTime + 1.2);
  }, 650);
}

export function stopAmbience() {
  if (!masterGain) return;
  if (crossfadeTimer) clearTimeout(crossfadeTimer);
  const ctx = getCtx();
  masterGain.gain.cancelScheduledValues(ctx.currentTime);
  masterGain.gain.setValueAtTime(masterGain.gain.value, ctx.currentTime);
  masterGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.6);
  crossfadeTimer = setTimeout(() => {
    stopCurrentLayers();
    currentSceneId = null;
  }, 650);
}

let syncIntervalId = null;
function ensureSyncInterval() {
  if (syncIntervalId) return;
  syncIntervalId = setInterval(() => {
    if (!masterGain || !currentSceneId) return;
    const ctx = getCtx();
    const target = isSoundEnabled() ? getSoundVolume() * 0.55 : 0;
    masterGain.gain.setTargetAtTime(target, ctx.currentTime, 0.6);
  }, 1500);
}

export function cleanupAmbience() {
  stopAmbience();
  if (syncIntervalId) {
    clearInterval(syncIntervalId);
    syncIntervalId = null;
  }
}

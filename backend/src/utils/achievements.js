const { firestore, docData, serverTimestamp, increment } = require('../firestore');
const { ACHIEVEMENTS, STAT_KEYS } = require('../data/achievements');

// Sayaçlar kullanıcı bazında tutulur (hesap genelinde kalıcı — karakter ölse bile kaybolmaz).
// users/{uid}.achievement_stats   → { enemies_killed: 12, ... }
// users/{uid}.achievements        → { first_blood: <Date>, ... }   (kazanılma zamanı)

const MAX_STAT = 1e9;

function sanitizeDeltas(deltas) {
  const clean = {};
  for (const [key, value] of Object.entries(deltas || {})) {
    if (!STAT_KEYS.includes(key)) continue;
    const num = Math.round(Number(value));
    if (!Number.isFinite(num) || num === 0) continue;
    clean[key] = Math.max(-MAX_STAT, Math.min(MAX_STAT, num));
  }
  return clean;
}

/**
 * Sayaçları artırır ve yeni açılan başarımları döndürür.
 * `maxStats` (örn. max_level) artan değil, "en yüksek değer" mantığıyla çalışır.
 *
 * @returns {Promise<Array<{event:'achievement_unlocked', id:string, xp:number, gold:number, tier:string, icon:string}>>}
 */
async function bumpStats(uid, deltas = {}, maxStats = {}) {
  if (!uid) return [];
  const cleanDeltas = sanitizeDeltas(deltas);
  const cleanMax = sanitizeDeltas(maxStats);
  if (!Object.keys(cleanDeltas).length && !Object.keys(cleanMax).length) return [];

  const userRef = firestore.collection('users').doc(uid);
  const before = docData(await userRef.get()) || {};
  const stats = { ...(before.achievement_stats || {}) };

  // NOT: set(..., {merge:true}) noktalı alan yolunu YORUMLAMAZ (update() aksine),
  // bu yüzden iç içe map olarak yazıyoruz — merge sayesinde alan bazında birleşir.
  const statsUpdate = {};
  for (const [key, delta] of Object.entries(cleanDeltas)) {
    statsUpdate[key] = increment(delta);
    stats[key] = (Number(stats[key]) || 0) + delta;
  }
  for (const [key, value] of Object.entries(cleanMax)) {
    if (value > (Number(stats[key]) || 0)) {
      statsUpdate[key] = value;
      stats[key] = value;
    }
  }
  if (!Object.keys(statsUpdate).length) return [];

  const unlockedBefore = before.achievements || {};
  const newlyUnlocked = ACHIEVEMENTS.filter(
    (entry) => !unlockedBefore[entry.id] && (Number(stats[entry.stat]) || 0) >= entry.goal
  );
  const achievementsUpdate = {};
  newlyUnlocked.forEach((entry) => {
    achievementsUpdate[entry.id] = serverTimestamp();
  });

  const payload = { achievement_stats: statsUpdate, updated_at: serverTimestamp() };
  if (newlyUnlocked.length) payload.achievements = achievementsUpdate;
  await userRef.set(payload, { merge: true });

  return newlyUnlocked.map((entry) => ({
    event: 'achievement_unlocked',
    id: entry.id,
    tier: entry.tier,
    icon: entry.icon,
    xp: entry.xp,
    gold: entry.gold,
  }));
}

/** Kullanıcının başarım durumunu (kazanılanlar + ilerleme) döndürür. */
async function getAchievementState(uid) {
  const user = docData(await firestore.collection('users').doc(uid).get()) || {};
  const stats = user.achievement_stats || {};
  const unlocked = user.achievements || {};
  return {
    stats,
    achievements: ACHIEVEMENTS.map((entry) => ({
      id: entry.id,
      tier: entry.tier,
      icon: entry.icon,
      stat: entry.stat,
      goal: entry.goal,
      xp: entry.xp,
      gold: entry.gold,
      progress: Math.min(Number(stats[entry.stat]) || 0, entry.goal),
      unlocked: !!unlocked[entry.id],
      unlockedAt: unlocked[entry.id] || null,
    })),
  };
}

module.exports = { bumpStats, getAchievementState };

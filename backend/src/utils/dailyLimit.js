const { firestore } = require('../firestore');
const { isPremium } = require('./premium');

// Balance: generous enough for a full free session per day, but caps worst-case
// Gemini cost exposure per user. Extra turns are unlocked via rewarded ads.
const FREE_DAILY_TURNS = 40;
const BONUS_PER_AD = 15;
const MAX_BONUS_ADS_PER_DAY = 3;

function getTodayIstanbul() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Istanbul' });
}

// Atomically checks whether the user still has daily turns left, and if so
// consumes one. Premium users bypass the limit entirely.
async function checkAndConsumeDailyTurn(uid) {
  if (await isPremium(uid)) {
    return { allowed: true, used: 0, limit: Infinity, bonusAdsUsed: 0, maxBonusAds: MAX_BONUS_ADS_PER_DAY, premium: true };
  }
  const userRef = firestore.collection('users').doc(uid);
  const today = getTodayIstanbul();
  return firestore.runTransaction(async (transaction) => {
    const doc = await transaction.get(userRef);
    const data = doc.exists ? doc.data() : {};
    const isNewDay = data.dailyTurnDate !== today;
    const used = isNewDay ? 0 : (data.dailyTurnsUsed || 0);
    const bonusTurns = isNewDay ? 0 : (data.dailyBonusTurns || 0);
    const bonusAdsUsed = isNewDay ? 0 : (data.dailyBonusAdsUsed || 0);
    const limit = FREE_DAILY_TURNS + bonusTurns;

    if (used >= limit) {
      transaction.set(userRef, {
        dailyTurnDate: today,
        dailyTurnsUsed: used,
        dailyBonusTurns: bonusTurns,
        dailyBonusAdsUsed: bonusAdsUsed,
      }, { merge: true });
      return { allowed: false, used, limit, bonusAdsUsed, maxBonusAds: MAX_BONUS_ADS_PER_DAY };
    }

    transaction.set(userRef, {
      dailyTurnDate: today,
      dailyTurnsUsed: used + 1,
      dailyBonusTurns: bonusTurns,
      dailyBonusAdsUsed: bonusAdsUsed,
    }, { merge: true });
    return { allowed: true, used: used + 1, limit, bonusAdsUsed, maxBonusAds: MAX_BONUS_ADS_PER_DAY };
  });
}

// Reads the current daily-turn status WITHOUT consuming a turn.
// The game screen uses this to show the remaining-moves counter on load.
async function getDailyStatus(uid) {
  if (await isPremium(uid)) {
    return { used: 0, limit: Infinity, bonusAdsUsed: 0, maxBonusAds: MAX_BONUS_ADS_PER_DAY, premium: true };
  }
  const doc = await firestore.collection('users').doc(uid).get();
  const data = doc.exists ? doc.data() : {};
  const isNewDay = data.dailyTurnDate !== getTodayIstanbul();
  const bonusTurns = isNewDay ? 0 : (data.dailyBonusTurns || 0);
  return {
    used: isNewDay ? 0 : (data.dailyTurnsUsed || 0),
    limit: FREE_DAILY_TURNS + bonusTurns,
    bonusAdsUsed: isNewDay ? 0 : (data.dailyBonusAdsUsed || 0),
    maxBonusAds: MAX_BONUS_ADS_PER_DAY,
    premium: false,
  };
}

// ── Ödüllü reklam doğrulaması ──────────────────────────────────────────────
// Ödül SADECE sunucunun verdiği tek kullanımlık bir bilet ile alınabilir.
// Bilet, reklam gösterilmeye başlandığında üretilir; ödül talebinde biletin
// yaşı en az MIN_AD_WATCH_MS olmalıdır. Böylece reklam izlenmeden (veya
// doğrudan API çağrılarak) ödül alınması engellenir.
const MIN_AD_WATCH_MS = 5000;        // AdMob ödüllü reklamlarında minimum izleme süresi
const MAX_AD_TICKET_AGE_MS = 15 * 60 * 1000;

// Reklam gösterimi başlarken çağrılır; tek kullanımlık bilet üretir.
async function startAdSession(uid) {
  const ticketId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  await firestore.collection('users').doc(uid).set({
    adTicketId: ticketId,
    adTicketAt: Date.now(),
    adTicketUsed: false,
  }, { merge: true });
  return { ticketId, minWatchMs: MIN_AD_WATCH_MS };
}

// Grants a rewarded-ad bonus of extra daily turns, up to MAX_BONUS_ADS_PER_DAY per day.
// Premium users do not need rewarded ads.
async function claimDailyBonus(uid, ticketId) {
  if (await isPremium(uid)) {
    const error = new Error('Premium kullanıcılar reklama ihtiyaç duymaz');
    error.code = 'PREMIUM_NO_ADS';
    throw error;
  }
  const userRef = firestore.collection('users').doc(uid);
  const today = getTodayIstanbul();
  return firestore.runTransaction(async (transaction) => {
    const doc = await transaction.get(userRef);
    const data = doc.exists ? doc.data() : {};

    // Reklam biletini doğrula — izlenmeden ödül alınmasını engeller
    const invalidTicket = new Error('Reklam izlendiği doğrulanamadı');
    invalidTicket.code = 'AD_NOT_VERIFIED';
    if (!ticketId || data.adTicketId !== ticketId) throw invalidTicket;
    if (data.adTicketUsed) throw invalidTicket;
    const ticketAge = Date.now() - (data.adTicketAt || 0);
    if (ticketAge < MIN_AD_WATCH_MS || ticketAge > MAX_AD_TICKET_AGE_MS) throw invalidTicket;

    const isNewDay = data.dailyTurnDate !== today;
    const used = isNewDay ? 0 : (data.dailyTurnsUsed || 0);
    const bonusTurns = isNewDay ? 0 : (data.dailyBonusTurns || 0);
    const bonusAdsUsed = isNewDay ? 0 : (data.dailyBonusAdsUsed || 0);

    if (bonusAdsUsed >= MAX_BONUS_ADS_PER_DAY) {
      const error = new Error('Bugün için ekstra hak sınırına ulaştın, yarın tekrar dene');
      error.code = 'MAX_BONUS_REACHED';
      throw error;
    }

    const newBonusTurns = bonusTurns + BONUS_PER_AD;
    const newBonusAdsUsed = bonusAdsUsed + 1;
    transaction.set(userRef, {
      dailyTurnDate: today,
      dailyTurnsUsed: used,
      dailyBonusTurns: newBonusTurns,
      dailyBonusAdsUsed: newBonusAdsUsed,
      adTicketUsed: true,
    }, { merge: true });
    return {
      used,
      limit: FREE_DAILY_TURNS + newBonusTurns,
      bonusAdsUsed: newBonusAdsUsed,
      maxBonusAds: MAX_BONUS_ADS_PER_DAY,
    };
  });
}

// Grants a wheel-spin bonus of extra daily turns.
async function claimWheelTurns(uid, amount) {
  if (await isPremium(uid)) {
    // Premium users do not consume daily turns, so no bonus storage is needed.
    return { used: 0, limit: Infinity, bonusAdsUsed: 0, maxBonusAds: MAX_BONUS_ADS_PER_DAY, premium: true };
  }
  const userRef = firestore.collection('users').doc(uid);
  const today = getTodayIstanbul();
  return firestore.runTransaction(async (transaction) => {
    const doc = await transaction.get(userRef);
    const data = doc.exists ? doc.data() : {};
    const isNewDay = data.dailyTurnDate !== today;
    const used = isNewDay ? 0 : (data.dailyTurnsUsed || 0);
    const bonusTurns = isNewDay ? 0 : (data.dailyBonusTurns || 0);
    const bonusAdsUsed = isNewDay ? 0 : (data.dailyBonusAdsUsed || 0);
    const newBonusTurns = bonusTurns + Math.max(1, Math.min(amount, 20));
    transaction.set(userRef, {
      dailyTurnDate: today,
      dailyTurnsUsed: used,
      dailyBonusTurns: newBonusTurns,
      dailyBonusAdsUsed: bonusAdsUsed,
    }, { merge: true });
    return {
      used,
      limit: FREE_DAILY_TURNS + newBonusTurns,
      bonusAdsUsed,
      maxBonusAds: MAX_BONUS_ADS_PER_DAY,
    };
  });
}

module.exports = {
  checkAndConsumeDailyTurn,
  getDailyStatus,
  startAdSession,
  claimDailyBonus,
  claimWheelTurns,
  FREE_DAILY_TURNS,
  BONUS_PER_AD,
  MAX_BONUS_ADS_PER_DAY,
};

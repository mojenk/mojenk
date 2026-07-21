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

// Grants a rewarded-ad bonus of extra daily turns, up to MAX_BONUS_ADS_PER_DAY per day.
// Premium users do not need rewarded ads.
async function claimDailyBonus(uid) {
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
  claimDailyBonus,
  claimWheelTurns,
  FREE_DAILY_TURNS,
  BONUS_PER_AD,
  MAX_BONUS_ADS_PER_DAY,
};

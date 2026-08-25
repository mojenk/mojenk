const API = import.meta.env.VITE_API_URL || '/api';

import { auth } from '../firebase';
import { getLang } from './i18n';

async function getAuthToken(explicitUser = null) {
  const user = explicitUser || auth.currentUser;
  if (!user) return '';
  try {
    return await user.getIdToken();
  } catch { return ''; }
}

function getCurrentUserId() {
  try {
    const u = JSON.parse(localStorage.getItem('dnd_user'));
    return u?.uid || u?.firebase_uid || u?.id || '';
  } catch { return ''; }
}

async function safeFetch(url, options = {}) {
  try {
    const token = await getAuthToken(options.authUser || null);
    const headers = { ...options.headers };
    if (options.authUser) delete options.authUser;
    if (token) headers['Authorization'] = `Bearer ${token}`;
    headers['x-user-id'] = getCurrentUserId();
    const r = await fetch(url, { ...options, headers });
    if (!r.ok) {
      const data = await r.json().catch(() => ({}));
      const error = new Error(data.error || `Sunucu hatası (${r.status})`);
      error.status = r.status;
      error.data = data;
      throw error;
    }
    return r.json();
  } catch (err) {
    if (err.name === 'TypeError') throw new Error('Sunucuya bağlanılamadı');
    throw err;
  }
}

export async function apiGetCurrentUser(token = '') {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  const r = await fetch(`${API}/auth/me`, { headers });
  if (!r.ok) {
    const data = await r.json().catch(() => ({}));
    throw new Error(data.error || `Sunucu hatası (${r.status})`);
  }
  return r.json();
}

export async function deleteAccount() {
  return safeFetch(`${API}/auth/me`, { method: 'DELETE' });
}

export async function sendHeartbeat() {
  return safeFetch(`${API}/auth/heartbeat`, { method: 'POST' });
}

export async function registerFcmToken(token, platform = 'web') {
  let language = 'tr';
  try { language = localStorage.getItem('dnd_lang') || 'tr'; } catch { /* noop */ }
  return safeFetch(`${API}/auth/fcm-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, platform, language }),
  });
}

// Push teshis raporu: token kaydinin hangi adimda kirildigini sunucuya bildirir.
// Hata firlatmaz; admin panelinde kullanici detayinda gorunur.
export async function reportPushDebug(step, detail = '') {
  try {
    await safeFetch(`${API}/auth/fcm-debug`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ step, detail: String(detail).slice(0, 300) }),
    });
  } catch { /* teshis hep sessiz */ }
}

export async function loginUser(username) {
  return safeFetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username }),
  });
}

export async function getCharacters() {
  return safeFetch(`${API}/characters`);
}

export async function createCharacter(data) {
  return safeFetch(`${API}/characters`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export async function getCharacter(id) {
  return safeFetch(`${API}/characters/${id}`);
}

export async function deleteCharacter(id) {
  return safeFetch(`${API}/characters/${id}`, { method: 'DELETE' });
}

export async function useItem(characterId, itemId) {
  return safeFetch(`${API}/characters/${characterId}/inventory/${itemId}/use`, { method: 'POST' });
}

export async function equipItem(characterId, itemId) {
  return safeFetch(`${API}/characters/${characterId}/inventory/${itemId}/equip`, { method: 'POST' });
}

export async function dropItem(characterId, itemId) {
  return safeFetch(`${API}/characters/${characterId}/inventory/${itemId}/drop`, { method: 'POST' });
}

export async function combatAttack(characterId, targetAC, sessionId) {
  return safeFetch(`${API}/game/combat/attack`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ characterId, targetAC, sessionId }),
  });
}

export async function spinWheel(characterId) {
  return safeFetch(`${API}/game/wheel-spin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ characterId }),
  });
}

export async function updateCharacterHP(id, hp, userId) {
  return safeFetch(`${API}/characters/${id}/hp`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ hp, userId }),
  });
}

export async function applyAdReward(characterId, sessionId, turnCount) {
  return safeFetch(`${API}/characters/${characterId}/reward`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, turnCount }),
  });
}

export async function claimDailyBonus(ticketId) {
  return safeFetch(`${API}/narrator/daily-bonus`, {
    method: 'POST',
    body: JSON.stringify({ ticketId }),
  });
}

export async function verifyPurchase(productId, purchaseToken, isSubscription = false) {
  return safeFetch(`${API}/premium/verify-purchase`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ productId, purchaseToken, isSubscription }),
  });
}

export async function getPremiumStatus() {
  return safeFetch(`${API}/premium/status`);
}

export async function activatePremium(days = null) {
  return safeFetch(`${API}/premium/activate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ days }),
  });
}

// Günlük hamle durumunu hak harcamadan okur
export async function getDailyStatus() {
  return safeFetch(`${API}/narrator/daily-status`);
}

// Ödüllü reklam gösterimi öncesi tek kullanımlık bilet alır
export async function startAdSession() {
  return safeFetch(`${API}/narrator/ad-start`, { method: 'POST' });
}

export async function getSessions(characterId) {
  return safeFetch(`${API}/game/sessions?characterId=${characterId}`);
}

export async function createSession(characterId, scenario, title) {
  return safeFetch(`${API}/game/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ characterId, scenario, title }),
  });
}

export async function deleteSession(sessionId) {
  return safeFetch(`${API}/game/sessions/${sessionId}`, { method: 'DELETE' });
}

export async function levelUpStat(characterId, stat) {
  return safeFetch(`${API}/characters/${characterId}/level-up-stat`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ stat }),
  });
}

export async function updateCharacterSettings(characterId, settings) {
  return safeFetch(`${API}/characters/${characterId}/settings`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  });
}

export async function finalDeathSave(characterId, sessionId) {
  return safeFetch(`${API}/narrator/final-death-save`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ characterId, sessionId }),
  });
}

export async function getFallenHeroes() {
  return safeFetch(`${API}/characters/fallen`);
}

export async function getLeaderboard() {
  return safeFetch(`${API}/leaderboard`);
}

export async function getSession(sessionId) {
  return safeFetch(`${API}/game/sessions/${sessionId}`);
}

export async function getMessages(sessionId) {
  return safeFetch(`${API}/game/sessions/${sessionId}/messages`);
}

export async function rollDice(dice, count = 1, modifier = 0) {
  return safeFetch(`${API}/game/roll`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ dice, count, modifier }),
  });
}

export async function sendChat(sessionId, characterId, message, diceResult = null, language = null) {
  const lang = language || getLang();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 35000);
  try {
    const result = await safeFetch(`${API}/narrator/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, characterId, message, diceResult, language: lang }),
      signal: controller.signal,
    });
    return result;
  } catch (err) {
    if (err.name === 'AbortError') throw new Error('Anlatıcı yanıt vermedi, tekrar dene');
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

export async function startAdventure(sessionId, characterId, scenario) {
  const lang = getLang();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 35000);
  try {
    const result = await safeFetch(`${API}/narrator/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, characterId, scenario, language: lang }),
      signal: controller.signal,
    });
    return result;
  } catch (err) {
    if (err.name === 'AbortError') throw new Error('Anlatıcı yanıt vermedi, tekrar dene');
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

export async function shopCatalog(scenario) {
  const query = scenario ? `?scenario=${encodeURIComponent(scenario)}` : '';
  return safeFetch(`${API}/shop/catalog${query}`);
}

export async function shopBuy(characterId, itemId) {
  return safeFetch(`${API}/shop/buy`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ characterId, itemId }),
  });
}

export async function verifyCosmeticPurchase(productId, purchaseToken, characterId) {
  return safeFetch(`${API}/premium/verify-cosmetic`, {
    method: 'POST',
    body: JSON.stringify({ productId, purchaseToken, characterId }),
  });
}

export async function shopCompanionActivate(characterId, itemId, slot) {
  return safeFetch(`${API}/shop/companion/activate`, {
    method: 'POST',
    body: JSON.stringify({ characterId, itemId, slot }),
  });
}

export async function shopCosmeticEquip(characterId, itemId, kind) {
  return safeFetch(`${API}/shop/cosmetic/equip`, {
    method: 'POST',
    body: JSON.stringify({ characterId, itemId, kind }),
  });
}

export async function shopSell(characterId, inventoryItemId) {
  return safeFetch(`${API}/shop/sell`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ characterId, inventoryItemId }),
  });
}

export async function getNpcs(characterId) {
  return safeFetch(`${API}/characters/${characterId}/npcs`);
}

export async function hireNpc(characterId, npcId) {
  return safeFetch(`${API}/characters/${characterId}/npcs/${npcId}/hire`, {
    method: 'POST',
  });
}

export async function dismissNpc(characterId, npcId) {
  return safeFetch(`${API}/characters/${characterId}/npcs/${npcId}/dismiss`, {
    method: 'POST',
  });
}

export async function getQuests(characterId) {
  return safeFetch(`${API}/characters/${characterId}/quests`);
}

export async function abandonQuest(characterId, questId) {
  return safeFetch(`${API}/characters/${characterId}/quests/${questId}/abandon`, {
    method: 'PATCH',
  });
}

export async function npcTalk(characterId, sessionId, npcId, topic, freeText, language = null) {
  const lang = language || getLang();
  return safeFetch(`${API}/narrator/npc-talk`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ characterId, sessionId, npcId, topic, freeText, language: lang }),
  });
}

export async function getPerks(characterId) {
  return safeFetch(`${API}/characters/${characterId}/perks`);
}

export async function unlockPerk(characterId, perkId) {
  return safeFetch(`${API}/characters/${characterId}/perks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ perkId, userId: getCurrentUserId() }),
  });
}

// ── Admin/God mode API ──
export async function adminListCharacters(filters = '') {
  const normalized = typeof filters === 'string' ? { username: filters } : filters;
  const query = new URLSearchParams(
    Object.entries(normalized || {}).filter(([, value]) => value !== '' && value !== null && value !== undefined)
  );
  const q = query.toString() ? `?${query.toString()}` : '';
  return safeFetch(`${API}/admin/characters${q}`);
}

export async function adminCheatCharacter(characterId, data) {
  return safeFetch(`${API}/admin/characters/${characterId}/cheat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export async function adminUpdateCharacter(characterId, data) {
  return safeFetch(`${API}/admin/characters/${characterId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export async function adminDeleteCharacter(characterId) {
  return safeFetch(`${API}/admin/characters/${characterId}/delete`, {
    method: 'POST',
  });
}

export async function adminListUsers() {
  return safeFetch(`${API}/admin/users`);
}

export async function adminToggleUserPremium(uid, isPremium, expiresAt = null) {
  const body = { isPremium };
  if (expiresAt) body.expiresAt = expiresAt;
  return safeFetch(`${API}/admin/users/${uid}/premium`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export async function adminListAnnouncements() {
  return safeFetch(`${API}/admin/announcements`);
}

export async function adminCreateAnnouncement(data) {
  return safeFetch(`${API}/admin/announcements`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export async function adminToggleAnnouncement(id, active) {
  return safeFetch(`${API}/admin/announcements/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ active }),
  });
}

export async function adminDeleteAnnouncement(id) {
  return safeFetch(`${API}/admin/announcements/${id}`, { method: 'DELETE' });
}

export async function adminListWorldEvents() {
  return safeFetch(`${API}/admin/world-events`);
}

export async function adminCreateWorldEvent(data) {
  return safeFetch(`${API}/admin/world-events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export async function adminToggleWorldEvent(id, active) {
  return safeFetch(`${API}/admin/world-events/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ active }),
  });
}

export async function adminDeleteWorldEvent(id) {
  return safeFetch(`${API}/admin/world-events/${id}`, { method: 'DELETE' });
}

export async function adminCheck() {
  return safeFetch(`${API}/admin/check`);
}

export async function adminGetStats() {
  return safeFetch(`${API}/admin/stats`);
}

export async function adminUpdateUserSuspension(uid, suspended, reason = '') {
  return safeFetch(`${API}/admin/users/${uid}/suspend`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ suspended, reason }),
  });
}

export async function adminSendTestPush(uid, title, body) {
  return safeFetch(`${API}/admin/users/${uid}/push-test`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, body }),
  });
}

export async function adminCleanupGuests(hours = 24) {
  return safeFetch(`${API}/admin/users/cleanup-guests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ hours }),
  });
}

export async function adminGetSettings() {
  return safeFetch(`${API}/admin/settings`);
}

export async function adminUpdateSettings(settings) {
  return safeFetch(`${API}/admin/settings`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  });
}

export async function adminListItems() {
  return safeFetch(`${API}/admin/items`);
}

export async function adminUpdateItem(id, data) {
  return safeFetch(`${API}/admin/items/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export async function adminCreateItem(data) {
  return safeFetch(`${API}/admin/items`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export async function adminListContent(type) {
  return safeFetch(`${API}/admin/content/${type}`);
}

export async function getAnnouncements() {
  return safeFetch(`${API}/announcements`);
}

export async function claimAdmin() {
  return safeFetch(`${API}/setup/admin`, { method: 'POST' });
}

export async function syncPremium() {
  return safeFetch(`${API}/premium/sync`, { method: 'POST' });
}


export async function getAchievements() {
  return safeFetch(`${API}/achievements`);
}

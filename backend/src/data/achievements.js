// ── Başarım (Achievement) Tanımları ────────────────────────────────────────
// Her başarım bir sayaç eşiğine (`stat` >= `goal`) bağlıdır. Sayaçlar
// utils/achievements.js içindeki bumpStats() ile hikaye olaylarından artar.
// `tier` sadece görsel renklendirme içindir (bronze/silver/gold/legendary).

const ACHIEVEMENTS = [
  // ── Savaş ──
  { id: 'first_blood',     stat: 'enemies_killed',   goal: 1,    tier: 'bronze',    icon: 'sword',   xp: 25,  gold: 10 },
  { id: 'slayer_10',       stat: 'enemies_killed',   goal: 10,   tier: 'silver',    icon: 'sword',   xp: 60,  gold: 25 },
  { id: 'slayer_50',       stat: 'enemies_killed',   goal: 50,   tier: 'gold',      icon: 'sword',   xp: 150, gold: 60 },
  { id: 'slayer_200',      stat: 'enemies_killed',   goal: 200,  tier: 'legendary', icon: 'sword',   xp: 400, gold: 150 },

  // ── Görevler ──
  { id: 'first_quest',     stat: 'quests_completed', goal: 1,    tier: 'bronze',    icon: 'scroll',  xp: 25,  gold: 10 },
  { id: 'quest_10',        stat: 'quests_completed', goal: 10,   tier: 'silver',    icon: 'scroll',  xp: 80,  gold: 30 },
  { id: 'quest_30',        stat: 'quests_completed', goal: 30,   tier: 'gold',      icon: 'scroll',  xp: 200, gold: 80 },

  // ── Hazine & Eşya ──
  { id: 'first_treasure',  stat: 'treasures_found',  goal: 1,    tier: 'bronze',    icon: 'chest',   xp: 20,  gold: 10 },
  { id: 'treasure_25',     stat: 'treasures_found',  goal: 25,   tier: 'silver',    icon: 'chest',   xp: 90,  gold: 40 },
  { id: 'legendary_find',  stat: 'legendary_items',  goal: 1,    tier: 'legendary', icon: 'gem',     xp: 250, gold: 100 },

  // ── Altın ──
  { id: 'gold_500',        stat: 'gold_earned',      goal: 500,  tier: 'bronze',    icon: 'coin',    xp: 40,  gold: 20 },
  { id: 'gold_2500',       stat: 'gold_earned',      goal: 2500, tier: 'silver',    icon: 'coin',    xp: 120, gold: 60 },
  { id: 'gold_10000',      stat: 'gold_earned',      goal: 10000,tier: 'gold',      icon: 'coin',    xp: 300, gold: 150 },

  // ── Kamp / Hayatta Kalma ──
  { id: 'first_camp',      stat: 'camps_rested',     goal: 1,    tier: 'bronze',    icon: 'campfire',xp: 20,  gold: 5 },
  { id: 'camp_20',         stat: 'camps_rested',     goal: 20,   tier: 'silver',    icon: 'campfire',xp: 100, gold: 40 },
  { id: 'survivor',        stat: 'near_death_saves', goal: 3,    tier: 'gold',      icon: 'heart',   xp: 150, gold: 50 },

  // ── Yoldaş & Sosyal ──
  { id: 'first_friend',    stat: 'npcs_met',         goal: 5,    tier: 'bronze',    icon: 'users',   xp: 30,  gold: 10 },
  { id: 'first_companion', stat: 'followers_gained', goal: 1,    tier: 'silver',    icon: 'users',   xp: 80,  gold: 30 },
  { id: 'warband',         stat: 'followers_gained', goal: 5,    tier: 'gold',      icon: 'users',   xp: 200, gold: 80 },

  // ── Yolculuk ──
  { id: 'storyteller_50',  stat: 'moves_played',     goal: 50,   tier: 'bronze',    icon: 'book',    xp: 40,  gold: 15 },
  { id: 'storyteller_250', stat: 'moves_played',     goal: 250,  tier: 'silver',    icon: 'book',    xp: 130, gold: 60 },
  { id: 'storyteller_1000',stat: 'moves_played',     goal: 1000, tier: 'gold',      icon: 'book',    xp: 350, gold: 180 },
  { id: 'level_5',         stat: 'max_level',        goal: 5,    tier: 'bronze',    icon: 'star',    xp: 50,  gold: 20 },
  { id: 'level_10',        stat: 'max_level',        goal: 10,   tier: 'silver',    icon: 'star',    xp: 150, gold: 70 },
  { id: 'level_20',        stat: 'max_level',        goal: 20,   tier: 'legendary', icon: 'star',    xp: 500, gold: 250 },
  { id: 'explorer',        stat: 'scenarios_played', goal: 5,    tier: 'silver',    icon: 'compass', xp: 120, gold: 50 },
  { id: 'world_walker',    stat: 'scenarios_played', goal: 13,   tier: 'legendary', icon: 'compass', xp: 400, gold: 200 },
];

const ACHIEVEMENT_MAP = Object.fromEntries(ACHIEVEMENTS.map((entry) => [entry.id, entry]));

// Takip edilen tüm sayaç isimleri (kullanıcı dokümanında `achievement_stats` altında tutulur)
const STAT_KEYS = [...new Set(ACHIEVEMENTS.map((entry) => entry.stat))];

module.exports = { ACHIEVEMENTS, ACHIEVEMENT_MAP, STAT_KEYS };

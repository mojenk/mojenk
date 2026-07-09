/**
 * Passive Skill Tree — Class-specific perk data
 *
 * Structure: SKILL_TREE[className] = [ tier1[], tier2[], tier3[] ]
 * Each perk: { id, name, desc, icon, effect }
 * effect keys: bonusDamage, bonusAC, bonusHP, bonusHeal, critChance, goldMulti, xpMulti, dodgeChance, initBonus, regenPerTurn
 *
 * Tier 1: unlocked at level 2+
 * Tier 2: unlocked at level 4+  (requires 1 tier-1 perk)
 * Tier 3: unlocked at level 7+  (requires 1 tier-2 perk)
 */

const SKILL_TREE = {
  'Savaşçı': [
    // ── Tier 1 (Level 2+) ──
    [
      { id: 'fighter_tough', name: 'Dayanıklı Zırh', desc: 'Zırh dayanıklılığı artar.', icon: 'shield', effect: { bonusAC: 1 } },
      { id: 'fighter_power', name: 'Güçlü Darbe', desc: 'Her saldırıda ekstra hasar.', icon: 'sword', effect: { bonusDamage: 2 } },
      { id: 'fighter_vitality', name: 'Savaşçı Dayanıklılığı', desc: 'Maksimum can artışı.', icon: 'heart', effect: { bonusHP: 8 } },
    ],
    // ── Tier 2 (Level 4+) ──
    [
      { id: 'fighter_crit', name: 'Ölümcül Vuruş', desc: 'Kritik isabet şansı artar.', icon: 'zap', effect: { critChance: 10 } },
      { id: 'fighter_shield', name: 'Kalkan Ustası', desc: 'Savunma gücü önemli ölçüde artar.', icon: 'shield', effect: { bonusAC: 2 } },
      { id: 'fighter_regen', name: 'İkinci Nefes', desc: 'Her turda az miktarda can yeniler.', icon: 'heart', effect: { regenPerTurn: 3 } },
    ],
    // ── Tier 3 (Level 7+) ──
    [
      { id: 'fighter_master', name: 'Savaş Ustası', desc: 'Tüm saldırılar güçlenir, savunma artar.', icon: 'crown', effect: { bonusDamage: 4, bonusAC: 1 } },
      { id: 'fighter_undying', name: 'Yıkılmaz İrade', desc: 'Ölümden kaçınma ve can artışı.', icon: 'shield', effect: { bonusHP: 15, dodgeChance: 8 } },
    ],
  ],

  'Büyücü': [
    [
      { id: 'mage_focus', name: 'Arkan Odak', desc: 'Büyü hasarı artar.', icon: 'wand', effect: { bonusDamage: 3 } },
      { id: 'mage_barrier', name: 'Mana Kalkanı', desc: 'Büyüsel koruma zırhı.', icon: 'shield', effect: { bonusAC: 1 } },
      { id: 'mage_mind', name: 'Keskin Zihin', desc: 'XP kazanımı artar.', icon: 'brain', effect: { xpMulti: 15 } },
    ],
    [
      { id: 'mage_elemental', name: 'Elementel Güç', desc: 'Büyü hasarında büyük artış.', icon: 'flame', effect: { bonusDamage: 5 } },
      { id: 'mage_drain', name: 'Yaşam Emilimi', desc: 'Verilen hasarın bir kısmı can olarak döner.', icon: 'heart', effect: { regenPerTurn: 4 } },
      { id: 'mage_agility', name: 'Hızlı Büyü', desc: 'Kaçınma ve inisiyatif artar.', icon: 'zap', effect: { dodgeChance: 8, initBonus: 2 } },
    ],
    [
      { id: 'mage_arcane', name: 'Arkan Patlama', desc: 'Devasa büyü hasarı.', icon: 'crown', effect: { bonusDamage: 7, critChance: 8 } },
      { id: 'mage_immortal', name: 'Büyü Bariyeri', desc: 'Güçlü koruma ve can artışı.', icon: 'shield', effect: { bonusAC: 2, bonusHP: 10 } },
    ],
  ],

  'Hırsız': [
    [
      { id: 'rogue_shadow', name: 'Gölge Adımı', desc: 'Kaçınma şansı artar.', icon: 'eye', effect: { dodgeChance: 8 } },
      { id: 'rogue_poison', name: 'Zehirli Bıçak', desc: 'Saldırılara zehir hasarı ekler.', icon: 'sword', effect: { bonusDamage: 3 } },
      { id: 'rogue_gold', name: 'Hazine Avcısı', desc: 'Düşmanlardan daha fazla altın düşer.', icon: 'coins', effect: { goldMulti: 30 } },
    ],
    [
      { id: 'rogue_backstab', name: 'Sırt Bıçağı', desc: 'Kritik vuruş şansı büyük artış.', icon: 'zap', effect: { critChance: 15 } },
      { id: 'rogue_evasion', name: 'Kaçış Ustası', desc: 'Zırh ve kaçınma artar.', icon: 'shield', effect: { bonusAC: 2, dodgeChance: 5 } },
      { id: 'rogue_xp', name: 'Kurnaz Zihin', desc: 'XP ve altın kazanımı artar.', icon: 'brain', effect: { xpMulti: 10, goldMulti: 15 } },
    ],
    [
      { id: 'rogue_assassin', name: 'Suikastçı', desc: 'İlk saldırı çok güçlü, yüksek kritik.', icon: 'crown', effect: { bonusDamage: 5, critChance: 10 } },
      { id: 'rogue_phantom', name: 'Hayalet', desc: 'Neredeyse vurulmaz, kaçınma ustası.', icon: 'eye', effect: { dodgeChance: 15, bonusAC: 1 } },
    ],
  ],

  'Rahip': [
    [
      { id: 'cleric_heal', name: 'İyileştirme Gücü', desc: 'İyileştirme büyüleri güçlenir.', icon: 'heart', effect: { bonusHeal: 4 } },
      { id: 'cleric_armor', name: 'İlahi Koruma', desc: 'Tanrısal zırh koruması.', icon: 'shield', effect: { bonusAC: 1 } },
      { id: 'cleric_smite', name: 'Kutsal Darbe', desc: 'Saldırılara ilahi hasar ekler.', icon: 'sword', effect: { bonusDamage: 2 } },
    ],
    [
      { id: 'cleric_regen', name: 'Yaşam Aurası', desc: 'Her turda otomatik iyileşme.', icon: 'heart', effect: { regenPerTurn: 5 } },
      { id: 'cleric_divine', name: 'İlahi Zırh', desc: 'Güçlü savunma artışı.', icon: 'shield', effect: { bonusAC: 2, bonusHP: 5 } },
      { id: 'cleric_wrath', name: 'Tanrı Gazabı', desc: 'Hasar ve iyileştirme birlikte artar.', icon: 'flame', effect: { bonusDamage: 3, bonusHeal: 3 } },
    ],
    [
      { id: 'cleric_saint', name: 'Aziz', desc: 'Muazzam iyileştirme ve koruma.', icon: 'crown', effect: { bonusHeal: 8, bonusHP: 12 } },
      { id: 'cleric_paladin', name: 'Kutsal Savaşçı', desc: 'Güçlü hasar ve zırh, saldırgan rahip.', icon: 'sword', effect: { bonusDamage: 5, bonusAC: 2 } },
    ],
  ],

  'Avcı': [
    [
      { id: 'ranger_aim', name: 'Keskin Nişancı', desc: 'Uzak mesafe hasarı artar.', icon: 'target', effect: { bonusDamage: 2 } },
      { id: 'ranger_hide', name: 'Kamuflaj', desc: 'Kaçınma şansı artar.', icon: 'eye', effect: { dodgeChance: 7 } },
      { id: 'ranger_track', name: 'İzci', desc: 'XP kazanımı artar.', icon: 'compass', effect: { xpMulti: 12 } },
    ],
    [
      { id: 'ranger_multi', name: 'Çoklu Atış', desc: 'Hasar büyük ölçüde artar.', icon: 'zap', effect: { bonusDamage: 4, critChance: 5 } },
      { id: 'ranger_nature', name: 'Doğa Bağı', desc: 'Doğa iyileşmesi ve dayanıklılık.', icon: 'heart', effect: { regenPerTurn: 3, bonusHP: 5 } },
      { id: 'ranger_trap', name: 'Tuzak Ustası', desc: 'Düşmanları yavaşlatır, kaçınma artar.', icon: 'shield', effect: { bonusAC: 1, dodgeChance: 6 } },
    ],
    [
      { id: 'ranger_eagle', name: 'Kartal Gözü', desc: 'Mükemmel isabetlilik ve kritik.', icon: 'crown', effect: { bonusDamage: 5, critChance: 12 } },
      { id: 'ranger_wild', name: 'Vahşi Ruh', desc: 'Doğayla bütünleşme, tam denge.', icon: 'heart', effect: { bonusHP: 10, regenPerTurn: 4, dodgeChance: 5 } },
    ],
  ],

  'Barbar': [
    [
      { id: 'barb_rage', name: 'Öfke Gücü', desc: 'Saldırı hasarı artar.', icon: 'flame', effect: { bonusDamage: 3 } },
      { id: 'barb_thick', name: 'Kalın Deri', desc: 'Doğal zırh koruması.', icon: 'shield', effect: { bonusAC: 1 } },
      { id: 'barb_hp', name: 'Devasa Beden', desc: 'Çok büyük can artışı.', icon: 'heart', effect: { bonusHP: 12 } },
    ],
    [
      { id: 'barb_frenzy', name: 'Çılgın Öfke', desc: 'Hasar çok büyük artış, kritik şansı.', icon: 'zap', effect: { bonusDamage: 5, critChance: 8 } },
      { id: 'barb_endure', name: 'Acıya Dayanıklılık', desc: 'Can yenileme ve ekstra HP.', icon: 'heart', effect: { regenPerTurn: 4, bonusHP: 8 } },
      { id: 'barb_fear', name: 'Korku Salma', desc: 'Düşmanların saldırı gücü düşer.', icon: 'eye', effect: { bonusAC: 2 } },
    ],
    [
      { id: 'barb_warlord', name: 'Savaş Lordu', desc: 'Muazzam hasar ve can. Durdurulamaz.', icon: 'crown', effect: { bonusDamage: 6, bonusHP: 15 } },
      { id: 'barb_immortal', name: 'Ölümsüz Öfke', desc: 'Devasa can, yenileme ve kaçınma.', icon: 'shield', effect: { bonusHP: 20, regenPerTurn: 3, dodgeChance: 5 } },
    ],
  ],
};

// Tier unlock level requirements
const TIER_LEVELS = [2, 4, 7];

// Calculate aggregate bonuses from a list of perk IDs for a given class
function calcPerkBonuses(className, perkIds) {
  const tree = SKILL_TREE[className];
  if (!tree) return {};
  const bonuses = {};
  for (const tier of tree) {
    for (const perk of tier) {
      if (perkIds.includes(perk.id)) {
        for (const [key, val] of Object.entries(perk.effect)) {
          bonuses[key] = (bonuses[key] || 0) + val;
        }
      }
    }
  }
  return bonuses;
}

// Validate whether a perk can be unlocked
function canUnlockPerk(className, perkId, level, existingPerkIds) {
  const tree = SKILL_TREE[className];
  if (!tree) return { ok: false, reason: 'Bilinmeyen sınıf.' };
  if (existingPerkIds.includes(perkId)) return { ok: false, reason: 'Bu yetenek zaten açık.' };

  for (let tierIdx = 0; tierIdx < tree.length; tierIdx++) {
    const perk = tree[tierIdx].find(p => p.id === perkId);
    if (perk) {
      // Level check
      if (level < TIER_LEVELS[tierIdx]) {
        return { ok: false, reason: `Bu yetenek için en az seviye ${TIER_LEVELS[tierIdx]} gerekli.` };
      }
      // Previous tier check (tier 2 needs at least 1 tier-1, tier 3 needs at least 1 tier-2)
      if (tierIdx > 0) {
        const prevTierPerkIds = tree[tierIdx - 1].map(p => p.id);
        const hasPrevTier = existingPerkIds.some(id => prevTierPerkIds.includes(id));
        if (!hasPrevTier) {
          return { ok: false, reason: `Önce Kademe ${tierIdx} yeteneklerinden birini açmalısın.` };
        }
      }
      return { ok: true, perk, tier: tierIdx };
    }
  }
  return { ok: false, reason: 'Bilinmeyen yetenek.' };
}

module.exports = { SKILL_TREE, TIER_LEVELS, calcPerkBonuses, canUnlockPerk };

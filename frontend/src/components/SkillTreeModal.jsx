import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getPerks, unlockPerk } from '../utils/api';
import { playMagic, playClick } from '../utils/sounds';
import {
  X, Lock, Check, Shield, Sword, Heart, Zap, Flame,
  Eye, Brain, Crown, Target, Compass, Coins, Wand2,
  Sparkles, RotateCcw, AlertTriangle,
} from 'lucide-react';

const ICON_MAP = {
  shield: Shield, sword: Sword, heart: Heart, zap: Zap, flame: Flame,
  eye: Eye, brain: Brain, crown: Crown, target: Target, compass: Compass,
  coins: Coins, wand: Wand2,
};

const TIER_COLORS = ['#c9963a', '#a78bfa', '#f59e0b'];
const TIER_LABELS = ['Kademe I', 'Kademe II', 'Kademe III'];

const EFFECT_LABELS = {
  bonusDamage: 'Hasar', bonusAC: 'Zırh', bonusHP: 'Max HP',
  bonusHeal: 'İyileştirme', critChance: 'Kritik %', goldMulti: 'Altın %',
  xpMulti: 'XP %', dodgeChance: 'Kaçınma %', initBonus: 'İnisiyatif',
  regenPerTurn: 'HP/tur',
};

export default function SkillTreeModal({ characterId, onClose, onCharacterUpdate }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [unlocking, setUnlocking] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const d = await getPerks(characterId);
      if (d && Array.isArray(d.tree)) setData(d);
      else setError('Geçersiz yanıt');
    } catch { setError('Yüklenemedi'); }
    setLoading(false);
  }, [characterId]);

  useEffect(() => { load(); }, [load]);

  const handleUnlock = async (perkId, tierIdx) => {
    if (unlocking) return;
    setUnlocking(perkId);
    setError('');
    try {
      const result = await unlockPerk(characterId, perkId);
      if (result.ok) {
        playMagic();
        if (result.character && onCharacterUpdate) onCharacterUpdate(result.character);
        await load();
      } else {
        setError(result.error || 'Yetenek açılamadı');
      }
    } catch { setError('Sunucu hatası'); }
    setUnlocking(null);
  };

  if (loading && !data) {
    return (
      <div style={overlayStyle}>
        <div style={{ textAlign: 'center' }}>
          <Sparkles size={32} color="var(--gold)" style={{ marginBottom: '0.5rem' }} />
          <div style={{ color: 'var(--gold)', fontFamily: "'Cinzel', serif" }}>Yükleniyor...</div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div style={overlayStyle}>
        <div style={{ textAlign: 'center', padding: '1rem', maxWidth: '280px' }}>
          <AlertTriangle size={28} color="#e57373" style={{ marginBottom: '0.5rem' }} />
          <div style={{ color: '#e57373', fontFamily: "'Crimson Text', serif", marginBottom: '0.75rem' }}>{error || 'Veri alınamadı'}</div>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => { playClick(); load(); }}
            style={retryButtonStyle}
          >
            <RotateCcw size={14} /> Tekrar Dene
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => { playClick(); onClose(); }}
            style={{ ...retryButtonStyle, marginTop: '0.5rem', background: 'transparent' }}
          >
            Kapat
          </motion.button>
        </div>
      </div>
    );
  }

  const { tree, unlockedIds, pendingPoints, level, tierLevels, className } = data;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={overlayStyle}
      >
        {/* Header */}
        <div style={headerStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{
              width: '2.4rem', height: '2.4rem', borderRadius: '8px',
              background: 'rgba(201,150,58,0.15)', border: '1px solid rgba(201,150,58,0.35)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Sparkles size={18} color="var(--gold)" />
            </div>
            <div>
              <h2 style={{ margin: 0, fontFamily: "'Cinzel', serif", fontSize: '1.05rem', color: 'var(--gold)', letterSpacing: '0.05em' }}>
                Yetenek Ağacı
              </h2>
              <div style={{ fontFamily: "'Crimson Text', serif", fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.1rem' }}>
                {className || 'Sınıfsız'} · Seviye {level || 1} · Kademe {pendingPoints > 0 ? 'Açık' : 'Kapalı'}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={pointsBadgeStyle}>
              <Sparkles size={13} color="var(--gold)" />
              <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.72rem', color: 'var(--gold)' }}>
                {pendingPoints || 0} Puan
              </span>
            </div>
            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={() => { playClick(); onClose(); }}
              style={iconButtonStyle}
            >
              <X size={18} />
            </motion.button>
          </div>
        </div>

        {error && (
          <div style={{ padding: '0.5rem 1rem', background: 'rgba(229,57,53,0.1)', borderBottom: '1px solid rgba(229,57,53,0.3)' }}>
            <div style={{ color: '#e57373', fontFamily: "'Crimson Text', serif", fontSize: '0.82rem', textAlign: 'center' }}>
              {error}
            </div>
          </div>
        )}

        {/* Empty state */}
        {!tree.length && (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ textAlign: 'center', color: 'var(--text-dim)', fontFamily: "'Crimson Text', serif" }}>
              Bu sınıf için yetenek ağacı bulunamadı.
            </div>
          </div>
        )}

        {/* Tree content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', WebkitOverflowScrolling: 'touch' }}>
          {tree.map((tier, tierIdx) => {
            const tierLevelReq = tierLevels[tierIdx] || 99;
            const tierUnlocked = level >= tierLevelReq;
            const prevTierHasPerk = tierIdx === 0 || (tree[tierIdx - 1] || []).some(p => unlockedIds.includes(p.id));
            const canPickFromTier = tierUnlocked && (tierIdx === 0 || prevTierHasPerk) && pendingPoints > 0;

            return (
              <section key={tierIdx} style={{ marginBottom: '1.4rem' }}>
                <div style={tierHeaderStyle(tierUnlocked, tierIdx)}>
                  <span style={tierLabelStyle(tierUnlocked, tierIdx)}>{TIER_LABELS[tierIdx]}</span>
                  <span style={tierReqStyle(tierUnlocked)}>Seviye {tierLevelReq}+</span>
                  {!tierUnlocked && <Lock size={12} color="#555" style={{ flexShrink: 0 }} />}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
                  {tier.map((perk) => {
                    const isUnlocked = unlockedIds.includes(perk.id);
                    const canPick = canPickFromTier && !isUnlocked;
                    const isUnlockingThis = unlocking === perk.id;
                    const PerkIcon = ICON_MAP[perk.icon] || Sword;
                    const color = TIER_COLORS[tierIdx];

                    return (
                      <motion.button
                        key={perk.id}
                        whileTap={canPick ? { scale: 0.97 } : {}}
                        onClick={() => { if (canPick) { playClick(); handleUnlock(perk.id, tierIdx); } }}
                        disabled={!canPick || isUnlockingThis}
                        style={perkCardStyle(isUnlocked, canPick, tierIdx)}
                      >
                        <div style={perkIconBoxStyle(isUnlocked, color)}>
                          <PerkIcon size={18} color={isUnlocked ? color : '#888'} />
                        </div>

                        <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                          <div style={{ fontFamily: "'Cinzel', serif", fontSize: '0.82rem', color: isUnlocked ? color : canPick ? 'var(--text)' : '#999', fontWeight: 600 }}>
                            {perk.name}
                          </div>
                          <div style={{ fontFamily: "'Crimson Text', serif", fontSize: '0.74rem', color: 'var(--text-dim)', marginTop: '0.1rem', lineHeight: 1.35 }}>
                            {perk.desc}
                          </div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginTop: '0.3rem' }}>
                            {Object.entries(perk.effect || {}).map(([key, val]) => (
                              <span key={key} style={effectBadgeStyle(isUnlocked, color)}>
                                +{val} {EFFECT_LABELS[key] || key}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', marginLeft: '0.3rem' }}>
                          {isUnlocked ? (
                            <div style={unlockedBadgeStyle(color)}>
                              <Check size={13} />
                            </div>
                          ) : canPick ? (
                            <motion.div
                              whileHover={{ scale: 1.05 }}
                              style={unlockButtonStyle(isUnlockingThis)}
                            >
                              {isUnlockingThis ? '...' : 'Aç'}
                            </motion.div>
                          ) : (
                            <Lock size={14} color="#555" />
                          )}
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

const overlayStyle = {
  position: 'fixed', inset: 0, zIndex: 2000,
  background: 'rgba(15,12,9,0.94)',
  backdropFilter: 'blur(6px)',
  display: 'flex', flexDirection: 'column',
  overflow: 'hidden',
};

const headerStyle = {
  padding: '0.9rem 1rem',
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  borderBottom: '1px solid rgba(201,150,58,0.2)',
  flexShrink: 0,
};

const pointsBadgeStyle = {
  display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
  padding: '0.35rem 0.65rem', borderRadius: '12px',
  background: 'rgba(201,150,58,0.12)', border: '1px solid rgba(201,150,58,0.35)',
};

const iconButtonStyle = {
  width: '2.2rem', height: '2.2rem', borderRadius: '8px',
  background: 'rgba(50,40,30,0.8)', border: '1px solid var(--border)',
  color: 'var(--text-dim)', cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
};

const retryButtonStyle = {
  display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
  padding: '0.45rem 0.9rem', borderRadius: '8px',
  background: 'rgba(201,150,58,0.15)', border: '1px solid var(--gold)',
  color: 'var(--gold)', fontFamily: "'Crimson Text', serif", fontSize: '0.8rem',
  cursor: 'pointer',
};

function tierHeaderStyle(unlocked, idx) {
  return {
    display: 'flex', alignItems: 'center', gap: '0.45rem',
    marginBottom: '0.6rem', paddingBottom: '0.35rem',
    borderBottom: `1px solid ${unlocked ? `${TIER_COLORS[idx]}30` : '#2a2520'}`,
  };
}

function tierLabelStyle(unlocked, idx) {
  return {
    fontFamily: "'Cinzel', serif", fontSize: '0.78rem',
    color: unlocked ? TIER_COLORS[idx] : '#555',
    letterSpacing: '0.06em', fontWeight: 700,
  };
}

function tierReqStyle(unlocked) {
  return {
    fontFamily: "'Crimson Text', serif", fontSize: '0.68rem',
    color: unlocked ? 'var(--text-muted)' : '#444',
    marginLeft: 'auto',
  };
}

function perkCardStyle(isUnlocked, canPick, idx) {
  const color = TIER_COLORS[idx];
  return {
    display: 'flex', alignItems: 'center', gap: '0.7rem',
    padding: '0.7rem 0.85rem',
    borderRadius: '10px',
    background: isUnlocked
      ? `linear-gradient(90deg, ${color}12, transparent)`
      : canPick
      ? 'rgba(30,25,20,0.7)'
      : 'rgba(20,18,15,0.5)',
    border: `1px solid ${isUnlocked ? `${color}60` : canPick ? 'rgba(201,150,58,0.45)' : 'rgba(255,255,255,0.06)'}`,
    opacity: !isUnlocked && !canPick ? 0.55 : 1,
    cursor: canPick ? 'pointer' : 'default',
    textAlign: 'left',
    width: '100%',
    transition: 'all 0.2s ease',
  };
}

function perkIconBoxStyle(isUnlocked, color) {
  return {
    width: '2.4rem', height: '2.4rem', minWidth: '2.4rem', borderRadius: '8px',
    background: isUnlocked ? `${color}15` : 'rgba(0,0,0,0.25)',
    border: `1px solid ${isUnlocked ? color : 'rgba(255,255,255,0.08)'}`,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  };
}

function effectBadgeStyle(isUnlocked, color) {
  return {
    fontFamily: "'Crimson Text', serif", fontSize: '0.62rem',
    color: isUnlocked ? color : '#888',
    background: isUnlocked ? `${color}10` : 'rgba(0,0,0,0.2)',
    padding: '0.12rem 0.4rem', borderRadius: '4px',
    border: `1px solid ${isUnlocked ? `${color}35` : 'rgba(255,255,255,0.06)'}`,
    whiteSpace: 'nowrap',
  };
}

function unlockedBadgeStyle(color) {
  return {
    width: '1.7rem', height: '1.7rem', borderRadius: '50%',
    background: `${color}20`, border: `1px solid ${color}`,
    color,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  };
}

function unlockButtonStyle(loading) {
  return {
    padding: '0.35rem 0.7rem', borderRadius: '6px',
    background: loading ? 'rgba(100,100,100,0.25)' : 'rgba(201,150,58,0.18)',
    border: `1px solid ${loading ? '#555' : 'var(--gold)'}`,
    color: loading ? '#888' : 'var(--gold)',
    fontFamily: "'Cinzel', serif", fontSize: '0.68rem', fontWeight: 700,
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    minWidth: '2.8rem',
  };
}

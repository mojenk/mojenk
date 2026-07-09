import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sword, BarChart3, Backpack, BookOpen, Loader2, Heart, Coins, Shield,
  FlaskConical, X, Check, Trash2,
} from 'lucide-react';
import { getCharacter, useItem, equipItem, dropItem, levelUpStat } from '../utils/api';
import { playClick, playHeal, playError, playLevelUp } from '../utils/sounds';
import Particles from '../components/Particles';
import { ClassIcon, StatIcon, ItemIcon } from '../utils/icons';

const STAT_LABELS = {
  strength: ['Güç'],
  dexterity: ['Çeviklik'],
  constitution: ['Anayasa'],
  intelligence: ['Zeka'],
  wisdom: ['Bilgelik'],
  charisma: ['Karizma'],
};

// Approximate race/class bonuses matching backend (for display only)
const RACE_BONUSES = {
  'İnsan': { strength: 1, dexterity: 1, constitution: 1, intelligence: 1, wisdom: 1, charisma: 1 },
  'Elf': { dexterity: 2, wisdom: 1 },
  'Cüce': { constitution: 2, strength: 1 },
  'Yarı-Ork': { strength: 2, constitution: 1 },
  'Hobit': { dexterity: 2, charisma: 1 },
  'İblissoyu': { charisma: 2, intelligence: 1 },
};

const CLASS_BONUSES = {
  Savaşçı: { strength: 1 },
  Büyücü: { intelligence: 1 },
  Hırsız: { dexterity: 1 },
  Rahip: { wisdom: 1 },
  Avcı: { dexterity: 1 },
  Barbar: { strength: 1 },
};

const TABS = [
  { key: 'stats', label: 'Özellikler', icon: BarChart3 },
  { key: 'inventory', label: 'Envanter', icon: Backpack },
  { key: 'background', label: 'Geçmiş', icon: BookOpen },
];

export default function CharacterSheetPage({ user }) {
  const { characterId } = useParams();
  const navigate = useNavigate();
  const [character, setCharacter] = useState(null);
  const [inventory, setInventory] = useState([]);
  const [tab, setTab] = useState('stats');
  const [itemMsg, setItemMsg] = useState('');
  const [statSelectOpen, setStatSelectOpen] = useState(false);
  const [statError, setStatError] = useState('');
  const TAB_KEYS = TABS.map((t) => t.key);
  const touchStartX = useRef(null);

  const handleTouchStart = (e) => { touchStartX.current = e.touches[0].clientX; };
  const handleTouchEnd = (e) => {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      const idx = TAB_KEYS.indexOf(tab);
      if (diff > 0 && idx < TAB_KEYS.length - 1) { playClick(); setTab(TAB_KEYS[idx + 1]); }
      else if (diff < 0 && idx > 0) { playClick(); setTab(TAB_KEYS[idx - 1]); }
    }
    touchStartX.current = null;
  };

  useEffect(() => {
    getCharacter(characterId).then((d) => {
      setCharacter(d.character);
      setInventory(d.inventory || []);
      if (d.character?.pending_stat_point > 0) {
        setStatSelectOpen(true);
      }
    });
  }, [characterId]);

  const handleStatSelect = async (statKey) => {
    try {
      setStatError('');
      const data = await levelUpStat(characterId, statKey);
      setCharacter(data.character);
      setStatSelectOpen(false);
      playLevelUp();
    } catch (err) {
      setStatError(err.message || 'Stat artışı uygulanamadı');
      playError();
    }
  };

  const handleUse = async (itemId) => {
    try {
      const data = await useItem(characterId, itemId);
      if (data.character) setCharacter(data.character);
      if (data.inventory) setInventory(data.inventory);
      if (data.message) { setItemMsg(data.message); playHeal(); setTimeout(() => setItemMsg(''), 2500); }
    } catch (err) { playError(); setItemMsg(err.message); setTimeout(() => setItemMsg(''), 2000); }
  };
  const handleEquip = async (itemId) => {
    try {
      playClick();
      const data = await equipItem(characterId, itemId);
      if (data.character) setCharacter(data.character);
      if (data.inventory) setInventory(data.inventory);
    } catch (err) { playError(); }
  };
  const handleDrop = async (itemId) => {
    try {
      playClick();
      const data = await dropItem(characterId, itemId);
      if (data.character) setCharacter(data.character);
      if (data.inventory) setInventory(data.inventory);
    } catch (err) { playError(); }
  };

  if (!character) {
    return (
      <div
        className="stone-bg"
        style={{
          minHeight: '100dvh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: '1rem',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'center', animation: 'spin 1.5s linear infinite' }}>
          <Loader2 size={48} />
        </div>
        <p
          style={{
            color: 'var(--text-dim)',
            fontFamily: "'Crimson Text', serif",
          }}
        >
          Yükleniyor...
        </p>
      </div>
    );
  }

  const hpPct = Math.max(0, Math.min(100, (character.hp / character.max_hp) * 100));
  const modifier = (v) => Math.floor((v - 10) / 2);
  const modStr = (v) => `${modifier(v) >= 0 ? '+' : ''}${modifier(v)}`;
  const ClassIconComp = ClassIcon[character.class] || Sword;

  return (
    <div
      className="stone-bg"
      style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}
    >
      <Particles type="dust" count={8} />
      <div
        style={{
          padding: '1.1rem 1rem 0.85rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          flexShrink: 0,
          borderBottom: '1px solid var(--border)',
        }}
        className="pt-safe"
      >
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={() => navigate(-1)}
          className="btn-dark"
          style={{ padding: '0.5rem 0.75rem', fontSize: '1rem', flexShrink: 0 }}
        >
          ←
        </motion.button>
        <h1
          className="font-fantasy gold-text"
          style={{ fontSize: '1.15rem', margin: 0, letterSpacing: '0.08em' }}
        >
          Karakter Sayfası
        </h1>
      </div>

      {/* Scrollable content */}
      <div
        style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Top character card */}
        <div
          className="stone-card"
          style={{ padding: '1.1rem', marginBottom: '1rem' }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
            {/* Race portrait */}
            <div
              style={{
                width: '4.5rem',
                height: '4.5rem',
                borderRadius: '12px',
                overflow: 'hidden',
                flexShrink: 0,
                border: '1px solid rgba(92,74,42,0.7)',
                background: 'rgba(0,0,0,0.5)',
                boxShadow: '0 2px 12px rgba(0,0,0,0.5)',
              }}
            >
              <img
                src={{
                  'İnsan': '/races/insan.svg',
                  'Elf': '/races/elf.svg',
                  'Cüce': '/races/cuce.svg',
                  'Yarı-Ork': '/races/yariork.svg',
                  'Hobit': '/races/hobit.svg',
                  'İblissoyu': '/races/iblissoyu.svg',
                }[character.race] || '/races/insan.svg'}
                alt={character.race}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <h2
                className="font-fantasy gold-text"
                style={{ fontSize: '1.4rem', margin: 0, lineHeight: 1.1 }}
              >
                {character.name}
              </h2>
              <p
                style={{
                  color: 'var(--text-dim)',
                  fontFamily: "'Crimson Text', serif",
                  fontSize: '0.9rem',
                  margin: '0.2rem 0 0',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                }}
              >
                <ClassIconComp size={15} />
                {character.race} · {character.class}
              </p>
              <p
                style={{
                  color: 'var(--gold)',
                  fontFamily: "'Cinzel', serif",
                  fontSize: '0.72rem',
                  margin: '0.2rem 0 0',
                  letterSpacing: '0.06em',
                }}
              >
                Seviye {character.level} · {character.experience ?? 0} XP
                {character.pending_stat_point > 0 && (
                  <span
                    style={{
                      color: 'var(--gold2)',
                      marginLeft: '0.5rem',
                      fontSize: '0.65rem',
                      background: 'rgba(201,150,58,0.2)',
                      padding: '0.05rem 0.35rem',
                      borderRadius: '20px',
                    }}
                  >
                    +1 Puan
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* HP bar */}
          <div style={{ marginTop: '0.9rem' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: '0.3rem',
              }}
            >
              <span
                style={{
                  color: 'var(--blood)',
                  fontFamily: "'Crimson Text', serif",
                  fontSize: '0.82rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                }}
              >
                <Heart size={16} /> Can Puanı
              </span>
              <span
                style={{
                  color: 'var(--text)',
                  fontFamily: "'Crimson Text', serif",
                  fontSize: '0.82rem',
                }}
              >
                {character.hp} / {character.max_hp}
              </span>
            </div>
            <div
              style={{
                background: 'rgba(0,0,0,0.45)',
                borderRadius: '99px',
                height: '8px',
                overflow: 'hidden',
              }}
            >
              <div
                className="hp-bar"
                style={{ width: `${hpPct}%`, height: '100%', borderRadius: '99px' }}
              />
            </div>
          </div>

          {/* Gold + AC */}
          <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.85rem' }}>
            <div>
              <div style={{ color: 'var(--gold)', fontFamily: "'Crimson Text', serif", fontSize: '0.95rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                <Coins size={16} /> {character.gold}
              </div>
              <div style={{ color: 'var(--text-dim)', fontFamily: "'Cinzel', serif", fontSize: '0.6rem', letterSpacing: '0.06em' }}>
                ALTIN
              </div>
            </div>
            <div>
              <div style={{ color: 'var(--text)', fontFamily: "'Crimson Text', serif", fontSize: '0.95rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                <Shield size={16} /> {character.armor_class || 10}
              </div>
              <div style={{ color: 'var(--text-dim)', fontFamily: "'Cinzel', serif", fontSize: '0.6rem', letterSpacing: '0.06em' }}>
                ZIRH SINIFI
              </div>
            </div>
          </div>
        </div>

        {/* Tab bar */}
        <div
          style={{
            display: 'flex',
            gap: '0.5rem',
            marginBottom: '0.85rem',
          }}
        >
          {TABS.map((t) => {
            const TabIcon = t.icon;
            return (
              <motion.button
                key={t.key}
                whileTap={{ scale: 0.96 }}
                onClick={() => { playClick(); setTab(t.key); }}
                className={tab === t.key ? 'btn-gold' : 'btn-dark'}
                style={{
                  flex: 1,
                  fontSize: '0.75rem',
                  padding: '0.5rem 0.25rem',
                  letterSpacing: '0.03em',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.35rem',
                }}
              >
                <TabIcon size={15} /> {t.label}
              </motion.button>
            );
          })}
        </div>

        {/* Tab content */}
        <AnimatePresence mode="wait">
          {/* STATS TAB */}
          {tab === 'stats' && (
            <motion.div
              key="stats"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '0.65rem',
              }}
            >
              {Object.entries(STAT_LABELS).map(([key, [label]]) => {
                const val = character[key] ?? 10;
                const raceBonus = (RACE_BONUSES[character.race] || {})[key] || 0;
                const classBonus = (CLASS_BONUSES[character.class] || {})[key] || 0;
                const totalBonus = raceBonus + classBonus;
                const StatIconComp = StatIcon[key] || Sword;
                return (
                  <div
                    key={key}
                    className="stone-card"
                    style={{ padding: '0.85rem', textAlign: 'center', position: 'relative' }}
                  >
                    {totalBonus > 0 && (
                      <span
                        style={{
                          position: 'absolute',
                          top: '0.35rem',
                          right: '0.35rem',
                          background: 'rgba(201,150,58,0.2)',
                          color: 'var(--gold2)',
                          fontFamily: "'Cinzel', serif",
                          fontSize: '0.55rem',
                          padding: '0.05rem 0.3rem',
                          borderRadius: '20px',
                          letterSpacing: '0.03em',
                        }}
                      >
                        +{totalBonus}
                      </span>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.25rem' }}>
                      <StatIconComp size={26} />
                    </div>
                    <div
                      className="font-fantasy gold-text"
                      style={{ fontSize: '1.8rem', lineHeight: 1 }}
                    >
                      {val}
                    </div>
                    <div
                      style={{
                        color:
                          modifier(val) >= 0 ? 'var(--gold2)' : 'var(--blood)',
                        fontFamily: "'Crimson Text', serif",
                        fontSize: '0.85rem',
                        marginTop: '0.1rem',
                      }}
                    >
                      {modStr(val)}
                    </div>
                    <div
                      style={{
                        color: 'var(--text-dim)',
                        fontFamily: "'Cinzel', serif",
                        fontSize: '0.6rem',
                        letterSpacing: '0.07em',
                        marginTop: '0.2rem',
                        textTransform: 'uppercase',
                      }}
                    >
                      {label}
                    </div>
                  </div>
                );
              })}
            </motion.div>
          )}

          {/* INVENTORY TAB */}
          {tab === 'inventory' && (
            <motion.div
              key="inventory"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {/* Item message toast */}
              {itemMsg && (
                <div style={{
                  padding: '0.45rem 0.7rem',
                  marginBottom: '0.6rem',
                  borderRadius: '8px',
                  background: 'rgba(74,222,128,0.12)',
                  border: '1px solid rgba(74,222,128,0.3)',
                  color: '#4ade80',
                  fontFamily: "'Crimson Text', serif",
                  fontSize: '0.88rem',
                  textAlign: 'center',
                }}>
                  {itemMsg}
                </div>
              )}

              {inventory.length === 0 ? (
                <div
                  style={{
                    textAlign: 'center',
                    padding: '3.5rem 1rem',
                    color: 'var(--text-dim)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.75rem' }}>
                    <Backpack size={44} />
                  </div>
                  <p style={{ fontFamily: "'Crimson Text', serif", fontSize: '1rem' }}>
                    Envanterin boş
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
                  {inventory.map((item, i) => {
                    const canUse = item.type === 'potion';
                    const canEquip = ['weapon', 'armor'].includes(item.type);
                    const ItemIconComp = ItemIcon[item.type] || ItemIcon.misc;
                    return (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, x: -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="stone-card"
                        style={{
                          padding: '0.75rem 0.9rem',
                          border: item.equipped ? '1px solid rgba(201,150,58,0.45)' : undefined,
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div style={{ flexShrink: 0, display: 'flex' }}>
                            <ItemIconComp size={22} />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                              <span
                                className="gold-text"
                                style={{
                                  fontFamily: "'Cinzel', serif",
                                  fontSize: '0.85rem',
                                  fontWeight: 700,
                                }}
                              >
                                {item.name}
                              </span>
                              {item.quantity > 1 && (
                                <span style={{ color: 'var(--text-dim)', fontFamily: "'Crimson Text', serif", fontSize: '0.8rem' }}>
                                  ×{item.quantity}
                                </span>
                              )}
                              {item.equipped ? (
                                <span
                                  style={{
                                    background: 'rgba(201,150,58,0.18)',
                                    border: '1px solid var(--border)',
                                    color: 'var(--gold)',
                                    fontFamily: "'Cinzel', serif",
                                    fontSize: '0.55rem',
                                    padding: '0.1rem 0.4rem',
                                    borderRadius: '20px',
                                    letterSpacing: '0.05em',
                                  }}
                                >
                                  Kuşanılmış
                                </span>
                              ) : null}
                            </div>
                            {item.description && (
                              <div
                                style={{
                                  color: 'var(--text-dim)',
                                  fontFamily: "'Crimson Text', serif",
                                  fontSize: '0.8rem',
                                  marginTop: '0.1rem',
                                }}
                              >
                                {item.description}
                              </div>
                            )}
                          </div>
                        </div>
                        {/* Action buttons */}
                        <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.6rem', justifyContent: 'flex-end' }}>
                          {canUse && (
                            <motion.button
                              whileTap={{ scale: 0.96 }}
                              onClick={() => handleUse(item.id)}
                              style={{
                                background: 'rgba(74,222,128,0.12)',
                                border: '1px solid rgba(74,222,128,0.4)',
                                color: '#4ade80',
                                borderRadius: '6px',
                                fontSize: '0.72rem',
                                padding: '0.3rem 0.65rem',
                                cursor: 'pointer',
                                fontFamily: "'Cinzel', serif",
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.3rem',
                              }}
                            >
                              <FlaskConical size={14} /> Kullan
                            </motion.button>
                          )}
                          {canEquip && (
                            <motion.button
                              whileTap={{ scale: 0.96 }}
                              onClick={() => handleEquip(item.id)}
                              style={{
                                background: item.equipped ? 'rgba(122,21,21,0.12)' : 'rgba(201,150,58,0.1)',
                                border: `1px solid ${item.equipped ? 'rgba(122,21,21,0.4)' : 'rgba(201,150,58,0.4)'}`,
                                color: item.equipped ? 'var(--blood)' : 'var(--gold)',
                                borderRadius: '6px',
                                fontSize: '0.72rem',
                                padding: '0.3rem 0.65rem',
                                cursor: 'pointer',
                                fontFamily: "'Cinzel', serif",
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.3rem',
                              }}
                            >
                              {item.equipped ? (
                                <><X size={14} /> Çıkar</>
                              ) : (
                                <><Check size={14} /> Kuşan</>
                              )}
                            </motion.button>
                          )}
                          <motion.button
                            whileTap={{ scale: 0.96 }}
                            onClick={() => handleDrop(item.id)}
                            style={{
                              background: 'rgba(92,74,42,0.1)',
                              border: '1px solid rgba(92,74,42,0.3)',
                              color: 'var(--text-dim)',
                              borderRadius: '6px',
                              fontSize: '0.72rem',
                              padding: '0.3rem 0.55rem',
                              cursor: 'pointer',
                              fontFamily: "'Cinzel', serif",
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.3rem',
                            }}
                          >
                            <Trash2 size={14} /> At
                          </motion.button>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}

          {/* BACKGROUND TAB */}
          {tab === 'background' && (
            <motion.div
              key="background"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <div className="stone-card" style={{ padding: '1.1rem' }}>
                <h3
                  className="font-fantasy gold-text"
                  style={{
                    fontSize: '1rem',
                    margin: '0 0 0.75rem',
                    letterSpacing: '0.07em',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                  }}
                >
                  <BookOpen size={16} /> Geçmiş Hikayesi
                </h3>
                <div className="rune-divider" style={{ marginBottom: '0.85rem' }} />
                <p
                  style={{
                    fontFamily: "'Crimson Text', serif",
                    fontSize: '1rem',
                    lineHeight: 1.65,
                    color: 'var(--text)',
                    fontStyle: 'italic',
                    margin: 0,
                  }}
                >
                  {character.background ||
                    `${character.name}, ${character.race} ırkından bir ${character.class}. Kader onu büyük maceralara doğru çekiyor. Geçmişi karanlık, geleceği belirsiz — ama yüreği cesur.`}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bottom padding */}
        <div style={{ height: '1.5rem' }} />
      </div>

      {/* ── STAT SELECT MODAL ── */}
      <AnimatePresence>
        {statSelectOpen && character && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 101,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(0,0,0,0.85)',
              padding: '1rem',
            }}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="stone-card"
              style={{
                maxWidth: '360px',
                width: '100%',
                padding: '1.25rem',
                textAlign: 'center',
                border: '1px solid var(--gold)',
                boxShadow: '0 0 30px rgba(201,150,58,0.25)',
              }}
            >
              <h2
                className="font-fantasy gold-shimmer"
                style={{ fontSize: '1.4rem', marginBottom: '0.4rem' }}
              >
                Güçlenme Zamanı
              </h2>
              <p
                style={{
                  color: 'var(--text-dim)',
                  fontFamily: "'Crimson Text', serif",
                  fontSize: '0.85rem',
                  marginBottom: '1rem',
                }}
              >
                Seviye {character.level} oldun. Bir özelliğini geliştir.
              </p>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '0.55rem',
                }}
              >
                {Object.entries(STAT_LABELS).map(([key, [label]]) => {
                  const current = character[key] ?? 10;
                  const disabled = current >= 20;
                  const StatIconComp = StatIcon[key] || Sword;
                  return (
                    <motion.button
                      key={key}
                      whileTap={disabled ? {} : { scale: 0.96 }}
                      onClick={() => !disabled && handleStatSelect(key)}
                      disabled={disabled}
                      className="btn-secondary"
                      style={{
                        padding: '0.65rem 0.3rem',
                        opacity: disabled ? 0.4 : 1,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '0.2rem',
                        fontFamily: "'Cinzel', serif",
                        fontSize: '0.75rem',
                      }}
                    >
                      <StatIconComp size={19} />
                      <span>{label}</span>
                      <span style={{ color: 'var(--gold2)', fontSize: '0.9rem' }}>
                        {current} → {disabled ? current : current + 1}
                      </span>
                    </motion.button>
                  );
                })}
              </div>
              {statError && (
                <p style={{ color: 'var(--blood)', fontSize: '0.8rem', marginTop: '0.6rem' }}>
                  {statError}
                </p>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

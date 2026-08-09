import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { createSession } from '../utils/api';
import { useLang, t } from '../utils/i18n';
import { playClick, playMagic } from '../utils/sounds';
import Particles from '../components/Particles';
import {
  Landmark,
  TreePine,
  Beer,
  Building2,
  Flame,
  Sparkles,
  Check,
  AlertTriangle,
  Hourglass,
  Dices,
  Mountain,
  Ship,
  Tent,
  BookOpen,
  Ghost,
  Rocket,
  Crosshair,
  Sword,
} from 'lucide-react';

// Scenarios are built dynamically via t() in the component
const SCENARIO_DEFS = [
  {
    id: 'dungeon',
    icon: Landmark,
    nameKey: 'scenario_dungeon_name', descKey: 'scenario_dungeon_desc', tagKey: 'scenario_dungeon_tag',
    tagColor: '#9ca3af',
  },
  {
    id: 'forest',
    icon: TreePine,
    nameKey: 'scenario_forest_name', descKey: 'scenario_forest_desc', tagKey: 'scenario_forest_tag',
    tagColor: '#34d399',
  },
  {
    id: 'tavern',
    icon: Beer,
    nameKey: 'scenario_tavern_name', descKey: 'scenario_tavern_desc', tagKey: 'scenario_tavern_tag',
    tagColor: '#fbbf24',
  },
  {
    id: 'city',
    icon: Building2,
    nameKey: 'scenario_city_name', descKey: 'scenario_city_desc', tagKey: 'scenario_city_tag',
    tagColor: '#f87171',
  },
  {
    id: 'dragon',
    icon: Flame,
    nameKey: 'scenario_dragon_name', descKey: 'scenario_dragon_desc', tagKey: 'scenario_dragon_tag',
    tagColor: '#f97316',
  },
  {
    id: 'mountain',
    icon: Mountain,
    nameKey: 'scenario_mountain_name', descKey: 'scenario_mountain_desc', tagKey: 'scenario_mountain_tag',
    tagColor: '#60a5fa',
  },
  {
    id: 'sea',
    icon: Ship,
    nameKey: 'scenario_sea_name', descKey: 'scenario_sea_desc', tagKey: 'scenario_sea_tag',
    tagColor: '#22d3ee',
  },
  {
    id: 'caravan',
    icon: Tent,
    nameKey: 'scenario_caravan_name', descKey: 'scenario_caravan_desc', tagKey: 'scenario_caravan_tag',
    tagColor: '#d4d4d8',
  },
  {
    id: 'realistic',
    icon: BookOpen,
    nameKey: 'scenario_realistic_name', descKey: 'scenario_realistic_desc', tagKey: 'scenario_realistic_tag',
    tagColor: '#a8a29e',
  },
  {
    id: 'horror',
    icon: Ghost,
    nameKey: 'scenario_horror_name', descKey: 'scenario_horror_desc', tagKey: 'scenario_horror_tag',
    tagColor: '#7c3aed',
  },
  {
    id: 'scifi',
    icon: Rocket,
    nameKey: 'scenario_scifi_name', descKey: 'scenario_scifi_desc', tagKey: 'scenario_scifi_tag',
    tagColor: '#38bdf8',
  },
  {
    id: 'western',
    icon: Crosshair,
    nameKey: 'scenario_western_name', descKey: 'scenario_western_desc', tagKey: 'scenario_western_tag',
    tagColor: '#ca8a04',
  },
  {
    id: 'custom',
    icon: Sparkles,
    nameKey: 'scenario_custom_name', descKey: 'scenario_custom_desc', tagKey: 'scenario_custom_tag',
    tagColor: '#c084fc',
  },
];

export default function ScenarioPage({ user }) {
  const { characterId } = useParams();
  const navigate = useNavigate();
  const [selected, setSelected] = useState('');
  useLang();
  const SCENARIOS = SCENARIO_DEFS.map(s => ({ ...s, name: t(s.nameKey), desc: t(s.descKey), tag: t(s.tagKey), image: `/scenarios/${s.id}.png` }));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleStart = async (scenarioId) => {
    const id = scenarioId || selected;
    if (!id) return;
    setLoading(true);
    try {
      const scenario = SCENARIOS.find((s) => s.id === id);
      const data = await createSession(characterId, id, scenario.name);
      if (data.sessionId) {
        navigate(
          `/game/${data.sessionId}?characterId=${characterId}&scenario=${id}`
        );
      }
    } catch (err) {
      setError(err.message || t('scenario_fail'));
    }
    setLoading(false);
  };

  return (
    <div
      className="stone-bg screen-full"
      style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
    >
      <Particles type="magic" count={10} />
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
          onClick={() => navigate('/')}
          className="btn-dark"
          style={{ padding: '0.5rem 0.75rem', fontSize: '1rem', flexShrink: 0 }}
        >
          ←
        </motion.button>
        <div>
          <h1
            className="font-fantasy gold-text"
            style={{ fontSize: '1.2rem', margin: 0, letterSpacing: '0.08em' }}
          >
            {t('scenario_page_title') || 'Macera Seç'}
          </h1>
          <p
            style={{
              color: 'var(--text-dim)',
              fontFamily: "'Crimson Text', serif",
              fontSize: '0.8rem',
              margin: 0,
            }}
          >
            {t('scenario_page_sub') || 'Kaderinin hangi yolda şekillenecek?'}
          </p>
        </div>
      </div>

      {/* Scenario list */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
        }}
      >
        {SCENARIOS.map((s, i) => {
          const Icon = s.icon;
          const isSelected = selected === s.id;
          return (
            <motion.div
              key={s.id}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={() => { playClick(); setSelected(s.id); }}
                className={`select-card scenario-card${isSelected ? ' active' : ''}`}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: 0,
                  overflow: 'hidden',
                  display: 'block',
                  minHeight: 'auto',
                  position: 'relative',
                }}
              >
                {/* Image area */}
                <div
                  style={{
                    width: '100%',
                    height: '10rem',
                    position: 'relative',
                    overflow: 'hidden',
                    borderBottom: '1px solid rgba(74,59,34,0.5)',
                  }}
                >
                  <img
                    src={s.image}
                    alt={s.name}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      display: 'block',
                      filter: isSelected ? 'brightness(0.65)' : 'brightness(0.8)',
                      transition: 'filter 0.2s ease',
                    }}
                  />
                  {/* Gradient overlay */}
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'linear-gradient(to bottom, rgba(10,8,6,0.2) 0%, rgba(10,8,6,0.55) 70%, rgba(10,8,6,0.95) 100%)',
                      pointerEvents: 'none',
                    }}
                  />

                  {/* Selected check */}
                  {isSelected && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="scenario-check"
                      style={{
                        position: 'absolute',
                        top: '0.6rem',
                        left: '0.6rem',
                        width: '1.8rem',
                        height: '1.8rem',
                        borderRadius: '50%',
                        background: 'var(--gold2)',
                        color: '#0a0806',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 0 12px rgba(212,160,58,0.5)',
                      }}
                    >
                      <Check size={18} strokeWidth={3} />
                    </motion.div>
                  )}

                  {/* Tag */}
                  <span
                    style={{
                      position: 'absolute',
                      top: '0.6rem',
                      right: '0.6rem',
                      fontSize: '0.6rem',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      padding: '0.25rem 0.55rem',
                      borderRadius: '999px',
                      color: '#fff',
                      background: s.tagColor,
                      boxShadow: '0 0 8px ' + s.tagColor + '66',
                      fontFamily: "system-ui, sans-serif",
                      lineHeight: 1,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {s.tag}
                  </span>

                  {/* Icon + name on image */}
                  <div
                    style={{
                      position: 'absolute',
                      bottom: '0.6rem',
                      left: '0.85rem',
                      right: '0.85rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.45rem',
                    }}
                  >
                    <Icon
                      size={18}
                      color="var(--gold2)"
                      style={{ flexShrink: 0, filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.8))' }}
                    />
                    <span
                      className="font-fantasy"
                      style={{
                        color: '#fff',
                        fontSize: '1.05rem',
                        fontWeight: 700,
                        lineHeight: 1.2,
                        textShadow: '0 1px 6px rgba(0,0,0,0.9)',
                        overflowWrap: 'break-word',
                        wordBreak: 'break-word',
                      }}
                    >
                      {s.name}
                    </span>
                  </div>
                </div>

                {/* Text area */}
                <div
                  style={{
                    padding: '0.75rem 0.85rem 0.9rem',
                    background: isSelected
                      ? 'linear-gradient(135deg, rgba(44,32,16,0.95), rgba(22,16,8,0.98))'
                      : 'linear-gradient(135deg, rgba(24,18,12,0.95), rgba(12,9,6,0.98))',
                  }}
                >
                  <p
                    style={{
                      color: 'var(--text-dim)',
                      fontFamily: "'Crimson Text', serif",
                      fontSize: '0.85rem',
                      lineHeight: 1.4,
                      margin: 0,
                      overflowWrap: 'break-word',
                      wordBreak: 'break-word',
                    }}
                  >
                    {s.desc}
                  </p>
                </div>
              </motion.button>

              {/* Inline start button when selected */}
              <AnimatePresence>
                {isSelected && (
                  <motion.div
                    initial={{ opacity: 0, height: 0, marginTop: 0 }}
                    animate={{ opacity: 1, height: 'auto', marginTop: '0.65rem' }}
                    exit={{ opacity: 0, height: 0, marginTop: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <motion.button
                      whileTap={{ scale: 0.96 }}
                      disabled={loading}
                      onClick={() => { playMagic(); handleStart(s.id); }}
                      className="btn-gold"
                      style={{
                        width: '100%',
                        fontSize: '0.95rem',
                        padding: '0.75rem',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.35rem',
                        opacity: loading ? 0.6 : 1,
                      }}
                    >
                      {loading ? (
                        <><Hourglass size={16} /> {t('scenario_starting')}</>
                      ) : (
                        <><Dices size={16} /> {t('scenario_start') || 'Macerayı Başlat'}</>
                      )}
                    </motion.button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}

        {/* Bottom spacing for scroll */}
        <div style={{ height: '0.5rem', flexShrink: 0 }} />
      </div>

      {/* Fixed bottom area only for error */}
      <div
        style={{
          padding: '0 1rem 1rem',
          flexShrink: 0,
        }}
        className="pb-safe"
      >
        {error && (
          <div style={{
            padding: '0.5rem 0.75rem',
            borderRadius: '8px',
            background: 'rgba(122,21,21,0.15)',
            border: '1px solid rgba(122,21,21,0.4)',
            color: 'var(--blood)',
            fontFamily: "'Crimson Text', serif",
            fontSize: '0.85rem',
            textAlign: 'center',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.35rem',
            width: '100%',
          }}>
            <AlertTriangle size={15} /> {error}
          </div>
        )}
      </div>
    </div>
  );
}

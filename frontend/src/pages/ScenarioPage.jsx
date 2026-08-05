import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
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

  const handleStart = async () => {
    if (!selected) return;
    setLoading(true);
    try {
      const scenario = SCENARIOS.find((s) => s.id === selected);
      const data = await createSession(characterId, selected, scenario.name);
      if (data.sessionId) {
        navigate(
          `/game/${data.sessionId}?characterId=${characterId}&scenario=${selected}`
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
            Senaryo Seç
          </h1>
          <p
            style={{
              color: 'var(--text-dim)',
              fontFamily: "'Crimson Text', serif",
              fontSize: '0.8rem',
              margin: 0,
            }}
          >
            Maceranı belirle
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
          gap: '0.75rem',
        }}
      >
        {SCENARIOS.map((s, i) => {
          const Icon = s.icon;
          return (
            <motion.button
              key={s.id}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => { playClick(); setSelected(s.id); }}
              className={`select-card${selected === s.id ? ' active' : ''}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.85rem',
                width: '100%',
                textAlign: 'left',
                padding: '0.75rem',
                overflow: 'hidden',
                minHeight: '5.5rem',
              }}
            >
              <div
                style={{
                  width: '4rem',
                  height: '4rem',
                  borderRadius: '10px',
                  flexShrink: 0,
                  position: 'relative',
                  overflow: 'hidden',
                  border: '1px solid rgba(139,106,20,0.35)',
                  boxShadow: selected === s.id ? '0 0 12px rgba(201,150,58,0.35)' : 'none',
                }}
              >
                <img
                  src={s.image}
                  alt={s.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
                {selected === s.id && (
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'rgba(10,8,6,0.55)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--gold2)',
                    }}
                  >
                    <Check size={22} />
                  </div>
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.4rem',
                    marginBottom: '0.25rem',
                  }}
                >
                <Icon
                    size={15}
                    color={selected === s.id ? 'var(--gold2)' : 'var(--text-dim)'}
                    style={{ flexShrink: 0, marginTop: '0.15rem' }}
                  />
                  <span
                    className="font-fantasy"
                    style={{
                      color: selected === s.id ? 'var(--gold2)' : '#fff',
                      fontSize: '0.95rem',
                      fontWeight: 700,
                      lineHeight: 1.2,
                      textShadow: '0 1px 4px rgba(0,0,0,0.8)',
                      overflowWrap: 'break-word',
                      wordBreak: 'break-word',
                      minWidth: 0,
                    }}
                  >
                    {s.name}
                  </span>
                </div>
                <div
                  style={{
                    color: 'var(--text-dim)',
                    fontFamily: "'Crimson Text', serif",
                    fontSize: '0.8rem',
                    lineHeight: 1.35,
                    marginBottom: '0.4rem',
                    overflowWrap: 'break-word',
                    wordBreak: 'break-word',
                  }}
                >
                  {s.desc}
                </div>
                <span
                  style={{
                    display: 'inline-block',
                    fontSize: '0.55rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    padding: '0.15rem 0.45rem',
                    borderRadius: '999px',
                    color: '#fff',
                    background: s.tagColor,
                    boxShadow: '0 0 6px ' + s.tagColor + '66',
                    fontFamily: "system-ui, sans-serif",
                    lineHeight: 1.4,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {s.tag}
                </span>
              </div>
              <Sword
                size={16}
                style={{
                  color: selected === s.id ? 'var(--gold2)' : 'var(--text-dim)',
                  opacity: selected === s.id ? 1 : 0.4,
                  flexShrink: 0,
                }}
              />
            </motion.button>
          );
        })}
      </div>

      {/* Bottom button */}
      <div
        style={{
          padding: '1rem',
          flexShrink: 0,
          borderTop: '1px solid var(--border)',
          background: 'rgba(26,21,16,0.9)',
        }}
        className="pb-safe"
      >
        {error && (
          <div style={{
            padding: '0.5rem 0.75rem',
            marginBottom: '0.5rem',
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
        <motion.button
          whileTap={{ scale: 0.96 }}
          disabled={!selected || loading}
          onClick={() => { playMagic(); handleStart(); }}
          className="btn-gold"
          style={{
            width: '100%',
            fontSize: '1rem',
            padding: '0.85rem',
            opacity: !selected || loading ? 0.45 : 1,
            cursor: !selected || loading ? 'not-allowed' : 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.35rem',
          }}
        >
          {loading ? (
            <><Hourglass size={16} /> {t('scenario_starting')}</>
          ) : (
            <><Dices size={16} /> {t('scenario_start')}</>
          )}
        </motion.button>
      </div>
    </div>
  );
}

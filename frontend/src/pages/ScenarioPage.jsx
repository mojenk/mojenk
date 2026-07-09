import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { createSession } from '../utils/api';
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
} from 'lucide-react';

const SCENARIOS = [
  {
    id: 'dungeon',
    icon: Landmark,
    name: 'Karanlık Zindan',
    desc: 'Tehlikeli zindanlar, tuzaklar ve lanetli hazineler',
  },
  {
    id: 'forest',
    icon: TreePine,
    name: 'Gizemli Orman',
    desc: 'Antik büyüler, kayıp köyler ve mistik yaratıklar',
  },
  {
    id: 'tavern',
    icon: Beer,
    name: 'Taverna Sırları',
    desc: 'Entrikalar, sırlar ve tehlikeli görevler',
  },
  {
    id: 'city',
    icon: Building2,
    name: 'Şehir Karanlığı',
    desc: 'Suç örgütleri, siyasi entrikalar ve gizem',
  },
  {
    id: 'dragon',
    icon: Flame,
    name: 'Ejderha Arayışı',
    desc: 'Efsanevi canavara karşı ölüm kalım mücadelesi',
  },
  {
    id: 'mountain',
    icon: Mountain,
    name: 'Dağların Çağrısı',
    desc: 'Kayıp tapınaklar, fırtınalar ve zirvedeki ölümsüz bilge',
  },
  {
    id: 'sea',
    icon: Ship,
    name: 'Deniz Yolculuğu',
    desc: 'Korsan gemileri, batık hazineler ve fırtınalı denizler',
  },
  {
    id: 'caravan',
    icon: Tent,
    name: 'Kervan Yolu',
    desc: 'Ticaret kervanı, yol haydutları ve çöl kasabaları',
  },
  {
    id: 'realistic',
    icon: BookOpen,
    name: 'Gerçekçi Macera',
    desc: 'Büyü yok, canavar yok — sadece insan dramı, siyaset ve hayatta kalma',
  },
  {
    id: 'custom',
    icon: Sparkles,
    name: 'Serbest Macera',
    desc: "AI'nın sürpriz senaryosuyla özgür keşif",
  },
];

export default function ScenarioPage({ user }) {
  const { characterId } = useParams();
  const navigate = useNavigate();
  const [selected, setSelected] = useState('');
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
      setError(err.message || 'Oturum oluşturulamadı');
    }
    setLoading(false);
  };

  return (
    <div
      className="stone-bg"
      style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}
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
          gap: '0.65rem',
        }}
      >
        {SCENARIOS.map((s, i) => (
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
              gap: '1rem',
              padding: '1rem 1.1rem',
              width: '100%',
              textAlign: 'left',
            }}
          >
            <div
              style={{
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: selected === s.id ? 'var(--gold2)' : 'var(--text)',
                filter:
                  selected === s.id
                    ? 'drop-shadow(0 0 8px rgba(201,150,58,0.6))'
                    : 'none',
              }}
            >
              <s.icon size={34} />
            </div>
            <div style={{ flex: 1 }}>
              <div
                className="font-fantasy"
                style={{
                  color: selected === s.id ? 'var(--gold2)' : 'var(--text)',
                  fontSize: '1rem',
                  fontWeight: 700,
                  marginBottom: '0.2rem',
                }}
              >
                {s.name}
              </div>
              <div
                style={{
                  color: 'var(--text-dim)',
                  fontFamily: "'Crimson Text', serif",
                  fontSize: '0.85rem',
                }}
              >
                {s.desc}
              </div>
            </div>
            {selected === s.id && (
              <div
                style={{
                  color: 'var(--gold2)',
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <Check size={16} />
              </div>
            )}
          </motion.button>
        ))}
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
            <><Hourglass size={16} /> Macera Başlıyor...</>
          ) : (
            <><Dices size={16} /> Macerayı Başlat!</>
          )}
        </motion.button>
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Flame } from 'lucide-react';
import { getFallenHeroes } from '../utils/api';
import { playClick } from '../utils/sounds';
import Particles from '../components/Particles';

const RACE_PORTRAITS = {
  'İnsan': '/races/insan.svg',
  'Elf': '/races/elf.svg',
  'Cüce': '/races/cuce.svg',
  'Yarı-Ork': '/races/yariork.svg',
  'Hobit': '/races/hobit.svg',
  'İblissoyu': '/races/iblissoyu.svg',
};

export default function HallOfFamePage({ user }) {
  const navigate = useNavigate();
  const [heroes, setHeroes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    getFallenHeroes(user.id)
      .then((d) => { setHeroes(d.heroes || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [user.id]);

  const formatDate = (d) => {
    if (!d) return '';
    return new Date(d).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  return (
    <div className="stone-bg" style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <Particles type="ember" count={10} />

      {/* Header */}
      <div
        style={{
          padding: '1.25rem 1rem 1rem',
          borderBottom: '1px solid var(--border)',
          background: 'rgba(26,21,16,0.85)',
          backdropFilter: 'blur(6px)',
        }}
        className="pt-safe"
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={() => { playClick(); navigate('/'); }}
            className="btn-dark"
            style={{ padding: '0.44rem 0.9rem', fontSize: '0.85rem', minHeight: '44px' }}
          >
            Geri
          </motion.button>
          <div>
            <h1
              className="font-fantasy gold-shimmer"
              style={{ fontSize: '1.3rem', letterSpacing: '0.1em', margin: 0 }}
            >
              ONUR LİSTESİ
            </h1>
            <p
              style={{
                color: 'var(--text-dim)', fontFamily: "'Crimson Text', serif",
                fontSize: '0.8rem', margin: '0.1rem 0 0',
              }}
            >
              Yolculuğunu tamamlayan kahramanlar
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', paddingBottom: '2rem' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '5rem 0', color: 'var(--text-dim)' }}>
            <p style={{ fontFamily: "'Crimson Text', serif" }}>Yükleniyor...</p>
          </div>
        ) : heroes.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ textAlign: 'center', padding: '4rem 1rem' }}
          >
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}><Flame size={48} /></div>
            <p
              style={{
                color: 'var(--text)', fontFamily: "'Crimson Text', serif",
                fontSize: '1.1rem', marginBottom: '0.35rem',
              }}
            >
              Henüz düşen kahraman yok
            </p>
            <p
              style={{ color: 'var(--text-dim)', fontFamily: "'Crimson Text', serif", fontSize: '0.9rem' }}
            >
              Her kahraman kendi efsanesini yazar
            </p>
          </motion.div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
            {heroes.map((hero, i) => (
              <motion.div
                key={hero.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.07 }}
                className="stone-card"
                style={{ padding: '1rem', filter: 'grayscale(0.25)', opacity: 0.9 }}
              >
                {/* Top row: portrait + info */}
                <div style={{ display: 'flex', gap: '0.85rem', alignItems: 'flex-start' }}>
                  <div
                    style={{
                      width: '4rem', height: '4rem', flexShrink: 0,
                      borderRadius: '8px', overflow: 'hidden',
                      border: '1px solid rgba(92,74,42,0.5)',
                      background: 'rgba(0,0,0,0.4)',
                    }}
                  >
                    <img
                      src={RACE_PORTRAITS[hero.race] || '/races/insan.svg'}
                      alt={hero.race}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'grayscale(0.4)' }}
                    />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <h3
                        className="font-fantasy"
                        style={{ color: 'var(--text-dim)', fontSize: '1rem', margin: 0 }}
                      >
                        {hero.name}
                      </h3>
                      <span
                        style={{
                          background: 'rgba(40,30,20,0.8)', border: '1px solid var(--border)',
                          color: 'var(--text-dim)', fontFamily: "'Cinzel', serif",
                          fontSize: '0.6rem', padding: '0.1rem 0.4rem', borderRadius: '20px',
                        }}
                      >
                        Sv.{hero.level}
                      </span>
                      <span style={{ color: 'var(--blood)', fontSize: '0.68rem', fontFamily: "'Cinzel', serif" }}>
                        DÜŞTÜ
                      </span>
                    </div>
                    <p
                      style={{
                        color: 'var(--text-dim)', fontFamily: "'Crimson Text', serif",
                        fontSize: '0.85rem', margin: '0.12rem 0 0',
                      }}
                    >
                      {hero.race} · {hero.class}
                    </p>
                    <p
                      style={{
                        color: 'var(--text-muted)', fontFamily: "'Crimson Text', serif",
                        fontSize: '0.72rem', margin: '0.08rem 0 0',
                      }}
                    >
                      {formatDate(hero.died_at)}
                    </p>
                  </div>
                </div>

                {/* Final message */}
                {hero.final_message && (
                  <p
                    style={{
                      marginTop: '0.7rem', fontFamily: "'Crimson Text', serif",
                      fontStyle: 'italic', color: 'var(--text-dim)', fontSize: '0.88rem',
                      borderTop: '1px solid rgba(92,74,42,0.25)', paddingTop: '0.55rem',
                      lineHeight: 1.5,
                    }}
                  >
                    &ldquo;{hero.final_message}&rdquo;
                  </p>
                )}

                {/* Summary — expandable */}
                {hero.summary && (
                  <>
                    <button
                      onClick={() => { playClick(); setExpanded(expanded === hero.id ? null : hero.id); }}
                      style={{
                        background: 'none', border: 'none', color: 'var(--text-muted)',
                        fontFamily: "'Crimson Text', serif", fontSize: '0.78rem',
                        cursor: 'pointer', padding: '0.4rem 0 0', display: 'flex',
                        alignItems: 'center', gap: '0.3rem',
                      }}
                    >
                      <span
                        style={{
                          display: 'inline-block',
                          transform: expanded === hero.id ? 'rotate(90deg)' : 'none',
                          transition: 'transform 0.2s',
                        }}
                      >
                        ▶
                      </span>
                      {expanded === hero.id ? 'Gizle' : 'Macera özeti'}
                    </button>
                    {expanded === hero.id && (
                      <motion.p
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        style={{
                          fontFamily: "'Crimson Text', serif", color: 'var(--text-muted)',
                          fontSize: '0.83rem', lineHeight: 1.55, margin: '0.4rem 0 0',
                        }}
                      >
                        {hero.summary}
                      </motion.p>
                    )}
                  </>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

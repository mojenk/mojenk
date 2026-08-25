import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Trophy, Coins, Crown } from 'lucide-react';
import { getLeaderboard } from '../utils/api';
import { useLang, t, getLang } from '../utils/i18n';
import { playClick } from '../utils/sounds';
import Particles from '../components/Particles';

const RANK_STYLE = {
  1: { color: '#e8c15a', size: '1.35rem' },
  2: { color: '#c9c9d4', size: '1.15rem' },
  3: { color: '#b58150', size: '1.05rem' },
};

export default function LeaderboardPage({ user }) {
  const navigate = useNavigate();
  useLang();
  const [data, setData] = useState({ level: [], gold: [] });
  const [tab, setTab] = useState('level');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getLeaderboard()
      .then((d) => { setData({ level: d.level || [], gold: d.gold || [] }); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const list = tab === 'level' ? data.level : data.gold;

  const renderRow = (entry, i) => {
    const rankStyle = RANK_STYLE[entry.rank] || { color: 'var(--text-dim)', size: '0.95rem' };
    return (
      <motion.div
        key={`${entry.id}-${entry.rank}`}
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: Math.min(i, 12) * 0.05 }}
        className="stone-card"
        style={{
          padding: '0.75rem 0.9rem',
          display: 'flex', alignItems: 'center', gap: '0.8rem',
          border: entry.is_own ? '1px solid rgba(232,193,90,0.65)' : undefined,
          background: entry.is_own ? 'rgba(201,162,39,0.08)' : undefined,
        }}
      >
        <div
          className="font-fantasy"
          style={{
            width: '2.2rem', textAlign: 'center', flexShrink: 0,
            color: rankStyle.color, fontSize: rankStyle.size, fontWeight: 700,
          }}
        >
          {entry.rank <= 3 ? <Crown size={18} style={{ verticalAlign: '-2px' }} /> : `#${entry.rank}`}
        </div>
        <div
          style={{
            width: '3rem', height: '3rem', flexShrink: 0, borderRadius: '8px',
            overflow: 'hidden', border: '1px solid rgba(92,74,42,0.5)', background: 'rgba(0,0,0,0.4)',
          }}
        >
          <img
            src={entry.portrait || '/races/insan.png'}
            alt={entry.race || ''}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            loading="lazy"
          />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
            <span className="font-fantasy" style={{ color: 'var(--text)', fontSize: '0.95rem' }}>
              {entry.name}
            </span>
            {entry.title && (
              <span style={{ color: '#c9a227', fontSize: '0.7rem', fontFamily: "'Crimson Text', serif", fontStyle: 'italic' }}>
                «{entry.title}»
              </span>
            )}
            {entry.is_own && (
              <span style={{ color: '#e8c15a', fontSize: '0.65rem', fontFamily: "'Crimson Text', serif" }}>
                ({t('leaderboard_you')})
              </span>
            )}
          </div>
          <div style={{ color: 'var(--text-dim)', fontSize: '0.72rem', fontFamily: "'Crimson Text', serif" }}>
            {[entry.race, entry.class, entry.owner ? `@${entry.owner}` : null].filter(Boolean).join(' · ')}
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div className="font-fantasy" style={{ color: '#e8c15a', fontSize: '1rem', fontWeight: 700 }}>
            {tab === 'level' ? `${t('leaderboard_level')} ${entry.level}` : entry.gold}
          </div>
          <div style={{ color: 'var(--text-dim)', fontSize: '0.68rem', fontFamily: "'Crimson Text', serif" }}>
            {tab === 'level' ? `${entry.experience} XP` : t('leaderboard_gold_unit')}
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="stone-bg" style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <Particles type="ember" count={10} />

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
            {t('back')}
          </motion.button>
          <div>
            <h1 className="font-fantasy gold-shimmer" style={{ fontSize: '1.3rem', letterSpacing: '0.1em', margin: 0 }}>
              {t('leaderboard_title')}
            </h1>
            <p style={{ color: 'var(--text-dim)', fontFamily: "'Crimson Text', serif", fontSize: '0.8rem', margin: '0.1rem 0 0' }}>
              {t('leaderboard_subtitle')}
            </p>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', padding: '0.85rem 1rem 0' }}>
        {[
          { id: 'level', icon: <Trophy size={15} />, label: t('leaderboard_tab_level') },
          { id: 'gold', icon: <Coins size={15} />, label: t('leaderboard_tab_gold') },
        ].map((tb) => (
          <motion.button
            key={tb.id}
            whileTap={{ scale: 0.96 }}
            onClick={() => { playClick(); setTab(tb.id); }}
            className={tab === tb.id ? 'btn-gold' : 'btn-dark'}
            style={{
              flex: 1, padding: '0.55rem', fontSize: '0.82rem', minHeight: '44px',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
            }}
          >
            {tb.icon} {tb.label}
          </motion.button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', paddingBottom: '2rem' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '5rem 0', color: 'var(--text-dim)' }}>
            <p style={{ fontFamily: "'Crimson Text', serif" }}>{t('loading')}</p>
          </div>
        ) : list.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
            <Trophy size={44} style={{ color: 'var(--text-dim)', marginBottom: '0.75rem' }} />
            <p style={{ color: 'var(--text-dim)', fontFamily: "'Crimson Text', serif" }}>{t('leaderboard_empty')}</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {list.map(renderRow)}
          </div>
        )}
      </div>
    </div>
  );
}

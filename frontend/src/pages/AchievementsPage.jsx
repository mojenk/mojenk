import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Sword, Scroll, Package, Gem, Coins, Flame, Heart,
  Users, BookOpen, Star, Compass, Lock, Trophy,
} from 'lucide-react';
import { getAchievements } from '../utils/api';
import { useLang, t } from '../utils/i18n';
import { playClick } from '../utils/sounds';
import Particles from '../components/Particles';

const ICONS = {
  sword: Sword,
  scroll: Scroll,
  chest: Package,
  gem: Gem,
  coin: Coins,
  campfire: Flame,
  heart: Heart,
  users: Users,
  book: BookOpen,
  star: Star,
  compass: Compass,
};

const TIER_COLORS = {
  bronze: '#c07b4a',
  silver: '#c9d1d9',
  gold: '#e6b422',
  legendary: '#b565d8',
};

export default function AchievementsPage() {
  const navigate = useNavigate();
  useLang();
  const [achievements, setAchievements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getAchievements()
      .then((data) => { setAchievements(data.achievements || []); setLoading(false); })
      .catch((err) => { setError(err.message || 'Hata'); setLoading(false); });
  }, []);

  // Kazanılanlar üstte, sonra ilerlemeye göre sırala
  const sorted = useMemo(() => {
    return [...achievements].sort((a, b) => {
      if (a.unlocked !== b.unlocked) return a.unlocked ? -1 : 1;
      return (b.progress / b.goal) - (a.progress / a.goal);
    });
  }, [achievements]);

  const unlockedCount = achievements.filter((entry) => entry.unlocked).length;

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
          <div style={{ minWidth: 0 }}>
            <h1
              className="font-fantasy gold-shimmer"
              style={{ fontSize: '1.3rem', letterSpacing: '0.1em', margin: 0 }}
            >
              {t('achievements_title')}
            </h1>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-dim)', margin: '0.15rem 0 0' }}>
              {t('achievements_subtitle')}
            </p>
          </div>
        </div>

        {!loading && achievements.length > 0 && (
          <div style={{ marginTop: '0.85rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--gold)', marginBottom: '0.35rem' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Trophy size={14} /> {t('achievements_progress', unlockedCount, achievements.length)}
              </span>
              <span>{Math.round((unlockedCount / achievements.length) * 100)}%</span>
            </div>
            <div style={{ height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 999, overflow: 'hidden' }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(unlockedCount / achievements.length) * 100}%` }}
                transition={{ duration: 0.7 }}
                style={{ height: '100%', background: 'linear-gradient(90deg,#8a6a2f,#e6b422)' }}
              />
            </div>
          </div>
        )}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}>
        {loading && (
          <p style={{ textAlign: 'center', color: 'var(--text-dim)', marginTop: '2rem' }}>{t('loading')}</p>
        )}
        {!loading && error && (
          <p style={{ textAlign: 'center', color: '#c0392b', marginTop: '2rem' }}>{error}</p>
        )}
        {!loading && !error && sorted.length === 0 && (
          <p style={{ textAlign: 'center', color: 'var(--text-dim)', marginTop: '2rem' }}>{t('achievements_empty')}</p>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
          {sorted.map((entry, index) => {
            const Icon = ICONS[entry.icon] || Trophy;
            const color = TIER_COLORS[entry.tier] || 'var(--gold)';
            const percent = Math.min(100, Math.round((entry.progress / entry.goal) * 100));
            return (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(index * 0.03, 0.4) }}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.75rem',
                  padding: '0.75rem',
                  borderRadius: 10,
                  border: `1px solid ${entry.unlocked ? color : 'var(--border)'}`,
                  background: entry.unlocked ? 'rgba(230,180,34,0.07)' : 'rgba(10,8,6,0.45)',
                  opacity: entry.unlocked ? 1 : 0.72,
                }}
              >
                <div
                  style={{
                    width: 46,
                    height: 46,
                    flexShrink: 0,
                    borderRadius: 8,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: `1px solid ${entry.unlocked ? color : 'var(--border)'}`,
                    background: entry.unlocked ? `${color}22` : 'rgba(0,0,0,0.35)',
                  }}
                >
                  {entry.unlocked
                    ? <Icon size={24} color={color} />
                    : <Lock size={20} color="var(--text-dim)" />}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem', flexWrap: 'wrap' }}>
                    <span
                      className="font-fantasy"
                      style={{ fontSize: '0.95rem', color: entry.unlocked ? color : 'var(--text)', overflowWrap: 'anywhere' }}
                    >
                      {t(`ach_${entry.id}`)}
                    </span>
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>
                      {t('achievements_reward', entry.xp, entry.gold)}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.76rem', color: 'var(--text-dim)', margin: '0.15rem 0 0.45rem', overflowWrap: 'anywhere' }}>
                    {t(`ach_${entry.id}_desc`)}
                  </p>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ flex: 1, height: 5, background: 'rgba(255,255,255,0.08)', borderRadius: 999, overflow: 'hidden' }}>
                      <div style={{ width: `${percent}%`, height: '100%', background: entry.unlocked ? color : 'rgba(230,180,34,0.5)' }} />
                    </div>
                    <span style={{ fontSize: '0.66rem', color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>
                      {entry.progress} / {entry.goal}
                    </span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { motion } from 'framer-motion';
import { playClick, playMagic } from '../utils/sounds';
import { useSound } from '../hooks/useSound';
import Particles from '../components/Particles';
import AnnouncementsBar from '../components/AnnouncementsBar';
import { auth, googleProvider, signInWithPopup, signInAnonymously } from '../firebase';
import { apiGetCurrentUser } from '../utils/api';

const FEATURES = [
  { icon: '⚔️', title: 'Epik Savaşlar', desc: 'Zar at, düşmanlarını yen' },
  { icon: '📜', title: 'Derin Hikayeler', desc: 'AI destekli anlatı' },
  { icon: '🏰', title: 'Geniş Dünya', desc: 'Sonsuz macera seni bekliyor' },
];

export default function LoginPage({ onLogin }) {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { soundOn, toggleSound } = useSound();

  const syncUser = async (authUser) => {
    const token = authUser ? await authUser.getIdToken() : '';
    const current = await apiGetCurrentUser(token);
    if (current.user) {
      onLogin(current.user);
      try { localStorage.setItem('dnd_user', JSON.stringify(current.user)); } catch {}
    }
    else throw new Error('Kullanıcı senkronize edilemedi');
  };

  const finalizeLogin = async (credential) => {
    const authUser = credential?.user || auth.currentUser;
    if (!authUser) throw new Error('Firebase kullanıcısı alınamadı');
    try {
      const token = await authUser.getIdToken();
      const current = await apiGetCurrentUser(token);
      if (current.user) {
        onLogin(current.user);
        try { localStorage.setItem('dnd_user', JSON.stringify(current.user)); } catch {}
        return;
      }
    } catch (syncErr) {
      console.error('syncUser failed:', syncErr);
    }
    const fallbackUser = {
      id: authUser.uid,
      firebase_uid: authUser.uid,
      username: authUser.displayName || authUser.email?.split('@')[0] || `kahraman_${authUser.uid.slice(0, 6)}`,
      email: authUser.email || null,
    };
    onLogin(fallbackUser);
    try { localStorage.setItem('dnd_user', JSON.stringify(fallbackUser)); } catch {}
  };

  const handleGoogle = async () => {
    playClick();
    setLoading(true);
    setError('');
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      await finalizeLogin(cred);
      playMagic();
    } catch (err) {
      console.error(err);
      setError('Google girişi başarısız: ' + (err.message || 'Bilinmeyen hata'));
    }
    setLoading(false);
  };

  const handleAnonymous = async () => {
    playClick();
    setLoading(true);
    setError('');
    try {
      const cred = await signInAnonymously(auth);
      await finalizeLogin(cred);
      playMagic();
    } catch (err) {
      console.error(err);
      setError('Misafir girişi başarısız: ' + (err.message || 'Bilinmeyen hata'));
    }
    setLoading(false);
  };

  return (
    <div
      className="stone-bg"
      style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem 1rem',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <Particles type="ember" count={15} />

      <AnnouncementsBar />

      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={() => { playClick(); toggleSound(); }}
        style={{
          position: 'absolute', top: '1rem', right: '1rem',
          width: '2.2rem', height: '2.2rem', borderRadius: '8px',
          background: 'rgba(92,74,42,0.2)', border: '1px solid var(--border)',
          fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', zIndex: 10,
        }}
      >
        {soundOn ? '🔊' : '🔇'}
      </motion.button>

      <div
        style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'radial-gradient(ellipse at 50% 0%, rgba(201,150,58,0.09) 0%, transparent 65%)',
          pointerEvents: 'none',
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: -32 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.75, ease: 'easeOut' }}
        style={{ textAlign: 'center', marginBottom: '2rem', position: 'relative', zIndex: 1 }}
      >
        <div
          className="animate-float"
          style={{ fontSize: '4.5rem', lineHeight: 1, marginBottom: '0.6rem', filter: 'drop-shadow(0 0 22px rgba(201,150,58,0.75))' }}
        >
          ⚔️
        </div>
        <h1
          className="font-fantasy gold-shimmer"
          style={{ fontSize: 'clamp(1.9rem, 6.5vw, 3rem)', letterSpacing: '0.18em', margin: 0, lineHeight: 1.1 }}
        >
          KADER'İN SESİ
        </h1>
        <p style={{ color: 'var(--text-dim)', fontFamily: "'Crimson Text', serif", fontSize: '1.05rem', marginTop: '0.45rem', letterSpacing: '0.07em', fontStyle: 'italic' }}>
          Kaderine adım at, kahraman
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 22 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.22 }}
        className="stone-card"
        style={{ width: '100%', maxWidth: '400px', padding: '2rem 1.5rem', position: 'relative', zIndex: 1 }}
      >
        <div className="rune-divider" style={{ marginBottom: '1.5rem' }} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <motion.button
            whileTap={{ scale: 0.96 }}
            disabled={loading}
            onClick={handleGoogle}
            style={{
              width: '100%', padding: '0.85rem', borderRadius: '8px',
              background: '#fff', color: '#444', border: 'none',
              fontFamily: "'Cinzel', serif", fontSize: '0.8rem', fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
            }}
          >
            <span style={{ fontSize: '1rem' }}>G</span> Google ile Giriş Yap
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.96 }}
            disabled={loading}
            onClick={handleAnonymous}
            style={{
              width: '100%', padding: '0.85rem', borderRadius: '8px',
              background: 'rgba(201,150,58,0.12)', color: 'var(--gold)', border: '1px solid rgba(201,150,58,0.4)',
              fontFamily: "'Cinzel', serif", fontSize: '0.8rem', fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? '⏳ Kapılar Açılıyor...' : 'Misafir Olarak Devam Et'}
          </motion.button>
        </div>

        {error && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{
              color: 'var(--blood)', fontFamily: "'Crimson Text', serif", fontSize: '0.9rem',
              textAlign: 'center', margin: '0.75rem 0 0', padding: '0.5rem 0.75rem',
              border: '1px solid rgba(122,21,21,0.45)', borderRadius: '6px', background: 'rgba(122,21,21,0.12)',
            }}
          >
            {error}
          </motion.p>
        )}

        <div className="rune-divider" style={{ marginTop: '1.5rem' }} />
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.5 }}
        style={{ display: 'flex', gap: '0.75rem', marginTop: '1.75rem', width: '100%', maxWidth: '400px', position: 'relative', zIndex: 1 }}
      >
        {FEATURES.map((f, i) => (
          <motion.div
            key={f.title}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 + i * 0.1 }}
            style={{
              flex: 1, textAlign: 'center', padding: '0.8rem 0.4rem',
              background: 'rgba(92,74,42,0.14)', border: '1px solid rgba(92,74,42,0.38)', borderRadius: '10px',
            }}
          >
            <div style={{ fontSize: '1.6rem', marginBottom: '0.3rem' }}>{f.icon}</div>
            <div style={{ color: 'var(--gold)', fontFamily: "'Cinzel', serif", fontSize: '0.58rem', letterSpacing: '0.05em', fontWeight: 700, marginBottom: '0.2rem', textTransform: 'uppercase' }}>
              {f.title}
            </div>
            <div style={{ color: 'var(--text-dim)', fontFamily: "'Crimson Text', serif", fontSize: '0.78rem' }}>
              {f.desc}
            </div>
          </motion.div>
        ))}
      </motion.div>

      <p style={{ color: 'var(--text-dim)', fontFamily: "'Crimson Text', serif", fontSize: '0.72rem', marginTop: '1.5rem', opacity: 0.5, position: 'relative', zIndex: 1 }}>
        Kader'in Sesi
      </p>
    </div>
  );
}

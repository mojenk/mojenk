import { useState } from 'react';
import { motion } from 'framer-motion';
import { playClick, playMagic } from '../utils/sounds';
import { useSound } from '../hooks/useSound';
import Particles from '../components/Particles';
import AnnouncementsBar from '../components/AnnouncementsBar';
import { auth, googleProvider, signInWithPopup, signInAnonymously, signInWithCredential, GoogleAuthProvider } from '../firebase';
import { Capacitor } from '@capacitor/core';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { apiGetCurrentUser } from '../utils/api';
import { Swords, ScrollText, Globe } from 'lucide-react';

const FEATURES = [
  { icon: Swords, title: 'Epik Savaşlar', desc: 'Zar at, düşmanlarını yen' },
  { icon: ScrollText, title: 'Derin Hikayeler', desc: 'AI destekli anlatı' },
  { icon: Globe, title: 'Geniş Dünya', desc: 'Sonsuz macera seni bekliyor' },
];

export default function LoginPage({ onLogin }) {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { soundOn, toggleSound } = useSound();

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
      let cred;
      if (Capacitor.isNativePlatform()) {
        // Android: Native Google Sign-In (avoids Chrome Custom Tab sessionStorage issue)
        const googleUser = await GoogleAuth.signIn();
        const credential = GoogleAuthProvider.credential(googleUser.authentication.idToken);
        cred = await signInWithCredential(auth, credential);
      } else {
        // Web: Firebase popup flow
        cred = await signInWithPopup(auth, googleProvider);
      }
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
      <Particles type="ember" count={18} />
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
          backgroundImage: 'radial-gradient(ellipse at 50% 0%, rgba(201,150,58,0.12) 0%, transparent 60%)',
          pointerEvents: 'none',
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: -32 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        style={{ textAlign: 'center', marginBottom: '1.5rem', position: 'relative', zIndex: 1 }}
      >
        <motion.div
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          style={{ marginBottom: '1rem' }}
        >
          <img
            src="/icon-512.png"
            alt="Kader'in Sesi"
            style={{
              width: 'clamp(6.5rem, 22vw, 9rem)',
              height: 'clamp(6.5rem, 22vw, 9rem)',
              objectFit: 'contain',
              filter: 'drop-shadow(0 0 28px rgba(201,150,58,0.55))',
              borderRadius: '50%',
            }}
          />
        </motion.div>
        <h1
          className="font-fantasy gold-shimmer"
          style={{ fontSize: 'clamp(2rem, 7vw, 3.2rem)', letterSpacing: '0.22em', margin: 0, lineHeight: 1.05 }}
        >
          KADER'İN SESİ
        </h1>
        <p style={{ color: 'var(--text-dim)', fontFamily: "'Crimson Text', serif", fontSize: '1.05rem', marginTop: '0.5rem', letterSpacing: '0.08em', fontStyle: 'italic' }}>
          Kaderine adım at, kahraman
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 22 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.22 }}
        className="stone-card"
        style={{ width: '100%', maxWidth: '380px', padding: '2rem 1.5rem', position: 'relative', zIndex: 1, borderRadius: '18px' }}
      >
        <div className="rune-divider" style={{ marginBottom: '1.5rem' }} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          <motion.button
            whileTap={{ scale: 0.96 }}
            whileHover={{ boxShadow: '0 0 18px rgba(201,150,58,0.25)' }}
            disabled={loading}
            onClick={handleGoogle}
            style={{
              width: '100%', padding: '0.95rem', borderRadius: '10px',
              background: 'linear-gradient(135deg, #1a1410, #0d0a05)', color: 'var(--gold)',
              border: '1px solid rgba(201,150,58,0.55)',
              fontFamily: "'Cinzel', serif", fontSize: '0.85rem', fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem',
              transition: 'box-shadow 0.2s ease',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" style={{ opacity: 0.9 }}>
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Google ile Giriş Yap
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.96 }}
            disabled={loading}
            onClick={handleAnonymous}
            style={{
              width: '100%', padding: '0.9rem', borderRadius: '10px',
              background: 'rgba(201,150,58,0.1)', color: 'var(--text)',
              border: '1px solid rgba(201,150,58,0.25)',
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
              textAlign: 'center', margin: '0.85rem 0 0', padding: '0.5rem 0.75rem',
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
        style={{ display: 'flex', gap: '0.75rem', marginTop: '1.75rem', width: '100%', maxWidth: '380px', position: 'relative', zIndex: 1 }}
      >
        {FEATURES.map((f, i) => {
          const Icon = f.icon;
          return (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 + i * 0.1 }}
              style={{
                flex: 1, textAlign: 'center', padding: '0.9rem 0.4rem',
                background: 'rgba(92,74,42,0.14)', border: '1px solid rgba(92,74,42,0.38)', borderRadius: '12px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.4rem', color: 'var(--gold)' }}>
                <Icon size={22} />
              </div>
              <div style={{ color: 'var(--gold)', fontFamily: "'Cinzel', serif", fontSize: '0.58rem', letterSpacing: '0.05em', fontWeight: 700, marginBottom: '0.25rem', textTransform: 'uppercase' }}>
                {f.title}
              </div>
              <div style={{ color: 'var(--text-dim)', fontFamily: "'Crimson Text', serif", fontSize: '0.75rem' }}>
                {f.desc}
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      <p style={{ color: 'var(--text-dim)', fontFamily: "'Crimson Text', serif", fontSize: '0.72rem', marginTop: '1.75rem', opacity: 0.5, position: 'relative', zIndex: 1 }}>
        Kader'in Sesi
      </p>
    </div>
  );
}


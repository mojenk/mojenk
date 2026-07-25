import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { playClick, playMagic } from '../utils/sounds';
import { useSound } from '../hooks/useSound';
import Particles from '../components/Particles';
import AnnouncementsBar from '../components/AnnouncementsBar';
import { auth, signInAnonymously, signInWithCredential, GoogleAuthProvider } from '../firebase';
import { Capacitor } from '@capacitor/core';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { apiGetCurrentUser } from '../utils/api';
import { Swords, ScrollText, Globe } from 'lucide-react';
import { useLang, t } from '../utils/i18n';

const FEATURES_KEYS = [
  { icon: Swords, titleKey: 'feature_battles_title', descKey: 'feature_battles_desc' },
  { icon: ScrollText, titleKey: 'feature_stories_title', descKey: 'feature_stories_desc' },
  { icon: Globe, titleKey: 'feature_world_title', descKey: 'feature_world_desc' },
];

export default function LoginPage({ onLogin }) {
  const [error, setError] = useState('');
  useLang();
  const [loading, setLoading] = useState(!Capacitor.isNativePlatform());
  const { soundOn, toggleSound } = useSound();

  // Web'de Google girişi: Google Identity Services (GIS) Sign In With Google
  // butonu kullan. Kullanıcı hesabını seçince credential (JWT) callback ile
  // geliyor, bunu Firebase signInWithCredential'a veriyoruz. Sayfa
  // yönlendirmesi olmuyor.
  const googleBtnRef = useRef(null);
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      setLoading(false);
      return;
    }
    const init = () => {
      if (!window.google?.accounts?.id) return;
      try {
        window.google.accounts.id.initialize({
          client_id: '103499453593-9ljq15ebsf4hi7aunppcirqhmaijf0ec.apps.googleusercontent.com',
          callback: async (response) => {
            if (!response?.credential) return;
            setLoading(true);
            try {
              const credential = GoogleAuthProvider.credential(response.credential);
              const cred = await signInWithCredential(auth, credential);
              await finalizeLogin(cred);
              playMagic();
            } catch (err) {
              console.error('GIS sign-in failed:', err);
              setError('Google girişi başarısız: ' + (err.message || 'Bilinmeyen hata'));
            } finally {
              setLoading(false);
            }
          },
          auto_select: false,
          cancel_on_tap_outside: true,
        });
        if (googleBtnRef.current) {
          window.google.accounts.id.renderButton(googleBtnRef.current, {
            theme: 'filled_black',
            size: 'large',
            width: googleBtnRef.current.clientWidth || 320,
            text: 'signin_with',
            shape: 'rectangular',
            logo_alignment: 'left',
          });
        }
      } catch (err) {
        console.error('Google Identity Services init failed:', err);
      } finally {
        setLoading(false);
      }
    };
    if (document.readyState === 'complete' || window.google?.accounts?.id) {
      init();
    } else {
      window.addEventListener('load', init);
      return () => window.removeEventListener('load', init);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    if (!Capacitor.isNativePlatform()) {
      // Web: Google Identity Services One Tap / hesap seçim penceresi aç
      if (window.google?.accounts?.id) {
        window.google.accounts.id.prompt();
      }
      return;
    }
    setLoading(true);
    setError('');
    const timeoutMs = 20000;
    let timedOut = false;
    const timeoutId = setTimeout(() => {
      timedOut = true;
      setLoading(false);
      setError('Google girişi zaman aşımına uğradı. Lütfen internet bağlantını kontrol edip tekrar dene.');
    }, timeoutMs);
    try {
      // Android: Native Google Sign-In (avoids Chrome Custom Tab sessionStorage issue)
      const googleUser = await GoogleAuth.signIn();
      const credential = GoogleAuthProvider.credential(googleUser.authentication.idToken);
      const cred = await signInWithCredential(auth, credential);
      if (timedOut) return;
      await finalizeLogin(cred);
      playMagic();
    } catch (err) {
      console.error(err);
      if (!timedOut) setError('Google girişi başarısız: ' + (err.message || 'Bilinmeyen hata'));
    } finally {
      clearTimeout(timeoutId);
    }
    if (!timedOut) setLoading(false);
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
          <motion.div
            whileTap={{ scale: 0.96 }}
            whileHover={{ boxShadow: '0 0 18px rgba(201,150,58,0.25)' }}
            ref={googleBtnRef}
            onClick={handleGoogle}
            style={{
              width: '100%', padding: '0.55rem', borderRadius: '10px',
              background: 'linear-gradient(135deg, #1a1410, #0d0a05)', color: 'var(--gold)',
              border: '1px solid rgba(201,150,58,0.55)',
              fontFamily: "'Cinzel', serif", fontSize: '0.85rem', fontWeight: 700,
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem',
              transition: 'box-shadow 0.2s ease',
              minHeight: '48px',
            }}
          />

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
            {loading ? t('login_loading') : t('guest_login')}
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
        {FEATURES_KEYS.map((f, i) => {
          const Icon = f.icon;
          return (
            <motion.div
              key={f.titleKey}
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
                {t(f.titleKey)}
              </div>
              <div style={{ color: 'var(--text-dim)', fontFamily: "'Crimson Text', serif", fontSize: '0.75rem' }}>
                {t(f.descKey)}
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


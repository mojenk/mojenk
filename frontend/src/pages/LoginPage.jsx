import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { playClick, playMagic } from '../utils/sounds';
import { useSound } from '../hooks/useSound';
import Particles from '../components/Particles';
import AnnouncementsBar from '../components/AnnouncementsBar';
import {
  auth,
  signInAnonymously,
  signInWithCredential,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
} from '../firebase';
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

const GOOGLE_WEB_CLIENT_ID = '103499453593-n2huh62soedmhatu71i12sacf58g8nqc.apps.googleusercontent.com';

export default function LoginPage({ onLogin }) {
  useLang();
  const { soundOn, toggleSound } = useSound();

  const [loading, setLoading] = useState(!Capacitor.isNativePlatform());
  const [error, setError] = useState('');
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const googleBtnRef = useRef(null);
  const gisInitialized = useRef(false);

  // ── Web: Google Identity Services butonu ──
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      setLoading(false);
      return;
    }
    if (gisInitialized.current) return;

    const handleGoogleCredential = async (response) => {
      if (!response?.credential) return;
      setLoading(true);
      setError('');
      try {
        const credential = GoogleAuthProvider.credential(response.credential);
        const cred = await signInWithCredential(auth, credential);
        await finalizeLogin(cred);
        playMagic();
      } catch (err) {
        console.error('Google sign-in failed:', err);
        setError(mapAuthError(err));
      } finally {
        setLoading(false);
      }
    };

    const initGis = () => {
      if (!window.google?.accounts?.id || gisInitialized.current) return;
      try {
        gisInitialized.current = true;
        window.google.accounts.id.initialize({
          client_id: GOOGLE_WEB_CLIENT_ID,
          callback: handleGoogleCredential,
          auto_select: false,
          cancel_on_tap_outside: true,
        });
        if (googleBtnRef.current) {
          googleBtnRef.current.innerHTML = '';
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
        console.error('GIS init failed:', err);
        gisInitialized.current = false;
      } finally {
        setLoading(false);
      }
    };

    if (document.readyState === 'complete' || window.google?.accounts?.id) {
      initGis();
    } else {
      window.addEventListener('load', initGis);
      return () => window.removeEventListener('load', initGis);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Giriş sonrası backend senkronizasyonu ──
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
      uid: authUser.uid,
      firebase_uid: authUser.uid,
      username: authUser.displayName || authUser.email?.split('@')[0] || `kahraman_${authUser.uid.slice(0, 6)}`,
      email: authUser.email || null,
      picture: authUser.photoURL || null,
      isGuest: !authUser.email,
    };
    onLogin(fallbackUser);
    try { localStorage.setItem('dnd_user', JSON.stringify(fallbackUser)); } catch {}
  };

  // ── Email / Password ──
  const handleEmailAuth = async (e) => {
    e.preventDefault();
    playClick();
    setLoading(true);
    setError('');
    try {
      const cred = mode === 'login'
        ? await signInWithEmailAndPassword(auth, email, password)
        : await createUserWithEmailAndPassword(auth, email, password);
      await finalizeLogin(cred);
      playMagic();
    } catch (err) {
      console.error('Email auth failed:', err);
      setError(mapAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  // ── Misafir girişi ──
  const handleAnonymous = async () => {
    playClick();
    setLoading(true);
    setError('');
    try {
      const cred = await signInAnonymously(auth);
      await finalizeLogin(cred);
      playMagic();
    } catch (err) {
      console.error('Anonymous login failed:', err);
      setError(mapAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  // ── Native Android: Capacitor Google Auth ──
  const handleNativeGoogle = async () => {
    playClick();
    setLoading(true);
    setError('');
    const timeoutMs = 20000;
    let timedOut = false;
    const timeoutId = setTimeout(() => {
      timedOut = true;
      setLoading(false);
      setError(t('google_timeout'));
    }, timeoutMs);
    try {
      const googleUser = await GoogleAuth.signIn();
      const credential = GoogleAuthProvider.credential(googleUser.authentication.idToken);
      const cred = await signInWithCredential(auth, credential);
      if (timedOut) return;
      await finalizeLogin(cred);
      playMagic();
    } catch (err) {
      console.error('Native GoogleAuth error:', err);
      let details = err?.message || JSON.stringify(err);
      if (details === '{}') details = 'Bilinmeyen native hata';
      if (!timedOut) setError('Google girişi başarısız: ' + details);
    } finally {
      clearTimeout(timeoutId);
    }
    if (!timedOut) setLoading(false);
  };

  const handleGoogle = Capacitor.isNativePlatform() ? handleNativeGoogle : () => {
    playClick();
    if (window.google?.accounts?.id) window.google.accounts.id.prompt();
  };

  return (
    <div
      className="stone-bg"
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        padding: '1rem',
        position: 'relative',
        overflow: 'auto',
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
        style={{ textAlign: 'center', marginBottom: '1rem', marginTop: '0.5rem', position: 'relative', zIndex: 1 }}
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
        style={{ width: '100%', maxWidth: '380px', padding: '1.25rem', position: 'relative', zIndex: 1, borderRadius: '18px', marginBottom: '1rem' }}
      >
        <div className="rune-divider" style={{ marginBottom: '1.5rem' }} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          {/* Google Sign In */}
          <motion.div
            whileTap={{ scale: 0.96 }}
            whileHover={{ boxShadow: '0 0 18px rgba(201,150,58,0.25)' }}
            ref={googleBtnRef}
            onClick={handleGoogle}
            style={{
              width: '100%', padding: '0.55rem', borderRadius: '10px',
              background: 'linear-gradient(135deg, #1a1410, #0d0a05)', color: 'var(--gold)',
              border: '1px solid rgba(201,150,58,0.55)',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              minHeight: '48px',
              transition: 'box-shadow 0.2s ease',
            }}
          >
            {Capacitor.isNativePlatform() && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontFamily: "'Cinzel', serif", fontSize: '0.8rem', fontWeight: 700 }}>
                <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
                  <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12 s5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24 s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z" />
                  <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039 l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z" />
                  <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36 c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z" />
                  <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571 c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24 C44,22.659,43.862,21.35,43.611,20.083z" />
                </svg>
                Google ile Giriş Yap
              </span>
            )}
          </motion.div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: '0.25rem 0', opacity: 0.6 }}>
            <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontFamily: "'Cinzel', serif" }}>VEYA</span>
            <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
          </div>

          {/* Email / Password */}
          <form onSubmit={handleEmailAuth} style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
            <input
              type="email"
              placeholder={t('email_placeholder')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
              style={{
                width: '100%', padding: '0.85rem', borderRadius: '8px',
                background: 'rgba(0,0,0,0.35)', color: 'var(--text)',
                border: '1px solid var(--border)',
                fontFamily: "'Crimson Text', serif", fontSize: '0.95rem',
                outline: 'none',
              }}
            />
            <input
              type="password"
              placeholder={t('password_placeholder')}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              disabled={loading}
              style={{
                width: '100%', padding: '0.85rem', borderRadius: '8px',
                background: 'rgba(0,0,0,0.35)', color: 'var(--text)',
                border: '1px solid var(--border)',
                fontFamily: "'Crimson Text', serif", fontSize: '0.95rem',
                outline: 'none',
              }}
            />
            <motion.button
              whileTap={{ scale: 0.96 }}
              type="submit"
              disabled={loading}
              style={{
                width: '100%', padding: '0.9rem', borderRadius: '10px',
                background: 'rgba(201,150,58,0.18)', color: 'var(--gold)',
                border: '1px solid rgba(201,150,58,0.45)',
                fontFamily: "'Cinzel', serif", fontSize: '0.8rem', fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1,
              }}
            >
              {mode === 'login' ? t('login_btn') : t('register_btn')}
            </motion.button>
          </form>

          <button
            type="button"
            onClick={() => { playClick(); setMode(mode === 'login' ? 'register' : 'login'); }}
            disabled={loading}
            style={{
              background: 'transparent', border: 'none', color: 'var(--text-dim)',
              fontFamily: "'Crimson Text', serif", fontSize: '0.85rem', cursor: 'pointer',
              textAlign: 'center', textDecoration: 'underline',
            }}
          >
            {mode === 'login' ? t('goto_register') : t('goto_login')}
          </button>

          {/* Guest */}
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

function mapAuthError(err) {
  const code = err?.code || err?.message || '';
  if (code.includes('auth/invalid-credential') || code.includes('auth/wrong-password') || code.includes('auth/user-not-found')) {
    return 'E-posta veya şifre hatalı.';
  }
  if (code.includes('auth/email-already-in-use')) {
    return 'Bu e-posta adresi zaten kayıtlı. Giriş yapmayı dene.';
  }
  if (code.includes('auth/invalid-email')) {
    return 'Geçerli bir e-posta adresi gir.';
  }
  if (code.includes('auth/weak-password')) {
    return 'Şifre en az 6 karakter olmalı.';
  }
  if (code.includes('auth/popup-closed-by-user')) {
    return 'Google giriş penceresi kapatıldı.';
  }
  if (code.includes('auth/cancelled-popup-request')) {
    return 'Birden fazla giriş denemesi yapıldı.';
  }
  if (code.includes('auth/network-request-failed')) {
    return 'İnternet bağlantını kontrol et.';
  }
  if (code.includes('origin_mismatch')) {
    return 'Google Cloud OAuth JavaScript origin ayarı hatalı. Geliştirici kontrol etmeli.';
  }
  if (code.includes('redirect_uri_mismatch')) {
    return 'Google Cloud OAuth redirect URI ayarı hatalı. Geliştirici kontrol etmeli.';
  }
  return err?.message || 'Giriş başarısız, tekrar dene.';
}

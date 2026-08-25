import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useState, useEffect, Component } from 'react';
import { onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import { AnimatePresence, motion } from 'framer-motion';
import { auth, firebaseInitError } from './firebase';
import LoginPage from './pages/LoginPage';
import CharactersPage from './pages/CharactersPage';
import CreateCharacterPage from './pages/CreateCharacterPage';
import ScenarioPage from './pages/ScenarioPage';
import GamePage from './pages/GamePage';
import CharacterSheetPage from './pages/CharacterSheetPage';
import SettingsPage from './pages/SettingsPage';
import HallOfFamePage from './pages/HallOfFamePage';
import LeaderboardPage from './pages/LeaderboardPage';
import AchievementsPage from './pages/AchievementsPage';
import ShopPage from './pages/ShopPage';
import AdminPage from './pages/AdminPage';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import AccountDeletionPage from './pages/AccountDeletionPage';
import { playPageTransition } from './utils/sounds';
import { apiGetCurrentUser, adminCheck } from './utils/api';
import { requestPushPermission, registerPushToken } from './utils/push';
import { configurePurchases } from './utils/purchases';

// Apply saved text size and theme on startup
(function () {
  const size = localStorage.getItem('dnd_text_size') || 'medium';
  const map = { small: '13px', medium: '15px', large: '17px' };
  document.documentElement.style.setProperty('--base-font-size', map[size] || '15px');

  const theme = localStorage.getItem('dnd_theme') || 'dark';
  if (theme === 'light') document.documentElement.setAttribute('data-theme', 'light');
  else document.documentElement.removeAttribute('data-theme');
})();

const PUBLIC_PATHS = ['/privacy-policy', '/hesap-silme'];

const pageVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.2 } },
};

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    console.error('App ErrorBoundary caught:', error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="stone-bg" style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ maxWidth: 480, textAlign: 'center', color: 'var(--gold)', fontFamily: "'Cinzel', serif" }}>
            <h2 style={{ marginBottom: 12 }}>Bir hata oluştu</h2>
            <p style={{ opacity: 0.85, fontSize: '0.85rem', lineHeight: 1.6, wordBreak: 'break-word' }}>
              {this.state.error?.message || 'Bilinmeyen hata'}
            </p>
            <button
              onClick={() => window.location.reload()}
              style={{ marginTop: 16, padding: '10px 18px', background: 'rgba(201,150,58,0.2)', border: '1px solid var(--gold)', color: 'var(--gold)', borderRadius: 8, cursor: 'pointer' }}
            >
              Yeniden dene
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function AnimatedRoutes({ user, onLogout, isAdmin, onUserUpdate }) {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait" onExitComplete={() => playPageTransition()}>
      <Routes location={location} key={location.pathname}>
        <Route
          path="/"
          element={
            <motion.div {...pageVariants} style={{ flex: 1 }}>
              <CharactersPage user={user} onLogout={onLogout} isAdmin={isAdmin} onUserUpdate={onUserUpdate} />
            </motion.div>
          }
        />
        <Route
          path="/create-character"
          element={
            <motion.div {...pageVariants} style={{ flex: 1 }}>
              <CreateCharacterPage user={user} />
            </motion.div>
          }
        />
        <Route
          path="/scenario/:characterId"
          element={
            <motion.div {...pageVariants} style={{ flex: 1 }}>
              <ScenarioPage user={user} />
            </motion.div>
          }
        />
        <Route
          path="/game/:sessionId"
          element={
            <motion.div {...pageVariants} style={{ flex: 1 }}>
              <GamePage user={user} />
            </motion.div>
          }
        />
        <Route
          path="/character/:characterId"
          element={
            <motion.div {...pageVariants} style={{ flex: 1 }}>
              <CharacterSheetPage user={user} />
            </motion.div>
          }
        />
        <Route
          path="/settings"
          element={
            <motion.div {...pageVariants} style={{ flex: 1 }}>
              <SettingsPage user={user} onUserUpdate={onUserUpdate} />
            </motion.div>
          }
        />
        <Route
          path="/hall-of-fame"
          element={
            <motion.div {...pageVariants} style={{ flex: 1 }}>
              <HallOfFamePage user={user} />
            </motion.div>
          }
        />
        <Route
          path="/achievements"
          element={
            <motion.div {...pageVariants} style={{ flex: 1 }}>
              <AchievementsPage user={user} />
            </motion.div>
          }
        />
        <Route
          path="/leaderboard"
          element={
            <motion.div {...pageVariants} style={{ flex: 1 }}>
              <LeaderboardPage user={user} />
            </motion.div>
          }
        />
        <Route
          path="/shop/:characterId"
          element={
            <motion.div {...pageVariants} style={{ flex: 1 }}>
              <ShopPage user={user} />
            </motion.div>
          }
        />
        <Route
          path="/admin"
          element={
            isAdmin ? (
              <motion.div {...pageVariants} style={{ flex: 1 }}>
                <AdminPage user={user} />
              </motion.div>
            ) : (
              <Navigate to="/" />
            )
          }
        />
        <Route
          path="/privacy-policy"
          element={
            <motion.div {...pageVariants} style={{ flex: 1 }}>
              <PrivacyPolicyPage />
            </motion.div>
          }
        />
        <Route
          path="/hesap-silme"
          element={
            <motion.div {...pageVariants} style={{ flex: 1 }}>
              <AccountDeletionPage />
            </motion.div>
          }
        />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </AnimatePresence>
  );
}

export default function App() {
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  // Bildirim iznini uygulama ilk açılışında hemen iste (kullanıcı login olsun olmasın).
  useEffect(() => {
    requestPushPermission().catch(() => {});
  }, []);

  useEffect(() => {
    if (firebaseInitError || !auth) {
      setLoading(false);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      if (fbUser) {
        try { localStorage.setItem('dnd_user_fb_uid', fbUser.uid); } catch {}
        registerPushToken(fbUser.uid).catch(() => {});
        configurePurchases(fbUser.uid).catch(() => {});
        try {
          await adminCheck();
          setIsAdmin(true);
        } catch (err) {
          setIsAdmin(false);
        }
      } else {
        setUser(null);
        setIsAdmin(false);
        try { localStorage.removeItem('dnd_user'); localStorage.removeItem('dnd_user_fb_uid'); } catch {}
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Auth state değiştiğinde backend ile senkronize et; eğer LoginPage'den
  // zaten user set edilmişse ve API hata verirse mevcut user'ı koru.
  useEffect(() => {
    if (!firebaseUser) return;
    let cancelled = false;
    (async () => {
      try {
        const token = await firebaseUser.getIdToken();
        const current = await apiGetCurrentUser(token);
        if (!cancelled) setUser(current.user || null);
      } catch (err) {
        console.error('Auth sync failed:', err);
        // Mevcut user varsa silme; yoksa null kalır.
      }
    })();
    return () => { cancelled = true; };
  }, [firebaseUser]);

  const handleLogout = async () => {
    await firebaseSignOut(auth);
    setUser(null);
    setFirebaseUser(null);
    setIsAdmin(false);
    try { localStorage.removeItem('dnd_user'); } catch {}
  };

  const handleUserUpdate = (updatedUser) => {
    setUser(updatedUser);
    try { localStorage.setItem('dnd_user', JSON.stringify(updatedUser)); } catch {}
  };

  if (firebaseInitError) {
    return (
      <div className="stone-bg" style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div style={{ maxWidth: 480, textAlign: 'center', color: 'var(--gold)', fontFamily: "'Cinzel', serif" }}>
          <h2 style={{ marginBottom: 12 }}>Bağlantı Hatası</h2>
          <p style={{ opacity: 0.85, fontSize: '0.9rem', lineHeight: 1.6 }}>
            Uygulama başlatılamadı: {firebaseInitError}
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="stone-bg" style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1.25rem', padding: '1.5rem', textAlign: 'center' }}>
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          style={{
            width: '5.5rem',
            height: '5.5rem',
            borderRadius: '50%',
            background: 'radial-gradient(circle at 30% 30%, rgba(212,160,58,0.35), rgba(122,92,16,0.15) 60%, transparent 70%)',
            border: '2px solid rgba(201,150,58,0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 28px rgba(201,150,58,0.25), inset 0 0 20px rgba(201,150,58,0.08)',
          }}
        >
          <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="var(--gold2)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 2v20M2 12h20" />
            <path d="M4.93 4.93l14.14 14.14M19.07 4.93L4.93 19.07" />
          </svg>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <h1 className="font-fantasy gold-shimmer" style={{ fontSize: '1.5rem', letterSpacing: '0.18em', margin: '0 0 0.35rem' }}>
            KADERİN SESİ
          </h1>
          <p style={{ fontFamily: "'Crimson Text', serif", color: 'var(--text-dim)', fontSize: '0.85rem', margin: 0 }}>
            Macera yükleniyor…
          </p>
        </motion.div>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
          style={{
            width: '1.6rem',
            height: '1.6rem',
            borderRadius: '50%',
            border: '2px solid rgba(92,74,42,0.4)',
            borderTopColor: 'var(--gold2)',
          }}
        />
      </div>
    );
  }

  const currentPath = window.location.pathname;
  if (!user && PUBLIC_PATHS.includes(currentPath)) {
    return (
      <AnimatePresence mode="wait">
        <Routes>
          <Route
            path="/privacy-policy"
            element={
              <motion.div {...pageVariants} style={{ flex: 1 }}>
                <PrivacyPolicyPage />
              </motion.div>
            }
          />
          <Route
            path="/hesap-silme"
            element={
              <motion.div {...pageVariants} style={{ flex: 1 }}>
                <AccountDeletionPage />
              </motion.div>
            }
          />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </AnimatePresence>
    );
  }

  if (!user) return <LoginPage onLogin={setUser} firebaseUser={firebaseUser} />;

  return (
    <ErrorBoundary>
      <AnimatedRoutes user={user} onLogout={handleLogout} isAdmin={isAdmin} onUserUpdate={handleUserUpdate} />
    </ErrorBoundary>
  );
}

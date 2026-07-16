import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
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
import ShopPage from './pages/ShopPage';
import AdminPage from './pages/AdminPage';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import AccountDeletionPage from './pages/AccountDeletionPage';
import { playPageTransition } from './utils/sounds';
import { apiGetCurrentUser, adminCheck } from './utils/api';

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

function AnimatedRoutes({ user, onLogout, isAdmin }) {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait" onExitComplete={() => playPageTransition()}>
      <Routes location={location} key={location.pathname}>
        <Route
          path="/"
          element={
            <motion.div {...pageVariants} style={{ flex: 1 }}>
              <CharactersPage user={user} onLogout={onLogout} isAdmin={isAdmin} />
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
              <SettingsPage user={user} isAdmin={isAdmin} />
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

  useEffect(() => {
    if (firebaseInitError || !auth) {
      setLoading(false);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      if (fbUser) {
        try {
          const token = await fbUser.getIdToken();
          const current = await apiGetCurrentUser(token);
          setUser(current.user);
          try { localStorage.setItem('dnd_user', JSON.stringify(current.user)); } catch {}
        } catch (err) {
          console.error('Failed to sync user:', err);
          setUser(null);
          try { localStorage.removeItem('dnd_user'); } catch {}
        }
        try {
          await adminCheck();
          setIsAdmin(true);
        } catch (err) {
          setIsAdmin(false);
        }
      } else {
        setUser(null);
        setIsAdmin(false);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    await firebaseSignOut(auth);
    setUser(null);
    setFirebaseUser(null);
    setIsAdmin(false);
    try { localStorage.removeItem('dnd_user'); } catch {}
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
      <div className="stone-bg" style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: 'var(--gold)', fontFamily: "'Cinzel', serif" }}>Yükleniyor...</span>
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

  return <AnimatedRoutes user={user} onLogout={handleLogout} isAdmin={isAdmin} />;
}

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { signOut as firebaseSignOut } from 'firebase/auth';
import { isSoundEnabled, toggleSound, getSoundVolume, setVolume, playClick } from '../utils/sounds';
import { getLang, setLang } from '../utils/i18n';
import { claimAdmin, deleteAccount } from '../utils/api';
import { auth } from '../firebase';
import Particles from '../components/Particles';

const TEXT_SIZES = [
  { key: 'small', label: 'Küçük', px: '13px' },
  { key: 'medium', label: 'Orta', px: '15px' },
  { key: 'large', label: 'Büyük', px: '17px' },
];

function getTextSize() {
  try { return localStorage.getItem('dnd_text_size') || 'medium'; } catch { return 'medium'; }
}

function applyTextSize(size) {
  const map = { small: '13px', medium: '15px', large: '17px' };
  document.documentElement.style.setProperty('--base-font-size', map[size] || '15px');
  try { localStorage.setItem('dnd_text_size', size); } catch {}
}

const LANGUAGES = [
  { key: 'tr', label: 'Türkçe', flag: '🇹🇷', note: 'Türkçe anlatı' },
  { key: 'en', label: 'English', flag: '🇬🇧', note: 'English narration' },
];

export default function SettingsPage({ isAdmin }) {
  const navigate = useNavigate();
  const [sound, setSound] = useState(isSoundEnabled());
  const [vol, setVol] = useState(getSoundVolume());
  const [textSize, setTextSize] = useState(getTextSize());
  const [theme, setTheme] = useState(
    () => localStorage.getItem('dnd_theme') || 'dark'
  );
  const [lang, setLangState] = useState(getLang);
  const [adminMsg, setAdminMsg] = useState('');
  const [claimingAdmin, setClaimingAdmin] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const handleDeleteAccount = async () => {
    if (!window.confirm('Hesabını ve tüm karakter/oyun verilerini kalıcı olarak silmek istediğine emin misin? Bu işlem geri alınamaz.')) return;
    if (!window.confirm('Son onay: Hesabın kalıcı olarak silinecek. Devam etmek istiyor musun?')) return;
    setDeletingAccount(true);
    setDeleteError('');
    try {
      await deleteAccount();
      await firebaseSignOut(auth);
      navigate('/');
    } catch (err) {
      setDeleteError(err.message || 'Hesap silinemedi, lütfen tekrar dene');
      setDeletingAccount(false);
    }
  };

  const handleClaimAdmin = async () => {
    setClaimingAdmin(true);
    setAdminMsg('');
    try {
      await claimAdmin();
      playClick();
      setAdminMsg('Yönetici yetkisi bu hesaba tanındı. Sayfayı yenile.');
    } catch (err) {
      setAdminMsg(err.message || 'İşlem başarısız');
    }
    setClaimingAdmin(false);
  };

  const handleSoundToggle = () => {
    const next = toggleSound();
    setSound(next);
  };

  const handleVolume = (e) => {
    const v = parseFloat(e.target.value);
    setVolume(v);
    setVol(v);
  };

  const handleTextSize = (size) => {
    setTextSize(size);
    applyTextSize(size);
    playClick();
  };

  const handleThemeToggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('dnd_theme', next);
    if (next === 'light') document.documentElement.setAttribute('data-theme', 'light');
    else document.documentElement.removeAttribute('data-theme');
    playClick();
  };

  const handleLang = (key) => {
    setLang(key);
    setLangState(key);
    playClick();
  };

  return (
    <div className="stone-bg" style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <Particles type="ember" count={8} />

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
          <h1
            className="font-fantasy gold-shimmer"
            style={{ fontSize: '1.3rem', letterSpacing: '0.1em', margin: 0 }}
          >
            AYARLAR
          </h1>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem 1rem', paddingBottom: '2rem' }}>

        {/* Sound */}
        <div className="stone-card" style={{ padding: '1.25rem', marginBottom: '1rem' }}>
          <h2
            className="font-fantasy"
            style={{ color: 'var(--gold)', fontSize: '0.9rem', letterSpacing: '0.12em', margin: '0 0 1rem' }}
          >
            SES
          </h2>

          <div
            style={{
              display: 'flex', alignItems: 'center',
              justifyContent: 'space-between', marginBottom: '1rem',
            }}
          >
            <span style={{ fontFamily: "'Crimson Text', serif", color: 'var(--text)', fontSize: '1rem' }}>
              Ses Efektleri
            </span>
            <motion.button
              whileTap={{ scale: 0.93 }}
              onClick={handleSoundToggle}
              style={{
                width: '54px', height: '30px', borderRadius: '15px',
                background: sound ? 'rgba(201,150,58,0.65)' : 'rgba(50,40,30,0.9)',
                border: `1px solid ${sound ? 'var(--gold)' : 'var(--border)'}`,
                cursor: 'pointer', position: 'relative',
                transition: 'background 0.25s, border-color 0.25s',
              }}
            >
              <div
                style={{
                  position: 'absolute', top: '4px',
                  left: sound ? '26px' : '4px',
                  width: '20px', height: '20px', borderRadius: '50%',
                  background: sound ? 'var(--gold)' : '#555',
                  transition: 'left 0.25s',
                }}
              />
            </motion.button>
          </div>

          {sound && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
              <span
                style={{
                  fontFamily: "'Crimson Text', serif", color: 'var(--text-dim)',
                  fontSize: '0.9rem', minWidth: '65px',
                }}
              >
                Ses: {Math.round(vol * 100)}%
              </span>
              <input
                type="range" min="0" max="1" step="0.05"
                value={vol}
                onChange={handleVolume}
                style={{ flex: 1, accentColor: 'var(--gold)', height: '20px' }}
              />
            </div>
          )}
        </div>

        {/* Theme */}
        <div className="stone-card" style={{ padding: '1.25rem', marginBottom: '1rem' }}>
          <h2
            className="font-fantasy"
            style={{ color: 'var(--gold)', fontSize: '0.9rem', letterSpacing: '0.12em', margin: '0 0 1rem' }}
          >
            TEMA
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <span style={{ fontFamily: "'Crimson Text', serif", color: 'var(--text)', fontSize: '1rem' }}>
                {theme === 'dark' ? 'Karanlık Mod' : 'Aydınlık Mod'}
              </span>
              <p style={{ fontFamily: "'Crimson Text', serif", color: 'var(--text-dim)', fontSize: '0.78rem', margin: '0.1rem 0 0' }}>
                {theme === 'dark' ? 'Orta Çağ loş palet' : 'Parşömen & gündüz palet'}
              </p>
            </div>
            <motion.button
              whileTap={{ scale: 0.93 }}
              onClick={handleThemeToggle}
              style={{
                width: '54px', height: '30px', borderRadius: '15px', flexShrink: 0,
                background: theme === 'light' ? 'rgba(201,150,58,0.65)' : 'rgba(50,40,30,0.9)',
                border: `1px solid ${theme === 'light' ? 'var(--gold)' : 'var(--border)'}`,
                cursor: 'pointer', position: 'relative',
                transition: 'background 0.25s, border-color 0.25s',
              }}
            >
              <div
                style={{
                  position: 'absolute', top: '4px',
                  left: theme === 'light' ? '26px' : '4px',
                  width: '20px', height: '20px', borderRadius: '50%',
                  background: theme === 'light' ? 'var(--gold)' : '#555',
                  transition: 'left 0.25s',
                }}
              />
            </motion.button>
          </div>
        </div>

        {/* Text size */}
        <div className="stone-card" style={{ padding: '1.25rem', marginBottom: '1rem' }}>
          <h2
            className="font-fantasy"
            style={{ color: 'var(--gold)', fontSize: '0.9rem', letterSpacing: '0.12em', margin: '0 0 1rem' }}
          >
            METİN BOYUTU
          </h2>
          <div style={{ display: 'flex', gap: '0.6rem' }}>
            {TEXT_SIZES.map(({ key, label, px }) => (
              <motion.button
                key={key}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleTextSize(key)}
                style={{
                  flex: 1, padding: '0.65rem 0', borderRadius: '8px', minHeight: '44px',
                  border: textSize === key ? '1px solid var(--gold)' : '1px solid var(--border)',
                  background: textSize === key ? 'rgba(201,150,58,0.15)' : 'rgba(0,0,0,0.3)',
                  color: textSize === key ? 'var(--gold)' : 'var(--text-dim)',
                  fontFamily: "'Cinzel', serif",
                  fontSize: px,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                {label}
              </motion.button>
            ))}
          </div>
          <p
            style={{
              marginTop: '0.65rem', fontFamily: "'Crimson Text', serif",
              color: 'var(--text-muted)', fontSize: '0.78rem', textAlign: 'center',
            }}
          >
            Boyut sayfayı yenilediğinizde kalıcı olur
          </p>
        </div>

        {/* Language */}
        <div className="stone-card" style={{ padding: '1.25rem', marginBottom: '1rem' }}>
          <h2
            className="font-fantasy"
            style={{ color: 'var(--gold)', fontSize: '0.9rem', letterSpacing: '0.12em', margin: '0 0 1rem' }}
          >
            {lang === 'en' ? 'LANGUAGE' : 'DİL'}
          </h2>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            {LANGUAGES.map(({ key, label, flag, note }) => (
              <motion.button
                key={key}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleLang(key)}
                style={{
                  flex: 1, padding: '0.85rem 0.5rem', borderRadius: '10px', minHeight: '72px',
                  border: lang === key ? '1px solid var(--gold)' : '1px solid var(--border)',
                  background: lang === key ? 'rgba(201,150,58,0.15)' : 'rgba(0,0,0,0.3)',
                  cursor: 'pointer', display: 'flex', flexDirection: 'column',
                  alignItems: 'center', gap: '0.3rem',
                  transition: 'all 0.2s',
                }}
              >
                <span style={{ fontSize: '1.6rem', lineHeight: 1 }}>{flag}</span>
                <span style={{
                  fontFamily: "'Cinzel', serif",
                  fontSize: '0.8rem',
                  color: lang === key ? 'var(--gold)' : 'var(--text-dim)',
                  fontWeight: lang === key ? 700 : 400,
                }}>{label}</span>
                <span style={{ fontFamily: "'Crimson Text', serif", fontSize: '0.7rem', color: 'var(--text-muted)' }}>{note}</span>
              </motion.button>
            ))}
          </div>
          {lang === 'en' && (
            <p style={{ fontFamily: "'Crimson Text', serif", color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: '0.65rem', textAlign: 'center' }}>
              The narrator will speak English from your next message.
            </p>
          )}
          {lang === 'tr' && (
            <p style={{ fontFamily: "'Crimson Text', serif", color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: '0.65rem', textAlign: 'center' }}>
              Anlatıcı bir sonraki mesajınızdan itibaren Türkçe konuşacak.
            </p>
          )}
        </div>

        {/* One-time admin claim (only until an admin account is set) */}
        {!isAdmin && (
          <div className="stone-card" style={{ padding: '1.25rem', marginBottom: '1rem' }}>
            <h2
              className="font-fantasy"
              style={{ color: 'var(--gold)', fontSize: '0.9rem', letterSpacing: '0.12em', margin: '0 0 0.75rem' }}
            >
              YÖNETİCİ ERİŞİMİ
            </h2>
            <p style={{ fontFamily: "'Crimson Text', serif", color: 'var(--text-dim)', fontSize: '0.82rem', margin: '0 0 0.75rem' }}>
              Bu hesabı Tanrı Modu yöneticisi yap. Bu işlem yalnızca hiç yönetici atanmamışsa çalışır ve tek seferliktir.
            </p>
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={handleClaimAdmin}
              disabled={claimingAdmin}
              className="btn-dark"
              style={{ fontSize: '0.85rem', padding: '0.5rem 1rem', borderColor: 'var(--gold)', color: 'var(--gold)' }}
            >
              {claimingAdmin ? '...' : 'Bu Hesabı Yönetici Yap'}
            </motion.button>
            {adminMsg && (
              <p style={{ fontFamily: "'Crimson Text', serif", color: 'var(--text)', fontSize: '0.82rem', marginTop: '0.6rem' }}>
                {adminMsg}
              </p>
            )}
          </div>
        )}

        {/* App info */}
        <div className="stone-card" style={{ padding: '1.25rem', textAlign: 'center', marginBottom: '1rem' }}>
          <p
            style={{
              fontFamily: "'Crimson Text', serif",
              color: 'var(--text-dim)', fontSize: '0.9rem', margin: 0,
            }}
          >
            Kader'in Sesi — Firebase v1.1
          </p>
          <p
            style={{
              fontFamily: "'Crimson Text', serif",
              color: 'var(--text-muted)', fontSize: '0.78rem', margin: '0.25rem 0 0',
            }}
          >
            AI destekli D&D macera oyunu
          </p>
        </div>

        {/* Legal */}
        <div className="stone-card" style={{ padding: '1.25rem', textAlign: 'center' }}>
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={() => { playClick(); navigate('/privacy-policy'); }}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--gold)',
              fontFamily: "'Cinzel', serif",
              fontSize: '0.8rem',
              textDecoration: 'underline',
              cursor: 'pointer',
            }}
          >
            Gizlilik Politikası
          </motion.button>
        </div>

        {/* Danger zone */}
        <div className="stone-card" style={{ padding: '1.25rem', textAlign: 'center', marginTop: '1rem', borderColor: 'rgba(180,60,60,0.4)' }}>
          <h2
            className="font-fantasy"
            style={{ color: '#c85454', fontSize: '0.9rem', letterSpacing: '0.12em', margin: '0 0 0.75rem' }}
          >
            TEHLİKELİ BÖLGE
          </h2>
          <p style={{ fontFamily: "'Crimson Text', serif", color: 'var(--text-dim)', fontSize: '0.82rem', margin: '0 0 0.75rem' }}>
            Hesabını ve tüm karakter, oturum ve oyun verilerini kalıcı olarak silersin. Bu işlem geri alınamaz.
          </p>
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={handleDeleteAccount}
            disabled={deletingAccount}
            style={{
              padding: '0.55rem 1.1rem', borderRadius: '8px', minHeight: '44px',
              background: 'rgba(180,60,60,0.15)', border: '1px solid #c85454',
              color: '#e88', fontFamily: "'Cinzel', serif", fontSize: '0.85rem',
              cursor: deletingAccount ? 'default' : 'pointer', opacity: deletingAccount ? 0.6 : 1,
            }}
          >
            {deletingAccount ? 'Siliniyor...' : 'Hesabımı Sil'}
          </motion.button>
          {deleteError && (
            <p style={{ fontFamily: "'Crimson Text', serif", color: '#e88', fontSize: '0.82rem', marginTop: '0.6rem' }}>
              {deleteError}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

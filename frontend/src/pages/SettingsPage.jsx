import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { signOut as firebaseSignOut } from 'firebase/auth';
import { isSoundEnabled, toggleSound, getSoundVolume, setVolume, playClick } from '../utils/sounds';
import {
  isTtsSupported, isTtsEnabled, setTtsEnabled, getTtsRate, setTtsRate, stopSpeech,
  getTtsPitch, setTtsPitch, getTtsGender, setTtsGender,
  getPreferredVoiceUri, setPreferredVoiceUri, getAvailableVoices, speak,
} from '../utils/tts';
import { getLang, setLang, useLang, t } from '../utils/i18n';
import { claimAdmin, deleteAccount, updateCharacterSettings, activatePremium, apiGetCurrentUser, verifyPurchase } from '../utils/api';
import {
  isBillingAvailable,
  initBilling,
  purchaseProduct,
  restoreBillingPurchases,
  getPurchaseToken,
  getProductId,
  getBillingProducts,
} from '../utils/billing';
import { auth } from '../firebase';
import Particles from '../components/Particles';
import { Sparkles, Crown } from 'lucide-react';

const TEXT_SIZES = [
  { key: 'small', labelKey: 'text_small', px: '13px' },
  { key: 'medium', labelKey: 'text_medium', px: '15px' },
  { key: 'large', labelKey: 'text_large', px: '17px' },
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
  { key: 'tr', label: 'Türkçe', flag: '🇹🇷', noteKey: 'lang_note_tr' },
  { key: 'en', label: 'English', flag: '🇬🇧', noteKey: 'lang_note_en' },
];

const TONES = [
  { key: 'dramatic', labelKey: 'tone_dramatic_label', descKey: 'tone_dramatic_desc' },
  { key: 'comedic', labelKey: 'tone_comedic_label', descKey: 'tone_comedic_desc' },
  { key: 'dark', labelKey: 'tone_dark_label', descKey: 'tone_dark_desc' },
  { key: 'epic', labelKey: 'tone_epic_label', descKey: 'tone_epic_desc' },
];

const PREMIUM_PRODUCT_ID = 'premium_lifetime';      // Tek seferlik ödeme
const PREMIUM_SUBSCRIPTION_ID = 'premium_monthly';  // Aylık abonelik (kullanılacaksa)
const USE_SUBSCRIPTION = true;                       // true = aylık abonelik kullanılır

export default function SettingsPage({ user, isAdmin, onUserUpdate }) {
  const navigate = useNavigate();
  const [sound, setSound] = useState(isSoundEnabled());
  const [vol, setVol] = useState(getSoundVolume());
  const [ttsSupported] = useState(isTtsSupported);
  const [tts, setTts] = useState(isTtsEnabled);
  const [ttsRate, setTtsRateState] = useState(getTtsRate);
  const [ttsPitch, setTtsPitchState] = useState(getTtsPitch);
  const [ttsGender, setTtsGenderState] = useState(getTtsGender);
  const [ttsVoice, setTtsVoiceState] = useState(getPreferredVoiceUri);
  const [ttsVoices, setTtsVoices] = useState([]);
  const [textSize, setTextSize] = useState(getTextSize());
  const [theme, setTheme] = useState(
    () => localStorage.getItem('dnd_theme') || 'dark'
  );
  const [lang, setLangState] = useState(getLang);
  useLang(); // re-render on language change
  const [adminMsg, setAdminMsg] = useState('');
  const [claimingAdmin, setClaimingAdmin] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [tone, setTone] = useState(() => {
    try { return localStorage.getItem('dnd_narrator_tone') || 'dramatic'; } catch { return 'dramatic'; }
  });
  const [activeCharacterId, setActiveCharacterId] = useState(null);
  const [toneSaving, setToneSaving] = useState(false);
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [purchasingId, setPurchasingId] = useState(null);
  const [restoring, setRestoring] = useState(false);
  const [premiumMsg, setPremiumMsg] = useState('');

  const isPremiumActive = Boolean(user?.is_premium);
  const billingAvailable = isBillingAvailable();

  const activeProductId = USE_SUBSCRIPTION ? PREMIUM_SUBSCRIPTION_ID : PREMIUM_PRODUCT_ID;

  useEffect(() => {
    try {
      const id = localStorage.getItem('dnd_active_character_id');
      if (id) setActiveCharacterId(id);
    } catch {}
  }, []);

  // Cihazdaki TTS sesleri asenkron yüklenir; liste hazır olunca tazele.
  useEffect(() => {
    if (!ttsSupported) return undefined;
    const refresh = () => setTtsVoices(getAvailableVoices(lang === 'en' ? 'en' : 'tr'));
    refresh();
    window.speechSynthesis.addEventListener?.('voiceschanged', refresh);
    const retry = setTimeout(refresh, 600);
    return () => {
      clearTimeout(retry);
      window.speechSynthesis.removeEventListener?.('voiceschanged', refresh);
    };
  }, [ttsSupported, lang]);

  // Sayfadan ayrılırken test seslendirmesi devam etmesin
  useEffect(() => () => stopSpeech(), []);

  useEffect(() => {
    if (isPremiumActive || !billingAvailable) return;
    setLoadingProducts(true);
    initBilling([PREMIUM_PRODUCT_ID], USE_SUBSCRIPTION ? [PREMIUM_SUBSCRIPTION_ID] : [])
      .then(() => {
        setProducts(getBillingProducts());
        setLoadingProducts(false);
      })
      .catch((err) => {
        console.error('billing init error:', err);
        setPremiumMsg(err.message || t('premium_purchase_error'));
        setLoadingProducts(false);
      });
  }, [isPremiumActive, billingAvailable]);

  const handleBillingPurchase = async (productId) => {
    setPurchasingId(productId);
    setPremiumMsg('');
    try {
      const transaction = await purchaseProduct(productId);
      const token = getPurchaseToken(transaction);
      const pid = getProductId(transaction);
      if (!token || !pid) {
        throw new Error('Purchase token alınamadı');
      }
      const result = await verifyPurchase(pid, token, USE_SUBSCRIPTION);
      onUserUpdate?.(result.user);
      setPremiumMsg(t('premium_purchase_success'));
      playClick();
    } catch (err) {
      if (err?.userCancelled || err?.code === 'USER_CANCELED') {
        setPremiumMsg(t('premium_purchase_cancelled'));
      } else {
        setPremiumMsg(err.message || t('premium_purchase_error'));
      }
    }
    setPurchasingId(null);
  };

  const handleBillingRestore = async () => {
    setRestoring(true);
    setPremiumMsg('');
    try {
      await restoreBillingPurchases();
      // Try to verify the active premium purchase if found
      const activeProduct = getBillingProducts().find((p) => p.id === activeProductId);
      const transaction = activeProduct?.transactions?.[0] || activeProduct?.purchase?.transaction;
      const token = transaction ? getPurchaseToken(transaction) : null;
      if (token) {
        const result = await verifyPurchase(activeProductId, token, USE_SUBSCRIPTION);
        onUserUpdate?.(result.user);
        setPremiumMsg(t('premium_purchase_success'));
      } else {
        setPremiumMsg(t('premium_restore_none'));
      }
    } catch (err) {
      setPremiumMsg(err.message || t('premium_purchase_error'));
    }
    setRestoring(false);
  };

  const handleActivatePremium = async () => {
    setPurchasingId('activate');
    setPremiumMsg('');
    try {
      await activatePremium();
      const token = await auth.currentUser.getIdToken();
      const current = await apiGetCurrentUser(token);
      onUserUpdate?.(current.user);
      setPremiumMsg(t('premium_activate_success'));
      playClick();
    } catch (err) {
      setPremiumMsg(err.message || t('premium_purchase_error'));
    }
    setPurchasingId(null);
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm(t('delete_account_confirm1'))) return;
    if (!window.confirm(t('delete_account_confirm2'))) return;
    setDeletingAccount(true);
    setDeleteError('');
    try {
      await deleteAccount();
      await firebaseSignOut(auth);
      navigate('/');
    } catch (err) {
      setDeleteError(err.message || t('delete_account_fail'));
      setDeletingAccount(false);
    }
  };

  const handleClaimAdmin = async () => {
    setClaimingAdmin(true);
    setAdminMsg('');
    try {
      await claimAdmin();
      playClick();
      setAdminMsg(t('admin_claimed'));
    } catch (err) {
      setAdminMsg(err.message || t('admin_fail'));
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

  const handleTtsToggle = () => {
    const next = !tts;
    setTtsEnabled(next);
    setTts(next);
    if (!next) stopSpeech();
    playClick();
  };

  const handleTtsRate = (e) => {
    const rate = parseFloat(e.target.value);
    setTtsRate(rate);
    setTtsRateState(rate);
  };

  const handleTtsPitch = (e) => {
    const pitch = parseFloat(e.target.value);
    setTtsPitch(pitch);
    setTtsPitchState(pitch);
  };

  const handleTtsGender = (gender) => {
    setTtsGender(gender);
    setTtsGenderState(gender);
    // Elle seçilmiş ses varsa cinsiyet tercihini ezmesin diye sıfırla
    setPreferredVoiceUri('');
    setTtsVoiceState('');
    playClick();
  };

  const handleTtsVoice = (e) => {
    const uri = e.target.value;
    setPreferredVoiceUri(uri);
    setTtsVoiceState(uri);
  };

  const handleTtsTest = () => {
    stopSpeech();
    speak(t('tts_test_text'), { id: `tts-test-${Date.now()}`, lang: getLang() });
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

  const handleTone = async (key) => {
    if (key === tone) return;
    setTone(key);
    try { localStorage.setItem('dnd_narrator_tone', key); } catch {}
    if (activeCharacterId) {
      setToneSaving(true);
      try {
        await updateCharacterSettings(activeCharacterId, { narrator_tone: key });
      } catch (err) {
        console.error('Tone save failed:', err);
      } finally {
        setToneSaving(false);
      }
    }
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
            {t('back')}
          </motion.button>
          <h1
            className="font-fantasy gold-shimmer"
            style={{ fontSize: '1.3rem', letterSpacing: '0.1em', margin: 0 }}
          >
            {t('settings_title')}
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
            {t('sound_title')}
          </h2>

          <div
            style={{
              display: 'flex', alignItems: 'center',
              justifyContent: 'space-between', marginBottom: '1rem',
            }}
          >
            <span style={{ fontFamily: "'Crimson Text', serif", color: 'var(--text)', fontSize: '1rem' }}>
              {t('sound_effects')}
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
                {t('volume', Math.round(vol * 100))}
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

        {/* Voice narration (TTS) */}
        <div className="stone-card" style={{ padding: '1.25rem', marginBottom: '1rem' }}>
          <h2
            className="font-fantasy"
            style={{ color: 'var(--gold)', fontSize: '0.9rem', letterSpacing: '0.12em', margin: '0 0 1rem' }}
          >
            {t('tts_title')}
          </h2>

          {!ttsSupported ? (
            <p style={{ fontFamily: "'Crimson Text', serif", color: 'var(--text-dim)', fontSize: '0.85rem', margin: 0 }}>
              {t('tts_unsupported')}
            </p>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: tts ? '1rem' : 0 }}>
                <div style={{ minWidth: 0 }}>
                  <span style={{ fontFamily: "'Crimson Text', serif", color: 'var(--text)', fontSize: '1rem' }}>
                    {t('tts_title')}
                  </span>
                  <p style={{ fontFamily: "'Crimson Text', serif", color: 'var(--text-dim)', fontSize: '0.78rem', margin: '0.1rem 0 0' }}>
                    {t('tts_desc')}
                  </p>
                </div>
                <motion.button
                  whileTap={{ scale: 0.93 }}
                  onClick={handleTtsToggle}
                  aria-label={t('tts_title')}
                  style={{
                    width: '54px', height: '30px', borderRadius: '15px', flexShrink: 0,
                    background: tts ? 'rgba(201,150,58,0.65)' : 'rgba(50,40,30,0.9)',
                    border: `1px solid ${tts ? 'var(--gold)' : 'var(--border)'}`,
                    cursor: 'pointer', position: 'relative',
                    transition: 'background 0.25s, border-color 0.25s',
                  }}
                >
                  <div
                    style={{
                      position: 'absolute', top: '4px',
                      left: tts ? '26px' : '4px',
                      width: '20px', height: '20px', borderRadius: '50%',
                      background: tts ? 'var(--gold)' : '#555',
                      transition: 'left 0.25s',
                    }}
                  />
                </motion.button>
              </div>

              {tts && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {/* Ses cinsiyeti */}
                  <div>
                    <span
                      style={{
                        display: 'block', marginBottom: '0.5rem',
                        fontFamily: "'Crimson Text', serif", color: 'var(--text-dim)', fontSize: '0.9rem',
                      }}
                    >
                      {t('tts_gender')}
                    </span>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      {[
                        { id: 'male', label: t('tts_male') },
                        { id: 'female', label: t('tts_female') },
                        { id: 'auto', label: t('tts_auto') },
                      ].map((option) => (
                        <motion.button
                          key={option.id}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleTtsGender(option.id)}
                          style={{
                            flex: 1, minHeight: '40px', borderRadius: '8px', cursor: 'pointer',
                            fontFamily: "'Crimson Text', serif", fontSize: '0.88rem',
                            color: ttsGender === option.id ? 'var(--gold)' : 'var(--text-dim)',
                            background: ttsGender === option.id ? 'rgba(201,150,58,0.16)' : 'rgba(0,0,0,0.28)',
                            border: `1px solid ${ttsGender === option.id ? 'var(--gold)' : 'var(--border)'}`,
                          }}
                        >
                          {option.label}
                        </motion.button>
                      ))}
                    </div>
                  </div>

                  {/* Ses seçimi (cihazda yüklü sesler) */}
                  {ttsVoices.length > 0 && (
                    <div>
                      <span
                        style={{
                          display: 'block', marginBottom: '0.5rem',
                          fontFamily: "'Crimson Text', serif", color: 'var(--text-dim)', fontSize: '0.9rem',
                        }}
                      >
                        {t('tts_voice')}
                      </span>
                      <select
                        value={ttsVoice}
                        onChange={handleTtsVoice}
                        style={{
                          width: '100%', minHeight: '42px', padding: '0 0.6rem', borderRadius: '8px',
                          fontFamily: "'Crimson Text', serif", fontSize: '0.9rem',
                          color: 'var(--text)', background: 'rgba(0,0,0,0.35)',
                          border: '1px solid var(--border)',
                        }}
                      >
                        <option value="">{t('tts_voice_auto')}</option>
                        {ttsVoices.map((voice) => (
                          <option key={voice.voiceURI} value={voice.voiceURI}>
                            {voice.name} ({voice.lang})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Okuma hızı */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                    <span
                      style={{
                        fontFamily: "'Crimson Text', serif", color: 'var(--text-dim)',
                        fontSize: '0.9rem', minWidth: '105px',
                      }}
                    >
                      {t('tts_speed')} {ttsRate.toFixed(2)}x
                    </span>
                    <input
                      type="range" min="0.6" max="1.5" step="0.05"
                      value={ttsRate}
                      onChange={handleTtsRate}
                      style={{ flex: 1, accentColor: 'var(--gold)', height: '20px' }}
                    />
                  </div>

                  {/* Ses tonu (kalınlık) */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                    <span
                      style={{
                        fontFamily: "'Crimson Text', serif", color: 'var(--text-dim)',
                        fontSize: '0.9rem', minWidth: '105px',
                      }}
                    >
                      {t('tts_pitch')} {ttsPitch.toFixed(2)}
                    </span>
                    <input
                      type="range" min="0.5" max="1.3" step="0.05"
                      value={ttsPitch}
                      onChange={handleTtsPitch}
                      style={{ flex: 1, accentColor: 'var(--gold)', height: '20px' }}
                    />
                  </div>

                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={handleTtsTest}
                    className="btn-dark"
                    style={{ minHeight: '44px', fontSize: '0.9rem' }}
                  >
                    {t('tts_test')}
                  </motion.button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Theme */}
        <div className="stone-card" style={{ padding: '1.25rem', marginBottom: '1rem' }}>
          <h2
            className="font-fantasy"
            style={{ color: 'var(--gold)', fontSize: '0.9rem', letterSpacing: '0.12em', margin: '0 0 1rem' }}
          >
            {t('theme_title')}
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <span style={{ fontFamily: "'Crimson Text', serif", color: 'var(--text)', fontSize: '1rem' }}>
                {theme === 'dark' ? t('dark_mode') : t('light_mode')}
              </span>
              <p style={{ fontFamily: "'Crimson Text', serif", color: 'var(--text-dim)', fontSize: '0.78rem', margin: '0.1rem 0 0' }}>
                {theme === 'dark' ? t('dark_desc') : t('light_desc')}
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
            {t('text_size_title')}
          </h2>
          <div style={{ display: 'flex', gap: '0.6rem' }}>
            {TEXT_SIZES.map(({ key, labelKey, px }) => (
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
                {t(labelKey)}
              </motion.button>
            ))}
          </div>
          <p
            style={{
              marginTop: '0.65rem', fontFamily: "'Crimson Text', serif",
              color: 'var(--text-muted)', fontSize: '0.78rem', textAlign: 'center',
            }}
          >
            {t('text_size_note')}
          </p>
        </div>

        {/* Language */}
        <div className="stone-card" style={{ padding: '1.25rem', marginBottom: '1rem' }}>
          <h2
            className="font-fantasy"
            style={{ color: 'var(--gold)', fontSize: '0.9rem', letterSpacing: '0.12em', margin: '0 0 1rem' }}
          >
            {t('lang_title')}
          </h2>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            {LANGUAGES.map(({ key, label, flag, noteKey }) => (
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
                <span style={{ fontFamily: "'Crimson Text', serif", fontSize: '0.7rem', color: 'var(--text-muted)' }}>{t(noteKey)}</span>
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

        {/* Narrator Tone */}
        <div className="stone-card" style={{ padding: '1.25rem', marginBottom: '1rem' }}>
          <h2
            className="font-fantasy"
            style={{ color: 'var(--gold)', fontSize: '0.9rem', letterSpacing: '0.12em', margin: '0 0 1rem' }}
          >
            {t('tone_title')}
          </h2>
          <p style={{ fontFamily: "'Crimson Text', serif", color: 'var(--text-dim)', fontSize: '0.82rem', margin: '0 0 0.75rem' }}>
            {t('tone_note')}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {TONES.map((toneItem) => (
              <motion.button
                key={toneItem.key}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleTone(toneItem.key)}
                disabled={toneSaving}
                style={{
                  width: '100%',
                  padding: '0.85rem 1rem',
                  borderRadius: '10px',
                  border: tone === toneItem.key ? '1px solid var(--gold)' : '1px solid var(--border)',
                  background: tone === toneItem.key ? 'rgba(201,150,58,0.12)' : 'rgba(0,0,0,0.25)',
                  color: 'var(--text)',
                  textAlign: 'left',
                  cursor: toneSaving ? 'wait' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  opacity: toneSaving ? 0.7 : 1,
                }}
              >
                <div>
                  <div style={{ fontFamily: "'Cinzel', serif", fontWeight: 700, color: tone === toneItem.key ? 'var(--gold)' : 'var(--text)' }}>
                    {t(toneItem.labelKey)}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.15rem' }}>
                    {t(toneItem.descKey)}
                  </div>
                </div>
                {tone === toneItem.key && <Sparkles size={18} color="var(--gold)" />}
              </motion.button>
            ))}
          </div>
          {toneSaving && (
            <p style={{ fontFamily: "'Crimson Text', serif", color: 'var(--text-dim)', fontSize: '0.75rem', marginTop: '0.6rem', textAlign: 'center' }}>
              {t('tone_saving')}
            </p>
          )}
        </div>

        {/* Premium */}
        <div className="stone-card" style={{ padding: '1.25rem', marginBottom: '1rem', borderColor: isPremiumActive ? 'var(--gold)' : undefined }}>
          <h2
            className="font-fantasy"
            style={{ color: 'var(--gold)', fontSize: '0.9rem', letterSpacing: '0.12em', margin: '0 0 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <Crown size={16} /> {t('premium_title')}
          </h2>

          {isPremiumActive ? (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <Crown size={18} color="var(--gold)" />
                <span style={{ fontFamily: "'Cinzel', serif", color: 'var(--gold)', fontWeight: 700 }}>
                  {t('premium_active_badge')}
                </span>
              </div>
              <p style={{ fontFamily: "'Crimson Text', serif", color: 'var(--text-dim)', fontSize: '0.85rem', margin: '0 0 0.75rem' }}>
                {t('premium_until_label')}: {user?.premium_until ? new Date(user.premium_until).toLocaleDateString() : t('premium_lifetime')}
              </p>
            </div>
          ) : (
            <div>
              <p style={{ fontFamily: "'Crimson Text', serif", color: 'var(--text-dim)', fontSize: '0.85rem', margin: '0 0 0.75rem' }}>
                {t('premium_not_active_desc')}
              </p>
              <ul style={{ margin: '0 0 1rem', paddingLeft: '1.1rem', fontFamily: "'Crimson Text', serif", color: 'var(--text)', fontSize: '0.82rem' }}>
                <li>{t('premium_benefit_no_ads')}</li>
                <li>{t('premium_benefit_unlimited_moves')}</li>
                <li>{t('premium_benefit_wheel_spins')}</li>
              </ul>

              {!billingAvailable ? (
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  onClick={handleActivatePremium}
                  disabled={purchasingId !== null}
                  className="btn-primary"
                  style={{ width: '100%', marginBottom: '0.75rem' }}
                >
                  {purchasingId === 'activate' ? t('premium_purchasing') : t('premium_activate_btn')}
                </motion.button>
              ) : loadingProducts ? (
                <p style={{ fontFamily: "'Crimson Text', serif", color: 'var(--text-dim)', fontSize: '0.82rem', textAlign: 'center' }}>
                  {t('premium_loading_offerings')}
                </p>
              ) : products.length === 0 ? (
                <p style={{ fontFamily: "'Crimson Text', serif", color: 'var(--text-muted)', fontSize: '0.82rem', textAlign: 'center' }}>
                  {t('premium_no_offerings')}
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '0.75rem' }}>
                  {products.map((product) => (
                    <motion.button
                      key={product.id}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => handleBillingPurchase(product.id)}
                      disabled={purchasingId !== null}
                      style={{
                        width: '100%', padding: '0.85rem 1rem', borderRadius: '10px', minHeight: '48px',
                        border: '1px solid var(--gold)', background: 'rgba(201,150,58,0.15)',
                        color: 'var(--gold)', fontFamily: "'Cinzel', serif", fontSize: '0.9rem', fontWeight: 700,
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        cursor: purchasingId !== null ? 'wait' : 'pointer', opacity: purchasingId !== null ? 0.7 : 1,
                      }}
                    >
                      <span>{product.title || product.id}</span>
                      <span>{purchasingId === product.id ? t('premium_purchasing') : (product.prices?.[0]?.price || product.price || '')}</span>
                    </motion.button>
                  ))}
                </div>
              )}

              {billingAvailable && (
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  onClick={handleBillingRestore}
                  disabled={restoring}
                  className="btn-dark"
                  style={{ width: '100%', fontSize: '0.82rem', padding: '0.55rem 1rem' }}
                >
                  {restoring ? t('premium_restoring') : t('premium_restore_btn')}
                </motion.button>
              )}
            </div>
          )}

          {premiumMsg && (
            <p style={{ fontFamily: "'Crimson Text', serif", color: 'var(--text)', fontSize: '0.82rem', marginTop: '0.75rem', textAlign: 'center' }}>
              {premiumMsg}
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
            {lang === 'en' ? 'The Voice of Destiny' : "Kader'in Sesi"} — v2
          </p>
          <p
            style={{
              fontFamily: "'Crimson Text', serif",
              color: 'var(--text-muted)', fontSize: '0.78rem', margin: '0.25rem 0 0',
            }}
          >
            {t('app_tagline')}
          </p>
        </div>

        {/* Rate & Support */}
        <div className="stone-card" style={{ padding: '1.25rem', marginBottom: '1rem' }}>
          <h2
            className="font-fantasy"
            style={{ color: 'var(--gold)', fontSize: '0.9rem', letterSpacing: '0.12em', margin: '0 0 0.75rem' }}
          >
            {t('support_title')}
          </h2>
          <p style={{ fontFamily: "'Crimson Text', serif", color: 'var(--text-dim)', fontSize: '0.82rem', margin: '0 0 0.75rem' }}>
            {t('support_desc')}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={() => { playClick(); window.open('https://play.google.com/store/apps/details?id=com.kaderinsesi.app', '_blank'); }}
              className="btn-dark"
              style={{ fontSize: '0.85rem', padding: '0.55rem 1rem', borderColor: 'var(--gold)', color: 'var(--gold)' }}
            >
              {t('rate_us')}
            </motion.button>
            <a
              href="mailto:SupportKaderinSesi@gmail.com"
              onClick={() => playClick()}
              style={{
                fontFamily: "'Crimson Text', serif",
                color: 'var(--text-dim)',
                fontSize: '0.82rem',
                textDecoration: 'underline',
                textAlign: 'center',
              }}
            >
              SupportKaderinSesi@gmail.com
            </a>
          </div>
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
            {t('privacy_policy')}
          </motion.button>
        </div>

        {/* Danger zone */}
        <div className="stone-card" style={{ padding: '1.25rem', textAlign: 'center', marginTop: '1rem', borderColor: 'rgba(180,60,60,0.4)' }}>
          <h2
            className="font-fantasy"
            style={{ color: '#c85454', fontSize: '0.9rem', letterSpacing: '0.12em', margin: '0 0 0.75rem' }}
          >
            {t('danger_zone')}
          </h2>
          <p style={{ fontFamily: "'Crimson Text', serif", color: 'var(--text-dim)', fontSize: '0.82rem', margin: '0 0 0.75rem' }}>
            {t('delete_account_desc')}
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
            {deletingAccount ? t('deleting') : t('delete_account_btn')}
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

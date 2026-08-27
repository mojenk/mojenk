import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { getCharacters, getSessions, deleteCharacter, deleteSession, getLeaderboard, shopCatalog, shopCosmeticEquip, verifyCosmeticPurchase, verifyPurchase } from '../utils/api';
import { isBillingAvailable, initBilling, purchaseProduct, getPurchaseToken, getProductId, getBillingProducts } from '../utils/billing';
import { COSMETIC_PLAY_PRODUCTS } from '../utils/cosmeticProducts';
import { playClick, playDamage, playError } from '../utils/sounds';
import Particles from '../components/Particles';
import AnnouncementsBar from '../components/AnnouncementsBar';
import { Sparkles, Swords, Castle, Skull, Heart, Coins, ScrollText, Trash2, X, Dices, Crown, ChevronRight, Play, Trophy, Gem } from 'lucide-react';
import { useLang, t, getLang } from '../utils/i18n';

const RACE_PORTRAITS = {
  'İnsan': '/races/insan.png',
  'Elf': '/races/elf.png',
  'Cüce': '/races/cuce.png',
  'Yarı-Ork': '/races/yariork.png',
  'Hobit': '/races/hobit.png',
  'İblissoyu': '/races/iblissoyu.png',
  'Gnom': '/races/gnom.png',
  'Ejderha Doğumlu': '/races/ejderhadogumlu.png',
  'Melek Soylu': '/races/meleksoylu.png',
};

function formatLbDuration(seconds) {
  if (!seconds) return '0';
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}${t('leaderboard_day')}${h}${t('leaderboard_hour')}`;
  if (h > 0) return `${h}${t('leaderboard_hour')}${m}${t('leaderboard_min')}`;
  return `${m}${t('leaderboard_min')}`;
}

export default function CharactersPage({ user, onLogout, isAdmin, onUserUpdate }) {
  const [characters, setCharacters] = useState([]);
  const [loading, setLoading] = useState(true);
  useLang(); // re-render on language change
  const [error, setError] = useState('');
  const [sessionMap, setSessionMap] = useState({});
  const [expandedChar, setExpandedChar] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [createdNotice, setCreatedNotice] = useState('');
  const [lbData, setLbData] = useState(null);
  const lbLists = lbData ? { level: lbData.level, gold: lbData.gold, survival: lbData.survival || [] } : null;
  const [cosmetics, setCosmetics] = useState([]);
  const [storeProducts, setStoreProducts] = useState([]);
  const [cosBusy, setCosBusy] = useState(null);
  const [cosNotice, setCosNotice] = useState('');
  const [lbTab, setLbTab] = useState('level');
  const navigate = useNavigate();
  const location = useLocation();

  const loadData = async () => {
    if (!user?.id) {
      setLoading(false);
      setError(t('login_required'));
      return;
    }
    setLoading(true);
    setError('');
    try {
      const d = await getCharacters(user.id);
      const chars = d.characters || [];
      setCharacters(chars);
      // Load sessions for all characters in parallel
      const sessionsResults = await Promise.all(
        chars.map((c) => getSessions(c.id).catch(() => ({ sessions: [] })))
      );
      const map = {};
      chars.forEach((c, i) => {
        map[c.id] = (sessionsResults[i].sessions || []).slice(0, 5);
      });
      setSessionMap(map);
      shopCatalog()
        .then((d) => setCosmetics((d.items || []).filter((it) => it.play_product_id)))
        .catch(() => {});
      if (isBillingAvailable()) {
        initBilling([...COSMETIC_PLAY_PRODUCTS, 'premium_lifetime'], ['premium_monthly'], { onProductUpdated: () => setStoreProducts(getBillingProducts()) })
          .then(() => setStoreProducts(getBillingProducts()))
          .catch(() => {});
      }
      getLeaderboard()
        .then((lb) => { setLbData({ level: lb.level || [], gold: lb.gold || [], survival: lb.survival || [] }); })
        .catch((err) => { console.error('leaderboard fetch error:', err); setLbData({ level: [], gold: [], error: err.message || 'hata' }); });
    } catch (err) {
      setError(err.message || t('data_load_fail'));
    }
    setLoading(false);
  };

  const handlePremiumBuy = async () => {
    if (cosBusy) return;
    setCosBusy('premium');
    setCosNotice('');
    try {
      const transaction = await purchaseProduct('premium_monthly');
      const token = getPurchaseToken(transaction);
      const pid = getProductId(transaction);
      if (!token || !pid) throw new Error('Satın alma jetonu alınamadı');
      const result = await verifyPurchase(pid, token, true);
      onUserUpdate?.(result.user);
      setCosNotice(t('premium_purchase_success'));
    } catch (err) {
      if (!/cancel/i.test(err.message || '')) setCosNotice(err.message || t('premium_purchase_error'));
    } finally {
      setCosBusy(null);
    }
  };

  const handleCosmeticBuy = async (item) => {
    if (cosBusy) return;
    const target = characters.find((c) => c.status !== 'dead') || characters[0];
    if (!target) {
      setCosNotice(t('cosmetic_need_character'));
      return;
    }
    setCosBusy(item.id);
    setCosNotice('');
    try {
      const transaction = await purchaseProduct(item.play_product_id);
      const token = getPurchaseToken(transaction);
      const pid = getProductId(transaction);
      if (!token || !pid) throw new Error('Satın alma jetonu alınamadı');
      await verifyCosmeticPurchase(pid, token, target.id);
      const granted = item.type === 'pack' ? (item.pack_grants || []) : [item.id];
      setCharacters((prev) => prev.map((c) => c.id === target.id
        ? { ...c, owned_cosmetics: [...new Set([...(c.owned_cosmetics || []), ...granted])] }
        : c));
      setCosNotice(`${item.name} → ${target.name} (${t('shop_owned')})`);
    } catch (err) {
      if (!/cancel/i.test(err.message || '')) setCosNotice(err.message || 'Satın alma başarısız');
    } finally {
      setCosBusy(null);
    }
  };

  const COSMETIC_FIELDS = { title: 'equipped_title', frame: 'equipped_frame', dice_skin: 'equipped_dice_skin' };

  const handleCosmeticEquip = async (item) => {
    if (cosBusy) return;
    const target = characters.find((c) => c.status !== 'dead') || characters[0];
    if (!target || !item.cosmetic_kind) return;
    const field = COSMETIC_FIELDS[item.cosmetic_kind];
    const isEquipped = target[field] === item.cosmetic_value;
    setCosBusy(item.id);
    setCosNotice('');
    try {
      await shopCosmeticEquip(target.id, isEquipped ? null : item.id, item.cosmetic_kind);
      setCharacters((prev) => prev.map((c) => c.id === target.id
        ? { ...c, [field]: isEquipped ? null : item.cosmetic_value }
        : c));
      setCosNotice(`${item.name}: ${isEquipped ? t('shop_deactivate') : t('shop_activate')} ✓`);
    } catch (err) {
      setCosNotice(err.message || 'İşlem başarısız');
    } finally {
      setCosBusy(null);
    }
  };

  useEffect(() => { loadData(); }, [user.id]);

  useEffect(() => {
    if (loading) return;
    const createdId = location.state?.createdCharacterId;
    if (createdId) {
      if (characters.some((c) => c.id === createdId)) {
        const createdChar = characters.find((c) => c.id === createdId);
        setExpandedChar(createdId);
        setCreatedNotice(t('hero_created_notice', createdChar?.name || ''));
      } else {
        loadData();
      }
      navigate('/', { replace: true });
      return;
    }

  }, [loading, location.state, characters, navigate]);

  const handleDelete = async (charId) => {
    setDeleting(true);
    try {
      await deleteCharacter(charId, user.id);
      playDamage();
      setCharacters((prev) => prev.filter((c) => c.id !== charId));
      setDeleteConfirm(null);
    } catch (err) {
      playError();
      setError(err.message || t('delete_fail'));
    }
    setDeleting(false);
  };

  const handleDeleteSession = async (sessionId, charId) => {
    try {
      await deleteSession(sessionId);
      playClick();
      setSessionMap((prev) => ({
        ...prev,
        [charId]: (prev[charId] || []).filter((s) => s.id !== sessionId),
      }));
    } catch (err) {
      playError();
    }
  };

  const formatDate = (d) => {
    if (!d) return '';
    const dt = new Date(d);
    return dt.toLocaleDateString(getLang() === 'tr' ? 'tr-TR' : 'en-GB', { day: 'numeric', month: 'short' });
  };

  // En son oynanan macera (devam et kartı için)
  const latestAdventure = useMemo(() => {
    let best = null;
    for (const c of characters) {
      if (c.status === 'dead') continue;
      for (const s of sessionMap[c.id] || []) {
        const ts = new Date(s.updated_at || s.created_at || 0).getTime();
        if (!best || ts > best.ts) best = { ts, session: s, character: c };
      }
    }
    return best;
  }, [characters, sessionMap]);

  return (
    <div
      style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', position: 'relative', background: '#0f0b06' }}
    >
      {/* Tavern background */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, background: "url('/scenarios/tavern.png') center 20%/cover no-repeat", filter: 'blur(5px) brightness(0.85)', transform: 'scale(1.06)', pointerEvents: 'none' }} />
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, background: 'linear-gradient(180deg, rgba(15,11,6,0.82) 0%, rgba(15,11,6,0.68) 30%, rgba(15,11,6,0.88) 70%, rgba(15,11,6,0.96) 100%)', pointerEvents: 'none' }} />
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      <Particles type="ember" count={10} />

      {/* Header */}
      <div
        style={{
          padding: '1.1rem 1rem 0.9rem',
          borderBottom: '1px solid rgba(74,59,34,0.7)',
          background: 'rgba(13,10,5,0.75)',
          backdropFilter: 'blur(8px)',
          flexShrink: 0,
        }}
        className="pt-safe"
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1
              className="font-fantasy gold-shimmer"
              style={{
                fontSize: '1.4rem',
                letterSpacing: '0.1em',
                textShadow: '0 0 14px rgba(201,150,58,0.5)',
                margin: 0,
              }}
            >
              KADER'İN SESİ
            </h1>
            <p
              style={{
                color: 'var(--text-dim)',
                fontFamily: "'Crimson Text', serif",
                fontSize: '0.85rem',
                margin: '0.15rem 0 0',
              }}
            >
              {t('welcome')},{' '}
              <span style={{ color: 'var(--gold2)' }}>{user.username}</span>
            </p>
          </div>
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={onLogout}
            className="btn-dark"
            style={{ fontSize: '0.78rem', padding: '0.4rem 0.9rem' }}
          >
            {t('logout')}
          </motion.button>
        </div>
        {/* Nav row */}
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={() => { playClick(); navigate('/hall-of-fame'); }}
            className="btn-dark"
            style={{ fontSize: '0.75rem', padding: '0.35rem 0.85rem', minHeight: '36px' }}
          >
            {t('hall_of_fame_btn')}
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={() => { playClick(); navigate('/achievements'); }}
            className="btn-dark"
            style={{ fontSize: '0.75rem', padding: '0.35rem 0.85rem', minHeight: '36px' }}
          >
            {t('achievements_btn')}
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={() => { playClick(); navigate('/settings'); }}
            className="btn-dark"
            style={{ fontSize: '0.75rem', padding: '0.35rem 0.85rem', minHeight: '36px' }}
          >
            {t('settings_btn')}
          </motion.button>
          {isAdmin && (
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={() => { playClick(); navigate('/admin'); }}
              className="btn-dark"
              style={{ fontSize: '0.75rem', padding: '0.35rem 0.85rem', minHeight: '36px', borderColor: 'var(--gold)', color: 'var(--gold)' }}
            >
              {t('admin_mode_btn')}
            </motion.button>
          )}
        </div>

      </div>

      <AnnouncementsBar />

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', paddingBottom: '2rem' }}>
        {/* Premium strip (premium olmayan kullanıcıya) */}
        {!user?.is_premium && (
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => { playClick(); navigate('/settings'); }}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: '0.65rem',
              padding: '0.6rem 0.85rem',
              marginBottom: '0.85rem',
              borderRadius: '10px',
              background: 'linear-gradient(90deg, rgba(212,160,58,0.16) 0%, rgba(212,160,58,0.05) 100%)',
              border: '1px solid rgba(212,160,58,0.4)',
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <span
              style={{
                width: '1.7rem',
                height: '1.7rem',
                borderRadius: '7px',
                flexShrink: 0,
                background: 'linear-gradient(135deg, var(--gold2), #8a6420)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#1a1206',
              }}
            >
              <Crown size={15} />
            </span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span
                className="font-fantasy"
                style={{ display: 'block', fontSize: '0.8rem', letterSpacing: '0.07em', color: 'var(--gold2)' }}
              >
                {t('premium_strip_title')}
              </span>
              <span style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-dim)', fontFamily: "'Crimson Text', serif", marginTop: '0.05rem' }}>
                {t('premium_strip_sub')}
              </span>
            </span>
            <ChevronRight size={16} style={{ color: 'var(--gold2)', flexShrink: 0 }} />
          </motion.button>
        )}

        {/* Maceraya devam et kartı */}
        {!loading && latestAdventure && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => { playClick(); navigate(`/game/${latestAdventure.session.id}?characterId=${latestAdventure.character.id}`); }}
            style={{
              marginBottom: '1rem',
              borderRadius: '12px',
              overflow: 'hidden',
              border: '1px solid var(--border)',
              position: 'relative',
              cursor: 'pointer',
              boxShadow: '0 4px 18px rgba(0,0,0,0.5)',
            }}
          >
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: `url('/scenarios/${latestAdventure.session.scenario || 'tavern'}.png') center 30%/cover no-repeat`,
              }}
            />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, rgba(13,10,5,0.92) 20%, rgba(13,10,5,0.45) 100%)' }} />
            <div style={{ position: 'relative', padding: '0.9rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div
                style={{
                  width: '2.9rem',
                  height: '2.9rem',
                  borderRadius: '50%',
                  flexShrink: 0,
                  border: '2px solid var(--gold)',
                  overflow: 'hidden',
                  boxShadow: '0 0 12px rgba(201,150,58,0.3)',
                  background: '#000',
                }}
              >
                <img
                  src={RACE_PORTRAITS[latestAdventure.character.race] || '/races/insan.png'}
                  alt={latestAdventure.character.race}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="font-fantasy" style={{ fontSize: '0.58rem', letterSpacing: '0.18em', color: 'var(--gold)', marginBottom: '0.15rem' }}>
                  {t('resume_adventure_label')}
                </div>
                <div
                  className="font-fantasy"
                  style={{ fontSize: '0.95rem', color: '#d8c9a3', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                >
                  {latestAdventure.session.title || latestAdventure.session.scenario || 'Macera'}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontFamily: "'Crimson Text', serif", marginTop: '0.1rem' }}>
                  {latestAdventure.character.name} · Sv.{latestAdventure.character.level} · {t('last_move_label')}: {formatDate(latestAdventure.session.updated_at || latestAdventure.session.created_at)}
                </div>
              </div>
              <span
                className="font-fantasy"
                style={{
                  flexShrink: 0,
                  background: 'linear-gradient(135deg, var(--gold2), #a07818)',
                  borderRadius: '8px',
                  color: '#1a1206',
                  fontWeight: 700,
                  fontSize: '0.72rem',
                  letterSpacing: '0.08em',
                  padding: '0.5rem 0.85rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                }}
              >
                <Play size={12} /> {t('resume_btn')}
              </span>
            </div>
          </motion.div>
        )}

        {/* Section header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '1rem',
          }}
        >
          <h2
            className="font-fantasy"
            style={{ color: 'var(--text)', fontSize: '1.1rem', margin: 0 }}
          >
            {t('my_heroes')}
          </h2>
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={() => { playClick(); navigate('/create-character'); }}
            className="btn-gold"
            style={{ fontSize: '0.8rem', padding: '0.45rem 1rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
          >
            <Sparkles size={14} /> {t('new_hero')}
          </motion.button>
        </div>

        {/* Error banner */}
        {createdNotice && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{
              padding: '0.6rem 0.8rem',
              marginBottom: '1rem',
              borderRadius: '8px',
              background: 'rgba(74,222,128,0.1)',
              border: '1px solid rgba(74,222,128,0.35)',
              color: '#4ade80',
              fontFamily: "'Crimson Text', serif",
              fontSize: '0.9rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '0.75rem',
            }}
          >
            <span>{createdNotice}</span>
            <button
              onClick={() => setCreatedNotice('')}
              style={{
                background: 'none',
                border: '1px solid rgba(74,222,128,0.45)',
                color: '#4ade80',
                borderRadius: '6px',
                padding: '0.2rem 0.5rem',
                cursor: 'pointer',
                fontFamily: "'Crimson Text', serif",
                fontSize: '0.8rem',
              }}
            >
              {t('ok')}
            </button>
          </motion.div>
        )}

        {/* Error banner */}
        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{
              padding: '0.6rem 0.8rem',
              marginBottom: '1rem',
              borderRadius: '8px',
              background: 'rgba(122,21,21,0.15)',
              border: '1px solid rgba(122,21,21,0.4)',
              color: 'var(--blood)',
              fontFamily: "'Crimson Text', serif",
              fontSize: '0.9rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span>{error}</span>
            <button
              onClick={loadData}
              style={{
                background: 'none',
                border: '1px solid var(--blood)',
                color: 'var(--blood)',
                borderRadius: '6px',
                padding: '0.2rem 0.6rem',
                cursor: 'pointer',
                fontFamily: "'Crimson Text', serif",
                fontSize: '0.8rem',
              }}
            >
              Tekrar Dene
            </button>
          </motion.div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '5rem 0', color: 'var(--text-dim)' }}>
            <div style={{ marginBottom: '1rem', animation: 'spin 1.5s linear infinite', display: 'flex', justifyContent: 'center' }}><Swords size={40} /></div>
            <p style={{ fontFamily: "'Crimson Text', serif" }}>{t('loading')}</p>
          </div>
        ) : characters.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ textAlign: 'center', padding: '4rem 1rem' }}
          >
            <div className="animate-float" style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'center', color: 'var(--gold)' }}><Castle size={56} /></div>
            <p style={{ color: 'var(--text)', fontFamily: "'Crimson Text', serif", fontSize: '1.1rem', marginBottom: '0.4rem' }}>
              {t('no_heroes_yet')}
            </p>
            <p style={{ color: 'var(--text-dim)', fontFamily: "'Crimson Text', serif", fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              {t('ready_to_write_legend')}
            </p>
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={() => { playClick(); navigate('/create-character'); }}
              className="btn-gold"
              style={{ fontSize: '1rem', padding: '0.75rem 2rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <Swords size={18} /> {t('create_first_hero')}
            </motion.button>
          </motion.div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {characters.map((char, i) => {
              const hpPct = Math.max(0, Math.min(100, (char.hp / char.max_hp) * 100));
              const hpColorClass = hpPct <= 20 ? 'hp-bar-critical' : hpPct <= 50 ? 'hp-bar-warn' : 'hp-bar-safe';
              const sessions = sessionMap[char.id] || [];
              const isExpanded = expandedChar === char.id;
              const isDead = char.status === 'dead';

              return (
                <motion.div
                  key={char.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.08 }}
                  className="stone-card"
                  style={{
                    padding: '1rem',
                    background: 'rgba(13,10,5,0.8)',
                    backdropFilter: 'blur(4px)',
                    borderRadius: '12px',
                    opacity: isDead ? 0.5 : 1,
                    filter: isDead ? 'grayscale(0.7)' : 'none',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.85rem' }}>
                    {/* Race portrait */}
                    <div
                      style={{
                        width: '3.5rem',
                        height: '3.5rem',
                        borderRadius: '10px',
                        overflow: 'hidden',
                        flexShrink: 0,
                        border: '1px solid rgba(92,74,42,0.6)',
                        background: 'rgba(0,0,0,0.4)',
                      }}
                    >
                      <img
                        src={RACE_PORTRAITS[char.race] || '/races/insan.png'}
                        alt={char.race}
                        style={{
                          width: '100%', height: '100%', objectFit: 'cover',
                          filter: isDead ? 'grayscale(1)' : 'none',
                        }}
                      />
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <h3 className="font-fantasy gold-text" style={{ fontSize: '1.05rem', margin: 0 }}>
                          {char.name}
                        </h3>
                        <span
                          style={{
                            background: 'rgba(201,150,58,0.18)',
                            border: '1px solid var(--border)',
                            color: 'var(--gold)',
                            fontFamily: "'Cinzel', serif",
                            fontSize: '0.6rem',
                            padding: '0.1rem 0.45rem',
                            borderRadius: '20px',
                          }}
                        >
                          Sv.{char.level}
                        </span>
                        {isDead && (
                          <span style={{ color: 'var(--blood)', fontSize: '0.65rem', fontFamily: "'Cinzel', serif", display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                            <Skull size={11} /> DÜŞTÜ
                          </span>
                        )}
                      </div>
                      <p style={{ color: 'var(--text-dim)', fontFamily: "'Crimson Text', serif", fontSize: '0.85rem', margin: '0.15rem 0 0' }}>
                        {char.race} · {char.class}
                      </p>
                    </div>

                    {/* HP + Gold */}
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ color: 'var(--blood)', fontFamily: "'Crimson Text', serif", fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                        <Heart size={13} /> {char.hp}/{char.max_hp}
                      </div>
                      <div style={{ color: 'var(--gold)', fontFamily: "'Crimson Text', serif", fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', marginTop: '0.15rem' }}>
                        <Coins size={12} /> {char.gold}
                      </div>
                    </div>
                  </div>

                  {/* HP Bar */}
                  <div
                    style={{
                      marginTop: '0.75rem',
                      background: 'rgba(0,0,0,0.4)',
                      borderRadius: '99px',
                      height: '6px',
                      overflow: 'hidden',
                    }}
                  >
                    <div className={`hp-bar ${hpColorClass}`} style={{ width: `${hpPct}%`, height: '100%', borderRadius: '99px' }} />
                  </div>

                  {/* Sessions list */}
                  {sessions.length > 0 && (
                    <div style={{ marginTop: '0.65rem' }}>
                      <button
                        onClick={() => { playClick(); setExpandedChar(isExpanded ? null : char.id); }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--text-dim)',
                          fontFamily: "'Crimson Text', serif",
                          fontSize: '0.8rem',
                          cursor: 'pointer',
                          padding: 0,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                        }}
                      >
                        <span style={{ transform: isExpanded ? 'rotate(90deg)' : 'none', display: 'inline-block', transition: 'transform 0.2s' }}>▶</span>
                        {sessions.length} Macera
                      </button>

                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            style={{ overflow: 'hidden', marginTop: '0.4rem' }}
                          >
                            {sessions.map((s) => (
                              <div
                                key={s.id}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  padding: '0.4rem 0.5rem',
                                  borderRadius: '6px',
                                  background: 'rgba(0,0,0,0.2)',
                                  marginBottom: '0.3rem',
                                }}
                              >
                                <div style={{ minWidth: 0, flex: 1 }}>
                                  <div style={{
                                    color: 'var(--text)',
                                    fontFamily: "'Crimson Text', serif",
                                    fontSize: '0.82rem',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.3rem',
                                  }}>
                                    <ScrollText size={12} style={{ flexShrink: 0 }} /> {s.title || s.scenario || 'Macera'}
                                  </div>
                                  <div style={{ color: 'var(--text-dim)', fontSize: '0.7rem', fontFamily: "'Crimson Text', serif" }}>
                                    {formatDate(s.updated_at || s.created_at)}
                                  </div>
                                </div>
                                <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
                                  <motion.button
                                    whileTap={{ scale: 0.96 }}
                                    onClick={() => { playClick(); navigate(`/game/${s.id}?characterId=${char.id}`); }}
                                    className="btn-gold"
                                    style={{ fontSize: '0.72rem', padding: '0.3rem 0.6rem' }}
                                  >
                                    Devam
                                  </motion.button>
                                  <motion.button
                                    whileTap={{ scale: 0.96 }}
                                    onClick={() => handleDeleteSession(s.id, char.id)}
                                    style={{
                                      background: 'rgba(122,21,21,0.2)',
                                      border: '1px solid rgba(122,21,21,0.4)',
                                      color: 'var(--blood)',
                                      borderRadius: '6px',
                                      fontSize: '0.72rem',
                                      padding: '0.3rem 0.5rem',
                                      cursor: 'pointer',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                    }}
                                  >
                                    <X size={12} />
                                  </motion.button>
                                </div>
                              </div>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}

                  {/* Action buttons */}
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.85rem' }}>
                    {!isDead && (
                      <motion.button
                        whileTap={{ scale: 0.96 }}
                        onClick={() => { playClick(); navigate(`/scenario/${char.id}`); }}
                        className="btn-gold"
                        style={{ flex: 1, fontSize: '0.85rem', padding: '0.55rem 0', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
                      >
                        <Dices size={16} /> {t('new_adventure')}
                      </motion.button>
                    )}
                    <motion.button
                      whileTap={{ scale: 0.96 }}
                      onClick={() => { playClick(); navigate(`/character/${char.id}`); }}
                      className="btn-dark"
                      style={{ padding: '0.55rem 0.8rem', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center' }}
                    >
                      <ScrollText size={16} />
                    </motion.button>
                    <motion.button
                      whileTap={{ scale: 0.96 }}
                      onClick={() => { playClick(); setDeleteConfirm(char.id); }}
                      style={{
                        background: 'rgba(122,21,21,0.15)',
                        border: '1px solid rgba(122,21,21,0.4)',
                        color: 'var(--blood)',
                        borderRadius: '8px',
                        padding: '0.55rem 0.7rem',
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                      }}
                    >
                      <Trash2 size={16} />
                    </motion.button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
        {/* Kozmetik Magaza — gercek parayla (ana ekran) */}
        {(cosmetics.length > 0 || !user?.is_premium) && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="stone-card"
            style={{ margin: '0 1rem 1rem', padding: '0.85rem 0.9rem' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.55rem' }}>
              <Gem size={16} style={{ color: 'var(--gold)' }} />
              <span className="font-fantasy" style={{ color: 'var(--gold2)', fontSize: '0.9rem', letterSpacing: '0.08em' }}>
                {t('cosmetic_store_title')}
              </span>
            </div>
            {characters.length > 0 && (
              <p style={{ color: 'var(--text-dim)', fontFamily: "'Crimson Text', serif", fontSize: '0.7rem', margin: '0 0 0.5rem' }}>
                {t('cosmetic_store_target')}: {(characters.find((c) => c.status !== 'dead') || characters[0])?.name}
              </p>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(4.6rem, 1fr))', gap: '0.5rem' }}>
              {!user?.is_premium && (
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={handlePremiumBuy}
                  disabled={cosBusy === 'premium'}
                  style={{
                    background: 'linear-gradient(145deg, rgba(201,150,58,0.25), rgba(201,150,58,0.08))',
                    border: '1px solid rgba(232,193,90,0.65)',
                    borderRadius: '8px',
                    padding: '0.4rem 0.25rem',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem',
                    cursor: 'pointer', opacity: cosBusy === 'premium' ? 0.6 : 1,
                    boxShadow: '0 0 12px rgba(201,150,58,0.25)',
                  }}
                >
                  <div style={{ width: '3.2rem', height: '3.2rem', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(201,150,58,0.15)' }}>
                    <Crown size={26} style={{ color: '#e8c15a' }} />
                  </div>
                  <span className="font-fantasy" style={{ color: '#e8c15a', fontSize: '0.58rem', textAlign: 'center', lineHeight: 1.15 }}>
                    {t('premium_monthly')}
                  </span>
                  <span style={{ color: 'var(--gold)', fontFamily: "'Cinzel', serif", fontSize: '0.62rem', fontWeight: 700 }}>
                    {(storeProducts.find((sp) => sp.id === 'premium_monthly')?.pricing?.price)
                      || (storeProducts.find((sp) => sp.id === 'premium_monthly')?.price)
                      || t('shop_real_money')}
                  </span>
                </motion.button>
              )}
              {cosmetics.map((item) => {
                const price = (storeProducts.find((sp) => sp.id === item.play_product_id)?.pricing?.price)
                  || (storeProducts.find((sp) => sp.id === item.play_product_id)?.price)
                  || null;
                const cosTarget = characters.find((c) => c.status !== 'dead') || characters[0];
                const ownedList = Array.isArray(cosTarget?.owned_cosmetics) ? cosTarget.owned_cosmetics : [];
                const isPack = item.type === 'pack';
                const owned = isPack
                  ? (item.pack_grants || []).every((g) => ownedList.includes(g))
                  : ownedList.includes(item.id);
                const eqField = item.cosmetic_kind ? COSMETIC_FIELDS[item.cosmetic_kind] : null;
                const equipped = Boolean(eqField && cosTarget?.[eqField] === item.cosmetic_value);
                const canToggle = owned && !isPack && eqField;
                return (
                  <motion.button
                    key={item.id}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => (canToggle ? handleCosmeticEquip(item) : owned ? null : handleCosmeticBuy(item))}
                    disabled={cosBusy === item.id || (owned && !canToggle)}
                    style={{
                      background: equipped ? 'rgba(201,150,58,0.22)' : 'rgba(201,150,58,0.06)',
                      border: equipped ? '1px solid rgba(232,193,90,0.85)' : owned ? '1px solid rgba(201,150,58,0.55)' : '1px solid rgba(92,74,42,0.5)',
                      borderRadius: '8px',
                      padding: '0.4rem 0.25rem',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem',
                      cursor: owned && !canToggle ? 'default' : 'pointer',
                      opacity: cosBusy === item.id ? 0.6 : 1,
                      boxShadow: equipped ? '0 0 10px rgba(201,150,58,0.35)' : 'none',
                    }}
                  >
                    <div style={{ width: '3.2rem', height: '3.2rem', borderRadius: '6px', overflow: 'hidden', background: 'rgba(0,0,0,0.35)' }}>
                      {item.image ? (
                        <img src={item.image} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
                      ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Gem size={20} style={{ color: 'var(--gold)' }} />
                        </div>
                      )}
                    </div>
                    <span className="font-fantasy" style={{ color: 'var(--parch)', fontSize: '0.58rem', textAlign: 'center', lineHeight: 1.15 }}>
                      {item.name}
                    </span>
                    <span style={{ color: equipped ? '#e8c15a' : 'var(--gold)', fontFamily: "'Cinzel', serif", fontSize: '0.62rem', fontWeight: 700 }}>
                      {canToggle
                        ? (equipped ? t('shop_deactivate') : t('shop_activate'))
                        : owned
                          ? t('shop_owned')
                          : (price || t('shop_real_money'))}
                    </span>
                  </motion.button>
                );
              })}
            </div>
            {cosNotice && (
              <p style={{ color: 'var(--gold2)', fontFamily: "'Crimson Text', serif", fontSize: '0.75rem', margin: '0.5rem 0 0', textAlign: 'center' }}>
                {cosNotice}
              </p>
            )}
          </motion.div>
        )}

        {/* Gomulu Liderlik Tablosu — top 5 */}
        {lbData && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="stone-card"
            style={{ margin: '0 1rem 1.5rem', padding: '0.85rem 0.9rem' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.55rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <Trophy size={16} style={{ color: 'var(--gold)' }} />
                <span className="font-fantasy" style={{ color: 'var(--gold2)', fontSize: '0.9rem', letterSpacing: '0.08em' }}>
                  {t('leaderboard_title')}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '0.35rem' }}>
                {['level', 'gold', 'survival'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => { playClick(); setLbTab(tab); }}
                    className={lbTab === tab ? 'btn-gold' : 'btn-dark'}
                    style={{ fontSize: '0.65rem', padding: '0.2rem 0.55rem', minHeight: '28px' }}
                  >
                    {tab === 'level' ? t('leaderboard_tab_level') : tab === 'gold' ? t('leaderboard_tab_gold') : t('leaderboard_tab_survival')}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              {lbLists[lbTab].length === 0 && (
                <p style={{ color: 'var(--text-dim)', fontFamily: "'Crimson Text', serif", fontSize: '0.78rem', textAlign: 'center', padding: '0.5rem 0', margin: 0 }}>
                  {lbData.error ? lbData.error : t('leaderboard_empty')}
                </p>
              )}
              {lbLists[lbTab].slice(0, 5).map((e) => (
                <div
                  key={e.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.55rem',
                    padding: '0.35rem 0.5rem', borderRadius: '6px',
                    background: e.is_own ? 'rgba(201,162,39,0.12)' : 'rgba(255,255,255,0.02)',
                    border: e.is_own ? '1px solid rgba(232,193,90,0.45)' : '1px solid transparent',
                  }}
                >
                  <span
                    className="font-fantasy"
                    style={{
                      width: '1.4rem', textAlign: 'center', fontSize: '0.8rem', fontWeight: 700,
                      color: e.rank === 1 ? '#e8c15a' : e.rank === 2 ? '#c9c9d4' : e.rank === 3 ? '#b58150' : 'var(--text-dim)',
                    }}
                  >
                    {e.rank}
                  </span>
                  <div style={{ width: '1.7rem', height: '1.7rem', borderRadius: '50%', overflow: 'hidden', border: '1px solid rgba(92,74,42,0.5)', flexShrink: 0 }}>
                    <img src={e.portrait || '/races/insan.png'} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span className="font-fantasy" style={{ color: 'var(--text)', fontSize: '0.78rem' }}>
                      {e.name}
                    </span>
                    {e.title && (
                      <span style={{ color: '#c9a227', fontFamily: "'Crimson Text', serif", fontStyle: 'italic', fontSize: '0.65rem', marginLeft: '0.3rem' }}>
                        «{e.title}»
                      </span>
                    )}
                  </div>
                  <span className="font-fantasy" style={{ color: '#e8c15a', fontSize: '0.78rem', fontWeight: 600, flexShrink: 0 }}>
                    {lbTab === 'level' ? `${t('leaderboard_level')}${e.level}` : lbTab === 'gold' ? e.gold : formatLbDuration(e.survived_seconds)}
                  </span>
                </div>
              ))}
            </div>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => { playClick(); navigate('/leaderboard'); }}
              className="btn-dark"
              style={{ width: '100%', marginTop: '0.6rem', fontSize: '0.72rem', padding: '0.4rem', minHeight: '34px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem' }}
            >
              {t('leaderboard_view_all')} <ChevronRight size={14} />
            </motion.button>
          </motion.div>
        )}
      </div>

      {/* Delete confirmation overlay */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.75)',
              zIndex: 100,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1.5rem',
            }}
            onClick={() => !deleting && setDeleteConfirm(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="stone-card"
              style={{ padding: '1.5rem', maxWidth: '20rem', width: '100%', textAlign: 'center' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ marginBottom: '0.75rem', display: 'flex', justifyContent: 'center', color: 'var(--blood)' }}><Skull size={40} /></div>
              <h3
                className="font-fantasy"
                style={{ color: 'var(--blood)', fontSize: '1rem', margin: '0 0 0.5rem' }}
              >{t('delete_hero_title')}</h3>
              <p style={{ color: 'var(--text-dim)', fontFamily: "'Crimson Text', serif", fontSize: '0.9rem', marginBottom: '1rem' }}>
                {t("delete_hero_desc", characters.find((c) => c.id === deleteConfirm)?.name || "")}
              </p>
              <div style={{ display: 'flex', gap: '0.6rem' }}>
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  onClick={() => setDeleteConfirm(null)}
                  className="btn-dark"
                  disabled={deleting}
                  style={{ flex: 1, fontSize: '0.9rem', padding: '0.5rem 0' }}
                >{t('cancel')}</motion.button>
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  onClick={() => handleDelete(deleteConfirm)}
                  disabled={deleting}
                  style={{
                    flex: 1,
                    background: 'rgba(155,32,32,0.25)',
                    border: '1px solid rgba(155,32,32,0.6)',
                    color: '#ff6b6b',
                    fontFamily: "'Cinzel', serif",
                    fontSize: '0.9rem',
                    padding: '0.5rem 0',
                    borderRadius: '8px',
                    cursor: deleting ? 'not-allowed' : 'pointer',
                    opacity: deleting ? 0.5 : 1,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.4rem',
                  }}
                >
                  {deleting ? '...' : (<><Skull size={15} /> {t('delete')}</>)}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      </div>

    </div>
  );
}

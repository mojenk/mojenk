import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Coins, ShoppingBag, Backpack } from 'lucide-react';
import { getItemIcon } from '../utils/icons';
import { getCharacter, shopCatalog, shopBuy, shopSell } from '../utils/api';
import { playClick, playHeal, playError, playLevelUp } from '../utils/sounds';
import Particles from '../components/Particles';

const CATEGORY_ORDER = ['Tüketici', 'Silah', 'Zırh', 'Çeşitli'];

// Turkish category label -> item type key, so getItemIcon() can resolve the
// correct lucide icon for each category tab.
const CATEGORY_TYPE = {
  'Tüketici': 'potion',
  'Silah':    'weapon',
  'Zırh':     'armor',
  'Çeşitli':  'misc',
};

const TABS = [
  { key: 'buy', label: 'Satın Al', Icon: ShoppingBag },
  { key: 'sell', label: 'Sat', Icon: Coins },
];

function Toast({ msg, type, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2200);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      style={{
        position: 'fixed', bottom: '5rem', left: '50%', transform: 'translateX(-50%)',
        zIndex: 200, padding: '0.6rem 1.2rem', borderRadius: '10px',
        background: type === 'success' ? 'rgba(20,40,15,0.97)' : 'rgba(40,10,10,0.97)',
        border: `1px solid ${type === 'success' ? 'rgba(60,160,60,0.6)' : 'var(--blood)'}`,
        color: type === 'success' ? '#6dd66d' : 'var(--crimson)',
        fontFamily: "'Crimson Text', serif", fontSize: '0.92rem',
        boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
        whiteSpace: 'nowrap', maxWidth: '90vw',
      }}
    >
      {msg}
    </motion.div>
  );
}

export default function ShopPage({ user }) {
  const { characterId } = useParams();
  const navigate = useNavigate();

  const [character, setCharacter] = useState(null);
  const [inventory, setInventory] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [tab, setTab] = useState('buy');
  const [activeCategory, setActiveCategory] = useState('Tüketici');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null); // itemId being bought/sold
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => setToast({ msg, type });

  const load = useCallback(async () => {
    try {
      const [charData, catData] = await Promise.all([
        getCharacter(characterId),
        shopCatalog(),
      ]);
      setCharacter(charData.character);
      setInventory(charData.inventory || []);
      setCatalog(catData.items || []);
    } catch (err) {
      showToast('Yüklenemedi', 'error');
    } finally {
      setLoading(false);
    }
  }, [characterId]);

  useEffect(() => { load(); }, [load]);

  const handleBuy = async (item) => {
    if (busy) return;
    setBusy(item.id);
    try {
      const res = await shopBuy(characterId, item.id);
      setCharacter((c) => ({ ...c, gold: res.gold }));
      await load(); // refresh inventory
      showToast(res.message || `${item.name} satın alındı!`, 'success');
      playHeal();
    } catch (err) {
      showToast(err.message || 'Satın alınamadı', 'error');
      playError();
    } finally {
      setBusy(null);
    }
  };

  const handleSell = async (invItem) => {
    if (busy) return;
    setBusy(invItem.id);
    try {
      const res = await shopSell(characterId, invItem.id);
      setCharacter((c) => ({ ...c, gold: res.gold }));
      await load();
      showToast(res.message || 'Satıldı!', 'success');
      playLevelUp();
    } catch (err) {
      showToast(err.message || 'Satılamadı', 'error');
      playError();
    } finally {
      setBusy(null);
    }
  };

  const categorized = CATEGORY_ORDER.reduce((acc, cat) => {
    acc[cat] = catalog.filter((i) => i.category === cat);
    return acc;
  }, {});

  const sellItems = inventory.filter((i) => !i.equipped);

  if (loading) {
    return (
      <div className="stone-bg" style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ fontFamily: "'Crimson Text', serif", color: 'var(--text-dim)' }}>Yükleniyor...</p>
      </div>
    );
  }

  return (
    <div className="stone-bg" style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <Particles type="ember" count={8} />

      {/* ── Header ── */}
      <div
        style={{
          flexShrink: 0, padding: '0.85rem 1rem 0.7rem',
          borderBottom: '1px solid var(--border)',
          background: 'rgba(13,10,5,0.97)',
        }}
        className="pt-safe"
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={() => { playClick(); navigate(-1); }}
            style={{
              width: '2.2rem', height: '2.2rem', borderRadius: '8px',
              background: 'rgba(92,74,42,0.2)', border: '1px solid var(--border)',
              color: 'var(--text)', fontSize: '1rem',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, cursor: 'pointer',
            }}
          >
            ←
          </motion.button>

          <div style={{ flex: 1 }}>
            <h1 className="font-fantasy gold-shimmer" style={{ fontSize: '1.1rem', letterSpacing: '0.1em', margin: 0 }}>
              TÜCCAR DÜKKANI
            </h1>
            {character && (
              <p style={{ fontFamily: "'Crimson Text', serif", color: 'var(--text-dim)', fontSize: '0.78rem', margin: 0 }}>
                {character.name}
              </p>
            )}
          </div>

          {/* Gold display */}
          <div
            style={{
              display: 'flex', alignItems: 'center', gap: '0.35rem',
              background: 'rgba(201,150,58,0.1)', border: '1px solid rgba(201,150,58,0.35)',
              borderRadius: '8px', padding: '0.3rem 0.7rem',
            }}
          >
            <Coins size={16} color="var(--gold)" />
            <span className="font-fantasy" style={{ color: 'var(--gold)', fontSize: '1rem', letterSpacing: '0.04em' }}>
              {character?.gold ?? 0}
            </span>
          </div>
        </div>

        {/* Buy / Sell tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
          {TABS.map(({ key, label, Icon }) => (
            <motion.button
              key={key}
              whileTap={{ scale: 0.96 }}
              onClick={() => { playClick(); setTab(key); }}
              className={tab === key ? 'btn-gold' : 'btn-dark'}
              style={{
                flex: 1, fontSize: '0.85rem', padding: '0.5rem', minHeight: '40px',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
              }}
            >
              <Icon size={14} /> {label}
            </motion.button>
          ))}
        </div>
      </div>

      {/* ── Buy Tab ── */}
      {tab === 'buy' && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Category tabs */}
          <div
            style={{
              display: 'flex', gap: '0.4rem', padding: '0.6rem 0.85rem',
              overflowX: 'auto', flexShrink: 0,
              borderBottom: '1px solid var(--border)',
              background: 'rgba(10,8,5,0.6)',
            }}
          >
            {CATEGORY_ORDER.map((cat) => {
              const CatIcon = getItemIcon(CATEGORY_TYPE[cat]);
              return (
                <motion.button
                  key={cat}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => { playClick(); setActiveCategory(cat); }}
                  style={{
                    padding: '0.35rem 0.75rem', borderRadius: '20px', flexShrink: 0,
                    border: activeCategory === cat ? '1px solid var(--gold)' : '1px solid var(--border)',
                    background: activeCategory === cat ? 'rgba(201,150,58,0.15)' : 'rgba(0,0,0,0.3)',
                    color: activeCategory === cat ? 'var(--gold)' : 'var(--text-dim)',
                    fontFamily: "'Cinzel', serif", fontSize: '0.72rem', cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                  }}
                >
                  <CatIcon size={14} /> {cat}
                </motion.button>
              );
            })}
          </div>

          {/* Item list */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '0.85rem', paddingBottom: '2rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
              {(categorized[activeCategory] || []).map((item) => {
                const canAfford = (character?.gold ?? 0) >= item.price;
                const ItemTypeIcon = getItemIcon(item.type);
                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="stone-card"
                    style={{
                      padding: '0.85rem 1rem',
                      display: 'flex', alignItems: 'center', gap: '0.75rem',
                      opacity: canAfford ? 1 : 0.55,
                    }}
                  >
                    <div
                      style={{
                        width: '2.8rem', height: '2.8rem', borderRadius: '10px', flexShrink: 0,
                        background: 'rgba(201,150,58,0.08)', border: '1px solid var(--border)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      <ItemTypeIcon size={20} color="var(--gold)" />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p
                        className="font-fantasy"
                        style={{ color: 'var(--parch)', fontSize: '0.88rem', margin: 0, letterSpacing: '0.04em' }}
                      >
                        {item.name}
                      </p>
                      <p
                        style={{
                          color: 'var(--text-dim)', fontFamily: "'Crimson Text', serif",
                          fontSize: '0.78rem', margin: '0.1rem 0 0',
                        }}
                      >
                        {item.description}
                      </p>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.3rem', flexShrink: 0 }}>
                      <span
                        style={{
                          color: canAfford ? 'var(--gold)' : 'var(--blood)',
                          fontFamily: "'Cinzel', serif", fontSize: '0.85rem', fontWeight: 600,
                          display: 'inline-flex', alignItems: 'center', gap: '0.2rem',
                        }}
                      >
                        <Coins size={14} />{item.price}
                      </span>
                      <motion.button
                        whileTap={canAfford ? { scale: 0.94 } : {}}
                        onClick={() => canAfford && handleBuy(item)}
                        disabled={!canAfford || busy === item.id}
                        className="btn-gold"
                        style={{
                          fontSize: '0.72rem', padding: '0.3rem 0.75rem',
                          opacity: busy === item.id ? 0.6 : 1,
                          minHeight: '34px',
                        }}
                      >
                        {busy === item.id ? '...' : 'Al'}
                      </motion.button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Sell Tab ── */}
      {tab === 'sell' && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '0.85rem', paddingBottom: '2rem' }}>
          {sellItems.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              style={{ textAlign: 'center', padding: '4rem 1rem' }}
            >
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.75rem' }}>
                <Backpack size={40} color="var(--text-dim)" />
              </div>
              <p style={{ color: 'var(--text-dim)', fontFamily: "'Crimson Text', serif", fontSize: '1rem' }}>
                Satılacak eşya yok
              </p>
              <p style={{ color: 'var(--text-muted)', fontFamily: "'Crimson Text', serif", fontSize: '0.85rem' }}>
                Kuşanılmış eşyalar satılamaz
              </p>
            </motion.div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
              {sellItems.map((item) => {
                const catalogMatch = catalog.find((c) => c.name === item.name);
                const sellPrice = catalogMatch
                  ? catalogMatch.sellPrice
                  : item.type === 'potion' ? 15
                  : item.type === 'weapon' ? 30
                  : item.type === 'armor' ? 40 : 5;
                const ItemTypeIcon = getItemIcon(item.type);
                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="stone-card"
                    style={{ padding: '0.85rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}
                  >
                    <div
                      style={{
                        width: '2.8rem', height: '2.8rem', borderRadius: '10px', flexShrink: 0,
                        background: 'rgba(92,74,42,0.15)', border: '1px solid var(--border)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      <ItemTypeIcon size={18} color="var(--parch)" />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p
                        className="font-fantasy"
                        style={{ color: 'var(--parch)', fontSize: '0.88rem', margin: 0, letterSpacing: '0.04em' }}
                      >
                        {item.name}
                        {(item.quantity || 1) > 1 && (
                          <span style={{ color: 'var(--text-dim)', fontSize: '0.72rem', marginLeft: '0.35rem' }}>
                            ×{item.quantity}
                          </span>
                        )}
                      </p>
                      {item.description && (
                        <p
                          style={{
                            color: 'var(--text-dim)', fontFamily: "'Crimson Text', serif",
                            fontSize: '0.78rem', margin: '0.1rem 0 0',
                          }}
                        >
                          {item.description}
                        </p>
                      )}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.3rem', flexShrink: 0 }}>
                      <span style={{ color: 'var(--gold)', fontFamily: "'Cinzel', serif", fontSize: '0.82rem', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                        +<Coins size={14} />{sellPrice}
                      </span>
                      <motion.button
                        whileTap={{ scale: 0.94 }}
                        onClick={() => handleSell(item)}
                        disabled={busy === item.id}
                        className="btn-dark"
                        style={{ fontSize: '0.72rem', padding: '0.3rem 0.75rem', minHeight: '34px', opacity: busy === item.id ? 0.6 : 1 }}
                      >
                        {busy === item.id ? '...' : 'Sat'}
                      </motion.button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <Toast key={toast.msg} msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}

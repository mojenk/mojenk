import { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, X, Sword, Target, Wand2, Heart, LogOut, MessageCircle, Map, HelpCircle, ShoppingBag, Swords, BookOpen } from 'lucide-react';
import { npcTalk } from '../utils/api';
import { playClick, playNarrator } from '../utils/sounds';

const REL_LABELS = {
  friendly: 'Dost',
  neutral: 'Tarafsız',
  hostile: 'Düşman',
  unknown: 'Bilinmiyor',
  dead: 'Ölü',
};

const REL_COLORS = {
  friendly: '#4caf50',
  neutral: '#c9963a',
  hostile: '#e53935',
  unknown: '#888',
  dead: '#555',
};

const ROLE_META = {
  warrior: { label: 'Savaşçı', icon: Sword, color: '#cfd8dc' },
  archer: { label: 'Okçu', icon: Target, color: '#81c784' },
  mage: { label: 'Büyücü', icon: Wand2, color: '#b39ddb' },
  healer: { label: 'Şifacı', icon: Heart, color: '#f48fb1' },
};

export default function NpcDialogModal({ npc, characterId, sessionId, onClose, onNpcUpdate, onDismiss }) {
  const [dialog, setDialog] = useState([]);
  const [topics, setTopics] = useState([]);
  const [freeText, setFreeText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [confirmDismiss, setConfirmDismiss] = useState(false);
  const [dismissing, setDismissing] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (npc?.dialog_history) {
      try {
        const h = typeof npc.dialog_history === 'string' ? JSON.parse(npc.dialog_history) : npc.dialog_history;
        if (Array.isArray(h)) setDialog(h);
      } catch { setDialog([]); }
    }
    if (npc?.topics) {
      try {
        const t = typeof npc.topics === 'string' ? JSON.parse(npc.topics) : npc.topics;
        if (Array.isArray(t)) setTopics(t);
      } catch { setTopics([]); }
    }
  }, [npc]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [dialog, loading]);

  const handleTalk = async (text) => {
    if (!text.trim() || loading) return;
    setLoading(true);
    setError('');
    try {
      const data = await npcTalk(characterId, sessionId, npc.id, text);
      if (data.reply) {
        setDialog((d) => [...d, { role: 'user', content: text }, { role: 'assistant', content: data.reply }]);
        playNarrator();
      }
      if (data.npc) {
        try {
          const updatedTopics = typeof data.npc.topics === 'string' ? JSON.parse(data.npc.topics) : data.npc.topics;
          if (Array.isArray(updatedTopics)) setTopics(updatedTopics);
        } catch {}
        onNpcUpdate(data.npc);
      }
    } catch (err) {
      setError(err.message || 'Konuşma başarısız oldu');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitFree = (e) => {
    e.preventDefault();
    if (!freeText.trim()) return;
    handleTalk(freeText);
    setFreeText('');
  };

  const relationship = npc?.relationship || 'unknown';
  const isFollower = !!npc?.is_follower;

  // Quick dialog starters based on relationship
  const quickTopics = useMemo(() => {
    const base = [
      { icon: MessageCircle, label: 'Selamla', text: 'Selam, nasılsın?' },
      { icon: Map, label: 'Bu bölge', text: 'Bu bölge hakkında ne biliyorsun?' },
      { icon: HelpCircle, label: 'Yardım et', text: 'Herhangi bir şeyde yardımına ihtiyacım var' },
    ];
    if (relationship === 'friendly' || isFollower) {
      base.push({ icon: BookOpen, label: 'Geçmişin', text: 'Geçmişini anlatır mısın? Hikayeni merak ediyorum.' });
      base.push({ icon: Swords, label: 'Tehlikeler', text: 'Yakınlarda tehlike var mı? Dikkat etmem gereken bir şey?' });
    }
    if (relationship === 'neutral') {
      base.push({ icon: ShoppingBag, label: 'Ticaret', text: 'Satılık bir şeyin var mı? Ya da takas yapalım mı?' });
    }
    if (relationship === 'hostile') {
      base.push({ icon: Swords, label: 'Meydan oku', text: 'Benimle uğraşmak istediğinden emin misin?' });
    }
    return base;
  }, [relationship, isFollower]);
  const roleMeta = ROLE_META[npc?.follower_role] || ROLE_META.warrior;
  const RoleIcon = roleMeta.icon;
  const hasHp = npc?.follower_max_hp != null;
  const hp = npc?.follower_hp ?? npc?.follower_max_hp ?? 0;
  const maxHp = npc?.follower_max_hp ?? 0;
  const hpPct = hasHp && maxHp > 0 ? Math.max(0, Math.min(100, (hp / maxHp) * 100)) : 100;
  const isDowned = hasHp && hp <= 0;

  const handleDismissClick = async () => {
    if (!confirmDismiss) { setConfirmDismiss(true); return; }
    if (!onDismiss || dismissing) return;
    setDismissing(true);
    try {
      await onDismiss(npc);
    } finally {
      setDismissing(false);
      setConfirmDismiss(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(10,8,5,0.92)',
          backdropFilter: 'blur(4px)',
          zIndex: 2000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '1rem',
        }}
      >
        <motion.div
          initial={{ scale: 0.92, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.92, opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={(e) => e.stopPropagation()}
          style={{
            width: '100%', maxWidth: '520px',
            maxHeight: '85dvh',
            background: 'linear-gradient(180deg, rgba(34,27,18,0.98) 0%, rgba(20,16,11,0.98) 100%)',
            border: '1px solid var(--border)',
            borderTop: '2px solid var(--gold)',
            borderRadius: '14px',
            display: 'flex', flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div style={{
            padding: '1rem 1.15rem',
            borderBottom: '1px solid var(--border)',
            background: 'rgba(0,0,0,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            gap: '0.75rem',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
              <div style={{
                width: '2.6rem', height: '2.6rem', borderRadius: '50%',
                background: 'rgba(201,150,58,0.12)',
                border: '1px solid var(--gold)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.2rem', flexShrink: 0,
              }}><Users size={32} /></div>
              <div style={{ minWidth: 0 }}>
                <h3 className="font-fantasy" style={{ margin: 0, color: 'var(--gold)', fontSize: '1rem', letterSpacing: '0.06em' }}>{npc?.name}</h3>
                <p style={{ margin: '0.15rem 0 0', fontFamily: "'Crimson Text', serif", fontSize: '0.8rem', color: 'var(--text-dim)' }}>{npc?.description}</p>
                {isFollower && (
                  <div style={{ marginTop: '0.4rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <span style={{ color: roleMeta.color, display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontFamily: "'Cinzel', serif", fontSize: '0.7rem', fontWeight: 600 }}>
                        <RoleIcon size={12} /> {roleMeta.label}
                      </span>
                      {hasHp && (
                        <span style={{ fontFamily: "'Crimson Text', serif", fontSize: '0.7rem', color: isDowned ? '#e57373' : 'var(--text-muted)' }}>
                          {isDowned ? 'Ağır yaralı — dinleniyor' : `${hp}/${maxHp} HP`}
                        </span>
                      )}
                    </div>
                    {hasHp && (
                      <div style={{ height: '3px', width: '140px', borderRadius: '2px', background: 'rgba(255,255,255,0.1)', overflow: 'hidden', marginTop: '0.25rem' }}>
                        <div style={{ height: '100%', width: `${hpPct}%`, background: isDowned ? '#666' : hpPct < 30 ? '#e53935' : '#4caf50', transition: 'width 0.3s' }} />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexShrink: 0 }}>
              <span style={{
                fontFamily: "'Cinzel', serif",
                fontSize: '0.72rem',
                color: REL_COLORS[relationship],
                border: `1px solid ${REL_COLORS[relationship]}55`,
                padding: '0.25rem 0.55rem',
                borderRadius: '12px',
                whiteSpace: 'nowrap',
              }}>{REL_LABELS[relationship]}</span>
              <motion.button
                whileTap={{ scale: 0.92 }}
                onClick={onClose}
                style={{
                  width: '2rem', height: '2rem', borderRadius: '8px',
                  background: 'rgba(50,40,30,0.8)', border: '1px solid var(--border)',
                  color: 'var(--text-dim)', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              ><X size={16} /></motion.button>
            </div>
          </div>

          {isFollower && onDismiss && (
            <div style={{ padding: '0.5rem 1.15rem', borderBottom: '1px solid var(--border)', background: 'rgba(0,0,0,0.15)', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              {confirmDismiss && (
                <span style={{ fontFamily: "'Crimson Text', serif", fontSize: '0.78rem', color: '#e57373', alignSelf: 'center' }}>Emin misin?</span>
              )}
              <motion.button
                whileTap={{ scale: 0.95 }}
                disabled={dismissing}
                onClick={handleDismissClick}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                  padding: '0.35rem 0.7rem', borderRadius: '8px',
                  border: `1px solid ${confirmDismiss ? '#e53935' : 'var(--border)'}`,
                  background: confirmDismiss ? 'rgba(229,57,53,0.15)' : 'rgba(0,0,0,0.25)',
                  color: confirmDismiss ? '#ff8a80' : 'var(--text-dim)',
                  fontFamily: "'Crimson Text', serif", fontSize: '0.78rem', cursor: 'pointer',
                  opacity: dismissing ? 0.6 : 1,
                }}
              >
                <LogOut size={13} /> {confirmDismiss ? 'Evet, Yolları Ayır' : 'Yolları Ayır'}
              </motion.button>
              {confirmDismiss && (
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setConfirmDismiss(false)}
                  style={{
                    padding: '0.35rem 0.7rem', borderRadius: '8px',
                    border: '1px solid var(--border)', background: 'rgba(0,0,0,0.25)',
                    color: 'var(--text-dim)', fontFamily: "'Crimson Text', serif", fontSize: '0.78rem', cursor: 'pointer',
                  }}
                >Vazgeç</motion.button>
              )}
            </div>
          )}

          {/* Dialog history */}
          <div ref={scrollRef} style={{
            flex: 1, overflowY: 'auto',
            padding: '1rem 1.15rem',
            display: 'flex', flexDirection: 'column', gap: '0.75rem',
          }}
          >
            {dialog.length === 0 && (
              <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                <p style={{ fontFamily: "'Crimson Text', serif", color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0 0 0.75rem' }}>
                  {npc?.name} ile konuşmaya başla
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', justifyContent: 'center' }}>
                  {quickTopics.map((qt, i) => {
                    const QIcon = qt.icon;
                    return (
                      <motion.button
                        key={i}
                        whileTap={{ scale: 0.95 }}
                        disabled={loading}
                        onClick={() => { playClick(); handleTalk(qt.text); }}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                          padding: '0.4rem 0.65rem', borderRadius: '16px',
                          border: '1px solid var(--border)',
                          background: 'rgba(201,150,58,0.08)',
                          color: 'var(--text)',
                          fontFamily: "'Crimson Text', serif", fontSize: '0.78rem',
                          cursor: 'pointer', opacity: loading ? 0.5 : 1,
                        }}
                      >
                        <QIcon size={13} color="var(--gold)" /> {qt.label}
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            )}
            {dialog.map((entry, idx) => {
              const isNpc = entry.role === 'assistant';
              return (
                <div key={idx} style={{
                  alignSelf: isNpc ? 'flex-start' : 'flex-end',
                  maxWidth: '82%',
                  background: isNpc ? 'rgba(0,0,0,0.35)' : 'rgba(201,150,58,0.12)',
                  border: isNpc ? '1px solid var(--border)' : '1px solid var(--gold)33',
                  borderRadius: '10px',
                  padding: '0.6rem 0.8rem',
                }}
                >
                  <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.7rem', color: isNpc ? REL_COLORS[relationship] : 'var(--gold)', fontWeight: 600 }}>{isNpc ? npc?.name : 'Sen'}
                  </span>
                  <p style={{ fontFamily: "'Crimson Text', serif", color: 'var(--text)', fontSize: '0.9rem', margin: '0.2rem 0 0', lineHeight: 1.4 }}>{entry.content}</p>
                </div>
              );
            })}
            {loading && (
              <div style={{
                alignSelf: 'flex-start',
                background: 'rgba(0,0,0,0.35)', border: '1px solid var(--border)',
                borderRadius: '10px', padding: '0.6rem 0.9rem',
              }}
              >
                <span style={{ fontFamily: "'Crimson Text', serif", color: 'var(--text-muted)', fontSize: '0.85rem' }}>{npc?.name} düşünüyor...</span>
              </div>
            )}
            {error && (
              <div style={{ color: '#ff6b6b', fontFamily: "'Crimson Text', serif", fontSize: '0.85rem', textAlign: 'center' }}>{error}</div>
            )}
          </div>

          {/* Topics */}
          {topics.length > 0 && (
            <div style={{ padding: '0.65rem 1.15rem', borderTop: '1px solid var(--border)', background: 'rgba(0,0,0,0.2)' }}>
              <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.65rem', color: 'var(--gold)', letterSpacing: '0.08em', margin: '0 0 0.5rem' }}>KONULAR
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem' }}>
                {topics.map((topic, idx) => (
                  <motion.button
                    key={idx}
                    whileTap={{ scale: 0.95 }}
                    disabled={loading}
                    onClick={() => { playClick(); handleTalk(topic); }}
                    style={{
                      padding: '0.45rem 0.7rem', borderRadius: '16px',
                      border: '1px solid var(--border)',
                      background: 'rgba(201,150,58,0.1)',
                      color: 'var(--text)',
                      fontFamily: "'Crimson Text', serif",
                      fontSize: '0.82rem', cursor: 'pointer',
                      opacity: loading ? 0.5 : 1,
                    }}
                  >{topic}</motion.button>
                ))}
              </div>
            </div>
          )}

          {/* Free text input */}
          <form onSubmit={handleSubmitFree} style={{
            padding: '0.85rem 1.15rem',
            borderTop: '1px solid var(--border)',
            display: 'flex', gap: '0.55rem',
            background: 'rgba(0,0,0,0.3)',
          }}
          >
            <input
              type="text"
              value={freeText}
              onChange={(e) => setFreeText(e.target.value)}
              placeholder="Bir şey sor..."
              disabled={loading}
              style={{
                flex: 1,
                background: 'rgba(0,0,0,0.35)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                padding: '0.55rem 0.8rem',
                color: 'var(--text)',
                fontFamily: "'Crimson Text', serif",
                fontSize: '0.9rem',
                outline: 'none',
              }}
            />
            <motion.button
              whileTap={{ scale: 0.95 }}
              disabled={loading || !freeText.trim()}
              type="submit"
              className="btn-gold"
              style={{ padding: '0.55rem 1rem', fontSize: '0.85rem', minHeight: '40px', opacity: loading || !freeText.trim() ? 0.5 : 1 }}
            >
              Sor
            </motion.button>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

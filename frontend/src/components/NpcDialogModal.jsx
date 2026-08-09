import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, X, Sword, Target, Wand2, Heart, LogOut } from 'lucide-react';

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

export default function NpcDialogModal({ npc, onClose, onDismiss }) {
  const [confirmDismiss, setConfirmDismiss] = useState(false);
  const [dismissing, setDismissing] = useState(false);

  const relationship = npc?.relationship || 'unknown';
  const isFollower = !!npc?.is_follower;

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

          {/* Info footer */}
          <div style={{ padding: '1.25rem 1.15rem', textAlign: 'center' }}>
            <p style={{ fontFamily: "'Crimson Text', serif", color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>
              {isFollower
                ? 'Bu yoldaşın maceranda seninle birlikte savaşıyor.'
                : 'Bu karakterle hikaye içinde yolların kesişebilir.'}
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

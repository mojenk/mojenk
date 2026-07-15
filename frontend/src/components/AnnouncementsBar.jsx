import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Megaphone, AlertTriangle, Info, X } from 'lucide-react';
import { getAnnouncements } from '../utils/api';

const STORAGE_KEY = 'dnd_closed_announcements';

function getClosedIds() {
  try {
    return new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'));
  } catch {
    return new Set();
  }
}

function saveClosedIds(ids) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(ids)));
  } catch {}
}

const TYPE_STYLES = {
  info: { icon: Info, border: 'var(--gold)', bg: 'rgba(201,150,58,0.12)', text: 'var(--gold2)' },
  warning: { icon: AlertTriangle, border: 'rgba(212,140,40,0.8)', bg: 'rgba(212,140,40,0.14)', text: '#e8b060' },
  critical: { icon: AlertTriangle, border: 'rgba(180,50,40,0.85)', bg: 'rgba(140,30,25,0.2)', text: '#ff9a8a' },
};

export default function AnnouncementsBar() {
  const [announcements, setAnnouncements] = useState([]);
  const [closedIds, setClosedIds] = useState(() => getClosedIds());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    getAnnouncements()
      .then((data) => {
        if (!mounted) return;
        setAnnouncements((data.announcements || []).slice(0, 3));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
    return () => { mounted = false; };
  }, []);

  const handleClose = (id) => {
    const next = new Set(closedIds);
    next.add(id);
    setClosedIds(next);
    saveClosedIds(next);
  };

  if (loading || announcements.length === 0) return null;

  const visible = announcements.filter((a) => !closedIds.has(a.id));
  if (visible.length === 0) return null;

  return (
    <AnimatePresence>
      {visible.map((announcement) => {
        const style = TYPE_STYLES[announcement.type] || TYPE_STYLES.info;
        const Icon = style.icon;
        return (
          <motion.div
            key={announcement.id}
            initial={{ opacity: 0, y: -12, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{
              background: style.bg,
              borderLeft: `4px solid ${style.border}`,
              borderTop: '1px solid rgba(201,150,58,0.15)',
              borderBottom: '1px solid rgba(201,150,58,0.15)',
              padding: '0.55rem 0.9rem',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.65rem',
            }}
          >
            <Icon size={18} color={style.text} style={{ flexShrink: 0, marginTop: '0.15rem' }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  color: style.text,
                  fontFamily: "'Cinzel', serif",
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  marginBottom: '0.15rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                }}
              >
                <Megaphone size={12} />
                {announcement.title}
              </div>
              <div
                style={{
                  color: 'var(--text)',
                  fontFamily: "'Crimson Text', serif",
                  fontSize: '0.85rem',
                  lineHeight: 1.35,
                  whiteSpace: 'pre-wrap',
                }}
              >
                {announcement.content}
              </div>
            </div>
            <button
              onClick={() => handleClose(announcement.id)}
              aria-label="Duyuruyu kapat"
              style={{
                background: 'none',
                border: 'none',
                color: style.text,
                cursor: 'pointer',
                padding: '0.2rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <X size={16} />
            </button>
          </motion.div>
        );
      })}
    </AnimatePresence>
  );
}

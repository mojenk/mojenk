import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { ScrollText, CheckCircle2, XCircle, Ban } from 'lucide-react';

const STATUS_COLORS = {
  active: '#c9963a',
  completed: '#4caf50',
  failed: '#e53935',
  abandoned: '#888',
};

const STATUS_LABELS = {
  active: 'Aktif',
  completed: 'Tamamlandı',
  failed: 'Başarısız',
  abandoned: 'İptal Edildi',
};

const STATUS_ICONS = {
  active: ScrollText,
  completed: CheckCircle2,
  failed: XCircle,
  abandoned: Ban,
};

export default function QuestPanel({ quests = [], onAbandon }) {
  const active = quests.filter(q => q.status === 'active');
  const done = quests.filter(q => q.status !== 'active');

  return (
    <div style={{ padding: '0.6rem 0.75rem', overflowY: 'auto', maxHeight: '44vh' }}>
      <p
        className="font-fantasy"
        style={{ color: 'var(--gold)', fontSize: '0.75rem', letterSpacing: '0.1em', margin: '0 0 0.6rem' }}
      >
        GÖREV TAKİBİ
      </p>

      {quests.length === 0 ? (
        <p style={{ fontFamily: "'Crimson Text', serif", color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>
          Henüz aktif görev yok. Hikayede görevler ortaya çıkacak.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {active.length > 0 && (
            <>
              <p style={{ fontFamily: "'Crimson Text', serif", color: 'var(--gold)', fontSize: '0.7rem', fontWeight: 700, margin: 0, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Aktif Görevler
              </p>
              {active.map(q => <QuestCard key={q.id} quest={q} onAbandon={onAbandon} />)}
            </>
          )}
          {done.length > 0 && (
            <>
              <p style={{ fontFamily: "'Crimson Text', serif", color: 'var(--text-muted)', fontSize: '0.7rem', fontWeight: 700, margin: '0.4rem 0 0', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Geçmiş
              </p>
              {done.map(q => <QuestCard key={q.id} quest={q} />)}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function QuestCard({ quest, onAbandon }) {
  const [confirming, setConfirming] = useState(false);
  const color = STATUS_COLORS[quest.status] || '#888';
  const label = STATUS_LABELS[quest.status] || quest.status;
  const StatusIcon = STATUS_ICONS[quest.status] || ScrollText;
  const isDone = quest.status !== 'active';

  return (
    <div
      style={{
        background: isDone ? 'rgba(0,0,0,0.15)' : 'rgba(201,150,58,0.07)',
        border: `1px solid ${isDone ? 'var(--border)' : 'rgba(201,150,58,0.3)'}`,
        borderRadius: '8px',
        padding: '0.5rem 0.65rem',
        opacity: isDone ? 0.65 : 1,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: quest.description ? '0.3rem' : 0 }}>
        <span style={{ fontFamily: "'Crimson Text', serif", fontSize: '0.9rem', fontWeight: 600, color: isDone ? 'var(--text-muted)' : 'var(--text)', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
          <StatusIcon size={14} /> {quest.title}
        </span>
        <span style={{
          fontSize: '0.65rem',
          fontFamily: "'Cinzel', serif",
          color,
          background: `${color}22`,
          border: `1px solid ${color}55`,
          borderRadius: '4px',
          padding: '1px 6px',
          flexShrink: 0,
          marginLeft: '0.5rem',
        }}>
          {label}
        </span>
      </div>

      {quest.description && (
        <p style={{ fontFamily: "'Crimson Text', serif", color: 'var(--text-muted)', fontSize: '0.8rem', margin: 0, lineHeight: 1.4 }}>
          {quest.description}
        </p>
      )}

      {(quest.reward_xp > 0 || quest.reward_gold > 0) && (
        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.35rem' }}>
          {quest.reward_xp > 0 && (
            <span style={{ fontSize: '0.7rem', color: '#7c9ebd', fontFamily: "'Cinzel', serif" }}>
              +{quest.reward_xp} XP
            </span>
          )}
          {quest.reward_gold > 0 && (
            <span style={{ fontSize: '0.7rem', color: 'var(--gold)', fontFamily: "'Cinzel', serif" }}>
              +{quest.reward_gold} Altın
            </span>
          )}
        </div>
      )}

      {!isDone && onAbandon && (
        <div style={{ marginTop: '0.4rem', textAlign: 'right' }}>
          {confirming ? (
            <span style={{ display: 'inline-flex', gap: '0.4rem', alignItems: 'center' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: "'Crimson Text', serif" }}>Emin misin?</span>
              <button
                onClick={() => { onAbandon(quest.id); setConfirming(false); }}
                style={{
                  fontSize: '0.65rem', fontFamily: "'Cinzel', serif", color: '#e53935',
                  background: 'rgba(229,57,53,0.12)', border: '1px solid rgba(229,57,53,0.4)',
                  borderRadius: '4px', padding: '2px 8px', cursor: 'pointer',
                }}
              >
                Evet, İptal Et
              </button>
              <button
                onClick={() => setConfirming(false)}
                style={{
                  fontSize: '0.65rem', fontFamily: "'Cinzel', serif", color: 'var(--text-muted)',
                  background: 'transparent', border: '1px solid var(--border)',
                  borderRadius: '4px', padding: '2px 8px', cursor: 'pointer',
                }}
              >
                Vazgeç
              </button>
            </span>
          ) : (
            <button
              onClick={() => setConfirming(true)}
              style={{
                fontSize: '0.65rem', fontFamily: "'Cinzel', serif", color: 'var(--text-muted)',
                background: 'transparent', border: '1px solid var(--border)',
                borderRadius: '4px', padding: '2px 8px', cursor: 'pointer',
              }}
            >
              Görevi İptal Et
            </button>
          )}
        </div>
      )}
    </div>
  );
}

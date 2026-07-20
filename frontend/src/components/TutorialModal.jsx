import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { t } from '../utils/i18n';
import {
  ScrollText, ListOrdered, Send, Dices, Coins, Menu, ChevronRight, ChevronLeft,
} from 'lucide-react';

const ICONS = [
  ScrollText,
  ListOrdered,
  Send,
  Dices,
  Coins,
  Menu,
];

export default function TutorialModal({ onClose }) {
  const [step, setStep] = useState(0);
  const steps = [
    { titleKey: 'tutorial_step1_title', textKey: 'tutorial_step1_text' },
    { titleKey: 'tutorial_step2_title', textKey: 'tutorial_step2_text' },
    { titleKey: 'tutorial_step3_title', textKey: 'tutorial_step3_text' },
    { titleKey: 'tutorial_step4_title', textKey: 'tutorial_step4_text' },
    { titleKey: 'tutorial_step5_title', textKey: 'tutorial_step5_text' },
    { titleKey: 'tutorial_step6_title', textKey: 'tutorial_step6_text' },
  ];

  const CurrentIcon = ICONS[step];
  const isFirst = step === 0;
  const isLast = step === steps.length - 1;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed', inset: 0, zIndex: 160,
        background: 'rgba(0,0,0,0.85)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1.25rem',
      }}
    >
      <motion.div
        initial={{ scale: 0.92, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="stone-card"
        style={{
          width: '100%', maxWidth: '420px',
          padding: '1.5rem',
          textAlign: 'center',
          display: 'flex', flexDirection: 'column', gap: '1rem',
        }}
      >
        <div style={{ color: 'var(--gold)' }}>
          <CurrentIcon size={48} strokeWidth={1.5} />
        </div>

        <div>
          <h2 className="font-fantasy" style={{ color: 'var(--gold)', margin: '0 0 0.35rem', fontSize: '1.35rem' }}>
            {step === 0 ? t('tutorial_title') : t(steps[step].titleKey)}
          </h2>
          {step === 0 && (
            <p style={{ color: 'var(--text-muted)', margin: 0, fontFamily: "'Crimson Text', serif" }}>
              {t('tutorial_subtitle')}
            </p>
          )}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            <p style={{
              color: 'var(--text-main)',
              fontFamily: "'Crimson Text', serif",
              fontSize: '1.05rem',
              lineHeight: 1.55,
              margin: 0,
            }}>
              {step === 0 ? t(steps[0].textKey) : t(steps[step].textKey)}
            </p>
          </motion.div>
        </AnimatePresence>

        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
          color: 'var(--text-muted)', fontSize: '0.85rem',
        }}>
          {steps.map((_, i) => (
            <span
              key={i}
              style={{
                width: '8px', height: '8px', borderRadius: '50%',
                background: i === step ? 'var(--gold)' : 'var(--text-muted)',
                opacity: i === step ? 1 : 0.45,
                transition: 'all 0.2s',
              }}
            />
          ))}
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.25rem' }}>
          {!isFirst && (
            <button
              type="button"
              className="btn-stone"
              style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}
              onClick={() => setStep((s) => s - 1)}
            >
              <ChevronLeft size={18} /> {t('tutorial_prev')}
            </button>
          )}
          <button
            type="button"
            className="btn-gold"
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}
            onClick={() => {
              if (isLast) onClose();
              else setStep((s) => s + 1);
            }}
          >
            {isLast ? t('tutorial_start') : t('tutorial_next')} <ChevronRight size={18} />
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

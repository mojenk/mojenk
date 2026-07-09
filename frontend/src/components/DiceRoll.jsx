import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function DiceRoll({ value, rolling, size = 64, label }) {
  const [displayValue, setDisplayValue] = useState(value || 1);

  useEffect(() => {
    if (!rolling) {
      setDisplayValue(value || 1);
      return;
    }
    let interval;
    let count = 0;
    interval = setInterval(() => {
      setDisplayValue(Math.floor(Math.random() * 20) + 1);
      count += 1;
      if (count > 22) {
        clearInterval(interval);
        setDisplayValue(value || 1);
      }
    }, 55);
    return () => clearInterval(interval);
  }, [rolling, value]);

  return (
    <motion.div
      animate={
        rolling
          ? {
              rotate: [0, 360, -360, 180, 0],
              scale: [1, 1.15, 1.05, 1.1, 1],
            }
          : {
              rotate: 0,
              scale: [1, 1.2, 1],
            }
      }
      transition={rolling ? { duration: 1.3, ease: 'easeInOut' } : { duration: 0.35, ease: 'easeOut' }}
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.22,
        background: value === 20
          ? 'linear-gradient(145deg, #ffd700, #c9a94a)'
          : value === 1
          ? 'linear-gradient(145deg, #8b2e2e, #3a1212)'
          : 'linear-gradient(145deg, #f5e6c8, #c9a94a)',
        boxShadow: `inset 0 0 ${size * 0.14}px rgba(0,0,0,0.35), 0 ${size * 0.08}px ${size * 0.18}px rgba(0,0,0,0.45)`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        border: `2px solid ${value === 20 ? '#fff5b0' : value === 1 ? '#5c1a1a' : '#9c7d3c'}`,
      }}
    >
      <span
        style={{
          fontFamily: "'Cinzel', serif",
          fontSize: size * 0.45,
          fontWeight: 900,
          color: value === 20 ? '#3a2a00' : value === 1 ? '#f5c6c6' : '#1a1510',
          lineHeight: 1,
          textShadow: value === 20 ? '0 0 8px rgba(255,255,255,0.6)' : 'none',
        }}
      >
        {displayValue}
      </span>
      {label && (
        <span
          style={{
            fontFamily: "'Cinzel', serif",
            fontSize: size * 0.16,
            color: value === 1 ? '#d4a0a0' : '#5c4a2a',
            letterSpacing: '0.06em',
            marginTop: size * 0.04,
          }}
        >
          {label}
        </span>
      )}
    </motion.div>
  );
}

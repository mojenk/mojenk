import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

// Zar temalari: kozmetik magazasindan alinan dice_skin degerleri
export const DICE_SKINS = {
  ember: {
    normal: 'linear-gradient(145deg, #ff9a3c, #8f2d0e)',
    crit: 'linear-gradient(145deg, #ffd700, #ff6a00)',
    fail: 'linear-gradient(145deg, #6b1414, #2b0808)',
    border: '#ff7a2d',
    text: '#fff3e0',
    label: '#ffc9a0',
    glow: '0 0 18px rgba(255,110,30,0.55)',
  },
  frost: {
    normal: 'linear-gradient(145deg, #a8e6ff, #2a6fa8)',
    crit: 'linear-gradient(145deg, #e6fbff, #57c7ff)',
    fail: 'linear-gradient(145deg, #223a5e, #0c1526)',
    border: '#7fd4ff',
    text: '#eaf9ff',
    label: '#bfe8ff',
    glow: '0 0 18px rgba(110,200,255,0.5)',
  },
  shadow: {
    normal: 'linear-gradient(145deg, #5b3a8e, #1c0f33)',
    crit: 'linear-gradient(145deg, #b07dff, #4c1d95)',
    fail: 'linear-gradient(145deg, #2a0a2a, #0e0414)',
    border: '#8b5cf6',
    text: '#efe4ff',
    label: '#c4a8f0',
    glow: '0 0 18px rgba(139,92,246,0.55)',
  },
  royal: {
    normal: 'linear-gradient(145deg, #ffe9a3, #b8860b)',
    crit: 'linear-gradient(145deg, #fff7cc, #ffd700)',
    fail: 'linear-gradient(145deg, #7a1f1f, #2d0b0b)',
    border: '#ffd700',
    text: '#3a2a00',
    label: '#7a5c00',
    glow: '0 0 22px rgba(255,215,0,0.6)',
  },
  arcane: {
    normal: 'linear-gradient(145deg, #5eead4, #0f5e54)',
    crit: 'linear-gradient(145deg, #b8fff2, #14b8a6)',
    fail: 'linear-gradient(145deg, #1f3a44, #0a1418)',
    border: '#2dd4bf',
    text: '#e6fffa',
    label: '#99f6e4',
    glow: '0 0 18px rgba(45,212,191,0.55)',
  },
};

export default function DiceRoll({ value, rolling, size = 64, label, skin }) {
  const [displayValue, setDisplayValue] = useState(value || 1);
  const theme = skin && DICE_SKINS[skin] ? DICE_SKINS[skin] : null;

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

  const background = theme
    ? (value === 20 ? theme.crit : value === 1 ? theme.fail : theme.normal)
    : (value === 20
      ? 'linear-gradient(145deg, #ffd700, #c9a94a)'
      : value === 1
      ? 'linear-gradient(145deg, #8b2e2e, #3a1212)'
      : 'linear-gradient(145deg, #f5e6c8, #c9a94a)');

  const borderColor = theme
    ? theme.border
    : (value === 20 ? '#fff5b0' : value === 1 ? '#5c1a1a' : '#9c7d3c');

  const textColor = theme
    ? (skin === 'royal' && value !== 1 ? theme.text : theme.text)
    : (value === 20 ? '#3a2a00' : value === 1 ? '#f5c6c6' : '#1a1510');

  const labelColor = theme ? theme.label : (value === 1 ? '#d4a0a0' : '#5c4a2a');

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
        background,
        boxShadow: `inset 0 0 ${size * 0.14}px rgba(0,0,0,0.35), 0 ${size * 0.08}px ${size * 0.18}px rgba(0,0,0,0.45)${theme ? `, ${theme.glow}` : ''}`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        border: `2px solid ${borderColor}`,
        overflow: 'hidden',
      }}
    >
      {theme && (
        <>
          {/* Koselerde kosuk pariltilar */}
          <div
            style={{
              position: 'absolute', inset: 0, borderRadius: 'inherit', pointerEvents: 'none',
              background: 'linear-gradient(115deg, rgba(255,255,255,0.28) 0%, transparent 28%, transparent 72%, rgba(255,255,255,0.08) 100%)',
            }}
          />
          {/* Hareketli parlama supurmesi */}
          <motion.div
            animate={{ x: ['-130%', '230%'] }}
            transition={{ duration: 2.4, repeat: Infinity, repeatDelay: 1.6, ease: 'easeInOut' }}
            style={{
              position: 'absolute', top: 0, bottom: 0, width: '45%', pointerEvents: 'none',
              background: 'linear-gradient(100deg, transparent 0%, rgba(255,255,255,0.35) 50%, transparent 100%)',
              filter: 'blur(2px)',
            }}
          />
        </>
      )}
      <span
        style={{
          fontFamily: "'Cinzel', serif",
          fontSize: size * 0.45,
          fontWeight: 900,
          color: textColor,
          lineHeight: 1,
          zIndex: 1,
          textShadow: value === 20 ? '0 0 8px rgba(255,255,255,0.6)' : theme ? '0 1px 2px rgba(0,0,0,0.5)' : 'none',
        }}
      >
        {displayValue}
      </span>
      {label && (
        <span
          style={{
            fontFamily: "'Cinzel', serif",
            fontSize: size * 0.16,
            color: labelColor,
            letterSpacing: '0.06em',
            marginTop: size * 0.04,
            zIndex: 1,
          }}
        >
          {label}
        </span>
      )}
    </motion.div>
  );
}

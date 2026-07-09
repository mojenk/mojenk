import { useMemo } from 'react';

/**
 * CSS-only parçacık sistemi.
 * type: 'ember' | 'dust' | 'magic' | 'gold'
 */
export default function Particles({ type = 'ember', count = 12 }) {
  const particles = useMemo(() => {
    return Array.from({ length: count }, (_, i) => {
      const left = Math.random() * 100;
      const delay = Math.random() * 8;
      const duration = 4 + Math.random() * 6;
      const size = type === 'dust' ? 1 + Math.random() * 2 : 2 + Math.random() * 3;
      const opacity = 0.2 + Math.random() * 0.5;
      const drift = -30 + Math.random() * 60;
      return { id: i, left, delay, duration, size, opacity, drift };
    });
  }, [type, count]);

  const getColor = () => {
    switch (type) {
      case 'ember': return 'var(--gold)';
      case 'dust': return 'var(--text-dim)';
      case 'magic': return '#a78bfa';
      case 'gold': return 'var(--gold2)';
      default: return 'var(--gold)';
    }
  };

  const animationName = type === 'dust' ? 'particle-float' : 'particle-rise';

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 0,
        overflow: 'hidden',
      }}
      aria-hidden="true"
    >
      {particles.map((p) => (
        <div
          key={p.id}
          style={{
            position: 'absolute',
            left: `${p.left}%`,
            bottom: type === 'dust' ? `${20 + Math.random() * 60}%` : '-5%',
            width: `${p.size}px`,
            height: `${p.size}px`,
            borderRadius: '50%',
            background: getColor(),
            boxShadow: type === 'magic'
              ? `0 0 ${p.size * 2}px ${getColor()}`
              : type === 'ember'
              ? `0 0 ${p.size}px rgba(232,184,75,0.6)`
              : 'none',
            opacity: p.opacity,
            animation: `${animationName} ${p.duration}s ${p.delay}s ease-in-out infinite`,
            willChange: 'transform, opacity',
            '--drift': `${p.drift}px`,
          }}
        />
      ))}
    </div>
  );
}

import { useState, useEffect, useRef } from 'react';
import { playTypewriterTick } from '../utils/sounds';

/**
 * Karakter karakter beliren metin bileşeni.
 * Sadece yeni mesajlar için kullanılır.
 */
export default function TypewriterText({ text, speed = 14, onComplete, style }) {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);
  const indexRef = useRef(0);
  const rafRef = useRef(null);
  const lastTickRef = useRef(0);
  const tickCountRef = useRef(0);

  useEffect(() => {
    indexRef.current = 0;
    setDisplayed('');
    setDone(false);
    tickCountRef.current = 0;

    let cancelled = false;

    function step(timestamp) {
      if (cancelled) return;
      if (timestamp - lastTickRef.current >= speed) {
        lastTickRef.current = timestamp;
        indexRef.current++;
        const char = text[indexRef.current - 1];
        setDisplayed(text.slice(0, indexRef.current));

        // Her 3 karakterde bir ses çal (performans)
        tickCountRef.current++;
        if (tickCountRef.current % 3 === 0 && char && char !== ' ') {
          playTypewriterTick();
        }

        if (indexRef.current >= text.length) {
          setDone(true);
          onComplete?.();
          return;
        }
      }
      rafRef.current = requestAnimationFrame(step);
    }

    rafRef.current = requestAnimationFrame(step);

    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [text, speed]);

  // Tıklayınca hemen tamamla
  const handleClick = () => {
    if (!done) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      setDisplayed(text);
      setDone(true);
      onComplete?.();
    }
  };

  return (
    <p
      onClick={handleClick}
      style={{
        ...style,
        cursor: done ? 'default' : 'pointer',
      }}
    >
      {displayed}
      {!done && (
        <span
          style={{
            display: 'inline-block',
            width: '2px',
            height: '1em',
            background: 'var(--gold)',
            marginLeft: '2px',
            animation: 'blink-cursor 0.8s step-end infinite',
            verticalAlign: 'text-bottom',
          }}
        />
      )}
    </p>
  );
}

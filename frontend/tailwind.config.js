/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        fantasy: ['"MedievalSharp"', '"Cinzel"', 'Georgia', 'serif'],
        body: ['"Crimson Text"', 'Georgia', 'serif'],
      },
      colors: {
        parchment: '#f4e4bc',
        darkbrown: '#2c1810',
        gold: '#c9a227',
        bloodred: '#8b1a1a',
        mystical: '#1a1a2e',
        arcane: '#16213e',
        midnight: '#0f3460',
      },
      animation: {
        'glow': 'glow 2s ease-in-out infinite alternate',
        'float': 'float 3s ease-in-out infinite',
        'dice-spin': 'dice-spin 0.5s ease-out',
      },
      keyframes: {
        glow: { '0%': { textShadow: '0 0 10px #c9a227' }, '100%': { textShadow: '0 0 20px #c9a227, 0 0 40px #c9a227' } },
        float: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-8px)' } },
        'dice-spin': { '0%': { transform: 'rotate(0deg) scale(1)' }, '50%': { transform: 'rotate(180deg) scale(1.3)' }, '100%': { transform: 'rotate(360deg) scale(1)' } },
      },
    },
  },
  plugins: [],
};

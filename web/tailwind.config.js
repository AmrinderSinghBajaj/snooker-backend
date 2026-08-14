/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#0a1e18',
        charcoal: '#081711',
        felt: '#0c2b22',
        'felt-light': '#153a2d',
        gold: '#c9a24b',
        'gold-light': '#e8cd85',
        'gold-dim': '#8a712f',
        ivory: '#f3ede0',
        smoke: '#9fb3a8',
      },
      fontFamily: {
        display: ['"Playfair Display"', 'Georgia', 'serif'],
        body: ['"Inter"', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'radial-fade': 'radial-gradient(circle at 50% 0%, rgba(201,162,75,0.16), rgba(10,30,24,0) 60%)',
        'gold-line': 'linear-gradient(90deg, transparent, #c9a24b, transparent)',
      },
      boxShadow: {
        gold: '0 0 40px rgba(201,162,75,0.25)',
      },
    },
  },
  plugins: [],
}

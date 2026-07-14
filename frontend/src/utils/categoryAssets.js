/**
 * Category cover images served from /public/categories/
 * Maps asset category names → static image URL and theme color.
 */
export const CATEGORY_CONFIG = {
  Snooker: {
    image: '/categories/snooker.png',
    accent: '#2F9E63',
    icon: '🎱',
  },
  Pool: {
    image: '/categories/pool.png',
    accent: '#C9A24B',
    icon: '🎱',
  },
  Heyball: {
    image: '/categories/heyball.png',
    accent: '#4FC3F7',
    icon: '🏒',
  },
  PlayStation: {
    image: '/categories/playstation.png',
    accent: '#0066ff',
    icon: '🎮',
  },
  Chess: {
    image: '/categories/chess.png',
    accent: '#B9AF98',
    icon: '♟️',
  },
  Carrom: {
    image: '/categories/carrom.png',
    accent: '#D97B2B',
    icon: '🪅',
  },
};

export function getCategoryConfig(category) {
  return (
    CATEGORY_CONFIG[category] || {
      image: null,
      accent: '#C9A24B',
      icon: '🎯',
    }
  );
}

/**
 * Maps food item name keywords to an emoji.
 * Falls back to 🍽️ for unknown items.
 */
const FOOD_EMOJI_MAP = [
  [['burger', 'burger'], '🍔'],
  [['pizza'], '🍕'],
  [['fries', 'chips'], '🍟'],
  [['sandwich', 'sub'], '🥪'],
  [['pasta', 'noodle', 'spaghetti'], '🍝'],
  [['rice', 'biryani', 'pulao'], '🍚'],
  [['chicken'], '🍗'],
  [['paneer', 'cottage'], '🧀'],
  [['egg', 'omelette'], '🍳'],
  [['soup'], '🍲'],
  [['salad'], '🥗'],
  [['wrap', 'roll', 'roti', 'paratha'], '🌯'],
  [['cake', 'pastry', 'brownie'], '🍰'],
  [['ice cream', 'kulfi'], '🍦'],
  [['chocolate'], '🍫'],
  [['cookie', 'biscuit'], '🍪'],
  [['cola', 'coke', 'pepsi', 'soda'], '🥤'],
  [['juice', 'lassi', 'shake', 'smoothie'], '🧃'],
  [['coffee', 'espresso', 'cappuccino', 'latte'], '☕'],
  [['tea', 'chai'], '🍵'],
  [['water', 'mineral'], '💧'],
  [['beer', 'ale'], '🍺'],
  [['mocktail', 'cocktail'], '🍹'],
  [['energy', 'redbull'], '⚡'],
  [['snack', 'peanut', 'popcorn', 'nachos'], '🍿'],
  [['samosa', 'pakoda', 'vada'], '🥟'],
  [['dosa', 'idli'], '🫓'],
  [['pani puri', 'golgappa'], '🫙'],
];

export function getFoodEmoji(name) {
  const lower = name.toLowerCase();
  for (const [keywords, emoji] of FOOD_EMOJI_MAP) {
    if (keywords.some((k) => lower.includes(k))) return emoji;
  }
  return '🍽️';
}

export function parseXpTarget(str) {
  if (str == null) return null;
  const s = String(str).trim().toLowerCase().replace(/,/g, '');
  if (s.endsWith('m')) {
    const n = parseFloat(s);
    return isNaN(n) ? null : Math.round(n * 1_000_000);
  }
  if (s.endsWith('k')) {
    const n = parseFloat(s);
    return isNaN(n) ? null : Math.round(n * 1_000);
  }
  const n = parseInt(s);
  return isNaN(n) ? null : n;
}

export function formatXp(n) {
  if (n == null) return '?';
  if (n >= 1_000_000) {
    const m = n / 1_000_000;
    return (Number.isInteger(m) ? m : parseFloat(m.toFixed(1))) + 'm';
  }
  if (n >= 1_000) {
    const k = n / 1_000;
    return (Number.isInteger(k) ? k : parseFloat(k.toFixed(1))) + 'k';
  }
  return String(n);
}

export function formatTarget(type, target) {
  return type === 'xp' ? formatXp(target) : String(target);
}

const CLUE_LABELS = {
  clue_scrolls_beginner: 'Beginner Clues',
  clue_scrolls_easy:     'Easy Clues',
  clue_scrolls_medium:   'Medium Clues',
  clue_scrolls_hard:     'Hard Clues',
  clue_scrolls_elite:    'Elite Clues',
  clue_scrolls_master:   'Master Clues',
  clue_scrolls_all:      'Clues',
};

export function tileTypeLabel(type, womMetric) {
  if (type === 'kc' && womMetric && CLUE_LABELS[womMetric]) return CLUE_LABELS[womMetric];
  if (type === 'kc') return 'KC';
  if (type === 'xp') return 'XP';
  return type;
}

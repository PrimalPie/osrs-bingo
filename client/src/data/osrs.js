// Suggest a skill match from a label string, using the live list
export function suggestFromList(list, label) {
  const l = label.toLowerCase();
  const sorted = [...list].sort((a, b) =>
    Math.max(...b.keywords.map(k => k.length)) - Math.max(...a.keywords.map(k => k.length))
  );
  return sorted.find(entry => entry.keywords.some(k => l.includes(k))) || null;
}

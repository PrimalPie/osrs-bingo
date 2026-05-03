const express = require('express');
const fetch = require('node-fetch');

const router = express.Router();

const MAPPING_URL = 'https://prices.runescape.wiki/api/v1/osrs/mapping';
const ICON_BASE = 'https://static.runelite.net/cache/item/icon';

let cachedItems = null;
let cacheTime = 0;
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

async function getItems() {
  if (cachedItems && Date.now() - cacheTime < CACHE_TTL) return cachedItems;
  const res = await fetch(MAPPING_URL, {
    headers: { 'User-Agent': 'osrs-bingo-app/1.0' },
  });
  if (!res.ok) throw new Error(`Mapping fetch failed: ${res.status}`);
  const data = await res.json();
  // data is an array of { id, name, examine, members, ... }
  cachedItems = data.map(item => ({
    id: item.id,
    name: item.name,
    icon: `${ICON_BASE}/${item.id}.png`,
  }));
  cacheTime = Date.now();
  return cachedItems;
}

router.get('/search', async (req, res) => {
  const q = (req.query.q || '').trim().toLowerCase();
  if (!q || q.length < 2) return res.json([]);

  try {
    const items = await getItems();
    const results = [];
    for (const item of items) {
      if (item.name.toLowerCase().includes(q)) {
        results.push(item);
        if (results.length >= 20) break;
      }
    }
    res.json(results);
  } catch (e) {
    console.error('[Items] Search error:', e.message);
    res.status(502).json({ error: 'Could not fetch item data' });
  }
});

module.exports = router;

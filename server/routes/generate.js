const express = require('express');
const { requireAdmin } = require('../middleware/auth');
const { getDb } = require('../db/database');
const TILE_POOL = require('../data/tilePool');

const router = express.Router();

const COLS = ['A','B','C','D','E','F','G','H','I'];

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function scaleTarget(tile, teamSize, durationDays) {
  const ratio = teamSize / 10;
  const dayRatio = durationDays / 7;
  switch (tile.scaling) {
    case 'linear':  return Math.max(1, Math.round(tile.baseTarget * ratio * dayRatio));
    case 'sqrt':    return Math.max(1, Math.round(tile.baseTarget * Math.sqrt(ratio) * dayRatio));
    case 'partial': return Math.max(1, Math.round(tile.baseTarget * Math.pow(ratio, 0.3) * dayRatio));
    case 'fixed':   return tile.baseTarget;
    default:        return tile.baseTarget;
  }
}

function generateTiles(params) {
  const {
    totalPlayers  = 50,
    numTeams      = 5,
    boardSize     = 5,
    durationDays  = 7,
    easyPct       = 40,
    mediumPct     = 40,
    hardPct       = 20,
    pvmPct        = 60,
    skillingPct   = 30,
    collectionPct = 10,
    womOnly       = false,
  } = params;

  const teamSize  = Math.max(1, Math.ceil(totalPlayers / numTeams));
  const totalTiles = boardSize * boardSize;

  const easyCount   = Math.round(totalTiles * easyPct   / 100);
  const mediumCount = Math.round(totalTiles * mediumPct  / 100);
  const hardCount   = totalTiles - easyCount - mediumCount;

  const pool = TILE_POOL.filter(t => !womOnly || t.type !== 'drop');
  const usedLabels = new Set();

  function pickDifficulty(difficulty, count) {
    const pvmCount   = Math.round(count * pvmPct        / 100);
    const skillCount = Math.round(count * skillingPct   / 100);
    const collCount  = count - pvmCount - skillCount;

    const picks = [];
    for (const [cat, n] of [['pvm', pvmCount], ['skilling', skillCount], ['collection', collCount]]) {
      const candidates = shuffle(pool.filter(t =>
        t.difficulty === difficulty && t.category === cat && !usedLabels.has(t.label)
      ));
      for (let i = 0; i < n && i < candidates.length; i++) {
        picks.push(candidates[i]);
        usedLabels.add(candidates[i].label);
      }
    }

    // fill any shortfall from any category at this difficulty tier
    if (picks.length < count) {
      const fallback = shuffle(pool.filter(t =>
        t.difficulty === difficulty && !usedLabels.has(t.label)
      ));
      for (const t of fallback) {
        if (picks.length >= count) break;
        picks.push(t);
        usedLabels.add(t.label);
      }
    }

    return picks;
  }

  const allPicked = shuffle([
    ...pickDifficulty('easy',   easyCount),
    ...pickDifficulty('medium', mediumCount),
    ...pickDifficulty('hard',   hardCount),
  ]);

  return allPicked.slice(0, totalTiles).map((tile, idx) => {
    const row = Math.floor(idx / boardSize) + 1;
    const col = (idx % boardSize) + 1;
    return {
      coord:      `${COLS[col - 1]}${row}`,
      row,
      col,
      label:      tile.label,
      type:       tile.type,
      target:     scaleTarget(tile, teamSize, durationDays),
      wom_metric: tile.wom_metric,
      difficulty: tile.difficulty,
      category:   tile.category,
    };
  });
}

// POST /api/generate/preview — returns generated tiles without touching the DB
router.post('/preview', requireAdmin, (req, res) => {
  const { easyPct = 40, mediumPct = 40, hardPct = 20, pvmPct = 60, skillingPct = 30, collectionPct = 10 } = req.body;
  if ((easyPct + mediumPct + hardPct) !== 100)
    return res.status(400).json({ error: 'Difficulty percentages must sum to 100' });
  if ((pvmPct + skillingPct + collectionPct) !== 100)
    return res.status(400).json({ error: 'Category percentages must sum to 100' });

  res.json({ tiles: generateTiles(req.body) });
});

// POST /api/generate/apply — writes tiles to an event (optionally clears existing first)
router.post('/apply', requireAdmin, (req, res) => {
  const { eventId, tiles, clearExisting = true } = req.body;
  if (!eventId || !Array.isArray(tiles) || !tiles.length)
    return res.status(400).json({ error: 'eventId and tiles[] required' });

  const db = getDb();
  const event = db.prepare('SELECT * FROM events WHERE id = ?').get(eventId);
  if (!event) return res.status(404).json({ error: 'Event not found' });

  const maxDim = event.board_size;
  const badTile = tiles.find(t => t.row > maxDim || t.col > maxDim);
  if (badTile)
    return res.status(400).json({ error: `Tile ${badTile.coord} exceeds event board size (${maxDim}×${maxDim})` });

  db.transaction(() => {
    if (clearExisting) {
      const tileIds = db.prepare('SELECT id FROM tiles WHERE event_id = ?').all(eventId).map(r => r.id);
      if (tileIds.length) {
        const ph = tileIds.map(() => '?').join(',');
        db.prepare(`DELETE FROM tile_progress WHERE tile_id IN (${ph})`).run(...tileIds);
        db.prepare(`DELETE FROM submissions   WHERE tile_id IN (${ph})`).run(...tileIds);
      }
      db.prepare('DELETE FROM tiles WHERE event_id = ?').run(eventId);
    }

    const insert = db.prepare(
      'INSERT OR REPLACE INTO tiles (event_id, row, col, label, type, target, wom_metric) VALUES (?, ?, ?, ?, ?, ?, ?)'
    );
    for (const t of tiles) {
      insert.run(eventId, t.row, t.col, t.label, t.type, t.target, t.wom_metric || null);
    }
  })();

  res.json({ ok: true, count: tiles.length });
});

module.exports = router;

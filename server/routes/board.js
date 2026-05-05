const express = require('express');
const { getDb } = require('../db/database');
const { rowColToCoord, COLS } = require('./tiles');

const router = express.Router();

// Full board state for an event: tiles + progress per team
router.get('/event/:eventId', (req, res) => {
  const db = getDb();

  const event = db.prepare('SELECT * FROM events WHERE id = ?').get(req.params.eventId);
  if (!event) return res.status(404).json({ error: 'Event not found' });

  const tiles = db.prepare('SELECT * FROM tiles WHERE event_id = ? ORDER BY row, col').all(req.params.eventId);
  const teams = db.prepare('SELECT id, name, color FROM teams WHERE event_id = ?').all(req.params.eventId);
  const progress = db.prepare(
    'SELECT tp.* FROM tile_progress tp JOIN tiles t ON tp.tile_id = t.id WHERE t.event_id = ?'
  ).all(req.params.eventId);

  const progressMap = {};
  for (const p of progress) {
    if (!progressMap[p.tile_id]) progressMap[p.tile_id] = {};
    progressMap[p.tile_id][p.team_id] = { current: p.current, completed_at: p.completed_at };
  }

  const tilesWithProgress = tiles.map(t => ({
    ...t,
    coord: rowColToCoord(t.row, t.col),
    progress: progressMap[t.id] || {},
  }));

  res.json({ event, tiles: tilesWithProgress, teams });
});

module.exports = router;

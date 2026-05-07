const express = require('express');
const { getDb } = require('../db/database');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

const COLS = ['A','B','C','D','E','F','G','H','I'];

function coordToRowCol(coord) {
  const match = coord.toUpperCase().match(/^([A-I])([1-9])$/);
  if (!match) return null;
  return { col: COLS.indexOf(match[1]) + 1, row: parseInt(match[2]) };
}

function rowColToCoord(row, col) {
  return `${COLS[col - 1]}${row}`;
}

router.get('/event/:eventId', (req, res) => {
  const db = getDb();
  const tiles = db.prepare('SELECT * FROM tiles WHERE event_id = ? ORDER BY row, col').all(req.params.eventId);
  res.json(tiles.map(t => ({ ...t, coord: rowColToCoord(t.row, t.col) })));
});

router.post('/event/:eventId', requireAdmin, (req, res) => {
  const { coord, label, type, target, wom_metric, wom_competition_id, icon_url } = req.body;
  if (!coord || !label) return res.status(400).json({ error: 'coord and label required' });

  const pos = coordToRowCol(coord);
  if (!pos) return res.status(400).json({ error: 'Invalid coord (e.g. A1, B3)' });

  const db = getDb();
  try {
    const result = db.prepare(
      'INSERT INTO tiles (event_id, row, col, label, type, target, wom_metric, wom_competition_id, icon_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(req.params.eventId, pos.row, pos.col, label, type || 'drop', target || 1, wom_metric || null, wom_competition_id || null, icon_url || null);
    res.json({ id: result.lastInsertRowid, coord, label, type: type || 'drop', target: target || 1, icon_url: icon_url || null });
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(409).json({ error: 'Tile already exists at that coordinate' });
    throw e;
  }
});

router.put('/event/:eventId/bulk', requireAdmin, (req, res) => {
  const { tiles } = req.body;
  if (!Array.isArray(tiles)) return res.status(400).json({ error: 'tiles must be an array' });

  const db = getDb();
  const insert = db.prepare(
    'INSERT OR REPLACE INTO tiles (event_id, row, col, label, type, target, wom_metric) VALUES (?, ?, ?, ?, ?, ?, ?)'
  );

  const insertMany = db.transaction((tileList) => {
    for (const t of tileList) {
      const pos = coordToRowCol(t.coord);
      if (!pos) throw new Error(`Invalid coord: ${t.coord}`);
      insert.run(req.params.eventId, pos.row, pos.col, t.label, t.type || 'drop', t.target || 1, t.wom_metric || null);
    }
  });

  try {
    insertMany(tiles);
    res.json({ inserted: tiles.length });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.patch('/reorder', requireAdmin, (req, res) => {
  const { tiles } = req.body;
  if (!Array.isArray(tiles) || !tiles.length)
    return res.status(400).json({ error: 'tiles[] required' });
  const db = getDb();
  const update = db.prepare('UPDATE tiles SET row = ?, col = ? WHERE id = ?');
  db.transaction(() => {
    for (const t of tiles) update.run(t.row, t.col, t.id);
  })();
  res.json({ ok: true });
});

router.patch('/:id', requireAdmin, (req, res) => {
  const db = getDb();
  const { label, type, target, wom_metric, wom_competition_id, icon_url } = req.body;
  // icon_url and wom_competition_id can be explicitly set to null to clear them
  const hasIcon = Object.prototype.hasOwnProperty.call(req.body, 'icon_url');
  const hasWomComp = Object.prototype.hasOwnProperty.call(req.body, 'wom_competition_id');
  db.prepare(
    `UPDATE tiles SET
      label = COALESCE(?, label),
      type = COALESCE(?, type),
      target = COALESCE(?, target),
      wom_metric = COALESCE(?, wom_metric)
      ${hasIcon ? ', icon_url = ?' : ''}
      ${hasWomComp ? ', wom_competition_id = ?' : ''}
    WHERE id = ?`
  ).run(label, type, target, wom_metric, ...(hasIcon ? [icon_url] : []), ...(hasWomComp ? [wom_competition_id] : []), req.params.id);
  const tile = db.prepare('SELECT * FROM tiles WHERE id = ?').get(req.params.id);
  res.json({ ...tile, coord: rowColToCoord(tile.row, tile.col) });
});

router.delete('/:id', requireAdmin, (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM tiles WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = { router, coordToRowCol, rowColToCoord, COLS };

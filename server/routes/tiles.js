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
  const { coord, label, type, target, target2, wom_metric, wom_competition_id, icon_url } = req.body;
  if (!coord || !label) return res.status(400).json({ error: 'coord and label required' });

  const pos = coordToRowCol(coord);
  if (!pos) return res.status(400).json({ error: 'Invalid coord (e.g. A1, B3)' });

  const db = getDb();
  try {
    const result = db.prepare(
      'INSERT INTO tiles (event_id, row, col, label, type, target, target2, wom_metric, wom_competition_id, icon_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(req.params.eventId, pos.row, pos.col, label, type || 'drop', target || 1, target2 || null, wom_metric || null, wom_competition_id || null, icon_url || null);
    res.json({ id: result.lastInsertRowid, coord, label, type: type || 'drop', target: target || 1, target2: target2 || null, icon_url: icon_url || null });
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
    // Move all to temp negative positions first to avoid unique(event_id, row, col) conflicts
    for (let i = 0; i < tiles.length; i++) update.run(-(i + 1), -(i + 1), tiles[i].id);
    for (const t of tiles) update.run(t.row, t.col, t.id);
  })();
  res.json({ ok: true });
});

router.patch('/:id', requireAdmin, (req, res) => {
  const db = getDb();
  const { label, type, target, target2, wom_metric, wom_competition_id, icon_url } = req.body;
  const hasIcon = Object.prototype.hasOwnProperty.call(req.body, 'icon_url');
  const hasWomComp = Object.prototype.hasOwnProperty.call(req.body, 'wom_competition_id');
  const hasTarget2 = Object.prototype.hasOwnProperty.call(req.body, 'target2');
  db.prepare(
    `UPDATE tiles SET
      label = COALESCE(?, label),
      type = COALESCE(?, type),
      target = COALESCE(?, target),
      wom_metric = COALESCE(?, wom_metric)
      ${hasIcon ? ', icon_url = ?' : ''}
      ${hasWomComp ? ', wom_competition_id = ?' : ''}
      ${hasTarget2 ? ', target2 = ?' : ''}
    WHERE id = ?`
  ).run(label, type, target, wom_metric, ...(hasIcon ? [icon_url] : []), ...(hasWomComp ? [wom_competition_id] : []), ...(hasTarget2 ? [target2] : []), req.params.id);
  const tile = db.prepare('SELECT * FROM tiles WHERE id = ?').get(req.params.id);
  res.json({ ...tile, coord: rowColToCoord(tile.row, tile.col) });
});

router.get('/event/:eventId/wom-progress', requireAdmin, (req, res) => {
  const db = getDb();
  const rows = db.prepare(`
    SELECT t.id as tile_id, t.row, t.col, t.label, t.type, t.wom_metric, t.target,
           te.id as team_id, te.name as team_name, te.color as team_color,
           COALESCE(tp.current, 0) as current,
           tp.completed_at,
           COALESCE(tp.wom_override, 0) as wom_override
    FROM tiles t
    JOIN teams te ON te.event_id = t.event_id
    LEFT JOIN tile_progress tp ON tp.tile_id = t.id AND tp.team_id = te.id
    WHERE t.event_id = ? AND t.type != 'drop' AND t.wom_metric IS NOT NULL
    ORDER BY t.row, t.col, te.name
  `).all(req.params.eventId);
  res.json(rows);
});

router.patch('/:tileId/progress/:teamId', requireAdmin, (req, res) => {
  const db = getDb();
  const tileId = parseInt(req.params.tileId);
  const teamId = parseInt(req.params.teamId);
  const tile = db.prepare('SELECT * FROM tiles WHERE id = ?').get(tileId);
  if (!tile) return res.status(404).json({ error: 'Tile not found' });

  const existing = db.prepare('SELECT * FROM tile_progress WHERE tile_id = ? AND team_id = ?').get(tileId, teamId);
  const newCurrent = req.body.current !== undefined ? parseInt(req.body.current) : (existing?.current ?? 0);
  const newOverride = req.body.wom_override !== undefined ? (req.body.wom_override ? 1 : 0) : (existing?.wom_override ?? 0);
  const completedAt = newCurrent >= tile.target
    ? (existing?.completed_at || new Date().toISOString())
    : null;

  if (existing) {
    db.prepare(
      'UPDATE tile_progress SET current = ?, completed_at = ?, wom_override = ? WHERE tile_id = ? AND team_id = ?'
    ).run(newCurrent, completedAt, newOverride, tileId, teamId);
  } else {
    db.prepare(
      'INSERT INTO tile_progress (tile_id, team_id, current, completed_at, wom_override) VALUES (?, ?, ?, ?, ?)'
    ).run(tileId, teamId, newCurrent, completedAt, newOverride);
  }

  res.json(db.prepare('SELECT * FROM tile_progress WHERE tile_id = ? AND team_id = ?').get(tileId, teamId));
});

router.delete('/:id', requireAdmin, (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM tiles WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = { router, coordToRowCol, rowColToCoord, COLS };

const express = require('express');
const fs = require('fs');
const path = require('path');
const { getDb } = require('../db/database');
const { requireAdmin } = require('../middleware/auth');
const { logAudit } = require('../services/audit');

const UPLOAD_DIR = process.env.DATA_DIR
  ? path.join(process.env.DATA_DIR, 'uploads')
  : path.join(__dirname, '..', 'uploads');

const router = express.Router();

router.get('/', (req, res) => {
  const db = getDb();
  const events = db.prepare('SELECT * FROM events ORDER BY created_at DESC').all();
  res.json(events);
});

router.get('/active', (req, res) => {
  const db = getDb();
  const event = db.prepare("SELECT * FROM events WHERE status = 'active' ORDER BY started_at DESC LIMIT 1").get();
  res.json(event || null);
});

router.get('/:id', (req, res) => {
  const db = getDb();
  const event = db.prepare('SELECT * FROM events WHERE id = ?').get(req.params.id);
  if (!event) return res.status(404).json({ error: 'Not found' });
  res.json(event);
});

router.post('/', requireAdmin, (req, res) => {
  const { name, wom_competition_id, board_size } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });
  const size = Math.min(Math.max(parseInt(board_size) || 9, 3), 12);
  const db = getDb();
  const result = db.prepare(
    'INSERT INTO events (name, board_size, wom_competition_id) VALUES (?, ?, ?)'
  ).run(name, size, wom_competition_id || null);
  logAudit(req.user.id, req.user.username, 'event_created', 'event', result.lastInsertRowid,
    `Created event '${name}' (${size}×${size})`
  );
  res.json({ id: result.lastInsertRowid, name, board_size: size, status: 'setup' });
});

router.patch('/:id', requireAdmin, (req, res) => {
  const db = getDb();
  const event = db.prepare('SELECT * FROM events WHERE id = ?').get(req.params.id);
  if (!event) return res.status(404).json({ error: 'Not found' });

  const { name, status, wom_competition_id } = req.body;
  const updates = {};
  if (name !== undefined) updates.name = name;
  if (wom_competition_id !== undefined) updates.wom_competition_id = wom_competition_id;
  if (status !== undefined) {
    updates.status = status;
    if (status === 'active' && !event.started_at) updates.started_at = new Date().toISOString();
    if (status === 'completed' && !event.ended_at) updates.ended_at = new Date().toISOString();
  }

  const cols = Object.keys(updates).map(k => `${k} = ?`).join(', ');
  db.prepare(`UPDATE events SET ${cols} WHERE id = ?`).run(...Object.values(updates), req.params.id);
  if (status !== undefined) {
    logAudit(req.user.id, req.user.username, 'event_status_changed', 'event', parseInt(req.params.id),
      `Changed event '${event.name}' status: ${event.status} → ${status}`
    );
  }
  res.json(db.prepare('SELECT * FROM events WHERE id = ?').get(req.params.id));
});

router.delete('/:id', requireAdmin, (req, res) => {
  const db = getDb();
  const event = db.prepare('SELECT * FROM events WHERE id = ?').get(req.params.id);
  if (!event) return res.status(404).json({ error: 'Not found' });

  // Collect screenshot filenames before deletion so we can remove them from disk
  const screenshots = db.prepare(`
    SELECT s.screenshot_path
    FROM submissions s
    JOIN tiles t ON s.tile_id = t.id
    WHERE t.event_id = ? AND s.screenshot_path IS NOT NULL
  `).all(req.params.id).map(r => r.screenshot_path);

  // Count what we're about to remove for the audit entry
  const tileCount = db.prepare('SELECT COUNT(*) as c FROM tiles WHERE event_id = ?').get(req.params.id).c;
  const teamCount = db.prepare('SELECT COUNT(*) as c FROM teams WHERE event_id = ?').get(req.params.id).c;
  const subCount  = screenshots.length;

  // Delete all related rows in FK-safe order inside a transaction
  db.transaction(() => {
    const tileIds = db.prepare('SELECT id FROM tiles WHERE event_id = ?').all(req.params.id).map(r => r.id);
    const teamIds = db.prepare('SELECT id FROM teams WHERE event_id = ?').all(req.params.id).map(r => r.id);

    if (tileIds.length) {
      const tPlaceholders = tileIds.map(() => '?').join(',');
      db.prepare(`DELETE FROM submissions   WHERE tile_id IN (${tPlaceholders})`).run(...tileIds);
      db.prepare(`DELETE FROM tile_progress WHERE tile_id IN (${tPlaceholders})`).run(...tileIds);
      db.prepare(`DELETE FROM tiles         WHERE id      IN (${tPlaceholders})`).run(...tileIds);
    }
    if (teamIds.length) {
      const tmPlaceholders = teamIds.map(() => '?').join(',');
      // Unassign any users whose team is being removed
      db.prepare(`UPDATE users SET team_id = NULL WHERE team_id IN (${tmPlaceholders})`).run(...teamIds);
      db.prepare(`DELETE FROM team_members WHERE team_id IN (${tmPlaceholders})`).run(...teamIds);
      db.prepare(`DELETE FROM teams         WHERE id      IN (${tmPlaceholders})`).run(...teamIds);
    }
    db.prepare('DELETE FROM events WHERE id = ?').run(req.params.id);
  })();

  // Remove screenshot files from disk (best-effort, don't fail the request)
  let filesDeleted = 0;
  for (const filename of screenshots) {
    try { fs.unlinkSync(path.join(UPLOAD_DIR, filename)); filesDeleted++; } catch { /* already gone */ }
  }

  logAudit(req.user.id, req.user.username, 'event_deleted', 'event', parseInt(req.params.id),
    `Deleted event '${event.name}' — ${tileCount} tiles, ${teamCount} teams, ${subCount} submissions, ${filesDeleted} screenshot(s) removed`
  );

  res.json({ ok: true, filesDeleted });
});

module.exports = router;

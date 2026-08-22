const express = require('express');
const fs = require('fs');
const path = require('path');
const { getDb } = require('../db/database');
const { requireAdmin } = require('../middleware/auth');
const { logAudit } = require('../services/audit');
const { eventSnapshot } = require('../services/backup');

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

router.get('/upcoming', (req, res) => {
  const db = getDb();
  const today = new Date().toISOString().split('T')[0];
  const event = db.prepare(
    "SELECT * FROM events WHERE start_date IS NOT NULL AND start_date >= ? AND status != 'active' AND status != 'completed' ORDER BY start_date ASC LIMIT 1"
  ).get(today);
  res.json(event || null);
});

router.get('/last-completed', (req, res) => {
  const db = getDb();
  const event = db.prepare("SELECT * FROM events WHERE status = 'completed' ORDER BY ended_at DESC LIMIT 1").get();
  res.json(event || null);
});

router.get('/:id', (req, res) => {
  const db = getDb();
  const event = db.prepare('SELECT * FROM events WHERE id = ?').get(req.params.id);
  if (!event) return res.status(404).json({ error: 'Not found' });
  res.json(event);
});

router.post('/', requireAdmin, (req, res) => {
  const { name, wom_competition_id, board_size, start_date, end_date, mode } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });
  const size = Math.min(Math.max(parseInt(board_size) || 9, 3), 12);
  const eventMode = mode === 'points' ? 'points' : 'blackout';
  const db = getDb();
  const result = db.prepare(
    'INSERT INTO events (name, board_size, mode, wom_competition_id, start_date, end_date) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(name, size, eventMode, wom_competition_id || null, start_date || null, end_date || null);
  logAudit(req.user.id, req.user.username, 'event_created', 'event', result.lastInsertRowid,
    `Created event '${name}' (${size}×${size}, ${eventMode})`
  );
  res.json({ id: result.lastInsertRowid, name, board_size: size, mode: eventMode, status: 'setup', start_date: start_date || null, end_date: end_date || null });
});

router.patch('/:id', requireAdmin, (req, res) => {
  const db = getDb();
  const event = db.prepare('SELECT * FROM events WHERE id = ?').get(req.params.id);
  if (!event) return res.status(404).json({ error: 'Not found' });

  const { name, status, wom_competition_id, start_date, end_date, mode } = req.body;
  const updates = {};
  const changed = [];

  if (name !== undefined && name !== event.name) { updates.name = name; changed.push('name'); }
  if (wom_competition_id !== undefined) updates.wom_competition_id = wom_competition_id || null;
  if (start_date !== undefined) updates.start_date = start_date || null;
  if (end_date !== undefined) updates.end_date = end_date || null;
  if (mode !== undefined) updates.mode = mode === 'points' ? 'points' : 'blackout';

  if (status !== undefined) {
    if (!['setup', 'active', 'completed'].includes(status))
      return res.status(400).json({ error: 'Invalid status' });
    if (status === 'active') {
      const alreadyActive = db.prepare("SELECT id FROM events WHERE status = 'active' AND id != ?").get(req.params.id);
      if (alreadyActive) return res.status(409).json({ error: 'Another event is already active. End it before activating this one.' });
    }
    updates.status = status;
    if (status === 'active' && !event.started_at) updates.started_at = new Date().toISOString();
    if (status === 'completed' && !event.ended_at) updates.ended_at = new Date().toISOString();
  }

  if (Object.keys(updates).length) {
    const cols = Object.keys(updates).map(k => `${k} = ?`).join(', ');
    db.prepare(`UPDATE events SET ${cols} WHERE id = ?`).run(...Object.values(updates), req.params.id);
  }

  if (status !== undefined) {
    logAudit(req.user.id, req.user.username, 'event_status_changed', 'event', parseInt(req.params.id),
      `Changed event '${event.name}' status: ${event.status} → ${status}`
    );
    if (status === 'active') eventSnapshot(event.id, event.name, 'start');
    if (status === 'completed') eventSnapshot(event.id, event.name, 'end');
  } else if (Object.keys(updates).length) {
    logAudit(req.user.id, req.user.username, 'event_updated', 'event', parseInt(req.params.id),
      `Updated event '${event.name}': ${Object.keys(updates).join(', ')}`
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

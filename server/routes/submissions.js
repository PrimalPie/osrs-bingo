const express = require('express');
const { getDb } = require('../db/database');
const { requireCaptainOrAdmin, requireAdmin } = require('../middleware/auth');
const { rowColToCoord } = require('./tiles');
const { logAudit } = require('../services/audit');

const router = express.Router();

// Get pending submissions for a team (captain view)
router.get('/team/:teamId/pending', requireCaptainOrAdmin, (req, res) => {
  const db = getDb();
  if (req.user.role !== 'admin') {
    const freshUser = db.prepare('SELECT team_id FROM users WHERE id = ?').get(req.user.id);
    if (freshUser?.team_id !== parseInt(req.params.teamId)) return res.status(403).json({ error: 'Forbidden' });
  }
  const rows = db.prepare(`
    SELECT s.*, t.label as tile_label, t.type as tile_type, t.target as tile_target,
           t.row, t.col
    FROM submissions s
    JOIN tiles t ON s.tile_id = t.id
    WHERE s.team_id = ? AND s.status = 'pending'
    ORDER BY s.created_at ASC
  `).all(req.params.teamId);
  res.json(rows);
});

// Get all submissions for a tile+team
router.get('/tile/:tileId/team/:teamId', requireCaptainOrAdmin, (req, res) => {
  const db = getDb();
  const rows = db.prepare(
    "SELECT * FROM submissions WHERE tile_id = ? AND team_id = ? ORDER BY created_at DESC"
  ).all(req.params.tileId, req.params.teamId);
  res.json(rows);
});

// Get reviewed submissions (approved/rejected) for audit
router.get('/history', requireCaptainOrAdmin, (req, res) => {
  const db = getDb();
  if (req.user.role === 'admin') {
    const rows = db.prepare(`
      SELECT s.*, t.label as tile_label, t.type as tile_type, t.row, t.col,
             tm.name as team_name, tm.color as team_color
      FROM submissions s
      JOIN tiles t ON s.tile_id = t.id
      JOIN teams tm ON s.team_id = tm.id
      WHERE s.status != 'pending'
      ORDER BY s.reviewed_at DESC
      LIMIT 300
    `).all();
    res.json(rows);
  } else {
    const teamId = db.prepare('SELECT team_id FROM users WHERE id = ?').get(req.user.id)?.team_id;
    if (!teamId) return res.json([]);
    const rows = db.prepare(`
      SELECT s.*, t.label as tile_label, t.type as tile_type, t.row, t.col
      FROM submissions s
      JOIN tiles t ON s.tile_id = t.id
      WHERE s.team_id = ? AND s.status != 'pending'
      ORDER BY s.reviewed_at DESC
      LIMIT 300
    `).all(teamId);
    res.json(rows);
  }
});

// Get all pending across all teams (admin only)
router.get('/pending', requireAdmin, (req, res) => {
  const db = getDb();
  const rows = db.prepare(`
    SELECT s.*, t.label as tile_label, t.type as tile_type, t.target as tile_target,
           t.row, t.col, tm.name as team_name, tm.color as team_color
    FROM submissions s
    JOIN tiles t ON s.tile_id = t.id
    JOIN teams tm ON s.team_id = tm.id
    WHERE s.status = 'pending'
    ORDER BY s.created_at ASC
  `).all();
  res.json(rows);
});

// Approve a submission
router.post('/:id/approve', requireCaptainOrAdmin, (req, res) => {
  const db = getDb();
  const { count } = req.body;

  const sub = db.prepare('SELECT * FROM submissions WHERE id = ?').get(req.params.id);
  if (!sub) return res.status(404).json({ error: 'Not found' });
  if (sub.status !== 'pending') return res.status(400).json({ error: 'Already reviewed' });

  if (req.user.role !== 'admin') {
    const freshUser = db.prepare('SELECT team_id FROM users WHERE id = ?').get(req.user.id);
    if (freshUser?.team_id !== sub.team_id) return res.status(403).json({ error: 'Forbidden' });
  }

  const approvedCount = count ?? sub.count;

  const tile = db.prepare('SELECT * FROM tiles WHERE id = ?').get(sub.tile_id);

  const approveAndProgress = db.transaction(() => {
    db.prepare(
      "UPDATE submissions SET status = 'approved', count = ?, reviewed_by = ?, reviewed_at = ? WHERE id = ?"
    ).run(approvedCount, req.user.id, new Date().toISOString(), sub.id);

    const existing = db.prepare(
      'SELECT * FROM tile_progress WHERE tile_id = ? AND team_id = ?'
    ).get(sub.tile_id, sub.team_id);

    let newCurrent;
    if (existing) {
      newCurrent = Math.min(existing.current + approvedCount, tile.target);
      const completedAt = newCurrent >= tile.target ? new Date().toISOString() : existing.completed_at;
      db.prepare(
        'UPDATE tile_progress SET current = ?, completed_at = ? WHERE tile_id = ? AND team_id = ?'
      ).run(newCurrent, completedAt, sub.tile_id, sub.team_id);
    } else {
      newCurrent = Math.min(approvedCount, tile.target);
      const completedAt = newCurrent >= tile.target ? new Date().toISOString() : null;
      db.prepare(
        'INSERT INTO tile_progress (tile_id, team_id, current, completed_at) VALUES (?, ?, ?, ?)'
      ).run(sub.tile_id, sub.team_id, newCurrent, completedAt);
    }

    return { newCurrent, completed: newCurrent >= tile.target };
  });

  const result = approveAndProgress();

  if (req.io) {
    req.io.emit('progress_update', {
      team_id: sub.team_id,
      tile_id: sub.tile_id,
      current: result.newCurrent,
      target: tile.target,
      completed: result.completed,
    });
  }

  const coord = rowColToCoord(tile.row, tile.col);
  const teamName = db.prepare('SELECT name FROM teams WHERE id = ?').get(sub.team_id)?.name || 'Unknown';
  logAudit(req.user.id, req.user.username, 'submission_approved', 'submission', sub.id,
    `Approved ${coord} — ${tile.label} (+${approvedCount}) for ${teamName}. Progress: ${result.newCurrent}/${tile.target}${result.completed ? ' ✓ Tile complete' : ''}`
  );

  res.json({ ok: true, ...result });

  // Discord reaction + reply (non-blocking)
  (async () => {
    try {
      const bot = req.app.locals.bot;
      if (!bot || !sub.discord_message_id) return;
      const db2 = getDb();
      const team = db2.prepare('SELECT * FROM teams WHERE id = ?').get(sub.team_id);
      if (!team?.discord_channel_id) return;
      const channel = await bot.channels.fetch(team.discord_channel_id);
      const msg = await channel.messages.fetch(sub.discord_message_id);
      await msg.react('✅');
      const tileCoord = rowColToCoord(tile.row, tile.col);
      const completedText = result.completed ? ' 🎉 Tile complete!' : ` Progress: ${result.newCurrent}/${tile.target}`;
      await msg.reply(`✅ **${tileCoord} — ${tile.label}** approved (+${approvedCount}).${completedText}`);
    } catch (e) {
      console.warn('[Bot] Approve notification failed:', e.message);
    }
  })();

  // Announcement channel — fires only when a tile is fully completed
  if (result.completed) {
    (async () => {
      try {
        const announcementChannelId = process.env.DISCORD_ANNOUNCEMENT_CHANNEL_ID;
        const bot = req.app.locals.bot;
        if (!bot || !announcementChannelId) return;
        const db3 = getDb();
        const team = db3.prepare('SELECT name FROM teams WHERE id = ?').get(sub.team_id);
        const tileCoord = rowColToCoord(tile.row, tile.col);
        const channel = await bot.channels.fetch(announcementChannelId);
        await channel.send(`🎉 **${team?.name || 'A team'}** completed **${tileCoord} — ${tile.label}**!`);
      } catch (e) {
        console.warn('[Bot] Announcement failed:', e.message);
      }
    })();
  }
});

// Reject a submission
router.post('/:id/reject', requireCaptainOrAdmin, (req, res) => {
  const db = getDb();
  const { reason } = req.body;

  const sub = db.prepare('SELECT * FROM submissions WHERE id = ?').get(req.params.id);
  if (!sub) return res.status(404).json({ error: 'Not found' });
  if (sub.status !== 'pending') return res.status(400).json({ error: 'Already reviewed' });

  if (req.user.role !== 'admin') {
    const freshUser = db.prepare('SELECT team_id FROM users WHERE id = ?').get(req.user.id);
    if (freshUser?.team_id !== sub.team_id) return res.status(403).json({ error: 'Forbidden' });
  }

  const rejTile = db.prepare('SELECT * FROM tiles WHERE id = ?').get(sub.tile_id);

  db.prepare(
    "UPDATE submissions SET status = 'rejected', rejection_reason = ?, reviewed_by = ?, reviewed_at = ? WHERE id = ?"
  ).run(reason || null, req.user.id, new Date().toISOString(), sub.id);

  if (req.io) {
    req.io.emit('submission_rejected', { submission_id: parseInt(req.params.id), team_id: sub.team_id });
  }

  const rejCoord = rejTile ? rowColToCoord(rejTile.row, rejTile.col) : '?';
  const rejTeamName = db.prepare('SELECT name FROM teams WHERE id = ?').get(sub.team_id)?.name || 'Unknown';
  logAudit(req.user.id, req.user.username, 'submission_rejected', 'submission', sub.id,
    `Rejected ${rejCoord} — ${rejTile?.label || '?'} for ${rejTeamName}${reason ? `. Reason: ${reason}` : ''}`
  );

  res.json({ ok: true });

  // Discord reaction + reply (non-blocking)
  (async () => {
    try {
      const bot = req.app.locals.bot;
      if (!bot || !sub.discord_message_id) return;
      const db2 = getDb();
      const team = db2.prepare('SELECT * FROM teams WHERE id = ?').get(sub.team_id);
      if (!team?.discord_channel_id) return;
      const tile = db2.prepare('SELECT * FROM tiles WHERE id = ?').get(sub.tile_id);
      const channel = await bot.channels.fetch(team.discord_channel_id);
      const msg = await channel.messages.fetch(sub.discord_message_id);
      await msg.react('❌');
      const tileCoord = rowColToCoord(tile.row, tile.col);
      const reasonText = reason ? ` Reason: *${reason}*` : '';
      await msg.reply(`❌ **${tileCoord} — ${tile.label}** was rejected.${reasonText} Please resubmit if needed.`);
    } catch (e) {
      console.warn('[Bot] Reject notification failed:', e.message);
    }
  })();
});

module.exports = router;

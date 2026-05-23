const express = require('express');
const jwt = require('jsonwebtoken');
const { getDb } = require('../db/database');
const { requireAdmin, requireCaptainOrAdmin, JWT_SECRET } = require('../middleware/auth');
const { logAudit } = require('../services/audit');

function isAdmin(req) {
  try {
    const h = req.headers.authorization;
    if (!h?.startsWith('Bearer ')) return false;
    return jwt.verify(h.slice(7), JWT_SECRET).role === 'admin';
  } catch { return false; }
}

const router = express.Router();

// Captain: get own team with members — reads team_id from DB so JWT staleness doesn't matter
router.get('/mine', requireCaptainOrAdmin, (req, res) => {
  const db = getDb();
  const freshUser = db.prepare('SELECT team_id FROM users WHERE id = ?').get(req.user.id);
  const teamId = freshUser?.team_id;
  if (!teamId) return res.json(null);
  const team = db.prepare('SELECT * FROM teams WHERE id = ?').get(teamId);
  if (!team) return res.json(null);
  const members = db.prepare('SELECT * FROM team_members WHERE team_id = ?').all(teamId);
  res.json({ ...team, members });
});

router.get('/event/:eventId', (req, res) => {
  const db = getDb();
  const teams = db.prepare(`
    SELECT t.*, u.username AS captain_username
    FROM teams t
    LEFT JOIN users u ON u.team_id = t.id AND u.role = 'captain'
    WHERE t.event_id = ?
  `).all(req.params.eventId);
  const members = db.prepare(
    'SELECT tm.*, t.event_id FROM team_members tm JOIN teams t ON tm.team_id = t.id WHERE t.event_id = ?'
  ).all(req.params.eventId);
  const admin = isAdmin(req);
  res.json(teams.map(({ discord_channel_id, ...pub }) => ({
    ...(admin ? { discord_channel_id, ...pub } : pub),
    members: members.filter(m => m.team_id === pub.id),
  })));
});

router.post('/event/:eventId', requireAdmin, (req, res) => {
  const { name, color, discord_channel_id } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });
  const db = getDb();
  const result = db.prepare(
    'INSERT INTO teams (event_id, name, color, discord_channel_id) VALUES (?, ?, ?, ?)'
  ).run(req.params.eventId, name, color || '#e84141', discord_channel_id || null);
  res.json({ id: result.lastInsertRowid, name, event_id: parseInt(req.params.eventId) });
});

router.patch('/:id', requireAdmin, (req, res) => {
  const db = getDb();
  const { name, color, discord_channel_id, captain_id } = req.body;
  db.prepare(
    `UPDATE teams SET
      name = COALESCE(?, name),
      color = COALESCE(?, color),
      discord_channel_id = COALESCE(?, discord_channel_id),
      captain_id = COALESCE(?, captain_id)
    WHERE id = ?`
  ).run(name, color, discord_channel_id, captain_id, req.params.id);
  res.json(db.prepare('SELECT * FROM teams WHERE id = ?').get(req.params.id));
});

router.delete('/:id', requireAdmin, (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM teams WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// Members
router.post('/:id/members', requireCaptainOrAdmin, (req, res) => {
  const db = getDb();
  // Captains can only modify their own team
  if (req.user.role !== 'admin') {
    const freshUser = db.prepare('SELECT team_id FROM users WHERE id = ?').get(req.user.id);
    if (freshUser?.team_id !== parseInt(req.params.id)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
  }
  const { osrs_name, discord_username } = req.body;
  if (!osrs_name) return res.status(400).json({ error: 'osrs_name required' });
  try {
    const result = db.prepare(
      'INSERT INTO team_members (team_id, osrs_name, discord_username) VALUES (?, ?, ?)'
    ).run(req.params.id, osrs_name, discord_username || null);
    const teamName = db.prepare('SELECT name FROM teams WHERE id = ?').get(req.params.id)?.name || req.params.id;
    logAudit(req.user.id, req.user.username, 'member_added', 'team_member', result.lastInsertRowid,
      `Added '${osrs_name}'${discord_username ? ` (Discord: ${discord_username})` : ''} to ${teamName}`
    );
    res.json({ id: result.lastInsertRowid, osrs_name, discord_username });
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(409).json({ error: 'Member already on team' });
    throw e;
  }
});

router.delete('/:id/members/:memberId', requireCaptainOrAdmin, (req, res) => {
  const db = getDb();
  // Captains can only modify their own team
  if (req.user.role !== 'admin') {
    const freshUser = db.prepare('SELECT team_id FROM users WHERE id = ?').get(req.user.id);
    if (freshUser?.team_id !== parseInt(req.params.id)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
  }
  const member = db.prepare('SELECT * FROM team_members WHERE id = ? AND team_id = ?').get(req.params.memberId, req.params.id);
  db.prepare('DELETE FROM team_members WHERE id = ? AND team_id = ?').run(req.params.memberId, req.params.id);
  if (member) {
    const teamName = db.prepare('SELECT name FROM teams WHERE id = ?').get(req.params.id)?.name || req.params.id;
    logAudit(req.user.id, req.user.username, 'member_removed', 'team_member', parseInt(req.params.memberId),
      `Removed '${member.osrs_name}' from ${teamName}`
    );
  }
  res.json({ ok: true });
});

module.exports = router;

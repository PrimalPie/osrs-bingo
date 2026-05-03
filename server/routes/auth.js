const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDb } = require('../db/database');
const { JWT_SECRET, requireAdmin } = require('../middleware/auth');
const { logAudit } = require('../services/audit');

const router = express.Router();

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Missing credentials' });

  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role, team_id: user.team_id },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
  res.json({ token, user: { id: user.id, username: user.username, role: user.role, team_id: user.team_id } });
});

router.post('/register', requireAdmin, (req, res) => {
  const { username, password, role, team_id } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Missing fields' });

  const db = getDb();
  const hash = bcrypt.hashSync(password, 10);
  try {
    const finalRole = role || 'captain';
    const result = db.prepare(
      'INSERT INTO users (username, password_hash, role, team_id) VALUES (?, ?, ?, ?)'
    ).run(username, hash, finalRole, team_id || null);
    logAudit(req.user.id, req.user.username, 'user_created', 'user', result.lastInsertRowid,
      `Created ${finalRole} '${username}'${team_id ? ` (team id ${team_id})` : ''}`
    );
    res.json({ id: result.lastInsertRowid, username, role: finalRole });
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(409).json({ error: 'Username taken' });
    throw e;
  }
});

// Bootstrap: create first admin if no users exist
router.post('/bootstrap', (req, res) => {
  const db = getDb();
  const count = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
  if (count > 0) return res.status(409).json({ error: 'Already initialized' });

  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Missing fields' });

  const hash = bcrypt.hashSync(password, 10);
  const result = db.prepare(
    'INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)'
  ).run(username, hash, 'admin');
  res.json({ id: result.lastInsertRowid, username, role: 'admin' });
});

// List all users (admin only)
router.get('/users', requireAdmin, (req, res) => {
  const db = getDb();
  const users = db.prepare(`
    SELECT u.id, u.username, u.role, u.team_id, t.name as team_name
    FROM users u
    LEFT JOIN teams t ON u.team_id = t.id
    ORDER BY u.role DESC, u.username ASC
  `).all();
  res.json(users);
});

// Update user — role, team, or password reset (admin only)
router.patch('/users/:id', requireAdmin, (req, res) => {
  const db = getDb();
  const { role, team_id, password, username } = req.body;
  const updates = {};
  if (username !== undefined) updates.username = username;
  if (role !== undefined) updates.role = role;
  if (team_id !== undefined) updates.team_id = team_id || null;
  if (password) updates.password_hash = bcrypt.hashSync(password, 10);
  if (!Object.keys(updates).length) return res.status(400).json({ error: 'Nothing to update' });
  const cols = Object.keys(updates).map(k => `${k} = ?`).join(', ');
  try {
    const target = db.prepare('SELECT username FROM users WHERE id = ?').get(req.params.id);
    db.prepare(`UPDATE users SET ${cols} WHERE id = ?`).run(...Object.values(updates), req.params.id);
    const changed = Object.keys(updates).filter(k => k !== 'password_hash').join(', ') || 'password';
    logAudit(req.user.id, req.user.username, 'user_updated', 'user', parseInt(req.params.id),
      `Updated '${target?.username || req.params.id}': ${changed}`
    );
    res.json(db.prepare('SELECT id, username, role, team_id FROM users WHERE id = ?').get(req.params.id));
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(409).json({ error: 'Username taken' });
    throw e;
  }
});

// Delete user (admin only, can't delete yourself)
router.delete('/users/:id', requireAdmin, (req, res) => {
  const db = getDb();
  if (req.user.id === parseInt(req.params.id)) return res.status(400).json({ error: "Can't delete yourself" });
  const target = db.prepare('SELECT username, role FROM users WHERE id = ?').get(req.params.id);
  db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
  logAudit(req.user.id, req.user.username, 'user_deleted', 'user', parseInt(req.params.id),
    `Deleted ${target?.role || 'user'} '${target?.username || req.params.id}'`
  );
  res.json({ ok: true });
});

router.get('/me', (req, res) => {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: 'Unauthorized' });
  let decoded;
  try {
    decoded = jwt.verify(header.slice(7), JWT_SECRET);
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
  // Always read from DB so team/role changes are reflected without re-login
  const db = getDb();
  const user = db.prepare('SELECT id, username, role, team_id FROM users WHERE id = ?').get(decoded.id);
  if (!user) return res.status(401).json({ error: 'User not found' });
  res.json(user);
});

module.exports = router;

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const { getDb } = require('../db/database');
const { JWT_SECRET, requireAdmin } = require('../middleware/auth');
const { logAudit } = require('../services/audit');

const router = express.Router();

const VALID_ROLES = ['admin', 'captain', 'member'];
const USERNAME_RE = /^[a-zA-Z0-9_\-]{1,32}$/;

function validateCredentials(username, password) {
  if (!username || !password) return 'Missing credentials';
  if (!USERNAME_RE.test(username)) return 'Username must be 1–32 characters (letters, numbers, _ -)';
  if (password.length < 8) return 'Password must be at least 8 characters';
  return null;
}

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts — try again in 15 minutes' },
});

router.post('/login', loginLimiter, (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Missing credentials' });

  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE LOWER(username) = LOWER(?)').get(username);
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
  const err = validateCredentials(username, password);
  if (err) return res.status(400).json({ error: err });

  const finalRole = role || 'captain';
  if (!VALID_ROLES.includes(finalRole)) return res.status(400).json({ error: 'Invalid role' });

  const db = getDb();
  const hash = bcrypt.hashSync(password, 10);
  try {
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
  const err = validateCredentials(username, password);
  if (err) return res.status(400).json({ error: err });

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
    SELECT u.id, u.username, u.role, u.team_id, t.name as team_name, e.name as event_name
    FROM users u
    LEFT JOIN teams t ON u.team_id = t.id
    LEFT JOIN events e ON t.event_id = e.id
    ORDER BY u.role DESC, u.username ASC
  `).all();
  res.json(users);
});

// Update user — role, team, or password reset (admin only)
router.patch('/users/:id', requireAdmin, (req, res) => {
  const db = getDb();
  // Admins cannot modify other admin accounts
  if (req.user.id !== parseInt(req.params.id)) {
    const target = db.prepare('SELECT role FROM users WHERE id = ?').get(req.params.id);
    if (target?.role === 'admin') return res.status(403).json({ error: 'Cannot modify another admin account' });
  }
  const { role, team_id, password, username } = req.body;
  if (username !== undefined && !USERNAME_RE.test(username))
    return res.status(400).json({ error: 'Invalid username' });
  if (role !== undefined && !VALID_ROLES.includes(role))
    return res.status(400).json({ error: 'Invalid role' });
  if (password !== undefined && password.length < 8)
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
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

// Delete user (admin only, can't delete yourself or other admins)
router.delete('/users/:id', requireAdmin, (req, res) => {
  const db = getDb();
  if (req.user.id === parseInt(req.params.id)) return res.status(400).json({ error: "Can't delete yourself" });
  const target = db.prepare('SELECT username, role FROM users WHERE id = ?').get(req.params.id);
  if (target?.role === 'admin') return res.status(403).json({ error: 'Cannot delete another admin account' });
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

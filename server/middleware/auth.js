const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'local-dev-secret';

if (!process.env.JWT_SECRET) {
  console.warn('[Auth] WARNING: JWT_SECRET is not set — using insecure default. Set JWT_SECRET env var in production!');
}

function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    req.user = jwt.verify(header.slice(7), JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    next();
  });
}

function requireCaptainOrAdmin(req, res, next) {
  requireAuth(req, res, () => {
    if (req.user.role !== 'admin' && req.user.role !== 'captain') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  });
}

module.exports = { requireAuth, requireAdmin, requireCaptainOrAdmin, JWT_SECRET };

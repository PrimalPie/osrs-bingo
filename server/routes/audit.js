const express = require('express');
const { getDb } = require('../db/database');
const { requireAdmin } = require('../middleware/auth');
const CHANGELOG = require('../data/changelog');

const router = express.Router();

router.get('/log', requireAdmin, (req, res) => {
  const db = getDb();
  const rows = db.prepare(
    'SELECT * FROM audit_log ORDER BY created_at DESC LIMIT 500'
  ).all();
  res.json(rows);
});

router.get('/changelog', (_req, res) => {
  res.json(CHANGELOG);
});

module.exports = router;

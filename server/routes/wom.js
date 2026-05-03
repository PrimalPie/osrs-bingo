const express = require('express');
const { requireAdmin } = require('../middleware/auth');
const { syncWomTiles, getLastSync } = require('../services/wom');

const router = express.Router();

router.get('/status', requireAdmin, (_req, res) => {
  res.json({ lastSync: getLastSync() });
});

router.post('/sync', requireAdmin, async (req, res) => {
  try {
    await syncWomTiles(req.io);
    res.json({ ok: true, lastSync: getLastSync() });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;

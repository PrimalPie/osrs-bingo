const fs = require('fs');
const path = require('path');
const { getDb } = require('../db/database');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..');
const BACKUP_DIR = path.join(DATA_DIR, 'backups');

function createBackup(relPath) {
  try {
    const dest = path.join(BACKUP_DIR, relPath);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    if (fs.existsSync(dest)) fs.unlinkSync(dest);
    const db = getDb();
    db.exec(`VACUUM INTO '${dest.replace(/'/g, "''")}'`);
    console.log(`[Backup] Created: ${dest}`);
  } catch (e) {
    console.error(`[Backup] Failed (${relPath}):`, e.message);
  }
}

function dailyBackup() {
  const db = getDb();
  const activeEvent = db.prepare("SELECT id FROM events WHERE status = 'active'").get();
  if (!activeEvent) return;
  const today = new Date().toISOString().split('T')[0];
  const dest = path.join(BACKUP_DIR, `daily/bingo-${today}.db`);
  if (fs.existsSync(dest)) return;
  createBackup(`daily/bingo-${today}.db`);
}

function eventSnapshot(eventId, eventName, when) {
  const safeName = eventName.replace(/[^a-z0-9]/gi, '-').toLowerCase().slice(0, 30);
  createBackup(`events/event-${eventId}-${safeName}-${when}.db`);
}

module.exports = { dailyBackup, eventSnapshot };

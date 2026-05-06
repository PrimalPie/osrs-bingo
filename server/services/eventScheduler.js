const { getDb } = require('../db/database');
const { logAudit } = require('./audit');

const POLL_MS = 60_000;

function tick(io) {
  const db = getDb();
  const now = new Date().toISOString();

  // Auto-complete active events whose end_date has passed
  const toComplete = db.prepare(
    "SELECT * FROM events WHERE status = 'active' AND end_date IS NOT NULL AND end_date <= ?"
  ).all(now);

  for (const event of toComplete) {
    db.prepare("UPDATE events SET status = 'completed', ended_at = ? WHERE id = ?").run(now, event.id);
    logAudit(null, 'system', 'event_status_changed', 'event', event.id,
      `Auto-completed '${event.name}' (end_date ${event.end_date} reached)`);
    console.log(`[Scheduler] Auto-completed event '${event.name}' (id=${event.id})`);
    if (io) io.emit('event_status_changed', { eventId: event.id, status: 'completed' });
  }

  // Auto-activate setup events whose start_date has passed (earliest first, one at a time)
  const toActivate = db.prepare(
    "SELECT * FROM events WHERE status = 'setup' AND start_date IS NOT NULL AND start_date <= ? ORDER BY start_date ASC"
  ).all(now);

  for (const event of toActivate) {
    const alreadyActive = db.prepare("SELECT id FROM events WHERE status = 'active'").get();
    if (alreadyActive) {
      console.log(`[Scheduler] Skipping auto-activate for '${event.name}' — another event is already active`);
      break;
    }
    db.prepare("UPDATE events SET status = 'active', started_at = ? WHERE id = ?").run(now, event.id);
    logAudit(null, 'system', 'event_status_changed', 'event', event.id,
      `Auto-activated '${event.name}' (start_date ${event.start_date} reached)`);
    console.log(`[Scheduler] Auto-activated event '${event.name}' (id=${event.id})`);
    if (io) io.emit('event_status_changed', { eventId: event.id, status: 'active' });
  }
}

function startEventScheduler(io) {
  tick(io);
  setInterval(() => tick(io), POLL_MS);
  console.log('[Scheduler] Event scheduler started (interval: 60s)');
}

module.exports = { startEventScheduler };

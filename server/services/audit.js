const { getDb } = require('../db/database');

function logAudit(actorId, actorUsername, action, entityType, entityId, details) {
  try {
    const db = getDb();
    db.prepare(
      'INSERT INTO audit_log (actor_id, actor_username, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(actorId ?? null, actorUsername, action, entityType ?? null, entityId ?? null, details ?? null);
  } catch (e) {
    console.warn('[Audit] Failed to log:', e.message);
  }
}

module.exports = { logAudit };

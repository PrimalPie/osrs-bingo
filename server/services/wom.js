const fetch = require('node-fetch');
const { getDb } = require('../db/database');

const WOM_BASE = 'https://api.wiseoldman.net/v2';
const POLL_INTERVAL = 3 * 60 * 60 * 1000; // 3 hours

let lastSync = null;
function getLastSync() { return lastSync; }

async function fetchCompetitionParticipants(competitionId, metric) {
  const url = metric
    ? `${WOM_BASE}/competitions/${competitionId}?metric=${metric}`
    : `${WOM_BASE}/competitions/${competitionId}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`WOM API error ${res.status} for competition ${competitionId}${metric ? ` (metric: ${metric})` : ''}`);
  const data = await res.json();
  return data.participations ?? [];
}

async function syncWomTiles(io) {
  const db = getDb();
  const event = db.prepare("SELECT * FROM events WHERE status = 'active' LIMIT 1").get();
  if (!event) return;

  // Tiles with their own competition ID, or tiles that can fall back to the event's competition
  const womTiles = db.prepare(`
    SELECT * FROM tiles WHERE event_id = ? AND (
      wom_competition_id IS NOT NULL
      OR (wom_metric IS NOT NULL AND ? IS NOT NULL)
    )
  `).all(event.id, event.wom_competition_id);
  if (!womTiles.length) return;

  const teams = db.prepare('SELECT * FROM teams WHERE event_id = ?').all(event.id);
  const members = db.prepare(
    'SELECT tm.* FROM team_members tm JOIN teams t ON tm.team_id = t.id WHERE t.event_id = ?'
  ).all(event.id);

  // Fetch participants once per unique (competitionId, metric) pair
  const fetchKeys = new Map();
  for (const tile of womTiles) {
    const compId = tile.wom_competition_id || event.wom_competition_id;
    if (!compId) continue;
    const metric = tile.wom_metric || null;
    const key = `${compId}:${metric || ''}`;
    if (!fetchKeys.has(key)) fetchKeys.set(key, { compId, metric });
  }

  const participantsByKey = {};
  for (const [key, { compId, metric }] of fetchKeys) {
    try {
      participantsByKey[key] = await fetchCompetitionParticipants(compId, metric);
    } catch (e) {
      console.error(`[WOM] Failed to fetch competition ${compId} metric ${metric || 'default'}:`, e.message);
    }
  }

  for (const tile of womTiles) {
    const compId = tile.wom_competition_id || event.wom_competition_id;
    if (!compId) continue;
    const metric = tile.wom_metric || null;
    const key = `${compId}:${metric || ''}`;
    const participants = participantsByKey[key];
    if (!participants) continue;

    for (const team of teams) {
      const teamMembers = members.filter(m => m.team_id === team.id);

      let totalGained = 0;
      for (const member of teamMembers) {
        const name = (member.osrs_name || member.discord_username).toLowerCase();
        const participant = participants.find(p =>
          p.player?.displayName?.toLowerCase() === name ||
          p.player?.username?.toLowerCase() === name
        );
        if (participant) {
          totalGained += participant.progress?.gained ?? 0;
        }
      }

      const capped = Math.min(totalGained, tile.target);
      const existing = db.prepare(
        'SELECT * FROM tile_progress WHERE tile_id = ? AND team_id = ?'
      ).get(tile.id, team.id);

      if (existing) {
        if (existing.current === capped) continue;
        const completedAt = capped >= tile.target
          ? (existing.completed_at || new Date().toISOString())
          : null;
        db.prepare(
          'UPDATE tile_progress SET current = ?, completed_at = ? WHERE tile_id = ? AND team_id = ?'
        ).run(capped, completedAt, tile.id, team.id);
      } else {
        const completedAt = capped >= tile.target ? new Date().toISOString() : null;
        db.prepare(
          'INSERT INTO tile_progress (tile_id, team_id, current, completed_at) VALUES (?, ?, ?, ?)'
        ).run(tile.id, team.id, capped, completedAt);
      }

      if (io) {
        io.emit('progress_update', {
          team_id: team.id,
          tile_id: tile.id,
          current: capped,
          completed: capped >= tile.target,
        });
      }
    }
  }

  lastSync = new Date().toISOString();
  console.log(`[WOM] Synced ${fetchKeys.size} competition/metric pair(s) for ${womTiles.length} tile(s), event ${event.id}`);
}

function startWomPoller(io) {
  syncWomTiles(io).catch(e => console.error('[WOM] Sync error:', e.message));
  return setInterval(() => {
    syncWomTiles(io).catch(e => console.error('[WOM] Sync error:', e.message));
  }, POLL_INTERVAL);
}

module.exports = { startWomPoller, syncWomTiles, getLastSync };

const fetch = require('node-fetch');
const { getDb } = require('../db/database');

const WOM_BASE = 'https://api.wiseoldman.net/v2';
const POLL_INTERVAL = 3 * 60 * 60 * 1000; // 3 hours

let lastSync = null;
function getLastSync() { return lastSync; }

async function fetchCompetitionParticipants(competitionId) {
  const res = await fetch(`${WOM_BASE}/competitions/${competitionId}`);
  if (!res.ok) throw new Error(`WOM API error ${res.status} for competition ${competitionId}`);
  const data = await res.json();
  return data.participations ?? [];
}

async function syncWomTiles(io) {
  const db = getDb();
  const event = db.prepare("SELECT * FROM events WHERE status = 'active' LIMIT 1").get();
  if (!event) return;

  // Both XP and KC tiles can have a per-tile competition ID
  const womTiles = db.prepare(
    'SELECT * FROM tiles WHERE event_id = ? AND wom_competition_id IS NOT NULL'
  ).all(event.id);
  if (!womTiles.length) return;

  const teams = db.prepare('SELECT * FROM teams WHERE event_id = ?').all(event.id);
  const members = db.prepare(
    'SELECT tm.* FROM team_members tm JOIN teams t ON tm.team_id = t.id WHERE t.event_id = ?'
  ).all(event.id);

  // Fetch participants once per unique competition ID
  const compIds = [...new Set(womTiles.map(t => t.wom_competition_id))];
  const participantsByComp = {};
  for (const compId of compIds) {
    try {
      participantsByComp[compId] = await fetchCompetitionParticipants(compId);
    } catch (e) {
      console.error(`[WOM] Failed to fetch competition ${compId}:`, e.message);
    }
  }

  for (const tile of womTiles) {
    const participants = participantsByComp[tile.wom_competition_id];
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
  console.log(`[WOM] Synced ${compIds.length} competition(s) for ${womTiles.length} tile(s), event ${event.id}`);
}

function startWomPoller(io) {
  syncWomTiles(io).catch(e => console.error('[WOM] Sync error:', e.message));
  return setInterval(() => {
    syncWomTiles(io).catch(e => console.error('[WOM] Sync error:', e.message));
  }, POLL_INTERVAL);
}

module.exports = { startWomPoller, syncWomTiles, getLastSync };

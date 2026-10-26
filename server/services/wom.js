const fetch = require('node-fetch');
const { getDb } = require('../db/database');

const WOM_BASE = 'https://api.wiseoldman.net/v2';
const POLL_INTERVAL = 2 * 60 * 60 * 1000; // 2 hours

let lastSync = null;
function getLastSync() { return lastSync; }

const WOM_HEADERS = {
  'User-Agent': 'osrs-bingo-tracker/1.0 (self-hosted clan bingo; contact: joseph@farah.gg)',
  ...(process.env.WOM_API_KEY ? { 'x-api-key': process.env.WOM_API_KEY } : {}),
};

async function fetchCompetitionParticipants(competitionId, metric) {
  const url = metric
    ? `${WOM_BASE}/competitions/${encodeURIComponent(competitionId)}?metric=${encodeURIComponent(metric)}`
    : `${WOM_BASE}/competitions/${encodeURIComponent(competitionId)}`;
  const res = await fetch(url, { headers: WOM_HEADERS });
  if (!res.ok) throw new Error(`WOM API error ${res.status} for competition ${competitionId}${metric ? ` (metric: ${metric})` : ''}`);
  const data = await res.json();
  return data.participations ?? [];
}

const FETCH_DELAY_MS = 350;

async function syncWomTiles(io) {
  const db = getDb();
  const event = db.prepare("SELECT * FROM events WHERE status = 'active' LIMIT 1").get();
  if (!event) return;

  // Only xp/kc tiles — drop tiles are always managed by captain submissions, never WOM
  const womTiles = db.prepare(`
    SELECT * FROM tiles WHERE event_id = ? AND type != 'drop' AND (
      wom_competition_id IS NOT NULL
      OR (wom_metric IS NOT NULL AND ? IS NOT NULL)
    )
  `).all(event.id, event.wom_competition_id);
  if (!womTiles.length) return;

  const teams = db.prepare('SELECT * FROM teams WHERE event_id = ?').all(event.id);
  const members = db.prepare(
    'SELECT tm.* FROM team_members tm JOIN teams t ON tm.team_id = t.id WHERE t.event_id = ?'
  ).all(event.id);

  // Deduplicate by (competitionId, metric) then fetch sequentially with a delay to avoid rate limiting
  const fetchKeys = new Map();
  for (const tile of womTiles) {
    const compId = tile.wom_competition_id || event.wom_competition_id;
    if (!compId) continue;
    const metric = tile.wom_metric || null;
    const key = `${compId}:${metric || ''}`;
    if (!fetchKeys.has(key)) fetchKeys.set(key, { compId, metric });
  }

  const participantsByKey = {};
  let isFirst = true;
  for (const [key, { compId, metric }] of fetchKeys) {
    if (!isFirst) await new Promise(r => setTimeout(r, FETCH_DELAY_MS));
    isFirst = false;
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

      // OR-condition tiles (target2) share this same wom_metric, so both conditions track
      // against the same gained total — whichever target is reached first completes the tile.
      const capped = Math.min(totalGained, tile.target);
      const capped2 = tile.target2 != null ? Math.min(totalGained, tile.target2) : null;
      const existing = db.prepare(
        'SELECT * FROM tile_progress WHERE tile_id = ? AND team_id = ?'
      ).get(tile.id, team.id);

      if (existing) {
        if (existing.wom_override) continue;
        const newCurrent2 = capped2 != null ? capped2 : (existing.current2 ?? 0);
        if (existing.current === capped && (existing.current2 ?? 0) === newCurrent2) continue;
        const completed = capped >= tile.target || (capped2 != null && newCurrent2 >= tile.target2);
        const completedAt = completed
          ? (existing.completed_at || new Date().toISOString())
          : null;
        db.prepare(
          'UPDATE tile_progress SET current = ?, current2 = ?, completed_at = ? WHERE tile_id = ? AND team_id = ?'
        ).run(capped, newCurrent2, completedAt, tile.id, team.id);
        if (io) {
          io.emit('progress_update', { team_id: team.id, tile_id: tile.id, current: capped, current2: newCurrent2, completed });
        }
      } else {
        const newCurrent2 = capped2 != null ? capped2 : 0;
        const completed = capped >= tile.target || (capped2 != null && newCurrent2 >= tile.target2);
        const completedAt = completed ? new Date().toISOString() : null;
        db.prepare(
          'INSERT INTO tile_progress (tile_id, team_id, current, current2, completed_at) VALUES (?, ?, ?, ?, ?)'
        ).run(tile.id, team.id, capped, newCurrent2, completedAt);
        if (io) {
          io.emit('progress_update', { team_id: team.id, tile_id: tile.id, current: capped, current2: newCurrent2, completed });
        }
      }
    }
  }

  lastSync = new Date().toISOString();
  const fetched = Object.keys(participantsByKey).length;
  console.log(`[WOM] Synced ${fetched}/${fetchKeys.size} metric(s) for ${womTiles.length} tile(s), event ${event.id}`);
}

function startWomPoller(io) {
  syncWomTiles(io).catch(e => console.error('[WOM] Sync error:', e.message));
  return setInterval(() => {
    syncWomTiles(io).catch(e => console.error('[WOM] Sync error:', e.message));
  }, POLL_INTERVAL);
}

module.exports = { startWomPoller, syncWomTiles, getLastSync };

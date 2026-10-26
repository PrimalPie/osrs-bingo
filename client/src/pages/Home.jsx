import React, { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../api';
import socket from '../socket';
import { useAuth } from '../App';
import Panel, { OSRS, FONT } from '../components/osrs/Panel';
import Button from '../components/osrs/Button';
import Modal from '../components/osrs/Modal';
import { ui } from '../components/osrs/styles';
import cup from '../assets/ui/cup.png';
import { formatTarget, tileTypeLabel } from '../utils';
import '../styles/osrs.css';

const COLS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];
const TILE = 120;
const GAP = 8;
const BAR_W = 104;
const ICON_SIZE = 40;
const TILE_ICON_SIZE = 28;

function pad(n) { return String(n).padStart(2, '0'); }

function Countdown({ dateStr }) {
  const [parts, setParts] = useState(null);

  useEffect(() => {
    const target = new Date(dateStr).getTime();
    function tick() {
      const diff = target - Date.now();
      if (diff <= 0) { setParts(null); return; }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const sec = Math.floor((diff % 60000) / 1000);
      setParts({ d, h, m, sec });
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [dateStr]);

  if (!parts) return <span style={{ color: OSRS.muted }}>soon</span>;
  const { d, h, m, sec } = parts;
  return (
    <span style={{ fontVariantNumeric: 'tabular-nums' }}>
      {d > 0 && <>{d}<span style={{ color: OSRS.muted }}>d </span></>}
      {pad(h)}<span style={{ color: OSRS.muted }}>h </span>
      {pad(m)}<span style={{ color: OSRS.muted }}>m </span>
      {pad(sec)}<span style={{ color: OSRS.muted }}>s</span>
    </span>
  );
}

function gmtOffset() {
  const off = new Date().getTimezoneOffset();
  const h = Math.floor(Math.abs(off) / 60);
  const m = Math.abs(off) % 60;
  const sign = off <= 0 ? '+' : '-';
  return m > 0 ? `GMT${sign}${h}:${String(m).padStart(2, '0')}` : `GMT${sign}${h}`;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function fmtDate(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d)) return null;
  const base = `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  const hasTime = dateStr.includes('T') && (d.getHours() || d.getMinutes());
  return hasTime ? `${base} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}` : base;
}

function computeScores(tiles, teams, boardSize) {
  const n = boardSize;
  const full = arr => arr.every(Boolean);

  return teams.map(team => {
    const tid = team.id;
    let tilesComplete = 0, tilePoints = 0;
    const grid = {};

    for (const tile of tiles) {
      if (tile.progress?.[tid]?.completed_at) {
        tilesComplete++;
        tilePoints += 5;
        if (!grid[tile.row]) grid[tile.row] = {};
        grid[tile.row][tile.col] = true;
      }
    }

    let lineBonus = 0, lines = 0;
    for (let r = 1; r <= n; r++) {
      if (full(Array.from({ length: n }, (_, i) => grid[r]?.[i + 1]))) { lineBonus += 50; lines++; }
    }
    for (let c = 1; c <= n; c++) {
      if (full(Array.from({ length: n }, (_, i) => grid[i + 1]?.[c]))) { lineBonus += 50; lines++; }
    }
    if (full(Array.from({ length: n }, (_, i) => grid[i + 1]?.[i + 1]))) { lineBonus += 50; lines++; }
    if (full(Array.from({ length: n }, (_, i) => grid[i + 1]?.[n - i]))) { lineBonus += 50; lines++; }

    return { team, tilesComplete, tilePoints, lineBonus, lines, total: tilePoints + lineBonus };
  });
}

function sortScores(scores, mode) {
  return [...scores].sort((a, b) =>
    mode === 'points'
      ? b.total - a.total || b.tilesComplete - a.tilesComplete
      : b.tilesComplete - a.tilesComplete || b.total - a.total
  );
}

function downloadCsv(event, tiles, scores) {
  const mode = event.mode || 'blackout';
  const isPoints = mode === 'points';
  const sorted = sortScores(scores, mode);

  const headers = ['Rank', 'Team', 'Tiles Completed', 'Total Tiles'];
  if (isPoints) headers.push('Tile Points', 'Line Bonus', 'Total Score', 'Lines Completed');

  const rows = sorted.map((entry, i) => {
    const row = [i + 1, entry.team.name, entry.tilesComplete, tiles.length];
    if (isPoints) row.push(entry.tilePoints, entry.lineBonus, entry.total, entry.lines);
    return row;
  });

  const csv = [headers, ...rows]
    .map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${event.name.replace(/[^a-z0-9]/gi, '_')}_results.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function tileProgress(tile, teamId) {
  const p = teamId != null ? tile.progress?.[teamId] : null;
  return {
    cur: p?.current ?? 0,
    cur2: p?.current2 ?? 0,
    isOr: tile.target2 != null,
    complete: !!p?.completed_at,
  };
}

function progressText(tile, st) {
  return st.isOr
    ? `${formatTarget(tile.type, st.cur)}/${formatTarget(tile.type, tile.target)} or ${formatTarget(tile.type, st.cur2)}/${formatTarget(tile.type, tile.target2)}`
    : `${formatTarget(tile.type, st.cur)}/${formatTarget(tile.type, tile.target)}`;
}

function targetLabel(tile, target) {
  if (tile.type === 'drop') return `${target}x Drop`;
  if (tile.type === 'xp') return `${formatTarget('xp', target)} XP`;
  return `${formatTarget('kc', target)} ${tileTypeLabel('kc', tile.wom_metric)}`;
}

function tileTargetText(tile) {
  return tile.target2 != null
    ? `${targetLabel(tile, tile.target)} or ${targetLabel(tile, tile.target2)}`
    : targetLabel(tile, tile.target);
}

const s = {
  page: { paddingBottom: 64, overflowX: 'hidden' },
  centerPage: { ...ui.page, textAlign: 'center' },
  main: {
    display: 'flex', flexWrap: 'nowrap', alignItems: 'flex-start', justifyContent: 'center', columnGap: 64, rowGap: 48,
    maxWidth: 1600, margin: '0 auto', padding: '48px 16px 0',
  },
  title: { fontFamily: FONT.quill, fontSize: 40, lineHeight: 1, color: OSRS.orange, fontWeight: 400 },
  sub: { marginTop: 8, fontFamily: FONT.bold, fontSize: 18, lineHeight: 1, color: '#fff' },
  muted: { color: OSRS.muted },
  boardScroll: { marginTop: 32, overflowX: 'auto' },
  axis: { fontSize: 14, lineHeight: 1, display: 'flex', alignItems: 'center' },
  synced: { marginTop: 24, fontFamily: FONT.plain, fontSize: 18, lineHeight: 1, color: OSRS.muted },
  standings: { display: 'flex', flexDirection: 'column', gap: 8, marginTop: 32 + 30 }, // +30 matches the board's column-header row (14px label + 8px margin + 8px grid gap) so row 1 lines up
  row: {
    display: 'block', width: '100%', height: 55, padding: 0, border: 'none', background: 'none', textAlign: 'left',
    fontFamily: FONT.bold, fontSize: 18, lineHeight: 1, color: '#fff',
  },
  rowInner: { display: 'flex', alignItems: 'center', height: '100%', paddingRight: 16 },
  modeHeading: { marginTop: 32, fontFamily: FONT.bold, fontSize: 18, lineHeight: 1, color: '#fff', fontWeight: 400 },
  modeBody: { marginTop: 8, fontFamily: FONT.plain, fontSize: 18, lineHeight: 1.4, color: OSRS.muted },
};

function boardGridStyle(size) {
  return {
    display: 'grid', gridTemplateColumns: `17px repeat(${size}, ${TILE}px)`, gridAutoRows: 'auto',
    columnGap: GAP, rowGap: GAP, fontFamily: FONT.bold, color: '#fff', width: 'max-content',
  };
}

function ProgressBars({ tile, cur, cur2, isOr, complete }) {
  const bar = (value, target, width) => (
    <div style={{ width, height: 5, background: '#000' }}>
      <div style={{ width: `${Math.min(value / target, 1) * 100}%`, height: '100%', background: OSRS.barFill }} />
    </div>
  );
  if (isOr && !complete) {
    return (
      <div style={{ display: 'flex', gap: 4 }}>
        {bar(cur, tile.target, 50)}
        {bar(cur2, tile.target2, 50)}
      </div>
    );
  }
  return bar(complete ? 1 : cur, complete ? 1 : tile.target, BAR_W);
}

function Tile({ tile, team, onOpen }) {
  const st = tileProgress(tile, team?.id);
  const showProgress = !!team;

  return (
    <Panel
      as="button"
      type="button"
      className="osrs-tile"
      variant={st.complete ? 'complete' : 'default'}
      style={{ width: TILE, height: TILE, display: 'block' }}
      onClick={onOpen}
      aria-label={`${tile.coord} ${tile.label}${showProgress ? `, ${progressText(tile, st)}` : `, ${tileTargetText(tile)}`}${st.complete ? ', complete' : ''}`}
    >
      <div style={{ position: 'absolute', top: 8, left: 0, right: 0, height: TILE_ICON_SIZE, display: 'flex', justifyContent: 'center' }}>
        {tile.icon_url && (
          <img
            src={tile.icon_url}
            alt=""
            width={TILE_ICON_SIZE}
            height={TILE_ICON_SIZE}
            style={{ alignSelf: 'flex-start', objectFit: 'contain', imageRendering: 'pixelated' }}
            onError={e => { e.target.style.display = 'none'; }}
          />
        )}
      </div>
      <div style={{
        position: 'absolute', left: 8, right: 8, top: 60, transform: 'translateY(-50%)',
        fontSize: 14, lineHeight: 1.15, textAlign: 'center',
      }}>
        {tile.label}
      </div>
      {showProgress ? (
        <>
          <div style={{
            position: 'absolute', left: 0, right: 0, top: 92, fontSize: 12, lineHeight: 1, textAlign: 'center',
            textTransform: 'uppercase', whiteSpace: 'nowrap', color: st.complete ? '#282833' : '#868686',
          }}>
            {progressText(tile, st)}
          </div>
          <div style={{ position: 'absolute', left: 8, top: 107 }}>
            <ProgressBars tile={tile} {...st} />
          </div>
        </>
      ) : (
        <div style={{
          position: 'absolute', left: 4, right: 4, top: 92, fontSize: 12, lineHeight: 1.15, textAlign: 'center',
          textTransform: 'uppercase', color: '#868686',
        }}>
          {tileTargetText(tile)}
        </div>
      )}
    </Panel>
  );
}

function BoardGrid({ tiles, size, viewingTeam, onOpenTile }) {
  const tileMap = useMemo(() => {
    const map = {};
    for (const t of tiles) map[`${t.row}-${t.col}`] = t;
    return map;
  }, [tiles]);

  return (
    <div className="osrs-board-scroll" style={s.boardScroll}>
      <div style={boardGridStyle(size)}>
        <span />
        {COLS.slice(0, size).map(c => (
          <span key={c} style={{ ...s.axis, justifyContent: 'center', height: 14, marginBottom: 8 }}>{c}</span>
        ))}
        {Array.from({ length: size }, (_, ri) => {
          const row = ri + 1;
          return (
            <React.Fragment key={row}>
              <span style={s.axis}>{row}</span>
              {Array.from({ length: size }, (_, ci) => {
                const col = ci + 1;
                const tile = tileMap[`${row}-${col}`];
                if (!tile) return <span key={col} />;
                return (
                  <Tile key={col} tile={tile} team={viewingTeam} onOpen={() => onOpenTile(tile)} />
                );
              })}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

function StandingRow({ rank, team, score, mode, selected, onSelect, totalTiles }) {
  const isPoints = mode === 'points';
  return (
    <Panel
      as="button"
      type="button"
      className="osrs-row"
      variant={selected ? 'highlight' : 'default'}
      style={s.row}
      onClick={onSelect}
      aria-pressed={selected}
    >
      <div style={s.rowInner}>
        <span style={{ width: 46, textAlign: 'center', color: OSRS.rank }}>{rank}.</span>
        {rank === 1 && <img src={cup} alt="Leader" width={28} height={33} style={{ marginRight: 14 }} />}
        <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {team.name}
        </span>
        {isPoints && (
          <span style={{ marginLeft: 8, whiteSpace: 'nowrap' }}>{score.total} pts</span>
        )}
        <span style={{ width: 54, marginLeft: 8, textAlign: 'center', color: OSRS.rank, whiteSpace: 'nowrap' }}>
          {score.tilesComplete}/{totalTiles}
        </span>
      </div>
    </Panel>
  );
}

function StandingsList({ scores, mode, totalTiles, viewingId, onSelect }) {
  const isPoints = mode === 'points';
  const sorted = useMemo(() => sortScores(scores, mode), [scores, mode]);
  const topScore = isPoints ? sorted[0]?.total : sorted[0]?.tilesComplete;

  return (
    <div style={s.standings}>
      {sorted.map((entry, i) => {
        const isTied = i > 0 && (isPoints ? entry.total === topScore : entry.tilesComplete === topScore);
        const rank = isTied
          ? sorted.findIndex(e => isPoints ? e.total === topScore : e.tilesComplete === topScore)
          : i;
        return (
          <StandingRow
            key={entry.team.id}
            rank={rank + 1}
            team={entry.team}
            score={entry}
            mode={mode}
            totalTiles={totalTiles}
            selected={viewingId === entry.team.id}
            onSelect={() => onSelect(entry.team.id)}
          />
        );
      })}
    </div>
  );
}

function ModeBlurb({ mode }) {
  const isPoints = mode === 'points';
  return (
    <>
      <h3 style={s.modeHeading}>{isPoints ? 'Points mode' : 'Blackout mode'}</h3>
      <p style={s.modeBody}>
        {isPoints ? (
          <>Each completed tile is worth <b style={{ fontFamily: FONT.bold, fontWeight: 400, color: '#fff' }}>5 pts</b>.
            {' '}Complete an entire row, column or diagonal to earn a{' '}
            <b style={{ fontFamily: FONT.bold, fontWeight: 400, color: '#fff' }}>50 pt</b> line bonus. Highest total score wins.</>
        ) : (
          <>First team to complete <b style={{ fontFamily: FONT.bold, fontWeight: 400, color: '#fff' }}>every tile</b> on the board wins.</>
        )}
      </p>
    </>
  );
}

function TeamsModal({ teams, onClose }) {
  const withMembers = (teams || []).filter(t => t.members?.length > 0);
  return (
    <Modal title="Team rosters" onClose={onClose}>
      {withMembers.length === 0 ? (
        <p style={{ ...ui.body, marginTop: 16 }}>No rosters added yet.</p>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px 32px', marginTop: 24 }}>
          {withMembers.map(team => {
            const capName = team.captain_username?.toLowerCase();
            const isCaptain = m => !!capName && m.osrs_name?.toLowerCase().startsWith(capName);
            const sorted = capName
              ? [...team.members].sort((a, b) => isCaptain(b) - isCaptain(a))
              : team.members;
            return (
              <div key={team.id}>
                <h3 style={{ fontFamily: FONT.bold, fontSize: 18, lineHeight: 1, color: '#fff', fontWeight: 400, whiteSpace: 'nowrap' }}>
                  {team.name}
                </h3>
                <ul style={{ fontFamily: FONT.plain, fontSize: 18, lineHeight: 1.6, color: '#fff', listStyle: 'none', marginTop: 8 }}>
                  {sorted.map(m => (
                    <li key={m.id} style={{ whiteSpace: 'nowrap' }}>
                      {m.osrs_name}
                      {isCaptain(m) && (
                        <b style={{ fontFamily: FONT.bold, fontWeight: 400, color: OSRS.orange }}> (CAP)</b>
                      )}
                      {m.discord_username && <span style={{ color: OSRS.muted }}> ({m.discord_username})</span>}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </Modal>
  );
}

function TileModal({ tile, teams, viewingTeam, onClose }) {
  const target = tile.target2 != null
    ? `${formatTarget(tile.type, tile.target)} or ${formatTarget(tile.type, tile.target2)}`
    : formatTarget(tile.type, tile.target);
  const ordered = viewingTeam ? [viewingTeam, ...teams.filter(t => t.id !== viewingTeam.id)] : teams;

  return (
    <Modal title={`${tile.coord} — ${tile.label}`} onClose={onClose}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 16 }}>
        {tile.icon_url && (
          <img
            src={tile.icon_url}
            alt=""
            style={{ width: ICON_SIZE, height: ICON_SIZE, objectFit: 'contain', imageRendering: 'pixelated', flexShrink: 0 }}
            onError={e => { e.target.style.display = 'none'; }}
          />
        )}
        <p style={{ ...ui.body, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <span>Type: <span style={{ color: '#fff' }}>{tileTypeLabel(tile.type, tile.wom_metric)}</span></span>
          <span>Target: <span style={{ color: '#fff' }}>{target}</span></span>
        </p>
      </div>
      <dl style={{
        marginTop: 21, display: 'grid', gridTemplateColumns: 'max-content max-content', columnGap: 33, rowGap: 4,
        fontFamily: FONT.bold, fontSize: 18, lineHeight: '27px',
      }}>
        {ordered.map(team => {
          const st = tileProgress(tile, team.id);
          return (
            <React.Fragment key={team.id}>
              <dt style={{ color: st.complete ? OSRS.barFill : '#fff' }}>{team.name}</dt>
              <dd style={{ color: st.complete ? OSRS.barFill : OSRS.orange }}>
                {progressText(tile, st)}{st.complete ? ' ✓' : ''}
              </dd>
            </React.Fragment>
          );
        })}
      </dl>
    </Modal>
  );
}

function WinnerBanner({ winner, onExportCsv }) {
  if (!winner) return null;
  return (
    <Panel variant="panel" style={{ display: 'block', marginBottom: 32 }}>
      <div style={{ padding: '21px 32px', display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
        <img src={cup} alt="" width={40} height={47} />
        <div style={{ flex: 1, minWidth: 180 }}>
          <div style={{ fontFamily: FONT.bold, fontSize: 14, color: OSRS.muted, textTransform: 'uppercase' }}>Winners</div>
          <div style={{ fontFamily: FONT.quill, fontSize: 28, color: OSRS.orange }}>{winner.name}</div>
        </div>
        <Button skin="minimal" onClick={onExportCsv}>Export CSV</Button>
      </div>
    </Panel>
  );
}

function PreviousBoard({ event }) {
  const [board, setBoard] = useState(null);
  const [teamsWithMembers, setTeamsWithMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewingId, setViewingId] = useState(null);
  const [modal, setModal] = useState(null);

  useEffect(() => {
    Promise.all([
      api.get(`/board/event/${event.id}`),
      api.get(`/teams/event/${event.id}`),
    ]).then(([boardRes, teamsRes]) => {
      const bd = boardRes.data;
      const mode = bd.event.mode || 'blackout';
      const scores = computeScores(bd.tiles, bd.teams, bd.event.board_size || 9);
      const top = sortScores(scores, mode)[0]?.team || null;
      setViewingId(top?.id ?? null);
      setBoard(bd);
      setTeamsWithMembers(teamsRes.data);
    }).finally(() => setLoading(false));
  }, [event.id]);

  const closeModal = useCallback(() => setModal(null), []);

  if (loading) return <p style={{ ...ui.body, textAlign: 'center', padding: '32px 0' }}>Loading board...</p>;
  if (!board) return null;

  const { tiles, teams } = board;
  const mode = board.event.mode || 'blackout';
  const size = board.event.board_size || 9;
  const scores = computeScores(tiles, teams, size);
  const winner = sortScores(scores, mode)[0]?.team || null;
  const viewingTeam = teams.find(t => t.id === viewingId) || null;

  return (
    <div style={{ marginTop: 32 }}>
      <WinnerBanner winner={winner} onExportCsv={() => downloadCsv(board.event, tiles, scores)} />

      <div style={{ display: 'flex', flexWrap: 'wrap', columnGap: 64, rowGap: 48 }}>
        <div style={{ flex: `0 0 ${size * TILE + (size - 1) * GAP}px`, maxWidth: '100%' }}>
          {viewingTeam && <p style={s.sub}><span style={s.muted}>Viewing:</span> {viewingTeam.name}</p>}
          <BoardGrid tiles={tiles} size={size} viewingTeam={viewingTeam} onOpenTile={tile => setModal({ type: 'tile', tile })} />
        </div>

        <div style={{ flex: '0 1 426px', minWidth: 0 }}>
          {viewingTeam && <p style={{ ...s.sub, visibility: 'hidden' }} aria-hidden="true">spacer</p>}
          <StandingsList
            scores={scores}
            mode={mode}
            totalTiles={tiles.length}
            viewingId={viewingId}
            onSelect={id => setViewingId(prev => prev === id ? null : id)}
          />
          <div style={{ marginTop: 32 }}>
            <Button onClick={() => setModal({ type: 'teams' })}>View teams</Button>
          </div>
          <ModeBlurb mode={mode} />
        </div>
      </div>

      {modal?.type === 'teams' && <TeamsModal teams={teamsWithMembers} onClose={closeModal} />}
      {modal?.type === 'tile' && (
        <TileModal tile={modal.tile} teams={teams} viewingTeam={viewingTeam} onClose={closeModal} />
      )}
    </div>
  );
}

export default function HomePage() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [upcoming, setUpcoming] = useState(undefined);
  const [lastCompleted, setLastCompleted] = useState(undefined);
  const [teamsWithMembers, setTeamsWithMembers] = useState([]);
  const [error, setError] = useState(null);
  const [viewingId, setViewingId] = useState(null);
  const [showPrev, setShowPrev] = useState(false);
  const [isPreview, setIsPreview] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  const [modal, setModal] = useState(null);

  const load = useCallback(async () => {
    try {
      const active = await api.get('/events/active');
      if (!active.data) {
        setData(null);
        const [up, last] = await Promise.all([
          api.get('/events/upcoming'),
          api.get('/events/last-completed'),
        ]);
        setUpcoming(up.data || null);
        setLastCompleted(last.data || null);
        setTeamsWithMembers([]);
        return;
      }
      const [board, teamsRes, womStatus] = await Promise.all([
        api.get(`/board/event/${active.data.id}`),
        api.get(`/teams/event/${active.data.id}`),
        api.get('/wom/status').catch(() => ({ data: {} })),
      ]);
      setData(board.data);
      setTeamsWithMembers(teamsRes.data);
      setLastSync(womStatus.data.lastSync || null);
      setUpcoming(undefined);
      setLastCompleted(undefined);
    } catch {
      setError('Failed to load board');
    }
  }, []);

  const loadPreview = useCallback(async (eventId) => {
    try {
      const [board, teamsRes] = await Promise.all([
        api.get(`/board/event/${eventId}`),
        api.get(`/teams/event/${eventId}`),
      ]);
      setData(board.data);
      setTeamsWithMembers(teamsRes.data);
      setIsPreview(true);
    } catch {
      setError('Failed to load preview');
    }
  }, []);

  const exitPreview = useCallback(() => {
    setData(null);
    setIsPreview(false);
    load();
  }, [load]);

  useEffect(() => {
    load();

    function handleProgress({ team_id, tile_id, current, current2, completed }) {
      setData(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          tiles: prev.tiles.map(t => t.id !== tile_id ? t : {
            ...t,
            progress: {
              ...t.progress,
              [team_id]: { current, current2, completed_at: completed ? new Date().toISOString() : null },
            },
          }),
        };
      });
    }

    socket.on('progress_update', handleProgress);
    return () => socket.off('progress_update', handleProgress);
  }, [load]);

  const closeModal = useCallback(() => setModal(null), []);

  if (error) {
    return <div style={s.centerPage}><p style={ui.error}>{error}</p></div>;
  }

  if (!data) {
    return (
      <div style={s.page}>
        <div style={s.centerPage}>
          <h1 style={s.title}>No active bingo event</h1>
          {upcoming ? (
            <>
              <p style={{ ...s.sub, justifyContent: 'center', display: 'flex', gap: 6 }}>
                <span style={s.muted}>Next event:</span> {upcoming.name}
              </p>
              {upcoming.start_date ? (
                <Panel variant="panel" style={{ display: 'inline-block', marginTop: 24 }}>
                  <div style={{ padding: '21px 32px' }}>
                    <div style={{ fontFamily: FONT.bold, fontSize: 14, color: OSRS.muted, textTransform: 'uppercase' }}>
                      Starts {fmtDate(upcoming.start_date)} · Local time ({gmtOffset()})
                    </div>
                    <div style={{ fontFamily: FONT.bold, fontSize: 28, marginTop: 8, color: '#fff' }}>
                      <Countdown dateStr={upcoming.start_date} />
                    </div>
                  </div>
                </Panel>
              ) : (
                <p style={{ ...ui.body, marginTop: 16 }}>Start date to be announced.</p>
              )}
              {user?.role === 'admin' && (
                <div style={{ marginTop: 24 }}>
                  <Button onClick={() => loadPreview(upcoming.id)}>Preview board</Button>
                </div>
              )}
            </>
          ) : (
            <p style={{ ...ui.body, marginTop: 16 }}>Check back when an event is running, or log in as admin to create one.</p>
          )}

          {lastCompleted && (
            <div style={{ marginTop: 56, textAlign: 'left', maxWidth: 1122, marginLeft: 'auto', marginRight: 'auto' }}>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12,
                borderTop: '1px solid var(--osrs-border)', paddingTop: 32,
              }}>
                <div>
                  <div style={{ fontFamily: FONT.bold, fontSize: 14, color: OSRS.muted, textTransform: 'uppercase' }}>Previous event</div>
                  <div style={{ fontFamily: FONT.bold, fontSize: 22, color: '#fff', marginTop: 4 }}>{lastCompleted.name}</div>
                  {lastCompleted.ended_at && (
                    <div style={{ ...ui.body, fontSize: 14, marginTop: 4 }}>Ended {fmtDate(lastCompleted.ended_at)}</div>
                  )}
                </div>
                <Button onClick={() => setShowPrev(p => !p)}>{showPrev ? 'Hide board' : 'View board'}</Button>
              </div>
              {showPrev && <PreviousBoard event={lastCompleted} />}
            </div>
          )}
        </div>
      </div>
    );
  }

  const { event, tiles, teams } = data;
  const mode = event.mode || 'blackout';
  const size = event.board_size || 9;
  const scores = computeScores(tiles, teams, size);
  const leader = sortScores(scores, mode)[0]?.team;
  const viewingTeam = teams.find(t => t.id === viewingId) || null;

  function toggleTeam(id) {
    setViewingId(prev => prev === id ? null : id);
  }

  return (
    <div style={s.page}>
      {isPreview && (
        <div style={{ maxWidth: 1122 + 32, margin: '16px auto 0', padding: '0 16px' }}>
          <Panel variant="panel" style={{ display: 'block' }}>
            <div style={{ padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
              <span style={{ fontFamily: FONT.bold, fontSize: 16, color: 'var(--osrs-yellow)' }}>
                Preview mode — this event has not started yet. Progress shown is for layout reference only.
              </span>
              <Button skin="minimal" onClick={exitPreview}>Exit preview</Button>
            </div>
          </Panel>
        </div>
      )}

      <main style={s.main}>
        <section style={{ flex: `0 1 ${17 + size * (TILE + GAP)}px`, minWidth: 0 }}>
          <h1 style={s.title}>{event.name}</h1>
          <p style={s.sub}>
            {viewingTeam
              ? <><span style={s.muted}>Viewing:</span> {viewingTeam.name}</>
              : <span style={s.muted}>Select a team</span>}
          </p>

          <BoardGrid tiles={tiles} size={size} viewingTeam={viewingTeam} onOpenTile={tile => setModal({ type: 'tile', tile })} />

          <p style={{ ...s.synced, display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: '0 32px' }}>
            {!isPreview && event.end_date && (
              <span>Ends in: <span style={{ color: '#fff' }}><Countdown dateStr={event.end_date} /></span></span>
            )}
            <span>{tiles.length} tiles</span>
            <span>XP tiles last synced: {lastSync ? new Date(lastSync).toLocaleTimeString() : 'Not yet synced this session'}</span>
          </p>
        </section>

        <section style={{ flex: '0 0 426px', minWidth: 0 }}>
          <h2 style={s.title}>{mode === 'points' ? 'Point standings' : 'Standings'}</h2>
          {leader && <p style={s.sub}><span style={s.muted}>Leading:</span> {leader.name}</p>}

          <StandingsList scores={scores} mode={mode} totalTiles={tiles.length} viewingId={viewingId} onSelect={toggleTeam} />

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 32 }}>
            <Button onClick={() => setModal({ type: 'teams' })}>View teams</Button>
            <Button onClick={() => downloadCsv(event, tiles, scores)}>Export CSV</Button>
          </div>

          <ModeBlurb mode={mode} />
        </section>
      </main>

      {modal?.type === 'teams' && <TeamsModal teams={teamsWithMembers} onClose={closeModal} />}
      {modal?.type === 'tile' && (
        <TileModal tile={modal.tile} teams={teams} viewingTeam={viewingTeam} onClose={closeModal} />
      )}
    </div>
  );
}

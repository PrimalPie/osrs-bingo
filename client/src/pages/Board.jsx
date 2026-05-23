import React, { useEffect, useState, useCallback, useMemo } from 'react';
import api from '../api';
import socket from '../socket';
import BingoBoard from '../components/BingoBoard';
import { useAuth } from '../App';

const s = {
  page: { padding: '1.5rem', maxWidth: 1200, margin: '0 auto' },
  title: { fontSize: '1.5rem', fontWeight: 700, color: '#e94560', marginBottom: '0.25rem' },
  subtitle: { fontSize: '0.85rem', color: '#718096', marginBottom: '1.25rem' },
  live: { display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#68d391', marginRight: 6 },
  noEvent: { textAlign: 'center', color: '#718096', padding: '4rem 2rem' },
};

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

  if (!parts) return <span style={{ color: '#a0aec0' }}>soon</span>;
  const { d, h, m, sec } = parts;
  return (
    <span style={{ fontVariantNumeric: 'tabular-nums', color: '#e2e8f0' }}>
      {d > 0 && <><strong>{d}</strong><span style={{ color: '#718096', fontSize: '0.8em' }}>d </span></>}
      <strong>{pad(h)}</strong><span style={{ color: '#718096', fontSize: '0.8em' }}>h </span>
      <strong>{pad(m)}</strong><span style={{ color: '#718096', fontSize: '0.8em' }}>m </span>
      <strong>{pad(sec)}</strong><span style={{ color: '#718096', fontSize: '0.8em' }}>s</span>
    </span>
  );
}

function gmtOffset() {
  const off = new Date().getTimezoneOffset();
  const h = Math.floor(Math.abs(off) / 60);
  const m = Math.abs(off) % 60;
  const sign = off <= 0 ? '+' : '-';
  return m > 0 ? `GMT${sign}${h}:${String(m).padStart(2,'0')}` : `GMT${sign}${h}`;
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function fmtDate(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d)) return null;
  const base = `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  const hasTime = dateStr.includes('T') && (d.getHours() || d.getMinutes());
  return hasTime ? `${base} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}` : base;
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

  const headers = ['Rank', 'Team', 'Tiles Completed', `Total Tiles`];
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

function Scoreboard({ scores, mode, totalTiles, selectedTeamId, onSelectTeam }) {
  const isPoints = mode === 'points';

  const sorted = useMemo(() => sortScores(scores, mode), [scores, mode]);
  const topScore = isPoints ? sorted[0]?.total : sorted[0]?.tilesComplete;

  return (
    <div style={{ marginBottom: '1.25rem' }}>
      <div style={{ fontSize: '0.7rem', color: '#718096', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.6rem' }}>
        {isPoints ? 'Points Standings' : 'Standings'} · click to view team
      </div>
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        {sorted.map((entry, i) => {
          const isLeading = i === 0;
          const isTied = i > 0 && (isPoints ? entry.total === topScore : entry.tilesComplete === topScore);
          const isSelected = selectedTeamId === entry.team.id;
          const rank = isTied ? sorted.findIndex(e => isPoints ? e.total === topScore : e.tilesComplete === topScore) : i;

          return (
            <button
              key={entry.team.id}
              onClick={() => onSelectTeam(entry.team.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                background: isSelected ? entry.team.color + '22' : '#16213e',
                border: `2px solid ${isSelected ? entry.team.color : isLeading ? entry.team.color + '55' : 'transparent'}`,
                padding: '0.5rem 1rem', borderRadius: 6, cursor: 'pointer',
                fontSize: '0.85rem', transition: 'border-color 0.15s, background 0.15s',
              }}
            >
              <span style={{ fontSize: '0.8rem', minWidth: 18, textAlign: 'center' }}>
                {isLeading ? '👑' : `#${rank + 1}`}
              </span>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: entry.team.color, flexShrink: 0 }} />
              <strong style={{ color: '#e2e8f0' }}>{entry.team.name}</strong>
              {isPoints ? (
                <>
                  <span style={{ color: isLeading ? '#f6ad55' : '#a0aec0', fontWeight: isLeading ? 700 : 400, fontSize: '0.85rem' }}>
                    {entry.total} pts
                  </span>
                  {entry.lines > 0 && (
                    <span style={{ fontSize: '0.72rem', color: '#68d391', background: '#68d39122', padding: '0.1rem 0.4rem', borderRadius: 10 }}>
                      {entry.lines} line{entry.lines !== 1 ? 's' : ''}
                    </span>
                  )}
                  <span style={{ fontSize: '0.75rem', color: '#4a5568' }}>
                    {entry.tilesComplete}/{totalTiles}
                  </span>
                </>
              ) : (
                <span style={{ color: isLeading ? '#f6ad55' : '#718096', fontWeight: isLeading ? 700 : 400, fontSize: '0.85rem' }}>
                  {entry.tilesComplete}/{totalTiles}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function TeamRosters({ teams }) {
  const [open, setOpen] = useState(false);
  const teamsWithMembers = (teams || []).filter(t => t.members?.length > 0);
  if (teamsWithMembers.length === 0) return null;

  return (
    <div style={{ marginTop: '1.5rem', borderTop: '1px solid #1a2a3a', paddingTop: '1.25rem' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          background: 'none', border: 'none', cursor: 'pointer', padding: 0,
          display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: open ? '1rem' : 0,
        }}
      >
        <span style={{ fontSize: '0.7rem', color: '#718096', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Team Rosters
        </span>
        <span style={{ fontSize: '0.65rem', color: '#4a5568' }}>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          {teamsWithMembers.map(team => {
            const capName = team.captain_username?.toLowerCase();
            const isCaptain = m => !!capName && m.osrs_name?.toLowerCase() === capName;
            const sorted = capName
              ? [...team.members].sort((a, b) => isCaptain(b) - isCaptain(a))
              : team.members;
            return (
              <div key={team.id} style={{
                background: '#16213e', border: `1px solid ${team.color}44`,
                borderRadius: 8, padding: '0.75rem 1rem', minWidth: 180,
              }}>
                <div style={{ fontWeight: 700, color: team.color, marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                  {team.name}
                </div>
                {sorted.map(m => (
                  <div key={m.id} style={{ fontSize: '0.8rem', marginBottom: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    {isCaptain(m) && (
                      <span title="Captain" style={{ fontSize: '0.65rem', background: '#744210', color: '#f6ad55', padding: '0.05rem 0.3rem', borderRadius: 3, fontWeight: 700, flexShrink: 0 }}>
                        Cap
                      </span>
                    )}
                    <span style={{ color: isCaptain(m) ? '#f6e8c0' : '#e2e8f0' }}>{m.osrs_name}</span>
                    {m.discord_username && (
                      <span style={{ color: '#718096' }}>({m.discord_username})</span>
                    )}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PreviousBoard({ event }) {
  const [board, setBoard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedTeamId, setSelectedTeamId] = useState(null);
  const [winner, setWinner] = useState(null);
  const [teamsWithMembers, setTeamsWithMembers] = useState([]);

  useEffect(() => {
    Promise.all([
      api.get(`/board/event/${event.id}`),
      api.get(`/teams/event/${event.id}`),
    ]).then(([boardRes, teamsRes]) => {
      const bd = boardRes.data;
      const mode = bd.event.mode || 'blackout';
      const scores = computeScores(bd.tiles, bd.teams, bd.event.board_size || 9);
      const sorted = sortScores(scores, mode);
      const top = sorted[0]?.team || null;
      setWinner(top);
      setSelectedTeamId(top?.id || null);
      setBoard(bd);
      setTeamsWithMembers(teamsRes.data);
    }).finally(() => setLoading(false));
  }, [event.id]);

  if (loading) return <p style={{ color: '#718096', textAlign: 'center', padding: '2rem' }}>Loading board...</p>;
  if (!board) return null;

  const { tiles, teams } = board;
  const mode = board.event.mode || 'blackout';
  const scores = computeScores(tiles, teams, board.event.board_size || 9);
  const selectedTeam = teams.find(t => t.id === selectedTeamId) || null;

  function toggleTeam(id) {
    setSelectedTeamId(prev => prev === id ? null : id);
  }

  return (
    <div style={{ marginTop: '1.5rem' }}>
      {winner && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '1rem',
          background: winner.color + '18', border: `1px solid ${winner.color}55`,
          borderRadius: 10, padding: '1rem 1.5rem', marginBottom: '1.5rem',
        }}>
          <div style={{ fontSize: '1.75rem' }}>🏆</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '0.7rem', color: '#718096', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.2rem' }}>
              Winners
            </div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: winner.color }}>{winner.name}</div>
            <div style={{ fontSize: '0.8rem', color: '#a0aec0', marginTop: '0.15rem' }}>Congratulations!</div>
          </div>
          <button
            onClick={() => downloadCsv(board.event, tiles, scores)}
            style={{
              background: '#16213e', border: '1px solid #2d3748', color: '#a0aec0',
              padding: '0.4rem 0.9rem', borderRadius: 6, cursor: 'pointer', fontSize: '0.8rem',
              flexShrink: 0,
            }}
          >
            Export CSV
          </button>
        </div>
      )}

      <Scoreboard
        scores={scores}
        mode={mode}
        totalTiles={tiles.length}
        selectedTeamId={selectedTeamId}
        onSelectTeam={toggleTeam}
      />

      <div style={{ fontSize: '0.78rem', color: '#4a5568', marginBottom: '1rem', lineHeight: 1.6 }}>
        {mode === 'points' ? (
          <>
            <strong style={{ color: '#718096' }}>Points mode · </strong>
            Each completed tile was worth <strong style={{ color: '#e2e8f0' }}>5 pts</strong>.
            Full row, column, or diagonal earned a <strong style={{ color: '#e2e8f0' }}>50 pt</strong> line bonus.
          </>
        ) : (
          <>
            <strong style={{ color: '#718096' }}>Blackout mode · </strong>
            First team to complete <strong style={{ color: '#e2e8f0' }}>every tile</strong> wins.
          </>
        )}
      </div>

      {selectedTeam && (
        <p style={{ fontSize: '0.8rem', color: '#718096', marginBottom: '0.75rem' }}>
          Viewing: <strong style={{ color: selectedTeam.color }}>{selectedTeam.name}</strong>
          {selectedTeam.id === winner?.id && <span style={{ color: '#f6ad55', marginLeft: '0.4rem' }}>· Winners</span>}
        </p>
      )}

      <BingoBoard tiles={tiles} teams={teams} boardSize={board.event.board_size || 9} selectedTeam={selectedTeam} />
      <TeamRosters teams={teamsWithMembers} />
    </div>
  );
}

export default function Board() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [upcoming, setUpcoming] = useState(undefined);
  const [lastCompleted, setLastCompleted] = useState(undefined);
  const [teamsWithMembers, setTeamsWithMembers] = useState([]);
  const [error, setError] = useState(null);
  const [selectedTeamId, setSelectedTeamId] = useState(null);
  const [showPrev, setShowPrev] = useState(false);
  const [isPreview, setIsPreview] = useState(false);

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
      const [board, teamsRes] = await Promise.all([
        api.get(`/board/event/${active.data.id}`),
        api.get(`/teams/event/${active.data.id}`),
      ]);
      setData(board.data);
      setTeamsWithMembers(teamsRes.data);
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

    function handleProgress({ team_id, tile_id, current, completed }) {
      setData(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          tiles: prev.tiles.map(t => t.id !== tile_id ? t : {
            ...t,
            progress: {
              ...t.progress,
              [team_id]: { current, completed_at: completed ? new Date().toISOString() : null },
            },
          }),
        };
      });
    }

    socket.on('progress_update', handleProgress);
    return () => socket.off('progress_update', handleProgress);
  }, [load]);

  if (error) return <div style={s.page}><p style={{ color: '#fc8181' }}>{error}</p></div>;

  if (!data) {
    return (
      <div style={s.page}>
        <div style={s.noEvent}>
          <h2 style={{ color: '#e2e8f0', marginBottom: '0.5rem' }}>No active bingo event</h2>
          {upcoming ? (
            <>
              <p style={{ marginBottom: '1.5rem' }}>Next event: <strong style={{ color: '#e2e8f0' }}>{upcoming.name}</strong></p>
              {upcoming.start_date ? (
                <div style={{ display: 'inline-block', background: '#16213e', border: '1px solid #0f3460', borderRadius: 10, padding: '1.25rem 2.5rem' }}>
                  <div style={{ fontSize: '0.75rem', color: '#718096', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>
                    Starts {fmtDate(upcoming.start_date)} · Local Time ({gmtOffset()})
                  </div>
                  <div style={{ fontSize: '1.75rem', letterSpacing: '-0.01em' }}>
                    <Countdown dateStr={upcoming.start_date} />
                  </div>
                </div>
              ) : (
                <p style={{ color: '#718096' }}>Start date to be announced.</p>
              )}
              {user?.role === 'admin' && (
                <div style={{ marginTop: '1.5rem' }}>
                  <button
                    onClick={() => loadPreview(upcoming.id)}
                    style={{
                      background: '#16213e', border: '1px solid #f6ad55', color: '#f6ad55',
                      padding: '0.5rem 1.25rem', borderRadius: 6, cursor: 'pointer',
                      fontSize: '0.85rem', fontWeight: 600,
                    }}
                  >
                    Preview Board
                  </button>
                </div>
              )}
            </>
          ) : (
            <p>Check back when an event is running, or log in as admin to create one.</p>
          )}
        </div>

        {lastCompleted && (
          <div style={{ borderTop: '1px solid #1a2a3a', paddingTop: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div>
                <div style={{ fontSize: '0.7rem', color: '#718096', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.2rem' }}>
                  Previous Event
                </div>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: '#e2e8f0' }}>{lastCompleted.name}</div>
                {lastCompleted.ended_at && (
                  <div style={{ fontSize: '0.78rem', color: '#4a5568', marginTop: '0.15rem' }}>
                    Ended {fmtDate(lastCompleted.ended_at)}
                  </div>
                )}
              </div>
              <button
                onClick={() => setShowPrev(p => !p)}
                style={{
                  background: showPrev ? '#0f3460' : '#16213e',
                  border: '1px solid #0f3460', color: '#e2e8f0',
                  padding: '0.5rem 1.25rem', borderRadius: 6, cursor: 'pointer',
                  fontSize: '0.85rem', fontWeight: 600,
                }}
              >
                {showPrev ? 'Hide Board' : 'View Board'}
              </button>
            </div>
            {showPrev && <PreviousBoard event={lastCompleted} />}
          </div>
        )}
      </div>
    );
  }

  const { event, tiles, teams } = data;
  const mode = event.mode || 'blackout';
  const selectedTeam = teams.find(t => t.id === selectedTeamId) || null;
  const scores = computeScores(tiles, teams, event.board_size || 9);
  const leader = sortScores(scores, mode)[0]?.team;

  function toggleTeam(id) {
    setSelectedTeamId(prev => prev === id ? null : id);
  }

  return (
    <div style={s.page}>
      {isPreview && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: '#2d2000', border: '1px solid #f6ad55', borderRadius: 6,
          padding: '0.6rem 1rem', marginBottom: '1rem',
        }}>
          <span style={{ color: '#f6ad55', fontWeight: 700, fontSize: '0.85rem' }}>
            Preview mode — this event has not started yet. Progress shown is for layout reference only.
          </span>
          <button
            onClick={exitPreview}
            style={{
              background: 'none', border: '1px solid #f6ad55', color: '#f6ad55',
              padding: '0.25rem 0.75rem', borderRadius: 4, cursor: 'pointer', fontSize: '0.8rem',
            }}
          >
            Exit Preview
          </button>
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.25rem' }}>
        <h1 style={{ ...s.title, marginBottom: 0 }}>{event.name}</h1>
        <button
          onClick={() => downloadCsv(event, tiles, scores)}
          style={{
            background: '#16213e', border: '1px solid #2d3748', color: '#718096',
            padding: '0.35rem 0.9rem', borderRadius: 6, cursor: 'pointer', fontSize: '0.78rem',
          }}
        >
          Export CSV
        </button>
      </div>
      <p style={s.subtitle}>
        <span style={s.live} />
        Live · {tiles.length} tiles ·{' '}
        <span style={{
          background: mode === 'points' ? '#2d3748' : '#1a2a3a',
          color: mode === 'points' ? '#f6ad55' : '#63b3ed',
          fontSize: '0.75rem', fontWeight: 700, padding: '0.1rem 0.5rem',
          borderRadius: 10, textTransform: 'uppercase', letterSpacing: '0.05em',
        }}>
          {mode === 'points' ? 'Points' : 'Blackout'}
        </span>
        {leader && (
          <span style={{ marginLeft: '0.5rem' }}>
            · Leading: <strong style={{ color: leader.color }}>{leader.name}</strong>
          </span>
        )}
        {selectedTeam && (
          <span style={{ marginLeft: '0.5rem' }}>· Viewing: <strong style={{ color: selectedTeam.color }}>{selectedTeam.name}</strong></span>
        )}
      </p>

      <Scoreboard
        scores={scores}
        mode={mode}
        totalTiles={tiles.length}
        selectedTeamId={selectedTeamId}
        onSelectTeam={toggleTeam}
      />

      <div style={{ fontSize: '0.78rem', color: '#4a5568', marginBottom: '1rem', lineHeight: 1.6 }}>
        {mode === 'points' ? (
          <>
            <strong style={{ color: '#718096' }}>Points mode · </strong>
            Each completed tile is worth <strong style={{ color: '#e2e8f0' }}>5 pts</strong>.
            Complete an entire row, column, or diagonal to earn a <strong style={{ color: '#e2e8f0' }}>50 pt</strong> line bonus.
            Highest total score wins.
          </>
        ) : (
          <>
            <strong style={{ color: '#718096' }}>Blackout mode · </strong>
            First team to complete <strong style={{ color: '#e2e8f0' }}>every tile</strong> on the board wins.
          </>
        )}
      </div>

      <BingoBoard tiles={tiles} teams={teams} boardSize={event.board_size || 9} selectedTeam={selectedTeam} />
      <TeamRosters teams={teamsWithMembers} />
    </div>
  );
}

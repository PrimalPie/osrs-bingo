import React, { useEffect, useState, useCallback, useMemo } from 'react';
import api from '../api';
import socket from '../socket';
import BingoBoard from '../components/BingoBoard';

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
  const off = -new Date().getTimezoneOffset();
  const h = Math.floor(Math.abs(off) / 60);
  const m = Math.abs(off) % 60;
  const sign = off >= 0 ? '+' : '-';
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

function Scoreboard({ scores, mode, totalTiles, selectedTeamId, onSelectTeam }) {
  const isPoints = mode === 'points';

  const sorted = useMemo(() =>
    [...scores].sort((a, b) =>
      isPoints
        ? b.total - a.total || b.tilesComplete - a.tilesComplete
        : b.tilesComplete - a.tilesComplete || b.total - a.total
    ),
    [scores, isPoints]
  );

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

export default function Board() {
  const [data, setData] = useState(null);
  const [upcoming, setUpcoming] = useState(undefined);
  const [error, setError] = useState(null);
  const [selectedTeamId, setSelectedTeamId] = useState(null);

  const load = useCallback(async () => {
    try {
      const active = await api.get('/events/active');
      if (!active.data) {
        setData(null);
        const up = await api.get('/events/upcoming');
        setUpcoming(up.data || null);
        return;
      }
      const board = await api.get(`/board/event/${active.data.id}`);
      setData(board.data);
      setUpcoming(undefined);
    } catch {
      setError('Failed to load board');
    }
  }, []);

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
            </>
          ) : (
            <p>Check back when an event is running, or log in as admin to create one.</p>
          )}
        </div>
      </div>
    );
  }

  const { event, tiles, teams } = data;
  const mode = event.mode || 'blackout';
  const selectedTeam = teams.find(t => t.id === selectedTeamId) || null;

  const scores = computeScores(tiles, teams, event.board_size || 9);

  function toggleTeam(id) {
    setSelectedTeamId(prev => prev === id ? null : id);
  }

  const sortedScores = [...scores].sort((a, b) =>
    mode === 'points'
      ? b.total - a.total || b.tilesComplete - a.tilesComplete
      : b.tilesComplete - a.tilesComplete || b.total - a.total
  );
  const leader = sortedScores[0]?.team;

  return (
    <div style={s.page}>
      <h1 style={s.title}>{event.name}</h1>
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
    </div>
  );
}

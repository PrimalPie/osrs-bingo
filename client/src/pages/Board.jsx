import React, { useEffect, useState, useCallback } from 'react';
import api from '../api';
import socket from '../socket';
import BingoBoard from '../components/BingoBoard';

const s = {
  page: { padding: '1.5rem', maxWidth: 1200, margin: '0 auto' },
  title: { fontSize: '1.5rem', fontWeight: 700, color: '#e94560', marginBottom: '0.25rem' },
  subtitle: { fontSize: '0.85rem', color: '#718096', marginBottom: '1.25rem' },
  live: { display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#68d391', marginRight: 6 },
  teamRow: { display: 'flex', gap: '0.6rem', flexWrap: 'wrap', marginBottom: '1.25rem', alignItems: 'center' },
  teamBtn: {
    display: 'flex', alignItems: 'center', gap: '0.5rem',
    background: '#16213e', border: '2px solid transparent',
    padding: '0.5rem 1rem', borderRadius: 6, cursor: 'pointer',
    fontSize: '0.85rem', transition: 'border-color 0.15s, background 0.15s',
  },
  dot: { width: 10, height: 10, borderRadius: '50%', flexShrink: 0 },
  stat: { color: '#718096', fontSize: '0.78rem' },
  noEvent: { textAlign: 'center', color: '#718096', padding: '4rem 2rem' },
};

function pad(n) { return String(n).padStart(2, '0'); }

function Countdown({ dateStr }) {
  const [parts, setParts] = useState(null);

  useEffect(() => {
    const target = new Date(dateStr + 'T00:00:00Z').getTime();

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

function fmtDate(dateStr) {
  if (!dateStr) return null;
  const [y, mo, d] = dateStr.split('-');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${parseInt(d)} ${months[parseInt(mo) - 1]} ${y}`;
}

export default function Board() {
  const [data, setData] = useState(null);
  const [upcoming, setUpcoming] = useState(undefined); // undefined = loading, null = none
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
                    Starts {fmtDate(upcoming.start_date)} (UTC)
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
  const selectedTeam = teams.find(t => t.id === selectedTeamId) || null;

  const completedCounts = {};
  for (const team of teams) {
    completedCounts[team.id] = tiles.filter(t => t.progress?.[team.id]?.completed_at).length;
  }

  function toggleTeam(id) {
    setSelectedTeamId(prev => prev === id ? null : id);
  }

  return (
    <div style={s.page}>
      <h1 style={s.title}>{event.name}</h1>
      <p style={s.subtitle}>
        <span style={s.live} />
        Live · {tiles.length} tiles · {selectedTeam ? `Viewing: ${selectedTeam.name}` : 'Select a team to view their progress'}
      </p>

      <div style={s.teamRow}>
        {teams.map(team => {
          const isSelected = selectedTeamId === team.id;
          return (
            <button
              key={team.id}
              style={{
                ...s.teamBtn,
                borderColor: isSelected ? team.color : 'transparent',
                background: isSelected ? team.color + '22' : '#16213e',
              }}
              onClick={() => toggleTeam(team.id)}
            >
              <div style={{ ...s.dot, background: team.color }} />
              <strong style={{ color: '#e2e8f0' }}>{team.name}</strong>
              <span style={s.stat}>{completedCounts[team.id]}/{tiles.length}</span>
            </button>
          );
        })}
      </div>

      <BingoBoard tiles={tiles} teams={teams} boardSize={event.board_size || 9} selectedTeam={selectedTeam} />
    </div>
  );
}

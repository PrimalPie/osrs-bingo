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

export default function Board() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [selectedTeamId, setSelectedTeamId] = useState(null);

  const load = useCallback(async () => {
    try {
      const active = await api.get('/events/active');
      if (!active.data) { setData(null); return; }
      const board = await api.get(`/board/event/${active.data.id}`);
      setData(board.data);
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

  if (!data) return (
    <div style={s.page}>
      <div style={s.noEvent}>
        <h2 style={{ color: '#e2e8f0', marginBottom: '0.5rem' }}>No active bingo event</h2>
        <p>Check back when an event is running, or log in as admin to create one.</p>
      </div>
    </div>
  );

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

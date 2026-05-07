import React, { useState } from 'react';
import { formatTarget } from '../utils';

const COLS = ['A','B','C','D','E','F','G','H','I','J','K','L'];

const s = {
  wrapper: { overflowX: 'auto' },
  headerCell: {
    background: '#0f3460', color: '#a0aec0', fontSize: '0.75rem',
    padding: '0.4rem', textAlign: 'center', fontWeight: 600,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  rowNum: {
    background: '#0f3460', color: '#a0aec0', fontSize: '0.75rem',
    fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  tileInner: {
    height: '100%', padding: '0.4rem 0.3rem', display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center', textAlign: 'center',
    cursor: 'pointer', position: 'relative', gap: '0.2rem', overflow: 'hidden',
  },
  coord: { fontSize: '0.6rem', color: '#718096', position: 'absolute', top: 3, left: 4 },
  label: {
    fontSize: '0.68rem', color: '#e2e8f0', lineHeight: 1.3,
    overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
  },
  type: { fontSize: '0.55rem', color: '#718096', textTransform: 'uppercase', letterSpacing: '0.05em' },
  progressBar: { width: '80%', height: 3, background: '#2d3748', borderRadius: 2, marginTop: 1, flexShrink: 0 },
  progressFill: { height: '100%', borderRadius: 2, transition: 'width 0.4s ease' },
  progressText: { fontSize: '0.58rem', color: '#a0aec0' },
  modal: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
  },
  modalBox: {
    background: '#1a1a2e', border: '1px solid #0f3460', borderRadius: 8,
    padding: '1.5rem', maxWidth: 480, width: '90%', maxHeight: '80vh', overflowY: 'auto',
  },
  modalTitle: { fontSize: '1rem', fontWeight: 700, color: '#e2e8f0', marginBottom: '0.5rem' },
  teamRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', fontSize: '0.85rem' },
  closeBtn: {
    marginTop: '1rem', background: '#0f3460', border: 'none', color: '#e2e8f0',
    padding: '0.5rem 1rem', borderRadius: 4, cursor: 'pointer',
  },
};

function typeColor(type) {
  if (type === 'xp') return '#68d391';
  if (type === 'kc') return '#f6ad55';
  return '#63b3ed';
}

function getTileBg(tile, selectedTeam) {
  if (!tile || !selectedTeam) return '#1e2a3a';
  const completed = tile.progress?.[selectedTeam.id]?.completed_at;
  return completed ? selectedTeam.color + '44' : '#1e2a3a';
}

export default function BingoBoard({ tiles, teams, boardSize = 9, selectedTeam = null }) {
  const [selected, setSelected] = useState(null);

  const tileMap = {};
  for (const t of tiles) tileMap[`${t.col}-${t.row}`] = t;

  const gridCols = `32px repeat(${boardSize}, 1fr)`;

  return (
    <div style={s.wrapper}>
      {selected && (
        <div style={s.modal} onClick={() => setSelected(null)}>
          <div style={s.modalBox} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
              {selected.icon_url && (
                <img
                  src={selected.icon_url}
                  alt=""
                  style={{ width: 36, height: 36, objectFit: 'contain', imageRendering: 'pixelated' }}
                  onError={e => { e.target.style.display = 'none'; }}
                />
              )}
              <div style={s.modalTitle}>{selected.coord} — {selected.label}</div>
            </div>
            <div style={{ fontSize: '0.75rem', color: '#718096', marginBottom: '1rem' }}>
              Type: {selected.type} · Target: {formatTarget(selected.type, selected.target)}
            </div>

            {(() => {
              const displayTeams = selectedTeam
                ? [selectedTeam, ...teams.filter(t => t.id !== selectedTeam.id)]
                : teams;
              return displayTeams.map(team => {
                const p = selected.progress?.[team.id];
                const current = p?.current ?? 0;
                const pct = Math.min((current / selected.target) * 100, 100);
                const isSelected = selectedTeam && team.id === selectedTeam.id;
                const dimmed = selectedTeam && !isSelected;
                return (
                  <div key={team.id} style={{ ...s.teamRow, opacity: dimmed ? 0.45 : 1, marginBottom: isSelected ? '0.9rem' : '0.4rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', flex: 1, marginRight: '1rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: team.color, fontWeight: isSelected ? 700 : 400 }}>{team.name}</span>
                        <span style={{ color: p?.completed_at ? '#68d391' : '#a0aec0' }}>
                          {formatTarget(selected.type, current)}/{formatTarget(selected.type, selected.target)}
                          {p?.completed_at ? ' ✓' : ''}
                        </span>
                      </div>
                      {isSelected && (
                        <div style={{ ...s.progressBar, width: '100%', margin: 0 }}>
                          <div style={{ ...s.progressFill, width: `${pct}%`, background: team.color }} />
                        </div>
                      )}
                    </div>
                  </div>
                );
              });
            })()}

            <button style={s.closeBtn} onClick={() => setSelected(null)}>Close</button>
          </div>
        </div>
      )}

      {/* Column headers */}
      <div style={{ display: 'grid', gridTemplateColumns: gridCols, gap: 1, background: '#2d3748', marginBottom: 1 }}>
        <div style={{ ...s.headerCell, background: '#0a0a1a' }} />
        {COLS.slice(0, boardSize).map(c => (
          <div key={c} style={s.headerCell}>{c}</div>
        ))}
      </div>

      {/* Board grid — fixed row height via gridAutoRows; taller when progress is shown */}
      <div style={{ display: 'grid', gridTemplateColumns: gridCols, gridAutoRows: selectedTeam ? '110px' : '90px', gap: 1, background: '#2d3748' }}>
        {Array.from({ length: boardSize }, (_, ri) => {
          const row = ri + 1;
          return [
            <div key={`r${row}`} style={s.rowNum}>{row}</div>,
            ...COLS.slice(0, boardSize).map((_, ci) => {
              const col = ci + 1;
              const tile = tileMap[`${col}-${row}`];
              const bg = getTileBg(tile, selectedTeam);

              if (!tile) {
                return (
                  <div key={`${col}-${row}`} style={{ ...s.tileInner, background: '#12121f', opacity: 0.3, cursor: 'default' }}>
                    <span style={s.coord}>{COLS[ci]}{row}</span>
                  </div>
                );
              }

              return (
                <div key={`${col}-${row}`} style={{ ...s.tileInner, background: bg }} onClick={() => setSelected(tile)}>
                  <span style={s.coord}>{tile.coord}</span>
                  {tile.icon_url && (
                    <img
                      src={tile.icon_url}
                      alt=""
                      style={{ width: 28, height: 28, objectFit: 'contain', imageRendering: 'pixelated', flexShrink: 0 }}
                      onError={e => { e.target.style.display = 'none'; }}
                    />
                  )}
                  <span style={{ ...s.type, color: typeColor(tile.type) }}>{tile.type}</span>
                  <span style={s.label}>{tile.label}</span>

                  {selectedTeam && (() => {
                    const p = tile.progress?.[selectedTeam.id];
                    const pct = Math.min(((p?.current ?? 0) / tile.target) * 100, 100);
                    return (
                      <>
                        <div style={s.progressBar}>
                          <div style={{ ...s.progressFill, width: `${pct}%`, background: selectedTeam.color }} />
                        </div>
                        <div style={s.progressText}>
                          {formatTarget(tile.type, p?.current ?? 0)}/{formatTarget(tile.type, tile.target)}
                        </div>
                      </>
                    );
                  })()}
                </div>
              );
            }),
          ];
        }).flat()}
      </div>
    </div>
  );
}

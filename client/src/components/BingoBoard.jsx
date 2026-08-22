import React, { useState } from 'react';
import { formatTarget, tileTypeLabel } from '../utils';
import { useTheme } from '../App';

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

function getTileBg(tile, selectedTeam, beta, tileGreen, tileBg) {
  if (beta) {
    if (!tile) return tileBg;
    const completed = selectedTeam && tile.progress?.[selectedTeam.id]?.completed_at;
    return completed ? tileGreen : tileBg;
  }
  if (!tile || !selectedTeam) return '#1e2a3a';
  const completed = tile.progress?.[selectedTeam.id]?.completed_at;
  return completed ? selectedTeam.color + '44' : '#1e2a3a';
}

export default function BingoBoard({ tiles, teams, boardSize = 9, selectedTeam = null }) {
  const [selected, setSelected] = useState(null);
  const { beta } = useTheme();

  const headerBg    = beta ? 'transparent' : '#0f3460';
  const gridGapPx   = beta ? 8            : 1;
  const gridContBg  = beta ? '#000'        : '#2d3748';
  const emptyBg     = beta ? '#1e2029'     : '#12121f';
  const modalBg     = beta ? '#1e2029'     : '#1a1a2e';
  const modalBdr    = beta ? '#444'        : '#0f3460';
  const progTrack   = beta ? '#111'        : '#2d3748';
  const progFill    = (teamColor) => beta ? '#48bb78' : teamColor;
  const tileBg      = beta ? '#2d3040'     : '#1e2a3a';
  const tileGreen   = '#4cae50';
  const tileRadius  = beta ? 10 : 0;
  const fs = (base) => beta ? `${parseFloat(base) * 0.9}rem` : base;

  const tileMap = {};
  for (const t of tiles) tileMap[`${t.col}-${t.row}`] = t;

  const gridCols = `32px repeat(${boardSize}, 1fr)`;

  return (
    <div style={s.wrapper}>
      {selected && (
        <div style={s.modal} onClick={() => setSelected(null)}>
          <div style={{ ...s.modalBox, background: modalBg, border: `1px solid ${modalBdr}` }} onClick={e => e.stopPropagation()}>
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
              Type: {tileTypeLabel(selected.type, selected.wom_metric)} · Target: {formatTarget(selected.type, selected.target)}
              {selected.target2 != null && <> <span style={{ color: '#4a5568' }}>OR</span> {selected.target2}</>}
            </div>

            {(() => {
              const isOr = selected.target2 != null;
              const displayTeams = selectedTeam
                ? [selectedTeam, ...teams.filter(t => t.id !== selectedTeam.id)]
                : teams;
              return displayTeams.map(team => {
                const p = selected.progress?.[team.id];
                const current = p?.current ?? 0;
                const current2 = p?.current2 ?? 0;
                const pct = Math.min((current / selected.target) * 100, 100);
                const pct2 = isOr ? Math.min((current2 / selected.target2) * 100, 100) : 0;
                const isSelected = selectedTeam && team.id === selectedTeam.id;
                const dimmed = selectedTeam && !isSelected;
                return (
                  <div key={team.id} style={{ ...s.teamRow, opacity: dimmed ? 0.45 : 1, marginBottom: isSelected ? '0.9rem' : '0.4rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', flex: 1, marginRight: '1rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: team.color, fontWeight: isSelected ? 700 : 400 }}>{team.name}</span>
                        <span style={{ color: p?.completed_at ? '#68d391' : '#a0aec0' }}>
                          {isOr
                            ? `${current}/${selected.target} or ${current2}/${selected.target2}`
                            : `${formatTarget(selected.type, current)}/${formatTarget(selected.type, selected.target)}`}
                          {p?.completed_at ? ' ✓' : ''}
                        </span>
                      </div>
                      {isSelected && isOr && (
                        <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
                          <div style={{ ...s.progressBar, flex: 1, margin: 0, background: progTrack }}>
                            <div style={{ ...s.progressFill, width: `${pct}%`, background: progFill(team.color) }} />
                          </div>
                          <span style={{ fontSize: '0.55rem', color: '#4a5568' }}>or</span>
                          <div style={{ ...s.progressBar, flex: 1, margin: 0, background: progTrack }}>
                            <div style={{ ...s.progressFill, width: `${pct2}%`, background: progFill(team.color) }} />
                          </div>
                        </div>
                      )}
                      {isSelected && !isOr && (
                        <div style={{ ...s.progressBar, width: '100%', margin: 0, background: progTrack }}>
                          <div style={{ ...s.progressFill, width: `${pct}%`, background: progFill(team.color) }} />
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
      <div style={{ display: 'grid', gridTemplateColumns: gridCols, gap: gridGapPx, background: gridContBg, marginBottom: gridGapPx }}>
        <div style={{ ...s.headerCell, background: headerBg }} />
        {COLS.slice(0, boardSize).map(c => (
          <div key={c} style={{ ...s.headerCell, background: headerBg, fontSize: fs('0.75rem') }}>{c}</div>
        ))}
      </div>

      {/* Board grid */}
      <div style={{ display: 'grid', gridTemplateColumns: gridCols, gridAutoRows: selectedTeam ? '110px' : '90px', gap: gridGapPx, background: gridContBg }}>
        {Array.from({ length: boardSize }, (_, ri) => {
          const row = ri + 1;
          return [
            <div key={`r${row}`} style={{ ...s.rowNum, background: headerBg, fontSize: fs('0.75rem') }}>{row}</div>,
            ...COLS.slice(0, boardSize).map((_, ci) => {
              const col = ci + 1;
              const tile = tileMap[`${col}-${row}`];
              const bg = getTileBg(tile, selectedTeam, beta, tileGreen, tileBg);

              if (!tile) {
                return (
                  <div key={`${col}-${row}`} style={{ ...s.tileInner, background: emptyBg, borderRadius: tileRadius, opacity: 0.3, cursor: 'default' }}>
                    {!beta && <span style={s.coord}>{COLS[ci]}{row}</span>}
                  </div>
                );
              }

              return (
                <div key={`${col}-${row}`} style={{ ...s.tileInner, background: bg, borderRadius: tileRadius }} onClick={() => setSelected(tile)}>
                  {!beta && <span style={{ ...s.coord, fontSize: fs('0.6rem') }}>{tile.coord}</span>}
                  {tile.icon_url && (
                    <img
                      src={tile.icon_url}
                      alt=""
                      style={{ width: beta ? 34 : 28, height: beta ? 34 : 28, objectFit: 'contain', imageRendering: 'pixelated', flexShrink: 0 }}
                      onError={e => { e.target.style.display = 'none'; }}
                    />
                  )}
                  {!beta && <span style={{ ...s.type, color: typeColor(tile.type) }}>{tileTypeLabel(tile.type, tile.wom_metric)}</span>}
                  <span style={{ ...s.label, fontSize: fs('0.68rem'), textTransform: beta ? 'uppercase' : 'none' }}>{tile.label}</span>

                  {selectedTeam && (() => {
                    const p = tile.progress?.[selectedTeam.id];
                    const isOr = tile.target2 != null;
                    const current = p?.current ?? 0;
                    const current2 = p?.current2 ?? 0;
                    const pct = Math.min((current / tile.target) * 100, 100);
                    const pct2 = isOr ? Math.min((current2 / tile.target2) * 100, 100) : 0;

                    if (beta) {
                      return (
                        <>
                          <div style={{ ...s.progressText, fontSize: fs('0.58rem'), color: '#ccc' }}>
                            {isOr
                              ? `${current}/${tile.target} OR ${current2}/${tile.target2}`
                              : `${formatTarget(tile.type, current)}/${formatTarget(tile.type, tile.target)}`}
                          </div>
                          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 4, background: progTrack, borderRadius: `0 0 ${tileRadius}px ${tileRadius}px` }}>
                            {isOr ? (
                              <div style={{ display: 'flex', height: '100%' }}>
                                <div style={{ width: `${pct / 2}%`, height: '100%', background: '#48bb78' }} />
                                <div style={{ width: `${pct2 / 2}%`, height: '100%', background: '#68d391', marginLeft: 1 }} />
                              </div>
                            ) : (
                              <div style={{ width: `${pct}%`, height: '100%', background: '#48bb78', borderRadius: `0 0 0 ${tileRadius}px` }} />
                            )}
                          </div>
                        </>
                      );
                    }

                    return (
                      <>
                        {isOr ? (
                          <div style={{ display: 'flex', gap: '0.15rem', width: '80%' }}>
                            <div style={{ ...s.progressBar, flex: 1, width: 'auto', marginTop: 1, background: progTrack }}>
                              <div style={{ ...s.progressFill, width: `${pct}%`, background: progFill(selectedTeam.color) }} />
                            </div>
                            <div style={{ ...s.progressBar, flex: 1, width: 'auto', marginTop: 1, background: progTrack }}>
                              <div style={{ ...s.progressFill, width: `${pct2}%`, background: progFill(selectedTeam.color) }} />
                            </div>
                          </div>
                        ) : (
                          <div style={{ ...s.progressBar, background: progTrack }}>
                            <div style={{ ...s.progressFill, width: `${pct}%`, background: progFill(selectedTeam.color) }} />
                          </div>
                        )}
                        <div style={{ ...s.progressText, fontSize: fs('0.58rem') }}>
                          {isOr
                            ? `${current}/${tile.target} or ${current2}/${tile.target2}`
                            : `${formatTarget(tile.type, current)}/${formatTarget(tile.type, tile.target)}`}
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

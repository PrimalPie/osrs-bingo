import React, { useState } from 'react';
import { formatTarget, tileTypeLabel } from '../utils';

const COLS = ['A','B','C','D','E','F','G','H','I','J','K','L'];

const s = {
  wrapper: { overflowX: 'auto' },
  headerCell: {
    background: 'var(--c-0f3460)', color: 'var(--osrs-subtle)', fontSize: '0.75rem',
    padding: '0.4rem', textAlign: 'center', fontWeight: 600,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  rowNum: {
    background: 'var(--c-0f3460)', color: 'var(--osrs-subtle)', fontSize: '0.75rem',
    fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  tileInner: {
    height: '100%', padding: '0.4rem 0.3rem', display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center', textAlign: 'center',
    cursor: 'pointer', position: 'relative', gap: '0.2rem', overflow: 'hidden',
  },
  coord: { fontSize: '0.6rem', color: 'var(--osrs-muted)', position: 'absolute', top: 3, left: 4 },
  label: {
    fontSize: '0.68rem', color: 'var(--osrs-text)', lineHeight: 1.3,
    overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
  },
  type: { fontSize: '0.55rem', color: 'var(--osrs-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' },
  progressBar: { width: '80%', height: 3, background: 'var(--c-2d3748)', borderRadius: 0, marginTop: 1, flexShrink: 0 },
  progressFill: { height: '100%', borderRadius: 0, transition: 'width 0.4s ease' },
  progressText: { fontSize: '0.58rem', color: 'var(--osrs-subtle)' },
  modal: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
  },
  modalBox: {
    background: 'var(--c-1a1a2e)', border: '1px solid var(--c-0f3460)', borderRadius: 0,
    padding: '1.5rem', maxWidth: 480, width: '90%', maxHeight: '80vh', overflowY: 'auto',
  },
  modalTitle: { fontSize: '1rem', fontWeight: 700, color: 'var(--osrs-text)', marginBottom: '0.5rem' },
  teamRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', fontSize: '0.85rem' },
  closeBtn: {
    marginTop: '1rem', background: 'var(--c-0f3460)', border: 'none', color: 'var(--osrs-text)',
    padding: '0.5rem 1rem', borderRadius: 0, cursor: 'pointer',
  },
};

function typeColor(type) {
  if (type === 'xp') return 'var(--osrs-green)';
  if (type === 'kc') return 'var(--osrs-yellow)';
  return 'var(--osrs-blue)';
}

function getTileBg(tile, selectedTeam) {
  if (!tile || !selectedTeam) return 'var(--osrs-sunken)';
  const completed = tile.progress?.[selectedTeam.id]?.completed_at;
  return completed ? 'var(--osrs-success-bg)' : 'var(--osrs-sunken)';
}

export default function BingoBoard({ tiles, teams, boardSize = 9, selectedTeam = null }) {
  const [selected, setSelected] = useState(null);

  const headerBg    = 'var(--c-0f3460)';
  const gridGapPx   = 1;
  const gridContBg  = 'var(--c-2d3748)';
  const emptyBg     = 'var(--osrs-sunken)';
  const progTrack   = 'var(--c-2d3748)';
  const progFill    = 'var(--osrs-green)';
  const tileRadius  = 0;

  const tileMap = {};
  for (const t of tiles) tileMap[`${t.col}-${t.row}`] = t;

  const gridCols = `32px repeat(${boardSize}, 1fr)`;

  return (
    <div style={s.wrapper}>
      {selected && (
        <div style={s.modal} onClick={() => setSelected(null)}>
          <div className="osrs-card" style={s.modalBox} onClick={e => e.stopPropagation()}>
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
            <div style={{ fontSize: '0.75rem', color: 'var(--osrs-muted)', marginBottom: '1rem' }}>
              Type: {tileTypeLabel(selected.type, selected.wom_metric)} · Target: {formatTarget(selected.type, selected.target)}
              {selected.target2 != null && <> <span style={{ color: 'var(--osrs-border)' }}>OR</span> {selected.target2}</>}
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
                        <span style={{ color: 'var(--osrs-text)', fontWeight: isSelected ? 700 : 400 }}>{team.name}</span>
                        <span style={{ color: p?.completed_at ? 'var(--osrs-green)' : 'var(--osrs-subtle)' }}>
                          {isOr
                            ? `${current}/${selected.target} or ${current2}/${selected.target2}`
                            : `${formatTarget(selected.type, current)}/${formatTarget(selected.type, selected.target)}`}
                          {p?.completed_at ? ' ✓' : ''}
                        </span>
                      </div>
                      {isSelected && isOr && (
                        <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
                          <div style={{ ...s.progressBar, flex: 1, margin: 0, background: progTrack }}>
                            <div style={{ ...s.progressFill, width: `${pct}%`, background: progFill }} />
                          </div>
                          <span style={{ fontSize: '0.55rem', color: 'var(--osrs-border)' }}>or</span>
                          <div style={{ ...s.progressBar, flex: 1, margin: 0, background: progTrack }}>
                            <div style={{ ...s.progressFill, width: `${pct2}%`, background: progFill }} />
                          </div>
                        </div>
                      )}
                      {isSelected && !isOr && (
                        <div style={{ ...s.progressBar, width: '100%', margin: 0, background: progTrack }}>
                          <div style={{ ...s.progressFill, width: `${pct}%`, background: progFill }} />
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
          <div key={c} style={{ ...s.headerCell, background: headerBg }}>{c}</div>
        ))}
      </div>

      {/* Board grid */}
      <div style={{ display: 'grid', gridTemplateColumns: gridCols, gridAutoRows: selectedTeam ? '110px' : '90px', gap: gridGapPx, background: gridContBg }}>
        {Array.from({ length: boardSize }, (_, ri) => {
          const row = ri + 1;
          return [
            <div key={`r${row}`} style={{ ...s.rowNum, background: headerBg }}>{row}</div>,
            ...COLS.slice(0, boardSize).map((_, ci) => {
              const col = ci + 1;
              const tile = tileMap[`${col}-${row}`];
              const bg = getTileBg(tile, selectedTeam);

              if (!tile) {
                return (
                  <div key={`${col}-${row}`} style={{ ...s.tileInner, background: emptyBg, borderRadius: tileRadius, opacity: 0.3, cursor: 'default' }}>
                    <span style={s.coord}>{COLS[ci]}{row}</span>
                  </div>
                );
              }

              return (
                <div key={`${col}-${row}`} style={{ ...s.tileInner, background: bg, borderRadius: tileRadius }} onClick={() => setSelected(tile)}>
                  <span style={s.coord}>{tile.coord}</span>
                  {tile.icon_url && (
                    <img
                      src={tile.icon_url}
                      alt=""
                      style={{ width: 28, height: 28, objectFit: 'contain', imageRendering: 'pixelated', flexShrink: 0 }}
                      onError={e => { e.target.style.display = 'none'; }}
                    />
                  )}
                  <span style={{ ...s.type, color: typeColor(tile.type) }}>{tileTypeLabel(tile.type, tile.wom_metric)}</span>
                  <span style={s.label}>{tile.label}</span>

                  {selectedTeam && (() => {
                    const p = tile.progress?.[selectedTeam.id];
                    const isOr = tile.target2 != null;
                    const current = p?.current ?? 0;
                    const current2 = p?.current2 ?? 0;
                    const pct = Math.min((current / tile.target) * 100, 100);
                    const pct2 = isOr ? Math.min((current2 / tile.target2) * 100, 100) : 0;

                    return (
                      <>
                        {isOr ? (
                          <div style={{ display: 'flex', gap: '0.15rem', width: '80%' }}>
                            <div style={{ ...s.progressBar, flex: 1, width: 'auto', marginTop: 1, background: progTrack }}>
                              <div style={{ ...s.progressFill, width: `${pct}%`, background: progFill }} />
                            </div>
                            <div style={{ ...s.progressBar, flex: 1, width: 'auto', marginTop: 1, background: progTrack }}>
                              <div style={{ ...s.progressFill, width: `${pct2}%`, background: progFill }} />
                            </div>
                          </div>
                        ) : (
                          <div style={{ ...s.progressBar, background: progTrack }}>
                            <div style={{ ...s.progressFill, width: `${pct}%`, background: progFill }} />
                          </div>
                        )}
                        <div style={s.progressText}>
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

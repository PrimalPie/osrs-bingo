import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../App';
import api from '../api';
import { formatTarget } from '../utils';

const DIFF_STYLE = {
  easy:   { bg: '#1b4332', border: '#2d6a4f', badge: '#2d6a4f', badgeText: '#b7e4c7' },
  medium: { bg: '#3d2008', border: '#ca6702', badge: '#ca6702', badgeText: '#ffe8d6' },
  hard:   { bg: '#3d0509', border: '#9b2226', badge: '#9b2226', badgeText: '#ffb3c1' },
};

const CAT_ICON = { pvm: '⚔️', skilling: '📚', collection: '🎁' };

const S = {
  page:    { padding: '2rem', maxWidth: '1200px', margin: '0 auto', color: '#e0e0ff', fontFamily: 'inherit' },
  card:    { background: '#1a1a2e', border: '1px solid #2d2d4e', borderRadius: '8px', padding: '1.5rem' },
  row:     { display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' },
  label:   { width: 150, color: '#a0aec0', fontSize: '0.85rem', flexShrink: 0 },
  input:   { background: '#0f0f1a', border: '1px solid #2d2d4e', color: '#e0e0ff', padding: '0.3rem 0.5rem', borderRadius: '4px' },
  numInput:{ background: '#0f0f1a', border: '1px solid #2d2d4e', color: '#e0e0ff', padding: '0.3rem 0.5rem', borderRadius: '4px', width: 64 },
  btn:     { border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 500, padding: '0.4rem 1rem' },
  th:      { padding: '0.5rem', textAlign: 'left', color: '#a0aec0', fontWeight: 500 },
  td:      { padding: '0.4rem 0.5rem', color: '#e0e0ff' },
};

function ParamRow({ label, children }) {
  return (
    <div style={S.row}>
      <span style={S.label}>{label}</span>
      {children}
    </div>
  );
}

function DiffBadge({ diff }) {
  const s = DIFF_STYLE[diff];
  return (
    <span style={{ background: s.badge, color: s.badgeText, padding: '0.15rem 0.45rem', borderRadius: 3, fontSize: '0.75rem' }}>
      {diff}
    </span>
  );
}

function SumWarning({ sum }) {
  if (sum === 100) return null;
  return <p style={{ color: '#e94560', fontSize: '0.8rem', margin: '0.25rem 0 0' }}>Sum: {sum}% — must be 100</p>;
}

export default function GeneratePage() {
  const { user } = useAuth();
  if (!user || user.role !== 'admin') return <Navigate to="/" replace />;

  const [params, setParams] = useState({
    totalPlayers: 50, numTeams: 5, boardSize: 5, durationDays: 7,
    easyPct: 40, mediumPct: 40, hardPct: 20,
    pvmPct: 60, skillingPct: 30, collectionPct: 10,
    womOnly: false,
  });

  const [preview, setPreview]     = useState(null);
  const [generating, setGen]      = useState(false);
  const [genError, setGenError]   = useState(null);

  const [events, setEvents]       = useState([]);
  const [applyId, setApplyId]     = useState('');
  const [clearExisting, setClear] = useState(true);
  const [applying, setApplying]   = useState(false);
  const [applyMsg, setApplyMsg]   = useState(null);

  const teamSize = Math.max(1, Math.ceil(params.totalPlayers / params.numTeams));
  const diffSum  = params.easyPct + params.mediumPct + params.hardPct;
  const catSum   = params.pvmPct + params.skillingPct + params.collectionPct;

  useEffect(() => {
    api.get('/events').then(r => setEvents(r.data.filter(e => e.status !== 'completed')));
  }, []);

  function set(key, val) {
    setParams(p => ({ ...p, [key]: val }));
  }

  async function handleGenerate() {
    if (diffSum !== 100 || catSum !== 100) return;
    setGenError(null);
    setGen(true);
    setApplyMsg(null);
    try {
      const r = await api.post('/generate/preview', params);
      setPreview(r.data.tiles);
    } catch (e) {
      setGenError(e.response?.data?.error || 'Generation failed');
    } finally {
      setGen(false);
    }
  }

  async function handleApply() {
    if (!applyId) { setApplyMsg({ ok: false, text: 'Select an event first' }); return; }
    if (!preview?.length) { setApplyMsg({ ok: false, text: 'Generate a preview first' }); return; }
    setApplying(true);
    setApplyMsg(null);
    try {
      const r = await api.post('/generate/apply', { eventId: parseInt(applyId), clearExisting, tiles: preview });
      setApplyMsg({ ok: true, text: `Applied ${r.data.count} tiles successfully.` });
    } catch (e) {
      setApplyMsg({ ok: false, text: e.response?.data?.error || 'Apply failed' });
    } finally {
      setApplying(false);
    }
  }

  const selectedEvent = events.find(e => String(e.id) === String(applyId));

  return (
    <div style={S.page}>
      <h1 style={{ color: '#e94560', margin: '0 0 0.25rem' }}>Board Generator</h1>
      <p style={{ color: '#a0aec0', margin: '0 0 2rem', fontSize: '0.9rem' }}>
        Sandbox tool. Tune parameters, preview the generated board, then apply it to an event.
      </p>

      {/* ── Parameters ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>

        {/* Left: players & board */}
        <div style={S.card}>
          <h3 style={{ margin: '0 0 1rem', color: '#e0e0ff' }}>Players &amp; Board</h3>

          <ParamRow label="Total players">
            <input type="range" min={10} max={200} value={params.totalPlayers}
              onChange={e => set('totalPlayers', +e.target.value)} style={{ width: 120 }} />
            <span style={{ minWidth: '4ch', textAlign: 'right' }}>{params.totalPlayers}</span>
          </ParamRow>

          <ParamRow label="Number of teams">
            <input type="number" min={2} max={20} value={params.numTeams}
              onChange={e => set('numTeams', Math.max(2, +e.target.value))} style={S.numInput} />
          </ParamRow>

          <ParamRow label="Team size">
            <span style={{ color: '#68d391' }}>{teamSize} players / team</span>
          </ParamRow>

          <ParamRow label="Board size">
            {[5, 7].map(n => (
              <button key={n} style={{
                ...S.btn,
                background: params.boardSize === n ? '#0f3460' : '#16213e',
                border: `1px solid ${params.boardSize === n ? '#e94560' : '#2d2d4e'}`,
                color: '#e0e0ff',
              }} onClick={() => set('boardSize', n)}>{n}×{n}</button>
            ))}
            <span style={{ color: '#4a5568', fontSize: '0.8rem' }}>
              ({params.boardSize * params.boardSize} tiles)
            </span>
          </ParamRow>

          <ParamRow label="Duration">
            <input type="range" min={3} max={30} value={params.durationDays}
              onChange={e => set('durationDays', +e.target.value)} style={{ width: 120 }} />
            <span style={{ minWidth: '4ch', textAlign: 'right' }}>{params.durationDays}d</span>
          </ParamRow>

          <ParamRow label="WOM-tracked only">
            <input type="checkbox" checked={params.womOnly}
              onChange={e => set('womOnly', e.target.checked)} />
            <span style={{ color: '#a0aec0', fontSize: '0.8rem' }}>Exclude manual drop tiles</span>
          </ParamRow>
        </div>

        {/* Right: difficulty & category mix */}
        <div style={S.card}>
          <h3 style={{ margin: '0 0 0.5rem', color: '#e0e0ff' }}>Difficulty Mix</h3>
          <p style={{ color: '#4a5568', fontSize: '0.8rem', margin: '0 0 0.75rem' }}>Each group must total 100%.</p>

          {[['easyPct','Easy','easy'], ['mediumPct','Medium','medium'], ['hardPct','Hard','hard']].map(([key, name, diff]) => (
            <ParamRow key={key} label={<DiffBadge diff={diff} />}>
              <input type="number" min={0} max={100} value={params[key]}
                onChange={e => set(key, +e.target.value)} style={S.numInput} />
              <span style={{ color: '#a0aec0' }}>%</span>
            </ParamRow>
          ))}
          <SumWarning sum={diffSum} />

          <h3 style={{ margin: '1.25rem 0 0.75rem', color: '#e0e0ff' }}>Category Mix</h3>
          {[['pvmPct','PvM ⚔️'], ['skillingPct','Skilling 📚'], ['collectionPct','Collection 🎁']].map(([key, name]) => (
            <ParamRow key={key} label={name}>
              <input type="number" min={0} max={100} value={params[key]}
                onChange={e => set(key, +e.target.value)} style={S.numInput} />
              <span style={{ color: '#a0aec0' }}>%</span>
            </ParamRow>
          ))}
          <SumWarning sum={catSum} />
        </div>
      </div>

      {/* ── Generate button ── */}
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <button
          onClick={handleGenerate}
          disabled={generating || diffSum !== 100 || catSum !== 100}
          style={{ ...S.btn, background: '#e94560', color: '#fff', padding: '0.7rem 2.5rem', fontSize: '1rem',
            opacity: (diffSum !== 100 || catSum !== 100) ? 0.5 : 1 }}
        >
          {generating ? 'Generating…' : '🎲 Generate Preview'}
        </button>
        {genError && <p style={{ color: '#e94560', marginTop: '0.5rem' }}>{genError}</p>}
      </div>

      {/* ── Preview ── */}
      {preview && (
        <>
          <h2 style={{ color: '#e0e0ff', margin: '0 0 1rem' }}>
            Preview — {params.boardSize}×{params.boardSize} ({preview.length} tiles)
          </h2>

          {/* Counters */}
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
            {['easy','medium','hard'].map(d => (
              <span key={d} style={{
                background: DIFF_STYLE[d].badge, color: DIFF_STYLE[d].badgeText,
                padding: '0.2rem 0.7rem', borderRadius: 4, fontSize: '0.8rem',
              }}>
                {d}: {preview.filter(t => t.difficulty === d).length}
              </span>
            ))}
            {['pvm','skilling','collection'].map(c => (
              <span key={c} style={{
                background: '#16213e', color: '#a0aec0', border: '1px solid #2d2d4e',
                padding: '0.2rem 0.7rem', borderRadius: 4, fontSize: '0.8rem',
              }}>
                {CAT_ICON[c]} {c}: {preview.filter(t => t.category === c).length}
              </span>
            ))}
          </div>

          {/* Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${params.boardSize}, 1fr)`,
            gap: 4,
            marginBottom: '2rem',
          }}>
            {preview.map(tile => {
              const ds = DIFF_STYLE[tile.difficulty];
              return (
                <div key={tile.coord} style={{
                  background: ds.bg, border: `1px solid ${ds.border}`,
                  borderRadius: 4, padding: '0.5rem',
                  minHeight: 90, display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                }}>
                  <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.45)' }}>{tile.coord}</span>
                  <span style={{ fontSize: '0.72rem', color: '#fff', fontWeight: 500, lineHeight: 1.3 }}>
                    {tile.label}
                  </span>
                  <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.7)' }}>
                    {CAT_ICON[tile.category]} {formatTarget(tile.type, tile.target)}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Tile list (collapsible) */}
          <details style={{ marginBottom: '2rem' }}>
            <summary style={{ cursor: 'pointer', color: '#a0aec0', marginBottom: '0.5rem', userSelect: 'none' }}>
              Full tile list
            </summary>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #2d2d4e' }}>
                    {['Coord','Label','Type','Target','WOM Metric','Difficulty','Category'].map(h => (
                      <th key={h} style={S.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.map(tile => (
                    <tr key={tile.coord} style={{ borderBottom: '1px solid #12122a' }}>
                      <td style={S.td}>{tile.coord}</td>
                      <td style={S.td}>{tile.label}</td>
                      <td style={S.td}>{tile.type}</td>
                      <td style={S.td}>{formatTarget(tile.type, tile.target)}</td>
                      <td style={{ ...S.td, color: '#a0aec0', fontFamily: 'monospace', fontSize: '0.8rem' }}>
                        {tile.wom_metric || '—'}
                      </td>
                      <td style={S.td}><DiffBadge diff={tile.difficulty} /></td>
                      <td style={S.td}>{CAT_ICON[tile.category]} {tile.category}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>

          {/* Apply section */}
          <div style={S.card}>
            <h3 style={{ margin: '0 0 1rem', color: '#e0e0ff' }}>Apply to Event</h3>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
              <select value={applyId} onChange={e => { setApplyId(e.target.value); setApplyMsg(null); }}
                style={{ ...S.input, minWidth: 260 }}>
                <option value="">Select event…</option>
                {events.map(e => (
                  <option key={e.id} value={e.id}>
                    [{e.status}] {e.name} ({e.board_size}×{e.board_size})
                  </option>
                ))}
              </select>

              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#a0aec0', fontSize: '0.9rem', cursor: 'pointer' }}>
                <input type="checkbox" checked={clearExisting} onChange={e => setClear(e.target.checked)} />
                Clear existing tiles first
              </label>

              <button onClick={handleApply} disabled={applying || !applyId}
                style={{ ...S.btn, background: '#0f3460', color: '#e0e0ff', border: '1px solid #2d2d4e',
                  opacity: !applyId ? 0.5 : 1 }}>
                {applying ? 'Applying…' : 'Apply to Event'}
              </button>
            </div>

            {applyMsg && (
              <p style={{ color: applyMsg.ok ? '#68d391' : '#e94560', margin: '0.5rem 0 0' }}>
                {applyMsg.text}
              </p>
            )}

            {selectedEvent && selectedEvent.board_size < params.boardSize && (
              <p style={{ color: '#ed8936', fontSize: '0.82rem', margin: '0.5rem 0 0' }}>
                ⚠️ Event board size ({selectedEvent.board_size}×{selectedEvent.board_size}) is smaller than generated
                board ({params.boardSize}×{params.boardSize}) — applying will fail.
              </p>
            )}
            {selectedEvent && selectedEvent.board_size >= params.boardSize && (
              <p style={{ color: '#4a5568', fontSize: '0.8rem', margin: '0.5rem 0 0' }}>
                Event: {selectedEvent.name} ({selectedEvent.board_size}×{selectedEvent.board_size})
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

import React, { useEffect, useState, useCallback } from 'react';
import api from '../api';
import { parseXpTarget, formatXp, formatTarget } from '../utils';
import IconPicker, { useSuggestion } from '../components/IconPicker';
import BingoBoard from '../components/BingoBoard';

const COLS = ['A','B','C','D','E','F','G','H','I','J','K','L'];

function coord(row, col) { return `${COLS[col - 1]}${row}`; }

const s = {
  page: { padding: '1.5rem', maxWidth: 1100, margin: '0 auto' },
  title: { fontSize: '1.3rem', fontWeight: 700, color: '#e94560', marginBottom: '1.5rem' },
  tabs: { display: 'flex', gap: 0, marginBottom: '1.5rem', borderBottom: '2px solid #0f3460' },
  tab: {
    background: 'none', border: 'none', color: '#a0aec0',
    padding: '0.6rem 1.2rem', cursor: 'pointer', fontSize: '0.9rem',
    borderBottom: '2px solid transparent', marginBottom: -2,
  },
  activeTab: { color: '#e94560', borderBottomColor: '#e94560' },
  section: { background: '#16213e', border: '1px solid #0f3460', borderRadius: 8, padding: '1.25rem', marginBottom: '1.25rem' },
  sectionTitle: { fontSize: '0.95rem', fontWeight: 600, color: '#e2e8f0', marginBottom: '1rem' },
  row: { display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: '0.75rem' },
  label: { fontSize: '0.78rem', color: '#718096', display: 'block', marginBottom: '0.25rem' },
  input: {
    background: '#0f3460', border: '1px solid #2d3748', color: '#e2e8f0',
    padding: '0.5rem 0.7rem', borderRadius: 4, fontSize: '0.85rem', minWidth: 140,
  },
  select: {
    background: '#0f3460', border: '1px solid #2d3748', color: '#e2e8f0',
    padding: '0.5rem 0.7rem', borderRadius: 4, fontSize: '0.85rem',
  },
  primaryBtn: {
    background: '#e94560', border: 'none', color: '#fff',
    padding: '0.5rem 1rem', borderRadius: 4, cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600,
  },
  dangerBtn: {
    background: '#742a2a', border: 'none', color: '#fff',
    padding: '0.3rem 0.7rem', borderRadius: 4, cursor: 'pointer', fontSize: '0.78rem',
  },
  successBtn: {
    background: '#276749', border: 'none', color: '#fff',
    padding: '0.3rem 0.7rem', borderRadius: 4, cursor: 'pointer', fontSize: '0.78rem',
  },
  ghostBtn: {
    background: 'none', border: '1px solid #2d3748', color: '#a0aec0',
    padding: '0.3rem 0.7rem', borderRadius: 4, cursor: 'pointer', fontSize: '0.78rem',
  },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' },
  th: { textAlign: 'left', color: '#718096', padding: '0.4rem 0.6rem', borderBottom: '1px solid #2d3748' },
  td: { padding: '0.4rem 0.6rem', color: '#e2e8f0', borderBottom: '1px solid #1a1a2e' },
  msg: { fontSize: '0.82rem', padding: '0.5rem 0', color: '#68d391' },
  errMsg: { fontSize: '0.82rem', padding: '0.5rem 0', color: '#fc8181' },
};

// ─── Tile edit modal ──────────────────────────────────────────────────────────
function TileModal({ cell, existing, onSave, onDelete, onClose }) {
  const [form, setForm] = useState({
    label: existing?.label || '',
    type: existing?.type || 'drop',
    targetRaw: existing ? formatTarget(existing.type, existing.target) : '1',
    wom_metric: existing?.wom_metric || '',
    wom_competition_id: existing?.wom_competition_id ? String(existing.wom_competition_id) : '',
    icon_url: existing?.icon_url || null,
  });

  function set(field, value) { setForm(f => ({ ...f, [field]: value })); }

  function handleLabelChange(label) {
    setForm(f => ({ ...f, label }));
  }

  function handleTypeChange(type) {
    setForm(f => {
      const currentParsed = f.type === 'xp' ? parseXpTarget(f.targetRaw) : parseInt(f.targetRaw) || 1;
      const newTargetRaw = type === 'xp' ? formatXp(currentParsed || 1) : String(currentParsed || 1);
      // Clear icon when switching type (skill vs boss vs item icons are incompatible)
      return { ...f, type, targetRaw: newTargetRaw, icon_url: null };
    });
  }

  const isXp = form.type === 'xp';
  const parsedTarget = isXp ? parseXpTarget(form.targetRaw) : parseInt(form.targetRaw) || 1;
  const targetValid = parsedTarget != null && parsedTarget > 0;

  function handleSave() {
    onSave({ ...form, target: parsedTarget });
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
      onClick={onClose}
    >
      <div
        style={{ background: '#1a1a2e', border: '1px solid #0f3460', borderRadius: 8, padding: '1.5rem', width: 420, maxWidth: '92vw' }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div>
            <span style={{ fontSize: '1.1rem', fontWeight: 700, color: '#e94560' }}>{cell}</span>
            <span style={{ fontSize: '0.8rem', color: '#718096', marginLeft: '0.5rem' }}>
              {existing ? 'Edit tile' : 'New tile'}
            </span>
          </div>
          <button style={{ background: 'none', border: 'none', color: '#718096', cursor: 'pointer', fontSize: '1.1rem' }} onClick={onClose}>✕</button>
        </div>

        <div style={{ marginBottom: '0.9rem' }}>
          <label style={s.label}>Label</label>
          <input
            style={{ ...s.input, width: '100%', minWidth: 0 }}
            value={form.label}
            onChange={e => handleLabelChange(e.target.value)}
            placeholder="e.g. 6 CoX purples"
            autoFocus
          />
        </div>

        <div style={{ marginBottom: '0.9rem' }}>
          <IconPicker type={form.type} value={form.icon_url} label={form.label} onChange={url => set('icon_url', url)} />
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: isXp ? '0.4rem' : '0.9rem' }}>
          <div style={{ flex: 1 }}>
            <label style={s.label}>Type</label>
            <select style={{ ...s.select, width: '100%' }} value={form.type} onChange={e => handleTypeChange(e.target.value)}>
              <option value="drop">Drop</option>
              <option value="kc">Kill Count</option>
              <option value="xp">XP (WiseOldMan)</option>
            </select>
          </div>
          <div style={{ width: 110 }}>
            <label style={s.label}>{isXp ? 'XP Goal' : 'Target'}</label>
            {isXp ? (
              <input
                style={{ ...s.input, width: '100%', minWidth: 0, borderColor: targetValid ? '#2d3748' : '#742a2a' }}
                value={form.targetRaw}
                onChange={e => set('targetRaw', e.target.value)}
                placeholder="50m"
              />
            ) : (
              <input
                type="number" min={1}
                style={{ ...s.input, width: '100%', minWidth: 0 }}
                value={form.targetRaw}
                onChange={e => set('targetRaw', e.target.value)}
              />
            )}
          </div>
        </div>

        {isXp && (
          <div style={{ marginBottom: '0.9rem', fontSize: '0.75rem', color: targetValid ? '#68d391' : '#fc8181', paddingLeft: 2 }}>
            {targetValid
              ? `= ${parsedTarget.toLocaleString()} xp`
              : 'Enter a value like 50m, 500k, or 1.5m'}
          </div>
        )}

        {isXp && (
          <div style={{ marginBottom: '0.9rem' }}>
            <label style={s.label}>WOM Metric (skill name, e.g. fletching)</label>
            <input
              style={{ ...s.input, width: '100%', minWidth: 0 }}
              value={form.wom_metric}
              onChange={e => set('wom_metric', e.target.value)}
              placeholder="fletching"
            />
          </div>
        )}

        {(form.type === 'xp' || form.type === 'kc') && (
          <div style={{ marginBottom: '0.9rem' }}>
            <label style={s.label}>WOM Competition ID (optional — enables auto-tracking)</label>
            <input
              style={{ ...s.input, width: '100%', minWidth: 0 }}
              value={form.wom_competition_id}
              onChange={e => set('wom_competition_id', e.target.value)}
              placeholder="e.g. 131025"
            />
            <div style={{ fontSize: '0.72rem', color: '#718096', marginTop: '0.25rem' }}>
              If set, progress is synced from WiseOldMan every 3 min. No Discord submission needed.
            </div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.25rem' }}>
          <div>
            {existing && (
              <button style={s.dangerBtn} onClick={() => onDelete()}>Delete tile</button>
            )}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button style={s.ghostBtn} onClick={onClose}>Cancel</button>
            <button
              style={s.primaryBtn}
              disabled={!form.label.trim() || !targetValid}
              onClick={handleSave}
            >
              {existing ? 'Save changes' : 'Add tile'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Visual board grid for tile editing ───────────────────────────────────────
function TileGrid({ boardSize, tiles, onCellDoubleClick }) {
  const tileMap = {};
  for (const t of tiles) tileMap[`${t.col}-${t.row}`] = t;

  const filled = tiles.length;
  const total = boardSize * boardSize;

  function typeColor(type) {
    if (type === 'xp') return '#68d391';
    if (type === 'kc') return '#f6ad55';
    return '#63b3ed';
  }

  return (
    <div>
      <div style={{ fontSize: '0.78rem', color: '#718096', marginBottom: '0.75rem' }}>
        {filled}/{total} tiles filled · Double-click any cell to edit
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', tableLayout: 'fixed', width: '100%' }}>
          <thead>
            <tr>
              <th style={{ width: 28, background: '#0a0a1a', border: '1px solid #1a2a3a' }} />
              {Array.from({ length: boardSize }, (_, i) => (
                <th key={i} style={{
                  background: '#0f3460', color: '#a0aec0', fontSize: '0.72rem',
                  padding: '0.3rem', textAlign: 'center', border: '1px solid #1a2a3a', fontWeight: 600,
                }}>
                  {COLS[i]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: boardSize }, (_, ri) => {
              const row = ri + 1;
              return (
                <tr key={row}>
                  <td style={{
                    background: '#0f3460', color: '#a0aec0', fontSize: '0.72rem',
                    textAlign: 'center', fontWeight: 600, border: '1px solid #1a2a3a', padding: '0.3rem',
                  }}>
                    {row}
                  </td>
                  {Array.from({ length: boardSize }, (_, ci) => {
                    const col = ci + 1;
                    const tile = tileMap[`${col}-${row}`];
                    const c = coord(row, col);
                    return (
                      <td
                        key={col}
                        onDoubleClick={() => onCellDoubleClick(c, col, row, tile)}
                        title={tile ? `${c}: ${tile.label} (${tile.type}, ${tile.target})` : `${c}: empty — double-click to add`}
                        style={{
                          border: '1px solid #1a2a3a',
                          background: tile ? '#0f2035' : '#12121f',
                          cursor: 'pointer',
                          verticalAlign: 'top',
                          padding: '0.3rem 0.4rem',
                          minHeight: 64,
                          position: 'relative',
                          transition: 'background 0.15s',
                        }}
                      >
                        {tile ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', height: '100%' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                              {tile.icon_url && (
                                <img
                                  src={tile.icon_url}
                                  alt=""
                                  style={{ width: 20, height: 20, objectFit: 'contain', imageRendering: 'pixelated', flexShrink: 0 }}
                                  onError={e => { e.target.style.display = 'none'; }}
                                />
                              )}
                              <span style={{
                                fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase',
                                color: typeColor(tile.type), letterSpacing: '0.04em',
                              }}>
                                {tile.type} ×{formatTarget(tile.type, tile.target)}
                              </span>
                            </div>
                            <span style={{ fontSize: '0.72rem', color: '#e2e8f0', lineHeight: 1.3 }}>
                              {tile.label}
                            </span>
                          </div>
                        ) : (
                          <div style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            height: '100%', minHeight: 52, color: '#2d3748', fontSize: '1.2rem',
                            userSelect: 'none',
                          }}>
                            +
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Board viewer modal ───────────────────────────────────────────────────────
function BoardModal({ event, onClose }) {
  const [data, setData] = useState(null);
  useEffect(() => {
    api.get(`/board/event/${event.id}`).then(r => setData(r.data));
  }, [event.id]);
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', flexDirection: 'column', zIndex: 1000, padding: '1rem' }} onClick={onClose}>
      <div style={{ background: '#1a1a2e', border: '1px solid #0f3460', borderRadius: 8, padding: '1.25rem', flex: 1, overflowY: 'auto', maxWidth: 1100, width: '100%', margin: '0 auto' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <h2 style={{ color: '#e94560', margin: 0, fontSize: '1.1rem' }}>{event.name}</h2>
            <span style={{ fontSize: '0.78rem', color: '#718096' }}>{event.board_size}×{event.board_size} · {event.status}</span>
          </div>
          <button style={{ background: 'none', border: 'none', color: '#718096', cursor: 'pointer', fontSize: '1.3rem' }} onClick={onClose}>✕</button>
        </div>
        {!data
          ? <p style={{ color: '#718096' }}>Loading…</p>
          : <BingoBoard tiles={data.tiles} teams={data.teams} boardSize={event.board_size || 9} />
        }
      </div>
    </div>
  );
}

// ─── Delete Event Confirmation Modal ─────────────────────────────────────────
function DeleteEventModal({ event, onConfirm, onClose }) {
  const isActive = event.status === 'active';
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={onClose}>
      <div style={{ background: '#1a1a2e', border: '1px solid #742a2a', borderRadius: 8, padding: '1.5rem', maxWidth: 440, width: '90%' }} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fc8181', marginBottom: '0.75rem' }}>
          Delete event permanently?
        </div>

        <div style={{ background: '#0f1a2e', border: '1px solid #2d3748', borderRadius: 6, padding: '0.75rem 1rem', marginBottom: '1rem' }}>
          <div style={{ fontWeight: 700, color: '#e2e8f0', marginBottom: '0.25rem' }}>{event.name}</div>
          <div style={{ fontSize: '0.78rem', color: event.status === 'active' ? '#fc8181' : '#718096' }}>
            {event.board_size}×{event.board_size} · {event.status}
          </div>
        </div>

        {isActive && (
          <div style={{ background: '#742a2a33', border: '1px solid #742a2a', borderRadius: 4, padding: '0.5rem 0.75rem', marginBottom: '1rem', fontSize: '0.82rem', color: '#fc8181' }}>
            Warning: this event is currently active.
          </div>
        )}

        <p style={{ fontSize: '0.85rem', color: '#a0aec0', marginBottom: '0.5rem' }}>This will permanently delete:</p>
        <ul style={{ fontSize: '0.83rem', color: '#718096', paddingLeft: '1.25rem', marginBottom: '1rem', lineHeight: 1.8 }}>
          <li>All tiles and board configuration</li>
          <li>All teams and their rosters</li>
          <li>All submissions and uploaded screenshots</li>
          <li>All progress records</li>
        </ul>
        <p style={{ fontSize: '0.82rem', color: '#fc8181', marginBottom: '1.25rem', fontWeight: 600 }}>
          This cannot be undone.
        </p>

        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <button style={s.ghostBtn} onClick={onClose}>Cancel</button>
          <button
            style={{ ...s.dangerBtn, padding: '0.5rem 1.1rem', fontSize: '0.85rem', fontWeight: 700 }}
            onClick={onConfirm}
          >
            Delete permanently
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Events Tab ───────────────────────────────────────────────────────────────
function EventsTab() {
  const [events, setEvents] = useState([]);
  const [form, setForm] = useState({ name: '', board_size: '9', wom_competition_id: '' });
  const [msg, setMsg] = useState('');
  const [boardEvent, setBoardEvent] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [womStatus, setWomStatus] = useState({ lastSync: null });
  const [womSyncing, setWomSyncing] = useState(false);

  useEffect(() => {
    api.get('/events').then(r => setEvents(r.data));
    api.get('/wom/status').then(r => setWomStatus(r.data)).catch(() => {});
  }, []);

  async function forceWomSync() {
    setWomSyncing(true);
    try {
      const res = await api.post('/wom/sync');
      setWomStatus({ lastSync: res.data.lastSync });
    } catch (e) {
      // sync failed, status unchanged
    } finally {
      setWomSyncing(false);
    }
  }

  async function create(e) {
    e.preventDefault();
    const res = await api.post('/events', {
      name: form.name,
      board_size: parseInt(form.board_size),
      wom_competition_id: form.wom_competition_id || null,
    });
    setEvents(prev => [res.data, ...prev]);
    setForm({ name: '', board_size: '9', wom_competition_id: '' });
    setMsg('Event created');
    setTimeout(() => setMsg(''), 3000);
  }

  async function setStatus(id, status) {
    const res = await api.patch(`/events/${id}`, { status });
    setEvents(prev => prev.map(e => e.id === id ? res.data : e));
  }

  async function confirmDelete() {
    await api.delete(`/events/${deleteTarget.id}`);
    setEvents(prev => prev.filter(e => e.id !== deleteTarget.id));
    setDeleteTarget(null);
  }

  return (
    <div>
      {boardEvent && <BoardModal event={boardEvent} onClose={() => setBoardEvent(null)} />}
      {deleteTarget && (
        <DeleteEventModal
          event={deleteTarget}
          onConfirm={confirmDelete}
          onClose={() => setDeleteTarget(null)}
        />
      )}
      <div style={{ ...s.section, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <div style={s.sectionTitle} >WiseOldMan Sync</div>
          <div style={{ fontSize: '0.8rem', color: '#718096' }}>
            Auto-syncs every 3 hours.{' '}
            {womStatus.lastSync
              ? <>Last synced: <span style={{ color: '#a0aec0' }}>{new Date(womStatus.lastSync).toLocaleString()}</span></>
              : <span style={{ color: '#a0aec0' }}>Not yet synced this session.</span>}
          </div>
        </div>
        <button
          style={{ ...s.primaryBtn, opacity: womSyncing ? 0.6 : 1 }}
          onClick={forceWomSync}
          disabled={womSyncing}
        >
          {womSyncing ? 'Syncing…' : 'Sync Now'}
        </button>
      </div>

      <div style={s.section}>
        <div style={s.sectionTitle}>Create Event</div>
        <form onSubmit={create}>
          <div style={s.row}>
            <div>
              <label style={s.label}>Event Name</label>
              <input
                style={s.input}
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Summer Bingo 2025"
                required
              />
            </div>
            <div>
              <label style={s.label}>Board Size</label>
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                {['5','6','7','8','9'].map(size => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, board_size: size }))}
                    style={{
                      padding: '0.45rem 0.8rem', borderRadius: 4, cursor: 'pointer',
                      fontSize: '0.85rem', fontWeight: 600, border: 'none',
                      background: form.board_size === size ? '#e94560' : '#0f3460',
                      color: form.board_size === size ? '#fff' : '#a0aec0',
                    }}
                  >
                    {size}×{size}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label style={s.label}>WiseOldMan Competition ID (optional)</label>
              <input
                style={s.input}
                value={form.wom_competition_id}
                onChange={e => setForm(f => ({ ...f, wom_competition_id: e.target.value }))}
                placeholder="12345"
              />
            </div>
            <button type="submit" style={s.primaryBtn}>Create</button>
          </div>
          {msg && <div style={s.msg}>{msg}</div>}
        </form>
      </div>

      <div style={s.section}>
        <div style={s.sectionTitle}>All Events</div>
        <table style={s.table}>
          <thead>
            <tr>
              <th style={s.th}>Name</th>
              <th style={s.th}>Size</th>
              <th style={s.th}>Status</th>
              <th style={s.th}>WOM ID</th>
              <th style={s.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {events.map(ev => (
              <tr key={ev.id}>
                <td style={s.td}>{ev.name}</td>
                <td style={s.td}>{ev.board_size}×{ev.board_size}</td>
                <td style={s.td}>
                  <span style={{ color: ev.status === 'active' ? '#68d391' : ev.status === 'completed' ? '#718096' : '#f6ad55' }}>
                    {ev.status}
                  </span>
                </td>
                <td style={s.td}>{ev.wom_competition_id || '—'}</td>
                <td style={s.td}>
                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                    {ev.status === 'setup' && <button style={s.successBtn} onClick={() => setStatus(ev.id, 'active')}>Activate</button>}
                    {ev.status === 'active' && <button style={s.dangerBtn} onClick={() => setStatus(ev.id, 'completed')}>End</button>}
                    {ev.status === 'completed' && <button style={s.successBtn} onClick={() => setStatus(ev.id, 'active')}>Reactivate</button>}
                    <button style={s.ghostBtn} onClick={() => setBoardEvent(ev)}>View Board</button>
                    <button style={s.dangerBtn} onClick={() => setDeleteTarget(ev)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Tiles Tab ────────────────────────────────────────────────────────────────
function TilesTab() {
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [tiles, setTiles] = useState([]);
  const [modal, setModal] = useState(null); // { coord, col, row, tile }

  useEffect(() => {
    api.get('/events').then(r => {
      setEvents(r.data);
      if (r.data[0]) setSelectedEvent(r.data[0]);
    });
  }, []);

  useEffect(() => {
    if (!selectedEvent) return;
    api.get(`/tiles/event/${selectedEvent.id}`).then(r => setTiles(r.data));
  }, [selectedEvent]);

  function openModal(c, col, row, tile) {
    setModal({ coord: c, col, row, tile: tile || null });
  }

  async function handleSave(form) {
    const { coord, col, row, tile } = modal;
    const payload = {
      label: form.label,
      type: form.type,
      target: form.target,
      wom_metric: form.type === 'xp' ? form.wom_metric : null,
      wom_competition_id: (form.type === 'xp' || form.type === 'kc')
        ? (parseInt(form.wom_competition_id) || null)
        : null,
      icon_url: form.icon_url || null,
    };
    if (tile) {
      const res = await api.patch(`/tiles/${tile.id}`, payload);
      setTiles(prev => prev.map(t => t.id === tile.id ? { ...t, ...res.data } : t));
    } else {
      const res = await api.post(`/tiles/event/${selectedEvent.id}`, { coord, ...payload });
      setTiles(prev => [...prev, { ...res.data, col, row }].sort((a, b) => a.row - b.row || a.col - b.col));
    }
    setModal(null);
  }

  async function handleDelete() {
    await api.delete(`/tiles/${modal.tile.id}`);
    setTiles(prev => prev.filter(t => t.id !== modal.tile.id));
    setModal(null);
  }

  return (
    <div>
      {modal && (
        <TileModal
          cell={modal.coord}
          existing={modal.tile}
          onSave={handleSave}
          onDelete={handleDelete}
          onClose={() => setModal(null)}
        />
      )}

      <div style={s.section}>
        <div style={s.row}>
          <div>
            <label style={s.label}>Event</label>
            <select
              style={s.select}
              value={selectedEvent?.id || ''}
              onChange={e => setSelectedEvent(events.find(ev => ev.id === parseInt(e.target.value)))}
            >
              {events.map(ev => <option key={ev.id} value={ev.id}>{ev.name} ({ev.board_size}×{ev.board_size})</option>)}
            </select>
          </div>
        </div>
      </div>

      {selectedEvent && (
        <div style={s.section}>
          <TileGrid
            boardSize={selectedEvent.board_size}
            tiles={tiles}
            onCellDoubleClick={openModal}
          />
        </div>
      )}
    </div>
  );
}

// ─── Teams Tab ────────────────────────────────────────────────────────────────
function TeamsTab() {
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState('');
  const [teams, setTeams] = useState([]);
  const [teamForm, setTeamForm] = useState({ name: '', color: '#e84141', discord_channel_id: '' });
  const [memberForms, setMemberForms] = useState({});
  const [msg, setMsg] = useState('');

  useEffect(() => {
    api.get('/events').then(r => { setEvents(r.data); if (r.data[0]) setSelectedEvent(String(r.data[0].id)); });
  }, []);

  const loadTeams = useCallback(() => {
    if (!selectedEvent) return;
    api.get(`/teams/event/${selectedEvent}`).then(r => setTeams(r.data));
  }, [selectedEvent]);

  useEffect(() => { loadTeams(); }, [loadTeams]);

  async function createTeam(e) {
    e.preventDefault();
    await api.post(`/teams/event/${selectedEvent}`, teamForm);
    setTeamForm({ name: '', color: '#e84141', discord_channel_id: '' });
    loadTeams();
    setMsg('Team created'); setTimeout(() => setMsg(''), 3000);
  }

  async function addMember(teamId) {
    const form = memberForms[teamId] || { discord_username: '', osrs_name: '' };
    if (!form.discord_username) return;
    await api.post(`/teams/${teamId}/members`, form);
    setMemberForms(f => ({ ...f, [teamId]: { discord_username: '', osrs_name: '' } }));
    loadTeams();
  }

  async function removeMember(teamId, memberId) {
    await api.delete(`/teams/${teamId}/members/${memberId}`);
    loadTeams();
  }

  function setMemberField(teamId, field, value) {
    setMemberForms(f => ({ ...f, [teamId]: { ...(f[teamId] || {}), [field]: value } }));
  }

  return (
    <div>
      <div style={s.section}>
        <div style={s.row}>
          <div>
            <label style={s.label}>Event</label>
            <select style={s.select} value={selectedEvent} onChange={e => setSelectedEvent(e.target.value)}>
              {events.map(ev => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div style={s.section}>
        <div style={s.sectionTitle}>Create Team</div>
        <form onSubmit={createTeam}>
          <div style={s.row}>
            <div>
              <label style={s.label}>Team Name</label>
              <input style={s.input} value={teamForm.name} onChange={e => setTeamForm(f => ({ ...f, name: e.target.value }))} placeholder="Team Chaos" required />
            </div>
            <div>
              <label style={s.label}>Discord Channel ID</label>
              <input style={s.input} value={teamForm.discord_channel_id} onChange={e => setTeamForm(f => ({ ...f, discord_channel_id: e.target.value }))} placeholder="1234567890" />
            </div>
            <div>
              <label style={s.label}>Colour</label>
              <input type="color" style={{ ...s.input, width: 60, padding: '0.2rem', cursor: 'pointer' }} value={teamForm.color} onChange={e => setTeamForm(f => ({ ...f, color: e.target.value }))} />
            </div>
            <button type="submit" style={s.primaryBtn}>Create</button>
          </div>
          {msg && <div style={s.msg}>{msg}</div>}
        </form>
      </div>

      {teams.map(team => (
        <div key={team.id} style={{ ...s.section, borderLeft: `3px solid ${team.color}` }}>
          <div style={s.sectionTitle}>{team.name}</div>
          <div style={{ fontSize: '0.78rem', color: '#718096', marginBottom: '0.75rem' }}>
            Channel ID: {team.discord_channel_id || '(not set)'}
          </div>
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>Discord Username</th>
                <th style={s.th}>OSRS Name</th>
                <th style={s.th}></th>
              </tr>
            </thead>
            <tbody>
              {(team.members || []).map(m => (
                <tr key={m.id}>
                  <td style={s.td}>{m.discord_username}</td>
                  <td style={s.td}>{m.osrs_name || '—'}</td>
                  <td style={s.td}><button style={s.dangerBtn} onClick={() => removeMember(team.id, m.id)}>Remove</button></td>
                </tr>
              ))}
              <tr>
                <td style={s.td}>
                  <input style={{ ...s.input, width: '100%' }} placeholder="discorduser" value={memberForms[team.id]?.discord_username || ''} onChange={e => setMemberField(team.id, 'discord_username', e.target.value)} />
                </td>
                <td style={s.td}>
                  <input style={{ ...s.input, width: '100%' }} placeholder="osrs name (optional)" value={memberForms[team.id]?.osrs_name || ''} onChange={e => setMemberField(team.id, 'osrs_name', e.target.value)} />
                </td>
                <td style={s.td}><button style={s.successBtn} onClick={() => addMember(team.id)}>Add</button></td>
              </tr>
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}

// ─── Users Tab ────────────────────────────────────────────────────────────────
function UsersTab() {
  const [users, setUsers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState('');
  const [form, setForm] = useState({ username: '', password: '', role: 'captain', team_id: '' });
  const [editing, setEditing] = useState(null);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const loadUsers = useCallback(() => {
    api.get('/auth/users').then(r => setUsers(r.data));
  }, []);

  useEffect(() => {
    loadUsers();
    api.get('/events').then(r => { setEvents(r.data); if (r.data[0]) setSelectedEvent(String(r.data[0].id)); });
  }, [loadUsers]);

  useEffect(() => {
    if (!selectedEvent) return;
    api.get(`/teams/event/${selectedEvent}`).then(r => setTeams(r.data));
  }, [selectedEvent]);

  function flash(m, isErr) {
    isErr ? setErr(m) : setMsg(m);
    setTimeout(() => isErr ? setErr('') : setMsg(''), 3000);
  }

  async function createUser(e) {
    e.preventDefault();
    setErr('');
    try {
      await api.post('/auth/register', { ...form, team_id: form.team_id || null });
      setForm({ username: '', password: '', role: 'captain', team_id: '' });
      flash('User created');
      loadUsers();
    } catch (e) { flash(e.response?.data?.error || 'Error', true); }
  }

  async function saveEdit() {
    try {
      const payload = { role: editing.role, team_id: editing.team_id || null };
      if (editing.newPassword) payload.password = editing.newPassword;
      await api.patch(`/auth/users/${editing.id}`, payload);
      setEditing(null);
      flash('User updated');
      loadUsers();
    } catch (e) { flash(e.response?.data?.error || 'Error', true); }
  }

  async function deleteUser(id, username) {
    if (!confirm(`Delete user "${username}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/auth/users/${id}`);
      loadUsers();
    } catch (e) { flash(e.response?.data?.error || 'Error', true); }
  }

  return (
    <div>
      <div style={s.section}>
        <div style={s.sectionTitle}>User Accounts</div>
        {msg && <div style={{ ...s.msg, marginBottom: '0.5rem' }}>{msg}</div>}
        {err && <div style={{ ...s.errMsg, marginBottom: '0.5rem' }}>{err}</div>}
        <table style={s.table}>
          <thead>
            <tr>
              <th style={s.th}>Username</th>
              <th style={s.th}>Role</th>
              <th style={s.th}>Team</th>
              <th style={s.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => editing?.id === u.id ? (
              <tr key={u.id}>
                <td style={s.td} colSpan={2}>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{ color: '#e2e8f0', fontWeight: 600 }}>{u.username}</span>
                    <select style={s.select} value={editing.role} onChange={e => setEditing(ed => ({ ...ed, role: e.target.value }))}>
                      <option value="captain">Captain</option>
                      <option value="admin">Admin</option>
                    </select>
                    <select style={s.select} value={editing.team_id || ''} onChange={e => setEditing(ed => ({ ...ed, team_id: e.target.value }))}>
                      <option value="">— no team —</option>
                      {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                    <input style={{ ...s.input, width: 160 }} type="password" placeholder="New password (optional)" value={editing.newPassword || ''} onChange={e => setEditing(ed => ({ ...ed, newPassword: e.target.value }))} />
                  </div>
                </td>
                <td style={s.td} />
                <td style={s.td}>
                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    <button style={s.successBtn} onClick={saveEdit}>Save</button>
                    <button style={s.ghostBtn} onClick={() => setEditing(null)}>Cancel</button>
                  </div>
                </td>
              </tr>
            ) : (
              <tr key={u.id}>
                <td style={s.td}>{u.username}</td>
                <td style={s.td}><span style={{ color: u.role === 'admin' ? '#e94560' : '#f6ad55' }}>{u.role}</span></td>
                <td style={s.td}>{u.team_name || '—'}</td>
                <td style={s.td}>
                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    <button style={s.ghostBtn} onClick={() => setEditing({ ...u, newPassword: '' })}>Edit</button>
                    <button style={s.dangerBtn} onClick={() => deleteUser(u.id, u.username)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={s.section}>
        <div style={s.sectionTitle}>Create User</div>
        <div style={{ ...s.row, marginBottom: '0.75rem' }}>
          <div>
            <label style={s.label}>Event (to pick team)</label>
            <select style={s.select} value={selectedEvent} onChange={e => setSelectedEvent(e.target.value)}>
              {events.map(ev => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
            </select>
          </div>
        </div>
        <form onSubmit={createUser}>
          <div style={s.row}>
            <div>
              <label style={s.label}>Username</label>
              <input style={s.input} value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} required />
            </div>
            <div>
              <label style={s.label}>Password</label>
              <input type="password" style={s.input} value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required />
            </div>
            <div>
              <label style={s.label}>Role</label>
              <select style={s.select} value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                <option value="captain">Captain</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            {form.role === 'captain' && (
              <div>
                <label style={s.label}>Assign Team</label>
                <select style={s.select} value={form.team_id} onChange={e => setForm(f => ({ ...f, team_id: e.target.value }))}>
                  <option value="">— none —</option>
                  {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
            )}
            <button type="submit" style={s.primaryBtn}>Create</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Audit Tab ────────────────────────────────────────────────────────────────
const ACTION_LABELS = {
  submission_approved: { label: 'Approved', color: '#68d391' },
  submission_rejected: { label: 'Rejected', color: '#fc8181' },
  user_created:        { label: 'User Created', color: '#63b3ed' },
  user_updated:        { label: 'User Updated', color: '#f6ad55' },
  user_deleted:        { label: 'User Deleted', color: '#fc8181' },
  event_created:       { label: 'Event Created', color: '#b794f4' },
  event_status_changed:{ label: 'Event Status', color: '#b794f4' },
  event_deleted:       { label: 'Event Deleted', color: '#fc8181' },
  member_added:        { label: 'Member Added', color: '#68d391' },
  member_removed:      { label: 'Member Removed', color: '#f6ad55' },
};

function AuditTab() {
  const [log, setLog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    api.get('/audit/log').then(r => { setLog(r.data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const categories = [
    { key: 'all', label: 'All' },
    { key: 'submissions', label: 'Submissions', actions: ['submission_approved', 'submission_rejected'] },
    { key: 'users', label: 'Users', actions: ['user_created', 'user_updated', 'user_deleted'] },
    { key: 'events', label: 'Events', actions: ['event_created', 'event_status_changed'] },
    { key: 'members', label: 'Members', actions: ['member_added', 'member_removed'] },
  ];

  const visible = filter === 'all'
    ? log
    : log.filter(r => (categories.find(c => c.key === filter)?.actions || []).includes(r.action));

  if (loading) return <p style={{ color: '#718096' }}>Loading…</p>;

  return (
    <div>
      <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        {categories.map(c => (
          <button key={c.key} style={{ ...s.tab, ...(filter === c.key ? s.activeTab : {}), padding: '0.3rem 0.8rem' }} onClick={() => setFilter(c.key)}>
            {c.label}
          </button>
        ))}
        <span style={{ marginLeft: 'auto', fontSize: '0.8rem', color: '#718096' }}>{visible.length} record{visible.length !== 1 ? 's' : ''}</span>
      </div>

      <div style={s.section}>
        {visible.length === 0 && <p style={{ color: '#718096', fontSize: '0.85rem' }}>No records.</p>}
        {visible.map(row => {
          const meta = ACTION_LABELS[row.action] || { label: row.action, color: '#a0aec0' };
          return (
            <div key={row.id} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', padding: '0.55rem 0', borderBottom: '1px solid #1a1a2e' }}>
              <span style={{ fontSize: '0.72rem', color: '#4a5568', whiteSpace: 'nowrap', width: 130, flexShrink: 0, marginTop: 2 }}>
                {new Date(row.created_at).toLocaleString()}
              </span>
              <span style={{ fontSize: '0.8rem', color: '#a0aec0', whiteSpace: 'nowrap', width: 90, flexShrink: 0, marginTop: 2 }}>
                {row.actor_username}
              </span>
              <span style={{ ...s.badge, background: meta.color + '22', color: meta.color, whiteSpace: 'nowrap', flexShrink: 0, marginTop: 1 }}>
                {meta.label}
              </span>
              <span style={{ fontSize: '0.84rem', color: '#e2e8f0', flex: 1 }}>{row.details}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────
const TABS = ['Events', 'Tiles', 'Teams', 'Users', 'Audit'];

export default function Admin() {
  const [tab, setTab] = useState('Events');
  return (
    <div style={s.page}>
      <h1 style={s.title}>Admin Panel</h1>
      <div style={s.tabs}>
        {TABS.map(t => (
          <button key={t} style={{ ...s.tab, ...(tab === t ? s.activeTab : {}) }} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </div>
      {tab === 'Events' && <EventsTab />}
      {tab === 'Tiles'  && <TilesTab />}
      {tab === 'Teams'  && <TeamsTab />}
      {tab === 'Users'  && <UsersTab />}
      {tab === 'Audit'  && <AuditTab />}
    </div>
  );
}

import React, { useEffect, useState, useCallback } from 'react';
import api from '../api';
import socket from '../socket';
import { useAuth } from '../App';
import { formatTarget, tileTypeLabel } from '../utils';

const COLS = ['A','B','C','D','E','F','G','H','I'];
function coord(row, col) { return `${COLS[col-1]}${row}`; }

const s = {
  page: { padding: '48px 16px 64px', maxWidth: 900 + 32, margin: '0 auto' },
  title: { fontFamily: "'RuneScape Quill', serif", fontSize: 40, lineHeight: 1, fontWeight: 400, color: 'var(--osrs-accent)', marginBottom: '1rem' },
  subtitle: { fontSize: '0.85rem', color: 'var(--osrs-muted)', marginBottom: '1rem' },
  tabs: { display: 'flex', flexWrap: 'wrap', gap: 0, marginBottom: '1.5rem', borderBottom: '1px solid var(--osrs-border)' },
  tab: {
    background: 'none', border: 'none', color: 'var(--osrs-accent)',
    padding: '0.6rem 1.2rem', cursor: 'pointer', fontFamily: "'RuneScape Bold', monospace", fontSize: 18,
    borderBottom: '3px solid transparent', marginBottom: -1,
  },
  activeTab: { color: 'var(--osrs-accent)', borderBottom: '3px solid var(--osrs-accent)' },
  card: {
    background: 'var(--c-16213e)', border: '1px solid var(--c-0f3460)', boxShadow: 'inset 0 0 0 1px var(--osrs-border)', borderRadius: 0,
    padding: '1rem', marginBottom: '1rem',
  },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' },
  tileLabel: { fontWeight: 600, color: 'var(--osrs-text)', fontSize: '0.95rem' },
  meta: { fontSize: '0.78rem', color: 'var(--osrs-muted)', marginTop: '0.2rem' },
  submittedBy: { fontSize: '0.8rem', color: 'var(--osrs-subtle)' },
  note: { fontSize: '0.82rem', color: 'var(--osrs-text)', marginBottom: '0.75rem', fontStyle: 'italic' },
  img: { maxWidth: '100%', maxHeight: 320, borderRadius: 0, marginBottom: '0.75rem', border: '1px solid var(--c-2d3748)' },
  actions: { display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' },
  approveBtn: {
    background: 'var(--osrs-success-bg)', border: 'none', color: '#fff',
    padding: '0.5rem 1.2rem', borderRadius: 0, cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem',
  },
  rejectBtn: {
    background: 'var(--osrs-danger-bg)', border: 'none', color: '#fff',
    padding: '0.5rem 1.2rem', borderRadius: 0, cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem',
  },
  countInput: {
    background: 'var(--c-0f3460)', border: '1px solid var(--c-2d3748)', color: 'var(--osrs-text)',
    padding: '0.4rem 0.6rem', borderRadius: 0, width: 64, fontSize: '0.85rem',
  },
  rejectInput: {
    background: 'var(--c-0f3460)', border: '1px solid var(--c-2d3748)', color: 'var(--osrs-text)',
    padding: '0.4rem 0.6rem', borderRadius: 0, flex: 1, fontSize: '0.85rem',
  },
  select: {
    background: 'var(--c-0f3460)', border: '1px solid var(--c-2d3748)', color: 'var(--osrs-text)',
    padding: '0.4rem 0.6rem', borderRadius: 0, fontSize: '0.85rem',
  },
  empty: { textAlign: 'center', color: 'var(--osrs-muted)', padding: '3rem' },
  badge: {
    display: 'inline-block', padding: '0.15rem 0.5rem', borderRadius: 0,
    fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase',
  },
  tileBtn: {
    background: 'var(--osrs-sunken)', border: '1px solid var(--c-2d3748)', borderRadius: 0,
    padding: '0.6rem 0.8rem', cursor: 'pointer', textAlign: 'left', width: '100%', marginBottom: '0.4rem',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  },
  tileBtnActive: { borderColor: 'var(--osrs-accent)', background: 'var(--osrs-panel-dark)' },
};

function typeColor(type) {
  if (type === 'xp') return 'var(--osrs-green)';
  if (type === 'kc') return 'var(--osrs-yellow)';
  return 'var(--osrs-blue)';
}

function statusColor(status) {
  if (status === 'approved') return 'var(--osrs-green)';
  if (status === 'rejected') return 'var(--osrs-red)';
  return 'var(--osrs-yellow)';
}

function Lightbox({ src, onClose }) {
  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, cursor: 'zoom-out' }}
      onClick={onClose}
    >
      <img
        src={src}
        alt="screenshot"
        style={{ maxWidth: '95vw', maxHeight: '95vh', objectFit: 'contain', borderRadius: 0, boxShadow: '0 8px 40px rgba(0,0,0,0.8)' }}
        onClick={e => e.stopPropagation()}
      />
      <button
        style={{ position: 'absolute', top: 16, right: 20, background: 'none', border: 'none', color: '#fff', fontSize: '1.8rem', cursor: 'pointer', lineHeight: 1 }}
        onClick={onClose}
      >✕</button>
    </div>
  );
}

function SubmissionCard({ sub, onApprove, onReject, showTeam }) {
  const [count, setCount] = useState(sub.count);
  const [condition, setCondition] = useState(1);
  const [rejectReason, setRejectReason] = useState('');
  const [showReject, setShowReject] = useState(false);
  const [lightbox, setLightbox] = useState(false);
  const c = coord(sub.row, sub.col);
  const isOr = sub.tile_target2 != null;

  return (
    <div className="osrs-card" style={s.card}>
      {lightbox && <Lightbox src={`/uploads/${sub.screenshot_path}`} onClose={() => setLightbox(false)} />}
      <div style={s.cardHeader}>
        <div>
          <div style={s.tileLabel}>
            <span style={{ color: 'var(--osrs-muted)', marginRight: 6 }}>{c}</span>
            {sub.tile_label}
            {showTeam && sub.team_name && (
              <span style={{ marginLeft: 8, fontSize: '0.78rem', color: 'var(--osrs-subtle)' }}>
                [{sub.team_name}]
              </span>
            )}
          </div>
          <div style={s.meta}>
            <span style={{ ...s.badge, background: `color-mix(in srgb, ${typeColor(sub.tile_type)} 20%, transparent)`, color: typeColor(sub.tile_type) }}>
              {tileTypeLabel(sub.tile_type, sub.tile_wom_metric)}
            </span>
            {' '}Count: {sub.count}
          </div>
        </div>
        <div style={s.submittedBy}>
          by <strong style={{ color: 'var(--osrs-text)' }}>{sub.submitted_by}</strong>
          <div style={{ fontSize: '0.72rem', color: 'var(--osrs-border)' }}>
            {new Date(sub.created_at).toLocaleString()}
          </div>
        </div>
      </div>

      {sub.note && <p style={s.note}>"{sub.note}"</p>}

      {sub.screenshot_path && (
        <img
          src={`/uploads/${sub.screenshot_path}`}
          alt="screenshot"
          style={{ ...s.img, cursor: 'zoom-in' }}
          onClick={() => setLightbox(true)}
          title="Click to enlarge"
        />
      )}

      {isOr && (
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.6rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--osrs-muted)', alignSelf: 'center' }}>Condition:</span>
          {[1, 2].map(c => (
            <label key={c} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', cursor: 'pointer', fontSize: '0.82rem', color: condition === c ? 'var(--osrs-text)' : 'var(--osrs-muted)' }}>
              <input type="radio" name={`cond-${sub.id}`} checked={condition === c} onChange={() => setCondition(c)} style={{ accentColor: 'var(--osrs-accent)' }} />
              Cond. {c} (target: {c === 1 ? sub.tile_target : sub.tile_target2})
            </label>
          ))}
        </div>
      )}
      <div style={s.actions}>
        <label style={{ fontSize: '0.8rem', color: 'var(--osrs-subtle)' }}>Count:</label>
        <input type="number" min={1} style={s.countInput} value={count} onChange={e => setCount(parseInt(e.target.value) || 1)} />
        <button className="osrs-stone osrs-stone--success" style={s.approveBtn} onClick={() => onApprove(sub.id, count, condition)}>✓ Approve</button>
        <button className="osrs-stone osrs-stone--danger" style={s.rejectBtn} onClick={() => setShowReject(v => !v)}>✗ Reject</button>
      </div>

      {showReject && (
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
          <input style={s.rejectInput} placeholder="Reason (optional)" value={rejectReason} onChange={e => setRejectReason(e.target.value)} />
          <button className="osrs-stone osrs-stone--danger" style={s.rejectBtn} onClick={() => onReject(sub.id, rejectReason)}>Confirm Reject</button>
        </div>
      )}
    </div>
  );
}

function HistoryCard({ sub, showTeam, onRevert }) {
  const [lightbox, setLightbox] = useState(false);
  const c = coord(sub.row, sub.col);
  const approved = sub.status === 'approved';

  return (
    <div className="osrs-card" style={{ ...s.card, borderLeft: `3px solid ${statusColor(sub.status)}` }}>
      {lightbox && <Lightbox src={`/uploads/${sub.screenshot_path}`} onClose={() => setLightbox(false)} />}
      <div style={s.cardHeader}>
        <div>
          <div style={s.tileLabel}>
            <span style={{ ...s.badge, background: `color-mix(in srgb, ${statusColor(sub.status)} 13%, transparent)`, color: statusColor(sub.status), marginRight: 8 }}>
              {sub.status}
            </span>
            <span style={{ color: 'var(--osrs-muted)', marginRight: 6 }}>{c}</span>
            {sub.tile_label}
            {showTeam && sub.team_name && (
              <span style={{ marginLeft: 8, fontSize: '0.78rem', color: 'var(--osrs-subtle)' }}>
                [{sub.team_name}]
              </span>
            )}
          </div>
          <div style={s.meta}>
            by <strong style={{ color: 'var(--osrs-subtle)' }}>{sub.submitted_by}</strong>
            {' · '}Count: {sub.count}
            {!approved && sub.rejection_reason && (
              <span style={{ color: 'var(--osrs-red)', marginLeft: 6 }}>· {sub.rejection_reason}</span>
            )}
          </div>
        </div>
        <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--osrs-border)' }}>
            Reviewed {sub.reviewed_at ? new Date(sub.reviewed_at).toLocaleString() : '—'}
          </div>
          {sub.screenshot_path && (
            <button
              style={{ ...s.tab, padding: '0.2rem 0.5rem', fontSize: '0.72rem', color: 'var(--osrs-blue)' }}
              onClick={() => setLightbox(true)}
            >
              View screenshot
            </button>
          )}
          {approved && onRevert && (
            <button
              style={{ ...s.tab, padding: '0.2rem 0.5rem', fontSize: '0.72rem', color: 'var(--osrs-red)' }}
              onClick={() => {
                if (confirm(`Revert approval for "${sub.tile_label}"? It will return to pending for re-review.`)) onRevert(sub.id);
              }}
            >
              Revert
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Pending tab ──────────────────────────────────────────────────────────────
function PendingTab({ user }) {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = user.role === 'admin'
        ? await api.get('/submissions/pending')
        : await api.get(`/submissions/team/${user.team_id}/pending`);
      setSubmissions(res.data);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user.role !== 'admin' && !user.team_id) { setLoading(false); return; }
    load();
    socket.on('new_submission', load);
    socket.on('submission_rejected', ({ submission_id }) => setSubmissions(p => p.filter(s => s.id !== submission_id)));
    socket.on('progress_update', load);
    return () => { socket.off('new_submission', load); socket.off('submission_rejected'); socket.off('progress_update', load); };
  }, [load, user]);

  async function handleApprove(id, count, condition) {
    await api.post(`/submissions/${id}/approve`, { count, condition });
    setSubmissions(p => p.filter(s => s.id !== id));
  }

  async function handleReject(id, reason) {
    await api.post(`/submissions/${id}/reject`, { reason });
    setSubmissions(p => p.filter(s => s.id !== id));
  }

  if (loading) return <p style={{ color: 'var(--osrs-muted)' }}>Loading...</p>;
  if (!user.team_id && user.role !== 'admin') return <p style={{ color: 'var(--osrs-red)' }}>You are not assigned to a team.</p>;

  return (
    <>
      <p style={s.subtitle}>{submissions.length} submission{submissions.length !== 1 ? 's' : ''} awaiting review{user.role === 'admin' ? ' (all teams)' : ''}</p>
      {submissions.length === 0
        ? <div style={s.empty}><div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>✓</div><p>All caught up!</p></div>
        : submissions.map(sub => (
          <SubmissionCard key={sub.id} sub={sub} onApprove={handleApprove} onReject={handleReject} showTeam={user.role === 'admin'} />
        ))
      }
    </>
  );
}

// ─── History tab ──────────────────────────────────────────────────────────────
function HistoryTab({ user }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState('');

  useEffect(() => {
    api.get('/events').then(r => {
      setEvents(r.data);
      if (r.data.length > 0) setSelectedEvent(String(r.data[0].id));
    });
  }, []);

  const load = useCallback(() => {
    const params = selectedEvent ? `?eventId=${selectedEvent}` : '';
    api.get(`/submissions/history${params}`)
      .then(r => { setHistory(r.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [selectedEvent]);

  useEffect(() => { if (selectedEvent !== null) load(); }, [load, selectedEvent]);

  async function handleRevert(id) {
    try {
      await api.post(`/submissions/${id}/revert`);
      load();
    } catch (e) {
      alert(e.response?.data?.error || 'Revert failed');
    }
  }

  const visible = filter === 'all' ? history : history.filter(s => s.status === filter);

  if (loading) return <p style={{ color: 'var(--osrs-muted)' }}>Loading...</p>;

  return (
    <>
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
        {events.length > 1 && (
          <select style={s.select} value={selectedEvent} onChange={e => setSelectedEvent(e.target.value)}>
            <option value=''>All events</option>
            {events.map(ev => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
          </select>
        )}
        <span style={{ fontSize: '0.82rem', color: 'var(--osrs-muted)' }}>Filter:</span>
        {['all', 'approved', 'rejected'].map(f => (
          <button key={f} style={{ ...s.tab, ...(filter === f ? s.activeTab : {}), padding: '0.3rem 0.8rem' }} onClick={() => setFilter(f)}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
        <span style={{ marginLeft: 'auto', fontSize: '0.8rem', color: 'var(--osrs-muted)' }}>{visible.length} record{visible.length !== 1 ? 's' : ''}</span>
      </div>
      {visible.length === 0
        ? <div style={s.empty}><p>No {filter === 'all' ? '' : filter} submissions found.</p></div>
        : visible.map(sub => (
          <HistoryCard
            key={sub.id}
            sub={sub}
            showTeam={user.role === 'admin'}
            onRevert={user.role === 'admin' ? handleRevert : null}
          />
        ))
      }
    </>
  );
}

// ─── By Tile tab ─────────────────────────────────────────────────────────────
function ByTileTab({ user }) {
  const [event, setEvent] = useState(null);
  const [eventCompleted, setEventCompleted] = useState(false);
  const [tiles, setTiles] = useState([]);
  const [teams, setTeams] = useState([]);
  const [selectedTile, setSelectedTile] = useState(null);
  const [selectedTeamId, setSelectedTeamId] = useState(user.team_id || null);
  const [submissions, setSubmissions] = useState([]);
  const [loadingSubs, setLoadingSubs] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const evRes = await api.get('/events/active');
        let ev = evRes.data;
        let completed = false;
        if (!ev) {
          const lastRes = await api.get('/events/last-completed');
          ev = lastRes.data;
          completed = true;
        }
        if (!ev) { setLoading(false); return; }
        setEvent(ev);
        setEventCompleted(completed);
        const [tilesRes, teamsRes] = await Promise.all([
          api.get(`/tiles/event/${ev.id}`),
          api.get(`/teams/event/${ev.id}`),
        ]);
        setTiles(tilesRes.data);
        setTeams(teamsRes.data);
        if (user.role === 'admin' && teamsRes.data.length > 0 && !selectedTeamId) {
          setSelectedTeamId(teamsRes.data[0].id);
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  useEffect(() => {
    if (!selectedTile || !selectedTeamId) return;
    setLoadingSubs(true);
    api.get(`/submissions/tile/${selectedTile.id}/team/${selectedTeamId}`)
      .then(r => setSubmissions(r.data))
      .finally(() => setLoadingSubs(false));
  }, [selectedTile, selectedTeamId]);

  async function handleApprove(id, count, condition) {
    await api.post(`/submissions/${id}/approve`, { count, condition });
    const r = await api.get(`/submissions/tile/${selectedTile.id}/team/${selectedTeamId}`);
    setSubmissions(r.data);
  }

  async function handleReject(id, reason) {
    await api.post(`/submissions/${id}/reject`, { reason });
    const r = await api.get(`/submissions/tile/${selectedTile.id}/team/${selectedTeamId}`);
    setSubmissions(r.data);
  }

  if (loading) return <p style={{ color: 'var(--osrs-muted)' }}>Loading...</p>;
  if (!event) return <div style={s.empty}><p>No events found.</p></div>;

  const teamForUser = user.role !== 'admin' ? teams.find(t => t.id === user.team_id) : null;

  return (
    <div>
      {eventCompleted && (
        <div style={{ fontSize: '0.78rem', color: 'var(--osrs-yellow)', marginBottom: '1rem', padding: '0.5rem 0.75rem', background: 'var(--osrs-warn-bg)', borderRadius: 0, border: '1px solid var(--osrs-warn-bg)' }}>
          Event ended — showing <strong>{event.name}</strong>
        </div>
      )}
    <div style={{ display: 'flex', gap: '1.25rem' }}>
      {/* Tile list */}
      <div style={{ width: 220, flexShrink: 0 }}>
        <div style={{ fontSize: '0.78rem', color: 'var(--osrs-muted)', marginBottom: '0.5rem' }}>Select a tile</div>
        {tiles.length === 0 && <p style={{ color: 'var(--osrs-muted)', fontSize: '0.85rem' }}>No tiles set up yet.</p>}
        {tiles.map(tile => (
          <button
            key={tile.id}
            style={{ ...s.tileBtn, ...(selectedTile?.id === tile.id ? s.tileBtnActive : {}) }}
            onClick={() => setSelectedTile(tile)}
          >
            <span>
              <span style={{ color: 'var(--osrs-muted)', fontSize: '0.72rem', marginRight: 6 }}>{tile.coord}</span>
              <span style={{ fontSize: '0.82rem', color: 'var(--osrs-text)' }}>{tile.label}</span>
            </span>
            <span style={{ ...s.badge, background: `color-mix(in srgb, ${typeColor(tile.type)} 20%, transparent)`, color: typeColor(tile.type) }}>{tileTypeLabel(tile.type, tile.wom_metric)}</span>
          </button>
        ))}
      </div>

      {/* Submission detail */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {!selectedTile ? (
          <div style={{ ...s.empty, padding: '2rem 0' }}>
            <p>Select a tile to view submissions.</p>
          </div>
        ) : (
          <>
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ fontWeight: 700, color: 'var(--osrs-text)', fontSize: '1rem' }}>
                {selectedTile.coord} — {selectedTile.label}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--osrs-muted)', marginBottom: '0.75rem' }}>
                {selectedTile.type} · Target: {formatTarget(selectedTile.type, selectedTile.target)}
              </div>

              {user.role === 'admin' ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--osrs-muted)' }}>Team:</span>
                  <select style={s.select} value={selectedTeamId || ''} onChange={e => setSelectedTeamId(parseInt(e.target.value))}>
                    {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
              ) : (
                teamForUser && <span style={{ fontSize: '0.82rem', color: 'var(--osrs-text)' }}>{teamForUser.name}</span>
              )}
            </div>

            {loadingSubs ? (
              <p style={{ color: 'var(--osrs-muted)' }}>Loading...</p>
            ) : submissions.length === 0 ? (
              <div style={s.empty}><p>No submissions for this tile yet.</p></div>
            ) : (
              submissions.map(sub => {
                if (sub.status === 'pending') {
                  return <SubmissionCard key={sub.id} sub={sub} onApprove={handleApprove} onReject={handleReject} showTeam={false} />;
                }
                return <HistoryCard key={sub.id} sub={sub} showTeam={false} />;
              })
            )}
          </>
        )}
      </div>
    </div>
    </div>
  );
}

// ─── My Team tab ─────────────────────────────────────────────────────────────
function MyTeamTab({ user }) {
  const [team, setTeam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [memberForm, setMemberForm] = useState({ osrs_name: '', discord_username: '' });
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await api.get('/teams/mine');
      setTeam(res.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function addMember() {
    if (!memberForm.osrs_name || !team) return;
    try {
      await api.post(`/teams/${team.id}/members`, memberForm);
      setMemberForm({ osrs_name: '', discord_username: '' });
      setMsg('Member added');
      setTimeout(() => setMsg(''), 3000);
      load();
    } catch (e) {
      setMsg(e.response?.data?.error || 'Error adding member');
      setTimeout(() => setMsg(''), 3000);
    }
  }

  async function removeMember(memberId) {
    await api.delete(`/teams/${team.id}/members/${memberId}`);
    load();
  }

  if (loading) return <p style={{ color: 'var(--osrs-muted)' }}>Loading…</p>;
  if (!team) return <div style={s.empty}><p>You are not assigned to a team.</p></div>;

  const th = { textAlign: 'left', color: 'var(--osrs-muted)', padding: '0.4rem 0.6rem', borderBottom: '1px solid var(--c-2d3748)', fontSize: '0.82rem' };
  const td = { padding: '0.4rem 0.6rem', color: 'var(--osrs-text)', borderBottom: '1px solid var(--c-1a1a2e)', fontSize: '0.85rem' };

  return (
    <div>
      <div style={{ marginBottom: '1rem' }}>
        <div style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--osrs-text)' }}>{team.name}</div>
        {team.discord_channel_id && (
          <div style={{ fontSize: '0.78rem', color: 'var(--osrs-muted)', marginTop: '0.2rem' }}>
            Discord channel: {team.discord_channel_id}
          </div>
        )}
      </div>

      <div className="osrs-card" style={s.card}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={th}>OSRS Name</th>
              <th style={th}>Discord Username</th>
              <th style={{ ...th, width: 80 }} />
            </tr>
          </thead>
          <tbody>
            {(team.members || []).map(m => (
              <tr key={m.id}>
                <td style={td}>{m.osrs_name}</td>
                <td style={{ ...td, color: 'var(--osrs-subtle)' }}>{m.discord_username || '—'}</td>
                <td style={td}>
                  <button className="osrs-stone osrs-stone--danger" style={s.rejectBtn} onClick={() => removeMember(m.id)}>Remove</button>
                </td>
              </tr>
            ))}
            <tr>
              <td style={{ padding: '0.4rem 0.6rem' }}>
                <input
                  style={{ ...s.rejectInput, flex: 'none', width: '100%' }}
                  placeholder="osrs name"
                  value={memberForm.osrs_name}
                  onChange={e => setMemberForm(f => ({ ...f, osrs_name: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && addMember()}
                />
              </td>
              <td style={{ padding: '0.4rem 0.6rem' }}>
                <input
                  style={{ ...s.rejectInput, flex: 'none', width: '100%' }}
                  placeholder="discord username (optional)"
                  value={memberForm.discord_username}
                  onChange={e => setMemberForm(f => ({ ...f, discord_username: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && addMember()}
                />
              </td>
              <td style={{ padding: '0.4rem 0.6rem' }}>
                <button className="osrs-stone osrs-stone--success" style={s.approveBtn} onClick={addMember}>Add</button>
              </td>
            </tr>
          </tbody>
        </table>
        {msg && <div style={{ fontSize: '0.82rem', color: 'var(--osrs-green)', padding: '0.4rem 0.6rem' }}>{msg}</div>}
      </div>
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function Captain() {
  const { user } = useAuth();
  const [tab, setTab] = useState('pending');

  const tabs = [
    { key: 'pending', label: 'Pending' },
    { key: 'history', label: 'History' },
    { key: 'by-tile', label: 'By Tile' },
    ...(user.role !== 'admin' ? [{ key: 'my-team', label: 'My Team' }] : []),
  ];

  return (
    <div style={s.page}>
      <h1 style={s.title}>Submissions</h1>

      <div style={s.tabs}>
        {tabs.map(t => (
          <button
            key={t.key}
            style={{ ...s.tab, ...(tab === t.key ? s.activeTab : {}) }}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'pending' && <PendingTab user={user} />}
      {tab === 'history' && <HistoryTab user={user} />}
      {tab === 'by-tile' && <ByTileTab user={user} />}
      {tab === 'my-team' && <MyTeamTab user={user} />}
    </div>
  );
}

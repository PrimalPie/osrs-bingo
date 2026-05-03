import React, { useEffect, useState, useCallback } from 'react';
import api from '../api';
import socket from '../socket';
import { useAuth } from '../App';
import { formatTarget } from '../utils';

const COLS = ['A','B','C','D','E','F','G','H','I'];
function coord(row, col) { return `${COLS[col-1]}${row}`; }

const s = {
  page: { padding: '1.5rem', maxWidth: 900, margin: '0 auto' },
  title: { fontSize: '1.3rem', fontWeight: 700, color: '#e94560', marginBottom: '0.25rem' },
  subtitle: { fontSize: '0.85rem', color: '#718096', marginBottom: '1rem' },
  tabs: { display: 'flex', gap: 0, marginBottom: '1.5rem', borderBottom: '2px solid #0f3460' },
  tab: {
    background: 'none', border: 'none', color: '#a0aec0',
    padding: '0.6rem 1.2rem', cursor: 'pointer', fontSize: '0.9rem',
    borderBottom: '2px solid transparent', marginBottom: -2,
  },
  activeTab: { color: '#e94560', borderBottomColor: '#e94560' },
  card: {
    background: '#16213e', border: '1px solid #0f3460', borderRadius: 8,
    padding: '1rem', marginBottom: '1rem',
  },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' },
  tileLabel: { fontWeight: 600, color: '#e2e8f0', fontSize: '0.95rem' },
  meta: { fontSize: '0.78rem', color: '#718096', marginTop: '0.2rem' },
  submittedBy: { fontSize: '0.8rem', color: '#a0aec0' },
  note: { fontSize: '0.82rem', color: '#cbd5e0', marginBottom: '0.75rem', fontStyle: 'italic' },
  img: { maxWidth: '100%', maxHeight: 320, borderRadius: 6, marginBottom: '0.75rem', border: '1px solid #2d3748' },
  actions: { display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' },
  approveBtn: {
    background: '#276749', border: 'none', color: '#fff',
    padding: '0.5rem 1.2rem', borderRadius: 4, cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem',
  },
  rejectBtn: {
    background: '#742a2a', border: 'none', color: '#fff',
    padding: '0.5rem 1.2rem', borderRadius: 4, cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem',
  },
  countInput: {
    background: '#0f3460', border: '1px solid #2d3748', color: '#e2e8f0',
    padding: '0.4rem 0.6rem', borderRadius: 4, width: 64, fontSize: '0.85rem',
  },
  rejectInput: {
    background: '#0f3460', border: '1px solid #2d3748', color: '#e2e8f0',
    padding: '0.4rem 0.6rem', borderRadius: 4, flex: 1, fontSize: '0.85rem',
  },
  select: {
    background: '#0f3460', border: '1px solid #2d3748', color: '#e2e8f0',
    padding: '0.4rem 0.6rem', borderRadius: 4, fontSize: '0.85rem',
  },
  empty: { textAlign: 'center', color: '#718096', padding: '3rem' },
  badge: {
    display: 'inline-block', padding: '0.15rem 0.5rem', borderRadius: 3,
    fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase',
  },
  tileBtn: {
    background: '#0f2040', border: '1px solid #2d3748', borderRadius: 6,
    padding: '0.6rem 0.8rem', cursor: 'pointer', textAlign: 'left', width: '100%', marginBottom: '0.4rem',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  },
  tileBtnActive: { borderColor: '#e94560', background: '#1a1030' },
};

function typeColor(type) {
  if (type === 'xp') return '#68d391';
  if (type === 'kc') return '#f6ad55';
  return '#63b3ed';
}

function statusColor(status) {
  if (status === 'approved') return '#68d391';
  if (status === 'rejected') return '#fc8181';
  return '#f6ad55';
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
        style={{ maxWidth: '95vw', maxHeight: '95vh', objectFit: 'contain', borderRadius: 6, boxShadow: '0 8px 40px rgba(0,0,0,0.8)' }}
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
  const [rejectReason, setRejectReason] = useState('');
  const [showReject, setShowReject] = useState(false);
  const [lightbox, setLightbox] = useState(false);
  const c = coord(sub.row, sub.col);

  return (
    <div style={s.card}>
      {lightbox && <Lightbox src={`/uploads/${sub.screenshot_path}`} onClose={() => setLightbox(false)} />}
      <div style={s.cardHeader}>
        <div>
          <div style={s.tileLabel}>
            <span style={{ color: '#718096', marginRight: 6 }}>{c}</span>
            {sub.tile_label}
            {showTeam && sub.team_name && (
              <span style={{ marginLeft: 8, fontSize: '0.78rem', color: sub.team_color || '#a0aec0' }}>
                [{sub.team_name}]
              </span>
            )}
          </div>
          <div style={s.meta}>
            <span style={{ ...s.badge, background: typeColor(sub.tile_type) + '33', color: typeColor(sub.tile_type) }}>
              {sub.tile_type}
            </span>
            {' '}Count: {sub.count}
          </div>
        </div>
        <div style={s.submittedBy}>
          by <strong style={{ color: '#e2e8f0' }}>{sub.submitted_by}</strong>
          <div style={{ fontSize: '0.72rem', color: '#4a5568' }}>
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

      <div style={s.actions}>
        <label style={{ fontSize: '0.8rem', color: '#a0aec0' }}>Count:</label>
        <input type="number" min={1} style={s.countInput} value={count} onChange={e => setCount(parseInt(e.target.value) || 1)} />
        <button style={s.approveBtn} onClick={() => onApprove(sub.id, count)}>✓ Approve</button>
        <button style={s.rejectBtn} onClick={() => setShowReject(v => !v)}>✗ Reject</button>
      </div>

      {showReject && (
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
          <input style={s.rejectInput} placeholder="Reason (optional)" value={rejectReason} onChange={e => setRejectReason(e.target.value)} />
          <button style={s.rejectBtn} onClick={() => onReject(sub.id, rejectReason)}>Confirm Reject</button>
        </div>
      )}
    </div>
  );
}

function HistoryCard({ sub, showTeam }) {
  const [lightbox, setLightbox] = useState(false);
  const c = coord(sub.row, sub.col);
  const approved = sub.status === 'approved';

  return (
    <div style={{ ...s.card, borderLeft: `3px solid ${statusColor(sub.status)}` }}>
      {lightbox && <Lightbox src={`/uploads/${sub.screenshot_path}`} onClose={() => setLightbox(false)} />}
      <div style={s.cardHeader}>
        <div>
          <div style={s.tileLabel}>
            <span style={{ ...s.badge, background: statusColor(sub.status) + '22', color: statusColor(sub.status), marginRight: 8 }}>
              {sub.status}
            </span>
            <span style={{ color: '#718096', marginRight: 6 }}>{c}</span>
            {sub.tile_label}
            {showTeam && sub.team_name && (
              <span style={{ marginLeft: 8, fontSize: '0.78rem', color: sub.team_color || '#a0aec0' }}>
                [{sub.team_name}]
              </span>
            )}
          </div>
          <div style={s.meta}>
            by <strong style={{ color: '#a0aec0' }}>{sub.submitted_by}</strong>
            {' · '}Count: {sub.count}
            {!approved && sub.rejection_reason && (
              <span style={{ color: '#fc8181', marginLeft: 6 }}>· {sub.rejection_reason}</span>
            )}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '0.72rem', color: '#4a5568' }}>
            Reviewed {sub.reviewed_at ? new Date(sub.reviewed_at).toLocaleString() : '—'}
          </div>
          {sub.screenshot_path && (
            <button
              style={{ ...s.tab, padding: '0.2rem 0.5rem', fontSize: '0.72rem', color: '#63b3ed', marginTop: 4 }}
              onClick={() => setLightbox(true)}
            >
              View screenshot
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

  async function handleApprove(id, count) {
    await api.post(`/submissions/${id}/approve`, { count });
    setSubmissions(p => p.filter(s => s.id !== id));
  }

  async function handleReject(id, reason) {
    await api.post(`/submissions/${id}/reject`, { reason });
    setSubmissions(p => p.filter(s => s.id !== id));
  }

  if (loading) return <p style={{ color: '#718096' }}>Loading...</p>;
  if (!user.team_id && user.role !== 'admin') return <p style={{ color: '#fc8181' }}>You are not assigned to a team.</p>;

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

  useEffect(() => {
    api.get('/submissions/history').then(r => { setHistory(r.data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const visible = filter === 'all' ? history : history.filter(s => s.status === filter);

  if (loading) return <p style={{ color: '#718096' }}>Loading...</p>;

  return (
    <>
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', alignItems: 'center' }}>
        <span style={{ fontSize: '0.82rem', color: '#718096' }}>Filter:</span>
        {['all', 'approved', 'rejected'].map(f => (
          <button key={f} style={{ ...s.tab, ...(filter === f ? s.activeTab : {}), padding: '0.3rem 0.8rem' }} onClick={() => setFilter(f)}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
        <span style={{ marginLeft: 'auto', fontSize: '0.8rem', color: '#718096' }}>{visible.length} record{visible.length !== 1 ? 's' : ''}</span>
      </div>
      {visible.length === 0
        ? <div style={s.empty}><p>No {filter === 'all' ? '' : filter} submissions found.</p></div>
        : visible.map(sub => <HistoryCard key={sub.id} sub={sub} showTeam={user.role === 'admin'} />)
      }
    </>
  );
}

// ─── By Tile tab ─────────────────────────────────────────────────────────────
function ByTileTab({ user }) {
  const [event, setEvent] = useState(null);
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
        if (!evRes.data) { setLoading(false); return; }
        const ev = evRes.data;
        setEvent(ev);
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

  async function handleApprove(id, count) {
    await api.post(`/submissions/${id}/approve`, { count });
    const r = await api.get(`/submissions/tile/${selectedTile.id}/team/${selectedTeamId}`);
    setSubmissions(r.data);
  }

  async function handleReject(id, reason) {
    await api.post(`/submissions/${id}/reject`, { reason });
    const r = await api.get(`/submissions/tile/${selectedTile.id}/team/${selectedTeamId}`);
    setSubmissions(r.data);
  }

  if (loading) return <p style={{ color: '#718096' }}>Loading...</p>;
  if (!event) return <div style={s.empty}><p>No active event.</p></div>;

  const teamForUser = user.role !== 'admin' ? teams.find(t => t.id === user.team_id) : null;

  return (
    <div style={{ display: 'flex', gap: '1.25rem' }}>
      {/* Tile list */}
      <div style={{ width: 220, flexShrink: 0 }}>
        <div style={{ fontSize: '0.78rem', color: '#718096', marginBottom: '0.5rem' }}>Select a tile</div>
        {tiles.length === 0 && <p style={{ color: '#718096', fontSize: '0.85rem' }}>No tiles set up yet.</p>}
        {tiles.map(tile => (
          <button
            key={tile.id}
            style={{ ...s.tileBtn, ...(selectedTile?.id === tile.id ? s.tileBtnActive : {}) }}
            onClick={() => setSelectedTile(tile)}
          >
            <span>
              <span style={{ color: '#718096', fontSize: '0.72rem', marginRight: 6 }}>{tile.coord}</span>
              <span style={{ fontSize: '0.82rem', color: '#e2e8f0' }}>{tile.label}</span>
            </span>
            <span style={{ ...s.badge, background: typeColor(tile.type) + '33', color: typeColor(tile.type) }}>{tile.type}</span>
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
              <div style={{ fontWeight: 700, color: '#e2e8f0', fontSize: '1rem' }}>
                {selectedTile.coord} — {selectedTile.label}
              </div>
              <div style={{ fontSize: '0.78rem', color: '#718096', marginBottom: '0.75rem' }}>
                {selectedTile.type} · Target: {formatTarget(selectedTile.type, selectedTile.target)}
              </div>

              {user.role === 'admin' ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.8rem', color: '#718096' }}>Team:</span>
                  <select style={s.select} value={selectedTeamId || ''} onChange={e => setSelectedTeamId(parseInt(e.target.value))}>
                    {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
              ) : (
                teamForUser && <span style={{ fontSize: '0.82rem', color: teamForUser.color }}>{teamForUser.name}</span>
              )}
            </div>

            {loadingSubs ? (
              <p style={{ color: '#718096' }}>Loading...</p>
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
  );
}

// ─── My Team tab ─────────────────────────────────────────────────────────────
function MyTeamTab({ user }) {
  const [team, setTeam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [memberForm, setMemberForm] = useState({ discord_username: '', osrs_name: '' });
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
    if (!memberForm.discord_username || !team) return;
    try {
      await api.post(`/teams/${team.id}/members`, memberForm);
      setMemberForm({ discord_username: '', osrs_name: '' });
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

  if (loading) return <p style={{ color: '#718096' }}>Loading…</p>;
  if (!team) return <div style={s.empty}><p>You are not assigned to a team.</p></div>;

  const th = { textAlign: 'left', color: '#718096', padding: '0.4rem 0.6rem', borderBottom: '1px solid #2d3748', fontSize: '0.82rem' };
  const td = { padding: '0.4rem 0.6rem', color: '#e2e8f0', borderBottom: '1px solid #1a1a2e', fontSize: '0.85rem' };

  return (
    <div>
      <div style={{ marginBottom: '1rem' }}>
        <div style={{ fontWeight: 700, fontSize: '1.1rem', color: team.color || '#e2e8f0' }}>{team.name}</div>
        {team.discord_channel_id && (
          <div style={{ fontSize: '0.78rem', color: '#718096', marginTop: '0.2rem' }}>
            Discord channel: {team.discord_channel_id}
          </div>
        )}
      </div>

      <div style={s.card}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={th}>Discord Username</th>
              <th style={th}>OSRS Name</th>
              <th style={{ ...th, width: 80 }} />
            </tr>
          </thead>
          <tbody>
            {(team.members || []).map(m => (
              <tr key={m.id}>
                <td style={td}>{m.discord_username}</td>
                <td style={{ ...td, color: '#a0aec0' }}>{m.osrs_name || '—'}</td>
                <td style={td}>
                  <button style={s.rejectBtn} onClick={() => removeMember(m.id)}>Remove</button>
                </td>
              </tr>
            ))}
            <tr>
              <td style={{ padding: '0.4rem 0.6rem' }}>
                <input
                  style={{ ...s.rejectInput, flex: 'none', width: '100%' }}
                  placeholder="discorduser"
                  value={memberForm.discord_username}
                  onChange={e => setMemberForm(f => ({ ...f, discord_username: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && addMember()}
                />
              </td>
              <td style={{ padding: '0.4rem 0.6rem' }}>
                <input
                  style={{ ...s.rejectInput, flex: 'none', width: '100%' }}
                  placeholder="osrs name (optional)"
                  value={memberForm.osrs_name}
                  onChange={e => setMemberForm(f => ({ ...f, osrs_name: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && addMember()}
                />
              </td>
              <td style={{ padding: '0.4rem 0.6rem' }}>
                <button style={s.approveBtn} onClick={addMember}>Add</button>
              </td>
            </tr>
          </tbody>
        </table>
        {msg && <div style={{ fontSize: '0.82rem', color: '#68d391', padding: '0.4rem 0.6rem' }}>{msg}</div>}
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

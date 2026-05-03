import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../App';

const s = {
  page: { display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', padding: '2rem' },
  box: { background: '#16213e', border: '1px solid #0f3460', borderRadius: 8, padding: '2rem', width: '100%', maxWidth: 380 },
  title: { fontSize: '1.3rem', fontWeight: 700, color: '#e94560', marginBottom: '1.5rem', textAlign: 'center' },
  label: { display: 'block', fontSize: '0.8rem', color: '#a0aec0', marginBottom: '0.3rem' },
  input: {
    width: '100%', background: '#0f3460', border: '1px solid #2d3748', color: '#e2e8f0',
    padding: '0.6rem 0.8rem', borderRadius: 4, fontSize: '0.9rem', marginBottom: '1rem',
  },
  btn: {
    width: '100%', background: '#e94560', border: 'none', color: '#fff',
    padding: '0.7rem', borderRadius: 4, fontSize: '0.95rem', fontWeight: 600, cursor: 'pointer',
    marginTop: '0.5rem',
  },
  error: { color: '#fc8181', fontSize: '0.85rem', marginBottom: '1rem', textAlign: 'center' },
  hint: { fontSize: '0.75rem', color: '#4a5568', marginTop: '1rem', textAlign: 'center' },
};

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/auth/login', form);
      login(res.data.token, res.data.user);
      navigate(res.data.user.role === 'admin' ? '/admin' : '/captain');
    } catch (e) {
      setError(e.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={s.page}>
      <div style={s.box}>
        <h1 style={s.title}>Login</h1>
        {error && <div style={s.error}>{error}</div>}
        <form onSubmit={handleSubmit}>
          <label style={s.label}>Username</label>
          <input
            style={s.input}
            value={form.username}
            onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
            autoFocus
          />
          <label style={s.label}>Password</label>
          <input
            type="password"
            style={s.input}
            value={form.password}
            onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
          />
          <button style={s.btn} disabled={loading}>{loading ? 'Logging in...' : 'Login'}</button>
        </form>
        <p style={s.hint}>No account yet? Ask the admin to create one for you.</p>
      </div>
    </div>
  );
}

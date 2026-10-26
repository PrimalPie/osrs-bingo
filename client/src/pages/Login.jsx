import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../App';
import Panel from '../components/osrs/Panel';
import Button from '../components/osrs/Button';
import { ui } from '../components/osrs/styles';

const s = {
  page: { display: 'flex', justifyContent: 'center', padding: '96px 16px 64px' },
  box: { width: '100%', maxWidth: 400 },
  inner: { padding: '21px 32px 32px' },
  field: { marginTop: 24 },
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
      <Panel variant="panel" style={s.box}>
        <div style={s.inner}>
          <h1 style={ui.title}>Login</h1>
          <p style={{ ...ui.body, marginTop: 8 }}>For team captains and admins.</p>
          {error && <p role="alert" style={{ ...ui.error, marginTop: 16 }}>{error}</p>}
          <form onSubmit={handleSubmit}>
            <div style={s.field}>
              <label htmlFor="login-username" style={ui.label}>Username</label>
              <input
                id="login-username"
                style={ui.input}
                value={form.username}
                onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                autoComplete="username"
                autoFocus
              />
            </div>
            <div style={s.field}>
              <label htmlFor="login-password" style={ui.label}>Password</label>
              <input
                id="login-password"
                type="password"
                style={ui.input}
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                autoComplete="current-password"
              />
            </div>
            <Button type="submit" disabled={loading} style={{ width: '100%', marginTop: 32 }}>
              {loading ? 'Logging in...' : 'Login'}
            </Button>
          </form>
          <p style={{ ...ui.body, marginTop: 24, fontSize: 16 }}>No account yet? Ask the admin to create one for you.</p>
        </div>
      </Panel>
    </div>
  );
}

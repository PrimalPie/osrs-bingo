import React, { createContext, useContext, useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, Navigate, useNavigate } from 'react-router-dom';
import api from './api';
import BoardPage from './pages/Board';
import LoginPage from './pages/Login';
import CaptainPage from './pages/Captain';
import AdminPage from './pages/Admin';
import ChangelogPage from './pages/Changelog';
import GeneratePage from './pages/Generate';

export const AuthContext = createContext(null);
export const ThemeContext = createContext({ beta: false, toggleBeta: () => {} });

export function useAuth() { return useContext(AuthContext); }
export function useTheme() { return useContext(ThemeContext); }

const styles = {
  nav: {
    display: 'flex', alignItems: 'center', gap: '1.5rem',
    background: '#16213e', padding: '0.75rem 1.5rem',
    borderBottom: '2px solid #0f3460',
  },
  navTitle: { color: '#e94560', fontWeight: 700, fontSize: '1.2rem', textDecoration: 'none' },
  navLink: { color: '#a0aec0', textDecoration: 'none', fontSize: '0.9rem' },
  navRight: { marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '1rem' },
  logoutBtn: {
    background: 'none', border: '1px solid #4a5568', color: '#a0aec0',
    padding: '0.3rem 0.8rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem',
  },
};

function Nav() {
  const { user, logout } = useAuth();
  const { beta, toggleBeta } = useTheme();
  return (
    <nav style={styles.nav}>
      <Link to="/" style={styles.navTitle}>⚔️ OSRS Bingo</Link>
      <Link to="/" style={styles.navLink}>Board</Link>
      {user && (user.role === 'captain' || user.role === 'admin') && (
        <Link to="/captain" style={styles.navLink}>Captain</Link>
      )}
      {user?.role === 'admin' && (
        <Link to="/admin" style={styles.navLink}>Admin</Link>
      )}
      {user?.role === 'admin' && (
        <Link to="/generate" style={styles.navLink}>Generate</Link>
      )}
      <Link to="/changelog" style={styles.navLink}>Changelog</Link>
      <div style={styles.navRight}>
        {user?.role === 'admin' && (
          <button
            onClick={toggleBeta}
            title={beta ? 'Switch to classic theme' : 'Preview beta theme'}
            style={{
              background: beta ? '#2d3748' : 'none',
              border: `1px solid ${beta ? '#68d391' : '#4a5568'}`,
              color: beta ? '#68d391' : '#4a5568',
              padding: '0.2rem 0.55rem',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.75rem',
              fontFamily: 'monospace',
              letterSpacing: '0.05em',
            }}
          >β</button>
        )}
        {user ? (
          <>
            <span style={{ color: '#68d391', fontSize: '0.85rem' }}>{user.username} ({user.role})</span>
            <button style={styles.logoutBtn} onClick={logout}>Logout</button>
          </>
        ) : (
          <Link to="/login" style={styles.navLink}>Login</Link>
        )}
      </div>
    </nav>
  );
}

function ProtectedRoute({ children, role }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role && !(role === 'captain' && user.role === 'admin')) {
    return <Navigate to="/" replace />;
  }
  return children;
}

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [beta, setBeta] = useState(() => localStorage.getItem('beta-theme') === 'true');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      api.get('/auth/me')
        .then(r => setUser(r.data))
        .catch(() => localStorage.removeItem('token'))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    document.body.classList.toggle('beta-theme', beta);
    localStorage.setItem('beta-theme', String(beta));
  }, [beta]);

  function toggleBeta() { setBeta(b => !b); }

  function login(token, userData) {
    localStorage.setItem('token', token);
    setUser(userData);
  }

  function logout() {
    localStorage.removeItem('token');
    setUser(null);
  }

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>;

  return (
    <ThemeContext.Provider value={{ beta, toggleBeta }}>
    <AuthContext.Provider value={{ user, login, logout }}>
      <BrowserRouter>
        <Nav />
        <Routes>
          <Route path="/" element={<BoardPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/captain" element={
            <ProtectedRoute role="captain"><CaptainPage /></ProtectedRoute>
          } />
          <Route path="/admin" element={
            <ProtectedRoute role="admin"><AdminPage /></ProtectedRoute>
          } />
          <Route path="/changelog" element={<ChangelogPage />} />
          <Route path="/generate" element={
            <ProtectedRoute role="admin"><GeneratePage /></ProtectedRoute>
          } />
        </Routes>
      </BrowserRouter>
    </AuthContext.Provider>
    </ThemeContext.Provider>
  );
}

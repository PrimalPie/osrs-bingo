import React, { createContext, useContext, useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import api from './api';
import HomePage from './pages/Home';
import LoginPage from './pages/Login';
import CaptainPage from './pages/Captain';
import AdminPage from './pages/Admin';
import ChangelogPage from './pages/Changelog';
import GeneratePage from './pages/Generate';
import SiteHeader from './components/osrs/SiteHeader';

export const AuthContext = createContext(null);

export function useAuth() { return useContext(AuthContext); }

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
    <AuthContext.Provider value={{ user, login, logout }}>
      <BrowserRouter>
        <SiteHeader />
        <Routes>
          <Route path="/" element={<HomePage />} />
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
  );
}

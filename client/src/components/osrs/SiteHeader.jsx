import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../App';
import Panel, { OSRS, FONT } from './Panel';
import logo from '../../assets/ui/logo.png';
import '../../styles/osrs.css';

const s = {
  header: { height: 65, margin: 16, minWidth: 0 },
  row: { display: 'flex', alignItems: 'stretch', height: '100%', padding: '0 1px' },
  brand: {
    display: 'flex', alignItems: 'center', gap: 10, padding: '0 22px 0 23px',
    color: '#fff', textDecoration: 'none', fontFamily: FONT.bold, fontSize: 18, lineHeight: 1, whiteSpace: 'nowrap',
  },
  divider: { width: 1, background: OSRS.divider, margin: '2px 0' },
  group: { display: 'flex', alignItems: 'stretch', gap: 17, padding: '0 24px' },
  label: { display: 'flex', alignItems: 'center', color: OSRS.muted, fontFamily: FONT.bold, fontSize: 18, lineHeight: 1 },
  link: {
    position: 'relative', display: 'flex', alignItems: 'center',
    background: 'none', border: 'none', padding: 0, cursor: 'pointer',
    color: OSRS.orange, textDecoration: 'none', fontFamily: FONT.bold, fontSize: 18, lineHeight: 1, whiteSpace: 'nowrap',
  },
  underline: { position: 'absolute', left: 0, right: 0, bottom: 1, height: 6, background: OSRS.orange },
};

function NavItem({ to, onClick, active, children }) {
  const content = (
    <>
      {children}
      {active && <span aria-hidden style={s.underline} />}
    </>
  );
  if (to) {
    return <Link to={to} className="osrs-link" style={s.link} aria-current={active ? 'page' : undefined}>{content}</Link>;
  }
  return <button type="button" onClick={onClick} className="osrs-link" style={s.link}>{content}</button>;
}

export default function SiteHeader({ title = 'Iron Empire Bingo' }) {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();

  return (
    <Panel as="header" variant="panel" style={s.header}>
      <div className="osrs-header-row" style={s.row}>
        <Link to="/" style={s.brand}>
          <img src={logo} alt="" width={32} height={32} style={{ imageRendering: 'pixelated' }} />
          {title}
        </Link>
        <div style={s.divider} />
        <div style={s.group}>
          <NavItem to="/" active={pathname === '/'}>Board</NavItem>
          {user && (user.role === 'captain' || user.role === 'admin') && (
            <NavItem to="/captain" active={pathname === '/captain'}>Captain</NavItem>
          )}
          {user?.role === 'admin' && <NavItem to="/admin" active={pathname === '/admin'}>Admin</NavItem>}
          {user?.role === 'admin' && <NavItem to="/generate" active={pathname === '/generate'}>Generate</NavItem>}
          <NavItem to="/changelog" active={pathname === '/changelog'}>Changelog</NavItem>
        </div>

        <div style={{ flex: 1 }} />
        <div style={s.divider} />
        <div style={s.group}>
          {user ? (
            <>
              <span style={{ ...s.label, color: '#fff' }}>{user.username}</span>
              <NavItem onClick={logout}>Logout</NavItem>
            </>
          ) : (
            <NavItem to="/login" active={pathname === '/login'}>Login</NavItem>
          )}
        </div>
      </div>
    </Panel>
  );
}

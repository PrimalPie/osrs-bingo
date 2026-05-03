import React, { useEffect, useState } from 'react';
import api from '../api';

const typeColors = {
  feature:     { bg: '#276749', text: '#9ae6b4' },
  fix:         { bg: '#742a2a', text: '#feb2b2' },
  improvement: { bg: '#2c5282', text: '#90cdf4' },
};

const s = {
  page:    { padding: '1.5rem', maxWidth: 760, margin: '0 auto' },
  title:   { fontSize: '1.5rem', fontWeight: 700, color: '#e94560', marginBottom: '0.25rem' },
  sub:     { fontSize: '0.85rem', color: '#718096', marginBottom: '2rem' },
  group:   { marginBottom: '2.5rem' },
  dateBar: {
    display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem',
  },
  dateText: { fontSize: '0.88rem', fontWeight: 700, color: '#a0aec0', whiteSpace: 'nowrap' },
  dateLine: { flex: 1, height: 1, background: '#1e2a3a' },
  entry:   { display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '0.55rem 0', borderBottom: '1px solid #1a1a2e' },
  badge:   { flexShrink: 0, padding: '0.15rem 0.55rem', borderRadius: 3, fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 2 },
  desc:    { fontSize: '0.88rem', color: '#e2e8f0', lineHeight: 1.55 },
};

export default function Changelog() {
  const [data, setData] = useState([]);

  useEffect(() => {
    api.get('/audit/changelog').then(r => setData(r.data)).catch(() => {});
  }, []);

  return (
    <div style={s.page}>
      <h1 style={s.title}>Changelog</h1>
      <p style={s.sub}>A record of all features, fixes, and improvements.</p>

      {data.map(group => (
        <div key={group.date} style={s.group}>
          <div style={s.dateBar}>
            <span style={s.dateText}>{new Date(group.date + 'T12:00:00').toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</span>
            <div style={s.dateLine} />
          </div>
          {group.entries.map((entry, i) => {
            const colors = typeColors[entry.type] || typeColors.improvement;
            return (
              <div key={i} style={s.entry}>
                <span style={{ ...s.badge, background: colors.bg, color: colors.text }}>
                  {entry.type}
                </span>
                <span style={s.desc}>{entry.description}</span>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

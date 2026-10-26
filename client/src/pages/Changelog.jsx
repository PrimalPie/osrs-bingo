import React, { useEffect, useState } from 'react';
import api from '../api';
import Panel, { OSRS, FONT } from '../components/osrs/Panel';
import { ui } from '../components/osrs/styles';

const typeColors = {
  feature: 'var(--osrs-green)',
  fix: 'var(--osrs-red)',
  improvement: 'var(--osrs-blue)',
};

const typeOrder = { feature: 0, improvement: 1, fix: 2 };

const s = {
  page: { ...ui.page, maxWidth: 760 + 32 },
  group: { marginTop: 32 },
  date: { fontFamily: FONT.bold, fontSize: 18, lineHeight: 1, color: OSRS.rank, padding: '16px 24px' },
  entry: {
    display: 'grid', gridTemplateColumns: '112px 1fr', gap: 16, alignItems: 'baseline',
    padding: '12px 24px', borderTop: '1px solid var(--osrs-border)',
  },
  badge: { fontFamily: FONT.bold, fontSize: 16, lineHeight: 1, textTransform: 'uppercase' },
  desc: { fontFamily: FONT.plain, fontSize: 18, lineHeight: 1.25, color: '#fff' },
};

export default function Changelog() {
  const [data, setData] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    api.get('/audit/changelog')
      .then(r => setData(r.data))
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  return (
    <main style={s.page}>
      <h1 style={ui.title}>Changelog</h1>
      <p style={ui.sub}>A record of all features, fixes, and improvements.</p>

      {loaded && data.length === 0 && <p style={{ ...ui.body, marginTop: 32 }}>Nothing here yet.</p>}

      {data.map(group => (
        <Panel key={group.date} variant="panel" style={s.group}>
          <h2 style={{ ...s.date, fontWeight: 400 }}>
            {new Date(group.date + 'T12:00:00').toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
          </h2>
          {[...group.entries].sort((a, b) => (typeOrder[a.type] ?? 9) - (typeOrder[b.type] ?? 9)).map((entry, i) => (
            <div key={i} style={s.entry}>
              <span style={{ ...s.badge, color: typeColors[entry.type] || typeColors.improvement }}>{entry.type}</span>
              <span style={s.desc}>{entry.description}</span>
            </div>
          ))}
          <div style={{ height: 8 }} />
        </Panel>
      ))}
    </main>
  );
}

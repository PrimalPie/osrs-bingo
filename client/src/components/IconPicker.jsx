import React, { useState, useEffect, useRef } from 'react';
import api from '../api';
import ItemSearch from './ItemSearch';

const s = {
  label: { fontSize: '0.78rem', color: '#718096', display: 'block', marginBottom: '0.4rem' },
  grid: { display: 'flex', flexWrap: 'wrap', gap: '0.3rem', maxHeight: 200, overflowY: 'auto', padding: '0.25rem 0' },
  iconBtn: {
    background: '#0f3460', border: '2px solid transparent', borderRadius: 4,
    cursor: 'pointer', padding: '0.3rem', display: 'flex', flexDirection: 'column',
    alignItems: 'center', gap: '0.2rem', transition: 'border-color 0.15s', minWidth: 50,
  },
  iconBtnActive: { borderColor: '#e94560' },
  iconBtnHover: { borderColor: '#4a5568' },
  icon: { width: 32, height: 32, objectFit: 'contain', imageRendering: 'pixelated' },
  placeholder: { width: 32, height: 32, background: '#1a2a3a', borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', color: '#4a5568' },
  name: { fontSize: '0.52rem', color: '#a0aec0', textAlign: 'center', lineHeight: 1.2, maxWidth: 50, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' },
  filter: { background: '#0f3460', border: '1px solid #2d3748', color: '#e2e8f0', padding: '0.4rem 0.6rem', borderRadius: 4, fontSize: '0.82rem', width: '100%', marginBottom: '0.5rem' },
  previewRow: { display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.6rem' },
  previewImg: { width: 32, height: 32, objectFit: 'contain', imageRendering: 'pixelated', border: '1px solid #2d3748', borderRadius: 4, background: '#0a0a1a' },
  previewName: { fontSize: '0.8rem', color: '#e2e8f0', flex: 1 },
  clearBtn: { background: 'none', border: '1px solid #2d3748', color: '#718096', padding: '0.25rem 0.5rem', borderRadius: 4, cursor: 'pointer', fontSize: '0.75rem' },
  loading: { fontSize: '0.8rem', color: '#718096', padding: '0.5rem 0' },
};

function IconGrid({ entries, value, onChange, filterable }) {
  const [filter, setFilter] = useState('');
  const [hovered, setHovered] = useState(null);

  const visible = filter
    ? entries.filter(e => e.name.toLowerCase().includes(filter.toLowerCase()) || e.keywords?.some(k => k.includes(filter.toLowerCase())))
    : entries;

  return (
    <>
      {filterable && (
        <input style={s.filter} placeholder="Filter…" value={filter} onChange={e => setFilter(e.target.value)} />
      )}
      <div style={s.grid}>
        {visible.map(entry => (
          <button
            key={entry.name}
            type="button"
            title={entry.name}
            style={{
              ...s.iconBtn,
              ...(value === entry.icon ? s.iconBtnActive : {}),
              ...(hovered === entry.name && value !== entry.icon ? s.iconBtnHover : {}),
            }}
            onMouseEnter={() => setHovered(entry.name)}
            onMouseLeave={() => setHovered(null)}
            onClick={() => onChange(value === entry.icon ? null : entry.icon)}
          >
            {entry.icon
              ? <img src={entry.icon} alt={entry.name} style={s.icon} onError={e => { e.target.style.opacity = 0.3; }} />
              : <div style={s.placeholder}>?</div>
            }
            <span style={s.name}>{entry.name}</span>
          </button>
        ))}
        {visible.length === 0 && <span style={{ fontSize: '0.8rem', color: '#718096', padding: '0.5rem' }}>No results</span>}
      </div>
    </>
  );
}

function useIconList(endpoint) {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const pollRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchAndMaybeRepoll() {
      try {
        const res = await api.get(endpoint);
        if (cancelled) return;
        setList(res.data);
        setLoading(false);
        // If some icons are still null, poll again in 3s (caching in progress)
        const hasNulls = res.data.some(e => !e.icon);
        if (hasNulls) {
          pollRef.current = setTimeout(fetchAndMaybeRepoll, 3000);
        }
      } catch {
        if (!cancelled) setLoading(false);
      }
    }

    fetchAndMaybeRepoll();
    return () => { cancelled = true; clearTimeout(pollRef.current); };
  }, [endpoint]);

  return { list, loading };
}

export default function IconPicker({ type, value, label, onChange }) {
  const { list: bossList, loading: bossLoading } = useIconList('/bosses');
  const { list: skillList, loading: skillLoading } = useIconList('/skills');

  const activeList = type === 'xp' ? skillList : type === 'kc' ? bossList : [];
  const selectedEntry = activeList.find(e => e.icon === value) || null;

  // Auto-suggest: best keyword match in the current list
  const suggestion = useSuggestion(type, label, bossList, skillList);
  const showSuggestion = suggestion && suggestion.icon && suggestion.icon !== value && !value;

  return (
    <div>
      <label style={s.label}>
        Icon
        {value && (
          <button type="button" style={{ ...s.clearBtn, marginLeft: '0.5rem', display: 'inline' }} onClick={() => onChange(null)}>
            ✕ clear
          </button>
        )}
      </label>

      {value && (
        <div style={s.previewRow}>
          <img src={value} alt="selected" style={s.previewImg} onError={e => { e.target.style.display = 'none'; }} />
          <span style={s.previewName}>{selectedEntry?.name || 'Custom'}</span>
        </div>
      )}

      {showSuggestion && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', padding: '0.4rem 0.6rem', background: '#0f2a1e', border: '1px solid #276749', borderRadius: 4 }}>
          <img src={suggestion.icon} alt={suggestion.name} style={{ width: 24, height: 24, objectFit: 'contain', imageRendering: 'pixelated' }} onError={e => { e.target.style.display = 'none'; }} />
          <span style={{ fontSize: '0.8rem', color: '#68d391', flex: 1 }}>Suggested: <strong>{suggestion.name}</strong></span>
          <button type="button" style={{ ...s.clearBtn, borderColor: '#276749', color: '#68d391' }} onClick={() => onChange(suggestion.icon)}>
            Use this
          </button>
        </div>
      )}

      {type === 'xp' && (
        skillLoading
          ? <div style={s.loading}>Loading skill icons…</div>
          : <IconGrid entries={skillList} value={value} onChange={onChange} filterable={false} />
      )}

      {type === 'kc' && (
        bossLoading
          ? <div style={s.loading}>Loading boss icons…</div>
          : <IconGrid entries={bossList} value={value} onChange={onChange} filterable={true} />
      )}

      {type === 'drop' && (
        <ItemSearch value={value} onChange={onChange} />
      )}
    </div>
  );
}

// Exported helper for auto-suggest (used by TileModal)
export function useSuggestion(type, label, bossList, skillList) {
  if (!label) return null;
  const l = label.toLowerCase();
  const list = type === 'xp' ? skillList : type === 'kc' ? bossList : [];
  if (!list.length) return null;
  const sorted = [...list].sort((a, b) =>
    Math.max(...(b.keywords || []).map(k => k.length), 0) -
    Math.max(...(a.keywords || []).map(k => k.length), 0)
  );
  return sorted.find(e => (e.keywords || []).some(k => l.includes(k))) || null;
}

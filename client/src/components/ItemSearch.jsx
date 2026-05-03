import React, { useState, useEffect, useRef } from 'react';
import api from '../api';

const s = {
  wrap: { position: 'relative' },
  row: { display: 'flex', alignItems: 'center', gap: '0.5rem' },
  input: {
    flex: 1,
    background: '#0f3460', border: '1px solid #2d3748', color: '#e2e8f0',
    padding: '0.5rem 0.7rem', borderRadius: 4, fontSize: '0.85rem',
  },
  preview: {
    width: 32, height: 32, objectFit: 'contain',
    imageRendering: 'pixelated', flexShrink: 0,
    border: '1px solid #2d3748', borderRadius: 4, background: '#0a0a1a',
  },
  clearBtn: {
    background: 'none', border: '1px solid #2d3748', color: '#718096',
    padding: '0.3rem 0.5rem', borderRadius: 4, cursor: 'pointer', fontSize: '0.75rem', flexShrink: 0,
  },
  dropdown: {
    position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 200,
    background: '#16213e', border: '1px solid #0f3460', borderRadius: 4,
    maxHeight: 240, overflowY: 'auto', marginTop: 2,
    boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
  },
  item: {
    display: 'flex', alignItems: 'center', gap: '0.6rem',
    padding: '0.4rem 0.6rem', cursor: 'pointer', fontSize: '0.85rem', color: '#e2e8f0',
  },
  itemHover: { background: '#0f3460' },
  itemIcon: { width: 28, height: 28, objectFit: 'contain', imageRendering: 'pixelated', flexShrink: 0 },
  noResults: { padding: '0.6rem', fontSize: '0.82rem', color: '#718096', textAlign: 'center' },
  loading: { padding: '0.6rem', fontSize: '0.82rem', color: '#718096', textAlign: 'center' },
};

export default function ItemSearch({ value, onChange }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState(null);
  const debounceRef = useRef(null);
  const wrapRef = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function handleQueryChange(e) {
    const q = e.target.value;
    setQuery(q);
    setOpen(true);
    clearTimeout(debounceRef.current);
    if (!q.trim()) { setResults([]); setLoading(false); return; }
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await api.get(`/items/search?q=${encodeURIComponent(q)}`);
        setResults(res.data);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
  }

  function selectItem(item) {
    onChange(item.icon);
    setQuery('');
    setResults([]);
    setOpen(false);
  }

  function clearIcon() {
    onChange(null);
  }

  return (
    <div style={s.wrap} ref={wrapRef}>
      <div style={s.row}>
        {value && (
          <img src={value} alt="icon" style={s.preview} onError={e => e.target.style.display = 'none'} />
        )}
        <input
          style={s.input}
          value={query}
          onChange={handleQueryChange}
          onFocus={() => query && setOpen(true)}
          placeholder={value ? 'Search to change icon…' : 'Search item (e.g. Dragon platelegs)'}
        />
        {value && (
          <button style={s.clearBtn} onClick={clearIcon} type="button" title="Remove icon">✕</button>
        )}
      </div>

      {open && (query.trim().length >= 2) && (
        <div style={s.dropdown}>
          {loading && <div style={s.loading}>Searching…</div>}
          {!loading && results.length === 0 && <div style={s.noResults}>No items found</div>}
          {!loading && results.map(item => (
            <div
              key={item.id}
              style={{ ...s.item, ...(hovered === item.id ? s.itemHover : {}) }}
              onMouseEnter={() => setHovered(item.id)}
              onMouseLeave={() => setHovered(null)}
              onMouseDown={() => selectItem(item)}
            >
              <img
                src={item.icon}
                alt={item.name}
                style={s.itemIcon}
                onError={e => { e.target.style.opacity = 0.3; }}
              />
              <span>{item.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

import { OSRS, FONT } from './Panel';

// Shared style objects for OSRS-themed pages (same idiom as the pages' inline `s` objects).
export const ui = {
  page: { maxWidth: 1122 + 32, margin: '0 auto', padding: '48px 16px 64px' },
  title: { fontFamily: FONT.quill, fontSize: 40, lineHeight: 1, color: OSRS.orange, fontWeight: 400 },
  sub: { marginTop: 8, fontFamily: FONT.bold, fontSize: 18, lineHeight: 1, color: OSRS.muted },
  label: { display: 'block', fontFamily: FONT.bold, fontSize: 18, lineHeight: 1, color: OSRS.muted, marginBottom: 8 },
  input: {
    width: '100%', height: 40, padding: '0 12px',
    background: 'var(--osrs-sunken)', border: '1px solid var(--osrs-border)', color: '#fff',
    fontFamily: FONT.plain, fontSize: 18,
  },
  error: { fontFamily: FONT.bold, fontSize: 18, lineHeight: 1.2, color: 'var(--osrs-red)' },
  body: { fontFamily: FONT.plain, fontSize: 18, lineHeight: 1.2, color: OSRS.muted },
};

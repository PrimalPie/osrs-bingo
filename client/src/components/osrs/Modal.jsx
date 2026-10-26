import React, { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import Panel, { OSRS, FONT } from './Panel';
import { CloseButton } from './Button';

export const modalTitle = {
  fontFamily: FONT.quill, fontSize: 40, lineHeight: 1, color: OSRS.orange, fontWeight: 400,
};

// Freezes page scrolling without removing the scrollbar (which would shift the page sideways):
// the body is pinned at its current offset and, if the page had a scrollbar, it stays visible.
function lockScroll() {
  const html = document.documentElement;
  const { body } = document;
  const scrollY = window.scrollY;
  const hadScrollbar = window.innerWidth > html.clientWidth;
  const prev = { htmlOverflowY: html.style.overflowY, position: body.style.position, top: body.style.top, width: body.style.width };

  if (hadScrollbar) html.style.overflowY = 'scroll';
  body.style.position = 'fixed';
  body.style.top = `-${scrollY}px`;
  body.style.width = '100%';

  return () => {
    html.style.overflowY = prev.htmlOverflowY;
    body.style.position = prev.position;
    body.style.top = prev.top;
    body.style.width = prev.width;
    window.scrollTo(0, scrollY);
  };
}

// Centered OSRS panel over a 75% black overlay. Closes on Escape, overlay click or the close button.
export default function Modal({ title, onClose, children }) {
  const titleId = useId();
  const closeRef = useRef(null);

  useEffect(() => {
    const prevFocus = document.activeElement;
    closeRef.current?.focus();
    const onKey = e => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const unlockScroll = lockScroll();
    return () => {
      document.removeEventListener('keydown', onKey);
      unlockScroll();
      prevFocus?.focus?.();
    };
  }, [onClose]);

  return createPortal(
    <div
      onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0, 0, 0, 0.75)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, overflowY: 'auto',
      }}
    >
      <Panel
        variant="panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        style={{ width: 496, maxWidth: '100%', margin: 'auto' }}
      >
        <div style={{ padding: '21px 32px 32px' }}>
          <CloseButton ref={closeRef} onClick={onClose} style={{ position: 'absolute', top: 12, right: 12 }} />
          <h2 id={titleId} style={{ ...modalTitle, display: 'flex', alignItems: 'center', gap: 10, paddingRight: 24 }}>
            {title}
          </h2>
          {children}
        </div>
      </Panel>
    </div>,
    document.body
  );
}

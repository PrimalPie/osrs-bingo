import React from 'react';
import tile01 from '../../assets/ui/9-slice/tile-01.png';
import tile01Selected from '../../assets/ui/9-slice/tile-01-selected.png';
import tile02 from '../../assets/ui/9-slice/tile-02.png';
import panel from '../../assets/ui/9-slice/panel.png';
import btn from '../../assets/ui/9-slice/btn.png';
import btnMinimal from '../../assets/ui/9-slice/btn-minimal.png';

export const OSRS = {
  pageBg: '#241f19',
  orange: '#fe971f',
  muted: '#9d9488',
  rank: '#9c8e7c',
  divider: '#726451',
  barFill: '#2edb45',
};

export const FONT = {
  bold: "'RuneScape Bold', monospace",
  plain: "'RuneScape Plain', monospace",
  quill: "'RuneScape Quill', serif",
};

// 41x41 9-slice sheets: 10px corners, the 21px middle strips are tiled.
export const SKINS = {
  default: tile01,      // tiles and standings rows
  highlight: tile01Selected,
  complete: tile02,
  panel,                // menu bar, modals, login and other surfaces
  btn,
  btnMinimal,
};

export const SLICE = 10;

export function nineSlice(src) {
  return {
    borderStyle: 'solid',
    borderColor: 'transparent',
    borderWidth: SLICE,
    borderImage: `url(${src}) ${SLICE} fill / ${SLICE}px repeat`,
    imageRendering: 'pixelated',
  };
}

// OSRS-style box drawn from a 9-slice sheet. The skin sits behind the content so
// children keep the full box for layout.
export default function Panel({ variant = 'default', as: Tag = 'div', className, style, children, ...rest }) {
  return (
    <Tag className={className} style={{ position: 'relative', ...style }} {...rest}>
      <div
        aria-hidden
        className="osrs-panel-fill"
        style={{ position: 'absolute', inset: 0, pointerEvents: 'none', ...nineSlice(SKINS[variant]) }}
      />
      <div style={{ position: 'relative', height: '100%' }}>{children}</div>
    </Tag>
  );
}

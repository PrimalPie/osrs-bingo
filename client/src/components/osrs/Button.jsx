import React, { forwardRef } from 'react';
import { OSRS, FONT, SKINS, nineSlice } from './Panel';
import closeX from '../../assets/ui/close-x.svg';

// `skin="stone"` (btn) for actions; `skin="minimal"` (btn-minimal) for small chrome like the close button.
const SKIN_SRC = { stone: SKINS.btn, minimal: SKINS.btnMinimal };

const Button = forwardRef(function Button({ skin = 'stone', children, style, className = '', type = 'button', ...rest }, ref) {
  return (
    <button
      ref={ref}
      type={type}
      className={`osrs-button ${className}`}
      style={{
        position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        minHeight: 48, padding: '0 16px', border: 'none', background: 'none', cursor: 'pointer',
        color: OSRS.orange, fontFamily: FONT.bold, fontSize: 18, lineHeight: 1, whiteSpace: 'nowrap',
        ...style,
      }}
      {...rest}
    >
      <span
        aria-hidden
        className="osrs-nine-slice"
        style={{ position: 'absolute', inset: 0, pointerEvents: 'none', ...nineSlice(SKIN_SRC[skin]) }}
      />
      <span style={{ position: 'relative' }}>{children}</span>
    </button>
  );
});

export default Button;

export const CloseButton = forwardRef(function CloseButton({ style, ...rest }, ref) {
  return (
    <Button ref={ref} skin="minimal" aria-label="Close" style={{ width: 24, minHeight: 24, height: 24, padding: 0, ...style }} {...rest}>
      <img src={closeX} alt="" width={8} height={8} style={{ display: 'block' }} />
    </Button>
  );
});

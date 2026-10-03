import type { CSSProperties } from 'react';

/**
 * Flourish — the signature Waract divider: a central lotus sigil (an
 * eight-point star set in a tilted square) flanked by a vine of petals
 * that fades into the void. Crowns and closes every card and panel.
 */
export function Flourish({
  width = 320,
  color = 'var(--border-ornament)',
  flip = false,
  style,
}: {
  width?: number | string;
  color?: string;
  flip?: boolean;
  style?: CSSProperties;
}) {
  const petal = (
    <svg width="7" height="9" viewBox="0 0 3.279 3.827" fill={color} aria-hidden="true">
      <path d="M 0.054 0 C -0.025 0.289 -0.017 0.594 0.075 0.878 C 0.168 1.163 0.342 1.414 0.576 1.6 C 1.493 2.068 2.201 2.862 2.56 3.827 C 2.56 3.827 3.813 2.957 3.012 2.018 C 2.212 1.078 0.75 1.357 0.054 0 Z" />
    </svg>
  );
  const vine = (dir: 'l' | 'r') => (
    <div
      style={{
        position: 'relative',
        flex: 1,
        height: 1,
        background: `linear-gradient(${dir === 'l' ? '90deg' : '270deg'}, transparent, ${color} 88%)`,
        opacity: 0.55,
      }}
    >
      <div
        style={{
          position: 'absolute',
          right: dir === 'l' ? 0 : 'auto',
          left: dir === 'r' ? 0 : 'auto',
          top: -4,
          transform: dir === 'l' ? 'none' : 'scaleX(-1)',
        }}
      >
        {petal}
      </div>
    </div>
  );
  return (
    <div
      role="presentation"
      style={{ display: 'flex', alignItems: 'center', width, transform: flip ? 'scaleY(-1)' : 'none', ...style }}
    >
      {vine('l')}
      <div style={{ position: 'relative', width: 26, height: 26, flex: '0 0 auto', margin: '0 10px' }}>
        <div
          style={{ position: 'absolute', inset: 4, transform: 'rotate(45deg)', boxShadow: `inset 0 0 0 1px ${color}`, opacity: 0.5 }}
        />
        <svg width="26" height="26" viewBox="0 0 17.455 17.455" fill={color} style={{ position: 'absolute', inset: 0 }} aria-hidden="true">
          <path d="M 8.727 0 L 10.687 6.03 L 17.027 6.03 L 11.898 9.757 L 13.857 15.788 L 8.727 12.061 L 3.598 15.788 L 5.557 9.757 L 0.427 6.03 L 6.768 6.03 L 8.727 0 Z" />
        </svg>
      </div>
      {vine('r')}
    </div>
  );
}

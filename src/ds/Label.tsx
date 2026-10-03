import type { CSSProperties, ReactNode } from 'react';

const COLORS = {
  primary: 'var(--text-primary)',
  secondary: 'var(--text-secondary)',
  muted: 'var(--text-muted)',
  faint: 'var(--graphite-400)',
  ash: 'var(--ash)',
  ink: 'var(--text-on-light)',
  fire: 'var(--fire-ember)',
  ice: 'var(--ice-frost)',
  arcane: 'var(--arcane-lit)',
  flux: 'var(--flux-ink)',
} as const;

/**
 * Label — the micro-typographic voice of Waract. Jura, uppercase,
 * widely tracked. Used for every functional caption.
 */
export function Label({
  children,
  size = 'micro',
  color = 'primary',
  track = 'ultra',
  style,
  className,
}: {
  children: ReactNode;
  size?: 'nano' | 'micro' | 'label' | 'ui';
  color?: keyof typeof COLORS;
  track?: 'wide' | 'ultra';
  style?: CSSProperties;
  className?: string;
}) {
  const fs = { nano: '10px', micro: 'var(--fs-micro)', label: 'var(--fs-label)', ui: 'var(--fs-ui)' }[size];
  const tracking = track === 'wide' ? 'var(--track-wide)' : 'var(--track-ultra)';
  return (
    <span
      className={className}
      style={{
        fontFamily: 'var(--font-ui)',
        fontWeight: 400,
        fontSize: fs,
        letterSpacing: tracking,
        lineHeight: 1,
        textTransform: 'uppercase',
        color: COLORS[color],
        display: 'inline-block',
        textIndent: tracking,
        ...style,
      }}
    >
      {children}
    </span>
  );
}

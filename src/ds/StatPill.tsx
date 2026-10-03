import type { CSSProperties, ReactNode } from 'react';

/** StatPill — a bone-framed inverted readout (label + value). */
export function StatPill({ label, value, style }: { label: string; value?: ReactNode; style?: CSSProperties }) {
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        minWidth: 96,
        height: 33,
        padding: '0 14px',
        background: 'var(--bone)',
        boxShadow: 'var(--shadow-frame)',
        outline: '4px solid var(--void)',
        ...style,
      }}
    >
      <span
        style={{
          fontFamily: 'var(--font-condensed)',
          fontSize: 'var(--fs-ui)',
          letterSpacing: 'var(--track-wide)',
          textTransform: 'uppercase',
          color: 'var(--text-on-light)',
          lineHeight: 1,
          textIndent: 'var(--track-wide)',
        }}
      >
        {label}
      </span>
      {value != null && (
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: 'var(--text-on-light)', lineHeight: 1 }}>{value}</span>
      )}
    </div>
  );
}

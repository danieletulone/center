import type { CSSProperties } from 'react';

export const STAR8 =
  'M 8.727 0 L 10.687 6.03 L 17.027 6.03 L 11.898 9.757 L 13.857 15.788 L 8.727 12.061 L 3.598 15.788 L 5.557 9.757 L 0.427 6.03 L 6.768 6.03 L 8.727 0 Z';

/** StarRating — a row of eight-point stars (rank / progress). */
export function StarRating({
  value = 3,
  max = 3,
  size = 18,
  color = 'var(--graphite-600)',
  gap = 10,
  style,
}: {
  value?: number;
  max?: number;
  size?: number;
  color?: string;
  gap?: number;
  style?: CSSProperties;
}) {
  return (
    <div role="img" aria-label={`${value} of ${max}`} style={{ display: 'flex', alignItems: 'center', gap, ...style }}>
      {Array.from({ length: max }).map((_, i) => (
        <svg key={i} width={size} height={size} viewBox="0 0 17.455 17.455" fill={i < value ? color : 'none'} aria-hidden="true">
          <path d={STAR8} stroke={i < value ? 'none' : 'var(--graphite-700)'} strokeWidth={i < value ? 0 : 1} />
        </svg>
      ))}
    </div>
  );
}

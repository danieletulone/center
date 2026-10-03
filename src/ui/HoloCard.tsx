'use client';
import { useRef, type CSSProperties, type ReactNode } from 'react';
import styles from './HoloCard.module.css';

/**
 * HoloCard — pointer-tracked 3D tilt with a moving glare and (for
 * Genesis) an iridescent foil sheen. Purely presentational.
 */
export function HoloCard({
  children,
  foil = false,
  intensity = 1,
  className,
  style,
  onClick,
  onContextMenu,
  onMouseEnter,
  ariaLabel,
}: {
  children: ReactNode;
  foil?: boolean;
  intensity?: number;
  className?: string;
  style?: CSSProperties;
  onClick?: () => void;
  onContextMenu?: (e: React.MouseEvent) => void;
  onMouseEnter?: () => void;
  ariaLabel?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const move = (e: React.PointerEvent) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    el.style.setProperty('--mx', `${x * 100}%`);
    el.style.setProperty('--my', `${y * 100}%`);
    el.style.setProperty('--ry', `${(x - 0.5) * 18 * intensity}deg`);
    el.style.setProperty('--rx', `${(0.5 - y) * 14 * intensity}deg`);
    el.style.setProperty('--glare', '1');
  };
  const leave = () => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty('--ry', '0deg');
    el.style.setProperty('--rx', '0deg');
    el.style.setProperty('--glare', '0');
  };
  return (
    <div
      ref={ref}
      className={[styles.holo, foil ? styles.foil : '', className].filter(Boolean).join(' ')}
      style={style}
      onPointerMove={move}
      onPointerLeave={leave}
      onClick={onClick}
      onContextMenu={onContextMenu}
      onMouseEnter={onMouseEnter}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={ariaLabel}
      onKeyDown={(e) => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <div className={styles.inner}>
        {children}
        <div className={styles.glare} aria-hidden="true" />
        {foil && <div className={styles.sheen} aria-hidden="true" />}
      </div>
    </div>
  );
}

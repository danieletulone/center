import type { ButtonHTMLAttributes, ReactNode } from 'react';
import styles from './Button.module.css';

const TINT = {
  bone: 'var(--bone)',
  fire: 'var(--fire-ember)',
  ice: 'var(--ice-frost)',
  arcane: 'var(--arcane-lit)',
  flux: 'var(--flux-core)',
} as const;

export type ButtonColor = keyof typeof TINT;

/**
 * Button — the game's call to act. Two forms:
 *   • 'text'  → a tracked Jura label over an angular cut underline (NEXT).
 *   • 'frame' → a bone-framed tile for primary, weighty choices.
 */
export function Button({
  children,
  variant = 'text',
  color = 'bone',
  size = 'ui',
  disabled,
  className,
  ...rest
}: {
  children: ReactNode;
  variant?: 'text' | 'frame';
  color?: ButtonColor;
  size?: 'ui' | 'label';
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  const tint = disabled ? 'var(--text-disabled)' : TINT[color];
  const cls = [styles.btn, variant === 'frame' ? styles.frame : styles.text, size === 'label' ? styles.small : '', className]
    .filter(Boolean)
    .join(' ');
  return (
    <button type="button" disabled={disabled} className={cls} style={{ ['--tint' as string]: tint }} {...rest}>
      <span className={styles.label}>{children}</span>
      {variant === 'text' && (
        <svg className={styles.cut} width="104" height="13" viewBox="0 0 104 13" aria-hidden="true">
          <path d="M 0 12 L 72 12 L 88 1 L 104 1" fill="none" stroke="currentColor" strokeWidth="1.4" />
        </svg>
      )}
    </button>
  );
}

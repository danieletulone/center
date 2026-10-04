import type { CSSProperties, ReactNode } from 'react';
import type { Temperament } from '@/game/types';
import { Flourish } from './Flourish';
import { CardGlyph } from './CardGlyph';

export const TEMPER_LABEL: Record<Temperament, string> = {
  ascendant: 'Ascendant',
  malefic: 'Malefic',
  tempered: 'Tempered',
};

/** Temperament glyph — upward triad, downward triad, or poised diamond. */
export function TemperamentMark({ temperament, size = 16 }: { temperament: Temperament; size?: number }) {
  const halo = { filter: 'drop-shadow(0 0 10px rgba(255,255,255,0.45))' };
  if (temperament === 'tempered') {
    return (
      <svg width={size} height={size} viewBox="0 0 30 30" style={halo} aria-hidden="true">
        <rect x="15" y="2" width="18.4" height="18.4" transform="rotate(45 15 15)" fill="none" stroke="var(--bone)" strokeWidth="1.1" />
        <rect x="15" y="9" width="8.5" height="8.5" transform="rotate(45 15 15)" fill="var(--bone)" opacity="0.9" />
      </svg>
    );
  }
  const up = temperament !== 'malefic';
  return (
    <svg width={size} height={size} viewBox="0 0 30 30" style={halo} aria-hidden="true">
      <polygon points={up ? '4,26 15,4 26,26' : '4,4 26,4 15,26'} fill="none" stroke="var(--bone)" strokeWidth="1.1" />
      <polygon points={up ? '11,22 15,12 19,22' : '11,8 19,8 15,18'} fill="var(--bone)" opacity="0.9" />
    </svg>
  );
}

function Block({ label, children, ink, s }: { label: string; children: ReactNode; ink?: string; s: number }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontFamily: 'var(--font-ui)', fontSize: 8.5 * s, letterSpacing: '0.32em', textTransform: 'uppercase', color: ink || 'var(--graphite-400)', marginBottom: 4 * s }}>
        {label}
      </div>
      <div style={{ fontFamily: 'var(--font-ui)', fontSize: 11.5 * s, letterSpacing: '0.015em', lineHeight: 1.45, color: ink || 'var(--ash)', textWrap: 'pretty' }}>{children}</div>
    </div>
  );
}

export interface GenesisCardProps {
  temperament: Temperament;
  icon: string;
  title: string;
  trigger: string;
  effect: string;
  selfCost?: string;
  width?: number;
  style?: CSSProperties;
  className?: string;
  /** localized face labels */
  labels?: { genesis: string; temperament: string; trigger: string; effect: string; selfCost: string };
}

/**
 * GenesisCard — the "eureka" card. Not in any deck; it materialises when
 * its trigger is met. Double bone frame, temperament glyph, and
 * trigger / effect / self-cost blocks.
 */
export function GenesisCard({ temperament, icon, title, trigger, effect, selfCost, width = 300, style, className, labels }: GenesisCardProps) {
  const s = width / 300;
  const L = labels ?? { genesis: 'Genesis', temperament: TEMPER_LABEL[temperament], trigger: 'Trigger', effect: 'Effect', selfCost: 'Self-Cost' };
  return (
    <div
      className={className}
      style={{
        position: 'relative',
        width,
        aspectRatio: '0.66',
        background: 'var(--surface-card)',
        boxShadow: 'var(--shadow-genesis)',
        borderRadius: 'var(--radius-card)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: `${30 * s}px ${30 * s}px ${26 * s}px`,
        overflow: 'hidden',
        userSelect: 'none',
        ...style,
      }}
    >
      <div style={{ textAlign: 'center', lineHeight: 1 }}>
        <div style={{ fontFamily: 'var(--font-ui)', fontSize: 9 * s, letterSpacing: '0.5em', textTransform: 'uppercase', color: 'var(--graphite-400)', textIndent: '0.5em' }}>
          {L.genesis}
        </div>
        <div style={{ marginTop: 7 * s, display: 'flex', justifyContent: 'center' }}>
          <TemperamentMark temperament={temperament} size={16 * s} />
        </div>
        <div style={{ marginTop: 7 * s, fontFamily: 'var(--font-ui)', fontSize: 11 * s, letterSpacing: '0.36em', textTransform: 'uppercase', color: 'var(--bone)', textIndent: '0.36em' }}>
          {L.temperament}
        </div>
      </div>
      <div style={{ marginTop: 12 * s, width: '80%' }}>
        <Flourish width="100%" color="var(--graphite-500)" />
      </div>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 70 * s }}>
        <CardGlyph icon={icon} mono size={width * 0.28} />
      </div>
      <div
        style={{
          fontFamily: 'var(--font-condensed)',
          fontSize: 32 * s,
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          color: 'var(--bone)',
          lineHeight: 1,
          textAlign: 'center',
          textIndent: '0.16em',
          textShadow: `0 0 ${16 * s}px rgba(255,255,255,0.35)`,
        }}
      >
        {title}
      </div>
      <div style={{ marginTop: 12 * s, display: 'flex', flexDirection: 'column', gap: 9 * s, width: '100%' }}>
        <Block label={L.trigger} s={s}>{trigger}</Block>
        <Block label={L.effect} s={s}>{effect}</Block>
        {selfCost ? (
          <Block label={L.selfCost} ink="var(--fire-ember)" s={s}>
            {selfCost}
          </Block>
        ) : null}
      </div>
      <div style={{ marginTop: 'auto', paddingTop: 10 * s, width: '80%' }}>
        <Flourish width="100%" color="var(--graphite-500)" flip />
      </div>
    </div>
  );
}

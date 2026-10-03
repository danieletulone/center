import type { CSSProperties } from 'react';
import type { Cost, Element } from '@/game/types';
import { Flourish } from './Flourish';
import { ElementOrb } from './ElementOrb';
import { CardGlyph } from './CardGlyph';

export const INK: Record<Element, string> = {
  fire: '#a31212',
  ice: 'var(--ice-frost)',
  arcane: '#9b2cf0',
  flux: 'var(--flux-ink)',
};

const PIP_GLOW: Record<string, string> = {
  fire: 'var(--fire-core)',
  ice: 'var(--ice-frost)',
  arcane: 'var(--arcane-core)',
  flux: 'var(--flux-frost)',
};

export function CostPips({ cost, scale = 1, size = 12 }: { cost: Cost[]; scale?: number; size?: number }) {
  if (!cost.length || cost[0].el === 'free') {
    return (
      <span style={{ fontFamily: 'var(--font-ui)', fontSize: 10 * scale, letterSpacing: '0.28em', textTransform: 'uppercase', color: 'var(--graphite-400)' }}>
        Free
      </span>
    );
  }
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 * scale }}>
      {cost.map((c, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 3 * scale }}>
          <span style={{ fontFamily: 'var(--font-ui)', fontSize: 13 * scale, letterSpacing: '0.04em', color: 'var(--bone)', lineHeight: 1 }}>{c.n}</span>
          <span
            aria-hidden="true"
            style={{
              display: 'inline-flex',
              boxShadow: c.el === 'any' ? undefined : `0 0 5px ${PIP_GLOW[c.el]}`,
              borderRadius: c.el === 'fire' ? '50%' : 0,
              lineHeight: 0,
            }}
          >
            <ElementOrb element={c.el} size={size * scale} />
          </span>
        </div>
      ))}
    </div>
  );
}

export interface PlayCardProps {
  element: Element;
  icon: string;
  title: string;
  category: string;
  cost: Cost[];
  effect: string;
  tags?: string[];
  width?: number;
  style?: CSSProperties;
  className?: string;
}

/**
 * PlayCard — a functional CENTER play card: cost pips, crown flourish,
 * the element-lit glyph in its starburst, the carved title, keyword
 * tags and the rules effect.
 */
export function PlayCard({ element, icon, title, category, cost, effect, tags = [], width = 300, style, className }: PlayCardProps) {
  const s = width / 300;
  return (
    <div
      className={className}
      style={{
        position: 'relative',
        width,
        aspectRatio: '0.66',
        background: 'var(--surface-card)',
        boxShadow: 'var(--shadow-panel)',
        borderRadius: 'var(--radius-card)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: `${20 * s}px ${22 * s}px ${18 * s}px`,
        overflow: 'hidden',
        userSelect: 'none',
        ...style,
      }}
    >
      <div style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 * s }}>
        <span
          style={{
            fontFamily: 'var(--font-ui)',
            fontSize: 9.5 * s,
            letterSpacing: '0.3em',
            textTransform: 'uppercase',
            color: 'var(--graphite-400)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {category}
        </span>
        <CostPips cost={cost} scale={s} />
      </div>
      <div style={{ marginTop: 12 * s, width: '88%' }}>
        <Flourish width="100%" />
      </div>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', minHeight: 100 * s }}>
        <CardGlyph icon={icon} element={element} size={width * 0.34} rays strokeWidth={5} />
      </div>
      <div
        style={{
          fontFamily: 'var(--font-condensed)',
          fontSize: 30 * s,
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          color: INK[element],
          lineHeight: 1,
          textAlign: 'center',
          textIndent: '0.16em',
          textShadow: `0 0 ${14 * s}px ${INK[element]}55`,
        }}
      >
        {title}
      </div>
      {tags.length > 0 && (
        <div style={{ marginTop: 9 * s, display: 'flex', gap: 6 * s, justifyContent: 'center', flexWrap: 'wrap' }}>
          {tags.map((t) => (
            <span
              key={t}
              style={{
                fontFamily: 'var(--font-ui)',
                fontSize: 8.5 * s,
                letterSpacing: '0.26em',
                textTransform: 'uppercase',
                color: 'var(--ash)',
                padding: `${3 * s}px ${7 * s}px`,
                boxShadow: 'inset 0 0 0 1px var(--border-ornament)',
              }}
            >
              {t}
            </span>
          ))}
        </div>
      )}
      <div
        style={{
          marginTop: 11 * s,
          minHeight: 46 * s,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'var(--font-ui)',
          fontSize: 12 * s,
          letterSpacing: '0.015em',
          lineHeight: 1.5,
          color: 'var(--ash)',
          textAlign: 'center',
          textWrap: 'pretty',
        }}
      >
        {effect}
      </div>
      <div style={{ marginTop: 6 * s, width: '88%' }}>
        <Flourish width="100%" flip />
      </div>
    </div>
  );
}

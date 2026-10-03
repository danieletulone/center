'use client';
import { useId, type CSSProperties } from 'react';
import type { CostElement } from '@/game/types';

const STAR16 =
  'M 15 0 L 16.771 9.551 L 23.817 2.865 L 19.635 11.632 L 29.266 10.365 L 20.729 15 L 29.266 19.635 L 19.635 18.368 L 23.817 27.135 L 16.771 20.449 L 15 30 L 13.229 20.449 L 6.183 27.135 L 10.365 18.368 L 0.734 19.635 L 9.271 15 L 0.734 10.365 L 10.365 11.632 L 6.183 2.865 L 13.229 9.551 L 15 0 Z';

export function Rays({ size, scale = 3, opacity = 0.5 }: { size: number; scale?: number; opacity?: number }) {
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute',
        left: '50%',
        top: '50%',
        width: size * scale,
        height: size * scale,
        transform: 'translate(-50%, -50%)',
        borderRadius: '50%',
        background: 'repeating-conic-gradient(from 0deg, var(--graphite-600) 0deg 0.35deg, transparent 0.35deg 4deg)',
        WebkitMaskImage: 'radial-gradient(circle, transparent 28%, #000 34%, #000 60%, transparent 72%)',
        maskImage: 'radial-gradient(circle, transparent 28%, #000 34%, #000 60%, transparent 72%)',
        opacity,
        pointerEvents: 'none',
      }}
    />
  );
}

/**
 * ElementOrb — the four element sigils:
 *   fire → molten sphere · ice → 16-point frost star
 *   arcane → tilted violet rune-square · flux → four-point silver spark
 * 'any' renders a hollow bone lozenge.
 */
export function ElementOrb({
  element = 'fire',
  size = 120,
  rays = false,
  style,
}: {
  element?: CostElement;
  size?: number;
  rays?: boolean;
  style?: CSSProperties;
}) {
  const id = useId().replace(/:/g, '');
  let sigil;
  if (element === 'fire') {
    sigil = (
      <div
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          background: 'radial-gradient(circle at 36% 30%, #ff6a3d 0%, #b91c1c 22%, var(--fire-core) 56%, #2a0606 88%, #140303 100%)',
          boxShadow: 'var(--glow-fire)',
        }}
      />
    );
  } else if (element === 'ice') {
    sigil = (
      <svg width={size} height={size} viewBox="0 0 30 30" style={{ filter: 'drop-shadow(0 0 6px rgba(0,117,255,0.65))', overflow: 'visible' }} aria-hidden="true">
        <defs>
          <linearGradient id={`ice${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#bcdcff" />
            <stop offset="35%" stopColor="var(--ice-core)" />
            <stop offset="100%" stopColor="rgba(30,30,30,0.1)" />
          </linearGradient>
        </defs>
        <path d={STAR16} fill={`url(#ice${id})`} stroke="var(--ice-frost)" strokeWidth="0.6" />
      </svg>
    );
  } else if (element === 'flux') {
    sigil = (
      <svg width={size} height={size} viewBox="0 0 30 30" style={{ filter: 'drop-shadow(0 0 6px rgba(220,228,240,0.7))', overflow: 'visible' }} aria-hidden="true">
        <defs>
          <radialGradient id={`flux${id}`} cx="50%" cy="42%" r="62%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="58%" stopColor="var(--flux-core)" />
            <stop offset="100%" stopColor="rgba(120,130,145,0.12)" />
          </radialGradient>
        </defs>
        <path d="M 15 0 L 18 12 L 30 15 L 18 18 L 15 30 L 12 18 L 0 15 L 12 12 Z" fill={`url(#flux${id})`} stroke="var(--flux-frost)" strokeWidth="0.4" />
      </svg>
    );
  } else if (element === 'arcane') {
    sigil = (
      <div
        style={{
          width: size * 0.72,
          height: size * 0.72,
          transform: 'rotate(45deg)',
          background: 'linear-gradient(180deg, rgba(236,198,255,0.55) 0%, var(--arcane-haze) 30%, rgba(124,1,200,0.05) 70%, var(--arcane-core) 100%)',
          boxShadow: 'var(--glow-arcane-box)',
        }}
      />
    );
  } else {
    sigil = (
      <div
        style={{
          width: size * 0.7,
          height: size * 0.7,
          transform: 'rotate(45deg)',
          boxShadow: 'inset 0 0 0 1px var(--graphite-400), 0 0 6px rgba(255,255,255,0.15)',
        }}
      />
    );
  }
  return (
    <div style={{ position: 'relative', width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto', ...style }}>
      {rays ? <Rays size={size} /> : null}
      <div style={{ position: 'relative', zIndex: 1, display: 'flex' }}>{sigil}</div>
    </div>
  );
}

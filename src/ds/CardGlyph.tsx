import type { CSSProperties } from 'react';
import { GLOW, GLYPHS, GRAD, maskURI } from './glyphs';
import { Rays } from './ElementOrb';

const maskCache = new Map<string, string>();
function cachedMask(icon: string, sw: number) {
  const k = `${icon}|${sw}`;
  let m = maskCache.get(k);
  if (!m) {
    m = maskURI(GLYPHS[icon] || GLYPHS.ballFire, sw);
    maskCache.set(k, m);
  }
  return m;
}

/**
 * CardGlyph — a card's monoline sigil, never a flat colour: the shape
 * MASKS the element gradient (molten / frost / violet / silver) and
 * carries the element glow. `mono` paints it in bone (Genesis).
 */
export function CardGlyph({
  icon = 'ballFire',
  element = 'fire',
  size = 120,
  rays = false,
  mono = false,
  strokeWidth = 5,
  animated = false,
  style,
}: {
  icon?: string;
  element?: string;
  size?: number;
  rays?: boolean;
  mono?: boolean;
  strokeWidth?: number;
  animated?: boolean;
  style?: CSSProperties;
}) {
  const key = mono ? 'mono' : element in GRAD ? element : 'fire';
  const mask = cachedMask(icon, strokeWidth);
  return (
    <div style={{ position: 'relative', width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto', ...style }}>
      {rays ? <Rays size={size} scale={2.7} opacity={0.45} /> : null}
      <div style={{ position: 'relative', zIndex: 1, filter: GLOW[key], animation: animated ? 'wa-breathe 3.6s var(--ease-veil) infinite' : undefined }}>
        <div
          aria-hidden="true"
          style={{
            width: size,
            height: size,
            background: GRAD[key],
            backgroundSize: animated ? '160% 160%' : undefined,
            WebkitMaskImage: mask,
            maskImage: mask,
            WebkitMaskSize: 'contain',
            maskSize: 'contain',
            WebkitMaskRepeat: 'no-repeat',
            maskRepeat: 'no-repeat',
            WebkitMaskPosition: 'center',
            maskPosition: 'center',
          }}
        />
      </div>
    </div>
  );
}

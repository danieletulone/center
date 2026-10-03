/* Glyph library ported verbatim from the Waract design system (components/game/CardGlyph.jsx). */
/* ---- element gradients (CSS backgrounds, echoing ElementOrb) ---- */
export const GRAD: Record<string, string> = {
  fire: 'radial-gradient(circle at 38% 30%, #ff8a5c 0%, #e0431f 30%, #9a0b0b 60%, #4a0606 100%)',
  ice: 'linear-gradient(150deg, #dcebff 0%, #6fb1ff 34%, #0a78ff 74%, #053a7a 100%)',
  arcane: 'radial-gradient(circle at 40% 30%, #ecc6ff 0%, #c06bff 30%, #8a17d4 64%, #3a0a5e 100%)',
  flux: 'radial-gradient(circle at 42% 32%, #ffffff 0%, #eef2f7 34%, #aab6c4 74%, #5a636f 100%)',
  any: 'radial-gradient(circle at 42% 32%, #ffffff 0%, #e3e3e3 38%, #b0b0b0 78%, #6f6f6f 100%)',
  free: 'linear-gradient(150deg, #9a9a9a 0%, #6a6a6a 60%, #3c3c3c 100%)',
  mono: 'radial-gradient(circle at 42% 30%, #ffffff 0%, #f2f2f2 36%, #c4c4c4 72%, #7a7a7a 100%)',
};

export const GLOW: Record<string, string> = {
  fire: 'drop-shadow(0 0 7px rgba(224,67,31,0.65)) drop-shadow(0 0 16px rgba(117,0,0,0.5))',
  ice: 'drop-shadow(0 0 7px rgba(111,177,255,0.6)) drop-shadow(0 0 16px rgba(0,117,255,0.4))',
  arcane: 'drop-shadow(0 0 8px rgba(176,92,255,0.6)) drop-shadow(0 0 18px rgba(124,0,200,0.5))',
  flux: 'drop-shadow(0 0 7px rgba(220,228,240,0.6)) drop-shadow(0 0 16px rgba(150,162,176,0.4))',
  any: 'drop-shadow(0 0 6px rgba(217,217,217,0.45))',
  free: 'drop-shadow(0 0 4px rgba(120,120,120,0.4))',
  mono: 'drop-shadow(0 0 8px rgba(255,255,255,0.55)) drop-shadow(0 0 18px rgba(255,255,255,0.25))',
};

/* ---- string builders for the white-ink alpha matte ---- */
const R = (v: number) => Math.round(v * 100) / 100;
const P = (cx: number, cy: number, ang: number, rad: number): [number, number] => [cx + rad * Math.cos(ang), cy + rad * Math.sin(ang)];
const ringS = (n: number, fn: (a: number, i: number) => string) => [...Array(n)].map((_, i) => fn((i / n) * Math.PI * 2, i)).join('');

const ln = (x1: number, y1: number, x2: number, y2: number, sw?: number) =>
  `<line x1="${R(x1)}" y1="${R(y1)}" x2="${R(x2)}" y2="${R(y2)}"${sw ? ` stroke-width="${sw}"` : ''}/>`;
const lnD = (x1: number, y1: number, x2: number, y2: number, d: string) =>
  `<line x1="${R(x1)}" y1="${R(y1)}" x2="${R(x2)}" y2="${R(y2)}" stroke-dasharray="${d}"/>`;
const pl = (pts: string, sw?: number) => `<polyline points="${pts}" fill="none"${sw ? ` stroke-width="${sw}"` : ''}/>`;
const pg = (pts: string, filled?: boolean) =>
  `<polygon points="${pts}"${filled ? ' fill="#fff" stroke="none"' : ' fill="none"'}/>`;
const ci = (cx: number, cy: number, r: number, filled?: boolean) =>
  `<circle cx="${cx}" cy="${cy}" r="${r}"${filled ? ' fill="#fff" stroke="none"' : ' fill="none"'}/>`;
const ciD = (cx: number, cy: number, r: number, d: string) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke-dasharray="${d}"/>`;
const rc = (x: number, y: number, w: number, h: number, rx?: number) => `<rect x="${x}" y="${y}" width="${w}" height="${h}"${rx ? ` rx="${rx}"` : ''} fill="none"/>`;
const rcF = (x: number, y: number, w: number, h: number) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#fff" stroke="none"/>`;
const pa = (d: string, filled?: boolean, dash?: string) =>
  `<path d="${d}"${filled ? ' fill="#fff" stroke="none"' : ' fill="none"'}${dash ? ` stroke-dasharray="${dash}"` : ''}/>`;
const ell = (cx: number, cy: number, rx: number, ry: number, rot?: number) =>
  `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="none"${rot ? ` transform="rotate(${rot} ${cx} ${cy})"` : ''}/>`;

/* ---- the glyph library: name -> SVG inner markup (white ink) ---- */
export const GLYPHS: Record<string, string> = {
  /* ===================== OFFENSIVE / fire ===================== */
  ballFire: ci(50, 50, 28, true),
  explosive:
    ringS(8, (a) => { const [x1, y1] = P(50, 50, a, 14); const [x2, y2] = P(50, 50, a, 42); return ln(x1, y1, x2, y2); }) +
    ringS(8, (a) => { const g = a + Math.PI / 8; const [x1, y1] = P(50, 50, g, 12); const [x2, y2] = P(50, 50, g, 27); return ln(x1, y1, x2, y2); }) +
    ci(50, 50, 9, true),
  salvo:
    ln(20, 32, 68, 32) + pl('58,24 72,32 58,40') +
    ln(20, 50, 74, 50) + pl('64,42 78,50 64,58') +
    ln(20, 68, 68, 68) + pl('58,60 72,68 58,76'),
  cinder:
    pa('M50 66 C 36 56, 58 46, 47 30 C 66 42, 64 60, 50 66 Z', true) +
    ci(28, 68, 4, true) + ci(73, 62, 3.2, true) + ci(64, 80, 2.6, true),
  overheat:
    rc(42, 14, 16, 46, 8) + ci(50, 72, 13, true) + ln(50, 40, 50, 66) + ln(62, 24, 70, 24) + ln(62, 34, 70, 34),
  plasmaLance:
    ln(22, 80, 70, 32) + pg('78,24 62,30 70,38', true) + ln(26, 70, 36, 80),
  backdraft:
    pa('M72 44 A 24 24 0 1 1 42 28', false) + pl('42,16 41,30 54,30') + ci(50, 50, 5, true),
  detonator:
    rc(34, 46, 32, 28, 2) + ln(50, 46, 50, 26) + ln(36, 26, 64, 26) +
    pa('M62 22 l8 -10 l-2 9 l8 -3 l-9 8 Z', true),
  searingMark:
    ci(50, 50, 22, false) + ln(50, 16, 50, 30) + ln(50, 70, 50, 84) + ln(16, 50, 30, 50) + ln(70, 50, 84, 50) + ci(50, 50, 6, true),
  chainFire: rc(22, 40, 32, 20, 10) + rc(46, 40, 32, 20, 10),
  pyre:
    pl('24,76 50,32 76,76') + ln(33, 76, 67, 76) +
    pa('M50 56 C 42 48, 58 42, 50 30 C 62 42, 58 52, 50 56 Z', true),
  sunder: ln(18, 50, 42, 50) + pl('42,50 47,36 53,64 58,50') + ln(58, 50, 82, 50),

  /* ===================== DEFENSIVE / arcane ===================== */
  purpleWall:
    rc(24, 30, 52, 40) + ln(24, 43, 76, 43) + ln(24, 57, 76, 57) +
    ln(50, 30, 50, 43) + ln(37, 43, 37, 57) + ln(63, 43, 63, 57) + ln(50, 57, 50, 70),
  magnius: pl('22,72 22,42 60,42') + pl('50,32 64,42 50,52') + pl('30,64 22,72 14,64'),
  bulwark: pa('M50 16 L78 26 V50 C78 68 64 80 50 86 C36 80 22 68 22 50 V26 Z', false),
  anchor:
    ci(50, 22, 7, false) + ln(50, 29, 50, 78) + ln(36, 40, 64, 40) +
    pa('M24 56 C 26 76, 44 82, 50 78', false) + pa('M76 56 C 74 76, 56 82, 50 78', false),
  mirror:
    lnD(50, 16, 50, 84, '6 6') + ln(18, 50, 42, 50) + pl('30,40 18,50 30,60') + ln(58, 50, 82, 50) + pl('70,40 82,50 70,60'),
  ward: pg('50,16 80,33 80,67 50,84 20,67 20,33', false) + ci(50, 50, 9, false),
  staticField:
    pg('50,30 66,39 66,61 50,70 34,61 34,39', false) +
    ln(50, 30, 50, 16) + ln(66, 39, 80, 31) + ln(66, 61, 80, 69) + ln(50, 70, 50, 84) + ln(34, 61, 20, 69) + ln(34, 39, 20, 31),
  phase: ci(43, 50, 22, false) + ciD(59, 50, 22, '5 6'),
  reinforce:
    pa('M50 18 L76 27 V49 C76 65 64 76 50 82 C36 76 24 65 24 49 V27 Z', false) +
    ln(50, 38, 50, 62) + ln(38, 50, 62, 50),
  aegis:
    pa('M50 24 L72 32 V49 C72 62 62 72 50 78 C38 72 28 62 28 49 V32 Z', false) +
    ln(50, 10, 50, 20) + ln(19, 20, 27, 28) + ln(81, 20, 73, 28) + ln(50, 40, 50, 58),
  counterweight:
    ln(50, 20, 50, 34) + ln(22, 34, 78, 34) +
    pa('M14 34 L30 34 L22 52 Z', false) + pa('M66 34 L86 34 L76 48 Z', false) +
    ln(40, 74, 60, 74) + ln(50, 34, 50, 74),

  /* ===================== SPEED · PULL / flux ===================== */
  laser: ci(22, 50, 6, true) + ln(28, 50, 72, 50) + pl('64,42 80,50 64,58'),
  accelerate: pl('30,30 52,50 30,70') + pl('52,30 74,50 52,70'),
  slipstream:
    pa('M18 40 C 44 40, 52 40, 70 40', false) + pa('M18 60 C 40 60, 54 60, 66 60', false) + pl('62,32 80,40 62,48'),
  momentum: ln(40, 50, 74, 50) + pl('64,40 78,50 64,60') + ln(20, 40, 30, 40) + ln(16, 50, 28, 50) + ln(20, 60, 30, 60),
  vault: pa('M22 72 C 30 26, 70 26, 78 72', false) + pl('70,60 78,74 86,60') + ln(18, 80, 82, 80),
  tether: ci(24, 34, 6, false) + ci(76, 66, 6, false) + ln(28, 38, 72, 62) + ci(50, 50, 5, true),
  surge: ln(50, 82, 50, 24) + pl('34,40 50,20 66,40') + ln(34, 74, 38, 64) + ln(66, 74, 62, 64),
  drift: pa('M22 66 C 40 66, 38 36, 60 36', false) + pl('52,28 64,36 54,46'),
  lockstep: rc(44, 48, 32, 22, 2) + pa('M51 48 V42 a9 9 0 0 1 18 0 V48', false) + ln(14, 59, 40, 59) + pl('33,52 43,59 33,66'),
  finalPush: ln(16, 56, 58, 56, 9) + pl('48,42 66,56 48,70', 9) + ln(76, 20, 76, 74) + rcF(76, 22, 16, 14),

  /* ===================== CONTROL / ice ===================== */
  ice: pg('50,14 70,34 62,80 38,80 30,34', false) + ln(50, 14, 50, 80) + ln(30, 34, 70, 34),
  freeze:
    ringS(3, (a) => { const [x1, y1] = P(50, 50, a, 34); const [x2, y2] = P(50, 50, a + Math.PI, 34); return ln(x1, y1, x2, y2); }) +
    ringS(6, (a) => {
      const [bx, by] = P(50, 50, a, 22);
      const [t1x, t1y] = P(bx, by, a + 2.4, 8);
      const [t2x, t2y] = P(bx, by, a - 2.4, 8);
      return ln(bx, by, t1x, t1y) + ln(bx, by, t2x, t2y);
    }),
  frostLock:
    rc(36, 48, 28, 22, 2) + pa('M42 48 V42 a8 8 0 0 1 16 0 V48', false) + ln(50, 56, 50, 62) +
    ln(22, 38, 32, 43) + ln(78, 38, 68, 43) + ln(50, 20, 50, 30),
  chill: ln(50, 20, 50, 66) + pl('38,52 50,68 62,52') + ci(30, 32, 3.2, true) + ci(70, 42, 3.2, true) + ci(68, 22, 2.6, true),
  glacier: pl('20,60 40,28 56,60') + pl('46,60 64,38 82,60') + lnD(14, 70, 86, 70, '7 5'),
  shatter: pg('50,14 80,50 50,86 20,50', false) + pl('50,14 43,50 57,62 47,86') + ln(20, 50, 43, 50) + ln(57, 62, 80, 50),
  numb: ci(50, 50, 26, false) + ln(31, 31, 69, 69),
  whiteout: ciD(50, 50, 27, '3 7') + ln(30, 44, 70, 44) + ln(30, 56, 70, 56),
  cryoBind: pg('50,22 64,38 58,72 42,72 36,38', false) + ln(22, 44, 78, 54) + ln(22, 58, 78, 48),

  /* ===================== ECONOMY ===================== */
  radiation:
    ringS(3, (a) => {
      const [x, y] = P(50, 50, a - Math.PI / 2, 30);
      const [px, py] = P(50, 50, a - Math.PI / 2 + 0.5, 13);
      const [qx, qy] = P(50, 50, a - Math.PI / 2 - 0.5, 13);
      return pg(`${R(x)},${R(y)} ${R(px)},${R(py)} ${R(qx)},${R(qy)}`, true);
    }) + ci(50, 50, 7, true),
  particleWell: ci(50, 50, 30, false) + ci(50, 50, 19, false) + ci(50, 50, 8, true),
  solarTap:
    ci(50, 40, 15, false) +
    ringS(8, (a) => { const [x1, y1] = P(50, 40, a, 20); const [x2, y2] = P(50, 40, a, 27); return ln(x1, y1, x2, y2); }) +
    pa('M50 64 C 43 74, 57 74, 50 64 Z', true),
  condenser: pa('M50 22 C 66 46, 70 60, 50 60 C 30 60, 34 46, 50 22 Z', false) + ln(34, 74, 66, 74) + ln(40, 82, 60, 82),
  transmute: pa('M28 38 H66', false) + pl('58,30 70,38 58,46') + pa('M72 62 H34', false) + pl('42,54 30,62 42,70'),
  reactor: ci(50, 50, 6, true) + ell(50, 50, 34, 13) + ell(50, 50, 34, 13, 60) + ell(50, 50, 34, 13, 120),
  harvest: pl('24,30 76,30 56,56 56,78 44,78 44,56 24,30') + ci(40, 20, 3, true) + ci(54, 15, 3, true) + ci(66, 21, 2.6, true),
  overflow:
    pa('M30 44 H70 L64 78 H36 Z', false) + pa('M30 44 C 36 33, 46 33, 49 42', false) + ci(36, 32, 3, true) + ci(26, 50, 3, true),

  /* ===================== SETTING · WILD ===================== */
  shuffle:
    pa('M20 34 H42 C 56 34, 54 66, 70 66', false) + pl('62,58 74,66 62,74') +
    pa('M20 66 H42 C 56 66, 54 34, 70 34', false) + pl('62,26 74,34 62,42'),
  reversal:
    pa('M28 40 A 24 24 0 0 1 72 46', false) + pl('64,30 74,48 58,50') +
    pa('M72 60 A 24 24 0 0 1 28 54', false) + pl('36,70 26,52 42,50'),
  gambit:
    rc(30, 30, 40, 40, 6) + ci(42, 42, 3.6, true) + ci(58, 42, 3.6, true) + ci(50, 50, 3.6, true) + ci(42, 58, 3.6, true) + ci(58, 58, 3.6, true),
  equinox: ci(50, 50, 26, false) + pa('M50 24 A 26 26 0 0 1 50 76 Z', true),

  /* ===================== MANEUVER ===================== */
  sidestep: ln(32, 42, 68, 42) + pl('60,34 70,42 60,50') + ln(68, 62, 32, 62) + pl('40,54 30,62 40,70'),
  flank: pa('M26 74 C 26 36, 60 28, 78 46', false) + pl('70,34 80,48 66,52'),
  rotate: pa('M28 34 A 26 26 0 1 1 24 58', false) + pl('16,48 24,60 35,53') + pl('20,38 30,30 36,41'),
  pivot: ci(40, 64, 5, true) + ln(40, 64, 68, 36) + pa('M40 42 A 26 26 0 0 1 66 30', false, '4 5') + pl('58,24 67,33 56,39'),
  anchorDown:
    ci(50, 20, 6, false) + ln(50, 26, 50, 68) + ln(38, 38, 62, 38) +
    pa('M30 54 C 32 70, 46 76, 50 68', false) + pa('M70 54 C 68 70, 54 76, 50 68', false) + ln(30, 80, 70, 80),
  lockstepField: rc(26, 26, 48, 48) + ln(42, 26, 42, 74) + ln(58, 26, 58, 74) + ln(26, 42, 74, 42) + ln(26, 58, 74, 58),
  displace: pl('30,34 64,64') + pl('56,60 66,68 58,58') + pl('70,34 36,64') + pl('44,58 34,68 42,58'),
  blindside: pa('M72 26 C 40 24, 28 50, 50 68', false) + pl('40,62 51,70 60,58'),
  encircle:
    ci(50, 50, 8, true) + ciD(50, 50, 32, '4 6') +
    ringS(4, (a) => {
      const [x, y] = P(50, 50, a, 22);
      const [h1x, h1y] = P(x, y, a + Math.PI + 2.4, 9);
      const [h2x, h2y] = P(x, y, a + Math.PI - 2.4, 9);
      return pl(`${R(h1x)},${R(h1y)} ${R(x)},${R(y)} ${R(h2x)},${R(h2y)}`);
    }),
  vantage: pa('M18 50 C 34 30, 66 30, 82 50 C 66 70, 34 70, 18 50 Z', false) + ci(50, 50, 9, true),

  /* ===================== GENESIS · ASCENDANT ===================== */
  nova:
    ringS(12, (a, i) => { const [x1, y1] = P(50, 50, a, 10); const [x2, y2] = P(50, 50, a, i % 2 ? 44 : 32); return ln(x1, y1, x2, y2); }) +
    ci(50, 50, 7, true),
  lightspeed: ln(20, 64, 62, 32) + ln(28, 74, 58, 48) + ln(40, 80, 56, 62) + pg('66,28 52,32 58,44', true),
  citadel: rc(26, 46, 48, 30) + pl('26,46 26,36 36,36 36,44 46,44 46,36 54,36 54,44 64,44 64,36 74,36 74,46') + ln(50, 56, 50, 76),
  absoluteZero:
    ci(50, 50, 31, false) +
    ringS(3, (a) => { const [x1, y1] = P(50, 50, a, 22); const [x2, y2] = P(50, 50, a + Math.PI, 22); return ln(x1, y1, x2, y2); }) +
    ci(50, 50, 5, true),
  singularity: ciD(50, 50, 32, '3 7') + ci(50, 50, 20, false) + ci(50, 50, 11, true),
  ascension: pl('32,68 50,54 68,68') + pl('32,54 50,40 68,54') + pg('50,12 53,24 50,20 47,24', true) + ln(50, 18, 50, 30),

  /* ===================== GENESIS · MALEFIC ===================== */
  plague:
    pa('M32 46 a18 18 0 0 1 36 0 v9 a7 7 0 0 1 -7 7 h-22 a7 7 0 0 1 -7 -7 z', false) +
    ci(42, 47, 5, true) + ci(58, 47, 5, true) + ln(44, 62, 44, 74) + ln(50, 62, 50, 74) + ln(56, 62, 56, 74),
  collapse:
    ringS(4, (a) => {
      const [ox, oy] = P(50, 50, a, 38);
      const [ix, iy] = P(50, 50, a, 18);
      const [h1x, h1y] = P(ix, iy, a + Math.PI + 2.4, 9);
      const [h2x, h2y] = P(ix, iy, a + Math.PI - 2.4, 9);
      return ln(ox, oy, ix, iy) + pl(`${R(h1x)},${R(h1y)} ${R(ix)},${R(iy)} ${R(h2x)},${R(h2y)}`);
    }) + rc(43, 43, 14, 14),
  famine:
    pa('M26 46 a24 24 0 0 0 48 0', false) + ln(22, 46, 78, 46) + ln(50, 70, 50, 80) + ln(38, 84, 62, 84) +
    pa('M40 30 C 44 38, 56 38, 60 30', false, '3 5'),
  curse: ci(50, 50, 31, false) + pg('50,80 38,40 71,64 29,64 62,40', false),
  sacrifice: ln(50, 18, 50, 60) + pg('50,76 44,60 56,60', false) + ln(38, 28, 62, 28) + ci(50, 86, 3, true),
  entropy:
    pl('32,22 68,22 44,50 68,78 32,78 56,50 32,22') + ln(44, 50, 56, 50) +
    ci(78, 32, 2.6, true) + ci(82, 46, 2.2, true) + ci(80, 60, 2, true),

  /* ===================== GENESIS · TEMPERED ===================== */
  bastion: pa('M50 18 L76 27 V49 C76 65 64 76 50 82 C36 76 24 65 24 49 V27 Z', false) + ln(31, 44, 69, 44),
  reservoir: rc(30, 30, 40, 46, 3) + pa('M30 54 q10 7 20 0 t20 0', false) + ln(30, 40, 38, 40),
  patience: ci(50, 50, 28, false) + ln(50, 50, 50, 30) + ln(50, 50, 64, 57),
  equilibrium:
    ln(50, 22, 50, 36) + ln(22, 36, 78, 36) +
    pa('M14 36 L30 36 L22 52 Z', false) + pa('M70 36 L86 36 L78 52 Z', false) +
    ln(40, 74, 60, 74) + ln(50, 36, 50, 74),
  harvestMoon: pa('M60 20 A 30 30 0 1 0 60 80 A 23 23 0 1 1 60 20 Z', false) + ci(30, 34, 2.6, true) + ci(26, 52, 2.2, true),
  tide:
    pa('M18 40 q9 -10 18 0 t18 0 t18 0', false) + pa('M18 56 q9 -10 18 0 t18 0 t18 0', false) + pa('M18 72 q9 -10 18 0 t18 0 t18 0', false),
};

/** Build the white-ink alpha matte as a data-URI for CSS masking. */
export function maskURI(inner: string, strokeWidth: number): string {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">` +
    `<g fill="none" stroke="#fff" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round">` +
    inner +
    `</g></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

/** Raw standalone SVG markup for a glyph (used for three.js textures). */
export function glyphSVG(icon: string, strokeWidth = 5, size = 256): string {
  const inner = GLYPHS[icon] || GLYPHS.ballFire;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 100">` +
    `<g fill="none" stroke="#fff" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round">` +
    inner +
    `</g></svg>`
  );
}

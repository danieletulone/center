/* ============================================================
   CENTER — rival minds
   Greedy one-ply search: for every playable card × legal target,
   simulate the play on a cloned state and score the result from
   the rival's point of view. Personality tilts the weights,
   difficulty sets the noise and how often it blunders.
   ============================================================ */
import { CARD_BY_ID } from './cards';
import { active, canPlay, isSeatMover, legalTargets, play, poolTotal, ranking, shieldValue, WIN_PULL } from './engine';
import type { GameState, PlayIntent, Player } from './types';

const NOISE = { initiate: 2.2, adept: 0.8, archon: 0.15 } as const;
const BLUNDER = { initiate: 0.22, adept: 0.06, archon: 0 } as const;

function evaluate(g: GameState, me: Player): number {
  const p = g.players[me.index];
  if (g.phase === 'over') return g.winner === p.index ? 1000 : -1000;
  const others = g.players.filter((o) => o.index !== p.index);
  const top = Math.max(...others.map((o) => o.pull));
  const avg = others.reduce((a, o) => a + o.pull, 0) / others.length;
  const danger = Math.max(0, top - (WIN_PULL - 6)) * 1.4; // fear a rival close to winning

  const w = {
    aggressor: { self: 1, top: 0.75, avg: 0.35, guard: 0.18 },
    warden: { self: 1.1, top: 0.55, avg: 0.2, guard: 0.45 },
    trickster: { self: 1, top: 0.65, avg: 0.3, guard: 0.25 },
    human: { self: 1, top: 0.6, avg: 0.3, guard: 0.3 },
  }[p.personality];

  let v = p.pull * w.self - top * w.top - avg * w.avg - danger;
  v += shieldValue(g, p) * w.guard;
  for (const k of ['immune', 'aegis', 'reflect', 'redirect', 'phase', 'floor'] as const) if (active(g, p, k)) v += 0.9 * w.guard * 2;
  v += poolTotal(p.passives.generators) * 1.1 + p.passives.extraGen * 0.9 + p.passives.armor * 0.6;
  v += (p.passives.citadel ? 2 : 0) + (p.passives.ascension ? 2 : 0) + (p.passives.tide ? 1.5 : 0) + (p.passives.equilibrium ? 1 : 0);
  v += Math.min(p.hand.length, 7) * 0.12;
  // afflictions on rivals are worth something, weighted toward the leader
  for (const o of others) {
    const weight = o.pull === top ? 1.2 : 0.6;
    for (const k of ['frozen', 'genDown', 'chill', 'cryoBind', 'numb', 'glacier', 'locked', 'marked', 'burn', 'plague'] as const)
      if (active(g, o, k)) v += 0.55 * weight;
  }
  // reach: having the leader in reach is good positioning
  const leaderRival = ranking(g).find((x) => x.index !== p.index);
  if (leaderRival) {
    const adj = Math.abs(((leaderRival.seat - p.seat + 4) % 4) - 2) === 1;
    const melee = p.hand.filter((h) => {
      const d = CARD_BY_ID[h.id];
      return d.kind === 'base' && d.category === 'Offensive' && !d.tags.includes('Reach') && !d.tags.includes('Leader');
    }).length;
    if (adj) v += 0.5 + Math.min(melee, 3) * 0.45 + (leaderRival.pull >= WIN_PULL - 8 ? 1 : 0);
  }
  return v;
}

function candidates(g: GameState, me: Player): PlayIntent[] {
  const out: PlayIntent[] = [];
  for (const c of me.hand) {
    if (!canPlay(g, me.index, c.uid).ok) continue;
    const def = CARD_BY_ID[c.id];
    if (def.target === 'none') {
      if (def.id === 'rotate') {
        out.push({ uid: c.uid, targets: [], direction: 1 }, { uid: c.uid, targets: [], direction: -1 });
      } else out.push({ uid: c.uid, targets: [] });
    } else if (def.target === 'two-others') {
      const ts = legalTargets(g, me, def.id);
      for (let i = 0; i < ts.length; i++) for (let j = i + 1; j < ts.length; j++) out.push({ uid: c.uid, targets: [ts[i], ts[j]] });
    } else {
      for (const t of legalTargets(g, me, def.id)) out.push({ uid: c.uid, targets: [t] });
    }
  }
  return out;
}

function sim(g: GameState, me: Player, intent: PlayIntent): number {
  const copy = structuredClone(g);
  copy.fx = [];
  const r = play(copy, me.index, intent);
  if (!r.ok) return -Infinity;
  let v = evaluate(copy, copy.players[me.index]);
  // a seat maneuver ends the turn — charge the opportunity cost of unplayed cards
  if (isSeatMover(CARD_BY_ID[me.hand.find((h) => h.uid === intent.uid)!.id].id)) v -= 0.7;
  return v;
}

/** Choose the next play for the current (AI) player, or null to end the turn. */
export function choosePlay(g: GameState): PlayIntent | null {
  const me = g.players[g.current];
  const base = evaluate(g, me);
  const noise = NOISE[g.difficulty];
  let best: { intent: PlayIntent; score: number } | null = null;
  for (const intent of candidates(g, me)) {
    const def = CARD_BY_ID[me.hand.find((h) => h.uid === intent.uid)!.id];
    let s = sim(g, me, intent) - base;
    s += (Math.random() - 0.5) * noise;
    if (def.kind === 'genesis') s += 0.8; // eureka cards are rarely wrong to play
    if (!best || s > best.score) best = { intent, score: s };
  }
  if (!best) return null;
  if (Math.random() < BLUNDER[g.difficulty]) return null;
  return best.score > 0.25 ? best.intent : null;
}

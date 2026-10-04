/* ============================================================
   CENTER — rules engine
   A pure(ish) game engine: every function takes a GameState and
   mutates it in place. Callers clone before speculative play
   (the AI simulates on structuredClone copies).

   THE TUG: four players sit around the Center. Each player's
   PULL is how far the Center leans toward them. Pull cards drag
   it in; attacks PUSH it away from a rival. First to WIN_PULL
   claims the Center.
   ============================================================ */
import { BASE_CARDS, BASE_SECTIONS, CARD_BY_ID, ELEMENT_BEATS, GENESIS_CARDS, TEMPER_BEATS, cardDef } from './cards';
import {
  ELEMENTS,
  type BaseCardDef,
  type CardDef,
  type CardInstance,
  type Difficulty,
  type Element,
  type FxEvent,
  type GameState,
  type GenesisCardDef,
  type LogKey,
  type LogParams,
  type ReasonKey,
  type PlayIntent,
  type Player,
  type Pool,
  type Status,
  type StatusKind,
  type Temperament,
} from './types';

export const WIN_PULL = 21;
export const MAX_ROUNDS = 30;
export const MAX_PLAYS = 3;
export const HAND_START = 5;
export const HAND_MAX = 8;
export const DRAW_PER_TURN = 2;
export const BASE_ATTUNED = 1; // + one of each element
export const DECK_SIZE = 24;
const SEATS = 4;

/* ---------------- RNG (mulberry32, state-held) ---------------- */
export function rand(g: GameState): number {
  g.rng = (g.rng + 0x6d2b79f5) | 0;
  let t = g.rng;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
function pick<T>(g: GameState, arr: T[]): T {
  return arr[Math.floor(rand(g) * arr.length)];
}
function shuffleInPlace<T>(g: GameState, arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand(g) * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/* ---------------- helpers ---------------- */
const emptyPool = (): Pool => ({ fire: 0, ice: 0, arcane: 0, flux: 0 });
export const poolTotal = (p: Pool) => p.fire + p.ice + p.arcane + p.flux;

function log(g: GameState, actor: number, key: LogKey, p: LogParams, tone?: Element | 'mono' | 'system') {
  g.logSeq += 1;
  g.log.push({ id: g.logSeq, round: g.round, actor, key, p, tone });
  if (g.log.length > 120) g.log.splice(0, g.log.length - 120);
}
function fx(g: GameState, e: FxEvent) {
  g.fx.push(e);
}

export function playerAtSeat(g: GameState, seat: number): Player {
  return g.players.find((p) => p.seat === ((seat % SEATS) + SEATS) % SEATS)!;
}
export function neighbours(g: GameState, p: Player): Player[] {
  return [playerAtSeat(g, p.seat + 1), playerAtSeat(g, p.seat + 3)];
}
export function front(g: GameState, p: Player): Player {
  return playerAtSeat(g, p.seat + 2);
}
export function opponents(g: GameState, p: Player): Player[] {
  return g.players.filter((o) => o.index !== p.index);
}
/** Highest pull; ties broken by seat order from the current player. */
export function leader(g: GameState): Player {
  return [...g.players].sort((a, b) => b.pull - a.pull || a.index - b.index)[0];
}
export function ranking(g: GameState): Player[] {
  return [...g.players].sort((a, b) => b.pull - a.pull || a.index - b.index);
}
function leaderExcluding(g: GameState, p: Player): Player | null {
  const others = opponents(g, p).sort((a, b) => b.pull - a.pull);
  return others[0] ?? null;
}
function isLeader(g: GameState, p: Player) {
  const top = Math.max(...g.players.map((x) => x.pull));
  return p.pull === top && g.players.filter((x) => x.pull === top).length === 1;
}

/* ---------------- statuses ---------------- */
export function active(g: GameState, p: Player, kind: StatusKind): Status | undefined {
  return p.statuses.find((s) => s.kind === kind && g.turnSeq < s.expires);
}
function activeAll(g: GameState, p: Player, kind: StatusKind): Status[] {
  return p.statuses.filter((s) => s.kind === kind && g.turnSeq < s.expires);
}
function removeStatus(p: Player, st: Status) {
  p.statuses = p.statuses.filter((s) => s !== st);
}
function addStatus(p: Player, s: Status) {
  p.statuses.push(s);
}
/** Turns from now until `p`'s next turn begins (1..4). */
function untilTurnOf(g: GameState, p: Player) {
  const d = (p.index - g.current + SEATS) % SEATS;
  return d === 0 ? SEATS : d;
}
/** Expiry index that lasts until `p`'s next turn STARTS. */
const untilNextStart = (g: GameState, p: Player) => g.turnSeq + untilTurnOf(g, p);
/** Expiry index that lasts THROUGH `p`'s next turn (expires as it ends). */
const throughNextTurn = (g: GameState, p: Player, extraRounds = 0) => g.turnSeq + untilTurnOf(g, p) + 1 + extraRounds * SEATS;

export function shieldValue(g: GameState, p: Player) {
  return activeAll(g, p, 'shield').reduce((a, s) => a + s.value, 0);
}

/* ---------------- deck building ---------------- */
type Personality = Player['personality'];
const PERSONA_WEIGHTS: Record<Personality, Partial<Record<string, number>>> = {
  aggressor: { Offensive: 3.2, Defensive: 0.6, Control: 0.8, Maneuver: 1, 'Setting · Wild': 0.7 },
  warden: { Offensive: 1, Defensive: 3, Control: 0.8, Maneuver: 0.8, 'Setting · Wild': 0.8 },
  trickster: { Offensive: 1.1, Defensive: 0.8, Control: 2.6, Maneuver: 1.8, 'Setting · Wild': 1.2 },
  human: { Offensive: 1.6, Defensive: 1.4, Control: 1.4, Maneuver: 1.1, 'Setting · Wild': 1 },
};

function weightedSample(g: GameState, items: BaseCardDef[], weight: (c: BaseCardDef) => number, n: number) {
  const pool = [...items];
  const out: BaseCardDef[] = [];
  while (out.length < n && pool.length) {
    const total = pool.reduce((a, c) => a + weight(c), 0);
    let r = rand(g) * total;
    let i = 0;
    for (; i < pool.length - 1; i++) {
      r -= weight(pool[i]);
      if (r <= 0) break;
    }
    out.push(pool[i]);
    pool.splice(i, 1);
  }
  return out;
}

let uidSeq = 0;
function inst(id: string): CardInstance {
  uidSeq += 1;
  return { uid: `c${uidSeq.toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`, id };
}

export function buildDeck(g: GameState, persona: Personality): CardInstance[] {
  const pulls = BASE_SECTIONS.find((s) => s.name === 'Speed · Pull')!.cards.filter((c) => c.id !== 'finalPush');
  const econ = BASE_SECTIONS.find((s) => s.name === 'Economy')!.cards;
  const rest = BASE_CARDS.filter((c) => c.category !== 'Speed · Pull' && c.category !== 'Economy');
  const w = PERSONA_WEIGHTS[persona];
  const chosen = [
    ...weightedSample(g, pulls, () => 1, 8),
    CARD_BY_ID.finalPush as BaseCardDef,
    ...weightedSample(g, econ, () => 1, 3),
    ...weightedSample(g, rest, (c) => w[c.category] ?? 1, DECK_SIZE - 12),
  ];
  return shuffleInPlace(
    g,
    chosen.map((c) => inst(c.id)),
  );
}

/* ---------------- setup ---------------- */
const NAMES: { name: string; persona: Personality }[] = [
  { name: 'Albert', persona: 'aggressor' },
  { name: 'Sophia', persona: 'trickster' },
  { name: 'John', persona: 'warden' },
];

function newPlayer(index: number, name: string, human: boolean, persona: Personality, defaultName = false): Player {
  return {
    index,
    name,
    human,
    defaultName,
    seat: index,
    pull: 0,
    hand: [],
    deck: [],
    discard: [],
    pool: emptyPool(),
    statuses: [],
    passives: {
      generators: emptyPool(),
      extraGen: 0,
      armor: 0,
      citadel: false,
      ascension: false,
      patience: false,
      tide: false,
      reservoir: false,
      equilibrium: false,
    },
    track: {
      pushThisRound: 0,
      pullStreak: 0,
      pulledLastTurn: false,
      blockedTotal: 0,
      slowedTargets: [],
      triangleWins: 0,
      attackStreakTarget: null,
      attackStreak: 0,
      attackedThisTurn: null,
      timesAttacked: 0,
      strongestAttack: 0,
      discarded: 0,
      timesFrozen: 0,
      positiveTurns: 0,
      leftoverTurns: 0,
      noAttackTurns: 0,
      attackedThisTurnAny: false,
      nearCenterTurns: 0,
      generatedTotal: 0,
      middleTurns: 0,
      lastElement: null,
      pulledNow: false,
      zeroAtEnd: false,
    },
    genesisEarned: [],
    genesisPlayed: [],
    personality: persona,
  };
}

export interface NewGameOptions {
  seed?: number;
  playerName?: string;
  difficulty?: Difficulty;
}

export function newGame(opts: NewGameOptions = {}): GameState {
  const seed = opts.seed ?? Math.floor(Math.random() * 2 ** 31);
  const g: GameState = {
    seed,
    rng: seed,
    players: [],
    current: 0,
    round: 1,
    turnSeq: 0,
    playsThisTurn: 0,
    maneuverUsed: false,
    whiteoutUntil: -1,
    lockstepUntil: -1,
    phase: 'playing',
    winner: null,
    log: [],
    logSeq: 0,
    fx: [],
    difficulty: opts.difficulty ?? 'adept',
  };
  // seat order: 0 south (you) · 1 west · 2 north · 3 east (clockwise turn order)
  const custom = (opts.playerName ?? '').trim().slice(0, 12);
  g.players.push(newPlayer(0, custom || 'You', true, 'human', !custom));
  NAMES.forEach((n, i) => g.players.push(newPlayer(i + 1, n.name, false, n.persona)));
  for (const p of g.players) {
    p.deck = buildDeck(g, p.personality);
    draw(g, p, HAND_START + (p.index >= 2 ? 1 : 0), true); // later seats get a card of tempo compensation
  }
  log(g, -1, 'wake', { n: WIN_PULL }, 'system');
  startTurn(g);
  return g;
}

/* ---------------- cards in hand ---------------- */
export function draw(g: GameState, p: Player, n: number, quiet = false) {
  let drawn = 0;
  for (let i = 0; i < n; i++) {
    if (!p.deck.length) {
      if (!p.discard.length) break;
      p.deck = shuffleInPlace(g, p.discard.filter((c) => CARD_BY_ID[c.id].kind === 'base'));
      p.discard = [];
      if (!quiet) log(g, p.index, 'reshuffle', { a: p.index }, 'system');
    }
    const c = p.deck.pop();
    if (c) {
      p.hand.push(c);
      drawn++;
    }
  }
  return drawn;
}

function discardCard(p: Player, uid: string, counts = true) {
  const i = p.hand.findIndex((c) => c.uid === uid);
  if (i < 0) return;
  const [c] = p.hand.splice(i, 1);
  if (CARD_BY_ID[c.id].kind === 'base') p.discard.push(c);
  if (counts) p.track.discarded += 1;
}

/* ---------------- elements ---------------- */
/** Element demand of a hand — what the player would like to generate. */
function demand(p: Player): Pool {
  const d = emptyPool();
  for (const c of p.hand) {
    const def = CARD_BY_ID[c.id];
    if (def.kind !== 'base') continue;
    for (const k of def.cost) if (k.el !== 'any' && k.el !== 'free') d[k.el] += k.n;
  }
  return d;
}
/** Pick an element to attune toward: weighted by unmet demand, never zero. */
function attunedElement(g: GameState, p: Player): Element {
  const d = demand(p);
  const weights = ELEMENTS.map((e) => Math.max(0.4, d[e] - p.pool[e] + 0.4));
  const total = weights.reduce((a, b) => a + b, 0);
  let r = rand(g) * total;
  for (let i = 0; i < ELEMENTS.length; i++) {
    r -= weights[i];
    if (r <= 0) return ELEMENTS[i];
  }
  return 'flux';
}
function gainAttuned(g: GameState, p: Player, n: number, tracked = true) {
  const gained = emptyPool();
  for (let i = 0; i < n; i++) {
    const e = attunedElement(g, p);
    p.pool[e] += 1;
    gained[e] += 1;
  }
  if (tracked) p.track.generatedTotal += n;
  for (const e of ELEMENTS) if (gained[e]) fx(g, { kind: 'gain', at: p.index, element: e });
  return gained;
}

export function canAfford(p: Player, def: BaseCardDef): boolean {
  let spare = poolTotal(p.pool);
  for (const k of def.cost) {
    if (k.el === 'free') continue;
    if (k.el === 'any') continue;
    if (p.pool[k.el] < k.n) return false;
    spare -= k.n;
  }
  const any = def.cost.filter((k) => k.el === 'any').reduce((a, k) => a + k.n, 0);
  return spare >= any;
}
function pay(p: Player, def: BaseCardDef) {
  for (const k of def.cost) if (k.el !== 'any' && k.el !== 'free') p.pool[k.el] -= k.n;
  let any = def.cost.filter((k) => k.el === 'any').reduce((a, k) => a + k.n, 0);
  while (any > 0) {
    const richest = [...ELEMENTS].sort((a, b) => p.pool[b] - p.pool[a])[0];
    if (p.pool[richest] <= 0) break;
    p.pool[richest] -= 1;
    any--;
  }
}

/* ---------------- movement ---------------- */
export function canMove(g: GameState, p: Player) {
  return g.turnSeq >= g.lockstepUntil && !active(g, p, 'anchorSeat');
}
function swapSeats(g: GameState, a: Player, b: Player) {
  const s = a.seat;
  a.seat = b.seat;
  b.seat = s;
  fx(g, { kind: 'swap', a: a.index, b: b.index });
}

/* ---------------- reach ---------------- */
export function inReach(g: GameState, me: Player, t: Player, def: CardDef): boolean {
  if (t.index === me.index) return false;
  if (def.kind === 'genesis') return true;
  if (def.tags.includes('Reach') || def.tags.includes('Leader')) return true;
  if (def.element === 'ice') return true; // Cryo is the ranged element
  if (active(g, me, 'encircle')) return true;
  if (neighbours(g, me).some((n) => n.index === t.index)) return true;
  if (front(g, me).index === t.index && active(g, me, 'vantage')) return true;
  return false;
}

const CRYO_AFFLICTIONS: StatusKind[] = ['frozen', 'chill', 'glacier', 'numb', 'cryoBind', 'genDown', 'locked'];
export function isFrozen(g: GameState, p: Player) {
  return CRYO_AFFLICTIONS.some((k) => active(g, p, k));
}
function hasDefense(g: GameState, p: Player) {
  return (['shield', 'immune', 'aegis', 'floor', 'redirect', 'reflect', 'phase', 'counter'] as StatusKind[]).some((k) => active(g, p, k));
}

/* ---------------- pull / push resolution ---------------- */
/** Anti-stalemate: the Center hungers. Every pull grows stronger as the match drags on. */
export const CONVERGENCE_ROUNDS = [10, 16, 22];
export function convergence(g: GameState) {
  return CONVERGENCE_ROUNDS.filter((r) => g.round >= r).length;
}

interface PullOpts {
  surge?: boolean;
  lock?: boolean;
  element?: Element | 'mono';
  quiet?: boolean;
}
function gainPull(g: GameState, p: Player, amount: number, o: PullOpts = {}): number {
  let a = amount;
  if (active(g, p, 'plagueCaster')) {
    log(g, p.index, 'plagueForbids', { a: p.index }, 'mono');
    return 0;
  }
  if (!o.surge && g.turnSeq < g.whiteoutUntil) {
    log(g, p.index, 'whiteoutSwallows', { a: p.index }, 'ice');
    fx(g, { kind: 'float', at: p.index, key: 'whiteout', tone: 'ice' });
    return 0;
  }
  if (p.passives.ascension) a += 1;
  a += convergence(g);
  if (p.passives.patience) {
    a *= 2;
    p.passives.patience = false;
    log(g, p.index, 'patienceDoubles', { a: p.index }, 'mono');
  }
  if (!o.surge) {
    const chill = active(g, p, 'chill');
    if (chill) {
      a -= chill.value;
      removeStatus(p, chill);
    }
    const glacier = active(g, p, 'glacier');
    if (glacier) a -= glacier.value;
  }
  a = Math.max(0, a);
  p.pull += a;
  p.track.pulledNow = true;
  if (o.lock) {
    addStatus(p, { kind: 'floor', value: p.pull, expires: untilNextStart(g, p) });
  }
  if (a > 0) {
    fx(g, { kind: 'pull', at: p.index, element: o.element ?? 'flux', power: a });
    fx(g, { kind: 'float', at: p.index, key: 'gain', n: a, tone: 'good' });
  }
  return a;
}

interface PushOpts {
  element: Element | 'mono';
  ignoreDefense?: boolean;
  targeted?: boolean;
  noReflect?: boolean;
  noCounter?: boolean;
  bolt?: boolean;
}

/** Push `amount` away from `t` (reduce their pull). Returns actual pull removed. */
function push(g: GameState, src: Player, t: Player, amount: number, o: PushOpts): number {
  let a = amount;
  if (o.bolt !== false) fx(g, { kind: 'bolt', from: src.index, to: t.index, element: o.element, power: a });
  src.track.attackedThisTurnAny = true;
  src.track.attackedThisTurn = t.index;
  t.track.timesAttacked += 1;
  t.track.strongestAttack = Math.max(t.track.strongestAttack, amount);

  if (!o.ignoreDefense) {
    if (active(g, t, 'aegis') || active(g, t, 'immune')) {
      t.track.blockedTotal += a;
      log(g, t.index, 'blockAside', { a: t.index, c: active(g, t, 'aegis') ? 'aegis' : 'bulwark' }, 'arcane');
      fx(g, { kind: 'block', at: t.index });
      fx(g, { kind: 'float', at: t.index, key: 'blocked', tone: 'arcane' });
      return 0;
    }
    const reflect = active(g, t, 'reflect');
    if (reflect && !o.noReflect) {
      removeStatus(t, reflect);
      log(g, t.index, 'mirrorReflects', { a: t.index, x: src.index }, 'arcane');
      fx(g, { kind: 'block', at: t.index });
      return push(g, t, src, amount, { ...o, noReflect: true, targeted: false });
    }
    const redirect = active(g, t, 'redirect');
    if (redirect && !o.noReflect) {
      removeStatus(t, redirect);
      const others = g.players.filter((x) => x.index !== t.index && x.index !== src.index);
      const victim = others.sort((x, y) => y.pull - x.pull)[0];
      if (victim) {
        log(g, t.index, 'magniusRedirects', { a: t.index, x: victim.index }, 'arcane');
        fx(g, { kind: 'block', at: t.index });
        return push(g, src, victim, amount, { ...o, noReflect: true, targeted: false });
      }
    }
  }
  if (t.passives.equilibrium && isLeader(g, src)) {
    log(g, t.index, 'equilibriumRests', { a: t.index }, 'mono');
    fx(g, { kind: 'float', at: t.index, key: 'immune', tone: 'neutral' });
    return 0;
  }
  // amplifiers
  const mark = activeAll(g, t, 'marked').find((s) => s.source === src.index);
  if (mark) a += mark.value;
  if (o.element !== 'mono' && t.track.lastElement && ELEMENT_BEATS[o.element] === t.track.lastElement) {
    a += 1;
    src.track.triangleWins += 1;
    fx(g, { kind: 'float', at: t.index, key: 'triangle', n: 1, tone: o.element });
  }
  if (t.passives.citadel) a = Math.ceil(a / 2);
  // shields
  if (!o.ignoreDefense) {
    for (const sh of activeAll(g, t, 'shield')) {
      if (a <= 0) break;
      const absorbed = Math.min(sh.value, a);
      sh.value -= absorbed;
      a -= absorbed;
      t.track.blockedTotal += absorbed;
      if (sh.value <= 0) removeStatus(t, sh);
      if (absorbed) {
        fx(g, { kind: 'block', at: t.index });
        fx(g, { kind: 'float', at: t.index, key: 'block', n: absorbed, tone: 'arcane' });
      }
    }
  }
  const floor = activeAll(g, t, 'floor').reduce((m, s) => Math.max(m, s.value), -Infinity);
  if (Number.isFinite(floor)) a = Math.max(0, Math.min(a, t.pull - floor));
  a = Math.max(0, Math.min(a, t.pull + WIN_PULL)); // never below -WIN
  t.pull -= a;
  src.track.pushThisRound += a;
  if (a > 0) {
    fx(g, { kind: 'burst', at: t.index, element: o.element, power: a });
    fx(g, { kind: 'float', at: t.index, key: 'loss', n: a, tone: 'bad' });
  }
  // counterweight
  const counter = active(g, t, 'counter');
  if (counter && !o.noCounter) {
    removeStatus(t, counter);
    log(g, t.index, 'counterSwings', { a: t.index, x: src.index }, 'arcane');
    push(g, t, src, counter.value, { element: 'arcane', noCounter: true, noReflect: true });
  }
  return a;
}

/* ---------------- genesis ---------------- */
type GTrigger = (g: GameState, p: Player) => boolean;
const GENESIS_TRIGGERS: Record<string, GTrigger> = {
  nova: (_g, p) => p.track.pushThisRound >= 8,
  lightspeed: (_g, p) => p.track.pullStreak >= 3,
  citadel: (_g, p) => p.track.blockedTotal >= 6,
  absoluteZero: (_g, p) => new Set(p.track.slowedTargets).size >= 3,
  singularity: (_g, p) => poolTotal(p.pool) >= 8,
  ascension: (_g, p) => p.track.triangleWins >= 3,
  plague: (_g, p) => p.track.attackStreak >= 3,
  collapse: (g, p) => {
    const r = ranking(g);
    return r[r.length - 1].index === p.index && r[r.length - 2].pull - p.pull >= 5;
  },
  famine: (_g, p) => p.track.zeroAtEnd,
  curse: (_g, p) => p.track.timesAttacked >= 5,
  sacrifice: (_g, p) => p.track.discarded >= 6,
  entropy: (_g, p) => p.track.timesFrozen >= 3,
  bastion: (_g, p) => p.track.positiveTurns >= 4,
  reservoir: (_g, p) => p.track.leftoverTurns >= 3,
  patience: (_g, p) => p.track.noAttackTurns >= 4,
  equilibrium: (_g, p) => p.track.nearCenterTurns >= 5,
  harvestMoon: (_g, p) => p.track.generatedTotal >= 12,
  tide: (_g, p) => p.track.middleTurns >= 4,
};

/** The eureka layer stays dormant for the opening rounds. */
export const GENESIS_FROM_ROUND = 3;

function checkGenesis(g: GameState) {
  if (g.phase !== 'playing' || g.round < GENESIS_FROM_ROUND) return;
  for (const p of g.players) {
    for (const gc of GENESIS_CARDS) {
      if (p.genesisEarned.includes(gc.id)) continue;
      if (GENESIS_TRIGGERS[gc.id]?.(g, p)) {
        p.genesisEarned.push(gc.id);
        p.hand.push(inst(gc.id));
        log(g, p.index, 'genesisMaterialises', { a: p.index, c: gc.id }, 'mono');
        fx(g, { kind: 'genesis', at: p.index, card: gc.id });
      }
    }
  }
}

/* ---------------- turn flow ---------------- */
export function playsAllowed(g: GameState, p: Player) {
  const frozen = activeAll(g, p, 'frozen').reduce((a, s) => a + s.value, 0);
  return Math.max(0, MAX_PLAYS - frozen);
}

function startTurn(g: GameState) {
  const p = g.players[g.current];
  // expire statuses whose time has passed
  for (const pl of g.players) pl.statuses = pl.statuses.filter((s) => g.turnSeq < s.expires);
  g.playsThisTurn = 0;
  g.maneuverUsed = false;
  p.track.pushThisRound = 0;
  p.track.attackedThisTurn = null;
  p.track.attackedThisTurnAny = false;
  p.track.pulledNow = false;
  p.track.zeroAtEnd = false;

  // skip?
  const skip = active(g, p, 'skipTurn');
  if (skip) {
    removeStatus(p, skip);
    log(g, p.index, 'famineSkip', { a: p.index }, 'mono');
    fx(g, { kind: 'float', at: p.index, key: 'skipped', tone: 'neutral' });
    endTurn(g, true);
    return;
  }

  // lingering harm
  for (const b of activeAll(g, p, 'burn')) {
    const src = g.players[b.source ?? p.index];
    log(g, p.index, 'burnSears', { a: p.index }, 'fire');
    push(g, src, p, b.value, { element: 'fire', bolt: false, ignoreDefense: true, noCounter: true, noReflect: true });
    removeStatus(p, b);
  }
  const plague = active(g, p, 'plague');
  if (plague) {
    const src = g.players[plague.source ?? p.index];
    log(g, p.index, 'plagueGnaws', { a: p.index }, 'mono');
    push(g, src, p, plague.value, { element: 'mono', bolt: false, ignoreDefense: true, noCounter: true, noReflect: true });
  }
  if (p.passives.tide) {
    log(g, p.index, 'tideDraws', { a: p.index }, 'mono');
    gainPull(g, p, 1, { element: 'mono' });
  }

  // elements: refresh (bank up to 4 with Reservoir)
  if (p.passives.reservoir) {
    let keep = 4;
    const kept = emptyPool();
    for (const e of [...ELEMENTS].sort((a, b) => p.pool[b] - p.pool[a])) {
      const k = Math.min(keep, p.pool[e]);
      kept[e] = k;
      keep -= k;
    }
    p.pool = kept;
  } else {
    p.pool = emptyPool();
  }
  if (active(g, p, 'cryoBind')) {
    log(g, p.index, 'cryoBindNoRefresh', { a: p.index }, 'ice');
    fx(g, { kind: 'freeze', at: p.index });
  } else {
    for (const e of ELEMENTS) p.pool[e] += 1;
    let attuned = BASE_ATTUNED + p.passives.extraGen;
    const down = activeAll(g, p, 'genDown').reduce((a, s) => a + s.value, 0);
    attuned -= down;
    if (attuned < 0) {
      // eat into the base set, flux first
      for (const e of ['flux', 'ice', 'arcane', 'fire'] as Element[]) {
        while (attuned < 0 && p.pool[e] > 0) {
          p.pool[e]--;
          attuned++;
        }
      }
    }
    if (attuned > 0) gainAttuned(g, p, attuned, p.passives.extraGen > 0);
    for (const e of ELEMENTS) {
      const n = p.passives.generators[e];
      if (n) {
        p.pool[e] += n;
        p.track.generatedTotal += n;
      }
    }
    const bonus = active(g, p, 'genBonus');
    if (bonus) {
      p.pool.flux += bonus.value;
      p.track.generatedTotal += bonus.value;
      removeStatus(p, bonus);
    }
    if (active(g, p, 'genDown')) fx(g, { kind: 'float', at: p.index, key: 'iced', tone: 'ice' });
  }
  const famine = active(g, p, 'skipDraw');
  if (famine) {
    removeStatus(p, famine);
    log(g, p.index, 'skipDraw', { a: p.index }, 'system');
  } else {
    draw(g, p, DRAW_PER_TURN);
  }
  // standing defense
  const armor = p.passives.armor;
  if (armor > 0) addStatus(p, { kind: 'shield', value: armor, expires: g.turnSeq + SEATS });

  checkGenesis(g);
  checkWin(g);
}

function endOfTurnTracking(g: GameState, p: Player) {
  const t = p.track;
  t.pullStreak = t.pulledNow ? t.pullStreak + 1 : 0;
  t.pulledLastTurn = !!t.pulledNow;
  if (t.attackedThisTurn !== null) {
    if (t.attackStreakTarget === t.attackedThisTurn) t.attackStreak += 1;
    else {
      t.attackStreakTarget = t.attackedThisTurn;
      t.attackStreak = 1;
    }
  } else {
    t.attackStreak = 0;
    t.attackStreakTarget = null;
  }
  t.noAttackTurns = t.attackedThisTurnAny ? 0 : t.noAttackTurns + 1;
  t.positiveTurns = p.pull >= 0 ? t.positiveTurns + 1 : 0;
  const left = poolTotal(p.pool);
  if (left > 0) t.leftoverTurns += 1;
  t.zeroAtEnd = left === 0;
  t.nearCenterTurns = Math.abs(p.pull) <= 3 ? t.nearCenterTurns + 1 : 0;
  const r = ranking(g);
  const middle = r[0].index !== p.index && r[r.length - 1].index !== p.index;
  t.middleTurns = middle ? t.middleTurns + 1 : 0;
}

export function endTurn(g: GameState, skipped = false) {
  if (g.phase !== 'playing') return;
  const p = g.players[g.current];
  if (!skipped) {
    // hand limit
    while (p.hand.length > HAND_MAX) {
      const worst = p.hand.find((c) => CARD_BY_ID[c.id].kind === 'base') ?? p.hand[0];
      discardCard(p, worst.uid);
    }
    endOfTurnTracking(g, p);
    checkGenesis(g);
  }
  g.current = (g.current + 1) % SEATS;
  g.turnSeq += 1;
  if (g.current === 0) {
    g.round += 1;
    if (g.round > MAX_ROUNDS) {
      const top = ranking(g)[0];
      g.phase = 'over';
      g.winner = top.index;
      log(g, top.index, 'roundCap', { n: MAX_ROUNDS, a: top.index }, 'system');
      return;
    }
  }
  startTurn(g);
}

function checkWin(g: GameState) {
  if (g.phase !== 'playing') return;
  const champ = g.players.filter((p) => p.pull >= WIN_PULL).sort((a, b) => b.pull - a.pull)[0];
  if (champ) {
    g.phase = 'over';
    g.winner = champ.index;
    log(g, champ.index, 'claims', { a: champ.index }, 'system');
    fx(g, { kind: 'shockwave', element: 'mono' });
  }
}

/* ---------------- legality ---------------- */
export interface PlayCheck {
  ok: boolean;
  reason?: ReasonKey;
  n?: number;
}

const SEAT_MOVERS = new Set(['sidestep', 'flank', 'rotate', 'pivot', 'displace', 'blindside']);
export const isSeatMover = (id: string) => SEAT_MOVERS.has(id);

export function legalTargets(g: GameState, p: Player, id: string): number[] {
  const def = cardDef(id);
  const opp = opponents(g, p);
  switch (def.target) {
    case 'opponent': {
      let ts = opp.filter((t) => inReach(g, p, t, def));
      if (id === 'shatter') ts = ts.filter((t) => isFrozen(g, t));
      if (id === 'sunder') ts = ts.filter((t) => poolTotal(t.passives.generators) > 0);
      return ts.map((t) => t.index);
    }
    case 'neighbour': {
      const ns = neighbours(g, p).filter((n) => canMove(g, n));
      if (id === 'pivot') {
        const f = front(g, p);
        if (!canMove(g, f)) return [];
      }
      return ns.map((n) => n.index);
    }
    case 'any-seat': {
      // Flank: choose who to sit beside — must not already be adjacent, and a seat beside them must be free to take
      const mine = neighbours(g, p).map((n) => n.index);
      return opp
        .filter((t) => !mine.includes(t.index))
        .filter((t) => neighbours(g, t).some((n) => n.index !== p.index && canMove(g, n)))
        .map((t) => t.index);
    }
    case 'two-others':
      return opp.filter((t) => canMove(g, t)).map((t) => t.index);
    default:
      return [];
  }
}

export function canPlay(g: GameState, pIdx: number, uid: string): PlayCheck {
  if (g.phase !== 'playing') return { ok: false, reason: 'over' };
  if (g.current !== pIdx) return { ok: false, reason: 'notTurn' };
  const p = g.players[pIdx];
  const c = p.hand.find((h) => h.uid === uid);
  if (!c) return { ok: false, reason: 'notInHand' };
  const def = cardDef(c.id);
  const lock = activeAll(g, p, 'locked').find((s) => s.ref === uid);
  if (lock) return { ok: false, reason: 'locked' };
  if (g.maneuverUsed) return { ok: false, reason: 'maneuverUsed' };
  if (def.kind === 'base') {
    if (g.playsThisTurn >= playsAllowed(g, p)) return { ok: false, reason: 'noPlays', n: playsAllowed(g, p) };
    if (!canAfford(p, def)) return { ok: false, reason: 'noElements' };
    if (def.category === 'Defensive' && active(g, p, 'numb')) return { ok: false, reason: 'numbed' };
    if (isSeatMover(def.id)) {
      if (g.playsThisTurn > 0) return { ok: false, reason: 'maneuverFirst' };
      if (!canMove(g, p) && def.id !== 'displace' && def.id !== 'pivot') return { ok: false, reason: 'cantMove' };
      if (g.turnSeq < g.lockstepUntil) return { ok: false, reason: 'lockstep' };
    }
    switch (def.id) {
      case 'finalPush':
        if (p.pull < WIN_PULL - 3) return { ok: false, reason: 'needPull', n: WIN_PULL - 3 };
        break;
      case 'gambit':
        if (p.hand.length < 4) return { ok: false, reason: 'needCards', n: 3 };
        break;
      case 'overheat':
      case 'blindside':
        if (!leaderExcluding(g, p) || isLeader(g, p)) return { ok: false, reason: 'youLead' };
        break;
      case 'rotate':
        if (g.players.some((x) => !canMove(g, x))) return { ok: false, reason: 'anchored' };
        break;
    }
    if (def.id === 'blindside') {
      const l = leaderExcluding(g, p)!;
      const adj = neighbours(g, l).some((n) => n.index === p.index);
      if (!adj && !neighbours(g, l).some((n) => n.index !== p.index && canMove(g, n)) && canMove(g, p)) {
        return { ok: false, reason: 'noSeat' };
      }
    }
  } else {
    if (def.id === 'sacrifice' && opponents(g, p).length === 0) return { ok: false };
  }
  if (def.target !== 'none') {
    const ts = legalTargets(g, p, def.id);
    const need = def.target === 'two-others' ? 2 : 1;
    if (ts.length < need) return { ok: false, reason: def.target === 'opponent' ? 'noTarget' : 'noLegalSeat' };
  }
  return { ok: true };
}

/* ---------------- effects ---------------- */
interface Ctx {
  g: GameState;
  me: Player;
  t: Player[]; // chosen targets
  dir: 1 | -1;
  empower: number;
}
type Effect = (c: Ctx) => void;

function selfStatus(c: Ctx, kind: StatusKind, value = 1, dur?: number) {
  addStatus(c.me, { kind, value, expires: dur ?? untilNextStart(c.g, c.me) });
  fx(c.g, { kind: 'shield', at: c.me.index });
}
/** Apply a cryo affliction to the target. Counts toward Absolute Zero & Entropy. */
function afflict(c: Ctx, t: Player, kind: StatusKind, value: number, expires: number, ref?: string) {
  addStatus(t, { kind, value, expires, source: c.me.index, ref });
  if (!c.me.track.slowedTargets.includes(t.index)) c.me.track.slowedTargets.push(t.index);
  if (kind === 'frozen' || kind === 'locked') t.track.timesFrozen += 1;
  fx(c.g, { kind: 'bolt', from: c.me.index, to: t.index, element: 'ice', power: 1 });
  fx(c.g, { kind: 'freeze', at: t.index });
}

const EFFECTS: Record<string, Effect> = {
  /* ---- Offensive ---- */
  ballFire: (c) => void push(c.g, c.me, c.t[0], 2, { element: 'fire', targeted: true }),
  explosive: (c) => {
    push(c.g, c.me, c.t[0], 4, { element: 'fire', targeted: true });
    c.me.pull -= 1;
    fx(c.g, { kind: 'float', at: c.me.index, key: 'backlash', n: 1, tone: 'bad' });
  },
  salvo: (c) => opponents(c.g, c.me).forEach((t) => push(c.g, c.me, t, 1, { element: 'fire' })),
  cinder: (c) => {
    const t = c.t[0];
    const bare = !hasDefense(c.g, t) && t.passives.armor === 0;
    push(c.g, c.me, t, bare ? 2 : 1, { element: 'fire', targeted: true });
  },
  overheat: (c) => {
    const l = leaderExcluding(c.g, c.me)!;
    push(c.g, c.me, l, 3, { element: 'fire', targeted: true });
  },
  plasmaLance: (c) => void push(c.g, c.me, c.t[0], 3, { element: 'fire', targeted: true, ignoreDefense: true }),
  backdraft: (c) => {
    const t = c.t[0];
    push(c.g, c.me, t, 2, { element: 'fire', targeted: true });
    const richest = [...ELEMENTS].sort((a, b) => t.pool[b] - t.pool[a])[0];
    if (t.pool[richest] > 0) {
      t.pool[richest] -= 1;
      c.me.pool[richest] += 1;
    } else {
      addStatus(t, { kind: 'genDown', value: 1, expires: throughNextTurn(c.g, t) });
      c.me.pool[attunedElement(c.g, c.me)] += 1;
    }
  },
  detonator: (c) => {
    push(c.g, c.me, c.t[0], 5, { element: 'fire', targeted: true });
    for (const h of [...c.me.hand]) discardCard(c.me, h.uid);
    fx(c.g, { kind: 'shockwave', element: 'fire' });
  },
  searingMark: (c) => {
    const t = c.t[0];
    addStatus(t, { kind: 'marked', value: 1, expires: c.g.turnSeq + SEATS * 2, source: c.me.index });
    fx(c.g, { kind: 'bolt', from: c.me.index, to: t.index, element: 'fire', power: 1 });
    fx(c.g, { kind: 'float', at: t.index, key: 'marked', tone: 'fire' });
  },
  chainFire: (c) => {
    const t = c.t[0];
    push(c.g, c.me, t, 2, { element: 'fire', targeted: true });
    if (t.track.pulledLastTurn) {
      log(c.g, c.me.index, 'chainCatches', { a: c.me.index, t: t.index, n: 2 }, 'fire');
      push(c.g, c.me, t, 2, { element: 'fire', bolt: true });
    }
  },
  pyre: (c) => {
    const t = c.t[0];
    push(c.g, c.me, t, 3, { element: 'fire', targeted: true });
    addStatus(t, { kind: 'burn', value: 1, expires: throughNextTurn(c.g, t), source: c.me.index });
  },
  sunder: (c) => {
    const t = c.t[0];
    const e = [...ELEMENTS].sort((a, b) => t.passives.generators[b] - t.passives.generators[a])[0];
    t.passives.generators[e] = Math.max(0, t.passives.generators[e] - 1);
    fx(c.g, { kind: 'bolt', from: c.me.index, to: t.index, element: 'fire', power: 2 });
    fx(c.g, { kind: 'burst', at: t.index, element: 'fire', power: 2 });
    fx(c.g, { kind: 'float', at: t.index, key: 'generatorLost', tone: 'bad' });
    c.me.track.attackedThisTurnAny = true;
  },

  /* ---- Defensive ---- */
  purpleWall: (c) => selfStatus(c, 'shield', 3),
  magnius: (c) => selfStatus(c, 'redirect'),
  bulwark: (c) => selfStatus(c, 'immune'),
  anchor: (c) => selfStatus(c, 'floor', c.me.pull),
  mirror: (c) => selfStatus(c, 'reflect'),
  ward: (c) => selfStatus(c, 'shield', 2),
  staticField: (c) => selfStatus(c, 'staticField'),
  phase: (c) => selfStatus(c, 'phase'),
  reinforce: (c) => {
    c.me.passives.armor += 2;
    selfStatus(c, 'shield', 2);
  },
  aegis: (c) => {
    selfStatus(c, 'aegis');
    c.me.pool.arcane += 1;
    fx(c.g, { kind: 'gain', at: c.me.index, element: 'arcane' });
  },
  counterweight: (c) => {
    selfStatus(c, 'shield', 2);
    addStatus(c.me, { kind: 'counter', value: 1, expires: untilNextStart(c.g, c.me) });
  },

  /* ---- Speed · Pull ---- */
  laser: (c) => void gainPull(c.g, c.me, 2),
  accelerate: (c) => void gainPull(c.g, c.me, 3),
  slipstream: (c) => {
    gainPull(c.g, c.me, 2);
    draw(c.g, c.me, 1);
  },
  momentum: (c) => void gainPull(c.g, c.me, c.me.track.pulledLastTurn ? 3 : 2),
  vault: (c) => {
    gainPull(c.g, c.me, 5);
    addStatus(c.me, { kind: 'skipDraw', value: 1, expires: throughNextTurn(c.g, c.me) });
  },
  tether: (c) => {
    gainPull(c.g, c.me, 2);
    const l = leaderExcluding(c.g, c.me);
    if (l && !isLeader(c.g, c.me)) push(c.g, c.me, l, 1, { element: 'fire', targeted: true });
  },
  surge: (c) => void gainPull(c.g, c.me, 4, { surge: true }),
  drift: (c) => {
    gainPull(c.g, c.me, 1);
    gainAttuned(c.g, c.me, 1);
  },
  lockstep: (c) => void gainPull(c.g, c.me, 2, { lock: true }),
  finalPush: (c) => void gainPull(c.g, c.me, 6),

  /* ---- Control ---- */
  ice: (c) => afflict(c, c.t[0], 'genDown', 1, throughNextTurn(c.g, c.t[0])),
  freeze: (c) => afflict(c, c.t[0], 'frozen', 1, throughNextTurn(c.g, c.t[0])),
  frostLock: (c) => {
    const t = c.t[0];
    const lockable = t.hand.filter((h) => CARD_BY_ID[h.id].kind === 'base');
    const card = lockable.length ? pick(c.g, lockable) : undefined;
    afflict(c, t, 'locked', 1, throughNextTurn(c.g, t, 1), card?.uid);
  },
  chill: (c) => afflict(c, c.t[0], 'chill', 2, throughNextTurn(c.g, c.t[0], 1)),
  glacier: (c) => {
    for (const t of opponents(c.g, c.me)) {
      if (active(c.g, t, 'staticField')) continue;
      afflict(c, t, 'glacier', 1, throughNextTurn(c.g, t));
    }
  },
  shatter: (c) => void push(c.g, c.me, c.t[0], 4, { element: 'ice', targeted: true }),
  numb: (c) => afflict(c, c.t[0], 'numb', 1, throughNextTurn(c.g, c.t[0])),
  whiteout: (c) => {
    c.g.whiteoutUntil = untilNextStart(c.g, c.me);
    fx(c.g, { kind: 'shockwave', element: 'ice' });
  },
  cryoBind: (c) => afflict(c, c.t[0], 'cryoBind', 1, throughNextTurn(c.g, c.t[0])),

  /* ---- Economy ---- */
  radiation: (c) => addStatus(c.me, { kind: 'genBonus', value: 2, expires: throughNextTurn(c.g, c.me) }),
  particleWell: (c) => {
    c.me.passives.generators.arcane += 1;
    fx(c.g, { kind: 'gain', at: c.me.index, element: 'arcane' });
  },
  solarTap: (c) => {
    c.me.passives.generators.fire += 1;
    fx(c.g, { kind: 'gain', at: c.me.index, element: 'fire' });
  },
  condenser: (c) => {
    c.me.passives.generators.ice += 1;
    fx(c.g, { kind: 'gain', at: c.me.index, element: 'ice' });
  },
  transmute: (c) => {
    // convert the 2 least-needed elements into the 2 most-needed
    const d = demand(c.me);
    for (let i = 0; i < 2; i++) {
      const surplus = [...ELEMENTS].filter((e) => c.me.pool[e] > 0).sort((a, b) => c.me.pool[b] - d[b] - (c.me.pool[a] - d[a]))[0];
      if (!surplus) break;
      c.me.pool[surplus] -= 1;
      const need = [...ELEMENTS].sort((a, b) => d[b] - c.me.pool[b] - (d[a] - c.me.pool[a]))[0];
      c.me.pool[need] += 1;
      fx(c.g, { kind: 'gain', at: c.me.index, element: need });
    }
  },
  reactor: (c) => {
    c.me.passives.extraGen += 2;
  },
  harvest: (c) => void gainAttuned(c.g, c.me, 3),
  overflow: (c) => void gainAttuned(c.g, c.me, Math.min(4, c.me.discard.length)),

  /* ---- Setting · Wild ---- */
  shuffle: (c) => {
    for (const p of c.g.players) {
      const keep = p.hand.filter((h) => CARD_BY_ID[h.id].kind === 'genesis');
      p.deck.push(...p.hand.filter((h) => CARD_BY_ID[h.id].kind === 'base'));
      p.hand = keep;
      shuffleInPlace(c.g, p.deck);
      draw(c.g, p, 5);
    }
    fx(c.g, { kind: 'shockwave', element: 'flux' });
  },
  reversal: (c) => {
    const [a, b] = ranking(c.g);
    const tmp = a.pull;
    a.pull = b.pull;
    b.pull = tmp;
    log(c.g, c.me.index, 'reversal', { a: a.index, x: b.index }, 'flux');
    fx(c.g, { kind: 'shockwave', element: 'flux' });
  },
  gambit: (c) => {
    // discard the 3 cards hardest to afford
    const others = c.me.hand
      .filter((h) => CARD_BY_ID[h.id].kind === 'base')
      .sort((x, y) => costSize(CARD_BY_ID[y.id]) - costSize(CARD_BY_ID[x.id]))
      .slice(0, 3);
    for (const h of others) discardCard(c.me, h.uid);
    gainPull(c.g, c.me, 4);
  },
  equinox: (c) => {
    for (const p of c.g.players) {
      p.pull = 0;
      draw(c.g, p, 2);
    }
    fx(c.g, { kind: 'shockwave', element: 'mono' });
  },

  /* ---- Maneuver ---- */
  sidestep: (c) => swapSeats(c.g, c.me, c.t[0]),
  flank: (c) => {
    const x = c.t[0];
    const seat = neighbours(c.g, x).find((n) => n.index !== c.me.index && canMove(c.g, n))!;
    swapSeats(c.g, c.me, seat);
  },
  rotate: (c) => {
    for (const p of c.g.players) p.seat = (p.seat + c.dir + SEATS) % SEATS;
    fx(c.g, { kind: 'shockwave', element: 'flux' });
  },
  pivot: (c) => swapSeats(c.g, front(c.g, c.me), c.t[0]),
  anchorDown: (c) => selfStatus(c, 'anchorSeat', 1, c.g.turnSeq + SEATS * 2),
  lockstepField: (c) => {
    c.g.lockstepUntil = c.g.turnSeq + SEATS + 1;
    fx(c.g, { kind: 'shockwave', element: 'arcane' });
  },
  displace: (c) => swapSeats(c.g, c.t[0], c.t[1]),
  blindside: (c) => {
    const l = leaderExcluding(c.g, c.me)!;
    if (!neighbours(c.g, l).some((n) => n.index === c.me.index) && canMove(c.g, c.me)) {
      const seat = neighbours(c.g, l).find((n) => n.index !== c.me.index && canMove(c.g, n));
      if (seat) swapSeats(c.g, c.me, seat);
    }
    push(c.g, c.me, l, 2, { element: 'fire', targeted: true, ignoreDefense: true });
  },
  encircle: (c) => selfStatus(c, 'encircle', 1, throughNextTurn(c.g, c.me)),
  vantage: (c) => selfStatus(c, 'vantage', 1, c.g.turnSeq + 1),

  /* ---- Genesis · Ascendant ---- */
  nova: (c) => {
    fx(c.g, { kind: 'shockwave', element: 'mono' });
    opponents(c.g, c.me).forEach((t) => push(c.g, c.me, t, 6 + c.empower, { element: 'mono' }));
  },
  lightspeed: (c) => void gainPull(c.g, c.me, 7 + c.empower, { element: 'mono' }),
  citadel: (c) => {
    c.me.passives.citadel = true;
    fx(c.g, { kind: 'shield', at: c.me.index });
  },
  absoluteZero: (c) => {
    for (const t of opponents(c.g, c.me)) afflict(c, t, 'frozen', 1, throughNextTurn(c.g, t));
    fx(c.g, { kind: 'shockwave', element: 'ice' });
  },
  singularity: (c) => {
    const n = poolTotal(c.me.pool);
    c.me.pool = emptyPool();
    gainPull(c.g, c.me, n, { element: 'mono', surge: true });
    fx(c.g, { kind: 'shockwave', element: 'mono' });
  },
  ascension: (c) => {
    c.me.passives.ascension = true;
  },

  /* ---- Genesis · Malefic ---- */
  plague: (c) => {
    const t = c.t[0];
    const dur = c.g.turnSeq + SEATS * 3;
    addStatus(t, { kind: 'plague', value: 4 + c.empower, expires: dur, source: c.me.index });
    addStatus(c.me, { kind: 'plagueCaster', value: 1, expires: dur });
    fx(c.g, { kind: 'bolt', from: c.me.index, to: t.index, element: 'mono', power: 4 });
    fx(c.g, { kind: 'burst', at: t.index, element: 'mono', power: 3 });
  },
  collapse: (c) => {
    for (const p of c.g.players) p.pull = 0;
    c.me.passives.generators = emptyPool();
    fx(c.g, { kind: 'shockwave', element: 'mono' });
  },
  famine: (c) => {
    for (const t of opponents(c.g, c.me)) {
      addStatus(t, { kind: 'genDown', value: 2 + Math.floor(c.empower / 2), expires: throughNextTurn(c.g, t), source: c.me.index });
      for (const e of ELEMENTS) t.pool[e] = Math.floor(t.pool[e] / 2);
    }
    addStatus(c.me, { kind: 'skipTurn', value: 1, expires: throughNextTurn(c.g, c.me) });
    fx(c.g, { kind: 'shockwave', element: 'mono' });
  },
  curse: (c) => {
    const amt = Math.max(1, c.me.track.strongestAttack) + c.empower;
    opponents(c.g, c.me).forEach((t) => push(c.g, c.me, t, amt, { element: 'mono' }));
    c.me.pull -= 2;
    fx(c.g, { kind: 'float', at: c.me.index, key: 'backlash', n: 2, tone: 'bad' });
  },
  sacrifice: (c) => {
    const l = leaderExcluding(c.g, c.me)!;
    push(c.g, c.me, l, 8 + c.empower, { element: 'mono', targeted: true });
    for (const h of [...c.me.hand]) discardCard(c.me, h.uid, false);
  },
  entropy: (c) => {
    for (const p of c.g.players) {
      p.passives.citadel = false;
      p.passives.ascension = false;
      p.passives.patience = false;
      p.passives.tide = false;
      p.passives.reservoir = false;
      p.passives.equilibrium = false;
      p.statuses = p.statuses.filter((s) => s.kind !== 'plague' && s.kind !== 'plagueCaster');
    }
    c.me.pull -= 3;
    fx(c.g, { kind: 'shockwave', element: 'mono' });
  },

  /* ---- Genesis · Tempered ---- */
  bastion: (c) => {
    c.me.passives.armor += 2;
    selfStatus(c, 'shield', 2);
  },
  reservoir: (c) => {
    c.me.passives.reservoir = true;
  },
  patience: (c) => {
    c.me.passives.patience = true;
  },
  equilibrium: (c) => {
    c.me.passives.equilibrium = true;
    fx(c.g, { kind: 'shield', at: c.me.index });
  },
  harvestMoon: (c) => {
    c.me.passives.extraGen += 1;
  },
  tide: (c) => {
    c.me.passives.tide = true;
  },
};

function costSize(d: CardDef) {
  return d.kind === 'base' ? d.cost.reduce((a, k) => a + k.n, 0) : 0;
}

/** Targeted-card interception: Phase dodges, Static Field cancels sabotage. */
function intercepted(g: GameState, me: Player, t: Player, def: CardDef): boolean {
  const phase = active(g, t, 'phase');
  if (phase) {
    removeStatus(t, phase);
    log(g, t.index, 'phased', { a: t.index, c: def.id }, 'arcane');
    fx(g, { kind: 'float', at: t.index, key: 'phased', tone: 'arcane' });
    fx(g, { kind: 'bolt', from: me.index, to: t.index, element: def.kind === 'base' ? def.element : 'mono', power: 1 });
    return true;
  }
  if (def.kind === 'base' && def.category === 'Control' && active(g, t, 'staticField')) {
    log(g, t.index, 'staticCancels', { a: t.index, c: def.id }, 'arcane');
    fx(g, { kind: 'block', at: t.index });
    fx(g, { kind: 'float', at: t.index, key: 'cancelled', tone: 'arcane' });
    return true;
  }
  return false;
}

export function play(g: GameState, pIdx: number, intent: PlayIntent): PlayCheck {
  const check = canPlay(g, pIdx, intent.uid);
  if (!check.ok) return check;
  const me = g.players[pIdx];
  const card = me.hand.find((h) => h.uid === intent.uid)!;
  const def = cardDef(card.id);
  // validate targets
  const legal = legalTargets(g, me, def.id);
  const need = def.target === 'none' ? 0 : def.target === 'two-others' ? 2 : 1;
  const targets = intent.targets.filter((t, i, a) => legal.includes(t) && a.indexOf(t) === i).slice(0, need);
  if (targets.length < need) return { ok: false, reason: 'chooseTarget' };

  // pay + move card
  if (def.kind === 'base') {
    pay(me, def);
    g.playsThisTurn += 1;
    me.track.lastElement = def.element;
  } else {
    me.genesisPlayed.push(def.temperament);
  }
  discardCard(me, card.uid, false);

  const tPlayers = targets.map((i) => g.players[i]);
  const tone = def.kind === 'base' ? def.element : 'mono';
  if (tPlayers.length) log(g, me.index, 'playsOn', { a: me.index, c: def.id, ts: targets }, tone);
  else log(g, me.index, 'plays', { a: me.index, c: def.id }, tone);

  let empower = 0;
  if (def.kind === 'genesis') {
    const beats: Temperament = TEMPER_BEATS[def.temperament];
    if (opponents(g, me).some((o) => o.genesisPlayed.includes(beats))) {
      empower = 2;
      log(g, me.index, 'empowered', { temper: def.temperament, beats }, 'mono');
    }
  }

  const blocked = def.target === 'opponent' && tPlayers[0] && intercepted(g, me, tPlayers[0], def);
  if (!blocked) EFFECTS[def.id]?.({ g, me, t: tPlayers, dir: intent.direction ?? 1, empower });

  if (def.kind === 'base' && isSeatMover(def.id)) {
    g.maneuverUsed = true;
    log(g, me.index, 'maneuverConsumes', { a: me.index }, 'system');
  }
  checkGenesis(g);
  checkWin(g);
  return { ok: true };
}

/** Elements a player can see coming next turn (for HUD). */
export function projectedGen(p: Player) {
  return SEATS + BASE_ATTUNED + p.passives.extraGen + poolTotal(p.passives.generators);
}

export function activeStatuses(g: GameState, p: Player) {
  return p.statuses.filter((s) => g.turnSeq < s.expires);
}

export type { GenesisCardDef };

/* ============================================================
   CENTER — core types
   Element mapping (from the Waract design system):
     Plasma → fire · Cryo → ice · Particle → arcane · Flux → flux
   ============================================================ */

export type Element = 'fire' | 'ice' | 'arcane' | 'flux';
export type CostElement = Element | 'any' | 'free';
export type Temperament = 'ascendant' | 'malefic' | 'tempered';

export const ELEMENTS: Element[] = ['fire', 'ice', 'arcane', 'flux'];

export const ELEMENT_NAME: Record<Element, string> = {
  fire: 'Plasma',
  ice: 'Cryo',
  arcane: 'Particle',
  flux: 'Flux',
};

export interface Cost {
  n: number;
  el: CostElement;
}

export type Category =
  | 'Offensive'
  | 'Defensive'
  | 'Speed · Pull'
  | 'Control'
  | 'Economy'
  | 'Setting · Wild'
  | 'Maneuver';

/** How a card chooses what it acts on. */
export type TargetKind =
  | 'none' // self / global
  | 'opponent' // one opponent within reach
  | 'neighbour' // one of your two neighbours (seat)
  | 'any-seat' // any other player regardless of reach (maneuvers)
  | 'two-others'; // two other players (Displace)

export interface BaseCardDef {
  id: string;
  kind: 'base';
  title: string;
  element: Element;
  category: Category;
  cost: Cost[];
  effect: string;
  tags: string[];
  target: TargetKind;
}

export interface GenesisCardDef {
  id: string;
  kind: 'genesis';
  title: string;
  temperament: Temperament;
  trigger: string;
  effect: string;
  selfCost?: string;
  target: TargetKind;
}

export type CardDef = BaseCardDef | GenesisCardDef;

export interface CardInstance {
  uid: string;
  id: string;
}

export type Pool = Record<Element, number>;

export type StatusKind =
  | 'shield' // blocks N pull-loss
  | 'immune' // Bulwark — immune to push-away
  | 'aegis' // block all attacks
  | 'floor' // pull can't drop below value
  | 'redirect' // Magnius
  | 'reflect' // Mirror
  | 'staticField' // cancel sabotage targeting you
  | 'phase' // dodge one targeted card
  | 'counter' // push back N at attacker
  | 'marked' // takes +1 from source
  | 'burn' // pushed N at start of turn
  | 'frozen' // one fewer card next turn
  | 'locked' // card uid locked
  | 'chill' // next pull reduced by N
  | 'glacier' // pulls reduced by N
  | 'numb' // can't play defense
  | 'genDown' // generate N fewer
  | 'cryoBind' // elements don't refresh
  | 'genBonus' // extra flux next turn
  | 'skipDraw'
  | 'anchorSeat' // can't be moved
  | 'encircle' // attack all seats
  | 'vantage' // front counts as adjacent
  | 'plague' // lose N per turn
  | 'plagueCaster' // can't pull
  | 'skipTurn';

export interface Status {
  kind: StatusKind;
  value: number;
  /** status is active while game.turnSeq < expires */
  expires: number;
  source?: number;
  ref?: string;
}

export interface Passives {
  generators: Pool;
  extraGen: number; // Reactor / Harvest Moon
  armor: number; // Reinforce / Bastion — shield refreshed every turn
  citadel: boolean;
  ascension: boolean;
  patience: boolean;
  tide: boolean;
  reservoir: boolean;
  equilibrium: boolean;
}

export interface Tracker {
  pushThisRound: number;
  pullStreak: number;
  pulledLastTurn: boolean;
  blockedTotal: number;
  slowedTargets: number[];
  triangleWins: number;
  attackStreakTarget: number | null;
  attackStreak: number;
  attackedThisTurn: number | null;
  timesAttacked: number;
  strongestAttack: number;
  discarded: number;
  timesFrozen: number;
  positiveTurns: number;
  leftoverTurns: number;
  noAttackTurns: number;
  attackedThisTurnAny: boolean;
  nearCenterTurns: number;
  generatedTotal: number;
  middleTurns: number;
  lastElement: Element | null;
  pulledNow: boolean;
  zeroAtEnd: boolean;
}

export interface Player {
  index: number;
  name: string;
  human: boolean;
  seat: number; // 0 south · 1 west · 2 north · 3 east
  pull: number;
  hand: CardInstance[];
  deck: CardInstance[];
  discard: CardInstance[];
  pool: Pool;
  statuses: Status[];
  passives: Passives;
  track: Tracker;
  genesisEarned: string[];
  genesisPlayed: Temperament[];
  personality: 'aggressor' | 'warden' | 'trickster' | 'human';
}

export type FxEvent =
  | { kind: 'bolt'; from: number; to: number; element: Element | 'mono'; power: number }
  | { kind: 'burst'; at: number; element: Element | 'mono'; power: number }
  | { kind: 'pull'; at: number; element: Element | 'mono'; power: number }
  | { kind: 'shield'; at: number }
  | { kind: 'block'; at: number }
  | { kind: 'freeze'; at: number }
  | { kind: 'gain'; at: number; element: Element }
  | { kind: 'swap'; a: number; b: number }
  | { kind: 'shockwave'; element: Element | 'mono' }
  | { kind: 'genesis'; at: number; card: string }
  | { kind: 'float'; at: number; text: string; tone: 'good' | 'bad' | 'neutral' | Element };

export interface LogEntry {
  id: number;
  round: number;
  actor: number;
  text: string;
  tone?: Element | 'mono' | 'system';
}

export interface GameState {
  seed: number;
  rng: number;
  players: Player[];
  current: number;
  round: number;
  turnSeq: number;
  playsThisTurn: number;
  maneuverUsed: boolean;
  whiteoutUntil: number;
  lockstepUntil: number;
  phase: 'playing' | 'over';
  winner: number | null;
  log: LogEntry[];
  logSeq: number;
  fx: FxEvent[];
  difficulty: Difficulty;
}

export type Difficulty = 'initiate' | 'adept' | 'archon';

export interface PlayIntent {
  uid: string;
  targets: number[]; // player indices
  direction?: 1 | -1; // Rotate
}

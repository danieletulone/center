/* ============================================================
   CENTER — core types
   Element mapping (from the Waract design system):
     Plasma → fire · Cryo → ice · Particle → arcane · Flux → flux
   ============================================================ */

export type Element = 'fire' | 'ice' | 'arcane' | 'flux';
export type CostElement = Element | 'any' | 'free';
export type Temperament = 'ascendant' | 'malefic' | 'tempered';

export const ELEMENTS: Element[] = ['fire', 'ice', 'arcane', 'flux'];

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

export type Tag = 'Backlash' | 'Reach' | 'Leader' | 'Finisher' | 'Pressure Valve' | 'Rare';
export type SectionName = Category | 'Ascendant' | 'Malefic' | 'Tempered';

/** Card definitions are pure data; all text lives in the i18n dictionaries under `cards[id]`. */
export interface BaseCardDef {
  id: string;
  kind: 'base';
  element: Element;
  category: Category;
  cost: Cost[];
  tags: Tag[];
  target: TargetKind;
}

export interface GenesisCardDef {
  id: string;
  kind: 'genesis';
  temperament: Temperament;
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
  /** the local player kept the default name — addressed in the second person */
  defaultName: boolean;
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
  | { kind: 'float'; at: number; key: FloatKey; n?: number; tone: 'good' | 'bad' | 'neutral' | Element };

/** Floating combat text above a seat — rendered through the i18n dictionary. */
export type FloatKey =
  | 'gain'
  | 'loss'
  | 'whiteout'
  | 'blocked'
  | 'immune'
  | 'triangle'
  | 'block'
  | 'skipped'
  | 'iced'
  | 'backlash'
  | 'marked'
  | 'generatorLost'
  | 'phased'
  | 'cancelled';

/** Chronicle lines are stored as keys + parameters and formatted per locale. */
export type LogKey =
  | 'wake'
  | 'reshuffle'
  | 'plagueForbids'
  | 'whiteoutSwallows'
  | 'patienceDoubles'
  | 'blockAside'
  | 'mirrorReflects'
  | 'magniusRedirects'
  | 'equilibriumRests'
  | 'counterSwings'
  | 'genesisMaterialises'
  | 'famineSkip'
  | 'burnSears'
  | 'plagueGnaws'
  | 'tideDraws'
  | 'cryoBindNoRefresh'
  | 'skipDraw'
  | 'roundCap'
  | 'claims'
  | 'chainCatches'
  | 'reversal'
  | 'phased'
  | 'staticCancels'
  | 'plays'
  | 'playsOn'
  | 'empowered'
  | 'maneuverConsumes';

export interface LogParams {
  /** subject player index */
  a?: number;
  /** target player index */
  t?: number;
  /** other player index */
  x?: number;
  /** card id */
  c?: string;
  n?: number;
  /** list of target player indices */
  ts?: number[];
  temper?: Temperament;
  beats?: Temperament;
}

export interface LogEntry {
  id: number;
  round: number;
  actor: number;
  key: LogKey;
  p: LogParams;
  tone?: Element | 'mono' | 'system';
}

/** Why a card can't be played right now — rendered through the i18n dictionary. */
export type ReasonKey =
  | 'over'
  | 'notTurn'
  | 'notInHand'
  | 'locked'
  | 'maneuverUsed'
  | 'noPlays'
  | 'noElements'
  | 'numbed'
  | 'maneuverFirst'
  | 'cantMove'
  | 'lockstep'
  | 'needPull'
  | 'needCards'
  | 'youLead'
  | 'anchored'
  | 'noSeat'
  | 'noTarget'
  | 'noLegalSeat'
  | 'chooseTarget'
  | 'outOfReach'
  | 'cannotPlay';

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

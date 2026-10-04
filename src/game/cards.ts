/* ============================================================
   CENTER — the full card set (82)
   64-card base library across seven suits + 18 Genesis cards
   across three temperaments. Pure data: every word a player
   reads (titles, effects, triggers, suit names) lives in the
   i18n dictionaries, keyed by `id` — which is also the glyph key.
   ============================================================ */
import type { BaseCardDef, CardDef, Category, Cost, GenesisCardDef, SectionName, Tag, Temperament, TargetKind } from './types';

const P = (n: number): Cost => ({ n, el: 'fire' });
const C = (n: number): Cost => ({ n, el: 'ice' });
const T = (n: number): Cost => ({ n, el: 'arcane' });
const F = (n: number): Cost => ({ n, el: 'flux' });
const ANY = (n: number): Cost => ({ n, el: 'any' });
const FREE: Cost[] = [{ n: 0, el: 'free' }];

type Raw = Omit<BaseCardDef, 'kind' | 'tags' | 'target' | 'category'> & { tags?: Tag[]; target?: TargetKind };

function suit(category: Category, cards: Raw[]): BaseCardDef[] {
  return cards.map((c) => ({ kind: 'base', category, tags: [], target: 'none', ...c }));
}

export interface Section<T> {
  /** stable key — display name and blurb come from the dictionary */
  name: SectionName;
  cards: T[];
}

export const BASE_SECTIONS: Section<BaseCardDef>[] = [
  {
    name: 'Offensive',
    cards: suit('Offensive', [
      { id: 'ballFire', element: 'fire', cost: [P(1)], target: 'opponent' },
      { id: 'explosive', element: 'fire', cost: [P(3)], tags: ['Backlash'], target: 'opponent' },
      { id: 'salvo', element: 'fire', cost: [P(2), F(1)], tags: ['Reach'] },
      { id: 'cinder', element: 'fire', cost: [P(1)], target: 'opponent' },
      { id: 'overheat', element: 'fire', cost: [P(2)], tags: ['Leader'] },
      { id: 'plasmaLance', element: 'fire', cost: [P(2), F(1)], tags: ['Reach'], target: 'opponent' },
      { id: 'backdraft', element: 'fire', cost: [P(1), C(1)], target: 'opponent' },
      { id: 'detonator', element: 'fire', cost: [P(4)], target: 'opponent' },
      { id: 'searingMark', element: 'fire', cost: [P(1)], target: 'opponent' },
      { id: 'chainFire', element: 'fire', cost: [P(2)], target: 'opponent' },
      { id: 'pyre', element: 'fire', cost: [P(3), T(1)], target: 'opponent' },
      { id: 'sunder', element: 'fire', cost: [P(2), F(1)], target: 'opponent' },
    ]),
  },
  {
    name: 'Defensive',
    cards: suit('Defensive', [
      { id: 'purpleWall', element: 'arcane', cost: [T(2)] },
      { id: 'magnius', element: 'arcane', cost: [T(2), F(1)] },
      { id: 'bulwark', element: 'arcane', cost: [T(3)] },
      { id: 'anchor', element: 'arcane', cost: [T(1)] },
      { id: 'mirror', element: 'arcane', cost: [T(2), C(1)] },
      { id: 'ward', element: 'arcane', cost: [T(1)] },
      { id: 'staticField', element: 'arcane', cost: [T(2)] },
      { id: 'phase', element: 'arcane', cost: [T(1), F(1)] },
      { id: 'reinforce', element: 'arcane', cost: [T(2)] },
      { id: 'aegis', element: 'arcane', cost: [T(3), F(1)] },
      { id: 'counterweight', element: 'arcane', cost: [T(1), P(1)] },
    ]),
  },
  {
    name: 'Speed · Pull',
    cards: suit('Speed · Pull', [
      { id: 'laser', element: 'flux', cost: [F(1)] },
      { id: 'accelerate', element: 'flux', cost: [F(2)] },
      { id: 'slipstream', element: 'flux', cost: [F(1), T(1)] },
      { id: 'momentum', element: 'flux', cost: [F(2)] },
      { id: 'vault', element: 'flux', cost: [F(3)] },
      { id: 'tether', element: 'flux', cost: [F(1), P(1)], tags: ['Leader'] },
      { id: 'surge', element: 'flux', cost: [F(2), C(1)] },
      { id: 'drift', element: 'flux', cost: [F(1)] },
      { id: 'lockstep', element: 'flux', cost: [F(2), T(1)] },
      { id: 'finalPush', element: 'flux', cost: [F(4)], tags: ['Finisher'] },
    ]),
  },
  {
    name: 'Control',
    cards: suit('Control', [
      { id: 'ice', element: 'ice', cost: [C(1)], target: 'opponent' },
      { id: 'freeze', element: 'ice', cost: [C(2)], target: 'opponent' },
      { id: 'frostLock', element: 'ice', cost: [C(2), T(1)], target: 'opponent' },
      { id: 'chill', element: 'ice', cost: [C(1)], target: 'opponent' },
      { id: 'glacier', element: 'ice', cost: [C(3)] },
      { id: 'shatter', element: 'ice', cost: [C(2), P(1)], target: 'opponent' },
      { id: 'numb', element: 'ice', cost: [C(1)], target: 'opponent' },
      { id: 'whiteout', element: 'ice', cost: [C(3), F(1)] },
      { id: 'cryoBind', element: 'ice', cost: [C(2)], target: 'opponent' },
    ]),
  },
  {
    name: 'Economy',
    cards: suit('Economy', [
      { id: 'radiation', element: 'flux', cost: [F(1)] },
      { id: 'particleWell', element: 'arcane', cost: [T(2)] },
      { id: 'solarTap', element: 'fire', cost: [P(1)] },
      { id: 'condenser', element: 'ice', cost: [C(1)] },
      { id: 'transmute', element: 'flux', cost: [F(1)] },
      { id: 'reactor', element: 'flux', cost: [F(3)] },
      { id: 'harvest', element: 'flux', cost: [F(2)] },
      { id: 'overflow', element: 'flux', cost: [ANY(1)] },
    ]),
  },
  {
    name: 'Setting · Wild',
    cards: suit('Setting · Wild', [
      { id: 'shuffle', element: 'flux', cost: [F(2)] },
      { id: 'reversal', element: 'flux', cost: [ANY(3)] },
      { id: 'gambit', element: 'flux', cost: FREE },
      { id: 'equinox', element: 'flux', cost: [ANY(4)], tags: ['Pressure Valve'] },
    ]),
  },
  {
    name: 'Maneuver',
    cards: suit('Maneuver', [
      { id: 'sidestep', element: 'flux', cost: [F(1)], target: 'neighbour' },
      { id: 'flank', element: 'flux', cost: [F(2)], target: 'any-seat' },
      { id: 'rotate', element: 'flux', cost: [F(2)] },
      { id: 'pivot', element: 'flux', cost: [F(1), T(1)], target: 'neighbour' },
      { id: 'anchorDown', element: 'arcane', cost: [T(2)] },
      { id: 'lockstepField', element: 'arcane', cost: [T(2), F(1)] },
      { id: 'displace', element: 'arcane', cost: [T(2), P(1)], target: 'two-others' },
      { id: 'blindside', element: 'fire', cost: [P(1), F(1)], tags: ['Leader'] },
      { id: 'encircle', element: 'flux', cost: [F(3), T(1)], tags: ['Rare'] },
      { id: 'vantage', element: 'flux', cost: [F(2), P(1)], tags: ['Rare'] },
    ]),
  },
];

type GRaw = Omit<GenesisCardDef, 'kind' | 'temperament' | 'target'> & { target?: TargetKind };
function temper(temperament: Temperament, cards: GRaw[]): GenesisCardDef[] {
  return cards.map((c) => ({ kind: 'genesis', temperament, target: 'none', ...c }));
}

export const GENESIS_SECTIONS: Section<GenesisCardDef>[] = [
  {
    name: 'Ascendant',
    cards: temper('ascendant', [
      { id: 'nova' },
      { id: 'lightspeed' },
      { id: 'citadel' },
      { id: 'absoluteZero' },
      { id: 'singularity' },
      { id: 'ascension' },
    ]),
  },
  {
    name: 'Malefic',
    cards: temper('malefic', [
      { id: 'plague', target: 'opponent' },
      { id: 'collapse' },
      { id: 'famine' },
      { id: 'curse' },
      { id: 'sacrifice' },
      { id: 'entropy' },
    ]),
  },
  {
    name: 'Tempered',
    cards: temper('tempered', [
      { id: 'bastion' },
      { id: 'reservoir' },
      { id: 'patience' },
      { id: 'equilibrium' },
      { id: 'harvestMoon' },
      { id: 'tide' },
    ]),
  },
];

export const BASE_CARDS: BaseCardDef[] = BASE_SECTIONS.flatMap((s) => s.cards);
export const GENESIS_CARDS: GenesisCardDef[] = GENESIS_SECTIONS.flatMap((s) => s.cards);
export const ALL_CARDS: CardDef[] = [...BASE_CARDS, ...GENESIS_CARDS];

export const CARD_BY_ID: Record<string, CardDef> = Object.fromEntries(ALL_CARDS.map((c) => [c.id, c]));

export function cardDef(id: string): CardDef {
  const c = CARD_BY_ID[id];
  if (!c) throw new Error(`Unknown card: ${id}`);
  return c;
}

/** Temperament triangle: Ascendant overruns Tempered, Malefic punishes Ascendant, Tempered outlasts Malefic. */
export const TEMPER_BEATS: Record<Temperament, Temperament> = {
  ascendant: 'tempered',
  malefic: 'ascendant',
  tempered: 'malefic',
};

/** Element triangle used for attack matchups: Plasma melts Cryo, Cryo stills Particle, Particle smothers Plasma. Flux is neutral. */
export const ELEMENT_BEATS: Partial<Record<string, string>> = {
  fire: 'ice',
  ice: 'arcane',
  arcane: 'fire',
};

if (BASE_CARDS.length !== 64 || GENESIS_CARDS.length !== 18) {
  // Guard against accidental edits to the canonical set.
  console.warn(`CENTER card set mismatch: ${BASE_CARDS.length} base / ${GENESIS_CARDS.length} genesis`);
}

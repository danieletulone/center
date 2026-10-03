/* ============================================================
   CENTER — the full card set (82)
   64-card base library across seven suits + 18 Genesis cards
   across three temperaments. Text is verbatim from the design
   handoff (center-cards.data.js); `id` is the card's glyph key.
   ============================================================ */
import type { BaseCardDef, CardDef, Category, Cost, GenesisCardDef, Temperament, TargetKind } from './types';

const P = (n: number): Cost => ({ n, el: 'fire' });
const C = (n: number): Cost => ({ n, el: 'ice' });
const T = (n: number): Cost => ({ n, el: 'arcane' });
const F = (n: number): Cost => ({ n, el: 'flux' });
const ANY = (n: number): Cost => ({ n, el: 'any' });
const FREE: Cost[] = [{ n: 0, el: 'free' }];

type Raw = Omit<BaseCardDef, 'kind' | 'tags' | 'target' | 'category'> & { tags?: string[]; target?: TargetKind };

function suit(category: Category, cards: Raw[]): BaseCardDef[] {
  return cards.map((c) => ({ kind: 'base', category, tags: [], target: 'none', ...c }));
}

export interface Section<T> {
  name: string;
  blurb: string;
  cards: T[];
}

export const BASE_SECTIONS: Section<BaseCardDef>[] = [
  {
    name: 'Offensive',
    blurb: 'Reduce opponents’ pull, break tempo',
    cards: suit('Offensive', [
      { id: 'ballFire', element: 'fire', title: 'Ball Fire', cost: [P(1)], effect: 'Push 2 away from target', target: 'opponent' },
      { id: 'explosive', element: 'fire', title: 'Explosive', cost: [P(3)], effect: 'Push 4 from one player; you take 1 backlash', tags: ['Backlash'], target: 'opponent' },
      { id: 'salvo', element: 'fire', title: 'Salvo', cost: [P(2), F(1)], effect: 'Push 1 from ALL other players', tags: ['Reach'] },
      { id: 'cinder', element: 'fire', title: 'Cinder', cost: [P(1)], effect: 'Push 1; +1 more if target has no defense', target: 'opponent' },
      { id: 'overheat', element: 'fire', title: 'Overheat', cost: [P(2)], effect: 'Push 3 from the leader only', tags: ['Leader'] },
      { id: 'plasmaLance', element: 'fire', title: 'Plasma Lance', cost: [P(2), F(1)], effect: 'Ignore walls / defense; push 3', tags: ['Reach'], target: 'opponent' },
      { id: 'backdraft', element: 'fire', title: 'Backdraft', cost: [P(1), C(1)], effect: 'Push 2; steal 1 element from target', target: 'opponent' },
      { id: 'detonator', element: 'fire', title: 'Detonator', cost: [P(4)], effect: 'Push 5; discard your hand', target: 'opponent' },
      { id: 'searingMark', element: 'fire', title: 'Searing Mark', cost: [P(1)], effect: 'Target takes +1 from your attacks for 2 rounds', target: 'opponent' },
      { id: 'chainFire', element: 'fire', title: 'Chain Fire', cost: [P(2)], effect: 'Push 2; if it cancels their turn-pull, push 2 more', target: 'opponent' },
      { id: 'pyre', element: 'fire', title: 'Pyre', cost: [P(3), T(1)], effect: 'Push 3; leaves a burn pushing 1 more next round', target: 'opponent' },
      { id: 'sunder', element: 'fire', title: 'Sunder', cost: [P(2), F(1)], effect: 'Destroy one generator the target controls', target: 'opponent' },
    ]),
  },
  {
    name: 'Defensive',
    blurb: 'Protect pull, block sabotage',
    cards: suit('Defensive', [
      { id: 'purpleWall', element: 'arcane', title: 'Purple Wall', cost: [T(2)], effect: 'Block next 3 pull-loss this round' },
      { id: 'magnius', element: 'arcane', title: 'Magnius', cost: [T(2), F(1)], effect: 'Redirect next attack on you to another player' },
      { id: 'bulwark', element: 'arcane', title: 'Bulwark', cost: [T(3)], effect: 'Immune to all push-away for 1 round' },
      { id: 'anchor', element: 'arcane', title: 'Anchor', cost: [T(1)], effect: 'Center can’t drop below current value vs you this round' },
      { id: 'mirror', element: 'arcane', title: 'Mirror', cost: [T(2), C(1)], effect: 'Reflect next attack back at attacker' },
      { id: 'ward', element: 'arcane', title: 'Ward', cost: [T(1)], effect: 'Block 2 pull-loss' },
      { id: 'staticField', element: 'arcane', title: 'Static Field', cost: [T(2)], effect: 'Cancel all sabotage targeting you this round' },
      { id: 'phase', element: 'arcane', title: 'Phase', cost: [T(1), F(1)], effect: 'Dodge: ignore one targeted card entirely' },
      { id: 'reinforce', element: 'arcane', title: 'Reinforce', cost: [T(2)], effect: '+2 to your defense values for the match' },
      { id: 'aegis', element: 'arcane', title: 'Aegis', cost: [T(3), F(1)], effect: 'Block all attacks this round; gain 1 Particle' },
      { id: 'counterweight', element: 'arcane', title: 'Counterweight', cost: [T(1), P(1)], effect: 'Block 2, then push 1 back at the attacker' },
    ]),
  },
  {
    name: 'Speed · Pull',
    blurb: 'Your main engine to win the tug',
    cards: suit('Speed · Pull', [
      { id: 'laser', element: 'flux', title: 'Laser', cost: [F(1)], effect: 'Pull 2 toward you' },
      { id: 'accelerate', element: 'flux', title: 'Accelerate', cost: [F(2)], effect: 'Pull 3 toward you' },
      { id: 'slipstream', element: 'flux', title: 'Slipstream', cost: [F(1), T(1)], effect: 'Pull 2; draw 1 card' },
      { id: 'momentum', element: 'flux', title: 'Momentum', cost: [F(2)], effect: 'Pull 2; +1 if you pulled last round too' },
      { id: 'vault', element: 'flux', title: 'Vault', cost: [F(3)], effect: 'Pull 5; skip your next draw' },
      { id: 'tether', element: 'flux', title: 'Tether', cost: [F(1), P(1)], effect: 'Pull 2 toward you AND push 1 from the leader', tags: ['Leader'] },
      { id: 'surge', element: 'flux', title: 'Surge', cost: [F(2), C(1)], effect: 'Pull 4; opponents can’t defend this' },
      { id: 'drift', element: 'flux', title: 'Drift', cost: [F(1)], effect: 'Pull 1; gain 1 element of choice' },
      { id: 'lockstep', element: 'flux', title: 'Lockstep', cost: [F(2), T(1)], effect: 'Pull 2; this pull can’t be reversed' },
      { id: 'finalPush', element: 'flux', title: 'Final Push', cost: [F(4)], effect: 'Pull 6 — only playable when within 3 of winning', tags: ['Finisher'] },
    ]),
  },
  {
    name: 'Control',
    blurb: 'Slow, freeze, disrupt',
    cards: suit('Control', [
      { id: 'ice', element: 'ice', title: 'Ice', cost: [C(1)], effect: 'Target generates 1 fewer element next turn', target: 'opponent' },
      { id: 'freeze', element: 'ice', title: 'Freeze', cost: [C(2)], effect: 'Target skips playing 1 card next turn', target: 'opponent' },
      { id: 'frostLock', element: 'ice', title: 'Frost Lock', cost: [C(2), T(1)], effect: 'Lock 1 card in target’s hand for 2 turns', target: 'opponent' },
      { id: 'chill', element: 'ice', title: 'Chill', cost: [C(1)], effect: 'Reduce target’s next pull by 2', target: 'opponent' },
      { id: 'glacier', element: 'ice', title: 'Glacier', cost: [C(3)], effect: 'All opponents pull 1 less next round' },
      { id: 'shatter', element: 'ice', title: 'Shatter', cost: [C(2), P(1)], effect: 'If target is frozen, push 4 from them', target: 'opponent' },
      { id: 'numb', element: 'ice', title: 'Numb', cost: [C(1)], effect: 'Target can’t play defense next round', target: 'opponent' },
      { id: 'whiteout', element: 'ice', title: 'Whiteout', cost: [C(3), F(1)], effect: 'Cancel ALL pull (everyone) this round' },
      { id: 'cryoBind', element: 'ice', title: 'Cryo Bind', cost: [C(2)], effect: 'Target’s elements don’t refresh next turn', target: 'opponent' },
    ]),
  },
  {
    name: 'Economy',
    blurb: 'Element generation',
    cards: suit('Economy', [
      { id: 'radiation', element: 'flux', title: 'Radiation', cost: [F(1)], effect: 'Gain 2 Flux next turn' },
      { id: 'particleWell', element: 'arcane', title: 'Particle Well', cost: [T(2)], effect: 'Generate 1 Particle each turn (permanent)' },
      { id: 'solarTap', element: 'fire', title: 'Solar Tap', cost: [P(1)], effect: 'Generate 1 Plasma each turn (permanent)' },
      { id: 'condenser', element: 'ice', title: 'Condenser', cost: [C(1)], effect: 'Generate 1 Cryo each turn (permanent)' },
      { id: 'transmute', element: 'flux', title: 'Transmute', cost: [F(1)], effect: 'Convert any 2 elements into any 2 others' },
      { id: 'reactor', element: 'flux', title: 'Reactor', cost: [F(3)], effect: '+2 max elements per turn for the match' },
      { id: 'harvest', element: 'flux', title: 'Harvest', cost: [F(2)], effect: 'Gain 3 elements, split as you like' },
      { id: 'overflow', element: 'flux', title: 'Overflow', cost: [ANY(1)], effect: 'Gain elements equal to cards in your discard (max 4)' },
    ]),
  },
  {
    name: 'Setting · Wild',
    blurb: 'Tempo & anti-stalemate',
    cards: suit('Setting · Wild', [
      { id: 'shuffle', element: 'flux', title: 'Shuffle', cost: [F(2)], effect: 'Everyone shuffles hand into deck, redraws 5' },
      { id: 'reversal', element: 'flux', title: 'Reversal', cost: [ANY(3)], effect: 'Swap the Center’s two strongest pull-directions' },
      { id: 'gambit', element: 'flux', title: 'Gambit', cost: FREE, effect: 'Discard 3 cards: pull 4 toward you' },
      { id: 'equinox', element: 'flux', title: 'Equinox', cost: [ANY(4)], effect: 'Reset Center to neutral; everyone draws 2', tags: ['Pressure Valve'] },
    ]),
  },
  {
    name: 'Maneuver',
    blurb: 'The positional suite — consumes your whole turn',
    cards: suit('Maneuver', [
      { id: 'sidestep', element: 'flux', title: 'Sidestep', cost: [F(1)], effect: 'Swap seats with one neighbour', target: 'neighbour' },
      { id: 'flank', element: 'flux', title: 'Flank', cost: [F(2)], effect: 'Move to any open adjacency — choose who you sit beside', target: 'any-seat' },
      { id: 'rotate', element: 'flux', title: 'Rotate', cost: [F(2)], effect: 'Everyone shifts one seat (you choose direction)' },
      { id: 'pivot', element: 'flux', title: 'Pivot', cost: [F(1), T(1)], effect: 'Swap your Front and one neighbour — pull your rival into reach', target: 'neighbour' },
      { id: 'anchorDown', element: 'arcane', title: 'Anchor Down', cost: [T(2)], effect: 'You can’t be moved or swapped for 2 rounds' },
      { id: 'lockstepField', element: 'arcane', title: 'Lockstep Field', cost: [T(2), F(1)], effect: 'No one may change position next round' },
      { id: 'displace', element: 'arcane', title: 'Displace', cost: [T(2), P(1)], effect: 'Force-swap two other players’ seats', target: 'two-others' },
      { id: 'blindside', element: 'fire', title: 'Blindside', cost: [P(1), F(1)], effect: 'Move adjacent to the leader, then attack ignoring their position defense', tags: ['Leader'] },
      { id: 'encircle', element: 'flux', title: 'Encircle', cost: [F(3), T(1)], effect: 'For 1 round, attack ALL seats regardless of range', tags: ['Rare'] },
      { id: 'vantage', element: 'flux', title: 'Vantage', cost: [F(2), P(1)], effect: 'Attack across the Center (Front) this turn as if adjacent', tags: ['Rare'] },
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
    blurb: 'Raw power — reward for bold archetype play',
    cards: temper('ascendant', [
      { id: 'nova', title: 'Nova', trigger: 'Deal 8+ push-away in one round', effect: 'Push 6 from all opponents' },
      { id: 'lightspeed', title: 'Lightspeed', trigger: 'Pull toward you 3 rounds running', effect: 'Pull 7 instantly' },
      { id: 'citadel', title: 'Citadel', trigger: 'Block 6+ pull-loss across the match', effect: 'Permanent: all attacks on you halved' },
      { id: 'absoluteZero', title: 'Absolute Zero', trigger: 'Freeze / slow 3 different opponents', effect: 'All opponents skip their next card' },
      { id: 'singularity', title: 'Singularity', trigger: 'Hold 8+ elements at once', effect: 'Convert all elements to pull, 1:1' },
      { id: 'ascension', title: 'Ascension', trigger: 'Win 3 element-triangle matchups', effect: '+1 to every pull you make, rest of match' },
    ]),
  },
  {
    name: 'Malefic',
    blurb: 'Scorched-earth sabotage that costs you',
    cards: temper('malefic', [
      { id: 'plague', title: 'Plague', trigger: 'Attack the same player 3 rounds', effect: 'Target loses 4 pull / round for 3 rounds', selfCost: 'Can’t pull while active', target: 'opponent' },
      { id: 'collapse', title: 'Collapse', trigger: 'Drop to last place by 5+', effect: 'Everyone (incl. you) resets to neutral', selfCost: 'Lose your generators' },
      { id: 'famine', title: 'Famine', trigger: 'Hold 0 elements at turn end', effect: 'All opponents lose half their elements', selfCost: 'Skip your next turn' },
      { id: 'curse', title: 'Curse', trigger: 'Get attacked 5+ times', effect: 'Copy strongest attack used on you, hit all', selfCost: 'Take 2 backlash' },
      { id: 'sacrifice', title: 'Sacrifice', trigger: 'Discard 6+ cards in a match', effect: 'Push 8 at the leader', selfCost: 'Discard your whole hand' },
      { id: 'entropy', title: 'Entropy', trigger: 'Be frozen / locked 3 times', effect: 'Cancel all Genesis cards on the table', selfCost: 'Lose 3 pull' },
    ]),
  },
  {
    name: 'Tempered',
    blurb: 'Patient, low-ceiling, no exposure',
    cards: temper('tempered', [
      { id: 'bastion', title: 'Bastion', trigger: 'Survive 4 rounds without dropping below 0 net', effect: '+2 permanent defense' },
      { id: 'reservoir', title: 'Reservoir', trigger: 'End 3 turns with leftover elements', effect: 'Bank up to 4 elements between turns, permanently' },
      { id: 'patience', title: 'Patience', trigger: 'Play no attack for 4 rounds', effect: 'Next pull is doubled' },
      { id: 'equilibrium', title: 'Equilibrium', trigger: 'Stay within 3 of center for 5 rounds', effect: 'Immune to the leader’s attacks' },
      { id: 'harvestMoon', title: 'Harvest Moon', trigger: 'Generate 12+ elements total', effect: '+1 element generation / turn, permanent' },
      { id: 'tide', title: 'Tide', trigger: 'Be neither first nor last for 4 rounds', effect: 'Each round, automatically pull 1 toward you' },
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

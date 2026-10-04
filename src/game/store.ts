'use client';
/* ============================================================
   CENTER — client game store (zustand)
   Wraps the pure engine: every action clones the state, runs the
   engine, then drains engine FX events into a timed queue the 3D
   scene, the HUD and the audio layer all subscribe to.
   ============================================================ */
import { create } from 'zustand';
import { choosePlay } from './ai';
import { CARD_BY_ID, cardDef } from './cards';
import { canPlay, endTurn, legalTargets, newGame, play } from './engine';
import type { Difficulty, FxEvent, GameState, PlayIntent, ReasonKey } from './types';
import { sfx } from '@/lib/audio';

export type TimedFx = FxEvent & { id: number; t: number };

export interface CastNotice {
  id: number;
  player: number;
  cardId: string;
  targets: number[];
}

export interface Settings {
  sound: boolean;
  music: boolean;
  quality: 'high' | 'low';
  speed: 1 | 2;
}

interface Store {
  game: GameState | null;
  fx: TimedFx[];
  casts: CastNotice[];
  genesisQueue: string[];
  selected: string | null;
  pendingTargets: number[];
  inspect: string | null;
  error: { id: number; reason: ReasonKey; n?: number } | null;
  settings: Settings;
  stats: { played: number; wins: number; losses: number };
  start: (opts: { difficulty: Difficulty; name?: string }) => void;
  quit: () => void;
  select: (uid: string | null) => void;
  toggleTarget: (idx: number) => void;
  commit: (direction?: 1 | -1) => void;
  endMyTurn: () => void;
  aiStep: () => 'played' | 'ended' | 'idle';
  dismissGenesis: () => void;
  setInspect: (id: string | null) => void;
  setSettings: (s: Partial<Settings>) => void;
}

let fxSeq = 0;
let castSeq = 0;
let errSeq = 0;

const SETTINGS_KEY = 'center.settings.v1';
const STATS_KEY = 'center.stats.v1';

function loadJSON<T>(key: string, fallback: T): T {
  try {
    if (typeof window === 'undefined') return fallback;
    const raw = window.localStorage.getItem(key);
    return raw ? { ...fallback, ...JSON.parse(raw) } : fallback;
  } catch {
    return fallback;
  }
}
function saveJSON(key: string, v: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(v));
  } catch {
    /* storage may be unavailable */
  }
}

const DEFAULT_SETTINGS: Settings = { sound: true, music: true, quality: 'high', speed: 1 };

/** Keep only FX young enough to still be animating. */
function recent(fx: TimedFx[]) {
  const now = performance.now();
  return fx.length > 40 ? fx.filter((e) => now - e.t < 5000) : fx;
}

function drain(g: GameState): TimedFx[] {
  const now = performance.now();
  const out = g.fx.map((e, i) => ({ ...e, id: ++fxSeq, t: now + i * 90 }));
  g.fx = [];
  return out;
}

function soundFor(events: TimedFx[]) {
  for (const e of events) {
    const delay = Math.max(0, e.t - performance.now());
    setTimeout(() => {
      switch (e.kind) {
        case 'bolt':
          sfx.play('bolt', e.element);
          break;
        case 'burst':
          sfx.play('impact', e.element, e.power);
          break;
        case 'pull':
          sfx.play('pull', e.element, e.power);
          break;
        case 'block':
          sfx.play('block');
          break;
        case 'shield':
          sfx.play('shield');
          break;
        case 'freeze':
          sfx.play('freeze');
          break;
        case 'swap':
          sfx.play('swap');
          break;
        case 'shockwave':
          sfx.play('shockwave', e.element);
          break;
        case 'genesis':
          sfx.play('genesis');
          break;
        case 'gain':
          sfx.play('gain', e.element);
          break;
      }
    }, delay + (e.kind === 'burst' ? 520 : 0));
  }
}

export const useGame = create<Store>((set, get) => ({
  game: null,
  fx: [],
  casts: [],
  genesisQueue: [],
  selected: null,
  pendingTargets: [],
  inspect: null,
  error: null,
  settings: DEFAULT_SETTINGS,
  stats: { played: 0, wins: 0, losses: 0 },

  start: ({ difficulty, name }) => {
    const settings = loadJSON(SETTINGS_KEY, DEFAULT_SETTINGS);
    const stats = loadJSON(STATS_KEY, { played: 0, wins: 0, losses: 0 });
    const g = newGame({ difficulty, playerName: name });
    const fx = drain(g);
    sfx.setEnabled(settings.sound);
    sfx.play('turn');
    set({ game: g, fx, casts: [], genesisQueue: [], selected: null, pendingTargets: [], inspect: null, settings, stats });
  },

  quit: () => set({ game: null, fx: [], casts: [], selected: null, pendingTargets: [], genesisQueue: [] }),

  select: (uid) => {
    const g = get().game;
    if (!g || g.current !== 0) return;
    if (uid) sfx.play('select');
    set({ selected: uid === get().selected ? null : uid, pendingTargets: [] });
  },

  toggleTarget: (idx) => {
    const { game: g, selected, pendingTargets } = get();
    if (!g || !selected) return;
    const c = g.players[0].hand.find((h) => h.uid === selected);
    if (!c) return;
    const def = cardDef(c.id);
    const legal = legalTargets(g, g.players[0], def.id);
    if (!legal.includes(idx)) {
      set({ error: { id: ++errSeq, reason: 'outOfReach' } });
      sfx.play('deny');
      return;
    }
    const need = def.target === 'two-others' ? 2 : 1;
    const next = pendingTargets.includes(idx) ? pendingTargets.filter((t) => t !== idx) : [...pendingTargets, idx].slice(-need);
    set({ pendingTargets: next });
    if (next.length >= need) get().commit();
  },

  commit: (direction) => {
    const { game, selected, pendingTargets } = get();
    if (!game || !selected) return;
    const g = structuredClone(game);
    const c = g.players[0].hand.find((h) => h.uid === selected);
    if (!c) return;
    const intent: PlayIntent = { uid: selected, targets: pendingTargets, direction };
    const r = play(g, 0, intent);
    if (!r.ok) {
      set({ error: { id: ++errSeq, reason: r.reason ?? 'cannotPlay', n: r.n } });
      sfx.play('deny');
      return;
    }
    sfx.play('cast', CARD_BY_ID[c.id].kind === 'base' ? (CARD_BY_ID[c.id] as { element: string }).element : 'mono');
    const fx = drain(g);
    soundFor(fx);
    const genesis = fx.filter((e) => e.kind === 'genesis' && e.at === 0).map((e) => (e as { card: string }).card);
    set((s) => ({
      game: g,
      fx: [...recent(s.fx), ...fx],
      selected: null,
      pendingTargets: [],
      casts: [...s.casts.slice(-4), { id: ++castSeq, player: 0, cardId: c.id, targets: intent.targets }],
      genesisQueue: [...s.genesisQueue, ...genesis],
    }));
    afterAction(g, get, set);
  },

  endMyTurn: () => {
    const { game } = get();
    if (!game || game.current !== 0 || game.phase !== 'playing') return;
    const g = structuredClone(game);
    endTurn(g);
    const fx = drain(g);
    soundFor(fx);
    sfx.play('endturn');
    const genesis = fx.filter((e) => e.kind === 'genesis' && e.at === 0).map((e) => (e as { card: string }).card);
    set((s) => ({ game: g, fx: [...recent(s.fx), ...fx], selected: null, pendingTargets: [], genesisQueue: [...s.genesisQueue, ...genesis] }));
    afterAction(g, get, set);
  },

  aiStep: () => {
    const { game } = get();
    if (!game || game.phase !== 'playing' || game.current === 0) return 'idle';
    const g = structuredClone(game);
    const intent = choosePlay(g);
    if (intent) {
      const id = g.players[g.current].hand.find((h) => h.uid === intent.uid)!.id;
      const actor = g.current;
      const r = play(g, actor, intent);
      if (r.ok) {
        const fx = drain(g);
        soundFor(fx);
        sfx.play('cast', CARD_BY_ID[id].kind === 'base' ? (CARD_BY_ID[id] as { element: string }).element : 'mono');
        const genesis = fx.filter((e) => e.kind === 'genesis' && e.at === 0).map((e) => (e as { card: string }).card);
        set((s) => ({
          game: g,
          fx: [...recent(s.fx), ...fx],
          casts: [...s.casts.slice(-4), { id: ++castSeq, player: actor, cardId: id, targets: intent.targets }],
          genesisQueue: [...s.genesisQueue, ...genesis],
        }));
        afterAction(g, get, set);
        return 'played';
      }
    }
    endTurn(g);
    const fx = drain(g);
    soundFor(fx);
    const genesis = fx.filter((e) => e.kind === 'genesis' && e.at === 0).map((e) => (e as { card: string }).card);
    set((s) => ({ game: g, fx: [...recent(s.fx), ...fx], genesisQueue: [...s.genesisQueue, ...genesis] }));
    if (g.current === 0 && g.phase === 'playing') sfx.play('turn');
    afterAction(g, get, set);
    return 'ended';
  },

  dismissGenesis: () => set((s) => ({ genesisQueue: s.genesisQueue.slice(1) })),
  setInspect: (id) => set({ inspect: id }),
  setSettings: (patch) => {
    const settings = { ...get().settings, ...patch };
    saveJSON(SETTINGS_KEY, settings);
    sfx.setEnabled(settings.sound);
    sfx.setMusic(settings.music);
    set({ settings });
  },
}));

function afterAction(g: GameState, get: () => Store, set: (p: Partial<Store>) => void) {
  if (g.phase === 'over') {
    const stats = { ...get().stats };
    stats.played += 1;
    if (g.winner === 0) stats.wins += 1;
    else stats.losses += 1;
    saveJSON(STATS_KEY, stats);
    set({ stats });
    setTimeout(() => sfx.play(g.winner === 0 ? 'victory' : 'defeat'), 900);
  }
}

/** Whether the local player can currently play `uid` — memo-free helper for the hand. */
export function playable(g: GameState, uid: string) {
  return canPlay(g, 0, uid);
}

// Dev-only handle for automated UI tests.
if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
  (window as unknown as { __center: typeof useGame }).__center = useGame;
}

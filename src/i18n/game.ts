/* Locale-aware rendering of engine output: chronicle lines, refusal
   reasons, floating combat text, status chips and player names. */
import type { FloatKey, LogEntry, Player, ReasonKey, StatusKind } from '@/game/types';
import { fmt, type Dict } from './index';

export const isYou = (p: Player | undefined) => !!p && p.human && p.defaultName;

/** Display name: the local player who kept the default name is "You". */
export function playerName(p: Player, d: Dict): string {
  return isYou(p) ? d.common.you : p.name;
}

/** Name in object position ("… back at you"). */
function objName(p: Player | undefined, d: Dict): string {
  if (!p) return '—';
  return isYou(p) ? d.common.youObj : p.name;
}

export function cardTitle(id: string, d: Dict): string {
  return (d.cards as Record<string, { title: string }>)[id]?.title ?? id;
}

export function formatLog(e: LogEntry, players: Player[], d: Dict): string {
  const log = d.log as Record<string, string>;
  const { a, x, t, c, n, ts, temper, beats } = e.p;
  const pa = a !== undefined ? players[a] : undefined;
  const px = x !== undefined ? players[x] : undefined;
  const pt = t !== undefined ? players[t] : undefined;
  let tpl = log[e.key] ?? e.key;
  if (isYou(pa) && log[`${e.key}_you`]) tpl = log[`${e.key}_you`];
  else if (isYou(px) && log[`${e.key}_xyou`]) tpl = log[`${e.key}_xyou`];
  else if (isYou(pt) && log[`${e.key}_tyou`]) tpl = log[`${e.key}_tyou`];
  return fmt(tpl, {
    a: pa ? (isYou(pa) ? d.common.you : pa.name) : undefined,
    x: objName(px, d),
    t: objName(pt, d),
    c: c ? cardTitle(c, d) : undefined,
    n,
    ts: ts ? ts.map((i) => objName(players[i], d)).join(d.common.and) : undefined,
    temper: temper ? d.temperaments[temper].toUpperCase() : undefined,
    beats: beats ? d.temperaments[beats].toUpperCase() : undefined,
  });
}

export function reasonText(reason: ReasonKey | undefined, n: number | undefined, d: Dict): string {
  return fmt(d.reasons[reason ?? 'cannotPlay'], { n });
}

export function floatText(key: FloatKey, n: number | undefined, d: Dict): string {
  return fmt(d.floats[key], { n });
}

export function statusText(kind: StatusKind, value: number, d: Dict, form: 'long' | 'short' = 'long'): string {
  return fmt(d.status[form][kind], { n: value });
}

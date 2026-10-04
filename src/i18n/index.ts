import { en, type Dict } from './en';
import { it } from './it';
import type { Locale } from './config';

export type { Dict };
export const DICTIONARIES: Record<Locale, Dict> = { en, it };

export function getDict(locale: Locale): Dict {
  return DICTIONARIES[locale];
}

type Params = Record<string, string | number | undefined>;

/** Fill {placeholders}. Unknown placeholders are left visible so gaps are easy to spot. */
export function fmt(template: string, params: Params = {}): string {
  return template.replace(/\{(\w+)\}/g, (m, k: string) => (params[k] === undefined ? m : String(params[k])));
}

/** Pick singular/plural by count. */
export function plural(n: number, one: string, other: string): string {
  return n === 1 ? one : other;
}

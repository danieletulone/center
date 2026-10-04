import { LOCALES, type Locale } from '@/i18n/config';

export const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://center.waract.game';

/** hreflang map for a locale-less path ('' | '/play' | …). */
export function languageAlternates(path: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const l of LOCALES) out[l] = `${SITE}/${l}${path}`;
  out['x-default'] = `${SITE}/en${path}`;
  return out;
}

export function pageAlternates(lang: Locale, path: string) {
  return { canonical: `${SITE}/${lang}${path}`, languages: languageAlternates(path) };
}

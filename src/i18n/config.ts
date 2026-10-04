export const LOCALES = ['en', 'it'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'en';
export const LOCALE_COOKIE = 'center.lang';

export function isLocale(v: string | undefined | null): v is Locale {
  return !!v && (LOCALES as readonly string[]).includes(v);
}

/** BCP 47 tags for <html lang>, Open Graph and hreflang. */
export const LOCALE_TAG: Record<Locale, string> = { en: 'en', it: 'it' };
export const OG_LOCALE: Record<Locale, string> = { en: 'en_US', it: 'it_IT' };

/** Pick the best supported locale from an Accept-Language header. */
export function negotiate(header: string | null | undefined): Locale {
  if (!header) return DEFAULT_LOCALE;
  const ranked = header
    .split(',')
    .map((part) => {
      const [tag, ...params] = part.trim().split(';');
      const q = params.find((p) => p.trim().startsWith('q='));
      return { lang: tag.toLowerCase().split('-')[0], q: q ? Number(q.split('=')[1]) || 0 : 1 };
    })
    .sort((a, b) => b.q - a.q);
  for (const r of ranked) if (isLocale(r.lang)) return r.lang;
  return DEFAULT_LOCALE;
}

/** Swap (or add) the locale prefix of a pathname. */
export function localizePath(pathname: string, locale: Locale): string {
  const parts = pathname.split('/');
  if (isLocale(parts[1])) parts[1] = locale;
  else parts.splice(1, 0, locale);
  const out = parts.join('/');
  return out.endsWith('/') && out.length > 1 ? out.slice(0, -1) : out;
}

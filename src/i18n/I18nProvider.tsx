'use client';
/* ============================================================
   Client i18n context. The server picks the locale from the URL
   (/en/…, /it/…); switching language on the client swaps the
   dictionary in place — no navigation, so a match in progress
   survives — then rewrites the URL and remembers the choice.
   ============================================================ */
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { DICTIONARIES, type Dict } from './index';
import { LOCALE_COOKIE, LOCALE_TAG, localizePath, type Locale } from './config';

interface I18n {
  lang: Locale;
  d: Dict;
  setLang: (l: Locale) => void;
  /** prefix an app path with the active locale */
  href: (path: string) => string;
}

const Ctx = createContext<I18n | null>(null);

/** Map the current document title to the same page's title in another language. */
function translateTitle(title: string, from: Dict, to: Dict): string {
  const pages = ['playTitle', 'codexTitle', 'rulesTitle'] as const;
  if (title === from.meta.title) return to.meta.title;
  for (const p of pages) {
    if (title === from.meta.titleTemplate.replace('%s', from.meta[p])) return to.meta.titleTemplate.replace('%s', to.meta[p]);
  }
  return title;
}

export function I18nProvider({ lang, children }: { lang: Locale; children: ReactNode }) {
  // a choice made on the client wins until the route's own locale changes
  const [choice, setChoice] = useState<{ base: Locale; value: Locale }>({ base: lang, value: lang });
  const current = choice.base === lang ? choice.value : lang;

  const setLang = useCallback(
    (l: Locale) => {
      setChoice({ base: lang, value: l });
      try {
        document.cookie = `${LOCALE_COOKIE}=${l}; path=/; max-age=31536000; samesite=lax`;
        document.documentElement.lang = LOCALE_TAG[l];
        document.title = translateTitle(document.title, DICTIONARIES[current], DICTIONARIES[l]);
        const url = localizePath(window.location.pathname, l) + window.location.search + window.location.hash;
        window.history.replaceState(window.history.state, '', url);
      } catch {
        /* non-browser environment */
      }
    },
    [lang, current],
  );

  const value = useMemo<I18n>(
    () => ({
      lang: current,
      d: DICTIONARIES[current],
      setLang,
      href: (path: string) => `/${current}${path === '/' ? '' : path}`,
    }),
    [current, setLang],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useI18n(): I18n {
  const v = useContext(Ctx);
  if (!v) throw new Error('useI18n must be used inside <I18nProvider>');
  return v;
}

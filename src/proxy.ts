import { NextResponse, type NextRequest } from 'next/server';
import { LOCALE_COOKIE, isLocale, negotiate } from '@/i18n/config';

/**
 * Every page lives under /en or /it. Requests without a locale prefix are
 * redirected: a remembered choice (cookie) wins, then Accept-Language.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const first = pathname.split('/')[1];
  if (isLocale(first)) return;
  const saved = request.cookies.get(LOCALE_COOKIE)?.value;
  const locale = isLocale(saved) ? saved : negotiate(request.headers.get('accept-language'));
  const url = request.nextUrl.clone();
  url.pathname = `/${locale}${pathname === '/' ? '' : pathname}`;
  return NextResponse.redirect(url);
}

export const config = {
  // skip Next internals and file-like paths (icon.svg, robots.txt, sitemap.xml, manifest…)
  matcher: ['/((?!_next|.*\\..*).*)'],
};

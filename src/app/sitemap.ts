import type { MetadataRoute } from 'next';
import { LOCALES } from '@/i18n/config';
import { SITE, languageAlternates } from '@/lib/site';

export default function sitemap(): MetadataRoute.Sitemap {
  const paths = ['', '/play', '/codex', '/rules'];
  return paths.flatMap((p) =>
    LOCALES.map((l) => ({
      url: `${SITE}/${l}${p}`,
      changeFrequency: 'monthly' as const,
      priority: p === '' ? 1 : 0.7,
      alternates: { languages: languageAlternates(p) },
    })),
  );
}

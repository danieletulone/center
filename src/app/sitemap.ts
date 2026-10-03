import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://center.waract.game';
  return ['', '/play', '/codex', '/rules'].map((p) => ({ url: `${site}${p}`, changeFrequency: 'monthly', priority: p === '' ? 1 : 0.7 }));
}

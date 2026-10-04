import type { Metadata } from 'next';
import { Codex } from '@/ui/Codex';
import { getDict } from '@/i18n';
import { isLocale } from '@/i18n/config';
import { pageAlternates } from '@/lib/site';

export async function generateMetadata({ params }: PageProps<'/[lang]/codex'>): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const d = getDict(lang);
  return { title: d.meta.codexTitle, description: d.meta.codexDescription, alternates: pageAlternates(lang, '/codex') };
}

export default function CodexPage() {
  return <Codex />;
}

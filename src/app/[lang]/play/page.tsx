import type { Metadata } from 'next';
import { Play } from '@/ui/Play';
import { getDict } from '@/i18n';
import { isLocale } from '@/i18n/config';
import { pageAlternates } from '@/lib/site';

export async function generateMetadata({ params }: PageProps<'/[lang]/play'>): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const d = getDict(lang);
  return { title: d.meta.playTitle, description: d.meta.playDescription, alternates: pageAlternates(lang, '/play') };
}

export default function PlayPage() {
  return <Play />;
}

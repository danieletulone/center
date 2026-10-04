import type { Metadata } from 'next';
import { Rules } from '@/ui/Rules';
import { getDict } from '@/i18n';
import { isLocale } from '@/i18n/config';
import { pageAlternates } from '@/lib/site';

export async function generateMetadata({ params }: PageProps<'/[lang]/rules'>): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const d = getDict(lang);
  return { title: d.meta.rulesTitle, description: d.meta.rulesDescription, alternates: pageAlternates(lang, '/rules') };
}

export default function RulesPage() {
  return <Rules />;
}

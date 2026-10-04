import type { Metadata, Viewport } from 'next';
import { notFound } from 'next/navigation';
import { Jomolhari, Jura, Karantina } from 'next/font/google';
import { I18nProvider } from '@/i18n/I18nProvider';
import { LOCALES, LOCALE_TAG, OG_LOCALE, isLocale } from '@/i18n/config';
import { getDict } from '@/i18n';
import { SITE, pageAlternates } from '@/lib/site';
import '../globals.css';

const jomolhari = Jomolhari({ weight: '400', subsets: ['latin'], variable: '--font-jomolhari', display: 'swap' });
const karantina = Karantina({ weight: ['300', '400', '700'], subsets: ['latin'], variable: '--font-karantina', display: 'swap' });
const jura = Jura({ subsets: ['latin'], variable: '--font-jura', display: 'swap' });

export const dynamicParams = false;

export function generateStaticParams() {
  return LOCALES.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: LayoutProps<'/[lang]'>): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const d = getDict(lang);
  return {
    metadataBase: new URL(SITE),
    title: { default: d.meta.title, template: d.meta.titleTemplate },
    description: d.meta.description,
    applicationName: 'CENTER',
    keywords: d.meta.keywords.split(',').map((k) => k.trim()),
    authors: [{ name: 'Waract' }],
    alternates: pageAlternates(lang, ''),
    openGraph: {
      type: 'website',
      siteName: 'CENTER',
      locale: OG_LOCALE[lang],
      alternateLocale: LOCALES.filter((l) => l !== lang).map((l) => OG_LOCALE[l]),
      title: d.meta.title,
      description: d.meta.shortDescription,
    },
    twitter: { card: 'summary_large_image', title: d.meta.title, description: d.meta.shortDescription },
  };
}

export const viewport: Viewport = {
  themeColor: '#000000',
  colorScheme: 'dark',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default async function RootLayout({ children, params }: LayoutProps<'/[lang]'>) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  return (
    <html lang={LOCALE_TAG[lang]} className={`${jomolhari.variable} ${karantina.variable} ${jura.variable}`}>
      <body>
        <I18nProvider lang={lang}>{children}</I18nProvider>
      </body>
    </html>
  );
}

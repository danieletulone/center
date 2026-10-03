import type { Metadata, Viewport } from 'next';
import { Jomolhari, Jura, Karantina } from 'next/font/google';
import './globals.css';

const jomolhari = Jomolhari({ weight: '400', subsets: ['latin'], variable: '--font-jomolhari', display: 'swap' });
const karantina = Karantina({ weight: ['300', '400', '700'], subsets: ['latin'], variable: '--font-karantina', display: 'swap' });
const jura = Jura({ subsets: ['latin'], variable: '--font-jura', display: 'swap' });

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://center.waract.game';

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: {
    default: 'CENTER — A turn-based tug-of-war for four',
    template: '%s · CENTER',
  },
  description:
    'Single point of contention. Four ways to want it. A ritual card strategy game: 82 cards, four elements, eighteen Genesis cards — pull the Center toward you before your rivals do.',
  applicationName: 'CENTER',
  keywords: ['card game', 'strategy', 'deckbuilder', 'browser game', 'tug-of-war', 'Waract', 'webgl'],
  authors: [{ name: 'Waract' }],
  openGraph: {
    type: 'website',
    siteName: 'CENTER',
    title: 'CENTER — A turn-based tug-of-war for four',
    description: 'Single point of contention. Four ways to want it.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CENTER — A turn-based tug-of-war for four',
    description: 'Single point of contention. Four ways to want it.',
  },
};

export const viewport: Viewport = {
  themeColor: '#000000',
  colorScheme: 'dark',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${jomolhari.variable} ${karantina.variable} ${jura.variable}`}>
      <body>{children}</body>
    </html>
  );
}

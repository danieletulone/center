'use client';
import Link from 'next/link';
import { Flourish } from '@/ds/Flourish';
import { useI18n } from '@/i18n/I18nProvider';

export default function NotFound() {
  const { d, href } = useI18n();
  return (
    <main style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24, textAlign: 'center', padding: 24 }}>
      <div className="wa-label" style={{ color: 'var(--graphite-400)' }}>{d.notFound.kicker}</div>
      <h1 className="wa-title" style={{ fontSize: 96, margin: 0, letterSpacing: '0.3em', textIndent: '0.3em' }}>404</h1>
      <Flourish width={260} />
      <Link href={href('/')} className="wa-label" style={{ fontSize: 14, marginTop: 10 }}>
        {d.notFound.back}
      </Link>
    </main>
  );
}

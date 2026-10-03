import Link from 'next/link';
import { Flourish } from '@/ds/Flourish';

export default function NotFound() {
  return (
    <main style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24, textAlign: 'center', padding: 24 }}>
      <div className="wa-label" style={{ color: 'var(--graphite-400)' }}>Lost in the void</div>
      <h1 className="wa-title" style={{ fontSize: 96, margin: 0, letterSpacing: '0.3em', textIndent: '0.3em' }}>404</h1>
      <Flourish width={260} />
      <Link href="/" className="wa-label" style={{ fontSize: 14, marginTop: 10 }}>
        Return to the Center
      </Link>
    </main>
  );
}

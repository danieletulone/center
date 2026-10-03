'use client';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useMemo } from 'react';
import { useStored } from '@/lib/useStored';
import { ElementOrb } from '@/ds/ElementOrb';
import { Flourish } from '@/ds/Flourish';
import { Label } from '@/ds/Label';
import { sfx } from '@/lib/audio';
import styles from './Title.module.css';

const TitleScene = dynamic(() => import('@/three/TitleScene'), { ssr: false });

const ITEMS = [
  { href: '/play', label: 'Enter the Center', sub: 'Play against three rivals' },
  { href: '/codex', label: 'Codex', sub: 'All 82 cards' },
  { href: '/rules', label: 'Rules', sub: 'How the tug is won' },
];

export function Title() {
  const raw = useStored('center.stats.v1');
  const stats = useMemo<{ wins: number; played: number } | null>(() => {
    try {
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, [raw]);
  return (
    <main className={styles.main} onPointerDown={() => sfx.unlock()}>
      <div className={styles.scene} aria-hidden="true">
        <TitleScene />
      </div>
      <div className={styles.veil} aria-hidden="true" />
      <div className={styles.content}>
        <div className={styles.kicker}>A turn-based tug-of-war for four</div>
        <h1 className={styles.title}>Center</h1>
        <div className={styles.sub}>Single point of contention. Four ways to want it.</div>
        <div className={styles.flourish}>
          <Flourish width={360} />
        </div>
        <nav className={styles.menu} aria-label="Main">
          {ITEMS.map((it, i) => (
            <Link
              key={it.href}
              href={it.href}
              className={styles.item}
              style={{ animationDelay: `${600 + i * 120}ms` }}
              onMouseEnter={() => sfx.play('hover')}
              onClick={() => sfx.play('select')}
            >
              <span className={styles.itemLabel}>{it.label}</span>
              <span className={styles.itemSub}>{it.sub}</span>
              <svg className={styles.cut} width="104" height="13" viewBox="0 0 104 13" aria-hidden="true">
                <path d="M 0 12 L 72 12 L 88 1 L 104 1" fill="none" stroke="currentColor" strokeWidth="1.4" />
              </svg>
            </Link>
          ))}
        </nav>
      </div>
      <footer className={styles.footer}>
        <div className={styles.legend}>
          {(
            [
              ['fire', 'Plasma'],
              ['ice', 'Cryo'],
              ['arcane', 'Particle'],
              ['flux', 'Flux'],
            ] as const
          ).map(([el, name]) => (
            <div key={el} className={styles.legendItem}>
              <ElementOrb element={el} size={16} />
              <Label size="nano" color="faint">{name}</Label>
            </div>
          ))}
        </div>
        <div className={styles.meta}>
          {stats && stats.played > 0 ? (
            <Label size="nano" color="faint">
              {stats.wins} / {stats.played} claimed
            </Label>
          ) : (
            <Label size="nano" color="faint">A Waract game</Label>
          )}
        </div>
      </footer>
    </main>
  );
}

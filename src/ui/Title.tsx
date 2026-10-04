'use client';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useMemo } from 'react';
import { useStored } from '@/lib/useStored';
import { ElementOrb } from '@/ds/ElementOrb';
import { Flourish } from '@/ds/Flourish';
import { Label } from '@/ds/Label';
import { sfx } from '@/lib/audio';
import { fmt } from '@/i18n';
import { useI18n } from '@/i18n/I18nProvider';
import { LangSwitch } from './LangSwitch';
import styles from './Title.module.css';

const TitleScene = dynamic(() => import('@/three/TitleScene'), { ssr: false });


export function Title() {
  const { d, href } = useI18n();
  const items = [
    { href: href('/play'), label: d.title.enter, sub: d.title.enterSub },
    { href: href('/codex'), label: d.title.codex, sub: d.title.codexSub },
    { href: href('/rules'), label: d.title.rules, sub: d.title.rulesSub },
  ];
  const raw = useStored('center.stats.v1');
  const stats = useMemo<{ wins: number; played: number } | null>(() => {
    try {
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, [raw]);
  return (
    <main
      className={styles.main}
      onPointerDown={() => {
        sfx.setScene('title');
        sfx.unlock();
      }}
    >
      <div className={styles.scene} aria-hidden="true">
        <TitleScene />
      </div>
      <div className={styles.veil} aria-hidden="true" />
      <div className={styles.content}>
        <div className={styles.kicker}>{d.common.kicker}</div>
        <h1 className={styles.title}>Center</h1>
        <div className={styles.sub}>{d.common.tagline}</div>
        <div className={styles.flourish}>
          <Flourish width={360} />
        </div>
        <nav className={styles.menu} aria-label={d.title.nav}>
          {items.map((it, i) => (
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
          {(['fire', 'ice', 'arcane', 'flux'] as const).map((el) => (
            <div key={el} className={styles.legendItem}>
              <ElementOrb element={el} size={16} />
              <Label size="nano" color="faint">{d.elements[el]}</Label>
            </div>
          ))}
        </div>
        <div className={styles.meta}>
          <LangSwitch />
          {stats && stats.played > 0 ? (
            <Label size="nano" color="faint">
              {fmt(d.title.claimed, { wins: stats.wins, played: stats.played })}
            </Label>
          ) : (
            <Label size="nano" color="faint">{d.common.studio}</Label>
          )}
        </div>
      </footer>
    </main>
  );
}

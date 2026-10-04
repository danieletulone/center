'use client';
import Link from 'next/link';
import { Flourish } from '@/ds/Flourish';
import { ElementOrb } from '@/ds/ElementOrb';
import { TemperamentMark } from '@/ds/GenesisCard';
import { CONVERGENCE_ROUNDS, DRAW_PER_TURN, GENESIS_FROM_ROUND, HAND_MAX, HAND_START, MAX_PLAYS, MAX_ROUNDS, WIN_PULL } from '@/game/engine';
import { fmt } from '@/i18n';
import { rich } from '@/i18n/rich';
import { useI18n } from '@/i18n/I18nProvider';
import type { Temperament } from '@/game/types';
import { LangSwitch } from './LangSwitch';
import styles from './Rules.module.css';

const ELS = ['fire', 'ice', 'arcane', 'flux'] as const;
const TEMPERS: Temperament[] = ['ascendant', 'malefic', 'tempered'];

export function Rules() {
  const { d, href } = useI18n();
  const r = d.rules;
  return (
    <main className={styles.page}>
      <nav className={styles.nav}>
        <Link href={href('/')}>{d.common.backHome}</Link>
        <LangSwitch />
        <Link href={href('/play')}>{d.common.toPlay}</Link>
      </nav>
      <header className={styles.head}>
        <div className={styles.kicker}>{r.kicker}</div>
        <h1>{r.title}</h1>
        <Flourish width={300} />
      </header>

      <section>
        <h2>{r.tug.h}</h2>
        <p>{rich(fmt(r.tug.p, { win: WIN_PULL, rounds: MAX_ROUNDS }))}</p>
        <ul>
          {r.tug.items.map((t, i) => (
            <li key={i}>{rich(t)}</li>
          ))}
        </ul>
      </section>

      <section>
        <h2>{r.turn.h}</h2>
        <ol>
          {r.turn.steps.map((t, i) => (
            <li key={i}>{rich(fmt(t, { draw: DRAW_PER_TURN, start: HAND_START, max: HAND_MAX, plays: MAX_PLAYS }))}</li>
          ))}
        </ol>
      </section>

      <section>
        <h2>{r.elements.h}</h2>
        <div className={styles.elements}>
          {ELS.map((el) => (
            <div key={el} className={styles.el}>
              <ElementOrb element={el} size={28} />
              <div>
                <h3>{d.elements[el]}</h3>
                <p>{r.elements[el]}</p>
              </div>
            </div>
          ))}
        </div>
        <p>{rich(r.elements.triangle)}</p>
      </section>

      <section>
        <h2>{r.reach.h}</h2>
        <p>{rich(r.reach.p1)}</p>
        <p>{rich(r.reach.p2)}</p>
      </section>

      <section>
        <h2>{r.defense.h}</h2>
        <p>{rich(r.defense.p)}</p>
      </section>

      <section>
        <h2>{r.genesis.h}</h2>
        <p>{rich(fmt(r.genesis.p, { from: GENESIS_FROM_ROUND }))}</p>
        <div className={styles.tempers}>
          {TEMPERS.map((t, i) => (
            <span key={t}>
              <TemperamentMark temperament={t} /> {r.genesis.beats[i]}
            </span>
          ))}
        </div>
        <p>{rich(r.genesis.empower)}</p>
      </section>

      <section>
        <h2>{r.convergence.h}</h2>
        <p>{rich(fmt(r.convergence.p, { r1: CONVERGENCE_ROUNDS[0], r2: CONVERGENCE_ROUNDS[1], r3: CONVERGENCE_ROUNDS[2] }))}</p>
      </section>

      <section>
        <h2>{r.controls.h}</h2>
        <ul>
          {r.controls.items.map((t, i) => (
            <li key={i}>{rich(t)}</li>
          ))}
        </ul>
      </section>

      <footer className={styles.foot}>
        <Flourish width={240} flip />
        <Link href={href('/play')} className={styles.cta}>
          {r.cta}
        </Link>
      </footer>
    </main>
  );
}

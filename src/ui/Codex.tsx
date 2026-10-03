'use client';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { BASE_SECTIONS, GENESIS_SECTIONS, cardDef } from '@/game/cards';
import { Card } from '@/ds/Card';
import { ElementOrb } from '@/ds/ElementOrb';
import { Flourish } from '@/ds/Flourish';
import { Label } from '@/ds/Label';
import { HoloCard } from './HoloCard';
import styles from './Codex.module.css';

type Filter = 'all' | 'fire' | 'ice' | 'arcane' | 'flux' | 'genesis';
const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'fire', label: 'Plasma' },
  { id: 'ice', label: 'Cryo' },
  { id: 'arcane', label: 'Particle' },
  { id: 'flux', label: 'Flux' },
  { id: 'genesis', label: 'Genesis' },
];

export function Codex() {
  const [filter, setFilter] = useState<Filter>('all');
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const [cw, setCw] = useState(248);
  useEffect(() => {
    const f = () => setCw(window.innerWidth < 640 ? Math.floor((window.innerWidth - 48) / 2) : 248);
    f();
    window.addEventListener('resize', f);
    return () => window.removeEventListener('resize', f);
  }, []);
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(null);
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [open]);

  const query = q.trim().toLowerCase();
  const match = (title: string, text: string) => !query || title.toLowerCase().includes(query) || text.toLowerCase().includes(query);

  const base = useMemo(
    () =>
      filter === 'genesis'
        ? []
        : BASE_SECTIONS.map((s) => ({ ...s, cards: s.cards.filter((c) => (filter === 'all' || c.element === filter) && match(c.title, c.effect)) })).filter((s) => s.cards.length),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filter, query],
  );
  const genesis = useMemo(
    () =>
      filter === 'all' || filter === 'genesis'
        ? GENESIS_SECTIONS.map((s) => ({ ...s, cards: s.cards.filter((c) => match(c.title, c.effect + c.trigger)) })).filter((s) => s.cards.length)
        : [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filter, query],
  );
  const total = base.reduce((a, s) => a + s.cards.length, 0) + genesis.reduce((a, s) => a + s.cards.length, 0);

  return (
    <main className={styles.page}>
      <nav className={styles.nav}>
        <Link href="/" className={styles.back}>
          ◂ Center
        </Link>
        <Link href="/play" className={styles.back}>
          Play ▸
        </Link>
      </nav>
      <header className={styles.masthead}>
        <div className={styles.kicker}>A turn-based tug-of-war for four</div>
        <h1 className={styles.h1}>Codex</h1>
        <div className={styles.sub}>Single point of contention. Four ways to want it.</div>
        <div className={styles.counts}>
          <span>
            <b>82</b> Cards
          </span>
          <span>
            <b>64</b> Base Library
          </span>
          <span>
            <b>18</b> Genesis
          </span>
          <span>
            <b>4</b> Elements
          </span>
        </div>
        <div className={styles.rule} />
      </header>

      <div className={styles.controls}>
        <div className={styles.filters} role="tablist">
          {FILTERS.map((f) => (
            <button key={f.id} role="tab" aria-selected={filter === f.id} className={[styles.filter, filter === f.id ? styles.filterOn : ''].join(' ')} onClick={() => setFilter(f.id)}>
              {f.id !== 'all' && f.id !== 'genesis' && <ElementOrb element={f.id} size={14} />}
              <span>{f.label}</span>
            </button>
          ))}
        </div>
        <input className={styles.search} placeholder="Search cards" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search cards" />
      </div>
      <div className={styles.tally}>
        <Label size="nano" color="faint">{total} shown</Label>
      </div>

      {base.map((s) => (
        <section key={s.name} className={styles.section}>
          <div className={styles.sectionHead}>
            <h2>{s.name}</h2>
            <span className={styles.count}>{s.cards.length}</span>
            <span className={styles.blurb}>{s.blurb}</span>
          </div>
          <div className={styles.grid}>
            {s.cards.map((c, i) => (
              <HoloCard key={c.id} onClick={() => setOpen(c.id)} className={styles.cell} style={{ animationDelay: `${i * 30}ms` }} ariaLabel={c.title}>
                <Card id={c.id} width={cw} />
              </HoloCard>
            ))}
          </div>
        </section>
      ))}

      {genesis.length > 0 && (
        <div className={styles.genesisBand}>
          <div className={styles.kicker}>The Eureka Layer</div>
          <h2 className={styles.h2}>Genesis</h2>
          <p>
            Not in any deck. Each one materialises into your hand the moment its trigger is met. Three temperaments — Ascendant overruns Tempered, Malefic punishes Ascendant, Tempered outlasts Malefic.
          </p>
        </div>
      )}
      {genesis.map((s) => (
        <section key={s.name} className={styles.section}>
          <div className={styles.sectionHead}>
            <h2>{s.name}</h2>
            <span className={styles.count}>{s.cards.length}</span>
            <span className={styles.blurb}>{s.blurb}</span>
          </div>
          <div className={styles.grid}>
            {s.cards.map((c, i) => (
              <HoloCard key={c.id} foil onClick={() => setOpen(c.id)} className={styles.cell} style={{ animationDelay: `${i * 30}ms` }} ariaLabel={c.title}>
                <Card id={c.id} width={cw} />
              </HoloCard>
            ))}
          </div>
        </section>
      ))}
      {total === 0 && <div className={styles.empty}>Nothing answers to “{q}”.</div>}

      <footer className={styles.footer}>
        <Flourish width={300} />
        <Label size="nano" color="faint">Center · a Waract game</Label>
      </footer>

      {open && (
        <div className={styles.overlay} onClick={() => setOpen(null)} role="dialog" aria-modal="true" aria-label={cardDef(open).title}>
          <div className={styles.zoom} onClick={(e) => e.stopPropagation()}>
            <HoloCard foil={cardDef(open).kind === 'genesis'} intensity={1.5}>
              <Card id={open} width={Math.min(360, cw * 1.7)} />
            </HoloCard>
            <button className={styles.close} onClick={() => setOpen(null)}>
              Close
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

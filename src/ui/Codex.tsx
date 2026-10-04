'use client';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { BASE_SECTIONS, GENESIS_SECTIONS, cardDef } from '@/game/cards';
import { Card } from '@/ds/Card';
import { ElementOrb } from '@/ds/ElementOrb';
import { Flourish } from '@/ds/Flourish';
import { Label } from '@/ds/Label';
import { HoloCard } from './HoloCard';
import { fmt } from '@/i18n';
import { useI18n } from '@/i18n/I18nProvider';
import { LangSwitch } from './LangSwitch';
import styles from './Codex.module.css';

type Filter = 'all' | 'fire' | 'ice' | 'arcane' | 'flux' | 'genesis';
const FILTERS: Filter[] = ['all', 'fire', 'ice', 'arcane', 'flux', 'genesis'];

/** case- and accent-insensitive search key */
const norm = (v: string) => v.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
type CardText = { title: string; effect: string; trigger?: string; selfCost?: string };

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

  const { d, href } = useI18n();
  const texts = d.cards as Record<string, CardText>;
  const query = norm(q.trim());
  const match = (id: string) => {
    if (!query) return true;
    const t = texts[id];
    return norm([t.title, t.effect, t.trigger ?? '', t.selfCost ?? ''].join(' ')).includes(query);
  };

  const base = useMemo(
    () =>
      filter === 'genesis'
        ? []
        : BASE_SECTIONS.map((s) => ({ ...s, cards: s.cards.filter((c) => (filter === 'all' || c.element === filter) && match(c.id)) })).filter((s) => s.cards.length),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filter, query, d],
  );
  const genesis = useMemo(
    () =>
      filter === 'all' || filter === 'genesis'
        ? GENESIS_SECTIONS.map((s) => ({ ...s, cards: s.cards.filter((c) => match(c.id)) })).filter((s) => s.cards.length)
        : [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filter, query, d],
  );
  const total = base.reduce((a, s) => a + s.cards.length, 0) + genesis.reduce((a, s) => a + s.cards.length, 0);

  return (
    <main className={styles.page}>
      <nav className={styles.nav}>
        <Link href={href('/')} className={styles.back}>
          {d.common.backHome}
        </Link>
        <LangSwitch />
        <Link href={href('/play')} className={styles.back}>
          {d.common.toPlay}
        </Link>
      </nav>
      <header className={styles.masthead}>
        <div className={styles.kicker}>{d.common.kicker}</div>
        <h1 className={styles.h1}>{d.codex.title}</h1>
        <div className={styles.sub}>{d.common.tagline}</div>
        <div className={styles.counts}>
          <span>
            <b>82</b> {d.codex.counts.cards}
          </span>
          <span>
            <b>64</b> {d.codex.counts.base}
          </span>
          <span>
            <b>18</b> {d.codex.counts.genesis}
          </span>
          <span>
            <b>4</b> {d.codex.counts.elements}
          </span>
        </div>
        <div className={styles.rule} />
      </header>

      <div className={styles.controls}>
        <div className={styles.filters} role="tablist">
          {FILTERS.map((f) => (
            <button key={f} role="tab" aria-selected={filter === f} className={[styles.filter, filter === f ? styles.filterOn : ''].join(' ')} onClick={() => setFilter(f)}>
              {f !== 'all' && f !== 'genesis' && <ElementOrb element={f} size={14} />}
              <span>{f === 'all' ? d.codex.all : f === 'genesis' ? d.codex.genesis : d.elements[f]}</span>
            </button>
          ))}
        </div>
        <input className={styles.search} placeholder={d.codex.search} value={q} onChange={(e) => setQ(e.target.value)} aria-label={d.codex.search} />
      </div>
      <div className={styles.tally}>
        <Label size="nano" color="faint">{fmt(d.codex.shown, { n: total })}</Label>
      </div>

      {base.map((s) => (
        <section key={s.name} className={styles.section}>
          <div className={styles.sectionHead}>
            <h2>{d.sections[s.name].name}</h2>
            <span className={styles.count}>{s.cards.length}</span>
            <span className={styles.blurb}>{d.sections[s.name].blurb}</span>
          </div>
          <div className={styles.grid}>
            {s.cards.map((c, i) => (
              <HoloCard key={c.id} onClick={() => setOpen(c.id)} className={styles.cell} style={{ animationDelay: `${i * 30}ms` }} ariaLabel={texts[c.id].title}>
                <Card id={c.id} width={cw} />
              </HoloCard>
            ))}
          </div>
        </section>
      ))}

      {genesis.length > 0 && (
        <div className={styles.genesisBand}>
          <div className={styles.kicker}>{d.codex.genesisKicker}</div>
          <h2 className={styles.h2}>{d.codex.genesisHead}</h2>
          <p>{d.codex.genesisBody}</p>
        </div>
      )}
      {genesis.map((s) => (
        <section key={s.name} className={styles.section}>
          <div className={styles.sectionHead}>
            <h2>{d.sections[s.name].name}</h2>
            <span className={styles.count}>{s.cards.length}</span>
            <span className={styles.blurb}>{d.sections[s.name].blurb}</span>
          </div>
          <div className={styles.grid}>
            {s.cards.map((c, i) => (
              <HoloCard key={c.id} foil onClick={() => setOpen(c.id)} className={styles.cell} style={{ animationDelay: `${i * 30}ms` }} ariaLabel={texts[c.id].title}>
                <Card id={c.id} width={cw} />
              </HoloCard>
            ))}
          </div>
        </section>
      ))}
      {total === 0 && <div className={styles.empty}>{fmt(d.codex.empty, { q })}</div>}

      <footer className={styles.footer}>
        <Flourish width={300} />
        <Label size="nano" color="faint">{d.common.studioFull}</Label>
      </footer>

      {open && (
        <div className={styles.overlay} onClick={() => setOpen(null)} role="dialog" aria-modal="true" aria-label={texts[open].title}>
          <div className={styles.zoom} onClick={(e) => e.stopPropagation()}>
            <HoloCard foil={cardDef(open).kind === 'genesis'} intensity={1.5}>
              <Card id={open} width={Math.min(360, cw * 1.7)} />
            </HoloCard>
            <button className={styles.close} onClick={() => setOpen(null)}>
              {d.common.close}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

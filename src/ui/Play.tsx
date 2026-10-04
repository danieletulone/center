'use client';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useGame } from '@/game/store';
import type { Difficulty } from '@/game/types';
import { Button } from '@/ds/Button';
import { Flourish } from '@/ds/Flourish';
import { Label } from '@/ds/Label';
import { StarRating } from '@/ds/StarRating';
import { sfx } from '@/lib/audio';
import { useStored } from '@/lib/useStored';
import { DICTIONARIES } from '@/i18n';
import { useI18n } from '@/i18n/I18nProvider';
import { LangSwitch } from './LangSwitch';
import { Hud } from './Hud';
import styles from './Play.module.css';

const GameScene = dynamic(() => import('@/three/GameScene'), {
  ssr: false,
  loading: () => <Loading />,
});

function Loading() {
  const { d } = useI18n();
  return (
    <div className={styles.loading}>
      <span className={styles.loadingOrb} />
      <Label size="micro" color="secondary">{d.setup.loading}</Label>
    </div>
  );
}

const LEVELS: { id: Difficulty; stars: number }[] = [
  { id: 'initiate', stars: 1 },
  { id: 'adept', stars: 2 },
  { id: 'archon', stars: 3 },
];

const RIVALS = [
  { name: 'Albert', persona: 'aggressor' },
  { name: 'Sophia', persona: 'trickster' },
  { name: 'John', persona: 'warden' },
] as const;

/** A typed name equal to "You" in any language means "keep the default". */
const DEFAULT_NAMES = Object.values(DICTIONARIES).map((x) => x.common.you.toLowerCase());

function Setup() {
  const { d, href } = useI18n();
  const start = useGame((s) => s.start);
  const storedName = useStored('center.name');
  const storedLevel = useStored('center.level') as Difficulty | null;
  const [nameEdit, setName] = useState<string | null>(null);
  const [levelPick, setLevel] = useState<Difficulty | null>(null);
  const name = nameEdit ?? (storedName && !DEFAULT_NAMES.includes(storedName.toLowerCase()) ? storedName : '');
  const level: Difficulty = levelPick ?? (storedLevel && LEVELS.some((l) => l.id === storedLevel) ? storedLevel : 'adept');
  const begin = () => {
    sfx.unlock();
    try {
      localStorage.setItem('center.name', name);
      localStorage.setItem('center.level', level);
    } catch {
      /* ignore */
    }
    const custom = name.trim();
    start({ difficulty: level, name: custom && !DEFAULT_NAMES.includes(custom.toLowerCase()) ? custom : undefined });
  };
  return (
    <div className={styles.setup}>
      <form
        className={styles.panel}
        onSubmit={(e) => {
          e.preventDefault();
          begin();
        }}
      >
        <Label size="micro" color="secondary">{d.setup.kicker}</Label>
        <h1 className={styles.heading}>{d.setup.heading}</h1>
        <Flourish width={280} />
        <label className={styles.field}>
          <Label size="nano" color="faint">{d.setup.name}</Label>
          <input
            className={styles.input}
            value={name}
            placeholder={d.common.you}
            maxLength={12}
            onChange={(e) => setName(e.target.value)}
            autoComplete="off"
            spellCheck={false}
          />
        </label>
        <div className={styles.field}>
          <Label size="nano" color="faint">{d.setup.rivals}</Label>
          <div className={styles.levels} role="radiogroup" aria-label={d.setup.difficulty}>
            {LEVELS.map((l) => (
              <button
                type="button"
                key={l.id}
                role="radio"
                aria-checked={level === l.id}
                className={[styles.level, level === l.id ? styles.levelOn : ''].join(' ')}
                onClick={() => {
                  setLevel(l.id);
                  sfx.play('select');
                }}
              >
                <StarRating value={l.stars} max={3} size={11} gap={4} color={level === l.id ? 'var(--bone)' : 'var(--graphite-500)'} />
                <span className={styles.levelName}>{d.setup.levels[l.id].name}</span>
                <span className={styles.levelSub}>{d.setup.levels[l.id].sub}</span>
              </button>
            ))}
          </div>
        </div>
        <div className={styles.rivals}>
          {RIVALS.map((r) => (
            <span key={r.name}>
              {r.name} <em>{d.setup.personas[r.persona]}</em>
            </span>
          ))}
        </div>
        <div className={styles.actions}>
          <Button variant="frame" type="submit">
            {d.setup.begin}
          </Button>
          <Link href={href('/')}>
            <Button size="label">{d.common.back}</Button>
          </Link>
          <LangSwitch />
        </div>
      </form>
    </div>
  );
}

export function Play() {
  const has = useGame((s) => !!s.game);
  const quit = useGame((s) => s.quit);
  useEffect(() => () => quit(), [quit]);
  return (
    <main className={styles.main}>
      <GameScene />
      {has ? <Hud /> : <Setup />}
    </main>
  );
}

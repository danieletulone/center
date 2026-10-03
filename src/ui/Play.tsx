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
import { Hud } from './Hud';
import styles from './Play.module.css';

const GameScene = dynamic(() => import('@/three/GameScene'), {
  ssr: false,
  loading: () => (
    <div className={styles.loading}>
      <span className={styles.loadingOrb} />
      <Label size="micro" color="secondary">The Center gathers</Label>
    </div>
  ),
});

const LEVELS: { id: Difficulty; name: string; sub: string; stars: number }[] = [
  { id: 'initiate', name: 'Initiate', sub: 'Rivals hesitate and err', stars: 1 },
  { id: 'adept', name: 'Adept', sub: 'A fair contest', stars: 2 },
  { id: 'archon', name: 'Archon', sub: 'They will not blink', stars: 3 },
];

function Setup() {
  const start = useGame((s) => s.start);
  const storedName = useStored('center.name');
  const storedLevel = useStored('center.level') as Difficulty | null;
  const [nameEdit, setName] = useState<string | null>(null);
  const [levelPick, setLevel] = useState<Difficulty | null>(null);
  const name = nameEdit ?? storedName ?? 'You';
  const level: Difficulty = levelPick ?? (storedLevel && LEVELS.some((l) => l.id === storedLevel) ? storedLevel : 'adept');
  const begin = () => {
    sfx.unlock();
    try {
      localStorage.setItem('center.name', name);
      localStorage.setItem('center.level', level);
    } catch {
      /* ignore */
    }
    start({ difficulty: level, name: name.trim() || 'You' });
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
        <Label size="micro" color="secondary">Take a seat</Label>
        <h1 className={styles.heading}>The Table</h1>
        <Flourish width={280} />
        <label className={styles.field}>
          <Label size="nano" color="faint">Your name</Label>
          <input className={styles.input} value={name} maxLength={12} onChange={(e) => setName(e.target.value)} autoComplete="off" spellCheck={false} />
        </label>
        <div className={styles.field}>
          <Label size="nano" color="faint">Rivals</Label>
          <div className={styles.levels} role="radiogroup" aria-label="Difficulty">
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
                <span className={styles.levelName}>{l.name}</span>
                <span className={styles.levelSub}>{l.sub}</span>
              </button>
            ))}
          </div>
        </div>
        <div className={styles.rivals}>
          <span>Albert <em>the Aggressor</em></span>
          <span>Sophia <em>the Trickster</em></span>
          <span>John <em>the Warden</em></span>
        </div>
        <div className={styles.actions}>
          <Button variant="frame" type="submit">
            Begin
          </Button>
          <Link href="/">
            <Button size="label">Back</Button>
          </Link>
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

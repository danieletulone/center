'use client';
/* ============================================================
   CENTER — in-match HUD (DOM layer over the 3D table)
   ============================================================ */
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useGame } from '@/game/store';
import { CARD_BY_ID, cardDef } from '@/game/cards';
import {
  CONVERGENCE_ROUNDS,
  MAX_ROUNDS,
  WIN_PULL,
  canPlay,
  convergence,
  describeStatus,
  activeStatuses,
  playsAllowed,
  ranking,
} from '@/game/engine';
import { ELEMENTS, ELEMENT_NAME, type GameState } from '@/game/types';
import { Card } from '@/ds/Card';
import { ElementOrb } from '@/ds/ElementOrb';
import { Flourish } from '@/ds/Flourish';
import { Button } from '@/ds/Button';
import { Label } from '@/ds/Label';
import { StarRating } from '@/ds/StarRating';
import { TemperamentMark } from '@/ds/GenesisCard';
import { HoloCard } from './HoloCard';
import { sfx } from '@/lib/audio';
import styles from './Hud.module.css';

/* ---------------- top bar ---------------- */
function TopBar({ onMenu }: { onMenu: () => void }) {
  const g = useGame((s) => s.game)!;
  const conv = convergence(g);
  const nextConv = CONVERGENCE_ROUNDS.find((r) => r > g.round);
  return (
    <div className={styles.top}>
      <div className={styles.turnBox}>
        <Label size="nano" color="faint">Round</Label>
        <span className={styles.turnNum}>{String(g.round).padStart(2, '0')}</span>
        <span className={styles.turnOf}>/ {MAX_ROUNDS}</span>
      </div>
      <div className={styles.goal}>
        <Label size="nano" color="faint">First to</Label>
        <span className={styles.goalNum}>{WIN_PULL}</span>
        <Label size="nano" color="faint">pull</Label>
        {conv > 0 ? (
          <span className={styles.conv} title="Convergence: every pull grows stronger">Convergence +{conv}</span>
        ) : nextConv ? (
          <span className={styles.convSoon}>Convergence · R{nextConv}</span>
        ) : null}
      </div>
      <div className={styles.topRight}>
        <button className={styles.iconBtn} onClick={onMenu} aria-label="Menu">
          <span />
          <span />
          <span />
        </button>
      </div>
    </div>
  );
}

/* ---------------- chronicle ---------------- */
function Chronicle() {
  const g = useGame((s) => s.game)!;
  const [open, setOpen] = useState(() => typeof window === 'undefined' || (window.innerWidth >= 900 && window.innerHeight >= 600));
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.scrollTo({ top: ref.current.scrollHeight, behavior: 'smooth' });
  }, [g.log.length]);
  return (
    <aside className={[styles.chronicle, open ? '' : styles.chronicleClosed].join(' ')}>
      <button className={styles.chronHead} onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <Label size="nano" color="secondary">Chronicle</Label>
        <span className={styles.chev}>{open ? '–' : '+'}</span>
      </button>
      {open && (
        <div className={styles.chronBody} ref={ref}>
          {g.log.slice(-40).map((l) => (
            <div key={l.id} className={styles.logLine} data-tone={l.tone}>
              <span className={styles.logRound}>{String(l.round).padStart(2, '0')}</span>
              <span>{l.text}</span>
            </div>
          ))}
        </div>
      )}
    </aside>
  );
}

/* ---------------- element pool ---------------- */
function PoolBar() {
  const g = useGame((s) => s.game)!;
  const me = g.players[0];
  const allowed = playsAllowed(g, me);
  const left = g.current === 0 ? Math.max(0, allowed - g.playsThisTurn) : allowed;
  const myStatuses = activeStatuses(g, me);
  return (
    <div className={styles.pool}>
      <div className={styles.poolOrbs}>
        {ELEMENTS.map((e) => (
          <div key={e} className={styles.poolItem} title={`${ELEMENT_NAME[e]} — generators +${me.passives.generators[e]}`}>
            <ElementOrb element={e} size={22} />
            <span className={styles.poolNum} data-zero={me.pool[e] === 0}>
              {me.pool[e]}
            </span>
            {me.passives.generators[e] > 0 && <span className={styles.gen}>+{me.passives.generators[e]}</span>}
          </div>
        ))}
      </div>
      <div className={styles.plays}>
        <Label size="nano" color="faint">Plays</Label>
        <StarRating value={left} max={Math.max(allowed, 1)} size={13} gap={5} color="var(--bone)" />
      </div>
      {myStatuses.length > 0 && (
        <div className={styles.myStatus}>
          {myStatuses.slice(0, 4).map((s, i) => {
            const d = describeStatus(s);
            return (
              <span key={i} className={styles.statusChip} data-tone={d.tone}>
                {d.label}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ---------------- hand ---------------- */
function Hand() {
  const { g, selected, select, commit, setInspect, pendingTargets } = useGame(
    useShallow((s) => ({ g: s.game!, selected: s.selected, select: s.select, commit: s.commit, setInspect: s.setInspect, pendingTargets: s.pendingTargets })),
  );
  const me = g.players[0];
  const myTurn = g.current === 0 && g.phase === 'playing';
  const n = me.hand.length;
  const [w, setW] = useState(1280);
  const [h, setH] = useState(800);
  useEffect(() => {
    const f = () => {
      setW(window.innerWidth);
      setH(window.innerHeight);
    };
    f();
    window.addEventListener('resize', f);
    return () => window.removeEventListener('resize', f);
  }, []);
  const cardW = Math.round(Math.min(w < 640 ? 112 : w < 1100 ? 144 : 164, h * 0.24));
  const avail = w < 760 ? w - 24 : w - 2 * Math.min(330, w * 0.24);
  const overlap = Math.max(0, Math.min(cardW * 0.62, (n * cardW - avail) / Math.max(1, n - 1)));
  const sel = me.hand.find((h) => h.uid === selected);
  const selDef = sel ? cardDef(sel.id) : null;

  return (
    <div className={styles.handWrap}>
      {sel && selDef && myTurn && (
        <div className={styles.prompt}>
          {selDef.target === 'none' ? (
            selDef.id === 'rotate' ? (
              <div className={styles.promptRow}>
                <Button variant="frame" size="label" color="flux" onClick={() => commit(-1)}>
                  ◂ Counter-clockwise
                </Button>
                <Button variant="frame" size="label" color="flux" onClick={() => commit(1)}>
                  Clockwise ▸
                </Button>
              </div>
            ) : (
              <Button variant="frame" size="label" color={selDef.kind === 'base' ? selDef.element : 'bone'} onClick={() => commit()}>
                Play {selDef.title}
              </Button>
            )
          ) : (
            <div className={styles.targetPrompt}>
              <span className={styles.targetDot} />
              <Label size="micro" color="ash">
                {selDef.target === 'two-others'
                  ? `Choose two players · ${pendingTargets.length}/2`
                  : selDef.target === 'neighbour'
                    ? 'Choose a neighbour'
                    : selDef.target === 'any-seat'
                      ? 'Choose who to sit beside'
                      : 'Choose a target'}
              </Label>
              <button className={styles.cancel} onClick={() => select(null)}>
                Cancel
              </button>
            </div>
          )}
        </div>
      )}
      <div className={styles.hand} style={{ ['--cw' as string]: `${cardW}px` }}>
        {me.hand.map((c, i) => {
          const chk = canPlay(g, 0, c.uid);
          const isSel = c.uid === selected;
          const mid = (n - 1) / 2;
          const rot = (i - mid) * (n > 6 ? 2.2 : 3.2);
          const lift = Math.abs(i - mid) * Math.abs(i - mid) * 2.2;
          const def = CARD_BY_ID[c.id];
          return (
            <div
              key={c.uid}
              className={[styles.slot, isSel ? styles.slotSel : '', !chk.ok && myTurn ? styles.slotDim : ''].join(' ')}
              style={{
                marginLeft: i === 0 ? 0 : -overlap,
                ['--rot' as string]: `${rot}deg`,
                ['--lift' as string]: `${lift}px`,
                zIndex: isSel ? 50 : i,
                animationDelay: `${i * 50}ms`,
              }}
            >
              <HoloCard
                foil={def.kind === 'genesis'}
                onClick={() => {
                  if (!myTurn) {
                    setInspect(c.id);
                    return;
                  }
                  if (!chk.ok) {
                    useGame.setState({ error: { id: Date.now(), text: chk.reason ?? 'Cannot play' } });
                    sfx.play('deny');
                    return;
                  }
                  select(c.uid);
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setInspect(c.id);
                }}
                onMouseEnter={() => sfx.play('hover')}
                ariaLabel={`${def.title}${chk.ok ? '' : ` — ${chk.reason}`}`}
              >
                <Card id={c.id} width={cardW} />
              </HoloCard>
              {!chk.ok && myTurn && <div className={styles.reason}>{chk.reason}</div>}
              <button
                className={styles.inspectBtn}
                onClick={(e) => {
                  e.stopPropagation();
                  setInspect(c.id);
                }}
                aria-label={`Inspect ${def.title}`}
              >
                ⤢
              </button>
            </div>
          );
        })}
        {n === 0 && <div className={styles.emptyHand}>Your hand is empty</div>}
      </div>
    </div>
  );
}

/* ---------------- first-match hint ---------------- */
function Hint() {
  const { g, stats, selected } = useGame(useShallow((s) => ({ g: s.game!, stats: s.stats, selected: s.selected })));
  const [dismissed, setDismissed] = useState(false);
  if (dismissed || stats.played > 0 || g.round > 2 || g.current !== 0 || g.phase !== 'playing' || selected) return null;
  return (
    <div className={styles.hint}>
      <Label size="nano" color="ash">Select a card · glowing rivals are in reach · right-click to inspect · Enter ends the turn</Label>
      <button className={styles.cancel} onClick={() => setDismissed(true)}>
        Got it
      </button>
    </div>
  );
}

/* ---------------- end turn ---------------- */
function TurnControls() {
  const { g, endMyTurn } = useGame(useShallow((s) => ({ g: s.game!, endMyTurn: s.endMyTurn })));
  const myTurn = g.current === 0 && g.phase === 'playing';
  const actor = g.players[g.current];
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === 'Enter' || e.key === 'e') && myTurn && !(e.target instanceof HTMLInputElement)) endMyTurn();
      if (e.key === 'Escape') useGame.getState().select(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [myTurn, endMyTurn]);
  return (
    <div className={styles.controls}>
      {myTurn ? (
        <Button onClick={endMyTurn} aria-keyshortcuts="Enter">
          End Turn
        </Button>
      ) : g.phase === 'playing' ? (
        <div className={styles.waiting}>
          <span className={styles.spinner} />
          <Label size="micro" color="secondary">
            {actor.name} acts
          </Label>
        </div>
      ) : null}
    </div>
  );
}

/* ---------------- cast display ---------------- */
function CastDisplay() {
  const casts = useGame((s) => s.casts);
  const g = useGame((s) => s.game)!;
  const [shown, setShown] = useState<typeof casts>([]);
  const seen = useRef(new Set<number>());
  useEffect(() => {
    const fresh = casts.filter((c) => !seen.current.has(c.id));
    if (!fresh.length) return;
    fresh.forEach((c) => seen.current.add(c.id));
    setShown((s) => [...s, ...fresh].slice(-3));
    const timers = fresh.map((c) => setTimeout(() => setShown((s) => s.filter((x) => x.id !== c.id)), 2300));
    return () => timers.forEach(clearTimeout);
  }, [casts]);
  return (
    <div className={styles.casts} aria-live="polite">
      {shown.map((c) => {
        const p = g.players[c.player];
        const d = CARD_BY_ID[c.cardId];
        return (
          <div key={c.id} className={styles.cast}>
            <div className={styles.castHead}>
              <span className={styles.castWho}>{p.human ? 'You' : p.name}</span>
              <Label size="nano" color="faint">
                {c.targets.length ? `cast on ${c.targets.map((t) => (g.players[t].human ? 'you' : g.players[t].name)).join(' & ')}` : 'cast'}
              </Label>
            </div>
            <Card id={c.cardId} width={150} />
            <span className="sr-only">{d.title}</span>
          </div>
        );
      })}
    </div>
  );
}

/* ---------------- turn banner ---------------- */
function TurnBanner() {
  const g = useGame((s) => s.game)!;
  const [hiddenSeq, setHiddenSeq] = useState(-1);
  const p = g.players[g.current];
  const seq = g.turnSeq;
  useEffect(() => {
    const t = setTimeout(() => setHiddenSeq(seq), p.human ? 1600 : 1100);
    return () => clearTimeout(t);
  }, [seq, p.human]);
  if (g.phase !== 'playing' || hiddenSeq === seq) return null;
  return (
    <div key={seq} className={styles.banner}>
      <Flourish width={260} />
      <div className={styles.bannerText}>{p.human ? 'Your Turn' : p.name}</div>
      <Label size="micro" color="secondary">{p.human ? `Round ${g.round}` : 'is acting'}</Label>
    </div>
  );
}

/* ---------------- toast ---------------- */
function Toast() {
  const err = useGame((s) => s.error);
  const [hiddenId, setHiddenId] = useState<number | null>(null);
  useEffect(() => {
    if (!err) return;
    const t = setTimeout(() => setHiddenId(err.id), 1800);
    return () => clearTimeout(t);
  }, [err]);
  if (!err || hiddenId === err.id) return null;
  return (
    <div key={err.id} className={styles.toast} role="status">
      {err.text}
    </div>
  );
}

/* ---------------- inspect ---------------- */
function Inspect() {
  const { id, setInspect } = useGame(useShallow((s) => ({ id: s.inspect, setInspect: s.setInspect })));
  useEffect(() => {
    if (!id) return;
    const k = (e: KeyboardEvent) => e.key === 'Escape' && setInspect(null);
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [id, setInspect]);
  if (!id) return null;
  const d = cardDef(id);
  return (
    <div className={styles.overlay} onClick={() => setInspect(null)}>
      <div className={styles.inspect} onClick={(e) => e.stopPropagation()}>
        <HoloCard foil={d.kind === 'genesis'} intensity={1.4}>
          <Card id={id} width={340} />
        </HoloCard>
        <div className={styles.inspectInfo}>
          <Label size="micro" color="secondary">{d.kind === 'genesis' ? `Genesis · ${d.temperament}` : d.category}</Label>
          <div className={styles.inspectTitle}>{d.title}</div>
          <Flourish width={220} />
          <p className={styles.inspectText}>{d.effect}</p>
          {d.kind === 'base' && (
            <dl className={styles.facts}>
              <dt>Reach</dt>
              <dd>
                {d.target === 'opponent'
                  ? d.element === 'ice'
                    ? 'Ranged — any rival'
                    : d.tags.includes('Reach')
                      ? 'Reach — any rival'
                      : 'Neighbours only'
                  : d.tags.includes('Leader')
                    ? 'The leader'
                    : d.target === 'none'
                      ? 'Self / table'
                      : 'Seats'}
              </dd>
              {d.category === 'Maneuver' && ['sidestep', 'flank', 'rotate', 'pivot', 'displace', 'blindside'].includes(d.id) && (
                <>
                  <dt>Tempo</dt>
                  <dd>Must open your turn · ends it</dd>
                </>
              )}
            </dl>
          )}
          {d.kind === 'genesis' && (
            <dl className={styles.facts}>
              <dt>Trigger</dt>
              <dd>{d.trigger}</dd>
              {d.selfCost && (
                <>
                  <dt>Self-cost</dt>
                  <dd>{d.selfCost}</dd>
                </>
              )}
            </dl>
          )}
          <Button size="label" onClick={() => setInspect(null)}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ---------------- genesis reveal ---------------- */
function GenesisReveal() {
  const { queue, dismiss } = useGame(useShallow((s) => ({ queue: s.genesisQueue, dismiss: s.dismissGenesis })));
  const id = queue[0];
  if (!id) return null;
  const d = cardDef(id);
  if (d.kind !== 'genesis') return null;
  return (
    <div className={styles.genesisOverlay} onClick={dismiss}>
      <div className={styles.genesisRays} aria-hidden="true" />
      <div className={styles.genesisInner} onClick={(e) => e.stopPropagation()}>
        <Label size="micro" color="secondary">Eureka</Label>
        <div className={styles.genesisHead}>Genesis</div>
        <div className={styles.genesisTemper}>
          <TemperamentMark temperament={d.temperament} size={18} />
          <Label size="micro">{d.temperament}</Label>
        </div>
        <div className={styles.genesisCard}>
          <HoloCard foil intensity={1.3}>
            <Card id={id} width={300} />
          </HoloCard>
        </div>
        <p className={styles.genesisNote}>Materialised in your hand. Playing a Genesis card costs nothing and does not use a play.</p>
        <Button variant="frame" onClick={dismiss}>
          Receive
        </Button>
      </div>
    </div>
  );
}

/* ---------------- end screen ---------------- */
function EndScreen() {
  const { g, stats, start } = useGame(useShallow((s) => ({ g: s.game!, stats: s.stats, start: s.start })));
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (g.phase !== 'over') return;
    const t = setTimeout(() => setShow(true), 1800);
    return () => clearTimeout(t);
  }, [g.phase]);
  if (g.phase !== 'over' || !show) return null;
  const won = g.winner === 0;
  const champ = g.winner != null ? g.players[g.winner] : null;
  const order = ranking(g);
  return (
    <div className={[styles.endOverlay, won ? styles.endWon : styles.endLost].join(' ')}>
      <div className={styles.endInner}>
        <Label size="micro" color="secondary">{won ? 'Victory' : 'Defeat'}</Label>
        <h2 className={styles.endTitle}>{won ? 'The Center is yours' : `The Center falls to ${champ?.name ?? '—'}`}</h2>
        <Flourish width={320} />
        <ol className={styles.endList}>
          {order.map((p, i) => (
            <li key={p.index} data-me={p.human}>
              <span className={styles.endRank}>{['I', 'II', 'III', 'IV'][i]}</span>
              <span className={styles.endName}>{p.human ? 'You' : p.name}</span>
              <span className={styles.endPull}>{p.pull}</span>
            </li>
          ))}
        </ol>
        <div className={styles.endStats}>
          <span>
            <b>{g.round}</b> {g.round === 1 ? 'round' : 'rounds'}
          </span>
          <span>
            <b>{stats.wins}</b> {stats.wins === 1 ? 'win' : 'wins'}
          </span>
          <span>
            <b>{stats.losses}</b> {stats.losses === 1 ? 'loss' : 'losses'}
          </span>
        </div>
        <div className={styles.endActions}>
          <Button variant="frame" onClick={() => start({ difficulty: g.difficulty, name: g.players[0].name })}>
            Play again
          </Button>
          <Link href="/" className={styles.endLink}>
            <Button>Main menu</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

/* ---------------- menu ---------------- */
function Toggle({ label, on, onClick }: { label: string; on: boolean; onClick: () => void }) {
  return (
    <button className={styles.toggle} onClick={onClick} aria-pressed={on}>
      <Label size="micro" color={on ? 'primary' : 'faint'}>{label}</Label>
      <span className={styles.toggleVal} data-on={on}>
        {on ? 'On' : 'Off'}
      </span>
    </button>
  );
}

function Menu({ onClose }: { onClose: () => void }) {
  const { settings, setSettings, quit } = useGame(useShallow((s) => ({ settings: s.settings, setSettings: s.setSettings, quit: s.quit })));
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);
  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.menu} onClick={(e) => e.stopPropagation()}>
        <div className={styles.menuTitle}>Paused</div>
        <Flourish width={240} />
        <div className={styles.menuGroup}>
          <Toggle label="Sound" on={settings.sound} onClick={() => setSettings({ sound: !settings.sound })} />
          <Toggle label="Ambience" on={settings.music} onClick={() => setSettings({ music: !settings.music })} />
          <Toggle label="High fidelity" on={settings.quality === 'high'} onClick={() => setSettings({ quality: settings.quality === 'high' ? 'low' : 'high' })} />
          <Toggle label="Fast rivals" on={settings.speed === 2} onClick={() => setSettings({ speed: settings.speed === 2 ? 1 : 2 })} />
        </div>
        <div className={styles.menuHelp}>
          <Label size="nano" color="secondary">How to play</Label>
          <ul>
            <li>Pull cards drag the Center toward you. First to {WIN_PULL} wins.</li>
            <li>Attacks push it away from a rival. Plasma attacks reach only your two neighbours; Cryo is ranged.</li>
            <li>Each turn you gain one of every element plus one attuned to your hand. Up to three plays.</li>
            <li>Click a card, then a glowing rival. Right-click to inspect. Enter ends the turn.</li>
          </ul>
        </div>
        <div className={styles.menuActions}>
          <Button variant="frame" onClick={onClose}>
            Resume
          </Button>
          <Link href="/rules" target="_blank">
            <Button size="label">Full rules</Button>
          </Link>
          <Link href="/" onClick={() => quit()}>
            <Button size="label" color="fire">
              Forfeit
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

/* ---------------- AI driver ---------------- */
function useAiDriver() {
  const { g, aiStep, blocked, speed } = useGame(useShallow((s) => ({ g: s.game, aiStep: s.aiStep, blocked: s.genesisQueue.length > 0, speed: s.settings.speed })));
  useEffect(() => {
    if (!g || g.phase !== 'playing' || g.current === 0 || blocked) return;
    const first = g.playsThisTurn === 0;
    const t = setTimeout(() => aiStep(), (first ? 1200 : 1350) / speed);
    return () => clearTimeout(t);
  }, [g, aiStep, blocked, speed]);
}

export function Hud() {
  const g = useGame((s) => s.game);
  const [menu, setMenu] = useState(false);
  useAiDriver();
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !useGame.getState().selected && !useGame.getState().inspect) setMenu((m) => !m);
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, []);
  const rank = useMemo(() => (g ? ranking(g).findIndex((p) => p.index === 0) : 0), [g]);
  if (!g) return null;
  return (
    <div className={styles.hud}>
      <TopBar onMenu={() => setMenu(true)} />
      <Chronicle />
      <CastDisplay />
      <TurnBanner />
      <div className={styles.bottom}>
        <div className={styles.bottomLeft}>
          <div className={styles.me}>
            <span className={styles.meName}>{g.players[0].name}</span>
            <span className={styles.mePull}>{g.players[0].pull}</span>
            <Label size="nano" color="faint">{['First', 'Second', 'Third', 'Last'][rank]}</Label>
          </div>
          <PoolBar />
        </div>
        <div className={styles.handCol}>
          <Hint />
          <Hand />
        </div>
        <TurnControls />
      </div>
      <Toast />
      <Inspect />
      <GenesisReveal />
      <EndScreen />
      {menu && <Menu onClose={() => setMenu(false)} />}
    </div>
  );
}

export type { GameState };

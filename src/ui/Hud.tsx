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
  activeStatuses,
  playsAllowed,
  ranking,
} from '@/game/engine';
import { ELEMENTS, type GameState, type StatusKind } from '@/game/types';
import { fmt, plural } from '@/i18n';
import { useI18n } from '@/i18n/I18nProvider';
import { cardTitle, formatLog, playerName, reasonText, statusText } from '@/i18n/game';
import { LangSwitch } from './LangSwitch';
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

const ICE: StatusKind[] = ['frozen', 'locked', 'chill', 'glacier', 'numb', 'cryoBind', 'genDown'];
function statusTone(k: StatusKind) {
  if (ICE.includes(k)) return 'ice';
  if (k === 'marked' || k === 'burn') return 'fire';
  if (k === 'genBonus' || k === 'skipDraw' || k === 'encircle' || k === 'vantage') return 'flux';
  if (k === 'plague' || k === 'plagueCaster' || k === 'skipTurn') return 'mono';
  return 'arcane';
}

/* ---------------- top bar ---------------- */
function TopBar({ onMenu }: { onMenu: () => void }) {
  const g = useGame((s) => s.game)!;
  const { d } = useI18n();
  const conv = convergence(g);
  const nextConv = CONVERGENCE_ROUNDS.find((r) => r > g.round);
  return (
    <div className={styles.top}>
      <div className={styles.turnBox}>
        <Label size="nano" color="faint">{d.hud.round}</Label>
        <span className={styles.turnNum}>{String(g.round).padStart(2, '0')}</span>
        <span className={styles.turnOf}>/ {MAX_ROUNDS}</span>
      </div>
      <div className={styles.goal}>
        <Label size="nano" color="faint">{d.hud.firstTo}</Label>
        <span className={styles.goalNum}>{WIN_PULL}</span>
        <Label size="nano" color="faint">{d.hud.pull}</Label>
        {conv > 0 ? (
          <span className={styles.conv} title={d.hud.convergenceTip}>{fmt(d.hud.convergence, { n: conv })}</span>
        ) : nextConv ? (
          <span className={styles.convSoon}>{fmt(d.hud.convergenceSoon, { n: nextConv })}</span>
        ) : null}
      </div>
      <div className={styles.topRight}>
        <button className={styles.iconBtn} onClick={onMenu} aria-label={d.hud.menu}>
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
  const { d } = useI18n();
  const [open, setOpen] = useState(() => typeof window === 'undefined' || (window.innerWidth >= 900 && window.innerHeight >= 600));
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.scrollTo({ top: ref.current.scrollHeight, behavior: 'smooth' });
  }, [g.log.length]);
  return (
    <aside className={[styles.chronicle, open ? '' : styles.chronicleClosed].join(' ')}>
      <button className={styles.chronHead} onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <Label size="nano" color="secondary">{d.hud.chronicle}</Label>
        <span className={styles.chev}>{open ? '–' : '+'}</span>
      </button>
      {open && (
        <div className={styles.chronBody} ref={ref}>
          {g.log.slice(-40).map((l) => (
            <div key={l.id} className={styles.logLine} data-tone={l.tone}>
              <span className={styles.logRound}>{String(l.round).padStart(2, '0')}</span>
              <span>{formatLog(l, g.players, d)}</span>
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
  const { d } = useI18n();
  const me = g.players[0];
  const allowed = playsAllowed(g, me);
  const left = g.current === 0 ? Math.max(0, allowed - g.playsThisTurn) : allowed;
  const myStatuses = activeStatuses(g, me);
  return (
    <div className={styles.pool}>
      <div className={styles.poolOrbs}>
        {ELEMENTS.map((e) => (
          <div key={e} className={styles.poolItem} title={fmt(d.hud.generatorsTip, { element: d.elements[e], n: me.passives.generators[e] })}>
            <ElementOrb element={e} size={22} />
            <span className={styles.poolNum} data-zero={me.pool[e] === 0}>
              {me.pool[e]}
            </span>
            {me.passives.generators[e] > 0 && <span className={styles.gen}>+{me.passives.generators[e]}</span>}
          </div>
        ))}
      </div>
      <div className={styles.plays}>
        <Label size="nano" color="faint">{d.hud.plays}</Label>
        <StarRating value={left} max={Math.max(allowed, 1)} size={13} gap={5} color="var(--bone)" />
      </div>
      {myStatuses.length > 0 && (
        <div className={styles.myStatus}>
          {myStatuses.slice(0, 4).map((s, i) => (
            <span key={i} className={styles.statusChip} data-tone={statusTone(s.kind)}>
              {statusText(s.kind, s.value, d)}
            </span>
          ))}
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
  const { d } = useI18n();
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
                  {d.hud.counterClockwise}
                </Button>
                <Button variant="frame" size="label" color="flux" onClick={() => commit(1)}>
                  {d.hud.clockwise}
                </Button>
              </div>
            ) : (
              <Button variant="frame" size="label" color={selDef.kind === 'base' ? selDef.element : 'bone'} onClick={() => commit()}>
                {fmt(d.hud.playCard, { card: cardTitle(selDef.id, d) })}
              </Button>
            )
          ) : (
            <div className={styles.targetPrompt}>
              <span className={styles.targetDot} />
              <Label size="micro" color="ash">
                {selDef.target === 'two-others'
                  ? fmt(d.hud.chooseTwo, { n: pendingTargets.length })
                  : selDef.target === 'neighbour'
                    ? d.hud.chooseNeighbour
                    : selDef.target === 'any-seat'
                      ? d.hud.chooseSeat
                      : d.hud.chooseTarget}
              </Label>
              <button className={styles.cancel} onClick={() => select(null)}>
                {d.common.cancel}
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
          const title = cardTitle(c.id, d);
          const why = chk.ok ? '' : reasonText(chk.reason, chk.n, d);
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
                    useGame.setState({ error: { id: Date.now(), reason: chk.reason ?? 'cannotPlay', n: chk.n } });
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
                ariaLabel={chk.ok ? title : `${title} — ${why}`}
              >
                <Card id={c.id} width={cardW} />
              </HoloCard>
              {!chk.ok && myTurn && <div className={styles.reason}>{why}</div>}
              <button
                className={styles.inspectBtn}
                onClick={(e) => {
                  e.stopPropagation();
                  setInspect(c.id);
                }}
                aria-label={fmt(d.hud.inspect, { card: title })}
              >
                ⤢
              </button>
            </div>
          );
        })}
        {n === 0 && <div className={styles.emptyHand}>{d.hud.emptyHand}</div>}
      </div>
    </div>
  );
}

/* ---------------- first-match hint ---------------- */
function Hint() {
  const { g, stats, selected } = useGame(useShallow((s) => ({ g: s.game!, stats: s.stats, selected: s.selected })));
  const [dismissed, setDismissed] = useState(false);
  const { d } = useI18n();
  if (dismissed || stats.played > 0 || g.round > 2 || g.current !== 0 || g.phase !== 'playing' || selected) return null;
  return (
    <div className={styles.hint}>
      <Label size="nano" color="ash">{d.hud.hint}</Label>
      <button className={styles.cancel} onClick={() => setDismissed(true)}>
        {d.hud.gotIt}
      </button>
    </div>
  );
}

/* ---------------- end turn ---------------- */
function TurnControls() {
  const { g, endMyTurn } = useGame(useShallow((s) => ({ g: s.game!, endMyTurn: s.endMyTurn })));
  const { d } = useI18n();
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
          {d.hud.endTurn}
        </Button>
      ) : g.phase === 'playing' ? (
        <div className={styles.waiting}>
          <span className={styles.spinner} />
          <Label size="micro" color="secondary">
            {fmt(d.hud.acts, { name: playerName(actor, d) })}
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
  const { d } = useI18n();
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
        return (
          <div key={c.id} className={styles.cast}>
            <div className={styles.castHead}>
              <span className={styles.castWho}>{playerName(p, d)}</span>
              <Label size="nano" color="faint">
                {c.targets.length
                  ? fmt(d.hud.castOn, { targets: c.targets.map((t) => (g.players[t].human && g.players[t].defaultName ? d.common.youObj : g.players[t].name)).join(d.common.and) })
                  : d.hud.cast}
              </Label>
            </div>
            <Card id={c.cardId} width={150} />
            <span className="sr-only">{cardTitle(c.cardId, d)}</span>
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
  const { d } = useI18n();
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
      <div className={styles.bannerText}>{p.human ? d.hud.yourTurn : p.name}</div>
      <Label size="micro" color="secondary">{p.human ? fmt(d.hud.roundN, { n: g.round }) : d.hud.isActing}</Label>
    </div>
  );
}

/* ---------------- toast ---------------- */
function Toast() {
  const err = useGame((s) => s.error);
  const { d } = useI18n();
  const [hiddenId, setHiddenId] = useState<number | null>(null);
  useEffect(() => {
    if (!err) return;
    const t = setTimeout(() => setHiddenId(err.id), 1800);
    return () => clearTimeout(t);
  }, [err]);
  if (!err || hiddenId === err.id) return null;
  return (
    <div key={err.id} className={styles.toast} role="status">
      {reasonText(err.reason, err.n, d)}
    </div>
  );
}

/* ---------------- inspect ---------------- */
function Inspect() {
  const { id, setInspect } = useGame(useShallow((s) => ({ id: s.inspect, setInspect: s.setInspect })));
  const { d: t } = useI18n();
  useEffect(() => {
    if (!id) return;
    const k = (e: KeyboardEvent) => e.key === 'Escape' && setInspect(null);
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [id, setInspect]);
  if (!id) return null;
  const d = cardDef(id);
  const text = (t.cards as Record<string, { title: string; effect: string; trigger?: string; selfCost?: string }>)[id];
  return (
    <div className={styles.overlay} onClick={() => setInspect(null)}>
      <div className={styles.inspect} onClick={(e) => e.stopPropagation()}>
        <HoloCard foil={d.kind === 'genesis'} intensity={1.4}>
          <Card id={id} width={340} />
        </HoloCard>
        <div className={styles.inspectInfo}>
          <Label size="micro" color="secondary">{d.kind === 'genesis' ? fmt(t.inspect.genesisOf, { temper: t.temperaments[d.temperament] }) : t.categories[d.category]}</Label>
          <div className={styles.inspectTitle}>{text.title}</div>
          <Flourish width={220} />
          <p className={styles.inspectText}>{text.effect}</p>
          {d.kind === 'base' && (
            <dl className={styles.facts}>
              <dt>{t.inspect.reach}</dt>
              <dd>
                {d.target === 'opponent'
                  ? d.element === 'ice'
                    ? t.inspect.reachRanged
                    : d.tags.includes('Reach')
                      ? t.inspect.reachAny
                      : t.inspect.reachNeighbours
                  : d.tags.includes('Leader')
                    ? t.inspect.reachLeader
                    : d.target === 'none'
                      ? t.inspect.reachSelf
                      : t.inspect.reachSeats}
              </dd>
              {d.category === 'Maneuver' && ['sidestep', 'flank', 'rotate', 'pivot', 'displace', 'blindside'].includes(d.id) && (
                <>
                  <dt>{t.inspect.tempo}</dt>
                  <dd>{t.inspect.tempoManeuver}</dd>
                </>
              )}
            </dl>
          )}
          {d.kind === 'genesis' && (
            <dl className={styles.facts}>
              <dt>{t.inspect.trigger}</dt>
              <dd>{text.trigger}</dd>
              {text.selfCost && (
                <>
                  <dt>{t.inspect.selfCost}</dt>
                  <dd>{text.selfCost}</dd>
                </>
              )}
            </dl>
          )}
          <Button size="label" onClick={() => setInspect(null)}>
            {t.common.close}
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ---------------- genesis reveal ---------------- */
function GenesisReveal() {
  const { queue, dismiss } = useGame(useShallow((s) => ({ queue: s.genesisQueue, dismiss: s.dismissGenesis })));
  const { d: t } = useI18n();
  const id = queue[0];
  if (!id) return null;
  const d = cardDef(id);
  if (d.kind !== 'genesis') return null;
  return (
    <div className={styles.genesisOverlay} onClick={dismiss}>
      <div className={styles.genesisRays} aria-hidden="true" />
      <div className={styles.genesisInner} onClick={(e) => e.stopPropagation()}>
        <Label size="micro" color="secondary">{t.genesis.eureka}</Label>
        <div className={styles.genesisHead}>{t.genesis.head}</div>
        <div className={styles.genesisTemper}>
          <TemperamentMark temperament={d.temperament} size={18} />
          <Label size="micro">{t.temperaments[d.temperament]}</Label>
        </div>
        <div className={styles.genesisCard}>
          <HoloCard foil intensity={1.3}>
            <Card id={id} width={300} />
          </HoloCard>
        </div>
        <p className={styles.genesisNote}>{t.genesis.note}</p>
        <Button variant="frame" onClick={dismiss}>
          {t.genesis.receive}
        </Button>
      </div>
    </div>
  );
}

/* ---------------- end screen ---------------- */
function EndScreen() {
  const { g, stats, start } = useGame(useShallow((s) => ({ g: s.game!, stats: s.stats, start: s.start })));
  const { d, href } = useI18n();
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
        <Label size="micro" color="secondary">{won ? d.end.victory : d.end.defeat}</Label>
        <h2 className={styles.endTitle}>{won ? d.end.won : fmt(d.end.lost, { name: champ ? playerName(champ, d) : '—' })}</h2>
        <Flourish width={320} />
        <ol className={styles.endList}>
          {order.map((p, i) => (
            <li key={p.index} data-me={p.human}>
              <span className={styles.endRank}>{d.end.ranks[i]}</span>
              <span className={styles.endName}>{playerName(p, d)}</span>
              <span className={styles.endPull}>{p.pull}</span>
            </li>
          ))}
        </ol>
        <div className={styles.endStats}>
          <span>
            <b>{g.round}</b> {plural(g.round, d.end.roundsOne, d.end.roundsOther)}
          </span>
          <span>
            <b>{stats.wins}</b> {plural(stats.wins, d.end.winsOne, d.end.winsOther)}
          </span>
          <span>
            <b>{stats.losses}</b> {plural(stats.losses, d.end.lossesOne, d.end.lossesOther)}
          </span>
        </div>
        <div className={styles.endActions}>
          <Button variant="frame" onClick={() => start({ difficulty: g.difficulty, name: g.players[0].defaultName ? undefined : g.players[0].name })}>
            {d.end.again}
          </Button>
          <Link href={href('/')} className={styles.endLink}>
            <Button>{d.end.menu}</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

/* ---------------- menu ---------------- */
function Toggle({ label, on, onClick }: { label: string; on: boolean; onClick: () => void }) {
  const { d } = useI18n();
  return (
    <button className={styles.toggle} onClick={onClick} aria-pressed={on}>
      <Label size="micro" color={on ? 'primary' : 'faint'}>{label}</Label>
      <span className={styles.toggleVal} data-on={on}>
        {on ? d.common.on : d.common.off}
      </span>
    </button>
  );
}

function Menu({ onClose }: { onClose: () => void }) {
  const { settings, setSettings, quit } = useGame(useShallow((s) => ({ settings: s.settings, setSettings: s.setSettings, quit: s.quit })));
  const { d, href } = useI18n();
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);
  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.menu} onClick={(e) => e.stopPropagation()}>
        <div className={styles.menuTitle}>{d.menu.paused}</div>
        <Flourish width={240} />
        <div className={styles.menuLang}>
          <Label size="micro" color="faint">{d.lang.label}</Label>
          <LangSwitch />
        </div>
        <div className={styles.menuGroup}>
          <Toggle label={d.menu.sound} on={settings.sound} onClick={() => setSettings({ sound: !settings.sound })} />
          <Toggle label={d.menu.ambience} on={settings.music} onClick={() => setSettings({ music: !settings.music })} />
          <Toggle label={d.menu.fidelity} on={settings.quality === 'high'} onClick={() => setSettings({ quality: settings.quality === 'high' ? 'low' : 'high' })} />
          <Toggle label={d.menu.fast} on={settings.speed === 2} onClick={() => setSettings({ speed: settings.speed === 2 ? 1 : 2 })} />
        </div>
        <div className={styles.menuHelp}>
          <Label size="nano" color="secondary">{d.menu.howTo}</Label>
          <ul>
            {d.menu.help.map((line, i) => (
              <li key={i}>{fmt(line, { n: WIN_PULL })}</li>
            ))}
          </ul>
        </div>
        <div className={styles.menuActions}>
          <Button variant="frame" onClick={onClose}>
            {d.menu.resume}
          </Button>
          <Link href={href('/rules')} target="_blank">
            <Button size="label">{d.menu.rules}</Button>
          </Link>
          <Link href={href('/')} onClick={() => quit()}>
            <Button size="label" color="fire">
              {d.menu.forfeit}
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
  const { d } = useI18n();
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
            <span className={styles.meName}>{playerName(g.players[0], d)}</span>
            <span className={styles.mePull}>{g.players[0].pull}</span>
            <Label size="nano" color="faint">{d.hud.ranks[rank]}</Label>
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

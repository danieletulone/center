'use client';
/* ============================================================
   CENTER — the 3D table
   Four hex tokens on a hex-grid void, each tethered by a beam of
   light to the Nexus. The Nexus physically drifts toward whoever
   is winning the tug. Spells fly as glowing bolts with trails,
   burst into particles, shake the camera, and pulse the floor.
   ============================================================ */
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Edges, Html, QuadraticBezierLine, Sparkles, Stars } from '@react-three/drei';
import { Bloom, ChromaticAberration, EffectComposer, Noise, Vignette } from '@react-three/postprocessing';
import { BlendFunction, KernelSize, type ChromaticAberrationEffect } from 'postprocessing';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useShallow } from 'zustand/react/shallow';
import { useGame, type TimedFx } from '@/game/store';
import { WIN_PULL, activeStatuses, legalTargets } from '@/game/engine';
import { cardDef } from '@/game/cards';
import type { FloatKey, GameState, Player } from '@/game/types';
import { fmt, plural } from '@/i18n';
import { useI18n } from '@/i18n/I18nProvider';
import { floatText, playerName, statusText } from '@/i18n/game';
import { EL_COLOR, EL_HEX, SEAT_R, addTrauma, cameraFx, seatPos } from './palette';
import { Particles, emit } from './Particles';
import { Halo, Nexus } from './Nexus';
import { HexFloor, floorPulse } from './HexFloor';
import styles from './GameScene.module.css';

/* ---------- derived positions ---------- */
function nexusTarget(g: GameState): THREE.Vector3 {
  const v = new THREE.Vector3();
  for (const p of g.players) v.addScaledVector(seatPos(p.seat, 1), p.pull / WIN_PULL);
  v.multiplyScalar(SEAT_R * 0.92);
  if (v.length() > SEAT_R * 0.82) v.setLength(SEAT_R * 0.82);
  v.y = 1.15;
  return v;
}

/* shared live positions so effects can aim at moving tokens */
const live = {
  nexus: new THREE.Vector3(0, 1.15, 0),
  tokens: [0, 1, 2, 3].map((s) => seatPos(s).setY(0.35)),
};

/* ---------- camera ---------- */
function CameraRig() {
  const { camera, size, pointer } = useThree();
  const base = useMemo(() => new THREE.Vector3(), []);
  const look = useMemo(() => new THREE.Vector3(), []);
  const dir = useMemo(() => new THREE.Vector3(0, 0.849, 0.529), []);
  useFrame((st, dt) => {
    const aspect = size.width / size.height;
    const fov = ((camera as THREE.PerspectiveCamera).fov * Math.PI) / 180;
    // keep the whole ring (and its labels) in frame on any aspect ratio
    const fitW = 6.6 / (Math.tan(fov / 2) * aspect);
    const dist = Math.max(14.85, fitW);
    const portrait = aspect < 0.9;
    look.set(0, 0, portrait ? 1.55 + dist * 0.12 : 1.55);
    base.copy(look).addScaledVector(dir, dist);
    base.x += pointer.x * 0.5;
    const tr = cameraFx.trauma * cameraFx.trauma * (reducedMotion() ? 0.15 : 1);
    const t = st.clock.elapsedTime;
    const shake = new THREE.Vector3(
      (Math.sin(t * 47.3) + Math.sin(t * 23.1)) * 0.12 * tr,
      Math.sin(t * 39.7) * 0.12 * tr,
      Math.sin(t * 31.9) * 0.08 * tr,
    );
    camera.position.lerp(base, Math.min(1, dt * 2.2)).add(shake);
    camera.lookAt(look.x + shake.x * 0.5, look.y + pointer.y * 0.25, look.z);
    cameraFx.trauma = Math.max(0, cameraFx.trauma - dt * 1.4);
    cameraFx.flash = Math.max(0, cameraFx.flash - dt * 2.5);
  });
  return null;
}

let rm: boolean | null = null;
function reducedMotion() {
  if (rm === null && typeof window !== 'undefined') rm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  return !!rm;
}

/* ---------- token ---------- */
function Token({ p, current, targetable, chosen, onPick }: { p: Player; current: boolean; targetable: boolean; chosen: boolean; onPick: () => void }) {
  const g = useGame((s) => s.game)!;
  const group = useRef<THREE.Group>(null);
  const core = useRef<THREE.MeshStandardMaterial>(null);
  const ring = useRef<THREE.Mesh>(null);
  const [hover, setHover] = useState(false);
  const statuses = activeStatuses(g, p);
  const guarded = statuses.some((s) => ['shield', 'aegis', 'immune', 'reflect', 'redirect', 'phase', 'counter', 'floor'].includes(s.kind));
  const frosted = statuses.some((s) => ['frozen', 'locked', 'chill', 'glacier', 'numb', 'cryoBind', 'genDown'].includes(s.kind));
  const burning = statuses.some((s) => s.kind === 'burn' || s.kind === 'marked');
  const plagued = statuses.some((s) => s.kind === 'plague');
  const dome = useRef<THREE.Group>(null);
  const frost = useRef<THREE.Group>(null);
  const lastEmber = useRef(0);

  useFrame((st, dt) => {
    const target = seatPos(p.seat).setY(0);
    if (!group.current) return;
    group.current.position.lerp(target, Math.min(1, dt * 2.6));
    live.tokens[p.index].copy(group.current.position).setY(0.35);
    const t = st.clock.elapsedTime;
    if (core.current) {
      const want = current ? 0.9 + Math.sin(t * 2.4) * 0.3 : targetable ? 0.7 + Math.sin(t * 6) * 0.4 : 0;
      core.current.emissiveIntensity += (want - core.current.emissiveIntensity) * Math.min(1, dt * 5);
    }
    if (ring.current) {
      ring.current.rotation.z += dt * (targetable ? 1.6 : 0.3);
      const s = targetable || chosen ? 1 + Math.sin(t * 5) * 0.06 : 1;
      ring.current.scale.setScalar(s);
    }
    if (dome.current) {
      dome.current.rotation.y += dt * 0.4;
      const s = guarded ? 1 : 0.001;
      dome.current.scale.lerp(new THREE.Vector3(s, s, s), Math.min(1, dt * 6));
    }
    if (frost.current) {
      frost.current.rotation.y -= dt * 0.6;
      const s = frosted ? 1 : 0.001;
      frost.current.scale.lerp(new THREE.Vector3(s, s, s), Math.min(1, dt * 5));
    }
    if ((burning || plagued) && t - lastEmber.current > 0.12) {
      lastEmber.current = t;
      emit({
        pos: group.current.position.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.8, 0.2, (Math.random() - 0.5) * 0.8)),
        count: 2,
        color: plagued ? new THREE.Color('#8a8a8a') : EL_COLOR.fire,
        speed: 0.3,
        up: 1.2,
        life: 1.1,
        size: 0.09,
        drag: 0.5,
      });
    }
  });

  const edge = current ? '#ffffff' : targetable ? '#d9b8ff' : hover ? '#bbbbbb' : '#5d5d5d';
  return (
    <group ref={group} position={seatPos(p.seat)}>
      <mesh
        position={[0, 0.16, 0]}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHover(true);
          if (targetable) document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          setHover(false);
          document.body.style.cursor = '';
        }}
        onClick={(e) => {
          e.stopPropagation();
          onPick();
        }}
      >
        <cylinderGeometry args={[0.52, 0.56, 0.28, 6]} />
        <meshStandardMaterial ref={core} color="#101012" metalness={0.4} roughness={0.55} emissive="#7c00c8" emissiveIntensity={0} />
        <Edges color={edge} threshold={20} />
      </mesh>
      <mesh position={[0, 0.295, 0]} rotation={[-Math.PI / 2, 0, Math.PI / 6]}>
        <circleGeometry args={[0.3, 6]} />
        <meshBasicMaterial color={current ? '#efe4ff' : p.human ? '#6d4a99' : '#1c1c1f'} toneMapped={false} />
      </mesh>
      {/* base reticle */}
      <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <ringGeometry args={[0.8, 0.83, 6, 1]} />
        <meshBasicMaterial color={targetable || chosen ? '#c78bff' : current ? '#ffffff' : '#3a3a3a'} transparent opacity={targetable || chosen || current ? 0.95 : 0.6} toneMapped={false} />
      </mesh>
      {current && <Halo color="#9d4dff" size={2.6} strength={0.35} />}
      {/* defense dome */}
      <group ref={dome} position={[0, 0.3, 0]} scale={0.001}>
        <mesh>
          <icosahedronGeometry args={[1.05, 1]} />
          <meshBasicMaterial color="#b46bff" wireframe transparent opacity={0.35} toneMapped={false} />
        </mesh>
        <mesh>
          <sphereGeometry args={[1.0, 32, 16]} />
          <meshBasicMaterial color="#7c00c8" transparent opacity={0.07} depthWrite={false} />
        </mesh>
      </group>
      {/* frost crown */}
      <group ref={frost} position={[0, 0.3, 0]} scale={0.001}>
        {Array.from({ length: 7 }).map((_, i) => {
          const a = (i / 7) * Math.PI * 2;
          return (
            <mesh key={i} position={[Math.cos(a) * 0.85, 0.15 + (i % 2) * 0.2, Math.sin(a) * 0.85]} rotation={[0.3, a, 0.4]}>
              <octahedronGeometry args={[0.13, 0]} />
              <meshBasicMaterial color="#8cc4ff" toneMapped={false} transparent opacity={0.9} />
            </mesh>
          );
        })}
      </group>
    </group>
  );
}

/* ---------- labels (DOM in 3D) ---------- */
function SeatLabel({ p, current, targetable, chosen, onPick }: { p: Player; current: boolean; targetable: boolean; chosen: boolean; onPick: () => void }) {
  const g = useGame((s) => s.game)!;
  const ref = useRef<THREE.Group>(null);
  useFrame(() => ref.current?.position.copy(live.tokens[p.index]).setY(0));
  const { d } = useI18n(); // resolved here: drei <Html> renders in its own root, outside the context bridge
  const statuses = activeStatuses(g, p);
  const frac = Math.max(0, Math.min(1, p.pull / WIN_PULL));
  const name = playerName(p, d);
  const cards = fmt(plural(p.hand.length, d.hud.cardsOne, d.hud.cardsOther), { n: p.hand.length });
  const genesis = p.genesisEarned.length > 0 ? fmt(d.hud.genesisCount, { n: p.genesisEarned.length }) : null;
  const chips = statuses.slice(0, 5).map((s) => ({ tone: statusTone(s.kind), text: statusText(s.kind, s.value, d, 'short') }));
  return (
    <group ref={ref}>
      <Html center position={labelOffset(p.seat)} zIndexRange={[9, 0]} style={{ pointerEvents: 'none' }}>
        <div
          className={[styles.label, current ? styles.current : '', targetable ? styles.targetable : '', chosen ? styles.chosen : ''].join(' ')}
          onClick={onPick}
          style={{ pointerEvents: targetable ? 'auto' : 'none' }}
        >
          <div className={styles.nameRow}>
            <span className={styles.name}>{name}</span>
            <span className={styles.pull}>{p.pull}</span>
          </div>
          <div className={styles.bar}>
            <div className={styles.barFill} style={{ width: `${frac * 100}%` }} />
            <div className={styles.barNeg} style={{ width: `${Math.max(0, Math.min(1, -p.pull / WIN_PULL)) * 100}%` }} />
          </div>
          {!p.human && (
            <div className={styles.meta}>
              <span>{cards}</span>
              {genesis && <span>{genesis}</span>}
            </div>
          )}
          {chips.length > 0 && (
            <div className={styles.chips}>
              {chips.map((c, i) => (
                <span key={i} className={styles.chip} data-tone={c.tone}>
                  {c.text}
                </span>
              ))}
            </div>
          )}
        </div>
      </Html>
    </group>
  );
}
/** Labels sit on the outer side of each seat, away from the Nexus. */
function labelOffset(seat: number): [number, number, number] {
  if (seat === 2) return [1.9, 0, 0]; // north: beside the token
  if (seat === 0) return [0, 0, 1.1];
  return [0, 0, 1.15]; // west / east: just below the token
}
function statusTone(k: string): string {
  if (['frozen', 'locked', 'chill', 'glacier', 'numb', 'cryoBind', 'genDown'].includes(k)) return 'ice';
  if (['marked', 'burn'].includes(k)) return 'fire';
  if (['genBonus', 'skipDraw', 'encircle', 'vantage'].includes(k)) return 'flux';
  if (['plague', 'plagueCaster', 'skipTurn'].includes(k)) return 'mono';
  return 'arcane';
}
/* ---------- tethers ---------- */
function Tether({ p }: { p: Player }) {
  const ref = useRef<THREE.Object3D & { setPoints: (a: THREE.Vector3, b: THREE.Vector3, m: THREE.Vector3) => void; material: THREE.Material & { dashOffset: number; opacity: number; linewidth: number } }>(null);
  const strength = Math.max(0, p.pull) / WIN_PULL;
  const negative = p.pull < 0;
  const mid = useMemo(() => new THREE.Vector3(), []);
  useFrame((_, dt) => {
    const a = live.tokens[p.index];
    const b = live.nexus;
    mid.copy(a).lerp(b, 0.5).setY(Math.max(a.y, b.y) + 0.55);
    if (ref.current) {
      ref.current.setPoints(a, b, mid);
      ref.current.material.dashOffset += dt * (0.4 + strength * 2.2);
      const want = negative ? 0.12 : 0.18 + strength * 0.82;
      ref.current.material.opacity += (want - ref.current.material.opacity) * Math.min(1, dt * 3);
    }
  });
  return (
    <QuadraticBezierLine
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ref={ref as any}
      start={[0, 0, 0]}
      end={[0, 1, 0]}
      color={negative ? '#4a4a4a' : strength > 0.66 ? '#ffffff' : '#c59cff'}
      lineWidth={1 + strength * 3.2}
      dashed
      dashScale={6}
      dashSize={0.6}
      gapSize={0.35}
      transparent
      opacity={0.2}
      toneMapped={false}
    />
  );
}

/* ---------- bolts ---------- */
interface Bolt {
  id: number;
  from: number;
  to: number;
  element: string;
  power: number;
  born: number;
}
function BoltMesh({ b, onDone }: { b: Bolt; onDone: (id: number) => void }) {
  const head = useRef<THREE.Mesh>(null);
  const done = useRef(false);
  const dur = 0.55;
  const color = EL_HEX[b.element] ?? '#ffffff';
  useFrame((st) => {
    const t = Math.min(1, (performance.now() - b.born) / 1000 / dur);
    const a = live.tokens[b.from].clone().setY(0.6);
    const c = live.tokens[b.to].clone().setY(0.5);
    const m = a.clone().lerp(c, 0.5).setY(2.2 + b.power * 0.12);
    const e = t * t * (3 - 2 * t);
    const p = new THREE.Vector3()
      .copy(a)
      .multiplyScalar((1 - e) * (1 - e))
      .addScaledVector(m, 2 * (1 - e) * e)
      .addScaledVector(c, e * e);
    head.current?.position.copy(p);
    if (head.current) head.current.scale.setScalar(0.8 + Math.sin(st.clock.elapsedTime * 40) * 0.15);
    emit({ pos: p, count: 3, color: EL_COLOR[b.element] ?? EL_COLOR.mono, speed: 0.35, life: 0.45, size: 0.2 + b.power * 0.015, drag: 3 });
    if (t >= 1 && !done.current) {
      done.current = true;
      onDone(b.id);
    }
  });
  return (
    <mesh ref={head} position={live.tokens[b.from]}>
      <sphereGeometry args={[0.13, 16, 16]} />
      <meshBasicMaterial color={color} toneMapped={false} />
      <Halo color={color} size={1.4 + b.power * 0.1} strength={0.9} />
    </mesh>
  );
}

/* ---------- transient rings / pillars ---------- */
interface Ring {
  id: number;
  at: THREE.Vector3;
  color: string;
  born: number;
  dur: number;
  max: number;
  kind: 'ring' | 'pillar' | 'flash';
}
function RingMesh({ r, onDone }: { r: Ring; onDone: (id: number) => void }) {
  const ref = useRef<THREE.Mesh>(null);
  const mat = useRef<THREE.MeshBasicMaterial>(null);
  useFrame(() => {
    const raw = (performance.now() - r.born) / 1000 / r.dur;
    if (raw >= 1) {
      onDone(r.id);
      return;
    }
    const t = Math.max(0, raw);
    const e = 1 - Math.pow(1 - t, 3);
    if (ref.current) {
      ref.current.visible = raw >= 0;
      if (r.kind === 'pillar') ref.current.scale.set(Math.max(0.05, 1 - t * 0.5), 1, Math.max(0.05, 1 - t * 0.5));
      else ref.current.scale.setScalar(Math.max(0.05, 0.1 + e * r.max));
    }
    if (mat.current) mat.current.opacity = Math.min(1, Math.max(0, (1 - t) * (r.kind === 'pillar' ? 0.55 : 0.9)));
  });
  if (r.kind === 'pillar')
    return (
      <mesh ref={ref} position={[r.at.x, 3, r.at.z]} visible={false}>
        <cylinderGeometry args={[0.5, 0.9, 6, 32, 1, true]} />
        <meshBasicMaterial ref={mat} color={r.color} transparent blending={THREE.AdditiveBlending} side={THREE.DoubleSide} depthWrite={false} toneMapped={false} />
      </mesh>
    );
  if (r.kind === 'flash')
    return (
      <mesh ref={ref} position={r.at} visible={false}>
        <icosahedronGeometry args={[1, 1]} />
        <meshBasicMaterial ref={mat} color={r.color} wireframe transparent toneMapped={false} />
      </mesh>
    );
  return (
    <mesh ref={ref} position={[r.at.x, 0.03, r.at.z]} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
      <ringGeometry args={[0.92, 1, 64]} />
      <meshBasicMaterial ref={mat} color={r.color} transparent blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
    </mesh>
  );
}

/* ---------- floating numbers ---------- */
interface Floater {
  id: number;
  at: number;
  key: FloatKey;
  n?: number;
  tone: string;
}
function FloatText({ f, onDone }: { f: Floater; onDone: (id: number) => void }) {
  const { d } = useI18n();
  const text = floatText(f.key, f.n, d);
  const ref = useRef<THREE.Group>(null);
  const born = useRef(0);
  useEffect(() => {
    born.current = performance.now();
    const t = setTimeout(() => onDone(f.id), 1700);
    return () => clearTimeout(t);
  }, [f.id, onDone]);
  useFrame(() => {
    const t = (performance.now() - born.current) / 1000;
    ref.current?.position.copy(live.tokens[f.at]).setY(1.3 + t * 0.7);
  });
  return (
    <group ref={ref}>
      <Html center zIndexRange={[9, 0]} style={{ pointerEvents: 'none' }}>
        <div className={styles.float} data-tone={f.tone}>
          {text}
        </div>
      </Html>
    </group>
  );
}

/* ---------- FX director ---------- */
function FxDirector() {
  const fx = useGame((s) => s.fx);
  const handled = useRef(new Set<number>());
  const [bolts, setBolts] = useState<Bolt[]>([]);
  const [rings, setRings] = useState<Ring[]>([]);
  const [floats, setFloats] = useState<Floater[]>([]);
  const pending = useRef<{ e: TimedFx; at: number }[]>([]);
  const seq = useRef(0);

  useEffect(() => {
    for (const e of fx) {
      if (handled.current.has(e.id)) continue;
      handled.current.add(e.id);
      // impacts land when the bolt does
      const lag = e.kind === 'burst' ? 520 : e.kind === 'float' ? 420 : e.kind === 'block' ? 480 : e.kind === 'freeze' ? 450 : 0;
      pending.current.push({ e, at: e.t + lag });
    }
  }, [fx]);

  const removeBolt = useMemo(() => (id: number) => setBolts((b) => b.filter((x) => x.id !== id)), []);
  const removeRing = useMemo(() => (id: number) => setRings((r) => r.filter((x) => x.id !== id)), []);
  const removeFloat = useMemo(() => (id: number) => setFloats((f) => f.filter((x) => x.id !== id)), []);

  useFrame(() => {
    const now = performance.now();
    const ready = pending.current.filter((p) => p.at <= now);
    if (!ready.length) return;
    pending.current = pending.current.filter((p) => p.at > now);
    const addB: Bolt[] = [];
    const addR: Ring[] = [];
    const addF: Floater[] = [];
    for (const { e } of ready) {
      const id = ++seq.current;
      switch (e.kind) {
        case 'bolt':
          if (e.from !== e.to) addB.push({ id, from: e.from, to: e.to, element: e.element, power: e.power, born: now });
          break;
        case 'burst': {
          const at = live.tokens[e.at].clone().setY(0.6);
          const col = EL_COLOR[e.element] ?? EL_COLOR.mono;
          emit({ pos: at, count: 50 + e.power * 22, color: col, speed: 3 + e.power * 0.6, life: 0.9, size: 0.18, gravity: 2, drag: 2.2 });
          emit({ pos: at, count: 18, color: new THREE.Color('#ffffff'), speed: 1.5, life: 0.4, size: 0.25 });
          addR.push({ id, at, color: EL_HEX[e.element] ?? '#fff', born: now, dur: 0.7, max: 1.6 + e.power * 0.25, kind: 'ring' });
          addTrauma(0.18 + Math.min(e.power, 8) * 0.07);
          cameraFx.flash = Math.min(1, cameraFx.flash + 0.15 + e.power * 0.05);
          break;
        }
        case 'pull': {
          const to = live.tokens[e.at].clone().setY(0.5);
          emit({ pos: live.nexus.clone(), count: 40 + e.power * 14, color: EL_COLOR[e.element] ?? EL_COLOR.flux, speed: 2.5, spread: 0.4, life: 1.0, size: 0.13, target: to, drag: 3, delay: 0.3 });
          addR.push({ id, at: to, color: '#e8eef7', born: now + 400, dur: 0.9, max: 1.4, kind: 'ring' });
          break;
        }
        case 'shield':
          addR.push({ id, at: live.tokens[e.at].clone().setY(0.4), color: '#b46bff', born: now, dur: 0.8, max: 1.15, kind: 'flash' });
          emit({ pos: live.tokens[e.at].clone().setY(0.5), count: 30, color: EL_COLOR.arcane, speed: 1.6, up: 0.6, life: 1.1, size: 0.12 });
          break;
        case 'block':
          addR.push({ id, at: live.tokens[e.at].clone().setY(0.4), color: '#e2c4ff', born: now, dur: 0.5, max: 1.3, kind: 'flash' });
          emit({ pos: live.tokens[e.at].clone().setY(0.8), count: 26, color: EL_COLOR.arcane, speed: 3, life: 0.6, size: 0.12 });
          break;
        case 'freeze':
          emit({ pos: live.tokens[e.at].clone().setY(0.6), count: 46, color: EL_COLOR.ice, speed: 2.2, life: 1.2, size: 0.12, gravity: 0.6 });
          addR.push({ id, at: live.tokens[e.at].clone(), color: '#6fb1ff', born: now, dur: 0.9, max: 1.8, kind: 'ring' });
          break;
        case 'gain':
          emit({ pos: live.tokens[e.at].clone().setY(0.4), count: 8, color: EL_COLOR[e.element], speed: 0.4, up: 1.6, life: 1.1, size: 0.12, drag: 1 });
          break;
        case 'shockwave':
          floorPulse.strength = 1;
          floorPulse.radius = 0;
          addR.push({ id, at: live.nexus.clone(), color: EL_HEX[e.element] ?? '#fff', born: now, dur: 1.4, max: 9, kind: 'ring' });
          emit({ pos: live.nexus.clone(), count: 140, color: EL_COLOR[e.element] ?? EL_COLOR.mono, speed: 6, life: 1.2, size: 0.15, drag: 1.6 });
          addTrauma(0.5);
          cameraFx.flash = 1;
          break;
        case 'genesis':
          addR.push({ id, at: live.tokens[e.at].clone(), color: '#ffffff', born: now, dur: 2.4, max: 1, kind: 'pillar' });
          emit({ pos: live.tokens[e.at].clone().setY(0.2), count: 120, color: EL_COLOR.mono, speed: 1.2, up: 4, life: 2, size: 0.14, drag: 0.8 });
          break;
        case 'swap':
          for (const i of [e.a, e.b]) emit({ pos: live.tokens[i].clone().setY(0.4), count: 30, color: EL_COLOR.flux, speed: 1.4, up: 1, life: 1, size: 0.1 });
          break;
        case 'float':
          addF.push({ id, at: e.at, key: e.key, n: e.n, tone: e.tone });
          break;
      }
    }
    if (addB.length) setBolts((b) => [...b, ...addB]);
    if (addR.length) setRings((r) => [...r, ...addR]);
    if (addF.length) setFloats((f) => [...f.slice(-10), ...addF]);
  });

  return (
    <>
      {bolts.map((b) => (
        <BoltMesh key={b.id} b={b} onDone={removeBolt} />
      ))}
      {rings.map((r) => (
        <RingMesh key={r.id} r={r} onDone={removeRing} />
      ))}
      {floats.map((f) => (
        <FloatText key={f.id} f={f} onDone={removeFloat} />
      ))}
    </>
  );
}

/* ---------- shader prewarm ----------
   Every FX material variant is mounted once, out of sight, on the first
   frames so its program compiles up-front instead of hitching mid-spell. */
function Prewarm() {
  const { gl, scene, camera } = useThree();
  const [done, setDone] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      gl.compile(scene, camera);
      setTimeout(() => setDone(true), 1200);
    });
    return () => cancelAnimationFrame(id);
  }, [gl, scene, camera]);
  if (done) return null;
  return (
    <group position={[0, -50, 0]} scale={0.001}>
      <mesh>
        <sphereGeometry args={[1, 8, 8]} />
        <meshBasicMaterial color="#fff" toneMapped={false} />
      </mesh>
      <mesh>
        <cylinderGeometry args={[0.5, 0.9, 6, 8, 1, true]} />
        <meshBasicMaterial color="#fff" transparent blending={THREE.AdditiveBlending} side={THREE.DoubleSide} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh>
        <icosahedronGeometry args={[1, 1]} />
        <meshBasicMaterial color="#fff" wireframe transparent toneMapped={false} />
      </mesh>
      <mesh>
        <ringGeometry args={[0.92, 1, 16]} />
        <meshBasicMaterial color="#fff" transparent blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh>
        <octahedronGeometry args={[0.13, 0]} />
        <meshBasicMaterial color="#8cc4ff" toneMapped={false} transparent opacity={0.9} />
      </mesh>
      <Halo color="#ffffff" size={1} strength={0.5} />
    </group>
  );
}

/* ---------- table ---------- */
function Table() {
  const { g, selected, pendingTargets, toggleTarget } = useGame(
    useShallow((s) => ({ g: s.game!, selected: s.selected, pendingTargets: s.pendingTargets, toggleTarget: s.toggleTarget })),
  );
  const nexusGroup = useRef<THREE.Group>(null);
  const target = nexusTarget(g);
  const leaderPull = Math.max(...g.players.map((p) => p.pull));
  const energy = Math.max(0, leaderPull) / WIN_PULL;

  const legal = useMemo(() => {
    if (!selected || g.current !== 0) return [] as number[];
    const c = g.players[0].hand.find((h) => h.uid === selected);
    if (!c) return [];
    const d = cardDef(c.id);
    if (d.target === 'none') return [];
    return legalTargets(g, g.players[0], d.id);
  }, [g, selected]);

  useFrame((st, dt) => {
    if (!nexusGroup.current) return;
    const ng = nexusGroup.current;
    ng.position.lerp(target, Math.min(1, dt * 1.4));
    ng.position.y = 1.15 + Math.sin(st.clock.elapsedTime * 0.9) * 0.08;
    live.nexus.copy(ng.position);
  });

  return (
    <>
      <HexFloor nexus={live.nexus} seatR={SEAT_R} />
      <group ref={nexusGroup} position={[0, 1.15, 0]}>
        <Nexus energy={energy} tint={g.phase === 'over' ? '#ffffff' : '#a46bff'} />
      </group>
      {g.players.map((p) => (
        <Tether key={`t${p.index}`} p={p} />
      ))}
      {g.players.map((p) => {
        const targetable = legal.includes(p.index);
        const pick = () => targetable && toggleTarget(p.index);
        return (
          <group key={p.index}>
            <Token p={p} current={g.current === p.index && g.phase === 'playing'} targetable={targetable} chosen={pendingTargets.includes(p.index)} onPick={pick} />
            {!p.human && <SeatLabel p={p} current={g.current === p.index && g.phase === 'playing'} targetable={targetable} chosen={pendingTargets.includes(p.index)} onPick={pick} />}
          </group>
        );
      })}
      <FxDirector />
      <Prewarm />
    </>
  );
}

function PostFx({ quality }: { quality: 'high' | 'low' }) {
  const ca = useRef<ChromaticAberrationEffect>(null);
  const offset = useMemo(() => new THREE.Vector2(0.0004, 0.0004), []);
  useFrame(() => {
    const v = 0.0004 + cameraFx.trauma * 0.006;
    offset.set(v, v * 0.6);
    if (ca.current) ca.current.offset = offset;
  });
  if (quality === 'low') {
    return (
      <EffectComposer multisampling={0}>
        <Bloom kernelSize={KernelSize.MEDIUM} intensity={1.1} luminanceThreshold={0.42} luminanceSmoothing={0.25} />
        <Vignette offset={0.32} darkness={0.85} />
      </EffectComposer>
    );
  }
  return (
    <EffectComposer multisampling={4}>
      <Bloom kernelSize={KernelSize.LARGE} intensity={1.6} luminanceThreshold={0.3} luminanceSmoothing={0.3} />
      <ChromaticAberration ref={ca} offset={offset} radialModulation modulationOffset={0.35} blendFunction={BlendFunction.NORMAL} />
      <Noise premultiply blendFunction={BlendFunction.SCREEN} opacity={0.05} />
      <Vignette offset={0.3} darkness={0.88} />
    </EffectComposer>
  );
}

export default function GameScene() {
  const quality = useGame((s) => s.settings.quality);
  const has = useGame((s) => !!s.game);
  return (
    <Canvas
      className={styles.canvas}
      dpr={quality === 'high' ? [1, 2] : [1, 1.25]}
      camera={{ position: [0, 9.2, 10.6], fov: 40, near: 0.1, far: 200 }}
      gl={{ antialias: false, powerPreference: 'high-performance', alpha: false }}
      onCreated={({ gl }) => {
        gl.setClearColor('#000000');
        gl.toneMapping = THREE.ACESFilmicToneMapping;
      }}
    >
      <Suspense fallback={null}>
        <fog attach="fog" args={['#000000', 14, 34]} />
        <ambientLight intensity={0.25} />
        <directionalLight position={[3, 8, 5]} intensity={0.6} color="#d8d2ff" />
        <Stars radius={70} depth={40} count={quality === 'high' ? 4000 : 1500} factor={3.2} saturation={0} fade speed={0.4} />
        <Sparkles count={quality === 'high' ? 80 : 30} scale={[14, 4, 14]} position={[0, 2, 0]} size={1.6} speed={0.25} opacity={0.35} color="#b48cff" />
        <CameraRig />
        {has && <Table />}
        <Particles />
        <PostFx quality={quality} />
      </Suspense>
    </Canvas>
  );
}

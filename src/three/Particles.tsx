'use client';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

/* ============================================================
   One pooled, additive point-sprite system for every burst,
   stream and sparkle in the scene — a single draw call.
   ============================================================ */
const MAX = 4096;

interface Emit {
  pos: THREE.Vector3;
  count: number;
  color: THREE.Color;
  speed?: number;
  spread?: number;
  up?: number;
  life?: number;
  size?: number;
  gravity?: number;
  drag?: number;
  /** if set, particles home in on this point instead of flying free */
  target?: THREE.Vector3;
  delay?: number;
}

const state = {
  pos: new Float32Array(MAX * 3),
  vel: new Float32Array(MAX * 3),
  col: new Float32Array(MAX * 3),
  life: new Float32Array(MAX), // remaining
  maxLife: new Float32Array(MAX),
  size: new Float32Array(MAX),
  gravity: new Float32Array(MAX),
  drag: new Float32Array(MAX),
  target: new Float32Array(MAX * 3),
  homing: new Uint8Array(MAX),
  delay: new Float32Array(MAX),
  cursor: 0,
};

export function emit(e: Emit) {
  const s = state;
  for (let n = 0; n < e.count; n++) {
    const i = s.cursor;
    s.cursor = (s.cursor + 1) % MAX;
    const dir = new THREE.Vector3(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1).normalize();
    const sp = (e.speed ?? 3) * (0.35 + Math.random() * 0.9);
    const spread = e.spread ?? 0.05;
    s.pos[i * 3] = e.pos.x + dir.x * spread;
    s.pos[i * 3 + 1] = e.pos.y + dir.y * spread;
    s.pos[i * 3 + 2] = e.pos.z + dir.z * spread;
    s.vel[i * 3] = dir.x * sp;
    s.vel[i * 3 + 1] = dir.y * sp + (e.up ?? 0) * (0.5 + Math.random());
    s.vel[i * 3 + 2] = dir.z * sp;
    const c = e.color;
    const tint = 0.75 + Math.random() * 0.5;
    s.col[i * 3] = c.r * tint;
    s.col[i * 3 + 1] = c.g * tint;
    s.col[i * 3 + 2] = c.b * tint;
    const life = (e.life ?? 1) * (0.6 + Math.random() * 0.6);
    s.life[i] = life;
    s.maxLife[i] = life;
    s.size[i] = (e.size ?? 0.12) * (0.5 + Math.random());
    s.gravity[i] = e.gravity ?? 0;
    s.drag[i] = e.drag ?? 1.6;
    s.delay[i] = (e.delay ?? 0) * Math.random();
    if (e.target) {
      s.homing[i] = 1;
      s.target[i * 3] = e.target.x;
      s.target[i * 3 + 1] = e.target.y;
      s.target[i * 3 + 2] = e.target.z;
    } else s.homing[i] = 0;
  }
}

const vert = /* glsl */ `
  attribute float aSize;
  attribute float aAlpha;
  attribute vec3 aColor;
  varying vec3 vColor;
  varying float vAlpha;
  uniform float uPixel;
  void main() {
    vColor = aColor;
    vAlpha = aAlpha;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    float z = max(-mv.z, 0.5);
    gl_PointSize = aAlpha > 0.001 ? clamp(aSize * uPixel / z, 0.0, 96.0) : 0.0;
    gl_Position = projectionMatrix * mv;
  }
`;
const frag = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c);
    float a = (1.0 - smoothstep(0.0, 0.5, d));
    a = a * a;
    if (vAlpha <= 0.001) discard;
    gl_FragColor = vec4(vColor * (1.0 + a * 2.0), a * vAlpha);
  }
`;

export function Particles() {
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(state.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aColor', new THREE.BufferAttribute(state.col, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aSize', new THREE.BufferAttribute(new Float32Array(MAX), 1).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aAlpha', new THREE.BufferAttribute(new Float32Array(MAX), 1).setUsage(THREE.DynamicDrawUsage));
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 100);
    return g;
  }, []);
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: vert,
        fragmentShader: frag,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: { uPixel: { value: 600 } },
      }),
    [],
  );
  const ref = useRef<THREE.Points>(null);

  useFrame((st, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05);
    mat.uniforms.uPixel.value = st.size.height * st.viewport.dpr * 0.9;
    const s = state;
    const size = geo.getAttribute('aSize') as THREE.BufferAttribute;
    const alpha = geo.getAttribute('aAlpha') as THREE.BufferAttribute;
    for (let i = 0; i < MAX; i++) {
      if (s.life[i] <= 0) {
        if ((alpha.array as Float32Array)[i] !== 0) (alpha.array as Float32Array)[i] = 0;
        continue;
      }
      if (s.delay[i] > 0) {
        s.delay[i] -= dt;
        (alpha.array as Float32Array)[i] = 0;
        continue;
      }
      s.life[i] -= dt;
      const k = i * 3;
      const drag = Math.exp(-s.drag[i] * dt);
      s.vel[k] *= drag;
      s.vel[k + 1] = s.vel[k + 1] * drag - s.gravity[i] * dt;
      s.vel[k + 2] *= drag;
      s.pos[k] += s.vel[k] * dt;
      s.pos[k + 1] += s.vel[k + 1] * dt;
      s.pos[k + 2] += s.vel[k + 2] * dt;
      if (s.homing[i]) {
        // stable exponential approach toward the target (never overshoots)
        const t = 1 - s.life[i] / s.maxLife[i];
        const a = Math.min(1, dt * (1.5 + 14 * t * t));
        s.pos[k] += (s.target[k] - s.pos[k]) * a;
        s.pos[k + 1] += (s.target[k + 1] - s.pos[k + 1]) * a;
        s.pos[k + 2] += (s.target[k + 2] - s.pos[k + 2]) * a;
      }
      if (!Number.isFinite(s.pos[k]) || !Number.isFinite(s.pos[k + 1]) || !Number.isFinite(s.pos[k + 2])) {
        s.life[i] = 0;
        s.pos[k] = s.pos[k + 1] = s.pos[k + 2] = 0;
        (alpha.array as Float32Array)[i] = 0;
        continue;
      }
      const l = Math.max(0, s.life[i] / s.maxLife[i]);
      (size.array as Float32Array)[i] = s.size[i] * (0.4 + l * 0.8);
      (alpha.array as Float32Array)[i] = Math.min(1, l * 1.6);
    }
    (geo.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
    (geo.getAttribute('aColor') as THREE.BufferAttribute).needsUpdate = true;
    size.needsUpdate = true;
    alpha.needsUpdate = true;
  });

  return <points ref={ref} geometry={geo} material={mat} frustumCulled={false} renderOrder={10} />;
}

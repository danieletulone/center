'use client';
import { useFrame } from '@react-three/fiber';
import { useMemo } from 'react';
import * as THREE from 'three';

/* The table: a faint hex grid on the void, fading at the edge,
   lit from above by the Nexus wherever it currently leans. */
const vert = /* glsl */ `
  varying vec3 vW;
  void main(){ vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }
`;
const frag = /* glsl */ `
  varying vec3 vW;
  uniform vec3 uNexus;
  uniform float uTime;
  uniform float uSeatR;
  uniform float uPulse;
  uniform float uPulseR;
  float hexDist(vec2 p){ p = abs(p); return max(dot(p, normalize(vec2(1.0,1.7320508))), p.x); }
  vec4 hexCoords(vec2 uv){
    vec2 r = vec2(1.0, 1.7320508); vec2 h = r * 0.5;
    vec2 a = mod(uv, r) - h; vec2 b = mod(uv - h, r) - h;
    vec2 gv = dot(a,a) < dot(b,b) ? a : b;
    return vec4(gv, uv - gv);
  }
  void main(){
    vec2 p = vW.xz;
    float r = length(p);
    vec4 hc = hexCoords(p * 1.25);
    float e = 0.5 - hexDist(hc.xy);
    float line = (1.0 - smoothstep(0.0, 0.035, e));
    float fade = (1.0 - smoothstep(2.0, 9.5, r));
    float nd = length(p - uNexus.xz);
    float glow = exp(-nd * 0.95);
    vec3 col = vec3(0.075, 0.075, 0.085) * line * fade;
    col += vec3(0.36, 0.14, 0.72) * line * glow * 0.55;
    col += vec3(0.30, 0.08, 0.60) * glow * 0.06;
    // seat ring
    float ring = (1.0 - smoothstep(0.0, 0.02, abs(r - uSeatR)));
    col += vec3(0.30) * ring * 0.35;
    float ring2 = (1.0 - smoothstep(0.0, 0.012, abs(r - uSeatR * 0.45)));
    col += vec3(0.25) * ring2 * 0.35;
    // shockwave pulse
    float pr = (1.0 - smoothstep(0.0, 0.25, abs(nd - uPulseR))) * uPulse;
    col += vec3(0.85, 0.8, 1.0) * pr * (0.4 + line);
    // radial ticks around seat ring
    float ang = atan(p.y, p.x + 1e-4);
    float tick = step(0.985, cos(ang * 72.0)) * (1.0 - smoothstep(0.0, 0.25, abs(r - uSeatR - 0.25)));
    col += vec3(0.18) * tick;
    gl_FragColor = vec4(col, 1.0);
  }
`;

export const floorPulse = { strength: 0, radius: 0 };

export function HexFloor({ nexus, seatR }: { nexus: THREE.Vector3; seatR: number }) {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: vert,
        fragmentShader: frag,
        uniforms: {
          uNexus: { value: new THREE.Vector3() },
          uTime: { value: 0 },
          uSeatR: { value: seatR },
          uPulse: { value: 0 },
          uPulseR: { value: 0 },
        },
      }),
    [seatR],
  );
  useFrame((st, dt) => {
    mat.uniforms.uTime.value = st.clock.elapsedTime;
    (mat.uniforms.uNexus.value as THREE.Vector3).copy(nexus);
    if (floorPulse.strength > 0) {
      floorPulse.radius += dt * 7;
      floorPulse.strength = Math.max(0, floorPulse.strength - dt * 0.7);
    }
    mat.uniforms.uPulse.value = floorPulse.strength;
    mat.uniforms.uPulseR.value = floorPulse.radius;
  });
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} material={mat} position={[0, -0.001, 0]}>
      <circleGeometry args={[11, 96]} />
    </mesh>
  );
}

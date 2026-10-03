'use client';
import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

/* ============================================================
   The Nexus — the single point of contention. A shader orb whose
   interior swirls with all four elements (Plasma, Cryo, Particle,
   Flux) under a bone-white fresnel rim, ringed by slow orbits.
   ============================================================ */
const noise = /* glsl */ `
  vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
  vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
  vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
  vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
  float snoise(vec3 v){
    const vec2 C=vec2(1.0/6.0,1.0/3.0);const vec4 D=vec4(0.0,0.5,1.0,2.0);
    vec3 i=floor(v+dot(v,C.yyy));vec3 x0=v-i+dot(i,C.xxx);
    vec3 g=step(x0.yzx,x0.xyz);vec3 l=1.0-g;vec3 i1=min(g.xyz,l.zxy);vec3 i2=max(g.xyz,l.zxy);
    vec3 x1=x0-i1+C.xxx;vec3 x2=x0-i2+C.yyy;vec3 x3=x0-D.yyy;
    i=mod289(i);
    vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
    float n_=0.142857142857;vec3 ns=n_*D.wyz-D.xzx;
    vec4 j=p-49.0*floor(p*ns.z*ns.z);vec4 x_=floor(j*ns.z);vec4 y_=floor(j-7.0*x_);
    vec4 x=x_*ns.x+ns.yyyy;vec4 y=y_*ns.x+ns.yyyy;vec4 h=1.0-abs(x)-abs(y);
    vec4 b0=vec4(x.xy,y.xy);vec4 b1=vec4(x.zw,y.zw);
    vec4 s0=floor(b0)*2.0+1.0;vec4 s1=floor(b1)*2.0+1.0;vec4 sh=-step(h,vec4(0.0));
    vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
    vec3 p0=vec3(a0.xy,h.x);vec3 p1=vec3(a0.zw,h.y);vec3 p2=vec3(a1.xy,h.z);vec3 p3=vec3(a1.zw,h.w);
    vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
    p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
    vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0);m=m*m;
    return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
  }
`;

const vert = /* glsl */ `
  varying vec3 vPos;
  varying vec3 vNormal;
  varying vec3 vView;
  uniform float uTime;
  ${noise}
  void main(){
    vec3 p = position;
    float n = snoise(p * 1.6 + uTime * 0.35);
    p += normal * n * 0.035;
    vPos = position;
    vec4 wp = modelMatrix * vec4(p, 1.0);
    vNormal = normalize(mat3(modelMatrix) * normal);
    vView = normalize(cameraPosition - wp.xyz);
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;
const frag = /* glsl */ `
  varying vec3 vPos;
  varying vec3 vNormal;
  varying vec3 vView;
  uniform float uTime;
  uniform float uEnergy;
  uniform vec3 uTint;
  ${noise}
  void main(){
    vec3 p = vPos * 1.4;
    float t = uTime * 0.22;
    float n1 = snoise(p + vec3(t, -t * 0.7, t * 0.4));
    float n2 = snoise(p * 2.3 - vec3(t * 1.3, t, -t));
    float n3 = snoise(p * 4.7 + vec3(-t, t * 2.0, t));
    vec3 fire = vec3(1.0, 0.25, 0.08);
    vec3 ice = vec3(0.15, 0.55, 1.0);
    vec3 arc = vec3(0.62, 0.18, 1.0);
    vec3 flux = vec3(0.92, 0.95, 1.0);
    vec3 col = mix(arc, ice, smoothstep(-0.4, 0.6, n1));
    col = mix(col, fire, smoothstep(0.35, 0.85, n2) * 0.8);
    col = mix(col, flux, smoothstep(0.55, 0.95, n3) * 0.7);
    col = mix(col, uTint, 0.35);
    float fres = pow(clamp(1.0 - dot(vNormal, vView), 0.0, 1.0), 2.6);
    float core = smoothstep(0.2, 1.0, abs(n1 * 0.6 + n2 * 0.4));
    vec3 outc = col * (0.35 + core * 1.6) * (0.8 + uEnergy * 0.8);
    outc += vec3(1.0) * fres * (1.4 + uEnergy);
    gl_FragColor = vec4(outc, 1.0);
  }
`;

const haloFrag = /* glsl */ `
  varying vec2 vUv;
  uniform vec3 uColor;
  uniform float uStrength;
  void main(){
    float d = length(vUv - 0.5) * 2.0;
    float a = pow(max(0.0, 1.0 - d), 3.0) * uStrength;
    gl_FragColor = vec4(uColor * a, a);
  }
`;
const haloVert = /* glsl */ `
  varying vec2 vUv;
  void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;

export function Halo({ color = '#8a3cff', size = 4, strength = 0.6 }: { color?: string; size?: number; strength?: number }) {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: haloVert,
        fragmentShader: haloFrag,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: { uColor: { value: new THREE.Color(color) }, uStrength: { value: strength } },
      }),
    // created once; uniforms follow props below
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  useEffect(() => () => mat.dispose(), [mat]);
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ camera }, dt) => {
    ref.current?.quaternion.copy(camera.quaternion);
    (mat.uniforms.uColor.value as THREE.Color).lerp(new THREE.Color(color), Math.min(1, dt * 3));
    mat.uniforms.uStrength.value += (strength - mat.uniforms.uStrength.value) * Math.min(1, dt * 3);
  });
  return (
    <mesh ref={ref} material={mat} renderOrder={2}>
      <planeGeometry args={[size, size]} />
    </mesh>
  );
}

export function Nexus({ radius = 0.62, energy = 0.4, tint = '#b48cff', rings = true }: { radius?: number; energy?: number; tint?: string; rings?: boolean }) {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: vert,
        fragmentShader: frag,
        uniforms: { uTime: { value: 0 }, uEnergy: { value: energy }, uTint: { value: new THREE.Color(tint) } },
        toneMapped: false,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const group = useRef<THREE.Group>(null);
  const r1 = useRef<THREE.Mesh>(null);
  const r2 = useRef<THREE.Mesh>(null);
  const r3 = useRef<THREE.Mesh>(null);
  useFrame((st, dt) => {
    mat.uniforms.uTime.value = st.clock.elapsedTime;
    mat.uniforms.uEnergy.value += (energy - mat.uniforms.uEnergy.value) * Math.min(1, dt * 2);
    (mat.uniforms.uTint.value as THREE.Color).lerp(new THREE.Color(tint), Math.min(1, dt * 1.5));
    if (r1.current) r1.current.rotation.z += dt * 0.25;
    if (r2.current) r2.current.rotation.z -= dt * 0.18;
    if (r3.current) r3.current.rotation.y += dt * 0.12;
  });
  return (
    <group ref={group}>
      <mesh material={mat}>
        <icosahedronGeometry args={[radius, 24]} />
      </mesh>
      <Halo color={tint} size={radius * 9} strength={0.55 + energy * 0.4} />
      <Halo color="#ffffff" size={radius * 3.2} strength={0.35} />
      {rings && (
        <>
          <mesh ref={r1} rotation={[Math.PI / 2.3, 0, 0]}>
            <torusGeometry args={[radius * 1.65, 0.006, 6, 160]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={0.45} toneMapped={false} />
          </mesh>
          <mesh ref={r2} rotation={[Math.PI / 1.8, 0.5, 0]}>
            <torusGeometry args={[radius * 2.1, 0.004, 6, 180]} />
            <meshBasicMaterial color="#b48cff" transparent opacity={0.4} toneMapped={false} />
          </mesh>
          <mesh ref={r3} rotation={[0.3, 0, 0.9]}>
            <torusGeometry args={[radius * 2.6, 0.003, 6, 200]} />
            <meshBasicMaterial color="#6fb1ff" transparent opacity={0.25} toneMapped={false} />
          </mesh>
        </>
      )}
      <pointLight color={tint} intensity={1.5 + energy * 4} distance={8} decay={1.8} />
    </group>
  );
}

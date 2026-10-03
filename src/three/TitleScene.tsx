'use client';
/* The title tableau: the Nexus suspended in the void, four element
   motes circling it on a tilted orbit, a hex table falling away into
   darkness, and a slow, drifting camera. */
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Sparkles, Stars } from '@react-three/drei';
import { Bloom, EffectComposer, Noise, Vignette } from '@react-three/postprocessing';
import { BlendFunction, KernelSize } from 'postprocessing';
import { Suspense, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Halo, Nexus } from './Nexus';
import { HexFloor } from './HexFloor';
import { EL_HEX } from './palette';
import { Particles, emit } from './Particles';

function Mote({ element, phase, radius, speed, tilt }: { element: string; phase: number; radius: number; speed: number; tilt: number }) {
  const ref = useRef<THREE.Mesh>(null);
  const last = useRef(0);
  const color = useMemo(() => new THREE.Color(EL_HEX[element]), [element]);
  useFrame((st) => {
    const t = st.clock.elapsedTime * speed + phase;
    const x = Math.cos(t) * radius;
    const z = Math.sin(t) * radius;
    const y = 2.4 + Math.sin(t) * tilt;
    ref.current?.position.set(x, y, z);
    if (st.clock.elapsedTime - last.current > 0.016 && ref.current) {
      last.current = st.clock.elapsedTime;
      emit({ pos: ref.current.position.clone(), count: 2, color, speed: 0.08, life: 1.1, size: 0.16, drag: 0.4 });
    }
  });
  return (
    <mesh ref={ref}>
      <sphereGeometry args={[0.09, 16, 16]} />
      <meshBasicMaterial color={EL_HEX[element]} toneMapped={false} />
      <Halo color={EL_HEX[element]} size={1.1} strength={0.9} />
    </mesh>
  );
}

function Drift() {
  const { camera, pointer, size } = useThree();
  useFrame((st, dt) => {
    const t = st.clock.elapsedTime * 0.05;
    const portrait = size.width / size.height < 0.9;
    const z = portrait ? 17 : 10;
    const want = new THREE.Vector3(Math.sin(t) * (portrait ? 1 : 2.2) + pointer.x * 0.8, 1.2 + pointer.y * 0.3, z + Math.cos(t) * 0.8);
    camera.position.lerp(want, Math.min(1, dt * 1.2));
    camera.lookAt(0, portrait ? -2.2 : 0.25, 0);
  });
  return null;
}

export default function TitleScene({ quality = 'high' }: { quality?: 'high' | 'low' }) {
  const nexus = useMemo(() => new THREE.Vector3(0, 2.4, 0), []);
  return (
    <Canvas
      dpr={quality === 'high' ? [1, 2] : [1, 1.25]}
      camera={{ position: [0, 1.2, 10], fov: 42 }}
      gl={{ antialias: false, powerPreference: 'high-performance' }}
      onCreated={({ gl }) => {
        gl.setClearColor('#000000');
        gl.toneMapping = THREE.ACESFilmicToneMapping;
      }}
      style={{ position: 'absolute', inset: 0 }}
    >
      <Suspense fallback={null}>
        <fog attach="fog" args={['#000000', 9, 28]} />
        <Stars radius={60} depth={50} count={quality === 'high' ? 5000 : 2000} factor={3} saturation={0} fade speed={0.5} />
        <Sparkles count={120} scale={[16, 6, 16]} position={[0, 2.4, 0]} size={1.4} speed={0.2} opacity={0.4} color="#c4a0ff" />
        <group position={[0, 2.4, 0]}>
          <Nexus radius={0.9} energy={0.55} />
        </group>
        <HexFloor nexus={nexus} seatR={4.4} />
        <Mote element="fire" phase={0} radius={2.6} speed={0.55} tilt={0.5} />
        <Mote element="ice" phase={Math.PI / 2} radius={2.6} speed={0.55} tilt={0.5} />
        <Mote element="arcane" phase={Math.PI} radius={2.6} speed={0.55} tilt={0.5} />
        <Mote element="flux" phase={(Math.PI * 3) / 2} radius={2.6} speed={0.55} tilt={0.5} />
        <Particles />
        <Drift />
        <EffectComposer multisampling={quality === 'high' ? 4 : 0}>
          <Bloom kernelSize={KernelSize.LARGE} intensity={1.7} luminanceThreshold={0.28} luminanceSmoothing={0.3} />
          <Noise premultiply blendFunction={BlendFunction.SCREEN} opacity={0.05} />
          <Vignette offset={0.25} darkness={0.9} />
        </EffectComposer>
      </Suspense>
    </Canvas>
  );
}

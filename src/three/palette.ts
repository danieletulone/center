import * as THREE from 'three';

/** Emitted-light colours for each element (HDR-friendly; bloom does the glow). */
export const EL_HEX: Record<string, string> = {
  fire: '#ff4a1c',
  ice: '#3d9bff',
  arcane: '#a63cff',
  flux: '#e8eef7',
  mono: '#ffffff',
};
export const EL_COLOR: Record<string, THREE.Color> = Object.fromEntries(
  Object.entries(EL_HEX).map(([k, v]) => [k, new THREE.Color(v)]),
);

export const SEAT_R = 4.4;
/** World position of a seat: 0 south (toward camera) · 1 west · 2 north · 3 east. */
export function seatPos(seat: number, r = SEAT_R): THREE.Vector3 {
  const a = [Math.PI / 2, Math.PI, -Math.PI / 2, 0][((seat % 4) + 4) % 4];
  return new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r);
}

/** Shared mutable camera trauma, decays in the camera rig. */
export const cameraFx = { trauma: 0, flash: 0 };
export function addTrauma(v: number) {
  cameraFx.trauma = Math.min(1, cameraFx.trauma + v);
}

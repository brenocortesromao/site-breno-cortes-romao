import { BufferGeometry, CylinderGeometry, IcosahedronGeometry, Matrix4, Quaternion, Vector3 } from "three";
import { mergeGeometries, mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";

/**
 * Corais procedurais (sem modelos externos), feitos para serem vistos como
 * SILHUETA no fundo: galhos cônicos com poucos lados, gerados por recursão com
 * semente fixa (o recife é sempre o mesmo). Três tipos:
 * - "galho": coral ramificado em 3D (tipo chifre de veado);
 * - "leque": gorgônia, ramificada num plano só (lê muito bem contra a luz);
 * - "rocha": coral-cérebro / pedra, esfera deformada e achatada.
 * Cada tipo vira UMA geometria (galhos fundidos), desenhada com instâncias.
 */

/** Gerador pseudoaleatório com semente (mulberry32). */
export function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const UP = new Vector3(0, 1, 0);
const ONE = new Vector3(1, 1, 1);

type Opts = {
  radial: number;
  spread: number;
  upBias: number;
  shrink: number;
  kids: (rand: () => number) => number;
  /** Normal do plano (leque); sem ela, os galhos abrem em 3D. */
  plane?: Vector3;
};

function branch(parts: BufferGeometry[], start: Vector3, dir: Vector3, len: number, r: number, depth: number, rand: () => number, o: Opts) {
  const g = new CylinderGeometry(r * o.shrink, r, len, o.radial, 1, true);
  g.deleteAttribute("uv");
  g.translate(0, len / 2, 0);
  g.applyMatrix4(new Matrix4().compose(start, new Quaternion().setFromUnitVectors(UP, dir), ONE));
  parts.push(g);
  if (depth === 0) return;
  const end = start.clone().addScaledVector(dir, len);
  const n = o.kids(rand);
  for (let k = 0; k < n; k++) {
    let axis: Vector3;
    if (o.plane) axis = o.plane;
    else {
      axis = new Vector3(rand() - 0.5, rand() - 0.5, rand() - 0.5).cross(dir);
      if (axis.lengthSq() < 1e-4) axis.set(1, 0, 0);
      axis.normalize();
    }
    // filhos abrem para lados alternados
    const side = n > 1 ? (k % 2 ? 1 : -1) : rand() < 0.5 ? 1 : -1;
    const nd = dir.clone().applyAxisAngle(axis, side * o.spread * (0.45 + rand() * 0.7));
    nd.y += o.upBias;
    nd.normalize();
    branch(parts, end, nd, len * (0.62 + rand() * 0.22), r * o.shrink, depth - 1, rand, o);
  }
}

function merged(parts: BufferGeometry[]) {
  const g = mergeGeometries(parts);
  parts.forEach((p) => p.dispose());
  return g;
}

export function branchCoral(seed: number, light: boolean) {
  const rand = seeded(seed);
  const parts: BufferGeometry[] = [];
  // galhos grossos e curtos, abrindo em cúpula (lê como coral, não como árvore)
  const o: Opts = { radial: 5, spread: 0.85, upBias: 0.35, shrink: 0.74, kids: (r) => (r() < 0.5 ? 2 : 3) };
  const trunks = 6;
  for (let i = 0; i < trunks; i++) {
    const a = (i / trunks) * Math.PI * 2 + rand();
    const dir = new Vector3(Math.cos(a) * 0.9, 1, Math.sin(a) * 0.9).normalize();
    branch(parts, new Vector3(0, -0.1, 0), dir, 0.65 + rand() * 0.3, 0.2, light ? 2 : 3, rand, o);
  }
  return merged(parts);
}

export function fanCoral(seed: number, light: boolean) {
  const rand = seeded(seed);
  const parts: BufferGeometry[] = [];
  const o: Opts = { radial: 4, spread: 0.6, upBias: 0.12, shrink: 0.74, kids: () => 2, plane: new Vector3(0, 0, 1) };
  for (const a of [-0.35, 0.3]) {
    const dir = new Vector3(Math.sin(a), 1, 0).normalize();
    branch(parts, new Vector3(0, -0.1, 0), dir, 1.0 + rand() * 0.3, 0.08, light ? 3 : 5, rand, o);
  }
  return merged(parts);
}

export function moundCoral(seed: number, light: boolean) {
  const rand = seeded(seed);
  let g: BufferGeometry = new IcosahedronGeometry(1, light ? 1 : 2);
  g.deleteAttribute("uv");
  g.deleteAttribute("normal");
  g = mergeVertices(g);
  const p = g.getAttribute("position");
  const ph = [rand() * 6, rand() * 6, rand() * 6];
  const v = new Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const bump = 1 + 0.16 * Math.sin(v.x * 3.1 + ph[0]) * Math.sin(v.y * 2.7 + ph[1]) + 0.08 * Math.sin(v.z * 5.3 + ph[2]);
    v.multiplyScalar(bump);
    v.y = Math.max(v.y * 0.62, -0.25);
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
}

import {
  BufferAttribute,
  ConeGeometry,
  CylinderGeometry,
  IcosahedronGeometry,
  Matrix4,
  Quaternion,
  Vector3,
  type BufferGeometry,
} from "three";
import { mergeGeometries, mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";

/** Gerador pseudoaleatório com semente (mesma floresta a cada montagem). */
export function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Abeto/pinheiro alto estilo Alasca (procedural, sem modelo externo): tronco
 * fino e copa estreita em "andares" de galhos (cones abertos sobrepostos, com
 * a borda irregular e caída). Unidade: altura 1, raio do andar mais baixo 1;
 * cada instância escala (raio, altura, raio).
 * `detail` alto = perto da câmera (mais andares e lados); baixo = longe (LOD).
 */
export function spruceGeometry(detail: "near" | "far") {
  const near = detail === "near";
  const tiers = near ? 9 : 4;
  // lados pares: as pontas alternam galho comprido / curto (estrela)
  const sides = near ? 14 : 8;
  const rand = seeded(near ? 3 : 4);
  const parts: BufferGeometry[] = [];
  const trunk = new CylinderGeometry(0.035, 0.07, 0.3, near ? 6 : 4, 1, true);
  trunk.translate(0, 0.15, 0);
  parts.push(trunk);
  for (let i = 0; i < tiers; i++) {
    const f = i / (tiers - 1); // 0 = andar de baixo
    const r = 1 - f * 0.9;
    const y0 = 0.12 + f * 0.74;
    const h = (0.88 / tiers) * 2.4 * (1 - f * 0.35);
    const cone = new ConeGeometry(r, h, sides, 1, true);
    const p = cone.getAttribute("position");
    // borda em estrela: galhos (pontas compridas e caídas) entre reentrâncias;
    // o mesmo ângulo repete no vértice da costura, então decide pelo ângulo
    const len: number[] = [];
    for (let k = 0; k < sides; k++) len.push(k % 2 === 0 ? 0.85 + rand() * 0.3 : 0.45 + rand() * 0.15);
    const droop: number[] = len.map((l) => (l > 0.7 ? 0.06 + rand() * 0.08 : 0.01) * h);
    for (let k = 0; k < p.count; k++) {
      const y = p.getY(k);
      if (y < 0) {
        const a = Math.atan2(p.getX(k), p.getZ(k));
        const idx = Math.round(((a < 0 ? a + Math.PI * 2 : a) / (Math.PI * 2)) * sides) % sides;
        p.setXYZ(k, p.getX(k) * len[idx], y - droop[idx], p.getZ(k) * len[idx]);
      }
    }
    cone.rotateY(rand() * Math.PI);
    cone.translate(0, y0 + h / 2, 0);
    parts.push(cone);
  }
  parts.forEach((g) => {
    g.deleteAttribute("uv");
    g.computeVertexNormals();
  });
  const g = mergeGeometries(parts);
  parts.forEach((p) => p.dispose());
  return g;
}

/**
 * Urso-pardo low-poly procedural (silhueta: corcova no ombro, cabeça larga,
 * focinho, orelhas pequenas, patas grossas), comprimento ~2,3, altura do
 * ombro ~1,3, olhando para +Z, pés em y = 0.
 * Atributos para animar no shader, sem esqueleto (BEAR_VERT):
 * - `aPart`: 0 corpo, 1 cabeça, 2 diant.-esq., 3 diant.-dir., 4 tras.-esq.,
 *   5 tras.-dir.;
 * - `aPivot`: ponto em torno do qual a parte gira (ombro, quadril, pescoço).
 */
export function bearGeometry(light: boolean) {
  const d = light ? 1 : 2;
  const parts: BufferGeometry[] = [];
  const blob = (
    part: number,
    pivot: [number, number, number],
    scale: [number, number, number],
    pos: [number, number, number],
    pitch = 0,
    detail = d,
    taper = 0,
  ) => {
    let g: BufferGeometry = new IcosahedronGeometry(1, detail);
    g.deleteAttribute("uv");
    g.deleteAttribute("normal");
    g = mergeVertices(g);
    g.applyMatrix4(
      new Matrix4().compose(
        new Vector3(...pos),
        new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), pitch),
        new Vector3(...scale),
      ),
    );
    if (taper) {
      // patas mais finas embaixo (não "salsichas")
      const p = g.getAttribute("position");
      for (let i = 0; i < p.count; i++) {
        const k = 1 - taper * (1 - Math.min(1, Math.max(0, (p.getY(i) - pos[1] + scale[1]) / (2 * scale[1]))));
        p.setX(i, pos[0] + (p.getX(i) - pos[0]) * k);
        p.setZ(i, pos[2] + (p.getZ(i) - pos[2]) * k);
      }
    }
    g.computeVertexNormals();
    const n = g.getAttribute("position").count;
    g.setAttribute("aPart", new BufferAttribute(new Float32Array(n).fill(part), 1));
    const pv = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) pv.set(pivot, i * 3);
    g.setAttribute("aPivot", new BufferAttribute(pv, 3));
    parts.push(g);
  };
  const O: [number, number, number] = [0, 0, 0];
  // corpo: tronco, corcova sobre os ombros, quadril, pescoço
  blob(0, O, [0.44, 0.42, 0.92], [0, 0.86, -0.05]);
  blob(0, O, [0.4, 0.34, 0.46], [0, 1.08, 0.36], -0.25);
  blob(0, O, [0.41, 0.42, 0.44], [0, 0.88, -0.62]);
  blob(0, O, [0.27, 0.28, 0.34], [0, 0.98, 0.78], 0.35);
  // cabeça (gira no pescoço): crânio, focinho, orelhas
  const neck: [number, number, number] = [0, 0.98, 0.86];
  blob(1, neck, [0.25, 0.24, 0.27], [0, 0.96, 1.12]);
  blob(1, neck, [0.13, 0.12, 0.19], [0, 0.88, 1.37], 0.2);
  blob(1, neck, [0.065, 0.075, 0.04], [0.16, 1.17, 1.06], 0, 1);
  blob(1, neck, [0.065, 0.075, 0.04], [-0.16, 1.17, 1.06], 0, 1);
  // patas: antebraço/coxa + pata, giram no ombro/quadril
  for (const [part, x, z, thick] of [
    [2, 0.23, 0.5, 0.15],
    [3, -0.23, 0.5, 0.15],
    [4, 0.23, -0.66, 0.18],
    [5, -0.23, -0.66, 0.18],
  ] as const) {
    const pivot: [number, number, number] = [x, 0.9, z];
    blob(part, pivot, [thick, 0.47, thick * 1.2], [x, 0.49, z], 0, d, 0.42);
    blob(part, pivot, [0.11, 0.055, 0.16], [x, 0.05, z + 0.05], 0, 1);
  }
  const g = mergeGeometries(parts);
  parts.forEach((p) => p.dispose());
  return g;
}

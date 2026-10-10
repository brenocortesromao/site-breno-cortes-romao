/**
 * Terreno procedural de cordilheiras para o fundo de "O que eu faço" + "O que
 * muda" (MountainScene). Tudo é gerado uma vez, na CPU, sem assets:
 * - altura: ridged multifractal (cristas marcadas) com domain warp leve e um
 *   pico principal no centro (0, 0), onde a câmera termina;
 * - malha com LOD por distribuição: a grade é mais densa perto do pico (onde
 *   a câmera chega perto) e mais esparsa nas bordas, ao longe;
 * - sombras longas de sol baixo: para cada vértice, marcha na direção do sol
 *   sobre uma grade de alturas e guarda a penumbra (atributo "aShadow").
 */

// ---------- simplex 2D (Stefan Gustavson, domínio público) ----------
const F2 = 0.5 * (Math.sqrt(3) - 1);
const G2 = (3 - Math.sqrt(3)) / 6;
const GRAD = [
  [1, 1], [-1, 1], [1, -1], [-1, -1], [1, 0], [-1, 0], [0, 1], [0, -1],
];
const PERM = (() => {
  // permutação fixa (semente constante: o terreno é sempre o mesmo)
  const p = Array.from({ length: 256 }, (_, i) => i);
  let s = 1337;
  for (let i = 255; i > 0; i--) {
    s = (s * 16807) % 2147483647;
    const j = s % (i + 1);
    [p[i], p[j]] = [p[j], p[i]];
  }
  return Uint8Array.from([...p, ...p]);
})();

function snoise(x: number, y: number) {
  const s = (x + y) * F2;
  const i = Math.floor(x + s);
  const j = Math.floor(y + s);
  const t = (i + j) * G2;
  const x0 = x - (i - t);
  const y0 = y - (j - t);
  const i1 = x0 > y0 ? 1 : 0;
  const j1 = 1 - i1;
  const x1 = x0 - i1 + G2;
  const y1 = y0 - j1 + G2;
  const x2 = x0 - 1 + 2 * G2;
  const y2 = y0 - 1 + 2 * G2;
  const ii = i & 255;
  const jj = j & 255;
  let n = 0;
  const corner = (dx: number, dy: number, g: number) => {
    const tt = 0.5 - dx * dx - dy * dy;
    if (tt < 0) return 0;
    const gr = GRAD[g % 8];
    return tt * tt * tt * tt * (gr[0] * dx + gr[1] * dy);
  };
  n += corner(x0, y0, PERM[ii + PERM[jj]]);
  n += corner(x1, y1, PERM[ii + i1 + PERM[jj + j1]]);
  n += corner(x2, y2, PERM[ii + 1 + PERM[jj + 1]]);
  return 70 * n; // ~[-1, 1]
}

/** Altura do terreno em (x, z), em unidades de mundo. */
export function terrainHeight(x: number, z: number) {
  // domain warp leve: cristas menos retas, mais "erodidas"
  const wx = x + 2.2 * snoise(x * 0.045 + 3.1, z * 0.045 - 1.7);
  const wz = z + 2.2 * snoise(x * 0.045 - 5.3, z * 0.045 + 2.9);
  // ridged multifractal
  let f = 0.075;
  let amp = 1;
  let weight = 1;
  let h = 0;
  for (let o = 0; o < 6; o++) {
    let n = 1 - Math.abs(snoise(wx * f, wz * f));
    n *= n;
    n *= weight;
    weight = Math.min(1, Math.max(0, n * 1.7));
    h += n * amp;
    f *= 2.0;
    amp *= 0.42; // oitavas altas fracas: cristas nítidas, sem serrilhado
  }
  // vales mais largos, cristas mais altas
  h = Math.pow(h * 0.6, 1.4) * 3.4;
  // maciço largo no centro: amplifica as cristas do próprio ruído (o pico
  // principal continua com forma natural, sem cone)
  const r2 = x * x + z * z;
  return h * (0.8 + 1.5 * Math.exp(-r2 / 70)) + 1.4 * Math.exp(-r2 / 110);
}

export const EXTENT = { minX: -42, maxX: 42, minZ: -60, maxZ: 22 };
/** Direção PARA o sol: baixo (luz rasante), vindo da esquerda, um pouco à frente. */
export const SUN = (() => {
  const v = [-0.88, 0.3, 0.3];
  const l = Math.hypot(v[0], v[1], v[2]);
  return v.map((c) => c / l) as [number, number, number];
})();

/** Coordenada não uniforme: densa perto de 0 (pico), esparsa nas bordas. */
function lodAxis(u: number, min: number, max: number) {
  // u ∈ [0, 1] → posição; o centro (0) fica em c = 0 do mundo
  const span = u < 0.5 ? -min : max;
  const k = Math.abs(u - 0.5) * 2; // 0 no centro, 1 na borda
  return Math.sign(u - 0.5) * span * Math.pow(k, 1.4);
}

export type TerrainData = {
  positions: Float32Array;
  shadows: Float32Array;
  indices: Uint32Array;
  /** Pico principal (perto do centro): alvo final da câmera. */
  peak: [number, number, number];
  /** Altura de referência para a linha de neve (percentil 85). */
  snow: number;
};

/** Gera malha + sombras. `n` = vértices por lado (densidade). */
export function buildTerrain(n: number): TerrainData {
  // grade uniforme auxiliar, só para marchar as sombras
  const G = 320;
  const gx0 = EXTENT.minX;
  const gz0 = EXTENT.minZ;
  const gdx = (EXTENT.maxX - EXTENT.minX) / (G - 1);
  const gdz = (EXTENT.maxZ - EXTENT.minZ) / (G - 1);
  const grid = new Float32Array(G * G);
  for (let j = 0; j < G; j++) for (let i = 0; i < G; i++) grid[j * G + i] = terrainHeight(gx0 + i * gdx, gz0 + j * gdz);
  const sample = (x: number, z: number) => {
    const fx = Math.min(G - 1.001, Math.max(0, (x - gx0) / gdx));
    const fz = Math.min(G - 1.001, Math.max(0, (z - gz0) / gdz));
    const i = Math.floor(fx);
    const j = Math.floor(fz);
    const tx = fx - i;
    const tz = fz - j;
    const a = grid[j * G + i];
    const b = grid[j * G + i + 1];
    const c = grid[(j + 1) * G + i];
    const d = grid[(j + 1) * G + i + 1];
    return (a * (1 - tx) + b * tx) * (1 - tz) + (c * (1 - tx) + d * tx) * tz;
  };

  const positions = new Float32Array(n * n * 3);
  const shadows = new Float32Array(n * n);
  const horiz = Math.hypot(SUN[0], SUN[2]);
  const sx = SUN[0] / horiz;
  const sz = SUN[2] / horiz;
  const rise = SUN[1] / horiz; // subida do raio por unidade horizontal
  const peak: [number, number, number] = [0, 0, 0];
  for (let j = 0; j < n; j++) {
    const z = lodAxis(j / (n - 1), EXTENT.minZ, EXTENT.maxZ);
    for (let i = 0; i < n; i++) {
      const x = lodAxis(i / (n - 1), EXTENT.minX, EXTENT.maxX);
      const y = terrainHeight(x, z);
      const k = j * n + i;
      positions[k * 3] = x;
      positions[k * 3 + 1] = y;
      positions[k * 3 + 2] = z;
      if (y > peak[1] && x * x + z * z < 40) peak.splice(0, 3, x, y, z);
      // sombra suave: menor folga (raio - terreno) / distância ao longo do sol
      let lit = 1;
      let dist = 0.35;
      for (let s = 0; s < 70 && lit > 0; s++) {
        const px = x + sx * dist;
        const pz = z + sz * dist;
        if (px < EXTENT.minX || px > EXTENT.maxX || pz < EXTENT.minZ || pz > EXTENT.maxZ) break;
        // viés: a malha (mais densa que a grade) não pode se sombrear sozinha
        const gap = y + 0.12 + rise * dist - sample(px, pz);
        lit = Math.min(lit, (6 * gap) / dist);
        dist += 0.12 + dist * 0.06;
      }
      shadows[k] = Math.max(0, Math.min(1, lit));
    }
  }

  const indices = new Uint32Array((n - 1) * (n - 1) * 6);
  let q = 0;
  for (let j = 0; j < n - 1; j++)
    for (let i = 0; i < n - 1; i++) {
      const a = j * n + i;
      const b = a + 1;
      const c = a + n;
      const d = c + 1;
      indices.set([a, c, b, b, c, d], q);
      q += 6;
    }
  const sorted = Float32Array.from(grid).sort();
  return { positions, shadows, indices, peak, snow: sorted[Math.floor(sorted.length * 0.85)] };
}

const cache = new Map<number, TerrainData>();
/**
 * buildTerrain com cache (~220 ms no desktop, ~1 s num celular). O
 * MountainBackdrop gera o terreno num Web Worker (terrain.worker.ts) logo após
 * o carregamento e guarda aqui com `primeTerrain`: a thread principal não
 * trava. Se o worker não existir ou ainda não terminou quando a cena monta,
 * gera aqui mesmo, como antes (mesmo resultado).
 */
export function getTerrain(n: number): TerrainData {
  let d = cache.get(n);
  if (!d) cache.set(n, (d = buildTerrain(n)));
  return d;
}

export const hasTerrain = (n: number) => cache.has(n);
/** Guarda um terreno gerado fora da thread principal (worker). */
export function primeTerrain(n: number, d: TerrainData) {
  if (!cache.has(n)) cache.set(n, d);
}

/** Densidade da malha (vértices por lado): desktop / mobile. */
export const terrainSize = (light: boolean) => (light ? 190 : 480);

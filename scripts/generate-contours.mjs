// Gera as curvas de nível (mapa topográfico) usadas como grafismo de fundo
// das seções claras. Sem dependências: ruído simplex 2D + marching squares.
// Uso: node scripts/generate-contours.mjs   (grava em public/graphics/)
// Os SVGs são usados como MÁSCARA CSS; a cor vem do token --graphic.
import { mkdirSync, writeFileSync } from "node:fs";

const W = 1600;
const H = 1000;
const COLS = 128;
const ROWS = 80;
const LEVELS = 18;

/** PRNG determinístico (mulberry32): mesma semente = mesmo desenho. */
function rng(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Simplex 2D (Gustavson), com permutação embaralhada pela semente. */
function simplex(seed) {
  const rand = rng(seed);
  const p = Array.from({ length: 256 }, (_, i) => i);
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [p[i], p[j]] = [p[j], p[i]];
  }
  const perm = new Array(512).fill(0).map((_, i) => p[i & 255]);
  const grad = [[1, 1], [-1, 1], [1, -1], [-1, -1], [1, 0], [-1, 0], [0, 1], [0, -1]];
  const F2 = 0.5 * (Math.sqrt(3) - 1);
  const G2 = (3 - Math.sqrt(3)) / 6;
  return (xin, yin) => {
    const s = (xin + yin) * F2;
    const i = Math.floor(xin + s);
    const j = Math.floor(yin + s);
    const t = (i + j) * G2;
    const x0 = xin - (i - t);
    const y0 = yin - (j - t);
    const [i1, j1] = x0 > y0 ? [1, 0] : [0, 1];
    const x1 = x0 - i1 + G2;
    const y1 = y0 - j1 + G2;
    const x2 = x0 - 1 + 2 * G2;
    const y2 = y0 - 1 + 2 * G2;
    const ii = i & 255;
    const jj = j & 255;
    const corner = (x, y, gi) => {
      let tt = 0.5 - x * x - y * y;
      if (tt < 0) return 0;
      tt *= tt;
      const g = grad[gi % 8];
      return tt * tt * (g[0] * x + g[1] * y);
    };
    return (
      70 *
      (corner(x0, y0, perm[ii + perm[jj]]) +
        corner(x1, y1, perm[ii + i1 + perm[jj + j1]]) +
        corner(x2, y2, perm[ii + 1 + perm[jj + 1]]))
    );
  };
}

/** Campo suave e "líquido": fbm de 3 oitavas com leve deformação de domínio. */
function field(seed) {
  const n = simplex(seed);
  const warp = simplex(seed + 101);
  return (x, y) => {
    const wx = x + 0.35 * warp(x * 0.6, y * 0.6);
    const wy = y + 0.35 * warp(x * 0.6 + 7.3, y * 0.6 - 3.1);
    return n(wx, wy) * 0.65 + n(wx * 2.1, wy * 2.1) * 0.25 + n(wx * 4.3, wy * 4.3) * 0.1;
  };
}

/** Marching squares + costura dos segmentos em polilinhas. */
function contours(f, scale) {
  const gx = W / COLS;
  const gy = H / ROWS;
  const v = [];
  for (let r = 0; r <= ROWS; r++) {
    v.push([]);
    for (let c = 0; c <= COLS; c++) v[r].push(f((c * gx) / scale, (r * gy) / scale * 1.0));
  }
  const lines = [];
  for (let k = 1; k < LEVELS; k++) {
    const iso = -0.75 + (1.5 * k) / LEVELS;
    const segs = [];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const a = v[r][c], b = v[r][c + 1], d = v[r + 1][c], e = v[r + 1][c + 1];
        const lerp = (p, q) => (iso - p) / (q - p);
        const pts = [];
        const x = c * gx, y = r * gy;
        if ((a < iso) !== (b < iso)) pts.push([x + lerp(a, b) * gx, y]);
        if ((b < iso) !== (e < iso)) pts.push([x + gx, y + lerp(b, e) * gy]);
        if ((d < iso) !== (e < iso)) pts.push([x + lerp(d, e) * gx, y + gy]);
        if ((a < iso) !== (d < iso)) pts.push([x, y + lerp(a, d) * gy]);
        if (pts.length === 2) segs.push(pts);
        else if (pts.length === 4) segs.push([pts[0], pts[1]], [pts[2], pts[3]]);
      }
    }
    // costura: junta segmentos que compartilham pontas
    const key = ([px, py]) => `${px.toFixed(2)},${py.toFixed(2)}`;
    const ends = new Map();
    segs.forEach((s, i) => {
      for (const p of s) {
        const kk = key(p);
        if (!ends.has(kk)) ends.set(kk, []);
        ends.get(kk).push(i);
      }
    });
    const used = new Set();
    for (let i = 0; i < segs.length; i++) {
      if (used.has(i)) continue;
      used.add(i);
      const line = [...segs[i]];
      for (const dir of [1, -1]) {
        let grow = true;
        while (grow) {
          grow = false;
          const tip = dir === 1 ? line[line.length - 1] : line[0];
          for (const j of ends.get(key(tip)) ?? []) {
            if (used.has(j)) continue;
            used.add(j);
            const [p, q] = segs[j];
            const next = key(p) === key(tip) ? q : p;
            if (dir === 1) line.push(next);
            else line.unshift(next);
            grow = true;
            break;
          }
        }
      }
      if (line.length > 3) lines.push(simplify(line, 0.7));
    }
  }
  return lines;
}

/** Ramer–Douglas–Peucker: menos pontos, mesmo desenho. */
function simplify(pts, eps) {
  if (pts.length < 3) return pts;
  const [a, b] = [pts[0], pts[pts.length - 1]];
  let max = 0, idx = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    const [x, y] = pts[i];
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const len = Math.hypot(dx, dy) || 1;
    const dist = Math.abs(dy * x - dx * y + b[0] * a[1] - b[1] * a[0]) / len;
    if (dist > max) { max = dist; idx = i; }
  }
  if (max <= eps) return [a, b];
  return [...simplify(pts.slice(0, idx + 1), eps).slice(0, -1), ...simplify(pts.slice(idx), eps)];
}

function svg(lines) {
  const d = lines
    .map((l) => "M" + l.map(([x, y]) => `${Math.round(x * 10) / 10} ${Math.round(y * 10) / 10}`).join("L"))
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice"><path d="${d}" fill="none" stroke="#000" stroke-width="1.1" stroke-linejoin="round" stroke-linecap="round"/></svg>\n`;
}

mkdirSync("public/graphics", { recursive: true });
for (const [name, seed, scale] of [["contours-a", 7, 520], ["contours-b", 23, 600]]) {
  const out = svg(contours(field(seed), scale));
  writeFileSync(`public/graphics/${name}.svg`, out);
  console.log(`${name}.svg  ${(out.length / 1024).toFixed(1)} KB`);
}

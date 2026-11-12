"use client";

import { useEffect, useRef } from "react";

/**
 * Fundo da seção Tecnologia: camuflagem em tons de preto que se deforma devagar
 * (ruído quantizado em 4 tons, canvas em baixa resolução ampliado com suavização)
 * e, dentro das manchas mais claras, código descendo em colunas, bem apagado.
 * Bordas de cima e de baixo somem em gradiente para a transição de fundo entre
 * seções continuar suave. Celular / prefers-reduced-motion: camuflagem parada,
 * sem código. Pausa fora da tela.
 */
const TONES = [
  [10, 11, 13],
  [16, 17, 20],
  [23, 24, 28],
  [30, 32, 36],
];
const CHARS = "{}<>/;=()[]01+*&|:.#$%".split("");
const CELL = 14;
const SCALE = 6;

function hash(x: number, y: number, z: number) {
  let n = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(z, 1274126177);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}
function vnoise(x: number, y: number, z: number) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const xf = x - xi, yf = y - yi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), w = zf * zf * (3 - 2 * zf);
  const L = (a: number, b: number, t: number) => a + (b - a) * t;
  return L(
    L(L(hash(xi, yi, zi), hash(xi + 1, yi, zi), u), L(hash(xi, yi + 1, zi), hash(xi + 1, yi + 1, zi), u), v),
    L(L(hash(xi, yi, zi + 1), hash(xi + 1, yi, zi + 1), u), L(hash(xi, yi + 1, zi + 1), hash(xi + 1, yi + 1, zi + 1), u), v),
    w,
  );
}
const fbm = (x: number, y: number, z: number) =>
  vnoise(x, y, z) * 0.65 + vnoise(x * 2.03 + 7.1, y * 2.03 + 3.7, z * 1.6) * 0.35;
const level = (n: number) => (n < 0.42 ? 0 : n < 0.52 ? 1 : n < 0.62 ? 2 : 3);

export default function CodeCamo() {
  const camoRef = useRef<HTMLCanvasElement>(null);
  const codeRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const camo = camoRef.current, code = codeRef.current;
    if (!camo || !code) return;
    const host = camo.parentElement as HTMLElement;
    const cctx = camo.getContext("2d");
    const kctx = code.getContext("2d");
    if (!cctx || !kctx) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const small = window.matchMedia("(max-width: 767px)").matches || (navigator.hardwareConcurrency || 8) <= 4;
    const animate = !reduce && !small;

    let W = 0, H = 0, cw = 0, ch = 0, cols = 0, rows = 0;
    let img: ImageData | null = null;
    let field = new Float32Array(0);
    let offsets = new Float32Array(0), speeds = new Float32Array(0);
    let glyphs: string[] = [];

    const size = () => {
      W = host.clientWidth; H = host.clientHeight;
      if (!W || !H) return;
      cw = Math.max(2, Math.ceil(W / SCALE)); ch = Math.max(2, Math.ceil(H / SCALE));
      camo.width = cw; camo.height = ch;
      img = cctx.createImageData(cw, ch);
      field = new Float32Array(cw * ch);
      code.width = W; code.height = H;
      cols = Math.ceil(W / CELL); rows = Math.ceil(H / CELL) + 1;
      offsets = new Float32Array(cols).map(() => Math.random() * H);
      speeds = new Float32Array(cols).map(() => 14 + Math.random() * 26);
      glyphs = Array.from({ length: cols * rows }, () => CHARS[(Math.random() * CHARS.length) | 0]);
    };

    const drawCamo = (t: number) => {
      if (!img) return;
      const d = img.data, z = t * 0.035, s = 0.012 * SCALE;
      for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
        const n = fbm(x * s, y * s, z), i = y * cw + x;
        field[i] = n;
        const c = TONES[level(n)], p = i * 4;
        d[p] = c[0]; d[p + 1] = c[1]; d[p + 2] = c[2]; d[p + 3] = 255;
      }
      cctx.putImageData(img, 0, 0);
    };

    const drawCode = (dt: number) => {
      kctx.clearRect(0, 0, W, H);
      kctx.font = `${CELL - 2}px "Geist Mono", ui-monospace, monospace`;
      kctx.textBaseline = "top";
      for (let k = 0; k < 24; k++) glyphs[(Math.random() * glyphs.length) | 0] = CHARS[(Math.random() * CHARS.length) | 0];
      for (let c = 0; c < cols; c++) {
        offsets[c] = (offsets[c] + speeds[c] * dt) % (rows * CELL);
        const x = c * CELL;
        for (let r = 0; r < rows; r++) {
          const y = (r * CELL + offsets[c]) % (rows * CELL) - CELL;
          if (y < -CELL || y > H) continue;
          const fx = Math.min(cw - 1, (x / SCALE) | 0), fy = Math.min(ch - 1, Math.max(0, (y / SCALE) | 0));
          const lv = level(field[fy * cw + fx]);
          if (lv < 2) continue;
          kctx.fillStyle = lv === 3 ? "rgba(235,238,245,0.16)" : "rgba(235,238,245,0.08)";
          kctx.fillText(glyphs[c * rows + r], x, y);
        }
      }
    };

    size();
    let t = Math.random() * 100, last = performance.now(), acc = 0, raf = 0, visible = false;
    drawCamo(t);
    if (animate) drawCode(0);

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(0.1, (now - last) / 1000); last = now;
      if (!visible) return;
      acc += dt;
      if (acc < 1 / 20) return;
      t += acc; drawCamo(t); drawCode(acc); acc = 0;
    };

    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; last = performance.now(); }, { rootMargin: "100px" });
    io.observe(host);
    const ro = new ResizeObserver(() => { size(); drawCamo(t); if (animate) drawCode(0); });
    ro.observe(host);
    if (animate) raf = requestAnimationFrame(loop);

    return () => { cancelAnimationFrame(raf); io.disconnect(); ro.disconnect(); };
  }, []);

  const fade = "linear-gradient(to bottom, transparent 0%, #000 14%, #000 86%, transparent 100%)";
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden" style={{ WebkitMaskImage: fade, maskImage: fade }}>
      <canvas ref={camoRef} className="absolute inset-0 h-full w-full" style={{ imageRendering: "auto", filter: "blur(2px)" }} />
      <canvas ref={codeRef} className="absolute inset-0 h-full w-full" />
      <div
        className="absolute inset-0"
        style={{ background: "radial-gradient(ellipse 55% 60% at 22% 40%, rgba(8,9,11,0.85), rgba(8,9,11,0) 70%)" }}
      />
    </div>
  );
}

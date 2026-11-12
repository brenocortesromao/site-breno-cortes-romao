"use client";

import { useEffect, useRef, useState } from "react";
import { presetFor, useSceneTier, type Tier } from "@/lib/quality";
import { isMobileUI, isTouchScrolling, stableResizeObserver } from "@/lib/mobile";
import { SEQUENCE_FULL, SEQUENCE_LIGHT, SHAPES, type ShapeId } from "./techShapes";

/**
 * "Código que vira forma" (seção Tecnologia): canvas 2D, sem WebGL.
 * ~2.400 caracteres de código (fillText em Geist Mono, quase todos de 1
 * símbolo) formam, em loop, as formas de techShapes.ts: esfera → montanhas →
 * Machu Picchu → Grande Muralha → Petra → Coliseu → Chichén Itzá → Taj Mahal →
 * Cristo Redentor → elmo espartano → "</>" (5 s em cada, 1,5 s de transição).
 * As formas 3D giram 360° devagar; as silhuetas oscilam entre -25° e +25°.
 * Na troca, cada caractere viaja com easing, atraso aleatório e um leve
 * redemoinho. Cada um troca de símbolo a cada 0,5 a 2 s e ~3% acendem por um
 * instante. Perspectiva: longe = 6 px e opaco baixo; perto = 11 px e branco.
 * Mouse: empurra os caracteres num raio de ~100 px (voltam com mola) e inclina
 * a forma. Entrada: começam espalhados como poeira e se juntam na esfera.
 * Desempenho: caracteres agrupados por faixa de profundidade (6 faixas = 6
 * tamanhos/opacidades: poucas trocas de font e fillStyle por quadro); formas
 * montadas uma por tarefa (sem tarefa longa); pausa fora da tela; DPR do
 * nível (lib/quality.ts). Celular e nível baixo: 900 caracteres e 5 formas.
 * prefers-reduced-motion: o Cristo Redentor parado.
 */

const SYMBOLS = "{}<>/;=()[]01+*&|:.".split("");
const WORDS = ["const", "fn", "if", "=>"];
/** Quase tudo é símbolo de 1 caractere (silhueta nítida). */
const WORD_CHANCE = 0.03;
const GLYPHS = [...SYMBOLS, ...WORDS];
const HOLD = 5;
const MORPH = 1.5;
/** Atraso máximo de cada caractere dentro da transição (s). */
const MAX_DELAY = 0.45;
const ENTRY = 2.6;
const ENTRY_DELAY = 0.9;
const SPIN = 0.32; // rad/s
/** Oscilação das silhuetas: ±25°. */
const SWAY = (25 * Math.PI) / 180;
const CAM = 3.4; // distância da câmera (raio da forma = 1)
const MIN_PX = 6;
const BUCKETS = 6; // 6..11 px
const PUSH_R = 100;
const PUSH_MAX = 46;
const LIT_FRACTION = 0.03;
const LIT_TIME = 0.35;

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const pickGlyph = () =>
  Math.random() < WORD_CHANCE ? SYMBOLS.length + Math.floor(Math.random() * WORDS.length) : Math.floor(Math.random() * SYMBOLS.length);

type Memo = { entered: boolean };

function startScene(opts: {
  canvas: HTMLCanvasElement;
  count: number;
  sequence: ShapeId[];
  maxDpr: number;
  reduce: boolean;
  memo: Memo;
}) {
  const { canvas, count: n, sequence, maxDpr, reduce, memo } = opts;
  const ctx = canvas.getContext("2d");
  if (!ctx) return () => {};
  const family = getComputedStyle(canvas).fontFamily || "monospace";
  let disposed = false;

  // a 1ª forma na hora (é a da entrada); as outras, uma por tarefa
  const shapes: (Float32Array | null)[] = sequence.map(() => null);
  shapes[0] = SHAPES[sequence[0]].build(n, family);
  const sway = sequence.map((id) => SHAPES[id].motion === "sway");
  const timers: number[] = [];
  sequence.forEach((id, k) => {
    if (k === 0) return;
    timers.push(
      window.setTimeout(() => {
        if (!disposed) shapes[k] = SHAPES[id].build(n, family);
      }, k * 40),
    );
  });
  /** Forma k, ou a primeira enquanto a k ainda não foi montada. */
  const shapeAt = (k: number) => shapes[k] ?? shapes[0]!;

  // poeira: nuvem em volta da forma (direção aleatória, raio 0,5 a 1,8),
  // dentro do canvas (sem a borda reta do recorte)
  const dust = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const u = rand(-1, 1);
    const a = rand(0, Math.PI * 2);
    const r = 0.5 + Math.sqrt(Math.random()) * 1.3;
    const s = Math.sqrt(1 - u * u);
    dust[i * 3] = Math.cos(a) * s * r;
    dust[i * 3 + 1] = u * r * 0.62;
    dust[i * 3 + 2] = Math.sin(a) * s * r;
  }

  const glyph = new Uint8Array(n);
  const nextSwap = new Float32Array(n);
  const delay = new Float32Array(n);
  const litUntil = new Float32Array(n);
  const swirl = new Float32Array(n); // sentido e força do redemoinho
  const ox = new Float32Array(n);
  const oy = new Float32Array(n);
  const sx = new Float32Array(n);
  const sy = new Float32Array(n);
  const bucketOf = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    glyph[i] = pickGlyph();
    nextSwap[i] = rand(0.5, 2);
    delay[i] = Math.random();
    swirl[i] = rand(0.6, 1.2) * (Math.random() < 0.5 ? -1 : 1);
  }
  const lists = Array.from({ length: BUCKETS }, () => new Int32Array(n));
  const counts = new Int32Array(BUCKETS);
  const lit = new Int32Array(n);
  // cinza (longe) → branco (perto); opacidade sobe com a proximidade
  const fills = Array.from({ length: BUCKETS }, (_, b) => {
    const d = b / (BUCKETS - 1);
    const c = Math.round(138 + (242 - 138) * d);
    return `rgba(${c},${c},${Math.round(c * 0.99)},${(0.2 + 0.8 * Math.pow(d, 1.2)).toFixed(3)})`;
  });
  const fonts = Array.from({ length: BUCKETS }, (_, b) => `${MIN_PX + b}px ${family}`);

  let W = 0;
  let H = 0;
  let dpr = 1;
  const resize = () => {
    const r = canvas.getBoundingClientRect();
    W = r.width;
    H = r.height;
    dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
    canvas.width = Math.max(1, Math.round(W * dpr));
    canvas.height = Math.max(1, Math.round(H * dpr));
    if (reduce) draw(0, 0);
  };

  // tempo da cena (só avança nos quadros desenhados)
  let time = 0;
  /** Entrada: -1 feita (ou pulada); null esperando a seção aparecer; número = início. */
  let entryAt: number | null = memo.entered || reduce ? -1 : null;
  const cycle = HOLD + MORPH;
  let spin = 0.6;
  const tilt = { x: 0, y: 0, tx: 0, ty: 0 };
  const mouse = { x: 0, y: 0, on: false };
  // silhuetas: rotação que desfaz o giro e deixa só a oscilação de ±25°
  let cS = 1;
  let sS = 0;

  const p = new Float32Array(3);
  const va = new Float32Array(3);
  const vb = new Float32Array(3);
  /** Ponto k da forma de índice s (-1 = poeira); silhuetas já compensadas do giro. */
  const read = (s: number, k: number, out: Float32Array) => {
    const src = s < 0 ? dust : shapeAt(s);
    const x = src[k];
    const z = src[k + 2];
    if (s >= 0 && sway[s]) {
      out[0] = x * cS + z * sS;
      out[2] = -x * sS + z * cS;
    } else {
      out[0] = x;
      out[2] = z;
    }
    out[1] = src[k + 1];
    return out;
  };

  /** Interpolação com redemoinho (giro em torno do eixo vertical + leve expansão no meio). */
  const mix = (a: Float32Array, b: Float32Array, e: number, i: number, amount: number) => {
    const x = a[0] + (b[0] - a[0]) * e;
    const y = a[1] + (b[1] - a[1]) * e;
    const z = a[2] + (b[2] - a[2]) * e;
    const bell = Math.sin(Math.PI * e);
    const ang = bell * swirl[i] * 0.9 * amount;
    const grow = 1 + bell * 0.14 * amount;
    const c = Math.cos(ang);
    const s = Math.sin(ang);
    p[0] = (x * c - z * s) * grow;
    p[1] = y * grow + bell * 0.06 * swirl[i];
    p[2] = (x * s + z * c) * grow;
    return p;
  };

  /** Posição do caractere i no tempo da cena (forma, transição ou entrada). */
  const position = (i: number) => {
    const k = i * 3;
    if (entryAt !== -1) {
      const t = entryAt === null ? 0 : Math.min(Math.max((time - entryAt - delay[i] * ENTRY_DELAY) / (ENTRY - ENTRY_DELAY), 0), 1);
      return mix(read(-1, k, va), read(0, k, vb), ease(t), i, 1.6);
    }
    if (sequence.length < 2 || reduce) return read(0, k, p);
    const step = Math.floor(time / cycle);
    const local = time - step * cycle;
    const sa = step % sequence.length;
    const sb = (step + 1) % sequence.length;
    if (local < HOLD) return read(sa, k, p);
    const t = Math.min(Math.max((local - HOLD - delay[i] * MAX_DELAY) / (MORPH - MAX_DELAY), 0), 1);
    return mix(read(sa, k, va), read(sb, k, vb), ease(t), i, 1);
  };

  function draw(dt: number, now: number) {
    ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx!.clearRect(0, 0, W, H);
    if (!W || !H) return;
    const radius = (Math.min(H, W) * 0.8) / 2 / 1.12;
    const cx = W / 2;
    const cy = H / 2;
    tilt.x += (tilt.tx - tilt.x) * Math.min(1, dt * 3);
    tilt.y += (tilt.ty - tilt.y) * Math.min(1, dt * 3);
    const phi = (reduce ? 0 : SWAY * Math.sin(time * 0.55)) - spin;
    cS = Math.cos(phi);
    sS = Math.sin(phi);
    const ay = spin + tilt.y;
    const ax = (reduce ? 0.12 : 0.22) + tilt.x;
    const cY = Math.cos(ay);
    const sY = Math.sin(ay);
    const cX = Math.cos(ax);
    const sX = Math.sin(ax);
    const spring = Math.min(1, dt * 7);
    counts.fill(0);
    let litCount = 0;
    const litRate = (LIT_FRACTION / LIT_TIME) * dt;

    for (let i = 0; i < n; i++) {
      const q = position(i);
      // giro (y) e inclinação (x)
      const x1 = q[0] * cY + q[2] * sY;
      const z1 = -q[0] * sY + q[2] * cY;
      const y2 = q[1] * cX - z1 * sX;
      const z2 = q[1] * sX + z1 * cX;
      const f = CAM / (CAM - z2);
      let x = cx + x1 * radius * f;
      let y = cy - y2 * radius * f;
      // mouse: empurra para fora num raio de PUSH_R; volta com mola
      let tx = 0;
      let ty = 0;
      if (mouse.on) {
        const dx = x - mouse.x;
        const dy = y - mouse.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < PUSH_R * PUSH_R && d2 > 0.01) {
          const d = Math.sqrt(d2);
          const force = Math.pow(1 - d / PUSH_R, 2) * PUSH_MAX;
          tx = (dx / d) * force;
          ty = (dy / d) * force;
        }
      }
      ox[i] += (tx - ox[i]) * spring;
      oy[i] += (ty - oy[i]) * spring;
      x += ox[i];
      y += oy[i];
      sx[i] = x;
      sy[i] = y;
      const depth = Math.min(Math.max((z2 + 1.1) / 2.2, 0), 1);
      const b = Math.round(depth * (BUCKETS - 1));
      bucketOf[i] = b;
      // vida: troca de símbolo e "cursor passando"
      if (dt > 0) {
        nextSwap[i] -= dt;
        if (nextSwap[i] <= 0) {
          glyph[i] = pickGlyph();
          nextSwap[i] = rand(0.5, 2);
        }
        if (litUntil[i] < now && Math.random() < litRate) litUntil[i] = now + LIT_TIME;
      }
      if (litUntil[i] > now) lit[litCount++] = i;
      else lists[b][counts[b]++] = i;
    }

    ctx!.textAlign = "center";
    ctx!.textBaseline = "middle";
    for (let b = 0; b < BUCKETS; b++) {
      if (!counts[b]) continue;
      ctx!.font = fonts[b];
      ctx!.fillStyle = fills[b];
      const list = lists[b];
      for (let j = 0; j < counts[b]; j++) {
        const i = list[j];
        ctx!.fillText(GLYPHS[glyph[i]], sx[i], sy[i]);
      }
    }
    if (litCount) {
      ctx!.fillStyle = "#ffffff";
      ctx!.shadowColor = "rgba(255,255,255,0.8)";
      ctx!.shadowBlur = 6;
      let font = -1;
      for (let j = 0; j < litCount; j++) {
        const i = lit[j];
        const b = Math.min(BUCKETS - 1, bucketOf[i] + 1);
        if (b !== font) {
          ctx!.font = fonts[b];
          font = b;
        }
        ctx!.fillText(GLYPHS[glyph[i]], sx[i], sy[i]);
      }
      ctx!.shadowBlur = 0;
    }
  }

  const ro = stableResizeObserver(resize);
  ro.observe(canvas);
  resize();
  if (reduce)
    return () => {
      disposed = true;
      timers.forEach((id) => window.clearTimeout(id));
      ro.disconnect();
    };

  const onMove = (e: PointerEvent) => {
    const r = canvas.getBoundingClientRect();
    mouse.x = e.clientX - r.left;
    mouse.y = e.clientY - r.top;
    mouse.on = e.pointerType === "mouse";
    if (!mouse.on) return;
    tilt.ty = (mouse.x / r.width - 0.5) * 0.5;
    tilt.tx = (mouse.y / r.height - 0.5) * 0.35;
  };
  const onLeave = () => {
    mouse.on = false;
    tilt.tx = 0;
    tilt.ty = 0;
  };
  canvas.addEventListener("pointermove", onMove, { passive: true });
  canvas.addEventListener("pointerleave", onLeave);

  let raf = 0;
  let last = 0;
  let visible = false;
  const loop = (now: number) => {
    raf = visible ? requestAnimationFrame(loop) : 0;
    const dt = last ? Math.min((now - last) / 1000, 0.05) : 0;
    last = now;
    // celular: congela o quadro enquanto a página rola (como as outras cenas)
    if (isTouchScrolling()) return;
    time += dt;
    spin += dt * SPIN;
    if (entryAt !== null && entryAt >= 0 && time - entryAt > ENTRY) {
      entryAt = -1;
      memo.entered = true;
      time = 0; // a sequência de formas começa na esfera
    }
    draw(dt, now / 1000);
  };
  const io = new IntersectionObserver(
    ([e]) => {
      visible = e.isIntersecting;
      // a poeira começa a se juntar com a forma já bem visível
      if (entryAt === null && e.intersectionRatio >= 0.3) entryAt = time;
      if (visible && !raf) {
        last = 0;
        raf = requestAnimationFrame(loop);
      }
    },
    { threshold: [0, 0.3] },
  );
  io.observe(canvas);

  return () => {
    disposed = true;
    timers.forEach((id) => window.clearTimeout(id));
    io.disconnect();
    ro.disconnect();
    cancelAnimationFrame(raf);
    canvas.removeEventListener("pointermove", onMove);
    canvas.removeEventListener("pointerleave", onLeave);
  };
}

export default function CodeShape({ label }: { label: string }) {
  const box = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const memo = useRef<Memo>({ entered: false });
  const [near, setNear] = useState(false);
  const tier: Tier = useSceneTier("código que vira forma", box, near);

  // só monta perto da tela (~1 tela de antecedência)
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        setNear(true);
        io.disconnect();
      },
      { rootMargin: "100% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!near || !canvas.current) return;
    const el = canvas.current;
    const light = isMobileUI() || tier === "low" || tier === "none";
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let stop = () => {};
    let cancelled = false;
    // espera a Geist Mono (o "</>" é amostrado da fonte)
    document.fonts.ready.then(() => {
      if (cancelled) return;
      stop = startScene({
        canvas: el,
        count: light ? 900 : 2400,
        sequence: reduce ? ["cristo"] : light ? SEQUENCE_LIGHT : SEQUENCE_FULL,
        maxDpr: presetFor(tier === "none" ? "low" : tier).maxDpr,
        reduce,
        memo: memo.current,
      });
    });
    return () => {
      cancelled = true;
      stop();
    };
  }, [near, tier]);

  return (
    <div ref={box} className="relative h-full min-h-[340px] w-full sm:min-h-[460px] lg:min-h-[520px]">
      <canvas ref={canvas} role="img" aria-label={label} className="absolute inset-0 h-full w-full font-mono" />
    </div>
  );
}

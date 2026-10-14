"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { isTouchScrolling, stableResizeObserver } from "@/lib/mobile";

/** Comportamento das correntes em cada etapa (ver `stages`). */
export type FlowStage = {
  /** 0 = correntes juntas; 1 = separação máxima. */
  separation: number;
  /** 1 = fluxo calmo; > 1 = mais agitado. */
  turbulence: number;
};

type Props = {
  /** Seletor (dentro da seção) dos blocos que definem as etapas, na ordem. */
  stagesSelector?: string;
  /** Uma etapa por bloco; interpoladas conforme o bloco mais perto do meio da tela. */
  stages?: FlowStage[];
  /** Elementos atrás dos quais as partículas ficam mais apagadas (títulos, gráficos). */
  dimSelector?: string;
};

/** Ruído 2D de valor, suave (para o campo de fluxo). */
function hash(x: number, y: number) {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
}
function noise(x: number, y: number) {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  const a = hash(ix, iy);
  const b = hash(ix + 1, iy);
  const c = hash(ix, iy + 1);
  const d = hash(ix + 1, iy + 1);
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}
const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(Math.max((x - a) / (b - a), 0), 1);
  return t * t * (3 - 2 * t);
};

/**
 * Campo de partículas em fluxo (Canvas 2D, sem WebGL: não conta no limite de
 * contextos). Fica atrás do conteúdo da seção, fixo na tela (sticky) enquanto
 * ela passa. As partículas andam da esquerda para a direita guiadas por um
 * campo de ruído lento e formam duas correntes: juntas à esquerda, separando-se
 * para a direita (a de cima, "negócio", mais clara; a de baixo, "marca", mais
 * apagada). As etapas (`stages`) mudam separação e turbulência conforme o
 * bloco no meio da tela, com interpolação suave. O cursor afasta as partículas
 * num raio de ~120 px. Rastro curto (o quadro anterior desbota). Grade técnica
 * sutil (CSS) com coordenadas nos cantos.
 * - Um único laço (ticker do GSAP = um requestAnimationFrame), pausado fora da
 *   tela e com a aba oculta; DPR até 2 (1,5 no toque); refeito no resize.
 * - prefers-reduced-motion: grade e partículas paradas (um quadro).
 * Uso: primeiro filho de uma seção `relative` (overflow-clip, nunca hidden,
 * para o sticky funcionar), com o conteúdo em `relative z-10`.
 */
export default function FlowField({
  stagesSelector,
  stages = [{ separation: 1, turbulence: 1 }],
  dimSelector,
}: Props) {
  const root = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const host = root.current;
    const cv = canvas.current;
    const section = host?.parentElement;
    if (!host || !cv || !section) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    const N = coarse || window.innerWidth < 768 ? 400 : 1200;

    // partículas
    const x = new Float32Array(N);
    const y = new Float32Array(N);
    const vy = new Float32Array(N);
    const off = new Float32Array(N); // posição dentro da corrente
    const side = new Int8Array(N); // -1: corrente de cima (negócio); 1: de baixo (marca)
    const alpha = new Float32Array(N);
    const size = new Float32Array(N);
    const speed = new Float32Array(N);

    let W = 0;
    let H = 0;
    let dpr = 1;
    const resize = () => {
      const r = cv.getBoundingClientRect();
      W = r.width;
      H = r.height;
      dpr = Math.min(window.devicePixelRatio || 1, coarse ? 1.5 : 2);
      cv.width = Math.round(W * dpr);
      cv.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const spawn = (i: number, anywhere: boolean) => {
      side[i] = Math.random() < 0.5 ? -1 : 1;
      off[i] = (Math.random() + Math.random() + Math.random() - 1.5) * 0.9; // ~gaussiana
      x[i] = anywhere ? Math.random() * W : -10 - Math.random() * 40;
      y[i] = H * 0.5 + off[i] * H * 0.07;
      vy[i] = 0;
      alpha[i] = 0.08 + Math.random() * 0.27;
      size[i] = Math.random() < 0.5 ? 1 : 1.5;
      speed[i] = 0.75 + Math.random() * 0.5;
    };
    for (let i = 0; i < N; i++) spawn(i, true);

    // estado das etapas (interpolado)
    const cur = { sep: stages[0].separation * 0.5, turb: stages[0].turbulence };
    const target = () => {
      if (!stagesSelector) return stages[0];
      const blocks = [...section.querySelectorAll<HTMLElement>(stagesSelector)];
      if (!blocks.length) return stages[0];
      const mid = window.innerHeight / 2;
      // peso de cada bloco pela distância do centro dele ao meio da tela
      let wsum = 0;
      let sep = 0;
      let turb = 0;
      blocks.forEach((b, i) => {
        const r = b.getBoundingClientRect();
        const d = Math.abs(r.top + r.height / 2 - mid) / window.innerHeight;
        const w = Math.exp(-d * d * 8);
        const st = stages[Math.min(i, stages.length - 1)];
        wsum += w;
        sep += st.separation * w;
        turb += st.turbulence * w;
      });
      return wsum > 1e-3 ? { separation: sep / wsum, turbulence: turb / wsum } : stages[0];
    };

    // áreas mais apagadas (títulos e gráficos), em coordenadas da tela
    let dims: { cx: number; cy: number; rx: number; ry: number }[] = [];
    const readDims = () => {
      if (!dimSelector) return;
      dims = [...section.querySelectorAll<HTMLElement>(dimSelector)].map((el) => {
        const r = el.getBoundingClientRect();
        return { cx: r.left + r.width / 2, cy: r.top + r.height / 2, rx: r.width / 2 + 60, ry: r.height / 2 + 60 };
      });
    };
    const dimAt = (px: number, py: number) => {
      let k = 1;
      for (const d of dims) {
        const nx = (px - d.cx) / d.rx;
        const ny = (py - d.cy) / d.ry;
        const q = nx * nx + ny * ny; // < 1 dentro da elipse
        if (q < 1.6) k = Math.min(k, 0.25 + 0.75 * smooth(0.55, 1.6, q));
      }
      return k;
    };

    // cursor (repulsão)
    const mouse = { x: -9999, y: -9999 };
    const onMove = (e: PointerEvent) => {
      const r = cv.getBoundingClientRect();
      mouse.x = e.clientX - r.left;
      mouse.y = e.clientY - r.top;
    };
    const onLeave = () => {
      mouse.x = mouse.y = -9999;
    };
    // toque: o dedo afasta as partículas enquanto encosta/desliza
    const onTouch = (e: TouchEvent) => {
      const t = e.touches[0];
      if (!t) return;
      const r = cv.getBoundingClientRect();
      mouse.x = t.clientX - r.left;
      mouse.y = t.clientY - r.top;
    };

    let t = 0;
    let frame = 0;
    let tg = target();
    // animação: a leitura das posições vai para uma tarefa logo depois do
    // quadro (layout já limpo); dentro do quadro ela forçava recálculo de
    // layout no meio da rolagem. Quadro parado (reduced motion): leitura direta.
    let deferReads = false;
    let readTimer = 0;
    const readLayout = () => {
      readTimer = 0;
      tg = target();
      readDims();
    };
    readDims();
    const step = (dt: number) => {
      t += dt;
      // posições dos blocos e das áreas apagadas: lidas a cada 4 quadros (sem
      // forçar recálculo de layout em todo quadro)
      if (frame++ % 4 === 0) {
        if (!deferReads) readLayout();
        else if (!readTimer) readTimer = window.setTimeout(readLayout, 0);
      }
      const k = 1 - Math.exp(-dt * 1.5);
      cur.sep += (tg.separation - cur.sep) * k;
      cur.turb += (tg.turbulence - cur.turb) * k;
      const cy = H * 0.5;
      const spread = H * 0.07;
      const maxSep = H * 0.2;
      for (let i = 0; i < N; i++) {
        const px = x[i];
        // campo de fluxo: ruído lento desvia a direção (mais com turbulência)
        const n = noise(px * 0.0025, y[i] * 0.0025 + t * 0.06) - 0.5;
        const ang = n * 1.1 * cur.turb;
        const v = 46 * speed[i];
        // corrente: juntas à esquerda, separando-se para a direita
        const s = cur.sep * smooth(W * 0.12, W * 0.85, px);
        const ty = cy + side[i] * s * maxSep + off[i] * spread * (1 + s * 0.6);
        vy[i] += ((ty - y[i]) * 1.2 + Math.sin(ang) * v * 0.9 - vy[i] * 1.6) * dt;
        let nx = px + Math.cos(ang) * v * dt;
        let ny = y[i] + vy[i] * dt;
        // cursor: afasta com suavidade num raio de 120 px
        const dx = nx - mouse.x;
        const dy = ny - mouse.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < 14400 && d2 > 0.01) {
          const d = Math.sqrt(d2);
          const f = (1 - d / 120) * 90 * dt;
          nx += (dx / d) * f;
          ny += (dy / d) * f;
        }
        x[i] = nx;
        y[i] = ny;
        if (nx > W + 10 || ny < -40 || ny > H + 40) spawn(i, false);
      }
    };

    const draw = () => {
      // rastro curto: desbota o quadro anterior (canvas transparente)
      ctx.globalCompositeOperation = "destination-out";
      ctx.fillStyle = "rgba(0,0,0,0.16)";
      ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = "source-over";
      for (let i = 0; i < N; i++) {
        // de cima mais clara (negócio); de baixo mais apagada (marca)
        const a = alpha[i] * (side[i] < 0 ? 1.15 : 0.7) * dimAt(x[i], y[i]);
        if (a < 0.01) continue;
        ctx.fillStyle = `rgba(207,207,207,${a.toFixed(3)})`;
        ctx.fillRect(x[i], y[i], size[i], size[i]);
      }
    };

    if (reduced) {
      // quadro parado: correntes já formadas
      for (let i = 0; i < 240; i++) step(1 / 30);
      ctx.clearRect(0, 0, W, H);
      draw();
      const ro = stableResizeObserver(() => {
        resize();
        ctx.clearRect(0, 0, W, H);
        draw();
      });
      ro.observe(cv);
      return () => ro.disconnect();
    }

    deferReads = true;
    const tick = (_time: number, deltaTime: number) => {
      const dt = Math.min(deltaTime / 1000, 0.05);
      if (dt <= 0) return;
      if (isTouchScrolling()) return; // celular: congela o quadro enquanto a página rola
      step(dt);
      draw();
    };
    let running = false;
    let visible = false;
    const sync = () => {
      const should = visible && !document.hidden;
      if (should === running) return;
      running = should;
      if (should) gsap.ticker.add(tick);
      else gsap.ticker.remove(tick);
    };
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      sync();
    });
    io.observe(section);
    document.addEventListener("visibilitychange", sync);
    const ro = stableResizeObserver(() => {
      resize();
      for (let i = 0; i < N; i++) if (x[i] > W) spawn(i, true);
    });
    ro.observe(cv);
    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("mouseleave", onLeave);
    window.addEventListener("touchstart", onTouch, { passive: true });
    window.addEventListener("touchmove", onTouch, { passive: true });
    window.addEventListener("touchend", onLeave, { passive: true });

    return () => {
      io.disconnect();
      ro.disconnect();
      gsap.ticker.remove(tick);
      window.clearTimeout(readTimer);
      document.removeEventListener("visibilitychange", sync);
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("mouseleave", onLeave);
      window.removeEventListener("touchstart", onTouch);
      window.removeEventListener("touchmove", onTouch);
      window.removeEventListener("touchend", onLeave);
    };
  }, [stagesSelector, stages, dimSelector]);

  // coordenadas da grade nos cantos (decorativas), no estilo de "TEMPO →"
  const corner = "absolute font-mono text-[10px] uppercase tracking-[0.2em] text-[#5A5A5A]";
  return (
    <div ref={root} aria-hidden="true" className="pointer-events-none absolute inset-0 z-0">
      <div className="sticky top-0 h-svh overflow-hidden">
        {/* grade técnica: linhas de 1px a 3%, células de 80px */}
        <div className="absolute inset-0 [background-image:linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] [background-size:80px_80px]" />
        <span className={`${corner} left-[83px] top-[83px]`}>X 080 · Y 080</span>
        <span className={`${corner} left-[163px] top-[163px]`}>X 160 · Y 160</span>
        <span className={`${corner} bottom-[6px] right-[6px] text-right`}>Δ 00.00</span>
        <span className={`${corner} right-[6px] top-[83px] text-right`}>N 01</span>
        <canvas ref={canvas} className="absolute inset-0 h-full w-full" />
      </div>
    </div>
  );
}

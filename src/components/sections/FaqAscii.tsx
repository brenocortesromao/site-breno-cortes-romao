"use client";

import { useEffect, useRef } from "react";
import { stableResizeObserver } from "@/lib/mobile";

/**
 * Perguntas frequentes: um "?" gigante feito de caracteres em Geist Mono
 * (Canvas 2D, sem WebGL). O "?" (Geist bold) é desenhado num canvas fora da
 * tela e amostrado numa grade (células de ~10x14 px no desktop, 8x11 no
 * mobile); só as células dentro da forma recebem caracteres, tirados das
 * próprias perguntas e respostas (letras das palavras, em sequência). O brilho
 * vai de #3A3A3A a #ECEAE5 pela densidade da forma (bordas apagadas, miolo claro).
 *
 * Vida: ~3% dos caracteres trocam a cada quadro; uma onda de brilho desce pela
 * forma a cada ~4 s; respiração mínima (offset suave por caractere).
 * Acordeão: ao abrir uma pergunta o "?" se desfaz (partículas com velocidade e
 * leve rotação) e se reagrupa num "!" em ~1,2 s (expo.inOut); com todas
 * fechadas volta ao "?"; trocando de uma aberta para outra, um pulso de
 * scramble no "!". Mouse (desktop): raio ~90 px empurra e volta com mola.
 *
 * O canvas passa 48 px da caixa em cada lado (a dispersão não corta na borda).
 * Um único rAF, pausado fora da tela e com a aba oculta; DPR máx. 2 (desktop)
 * / 1,5 (mobile); recalcula no resize e depois de document.fonts.ready.
 * Também liga data-faq-live na seção (o grão do fundo só corre com ela na tela).
 * Reduced motion: "?" estático, sem cintilação nem mouse; a troca vira fade.
 */

const DARK = [58, 58, 58]; // #3A3A3A
const LIGHT = [236, 234, 229]; // #ECEAE5
const LEVELS = 16;
const ALPHAS = 5;
const MORPH = 1.2;
const PULSE = 0.45;
const WAVE_EVERY = 4;
const WAVE_DUR = 1.6;
const RADIUS = 90;
/** Margem do canvas além da caixa (a dispersão da troca não é cortada na borda). */
const BLEED = 48;

type Shape = { x: Float32Array; y: Float32Array; b: Float32Array; n: number };

const expoInOut = (t: number) =>
  t <= 0 ? 0 : t >= 1 ? 1 : t < 0.5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2;

export default function FaqAscii({ text }: { text: string }) {
  const box = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const wrap = box.current;
    const cv = canvas.current;
    const ctx = cv?.getContext("2d");
    if (!wrap || !cv || !ctx) return;
    const section = wrap.closest("section");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    const fineMouse = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

    // fonte dos caracteres: letras das perguntas e respostas, em sequência
    const source = [...text].filter((ch) => /[\p{L}\p{N}]/u.test(ch));
    if (!source.length) source.push("?");
    let ptr = 0;
    const nextChar = () => source[ptr++ % source.length];

    const colors: string[] = [];
    for (let a = 0; a < ALPHAS; a++)
      for (let l = 0; l < LEVELS; l++) {
        const k = l / (LEVELS - 1);
        const c = DARK.map((d, i) => Math.round(d + (LIGHT[i] - d) * k));
        colors.push(`rgba(${c[0]},${c[1]},${c[2]},${((a + 1) / ALPHAS).toFixed(2)})`);
      }

    // estado
    let W = 0;
    let H = 0;
    let dpr = 1;
    let cellW = 10;
    let cellH = 14;
    let fontPx = 12;
    let mono = "monospace";
    let shapes: { q: Shape; e: Shape } | null = null;
    let N = 0;
    let chars: string[] = [];
    // posições/brilho/alpha de partida e de chegada (a morfose sai de onde está)
    let fx = new Float32Array(0), fy = fx, fb = fx, fa = fx;
    let tx = fx, ty = fx, tb = fx, ta = fx;
    let dx = fx, dy = fx, vx = fx, vy = fx; // deslocamento do mouse (mola)
    let sx = fx, sy = fx, rot = fx, delay = fx; // dispersão da morfose
    let target: "q" | "e" = "q";
    let morphT0 = -1;
    let pulseT0 = -1;
    let clock = 0;
    let last = 0;
    let raf = 0;
    let visible = false;
    const mouse = { x: -9999, y: -9999 };
    const bucket = Array.from({ length: LEVELS * ALPHAS }, () => [] as number[]);

    /** Amostra um glifo na grade: células dentro da forma, com o brilho pela densidade. */
    const sample = (glyph: string, font: string, cols: number, rows: number): Shape => {
      const off = document.createElement("canvas");
      off.width = Math.max(1, Math.round(W));
      off.height = Math.max(1, Math.round(H));
      const o = off.getContext("2d", { willReadFrequently: true })!;
      o.font = font;
      o.textAlign = "center";
      o.textBaseline = "alphabetic";
      const m = o.measureText(glyph);
      const gh = m.actualBoundingBoxAscent + m.actualBoundingBoxDescent;
      const baseline = (H - gh) / 2 + m.actualBoundingBoxAscent;
      const cx = W / 2 + (m.actualBoundingBoxLeft - m.actualBoundingBoxRight) / 2;
      o.fillStyle = "#fff";
      o.fillText(glyph, cx, baseline);
      const data = o.getImageData(0, 0, off.width, off.height).data;
      const cov = new Float32Array(cols * rows);
      for (let r = 0; r < rows; r++)
        for (let c = 0; c < cols; c++) {
          let sum = 0;
          let n = 0;
          const x0 = Math.floor(c * cellW), x1 = Math.min(off.width, Math.floor((c + 1) * cellW));
          const y0 = Math.floor(r * cellH), y1 = Math.min(off.height, Math.floor((r + 1) * cellH));
          for (let y = y0; y < y1; y += 2)
            for (let x = x0; x < x1; x += 2) {
              sum += data[(y * off.width + x) * 4 + 3];
              n++;
            }
          cov[r * cols + c] = n ? sum / n / 255 : 0;
        }
      const xs: number[] = [], ys: number[] = [], bs: number[] = [];
      for (let r = 0; r < rows; r++)
        for (let c = 0; c < cols; c++) {
          if (cov[r * cols + c] < 0.35) continue;
          // densidade = média da cobertura em 5x5 células (bordas mais apagadas)
          let s = 0;
          for (let j = -2; j <= 2; j++)
            for (let i = -2; i <= 2; i++) {
              const rr = r + j, cc = c + i;
              if (rr >= 0 && rr < rows && cc >= 0 && cc < cols) s += cov[rr * cols + cc];
            }
          xs.push((c + 0.5) * cellW);
          ys.push((r + 0.5) * cellH);
          bs.push(s / 25);
        }
      // normaliza por forma (o "!" é fino): miolo claro, bordas apagadas
      const max = Math.max(1e-3, ...bs);
      for (let i = 0; i < bs.length; i++) bs[i] = Math.min(1, Math.max(0, (bs[i] / max - 0.3) / 0.7));
      return { x: Float32Array.from(xs), y: Float32Array.from(ys), b: Float32Array.from(bs), n: xs.length };
    };

    /** Liga cada partícula a uma célula do "?" e do "!" (as que sobram somem). */
    const assign = (s: Shape, i: number, n: number) => {
      if (s.n === n) return { j: i, alpha: 1 };
      // forma menor: ordem de leitura proporcional (vizinhas vão para células
      // vizinhas); cada célula fica com uma partícula visível, as outras somem
      const j = Math.floor((i * s.n) / n);
      const alpha = i === 0 || Math.floor(((i - 1) * s.n) / n) !== j ? 1 : 0;
      return { j, alpha };
    };

    const build = () => {
      const rect = wrap.getBoundingClientRect();
      W = rect.width;
      H = rect.height;
      if (W < 20 || H < 20) return;
      const small = window.innerWidth < 768;
      cellW = small ? 8 : 10;
      cellH = small ? 11 : 14;
      fontPx = Math.round(cellH * 0.86);
      dpr = Math.min(window.devicePixelRatio || 1, coarse || small ? 1.5 : 2);
      cv.width = Math.round((W + BLEED * 2) * dpr);
      cv.height = Math.round((H + BLEED * 2) * dpr);
      const cs = getComputedStyle(document.documentElement);
      const sans = cs.getPropertyValue("--font-geist-sans").trim() || "sans-serif";
      mono = cs.getPropertyValue("--font-geist-mono").trim() || "monospace";
      // tamanho do glifo: o "?" ocupa ~94% da altura (e cabe na largura)
      const probe = document.createElement("canvas").getContext("2d")!;
      probe.font = `700 100px ${sans}`;
      const pm = probe.measureText("?");
      const ph = pm.actualBoundingBoxAscent + pm.actualBoundingBoxDescent || 72;
      const pw = pm.actualBoundingBoxLeft + pm.actualBoundingBoxRight || 55;
      const size = Math.min((H * 0.94) / ph, (W * 0.98) / pw) * 100;
      const font = `700 ${size}px ${sans}`;
      const cols = Math.floor(W / cellW);
      const rows = Math.floor(H / cellH);
      const q = sample("?", font, cols, rows);
      const e = sample("!", font, cols, rows);
      shapes = { q, e };

      N = Math.max(q.n, e.n);
      const mk = () => new Float32Array(N);
      fx = mk(); fy = mk(); fb = mk(); fa = mk();
      tx = mk(); ty = mk(); tb = mk(); ta = mk();
      dx = mk(); dy = mk(); vx = mk(); vy = mk();
      sx = mk(); sy = mk(); rot = mk(); delay = mk();
      chars = Array.from({ length: N }, () => nextChar());
      const s = target === "q" ? q : e;
      for (let i = 0; i < N; i++) {
        const { j, alpha } = assign(s, i, N);
        tx[i] = fx[i] = s.x[j];
        ty[i] = fy[i] = s.y[j];
        tb[i] = fb[i] = s.b[j];
        ta[i] = fa[i] = alpha;
      }
      morphT0 = -1;
      mixFrom = target === "e" ? 1 : 0;
      draw();
    };

    /** Começa a morfose a partir da posição atual. */
    const morphTo = (to: "q" | "e") => {
      if (!shapes || to === target) return;
      if (reduced) {
        mixFrom = mixNow();
        target = to;
        morphT0 = clock;
        kick();
        return;
      }
      // ponto de partida = onde cada partícula está agora
      const u = progress();
      for (let i = 0; i < N; i++) {
        const k = expoInOut(Math.min(1, Math.max(0, (u - delay[i]) / (1 - 0.15))));
        fx[i] = fx[i] + (tx[i] - fx[i]) * k;
        fy[i] = fy[i] + (ty[i] - fy[i]) * k;
        fb[i] = fb[i] + (tb[i] - fb[i]) * k;
        fa[i] = fa[i] + (ta[i] - fa[i]) * k;
      }
      target = to;
      const s = shapes[to];
      for (let i = 0; i < N; i++) {
        const { j, alpha } = assign(s, i, N);
        tx[i] = s.x[j];
        ty[i] = s.y[j];
        tb[i] = s.b[j];
        ta[i] = alpha;
        // velocidade de dispersão (para fora do centro, com ruído) e leve rotação
        const ang = Math.atan2(fy[i] - H / 2, fx[i] - W / 2) + (Math.random() - 0.5) * 1.6;
        const sp = (0.25 + Math.random() * 0.75) * Math.min(W, H) * 0.32;
        sx[i] = Math.cos(ang) * sp;
        sy[i] = Math.sin(ang) * sp;
        rot[i] = (Math.random() - 0.5) * 1.6;
        delay[i] = Math.random() * 0.15;
      }
      morphT0 = clock;
      kick();
    };

    const progress = () => (morphT0 < 0 ? 1 : Math.min(1, (clock - morphT0) / (reduced ? 0.5 : MORPH)));

    let sxy = new Float32Array(0);
    let rotIdx = new Int32Array(0);
    // reduced motion: troca em fade (0 = "?", 1 = "!")
    let mixFrom = 0;
    const mixNow = () => mixFrom + ((target === "e" ? 1 : 0) - mixFrom) * progress();

    const draw = () => {
      if (!shapes) return;
      if (sxy.length !== N * 2) {
        sxy = new Float32Array(N * 2);
        rotIdx = new Int32Array(N);
      }
      ctx.setTransform(dpr, 0, 0, dpr, BLEED * dpr, BLEED * dpr);
      ctx.clearRect(-BLEED, -BLEED, W + BLEED * 2, H + BLEED * 2);
      ctx.font = `${fontPx}px ${mono}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const u = progress();
      if (reduced) {
        const mix = mixNow();
        const layers: [Shape, number][] = [[shapes.q, 1 - mix], [shapes.e, mix]];
        for (const [sh, a] of layers) {
          if (a < 0.02) continue;
          for (let i = 0; i < sh.n; i++) {
            const l = Math.round(sh.b[i] * (LEVELS - 1));
            const al = Math.min(ALPHAS - 1, Math.max(0, Math.round(a * ALPHAS) - 1));
            ctx.fillStyle = colors[al * LEVELS + l];
            ctx.fillText(chars[i], sh.x[i], sh.y[i]);
          }
        }
        return;
      }
      const morphing = u < 1;
      const pulse = pulseT0 >= 0 ? Math.max(0, 1 - (clock - pulseT0) / PULSE) : 0;
      // onda de brilho, de cima para baixo, a cada ~4 s
      const wt = clock % WAVE_EVERY;
      const waveY = !reduced && wt < WAVE_DUR ? (-0.15 + (wt / WAVE_DUR) * 1.3) * H : -1e9;
      const band = H * 0.09;
      for (const b of bucket) b.length = 0;
      const rotating: number[] = [];

      for (let i = 0; i < N; i++) {
        let k = 1;
        let env = 0;
        if (morphing) {
          const lu = Math.min(1, Math.max(0, (u - delay[i]) / (1 - 0.15)));
          k = expoInOut(lu);
          env = Math.sin(Math.PI * lu);
        }
        let x = fx[i] + (tx[i] - fx[i]) * k + sx[i] * env;
        let y = fy[i] + (ty[i] - fy[i]) * k + sy[i] * env;
        const a = fa[i] + (ta[i] - fa[i]) * k;
        if (a < 0.1) continue;
        let br = fb[i] + (tb[i] - fb[i]) * k;
        {
          // respiração mínima
          x += Math.sin(clock * 0.9 + y * 0.031 + x * 0.017) * 0.6 + dx[i];
          y += Math.cos(clock * 0.7 + x * 0.029) * 0.6 + dy[i];
          const d = (y - waveY) / band;
          br += Math.exp(-d * d) * 0.5 + pulse * 0.45;
        }
        const l = Math.min(LEVELS - 1, Math.max(0, Math.round(br * (LEVELS - 1))));
        const al = Math.min(ALPHAS - 1, Math.max(0, Math.round(a * ALPHAS) - 1));
        const idx = al * LEVELS + l;
        // guarda a posição final para o desenho
        sxy[i * 2] = x;
        sxy[i * 2 + 1] = y;
        if (env > 0.02) {
          rotating.push(i);
          rotIdx[i] = idx;
        } else bucket[idx].push(i);
      }

      for (let b = 0; b < bucket.length; b++) {
        const list = bucket[b];
        if (!list.length) continue;
        ctx.fillStyle = colors[b];
        for (const i of list) ctx.fillText(chars[i], sxy[i * 2], sxy[i * 2 + 1]);
      }
      if (rotating.length) {
        const u2 = progress();
        for (const i of rotating) {
          const lu = Math.min(1, Math.max(0, (u2 - delay[i]) / (1 - 0.15)));
          ctx.fillStyle = colors[rotIdx[i]];
          ctx.save();
          ctx.translate(sxy[i * 2], sxy[i * 2 + 1]);
          ctx.rotate(rot[i] * Math.sin(Math.PI * lu) * Math.PI);
          ctx.fillText(chars[i], 0, 0);
          ctx.restore();
        }
      }
    };

    const step = (dt: number) => {
      // ~3% dos caracteres trocam a cada quadro; no pulso, bem mais
      const pulse = pulseT0 >= 0 && clock - pulseT0 < PULSE;
      const swaps = Math.ceil(N * (pulse ? 0.35 : 0.03));
      for (let s = 0; s < swaps; s++) {
        const i = (Math.random() * N) | 0;
        chars[i] = pulse ? source[(Math.random() * source.length) | 0] : nextChar();
      }
      // mouse: empurra num raio de ~90 px e volta com mola
      const K = 70;
      const C = 2 * Math.sqrt(K) * 0.55;
      const u = progress();
      for (let i = 0; i < N; i++) {
        let ax = -K * dx[i] - C * vx[i];
        let ay = -K * dy[i] - C * vy[i];
        if (mouse.x > -999) {
          const k = u >= 1 ? 1 : expoInOut(u);
          const px = fx[i] + (tx[i] - fx[i]) * k;
          const py = fy[i] + (ty[i] - fy[i]) * k;
          const ex = px + dx[i] - mouse.x;
          const ey = py + dy[i] - mouse.y;
          const d2 = ex * ex + ey * ey;
          if (d2 < RADIUS * RADIUS && d2 > 0.01) {
            const d = Math.sqrt(d2);
            const f = (1 - d / RADIUS) ** 2 * 3600;
            ax += (ex / d) * f;
            ay += (ey / d) * f;
          }
        }
        vx[i] += ax * dt;
        vy[i] += ay * dt;
        dx[i] += vx[i] * dt;
        dy[i] += vy[i] * dt;
      }
    };

    const frame = (now: number) => {
      raf = 0;
      const dt = Math.min(0.05, last ? (now - last) / 1000 : 0.016);
      last = now;
      clock += dt;
      if (!reduced) step(dt);
      draw();
      if (reduced) {
        // parado: só redesenha enquanto o fade da troca acontece
        if (progress() < 1) raf = requestAnimationFrame(frame);
        return;
      }
      if (visible && !document.hidden) raf = requestAnimationFrame(frame);
    };
    const kick = () => {
      if (!raf && visible && !document.hidden) {
        last = 0;
        raf = requestAnimationFrame(frame);
      }
    };
    const stop = () => {
      cancelAnimationFrame(raf);
      raf = 0;
    };

    const sync = () => {
      const live = visible && !document.hidden;
      if (section) {
        if (live) section.dataset.faqLive = "";
        else delete section.dataset.faqLive;
      }
      if (live) kick();
      else stop();
    };

    // acordeão: "!" com alguma aberta, "?" com todas fechadas, pulso na troca
    let openEl: Element | null = null;
    let toggleTimer = 0;
    const evaluate = () => {
      toggleTimer = 0;
      const open = section?.querySelector("details[open]") ?? null;
      if (open && openEl && open !== openEl && target === "e" && !reduced) {
        pulseT0 = clock;
        kick();
      }
      openEl = open;
      morphTo(open ? "e" : "q");
    };
    const onToggle = (e: Event) => {
      if ((e.target as Element).tagName !== "DETAILS") return;
      if (!toggleTimer) toggleTimer = window.setTimeout(evaluate, 30);
    };
    section?.addEventListener("toggle", onToggle, true);

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const r = wrap.getBoundingClientRect();
      const x = e.clientX - r.left;
      const y = e.clientY - r.top;
      if (x < -RADIUS || y < -RADIUS || x > r.width + RADIUS || y > r.height + RADIUS) {
        mouse.x = mouse.y = -9999;
        return;
      }
      mouse.x = x;
      mouse.y = y;
    };
    const onLeave = () => {
      mouse.x = mouse.y = -9999;
    };
    const useMouse = fineMouse && !reduced;
    if (useMouse) {
      window.addEventListener("pointermove", onMove, { passive: true });
      document.documentElement.addEventListener("mouseleave", onLeave);
    }
    // toque: o 1º dedo empurra as letras como o mouse (mesma conta, raio, força e
    // mola); ao soltar, elas voltam. Passivo e sem preventDefault: nunca trava a rolagem
    const onTouch = (e: TouchEvent) => {
      const t = e.touches[0];
      if (!t) return;
      const r = wrap.getBoundingClientRect();
      const x = t.clientX - r.left;
      const y = t.clientY - r.top;
      if (x < -RADIUS || y < -RADIUS || x > r.width + RADIUS || y > r.height + RADIUS) {
        mouse.x = mouse.y = -9999;
        return;
      }
      mouse.x = x;
      mouse.y = y;
      kick(); // animação parada: acorda
    };
    const onTouchEnd = () => {
      mouse.x = mouse.y = -9999;
      kick(); // as letras voltam com a mola
    };
    if (!reduced) {
      window.addEventListener("touchstart", onTouch, { passive: true });
      window.addEventListener("touchmove", onTouch, { passive: true });
      window.addEventListener("touchend", onTouchEnd, { passive: true });
      window.addEventListener("touchcancel", onTouchEnd, { passive: true });
    }

    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      sync();
    });
    io.observe(wrap);
    document.addEventListener("visibilitychange", sync);

    let lastW = 0;
    let lastH = 0;
    const ro = stableResizeObserver(() => {
      const r = wrap.getBoundingClientRect();
      if (Math.abs(r.width - lastW) < 1 && Math.abs(r.height - lastH) < 1) return;
      lastW = r.width;
      lastH = r.height;
      build();
      draw();
    });
    ro.observe(wrap);
    let alive = true;
    document.fonts.ready.then(() => {
      if (!alive) return;
      build();
      draw();
      evaluate();
    });

    return () => {
      alive = false;
      stop();
      io.disconnect();
      ro.disconnect();
      clearTimeout(toggleTimer);
      document.removeEventListener("visibilitychange", sync);
      section?.removeEventListener("toggle", onToggle, true);
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("mouseleave", onLeave);
      window.removeEventListener("touchstart", onTouch);
      window.removeEventListener("touchmove", onTouch);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("touchcancel", onTouchEnd);
      if (section) delete section.dataset.faqLive;
    };
  }, [text]);

  return (
    <div
      ref={box}
      aria-hidden="true"
      className="relative mx-auto mt-10 aspect-[5/7] w-[60%] md:mx-0 md:mt-12 md:max-h-[58svh] md:w-[70%]"
    >
      <canvas ref={canvas} className="absolute -inset-12 block h-[calc(100%+6rem)] w-[calc(100%+6rem)]" />
    </div>
  );
}

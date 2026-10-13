"use client";

import { useRef, useState, type ReactNode } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { revealOnce } from "@/lib/reveal";

gsap.registerPlugin(useGSAP, ScrollTrigger);

/**
 * Título "pintado com spray" (canvas 2D, sem WebGL), por gatilho (top 80%),
 * uma vez, ~1,5 s de pintura + ~1 s para a névoa assentar:
 * - o <h2> real fica SEMPRE no HTML, na tipografia original (SEO, sem
 *   layout shift). Por cima dele, um canvas na cor do fundo o cobre e é
 *   "apagado" por partículas de spray (borda irregular e granulada) e por
 *   uma frente com borda serrilhada que segue o bico, da esquerda para a
 *   direita;
 * - overspray: num canvas um pouco maior, névoa fina e partículas pequenas
 *   off-white em volta do ponto pintado, que caem um pouco e somem;
 * - ao fim, o canvas de cobertura sai (o título fica 100% nítido) e ficam só
 *   alguns respingos sutis, de baixa opacidade, como detalhe permanente.
 * Sem JS / prefers-reduced-motion: título estático, sem respingos.
 */

const DURATION = 1.5; // s de pintura
const MARGIN = 48; // px de folga do canvas do overspray em volta do título
const PAD = 22; // px que a cobertura passa acima/abaixo da caixa (acentos, cedilha; < o mt-6 do rótulo)

type Splat = { x: number; y: number; s: number; o: number };
type Dot = { x: number; y: number; vx: number; vy: number; s: number; a: number; life: number; age: number; keep: number };

const gauss = () => {
  const u = 1 - Math.random();
  const v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
};
const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

export default function SprayTitle({
  id,
  className = "",
  wrapClassName = "",
  children,
}: {
  id: string;
  /** Classes do <h2> (tipografia). */
  className?: string;
  /** Classes do contêiner (margens, largura máxima). */
  wrapClassName?: string;
  children: ReactNode;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const title = useRef<HTMLHeadingElement>(null);
  const cover = useRef<HTMLCanvasElement>(null);
  const mist = useRef<HTMLCanvasElement>(null);
  const [splats, setSplats] = useState<Splat[]>([]);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const h = title.current!;
        const cv = cover.current!;
        const ms = mist.current!;
        const cx = cv.getContext("2d")!;
        const mx = ms.getContext("2d")!;
        const css = getComputedStyle(document.documentElement);
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        let W = 0;
        let H = 0;
        /** Largura real das linhas (o caminho do bico cobre só o texto). */
        let TW = 0;
        let started = false;

        // cobre o título com a cor do fundo (até o spray começar)
        const fit = () => {
          W = h.offsetWidth;
          H = h.offsetHeight;
          const range = document.createRange();
          range.selectNodeContents(h);
          const left = h.getBoundingClientRect().left;
          TW = Math.min(W, Math.max(0, ...[...range.getClientRects()].map((r) => r.right - left))) || W;
          cv.width = Math.ceil(W * dpr);
          cv.height = Math.ceil((H + PAD * 2) * dpr);
          ms.width = Math.ceil((W + MARGIN * 2) * dpr);
          ms.height = Math.ceil((H + MARGIN * 2) * dpr);
          if (!started) {
            cx.fillStyle = css.getPropertyValue("--bg").trim() || "#050505";
            cx.fillRect(0, 0, cv.width, cv.height);
          }
        };
        fit();
        cv.style.display = "block";
        ms.style.display = "block";
        const ro = new ResizeObserver(() => !started && fit());
        ro.observe(h);

        // borda da frente: deslocamento por faixa de 3 px, suave entre faixas
        const rows = Math.ceil(cv.height / (3 * dpr)) + 1;
        const jag = Array.from({ length: rows }, () => Math.random());
        for (let k = 0; k < 3; k++) for (let i = 1; i < rows - 1; i++) jag[i] = (jag[i - 1] + jag[i] * 2 + jag[i + 1]) / 4;

        const dots: Dot[] = [];
        const keep: Splat[] = [];
        const fg = css.getPropertyValue("--fg").trim() || "#f2f2f0";
        let t0 = -1;

        const tick = (time: number) => {
          if (t0 < 0) t0 = time;
          const el = time - t0;
          const t = Math.min(1, el / DURATION);
          const p = easeInOut(t);
          // bico: avança da esquerda para a direita em zigue-zague vertical
          const nx = (-0.08 + 1.16 * p) * TW;
          const ny = H * (0.5 + 0.38 * Math.sin(t * Math.PI * 5));

          // 1) spray apaga a cobertura em grãos
          if (t < 1) {
            cx.globalCompositeOperation = "destination-out";
            for (let i = 0; i < 420; i++) {
              const x = nx + gauss() * TW * 0.045;
              const y = PAD + ny + gauss() * H * 0.34;
              const r = (0.5 + Math.random() * 1.9) * dpr;
              cx.globalAlpha = 0.35 + Math.random() * 0.65;
              cx.beginPath();
              cx.arc(x * dpr, y * dpr, r, 0, Math.PI * 2);
              cx.fill();
            }
            cx.globalAlpha = 1;
            cx.globalCompositeOperation = "source-over";
          }
          // 2) frente com borda serrilhada logo atrás do bico (garante cobertura total)
          // depois do texto, a frente corre até o fim da caixa (limpa o resto)
          const front = (el / DURATION < 1 ? nx - TW * 0.1 : TW * 0.96 + (W * 1.2 - TW * 0.96) * ((el - DURATION) / 0.25)) * dpr;
          for (let i = 0; i < rows; i++) {
            const e = front + (jag[i] - 0.5) * TW * 0.06 * dpr;
            if (e > 0) cx.clearRect(0, i * 3 * dpr, e, 3 * dpr);
          }

          // 3) overspray: névoa e partículas em volta do bico
          if (t < 1) {
            for (let i = 0; i < 26; i++) {
              const far = Math.random() < 0.25;
              const d: Dot = {
                x: nx + MARGIN + gauss() * TW * (far ? 0.09 : 0.05),
                y: ny + MARGIN + gauss() * H * (far ? 0.75 : 0.45),
                vx: gauss() * 14,
                vy: gauss() * 10 - 6,
                s: 0.4 + Math.random() * 1.3,
                a: 0.18 + Math.random() * 0.4,
                life: 0.5 + Math.random() * 0.9,
                age: 0,
                keep: 0,
              };
              // poucas viram respingos permanentes (fora das letras ou de leve)
              if (keep.length < 16 && Math.random() < 0.012) d.keep = 0.08 + Math.random() * 0.14;
              dots.push(d);
            }
          }
          mx.clearRect(0, 0, ms.width, ms.height);
          if (t < 1) {
            const g = mx.createRadialGradient((nx + MARGIN) * dpr, (ny + MARGIN) * dpr, 0, (nx + MARGIN) * dpr, (ny + MARGIN) * dpr, H * 0.9 * dpr);
            g.addColorStop(0, fg);
            g.addColorStop(1, "transparent");
            mx.globalAlpha = 0.06 * Math.sin(t * Math.PI);
            mx.fillStyle = g;
            mx.fillRect(0, 0, ms.width, ms.height);
          }
          mx.fillStyle = fg;
          const dt = 1 / 60;
          for (let i = dots.length - 1; i >= 0; i--) {
            const d = dots[i];
            d.age += dt;
            d.vy += 18 * dt; // assenta (cai devagar)
            d.vx *= 0.96;
            d.x += d.vx * dt;
            d.y += d.vy * dt;
            const k = d.age / d.life;
            if (k >= 1) {
              if (d.keep) keep.push({ x: d.x - MARGIN, y: d.y - MARGIN, s: d.s * 1.4, o: d.keep });
              dots.splice(i, 1);
              continue;
            }
            mx.globalAlpha = d.a * (1 - k) + (d.keep ? d.keep * k : 0);
            mx.beginPath();
            mx.arc(d.x * dpr, d.y * dpr, d.s * dpr, 0, Math.PI * 2);
            mx.fill();
          }
          mx.globalAlpha = 1;

          if (el >= DURATION + 0.25) cv.style.display = "none"; // título 100% nítido
          if (el >= DURATION + 0.25 && dots.length === 0) {
            gsap.ticker.remove(tick);
            ms.style.display = "none";
            setSplats(keep.map((s) => ({ x: (s.x / W) * 100, y: (s.y / H) * 100, s: s.s, o: s.o })));
          }
        };

        // revealOnce: gatilho + rede de segurança (a cobertura nunca fica presa)
        const stopReveal = revealOnce({
          trigger: h,
          start: "top 80%",
          play: () => {
            started = true;
            gsap.ticker.add(tick);
          },
          finish: () => {
            started = true;
            cv.style.display = "none";
            ms.style.display = "none";
          },
        });

        return () => {
          stopReveal();
          gsap.ticker.remove(tick);
          ro.disconnect();
          cv.style.display = "none";
          ms.style.display = "none";
          setSplats([]);
        };
      });
    },
    { scope: wrap },
  );

  return (
    <div ref={wrap} className={`relative ${wrapClassName}`}>
      <h2 ref={title} id={id} className={className}>
        {children}
      </h2>
      {/* cobertura (some no fim) e overspray: decorativos */}
      <canvas
        ref={cover}
        aria-hidden="true"
        className="pointer-events-none absolute left-0 hidden w-full"
        style={{ top: -PAD, height: `calc(100% + ${PAD * 2}px)` }}
      />
      <canvas
        ref={mist}
        aria-hidden="true"
        className="pointer-events-none absolute hidden"
        style={{ left: -MARGIN, top: -MARGIN, width: `calc(100% + ${MARGIN * 2}px)`, height: `calc(100% + ${MARGIN * 2}px)` }}
      />
      {splats.map((s, i) => (
        <span
          key={i}
          aria-hidden="true"
          className="pointer-events-none absolute rounded-full bg-foreground motion-reduce:hidden"
          style={{ left: `${s.x}%`, top: `${s.y}%`, width: s.s * 2, height: s.s * 2, opacity: s.o }}
        />
      ))}
    </div>
  );
}

"use client";

import { useEffect, useId, useRef, useState } from "react";

/**
 * "Minhoca líquida" em volta da moldura do retrato: um filete de metal
 * líquido prata que percorre o perímetro no sentido horário (~1 volta a cada
 * 10 s). SVG puro (sem WebGL, para não somar contextos 3D):
 * - o trajeto é um retângulo arredondado com pathLength=1000;
 * - o corpo (25% do perímetro) é feito de SEGMENTS traços consecutivos, mais
 *   grossos na cabeça e afinando na cauda, com leve ondulação na espessura;
 * - um filtro "gooey" (feGaussianBlur + feColorMatrix) funde os segmentos
 *   num filete contínuo, com aspecto líquido;
 * - gradiente cromado + um brilho que corre da cabeça para a cauda;
 * - de vez em quando solta uma gotinha, que a cauda reabsorve.
 * Acelera um pouco com a velocidade do scroll e desacelera com o mouse sobre
 * o retrato. Só começa quando `active` (a entrada da foto terminou) e pausa
 * fora da tela. prefers-reduced-motion: filete parado.
 */

const SEGMENTS = 10;
const BODY = 250; // 25% do perímetro (pathLength = 1000)
const SEG = BODY / SEGMENTS;
const LAP_SECONDS = 10;
const PAD = 7; // distância do trajeto até a borda da moldura (px)

export default function LiquidWorm({ active }: { active: boolean }) {
  const id = useId().replace(/:/g, "");
  const root = useRef<SVGSVGElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });

  // o SVG cobre a moldura + respiro; a geometria acompanha o tamanho real
  useEffect(() => {
    const svg = root.current;
    if (!svg) return;
    const ro = new ResizeObserver(([e]) => setSize({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(svg);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const svg = root.current;
    if (!svg || !size.w || !active) return;
    const segs = Array.from(svg.querySelectorAll<SVGRectElement>("[data-worm-seg]"));
    const shine = svg.querySelector<SVGRectElement>("[data-worm-shine]");
    const track = svg.querySelector<SVGRectElement>("[data-worm-track]");
    const drop = svg.querySelector<SVGCircleElement>("[data-worm-drop]");
    const host = svg.parentElement;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let head = 250;
    const place = (t: number) => {
      segs.forEach((seg, i) => {
        // dash i cobre [head - (i+1)·SEG, head - i·SEG]; sobrepõe 2 un. para não abrir fresta
        seg.style.strokeDashoffset = String(-(head - (i + 1) * SEG - 2));
        const taper = Math.pow(1 - i / SEGMENTS, 0.8);
        const wobble = reduced ? 0 : Math.sin(t * 3.1 - i * 0.7) * 0.7 * taper;
        seg.style.strokeWidth = String(1.4 + 6.4 * taper + wobble);
      });
      // brilho correndo da cabeça para a cauda (uma passada a cada ~1,6 s)
      if (shine) shine.style.strokeDashoffset = String(-(head - ((t * 160) % BODY) - 12));
    };

    if (reduced) {
      place(0); // filete parado
      return;
    }

    let speed = 1;
    let hover = false;
    let lastY = window.scrollY;
    let visible = true;
    let raf = 0;
    let last = performance.now();
    let t = 0;
    let nextDrop = 3 + Math.random() * 4;
    let dropAt = -1;
    const dropPos = { x: 0, y: 0, nx: 0, ny: 0 };

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      t += dt;
      // velocidade: base 1 volta / 10 s; scroll acelera (até ~1,8x), mouse sobre o retrato freia
      const scrollV = Math.abs(window.scrollY - lastY) / Math.max(dt, 0.001);
      lastY = window.scrollY;
      const target = hover ? 0.35 : 1 + Math.min(scrollV / 2500, 0.8);
      speed += (target - speed) * (1 - Math.exp(-dt * 3));
      head = (head + (1000 / LAP_SECONDS) * speed * dt) % 1000;
      place(t);

      // gotinha: nasce perto da cabeça, se afasta um pouco e volta (reabsorvida)
      if (drop && track) {
        if (dropAt < 0 && t > nextDrop) {
          const len = track.getTotalLength();
          const p = track.getPointAtLength((((head - 30 + 1000) % 1000) / 1000) * len);
          const cx = size.w / 2;
          const cy = size.h / 2;
          const n = Math.hypot(p.x - cx, p.y - cy) || 1;
          Object.assign(dropPos, { x: p.x, y: p.y, nx: (p.x - cx) / n, ny: (p.y - cy) / n });
          dropAt = t;
        }
        if (dropAt >= 0) {
          const k = (t - dropAt) / 1.6;
          if (k >= 1) {
            dropAt = -1;
            nextDrop = t + 4 + Math.random() * 5;
            drop.setAttribute("r", "0");
          } else {
            const out = Math.sin(Math.PI * Math.min(k * 1.4, 1)) * 9; // sai e volta
            drop.setAttribute("cx", String(dropPos.x + dropPos.nx * out));
            drop.setAttribute("cy", String(dropPos.y + dropPos.ny * out));
            drop.setAttribute("r", String(3.2 * (1 - k * 0.6)));
          }
        }
      }
    };

    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      cancelAnimationFrame(raf);
      if (visible) {
        last = performance.now();
        lastY = window.scrollY;
        raf = requestAnimationFrame(frame);
      }
    });
    io.observe(svg);
    const enter = () => (hover = true);
    const leave = () => (hover = false);
    host?.addEventListener("pointerenter", enter);
    host?.addEventListener("pointerleave", leave);
    place(0);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      host?.removeEventListener("pointerenter", enter);
      host?.removeEventListener("pointerleave", leave);
    };
  }, [active, size.w, size.h]);

  const w = Math.max(size.w - PAD * 2, 0);
  const h = Math.max(size.h - PAD * 2, 0);
  const rect = { x: PAD, y: PAD, width: w, height: h, rx: 14, pathLength: 1000 };

  return (
    <svg
      ref={root}
      aria-hidden="true"
      className={`pointer-events-none absolute -left-[7px] -top-[7px] h-[calc(100%+14px)] w-[calc(100%+14px)] overflow-visible transition-opacity duration-700 ${
        active ? "opacity-100" : "opacity-0"
      }`}
    >
      <defs>
        <linearGradient id={`worm-chrome-${id}`} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2={size.w * 0.35} y2={size.h * 0.2} spreadMethod="reflect">
          <stop offset="0" stopColor="#6f747b" />
          <stop offset="0.3" stopColor="#d9dce0" />
          <stop offset="0.5" stopColor="#ffffff" />
          <stop offset="0.7" stopColor="#9aa0a7" />
          <stop offset="1" stopColor="#5f646b" />
        </linearGradient>
        {/* gooey: desfoca e "recorta" o alfa, fundindo segmentos e gotinha num líquido */}
        <filter id={`worm-goo-${id}`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="2.6" result="blur" />
          <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -8" result="goo" />
          <feComposite in="SourceGraphic" in2="goo" operator="atop" />
        </filter>
      </defs>
      {size.w > 0 && (
        <>
          <rect data-worm-track {...rect} fill="none" stroke="none" />
          <g filter={`url(#worm-goo-${id})`}>
            {Array.from({ length: SEGMENTS }, (_, i) => (
              <rect
                key={i}
                data-worm-seg
                {...rect}
                fill="none"
                stroke={`url(#worm-chrome-${id})`}
                strokeLinecap="round"
                strokeDasharray={`${SEG + 4} ${1000 - SEG - 4}`}
                strokeDashoffset={-(250 - (i + 1) * SEG)}
              />
            ))}
            <circle data-worm-drop r="0" fill={`url(#worm-chrome-${id})`} />
          </g>
          {/* reflexo: faixa clara curta correndo pelo corpo */}
          <rect
            data-worm-shine
            {...rect}
            fill="none"
            stroke="#ffffff"
            strokeOpacity="0.85"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeDasharray="10 990"
          />
        </>
      )}
    </svg>
  );
}

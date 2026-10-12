"use client";

import { Fragment, useEffect, useRef } from "react";
import gsap from "gsap";

/** Velocidade base das faixas (px/s) e velocidade com o mouse em cima (fração). */
const SPEED = 38;
const HOVER_SPEED = 0.2;

/**
 * Faixas de serviços (Projetos pontuais): texto grande em loop infinito,
 * direções alternadas (esquerda, direita, esquerda...). Cada faixa tem duas
 * cópias iguais e a posição dá a volta a cada cópia (sem "pulo").
 * - Mouse sobre a faixa: desacelera com suavidade até ~20%; a palavra sob o
 *   cursor acende em cromado (camada .text-chrome que aparece por cima).
 * - Acelera levemente com a velocidade do scroll e volta ao normal.
 * - Só transform, no ticker do GSAP; pausa fora da tela.
 * - prefers-reduced-motion: faixas paradas. Toque: só o movimento.
 * Decorativo (aria-hidden): a lista acessível fica numa <ul> sr-only na seção.
 */
export default function ServiceStrips({ strips }: { strips: string[][] }) {
  const root = useRef<HTMLDivElement>(null);
  const tracks = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const state = tracks.current.map((track, i) => ({ track, i, x: 0, w: 0, rate: { v: 1 } }));

    const place = (s: (typeof state)[number]) => {
      if (!s.track || !s.w) return;
      s.x = (((s.x % s.w) - s.w) % s.w) || 0; // sempre em (-w, 0]
      s.track.style.transform = `translate3d(${s.x.toFixed(2)}px,0,0)`;
    };
    const measure = () =>
      state.forEach((s) => {
        const w = (s.track?.firstElementChild as HTMLElement | null)?.offsetWidth ?? 0;
        s.x = s.w ? (s.x / s.w) * w : -w * ((s.i * 0.43) % 1);
        s.w = w;
        place(s);
      });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    if (reduced) return () => ro.disconnect();

    // desacelera com o mouse sobre a faixa (só ponteiro fino)
    const off: (() => void)[] = [];
    if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
      state.forEach((s) => {
        const row = s.track?.parentElement;
        if (!row) return;
        const slow = () => gsap.to(s.rate, { v: HOVER_SPEED, duration: 0.9, ease: "power2.out", overwrite: true });
        const fast = () => gsap.to(s.rate, { v: 1, duration: 0.9, ease: "power2.inOut", overwrite: true });
        row.addEventListener("mouseenter", slow);
        row.addEventListener("mouseleave", fast);
        off.push(() => {
          row.removeEventListener("mouseenter", slow);
          row.removeEventListener("mouseleave", fast);
        });
      });
    }

    let lastScroll = window.scrollY;
    let boost = 0;
    const tick = (_t: number, deltaTime: number) => {
      const dt = Math.min(deltaTime / 1000, 0.05);
      if (dt <= 0) return;
      const sy = window.scrollY;
      const target = Math.min(Math.abs(sy - lastScroll) / dt / 2000, 1.5);
      lastScroll = sy;
      boost += (target - boost) * (1 - Math.exp(-dt * 3));
      state.forEach((s) => {
        s.x += (s.i % 2 === 0 ? -1 : 1) * SPEED * s.rate.v * (1 + boost) * dt;
        place(s);
      });
    };
    let running = false;
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !running) {
        lastScroll = window.scrollY;
        gsap.ticker.add(tick);
        running = true;
      } else if (!entry.isIntersecting && running) {
        gsap.ticker.remove(tick);
        running = false;
      }
    });
    io.observe(el);

    return () => {
      ro.disconnect();
      io.disconnect();
      gsap.ticker.remove(tick);
      off.forEach((fn) => fn());
      state.forEach((s) => gsap.killTweensOf(s.rate));
    };
  }, [strips]);

  return (
    <div
      ref={root}
      aria-hidden="true"
      className="grid gap-[0.12em] text-[clamp(40px,6vw,96px)] font-medium leading-[1.12] tracking-[-0.04em] text-[#8A8A8A]"
    >
      {strips.map((items, i) => (
        <div
          key={i}
          className="overflow-hidden [mask-image:linear-gradient(to_right,transparent,#000_10%,#000_90%,transparent)]"
        >
          <div
            ref={(node) => {
              tracks.current[i] = node;
            }}
            className="flex w-max whitespace-nowrap will-change-transform"
          >
            {[0, 1].map((copy) => (
              <div key={copy} className="flex shrink-0">
                {items.map((item, k) => (
                  <Fragment key={k}>
                    <span className="group/item relative">
                      {item}
                      <span className="text-chrome pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover/item:opacity-100">
                        {item}
                      </span>
                    </span>
                    <span className="px-[0.32em]">·</span>
                  </Fragment>
                ))}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

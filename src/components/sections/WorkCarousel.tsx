"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import MediaSlot from "@/components/MediaSlot";
import { scrollToY } from "@/components/SmoothScroll";

gsap.registerPlugin(useGSAP, ScrollTrigger);

export type WorkItem = { src?: string; project: string; year: string; role: string; alt: string };

export type WorkCarouselLabels = {
  title: string;
  label: string;
  prev: string;
  next: string;
  /** Já formatado por item: "1 de 6", "2 de 6"... */
  counters: string[];
  dragHint: string;
  placeholder: string;
};

/** Posição/escala/escurecimento de um slide a `d` posições do centro. */
function slideStyle(d: number): { style: CSSProperties; dim: number } {
  const a = Math.abs(d);
  const scale = 1 - Math.min(a, 1) * 0.3 - Math.max(0, a - 1) * 0.08;
  return {
    style: {
      transform: `translate(-50%, -50%) translateX(${d * 68}%) scale(${scale})`,
      zIndex: 10 - Math.round(a),
      visibility: a > 2.6 ? "hidden" : "visible",
    },
    dim: Math.min(a, 1) * 0.45,
  };
}

/**
 * Carrossel de trabalhos (estilo editorial): imagem principal grande no
 * centro, vizinhas nas laterais menores e escurecidas.
 * - Desktop sem reduced motion: o palco fica fixo (pin) e as imagens trocam com
 *   o scroll, com encaixe em cada uma; as setas rolam a página até a imagem.
 * - Mobile / reduced motion: sem pin; setas e arraste (swipe) trocam a imagem
 *   (instantâneo com reduced motion).
 * Imagens e legendas vêm de public/trabalhos/trabalhos.json (src/content/media.ts).
 */
export default function WorkCarousel({ items, labels }: { items: WorkItem[]; labels: WorkCarouselLabels }) {
  const root = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const slides = useRef<(HTMLDivElement | null)[]>([]);
  const dims = useRef<(HTMLDivElement | null)[]>([]);
  const pos = useRef({ v: 0 });
  const pinTrigger = useRef<ScrollTrigger | null>(null);
  const [current, setCurrent] = useState(0);
  const n = items.length;

  const render = useCallback(() => {
    const v = pos.current.v;
    slides.current.forEach((el, i) => {
      if (!el) return;
      const { style, dim } = slideStyle(i - v);
      el.style.transform = String(style.transform);
      el.style.zIndex = String(style.zIndex);
      el.style.visibility = String(style.visibility);
      const ov = dims.current[i];
      if (ov) ov.style.opacity = String(dim);
    });
    const idx = Math.min(n - 1, Math.max(0, Math.round(v)));
    setCurrent((c) => (c === idx ? c : idx));
  }, [n]);

  const goTo = useCallback(
    (target: number) => {
      const t = Math.min(n - 1, Math.max(0, target));
      const st = pinTrigger.current;
      if (st) {
        // modo fixo: o scroll é a fonte da verdade — rola até a posição da imagem
        scrollToY(st.start + (t / Math.max(n - 1, 1)) * (st.end - st.start));
        return;
      }
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      gsap.to(pos.current, { v: t, duration: reduced ? 0 : 0.8, ease: "power3.out", onUpdate: render, overwrite: true });
    },
    [n, render],
  );

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(min-width: 768px) and (prefers-reduced-motion: no-preference)", () => {
        if (n < 2) return;
        pinTrigger.current = ScrollTrigger.create({
          trigger: root.current,
          start: "top top",
          end: `+=${(n - 1) * 55}%`,
          pin: true,
          scrub: 0.6,
          snap: { snapTo: 1 / (n - 1), duration: { min: 0.2, max: 0.6 }, ease: "power2.inOut" },
          onUpdate: (self) => {
            pos.current.v = self.progress * (n - 1);
            render();
          },
        });
        return () => {
          pinTrigger.current = null;
        };
      });
    },
    { scope: root, dependencies: [n] },
  );

  // Arraste (pointer): acompanha o dedo e encaixa na imagem mais próxima ao soltar.
  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    let startX = 0;
    let startV = 0;
    let dragging = false;
    const down = (e: PointerEvent) => {
      if (pinTrigger.current || e.pointerType === "mouse") return; // desktop fixo: só scroll/setas
      dragging = true;
      startX = e.clientX;
      startV = pos.current.v;
      gsap.killTweensOf(pos.current);
    };
    const move = (e: PointerEvent) => {
      if (!dragging) return;
      const w = el.getBoundingClientRect().width * 0.68;
      pos.current.v = Math.min(n - 1, Math.max(0, startV - (e.clientX - startX) / w));
      render();
    };
    const up = (e: PointerEvent) => {
      if (!dragging) return;
      dragging = false;
      const moved = e.clientX - startX;
      const target = Math.abs(moved) > 40 ? Math.round(startV) - Math.sign(moved) : Math.round(pos.current.v);
      goTo(target);
    };
    el.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => {
      el.removeEventListener("pointerdown", down);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
  }, [n, render, goTo]);

  const item = items[current];

  return (
    <div ref={root} className="relative flex min-h-svh flex-col justify-center py-16">
      <h3 className="px-6 font-mono text-[11px] uppercase tracking-[0.28em] text-silver md:px-12">
        {labels.title}
      </h3>

      <div
        ref={stage}
        role="region"
        aria-roledescription="carousel"
        aria-label={labels.label}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") goTo(current + 1);
          if (e.key === "ArrowLeft") goTo(current - 1);
        }}
        className="relative mt-8 h-[min(62svh,58vw)] touch-pan-y select-none overflow-hidden outline-none md:h-[min(66svh,40vw)]"
      >
        {items.map((it, i) => {
          const { style, dim } = slideStyle(i);
          return (
            <div
              key={i}
              ref={(el) => {
                slides.current[i] = el;
              }}
              role="group"
              aria-roledescription="slide"
              aria-label={labels.counters[i]}
              aria-hidden={i !== current}
              className="absolute left-1/2 top-1/2 w-[78vw] will-change-transform md:w-[min(56vw,980px)]"
              style={style}
            >
              <MediaSlot
                src={it.src}
                alt={it.alt}
                label={it.src ? it.project : labels.placeholder}
                ratio="aspect-[16/10]"
                sizes="(min-width: 768px) 56vw, 78vw"
              />
              <div
                ref={(el) => {
                  dims.current[i] = el;
                }}
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 bg-background"
                style={{ opacity: dim }}
              />
            </div>
          );
        })}
      </div>

      {/* Legenda + controles */}
      <div className="mx-auto mt-8 flex w-full max-w-[1600px] items-end justify-between gap-6 px-6 md:px-12">
        <p aria-live="polite" className="min-h-[3.5rem]">
          <span key={`p-${current}`} className="block animate-[fadeIn_0.5s_ease] text-xl font-semibold tracking-[-0.03em] md:text-2xl">
            {item?.project}
          </span>
          <span key={`y-${current}`} className="mt-1 block animate-[fadeIn_0.5s_ease] font-mono text-[11px] uppercase tracking-[0.22em] text-silver">
            {item?.year} · {item?.role}
          </span>
          <span key={`c-${current}`} className="mt-1 block font-mono text-[10px] uppercase tracking-[0.22em] text-silver/70">
            {labels.counters[current]}
          </span>
        </p>
        <div className="flex items-center gap-3">
          <span className="mr-2 hidden font-mono text-[10px] uppercase tracking-[0.22em] text-silver md:hidden [@media(pointer:coarse)]:inline">
            {labels.dragHint}
          </span>
          <button
            type="button"
            onClick={() => goTo(current - 1)}
            disabled={current === 0}
            aria-label={labels.prev}
            className="grid h-12 w-12 place-items-center border border-line transition-colors hover:border-foreground disabled:opacity-30"
          >
            <span aria-hidden="true">←</span>
          </button>
          <button
            type="button"
            onClick={() => goTo(current + 1)}
            disabled={current === n - 1}
            aria-label={labels.next}
            className="grid h-12 w-12 place-items-center border border-line transition-colors hover:border-foreground disabled:opacity-30"
          >
            <span aria-hidden="true">→</span>
          </button>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect } from "react";

/**
 * Seção Tecnologia: entrada dos 4 cards (uma vez, em cascata, ao aparecer) e
 * reflexo do vidro seguindo o mouse (--mx/--my, como nas caixas da seção
 * Fractional). Sem JS ou com prefers-reduced-motion, os cards ficam visíveis
 * e parados (o estado escondido só existe com data-armed, posto aqui).
 */
export default function TechFx({ sectionId, cardsId }: { sectionId: string; cardsId: string }) {
  useEffect(() => {
    const section = document.getElementById(sectionId);
    const grid = document.getElementById(cardsId);
    if (!section || !grid) return;
    const cards = [...grid.querySelectorAll<HTMLElement>(".tech-card")];
    const cleanups: (() => void)[] = [];

    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      section.setAttribute("data-armed", "");
      const io = new IntersectionObserver(
        ([e]) => {
          if (!e.isIntersecting) return;
          cards.forEach((card, i) => {
            card.style.transitionDelay = `${i * 90}ms`;
            card.setAttribute("data-show", "");
          });
          // a cascata vale só para a entrada (o hover fica imediato)
          const id = window.setTimeout(() => cards.forEach((c) => (c.style.transitionDelay = "")), 1200);
          cleanups.push(() => window.clearTimeout(id));
          io.disconnect();
        },
        { rootMargin: "0px 0px -15% 0px" },
      );
      io.observe(grid);
      cleanups.push(() => io.disconnect());
    }

    if (window.matchMedia("(hover: hover) and (pointer: fine) and (min-width: 768px)").matches) {
      const onMove = (e: PointerEvent) => {
        const card = (e.target as Element).closest<HTMLElement>(".tech-card");
        if (!card) return;
        const r = card.getBoundingClientRect();
        card.style.setProperty("--mx", `${e.clientX - r.left}px`);
        card.style.setProperty("--my", `${e.clientY - r.top}px`);
      };
      grid.addEventListener("pointermove", onMove, { passive: true });
      cleanups.push(() => grid.removeEventListener("pointermove", onMove));
    }

    return () => cleanups.forEach((fn) => fn());
  }, [sectionId, cardsId]);

  return null;
}

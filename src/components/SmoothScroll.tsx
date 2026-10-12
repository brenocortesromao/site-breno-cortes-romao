"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/**
 * Scroll suave com inércia (Lenis) dirigido pelo ticker do GSAP, para que o
 * ScrollTrigger e o Lenis leiam a mesma posição no mesmo quadro.
 * - prefers-reduced-motion: não inicializa (scroll nativo).
 * - Toque: o Lenis mantém o scroll nativo por padrão (syncTouch: false), o que
 *   é mais leve e mais previsível no celular.
 */
let instance: Lenis | null = null;

/**
 * Rola a página até `y` com a mesma suavidade do Lenis (ou nativamente, quando
 * ele não está ativo: movimento reduzido / toque). Use em botões que movem o
 * scroll (ex.: setas do carrossel), para não "brigar" com o Lenis.
 */
export function scrollToY(y: number) {
  if (instance) instance.scrollTo(y, { duration: 1.1 });
  else {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: y, behavior: reduced ? "auto" : "smooth" });
  }
}

/** Trava/destrava o scroll da página (ex.: lightbox aberto), com ou sem Lenis. */
export function lockScroll(locked: boolean) {
  if (locked) instance?.stop();
  else instance?.start();
  document.documentElement.style.overflow = locked ? "hidden" : "";
}

export default function SmoothScroll() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const lenis = new Lenis({
      lerp: 0.085,
      wheelMultiplier: 0.9,
      anchors: true, // links "#secao" também deslizam
      autoRaf: false,
    });

    instance = lenis;
    lenis.on("scroll", ScrollTrigger.update);
    const tick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(tick);
      gsap.ticker.lagSmoothing(500, 33);
      lenis.destroy();
      instance = null;
    };
  }, []);

  return null;
}

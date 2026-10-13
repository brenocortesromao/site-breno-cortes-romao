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

/** Salto imediato (sem suavização), pelo Lenis quando ativo. */
function jumpTo(y: number) {
  window.scrollTo(0, y);
  instance?.scrollTo(y, { immediate: true });
}

/**
 * Carregamento/recarga: sempre começa no topo (o navegador não restaura a
 * posição: scrollRestoration "manual", ver layout). Com âncora na URL
 * (#contato...), vai à seção quando o layout estabiliza (fontes, load e
 * refresh do ScrollTrigger), sem pulo.
 */
function startPosition() {
  try {
    history.scrollRestoration = "manual";
  } catch {
    /* navegador sem suporte */
  }
  const id = decodeURIComponent(window.location.hash.slice(1));
  jumpTo(0);
  if (!id) {
    ScrollTrigger.refresh();
    return () => {};
  }
  let alive = true;
  const go = () => {
    const el = document.getElementById(id);
    if (!el) return;
    jumpTo(Math.max(0, el.getBoundingClientRect().top + window.scrollY));
  };
  const settle = async () => {
    await document.fonts?.ready;
    if (document.readyState !== "complete") await new Promise((r) => window.addEventListener("load", r, { once: true }));
    if (!alive) return;
    ScrollTrigger.refresh();
    go();
    // as posições dos pins podem mudar depois do refresh: confere de novo
    window.setTimeout(() => {
      if (!alive) return;
      ScrollTrigger.refresh();
      const el = document.getElementById(id);
      if (el && Math.abs(el.getBoundingClientRect().top) > 4) go();
    }, 600);
  };
  settle();
  return () => {
    alive = false;
  };
}

export default function SmoothScroll() {
  useEffect(() => {
    const stopStart = startPosition();
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return stopStart;

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
      stopStart();
      gsap.ticker.remove(tick);
      gsap.ticker.lagSmoothing(500, 33);
      lenis.destroy();
      instance = null;
    };
  }, []);

  return null;
}

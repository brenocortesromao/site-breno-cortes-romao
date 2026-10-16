"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { isMobileUI, watchScrolling } from "@/lib/mobile";

gsap.registerPlugin(ScrollTrigger);

// Celular: a barra de endereço aparecendo/sumindo muda só a altura da janela e
// não deve recalcular os gatilhos no meio da rolagem (vale para o site todo).
if (typeof window !== "undefined" && isMobileUI()) ScrollTrigger.config({ ignoreMobileResize: true });

/**
 * Scroll suave com inércia (Lenis) dirigido pelo ticker do GSAP, para que o
 * ScrollTrigger e o Lenis leiam a mesma posição no mesmo quadro.
 * - prefers-reduced-motion: não inicializa (scroll nativo).
 * - Celular (toque ou até 767px, modo curado): o Lenis NÃO é criado. Mesmo com syncTouch: false
 *   ele registra touchstart/touchmove não passivos na janela, e o navegador
 *   passa a esperar o JavaScript a cada movimento do dedo. Sem ele, a rolagem
 *   é 100% nativa; links "#secao" deslizam pelo scroll suave nativo.
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

/** Trava/destrava a rolagem (jogo do Berry aberto): o Lenis para, a posição não muda. */
export function lockScroll(locked: boolean) {
  if (locked) instance?.stop();
  else instance?.start();
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
    if (isMobileUI()) {
      watchScrolling(); // rolagem ativa: cenas e laços contínuos congelam o quadro
      // âncoras da mesma página: continuam deslizando (antes era o Lenis)
      const onClick = (e: MouseEvent) => {
        const a = (e.target as Element | null)?.closest?.("a[href*='#']") as HTMLAnchorElement | null;
        if (!a || e.defaultPrevented || a.target === "_blank") return;
        const url = new URL(a.href, window.location.href);
        if (url.pathname !== window.location.pathname || !url.hash) return;
        const el = document.getElementById(decodeURIComponent(url.hash.slice(1)));
        if (!el) return;
        e.preventDefault();
        window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY, behavior: "smooth" });
      };
      document.addEventListener("click", onClick);
      return () => {
        stopStart();
        document.removeEventListener("click", onClick);
      };
    }

    const lenis = new Lenis({
      lerp: 0.085,
      wheelMultiplier: 0.9,
      anchors: true, // links "#secao" também deslizam
      syncTouch: false, // toque: rolagem nativa, sem inércia própria
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

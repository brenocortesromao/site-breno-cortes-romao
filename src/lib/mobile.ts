"use client";

import { useSyncExternalStore } from "react";

/**
 * Celular (regra única do site): toque (pointer: coarse) ou largura até 767 px.
 * Tudo o que muda só no celular passa por aqui; o desktop segue exatamente
 * como aprovado.
 */
export const MOBILE_QUERY = "(pointer: coarse), (max-width: 767.98px)";

export const isMobileUI = () => typeof window !== "undefined" && window.matchMedia(MOBILE_QUERY).matches;

/** DPR máximo das cenas 3D no celular. */
export const MOBILE_MAX_DPR = 1.25;

// ---------------------------------------------------------------- rolagem ativa
/**
 * Modo celular curado: true enquanto a página rola (dedo arrastando ou
 * inércia nativa: houve scroll nos últimos SETTLE_MS). As cenas 3D e os laços
 * contínuos congelam o quadro nesse intervalo (não renderizam, a imagem
 * continua na tela) e retomam ao parar: durante o arrasto, só o compositor
 * trabalha. O <html> recebe data-scrolling (para pausar animações CSS).
 * Só liga no celular (MOBILE_QUERY); no desktop é sempre false.
 * Garantia de retomada: com o dedo na tela e sem rolagem há STUCK_MS (dedo
 * parado, ou um touchend que não chegou à janela), as cenas voltam a animar.
 */
let touching = false;
let scrolling = false;
let idle = 0;
const listeners = new Set<() => void>();
const SETTLE_MS = 120;
const STUCK_MS = 800;

const set = (v: boolean) => {
  if (v === scrolling) return;
  scrolling = v;
  document.documentElement.toggleAttribute("data-scrolling", v);
  listeners.forEach((l) => l());
};
const settle = () => {
  window.clearTimeout(idle);
  idle = window.setTimeout(() => {
    if (!touching) set(false);
    // dedo ainda na tela sem rolar (ou touchend perdido): retoma mesmo assim
    else idle = window.setTimeout(() => set(false), STUCK_MS);
  }, SETTLE_MS);
};

let bound = false;
function bind() {
  if (bound || typeof window === "undefined") return;
  bound = true;
  if (!isMobileUI()) return;
  const opts = { passive: true, capture: true } as const;
  window.addEventListener("touchstart", () => (touching = true), opts);
  const end = () => {
    touching = false;
    settle();
  };
  window.addEventListener("touchend", end, opts);
  window.addEventListener("touchcancel", end, opts);
  window.addEventListener(
    "scroll",
    () => {
      set(true);
      settle();
    },
    { passive: true },
  );
}

/** Liga a detecção de rolagem (chamada uma vez no início, pelo SmoothScroll). */
export const watchScrolling = bind;

/** Leitura direta (para laços de render próprios, fora do React). */
export function isTouchScrolling() {
  bind();
  return scrolling;
}

/** Aviso quando a rolagem começa/para (laços fora do React, ex.: tweens em loop). */
export function onScrollingChange(cb: (scrolling: boolean) => void) {
  bind();
  const l = () => cb(scrolling);
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

/** Versão reativa (para o `frameloop` das cenas R3F). */
export function useTouchScrolling() {
  return useSyncExternalStore(
    (l) => {
      bind();
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => scrolling,
    () => false,
  );
}

// ---------------------------------------------------------------- taxa da tela
/**
 * Taxa real da tela (Hz): mediana dos intervalos de requestAnimationFrame com
 * a página parada, medida uma vez no início (~1 s; recomeça se houver
 * rolagem). Muitos Android têm 90/120 Hz: o monitor de qualidade usa limites
 * relativos a ela no celular. Até medir, 60.
 */
let hz = 60;
let hzStarted = false;
export function displayHz() {
  if (!hzStarted && typeof window !== "undefined") {
    hzStarted = true;
    const run = () => {
      const gaps: number[] = [];
      let last = 0;
      const loop = (t: number) => {
        if (scrolling) gaps.length = 0; // página rolando: recomeça
        else if (last) gaps.push(t - last);
        last = t;
        if (gaps.length < 60) {
          requestAnimationFrame(loop);
          return;
        }
        const sorted = gaps.sort((x, y) => x - y);
        const med = sorted[Math.floor(sorted.length / 2)];
        if (med > 0) hz = Math.min(144, Math.max(30, Math.round(1000 / med)));
      };
      requestAnimationFrame(loop);
    };
    if (document.readyState === "complete") run();
    else window.addEventListener("load", run, { once: true });
  }
  return hz;
}

// ---------------------------------------------------------------- redimensionamento
/**
 * No celular, a barra de endereço do Chrome aparecendo e sumindo muda só a
 * altura da janela em alguns pixels. `resize` filtrado: ignora mudanças só de
 * altura menores que 120 px no celular (no desktop, toda mudança passa).
 * Devolve a função que remove o listener.
 */
export function onStableResize(cb: () => void) {
  let w = window.innerWidth;
  let h = window.innerHeight;
  const handler = () => {
    const nw = window.innerWidth;
    const nh = window.innerHeight;
    if (nw === w && Math.abs(nh - h) < 120 && isMobileUI()) return;
    w = nw;
    h = nh;
    cb();
  };
  window.addEventListener("resize", handler);
  return () => window.removeEventListener("resize", handler);
}

/**
 * ResizeObserver com o mesmo filtro: no celular, ignora mudanças só de altura
 * menores que 120 px (barra de endereço); no desktop, igual a um
 * ResizeObserver comum.
 */
export function stableResizeObserver(cb: () => void) {
  const last = new WeakMap<Element, { w: number; h: number }>();
  return new ResizeObserver((entries) => {
    let changed = false;
    for (const e of entries) {
      const w = e.contentRect.width;
      const h = e.contentRect.height;
      const prev = last.get(e.target);
      if (prev && prev.w === w && Math.abs(prev.h - h) < 120 && isMobileUI()) continue;
      last.set(e.target, { w, h });
      changed = true;
    }
    if (changed) cb();
  });
}

"use client";

import { useSyncExternalStore } from "react";

/**
 * Celular (regra única do site): toque (pointer: coarse) ou largura até 767 px.
 * Tudo o que muda só no celular passa por aqui; o desktop segue exatamente
 * como aprovado.
 */
export const MOBILE_QUERY = "(pointer: coarse), (max-width: 767.98px)";

export const isMobileUI = () => typeof window !== "undefined" && window.matchMedia(MOBILE_QUERY).matches;

/**
 * `scrub` do ScrollTrigger: no celular, `true` (a animação acompanha o dedo,
 * sem atraso de suavização); no desktop, o valor aprovado.
 */
export const scrubFor = (desktop: number): number | true => (isMobileUI() ? true : desktop);

/** DPR máximo das cenas 3D no celular. */
export const MOBILE_MAX_DPR = 1.25;

// ---------------------------------------------------------------- rolagem com o dedo
/**
 * true enquanto o dedo rola a página (do toque até a inércia nativa parar).
 * As cenas 3D congelam o quadro nesse intervalo (não renderizam, a imagem
 * continua na tela) e retomam ao parar. Só liga em dispositivo de toque.
 */
let touching = false;
let scrolling = false;
let idle = 0;
const listeners = new Set<() => void>();
const SETTLE_MS = 160;

const set = (v: boolean) => {
  if (v === scrolling) return;
  scrolling = v;
  listeners.forEach((l) => l());
};
const settle = () => {
  window.clearTimeout(idle);
  idle = window.setTimeout(() => {
    if (!touching) set(false);
  }, SETTLE_MS);
};

let bound = false;
function bind() {
  if (bound || typeof window === "undefined") return;
  bound = true;
  if (!window.matchMedia("(pointer: coarse)").matches) return;
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
      if (touching || scrolling) {
        set(true);
        settle();
      }
    },
    { passive: true },
  );
}

/** Leitura direta (para laços de render próprios, fora do React). */
export function isTouchScrolling() {
  bind();
  return scrolling;
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

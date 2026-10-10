"use client";

import { useEffect, useState, useSyncExternalStore, type RefObject } from "react";
import { webglSupport } from "./webgl";

/**
 * Qualidade adaptativa e orçamento de contextos WebGL (um ponto central para
 * todas as cenas 3D: hero, retrato, nuvens, curvas líquidas, montanhas, gota).
 *
 * NÍVEL (detectado uma vez):
 * - "none": sem WebGL2 ou renderizador por software (ver lib/webgl.ts):
 *   as cenas usam os fallbacks estáticos;
 * - "low": toque + poucos núcleos ou pouca memória;
 * - "medium": toque ou até 4 núcleos;
 * - "high": o resto (desktop). É EXATAMENTE a qualidade aprovada de hoje.
 * Presets: DPR máximo (2 / 1,5 / 1) e geometria leve (as variantes "light"
 * que já existiam para o mobile) no "low".
 *
 * MONITOR DE FPS: enquanto há cena 3D montada, mede o tempo entre quadros; se
 * a média ficar abaixo de ~50 fps por 3 s seguidos (ignorando os primeiros
 * segundos, aba em segundo plano e picos), desce um nível (high → medium →
 * low). Nunca sobe de volta na mesma visita (evita oscilar).
 *
 * ORÇAMENTO: no máximo MAX_CONTEXTS contextos WebGL ao mesmo tempo. Cada cena
 * pede uma vaga com `useWebglSlot`; ganham as que estão mais perto da tela
 * (e, empatadas, as que ocupam mais área). Quem perde a vaga desmonta (o pai
 * mostra o fallback/pôster) e o contexto é liberado.
 */

export type Tier = "none" | "low" | "medium" | "high";
const ORDER: Tier[] = ["none", "low", "medium", "high"];
export const MAX_CONTEXTS = 2;

export type Preset = { maxDpr: number; light: boolean };
const PRESETS: Record<Tier, Preset> = {
  none: { maxDpr: 1, light: true },
  low: { maxDpr: 1, light: true },
  medium: { maxDpr: 1.5, light: false },
  high: { maxDpr: 2, light: false },
};

// ---------------------------------------------------------------- nível
let detected: Tier | null = null;
let current: Tier | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function detectTier(): Tier {
  if (!webglSupport().webgl2) return "none";
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const nav = navigator as Navigator & { deviceMemory?: number };
  const cores = nav.hardwareConcurrency ?? 8;
  const mem = nav.deviceMemory ?? 8;
  if (coarse && (cores <= 4 || mem <= 3)) return "low";
  if (coarse || cores <= 4) return "medium";
  return "high";
}

export function getTier(): Tier {
  if (typeof window === "undefined") return "high";
  if (!detected) {
    detected = detectTier();
    current = detected;
  }
  return current!;
}

export const presetFor = (tier: Tier) => PRESETS[tier];

function downgrade() {
  const t = getTier();
  const i = ORDER.indexOf(t);
  if (i <= 1) return; // "low" é o piso (o "none" só vem da detecção)
  current = ORDER[i - 1];
  console.info(`[qualidade] FPS baixo: nível ${t} → ${current}`);
  emit();
}

/** Nível atual (reativo: muda se o monitor de FPS rebaixar). */
export function useTier(): Tier {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    getTier,
    () => "high",
  );
}

// ---------------------------------------------------------------- monitor de FPS
let activeScenes = 0;
let raf = 0;

function startMonitor() {
  if (raf || typeof window === "undefined") return;
  const started = performance.now();
  let last = started;
  let windowStart = started;
  let frames = 0;
  let slowWindows = 0;
  const loop = (now: number) => {
    raf = activeScenes > 0 ? requestAnimationFrame(loop) : 0;
    const dt = now - last;
    last = now;
    // aba escondida / pausa longa: recomeça a janela, não conta
    if (document.visibilityState !== "visible" || dt > 250) {
      windowStart = now;
      frames = 0;
      return;
    }
    if (now - started < 4000) return; // carga, compilação de shaders
    frames++;
    if (now - windowStart >= 1000) {
      const fps = (frames * 1000) / (now - windowStart);
      slowWindows = fps < 50 ? slowWindows + 1 : 0;
      if (slowWindows >= 3) {
        slowWindows = 0;
        downgrade();
      }
      windowStart = now;
      frames = 0;
    }
  };
  raf = requestAnimationFrame(loop);
}

/** Registra uma cena 3D montada (o monitor só roda enquanto houver alguma). */
export function useSceneMonitor(mounted: boolean) {
  useEffect(() => {
    if (!mounted) return;
    activeScenes++;
    startMonitor();
    return () => {
      activeScenes--;
    };
  }, [mounted]);
}

// ---------------------------------------------------------------- orçamento de contextos
type Slot = { el: Element; near: boolean };
const slots = new Map<symbol, Slot>();
let allowed = new Set<symbol>();
let version = 0;
const slotListeners = new Set<() => void>();
let pending = 0;

function recompute() {
  pending = 0;
  const vh = window.innerHeight;
  const ranked = [...slots.entries()]
    .filter(([, s]) => s.near)
    .map(([id, s]) => {
      const r = s.el.getBoundingClientRect();
      const dist = r.bottom < 0 ? -r.bottom : r.top > vh ? r.top - vh : 0;
      const area = Math.max(0, Math.min(r.bottom, vh) - Math.max(r.top, 0)) * r.width;
      return { id, dist, area };
    })
    .sort((a, b) => a.dist - b.dist || b.area - a.area);
  const next = new Set(ranked.slice(0, MAX_CONTEXTS).map((x) => x.id));
  const same = next.size === allowed.size && [...next].every((id) => allowed.has(id));
  if (same) return;
  allowed = next;
  version++;
  slotListeners.forEach((l) => l());
}
const schedule = () => {
  if (!pending) pending = requestAnimationFrame(recompute);
};
let scrollBound = false;
function bindScroll() {
  if (scrollBound) return;
  scrollBound = true;
  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", schedule);
}

/**
 * Vaga de contexto WebGL para a cena dentro de `ref`: true quando a cena está
 * a até `margin` da tela E entre as MAX_CONTEXTS mais próximas: a cena monta
 * com true e desmonta com false (o contexto é liberado na desmontagem).
 */
export function useWebglSlot(ref: RefObject<Element | null>, margin = "100% 0px") {
  const [id] = useState(() => Symbol("webgl"));
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    bindScroll();
    slots.set(id, { el, near: false });
    const io = new IntersectionObserver(
      ([e]) => {
        const s = slots.get(id);
        if (s) s.near = e.isIntersecting;
        schedule();
      },
      { rootMargin: margin },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      slots.delete(id);
      schedule();
    };
  }, [ref, margin, id]);
  useSyncExternalStore(
    (l) => {
      slotListeners.add(l);
      return () => slotListeners.delete(l);
    },
    () => version,
    () => 0,
  );
  return allowed.has(id);
}

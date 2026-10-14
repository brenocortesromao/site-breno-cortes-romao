"use client";

import { useEffect, useState, useSyncExternalStore, type RefObject } from "react";
import { webglSupport } from "./webgl";
import { displayHz, isMobileUI, isTouchScrolling, MOBILE_MAX_DPR, onStableResize } from "./mobile";

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
 * MONITOR DE FPS (por cena): enquanto há cena 3D montada, mede o fps em
 * janelas de 1 s. Janelas com rolagem da página são ignoradas (engasgo de
 * rolagem é do DOM, não da cena), assim como os primeiros segundos, a aba em
 * segundo plano e pausas longas. A janela é atribuída à cena com mais área
 * visível; 3 janelas seguidas abaixo de ~50 fps rebaixam SÓ essa cena (high →
 * medium → low). Depois de ~10 s estáveis acima de 55 fps, ela volta a subir um
 * nível; se cair de novo depois de subir, fica travada no nível menor (sem
 * oscilar). As cenas pedem o nível com `useSceneTier(nome, ref, montada)`.
 *
 * CELULAR (lib/mobile.ts): DPR máximo 1,25 e 1 contexto WebGL por vez. Os
 * limites valem sobre min(taxa da tela, 60): "lento" abaixo de 70% (~42 fps),
 * "estável" acima de 90% (~54 fps); telas de 90/120 Hz não exigem mais que
 * 60 fps. Janelas com rolagem (ou com as cenas congeladas pela rolagem) não
 * contam: durante a rolagem as cenas estão pausadas e a medida não reflete o
 * custo delas. O rebaixamento é o mesmo do desktop (high → medium → low). O
 * pôster (nível "none" só da cena, sem volta na sessão) é o último recurso:
 * abaixo de 30 fps em 4 janelas seguidas sem rolagem, com a cena na tela e
 * animando (sem prefers-reduced-motion); a bola da hero e a gota nunca caem
 * para o pôster.
 *
 * DIAGNÓSTICO: com ?debug=quality na URL, um painel no canto mostra a taxa da
 * tela, o nível de cada cena e o fps (components/QualityDebug.tsx).
 *
 * DESKTOP: limites fixos de 50/55 fps e janelas com rolagem ignoradas, como
 * antes.
 *
 * ORÇAMENTO: no máximo MAX_CONTEXTS contextos WebGL ao mesmo tempo (1 no celular). Cada cena
 * pede uma vaga com `useWebglSlot`; ganham as que estão mais perto da tela
 * (e, empatadas, as que ocupam mais área). Quem perde a vaga desmonta (o pai
 * mostra o fallback/pôster) e o contexto é liberado.
 */

export type Tier = "none" | "low" | "medium" | "high";
const ORDER: Tier[] = ["none", "low", "medium", "high"];
export const MAX_CONTEXTS = 2;
/** Contextos ao mesmo tempo: 2 no desktop, 1 no celular. */
const maxContexts = () => (isMobileUI() ? 1 : MAX_CONTEXTS);

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

export const presetFor = (tier: Tier): Preset => {
  const p = PRESETS[tier];
  return isMobileUI() ? { ...p, maxDpr: Math.min(p.maxDpr, MOBILE_MAX_DPR) } : p;
};

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
type SceneEntry = { name: string; el: Element | null };
const sceneEntries = new Map<symbol, SceneEntry>();
/** Nível de cada cena (por nome: vale também quando ela remonta). */
const sceneTier = new Map<string, Tier>();
const sceneState = new Map<string, { slow: number; good: number; upgraded: boolean; locked: boolean; critical: number }>();
/** Cenas que nunca caem para o pôster (a bola da hero é o centro do site). */
const NO_POSTER = new Set(["bola da hero", "gota"]);
/** Celular: referência de fps = taxa da tela limitada a 60 (90/120 Hz não exigem mais). */
const mobileBase = () => Math.min(displayHz(), 60);
/** Limites de fps: celular sobre min(taxa da tela, 60); desktop fixo (50/55). */
const slowFps = () => (isMobileUI() ? mobileBase() * 0.7 : 50);
const goodFps = () => (isMobileUI() ? mobileBase() * 0.9 : 55);
/** Celular, último recurso: abaixo de POSTER_FPS em POSTER_WINDOWS janelas seguidas sem rolagem. */
const POSTER_FPS = 30;
const POSTER_WINDOWS = 4;
const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
let activeScenes = 0;
let raf = 0;
/** Última janela do monitor (só para o painel ?debug=quality). */
let debugFps: number | null = null;
let debugWindow = "";
let lastScroll = 0;
let scrollWatch = false;

const tierOf = (name: string) => {
  const g = getTier();
  const own = sceneTier.get(name);
  return own && ORDER.indexOf(own) < ORDER.indexOf(g) ? own : g;
};
const stateOf = (name: string) => {
  let st = sceneState.get(name);
  if (!st) sceneState.set(name, (st = { slow: 0, good: 0, upgraded: false, locked: false, critical: 0 }));
  return st;
};
/** Cena com mais área visível agora (a "dona" da janela medida). */
function foreground(): string | null {
  let best: string | null = null;
  let bestArea = 0;
  const vh = window.innerHeight;
  const vw = window.innerWidth;
  sceneEntries.forEach((e) => {
    if (!e.el) return;
    const r = e.el.getBoundingClientRect();
    const h = Math.max(0, Math.min(r.bottom, vh) - Math.max(r.top, 0));
    const w = Math.max(0, Math.min(r.right, vw) - Math.max(r.left, 0));
    if (h * w > bestArea) {
      bestArea = h * w;
      best = e.name;
    }
  });
  return best;
}

function setSceneTier(name: string, next: Tier, why: string) {
  const from = tierOf(name);
  sceneTier.set(name, next);
  console.info(`[qualidade] ${why} em "${name}": nível ${from} → ${next}`);
  emit();
}

function judge(fps: number) {
  const name = foreground();
  if (!name) return;
  const st = stateOf(name);
  const t = tierOf(name);
  const i = ORDER.indexOf(t);
  if (t === "none") return; // pôster: fica
  // celular, último recurso: muito lento por várias janelas seguidas (cena na
  // tela e animando, sem rolagem): pôster só desta cena
  if (isMobileUI() && !NO_POSTER.has(name) && !reducedMotion()) {
    st.critical = fps < POSTER_FPS ? st.critical + 1 : 0;
    if (st.critical >= POSTER_WINDOWS) {
      st.locked = true;
      setSceneTier(name, "none", `FPS abaixo de ${POSTER_FPS} em ${POSTER_WINDOWS} janelas seguidas sem rolagem`);
      return;
    }
  }
  if (fps < slowFps()) {
    st.good = 0;
    st.slow++;
    if (st.slow >= 3 && i > 1) {
      st.slow = 0;
      if (st.upgraded) st.locked = true; // caiu de novo depois de subir: fica aqui
      setSceneTier(name, ORDER[i - 1], "FPS baixo");
    }
  } else {
    st.slow = 0;
    st.good = fps >= goodFps() ? st.good + 1 : 0;
    const top = ORDER.indexOf(getTier());
    if (st.good >= 10 && i < top && !st.locked) {
      st.good = 0;
      st.upgraded = true;
      setSceneTier(name, ORDER[i + 1], "FPS estável");
    }
  }
}

function startMonitor() {
  if (raf || typeof window === "undefined") return;
  if (!scrollWatch) {
    scrollWatch = true;
    window.addEventListener("scroll", () => (lastScroll = performance.now()), { passive: true });
  }
  if (isMobileUI()) displayHz(); // começa a medir a taxa da tela
  const started = performance.now();
  let last = started;
  let windowStart = started;
  let frames = 0;
  /** Celular: a janela teve cenas congeladas pela rolagem (dedo ou inércia). */
  let frozen = false;
  const loop = (now: number) => {
    raf = activeScenes > 0 ? requestAnimationFrame(loop) : 0;
    const dt = now - last;
    last = now;
    // aba escondida / pausa longa: recomeça a janela, não conta
    if (document.visibilityState !== "visible" || dt > 250) {
      windowStart = now;
      frames = 0;
      frozen = false;
      return;
    }
    if (now - started < 4000) return; // carga, compilação de shaders
    frames++;
    if (isTouchScrolling()) frozen = true;
    if (now - windowStart >= 1000) {
      const fps = (frames * 1000) / (now - windowStart);
      debugFps = fps;
      // janela com rolagem não conta (engasgo de rolagem não é da cena; no
      // celular, as cenas estão congeladas durante a rolagem)
      if (lastScroll < windowStart && !frozen) {
        debugWindow = "medida";
        judge(fps);
      } else {
        debugWindow = "rolagem (ignorada)";
        sceneState.forEach((st) => (st.critical = 0)); // "seguidas": a rolagem interrompe
      }
      windowStart = now;
      frames = 0;
      frozen = false;
    }
  };
  raf = requestAnimationFrame(loop);
}

/**
 * Nível de qualidade desta cena (reativo) e registro no monitor de FPS
 * enquanto ela estiver montada. `ref`: o elemento da cena (para saber quanto
 * dela está na tela).
 */
export function useSceneTier(name: string, ref: RefObject<Element | null>, mounted: boolean): Tier {
  const [id] = useState(() => Symbol(name));
  useEffect(() => {
    if (!mounted) return;
    sceneEntries.set(id, { name, el: ref.current });
    activeScenes++;
    startMonitor();
    return () => {
      sceneEntries.delete(id);
      activeScenes--;
    };
  }, [mounted, name, ref, id]);
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => tierOf(name),
    () => "high" as Tier,
  );
}

/** Retrato do monitor para o painel ?debug=quality (components/QualityDebug.tsx). */
export function qualityDebugInfo() {
  const mounted = new Set([...sceneEntries.values()].map((e) => e.name));
  const names = [...new Set([...mounted, ...sceneTier.keys()])];
  return {
    hz: displayHz(),
    mobile: isMobileUI(),
    reduced: reducedMotion(),
    device: getTier(),
    slow: slowFps(),
    good: goodFps(),
    fps: debugFps,
    window: debugWindow,
    foreground: foreground(),
    scenes: names.map((name) => ({ name, tier: tierOf(name), mounted: mounted.has(name) })),
  };
}

// ---------------------------------------------------------------- orçamento de contextos
type Slot = { el: Element; near: boolean };
const slots = new Map<symbol, Slot>();
let allowed = new Set<symbol>();
let version = 0;
const slotListeners = new Set<() => void>();
let pending = 0;
/** Rolagem: reavalia no máximo a cada SCROLL_MS (não a cada quadro). */
const SCROLL_MS = 120;

function recompute() {
  window.clearTimeout(pending);
  pending = 0;
  const vh = window.innerHeight;
  const near = [...slots.entries()].filter(([, s]) => s.near);
  const max = maxContexts();
  // até MAX_CONTEXTS cenas perto: todas ganham, sem medir nada (o caso comum)
  const ranked =
    near.length <= max
      ? near.map(([id]) => ({ id }))
      : near
          .map(([id, s]) => {
            const r = s.el.getBoundingClientRect();
            const dist = r.bottom < 0 ? -r.bottom : r.top > vh ? r.top - vh : 0;
            const area = Math.max(0, Math.min(r.bottom, vh) - Math.max(r.top, 0)) * r.width;
            return { id, dist, area };
          })
          .sort((a, b) => a.dist - b.dist || b.area - a.area);
  const next = new Set(ranked.slice(0, max).map((x) => x.id));
  const same = next.size === allowed.size && [...next].every((id) => allowed.has(id));
  if (same) return;
  allowed = next;
  version++;
  slotListeners.forEach((l) => l());
}
/**
 * Reavaliação numa tarefa própria, fora do quadro de animação: ali o layout já
 * está limpo e ler posições não força um recálculo no meio da rolagem.
 */
const schedule = (delay = 0) => {
  if (!pending) pending = window.setTimeout(recompute, delay);
};
const onScroll = () => schedule(SCROLL_MS);
let scrollBound = false;
function bindScroll() {
  if (scrollBound) return;
  scrollBound = true;
  window.addEventListener("scroll", onScroll, { passive: true });
  onStableResize(() => schedule());
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

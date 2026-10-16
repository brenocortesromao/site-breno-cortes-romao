"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";

/** Tamanho do anel por estado (px). */
const SIZE = { base: 36, link: 56 } as const;
type Mode = keyof typeof SIZE;
/** Lerp do anel por quadro (a 60 fps). */
const LERP = 0.15;
/** Deslocamento máximo do efeito magnético (px). */
const MAGNET = 6;
const LINKS = 'a[href], button:not([disabled]), [data-cursor="link"]';

/**
 * Cursor do site (metal líquido), só com mouse (hover + ponteiro fino):
 * - ponto de 8px que segue o mouse sem atraso;
 * - anel de 36px que segue com atraso (lerp ~0,15 por quadro) e, rápido, estica
 *   na direção do movimento (scaleX até 1,4) como uma gota, voltando a círculo
 *   ao desacelerar;
 * - links e botões: anel de 56px, ponto some, e o elemento se desloca até 6px
 *   na direção do cursor (efeito magnético; usa a propriedade CSS `translate`,
 *   separada do `transform` que o GSAP e as utilidades de escala usam);
 * - mix-blend-mode: difference no conjunto.
 * Sobre a bola da hero, que tem o próprio cursor (a seção fica com
 * cursor:none inline), este some. prefers-reduced-motion: sem esticar e sem
 * efeito magnético. Toque: nada (cursor nativo).
 */
export default function CustomCursor() {
  const root = useRef<HTMLDivElement>(null);
  const dot = useRef<HTMLDivElement>(null);
  const ringPos = useRef<HTMLDivElement>(null);
  const ring = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = root.current;
    const d = dot.current;
    const rp = ringPos.current;
    const r = ring.current;
    if (!el || !d || !rp || !r) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const html = document.documentElement;
    html.classList.add("custom-cursor");

    let mx = -200;
    let my = -200;
    let rx = mx;
    let ry = my;
    let seen = false;
    let inside = true;
    let hidden = false;
    let mode: Mode = "base";
    let stretch = 0;
    let angle = 0;
    let active: HTMLElement | null = null;
    // elementos com deslocamento magnético em curso (o atual e os que voltam)
    const magnets = new Map<HTMLElement, { x: number; y: number }>();

    const setMode = (m: Mode) => {
      if (m === mode) return;
      mode = m;
      r.style.width = r.style.height = `${SIZE[m]}px`;
      d.style.opacity = m === "base" ? "1" : "0";
    };
    const updateVisibility = () => {
      el.style.opacity = seen && inside && !hidden ? "1" : "0";
    };

    /** Estado conforme o elemento sob o cursor. */
    const inspect = (target: Element | null) => {
      // bola da hero: ela tem o próprio cursor (seção com cursor:none inline)
      const sec = target?.closest("section");
      hidden = !!sec && sec.style.cursor === "none";
      updateVisibility();
      const link = target?.closest<HTMLElement>(LINKS);
      setMode(link ? "link" : "base");
      const next = link && !reduced && magnetic(link) ? link : null;
      if (next !== active) {
        active = next;
        if (next && !magnets.has(next)) magnets.set(next, { x: 0, y: 0 });
      }
    };
    /** Só elementos sem `translate` próprio (não brigar com utilidades/animações). */
    const magnetic = (node: HTMLElement) => {
      if (magnets.has(node)) return true;
      const t = getComputedStyle(node).translate;
      return !t || t === "none";
    };

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      mx = e.clientX;
      my = e.clientY;
      if (!seen) {
        seen = true;
        rx = mx;
        ry = my;
      }
      inside = true;
      inspect(e.target as Element);
    };
    const onLeave = () => {
      inside = false;
      updateVisibility();
    };
    const onEnter = () => {
      inside = true;
      updateVisibility();
    };
    const onDown = () => gsap.to(d, { scale: 0.6, duration: 0.15 });
    const onUp = () => gsap.to(d, { scale: 1, duration: 0.25 });

    let frame = 0;
    // hit-test numa tarefa própria depois do quadro (layout já limpo): dentro do
    // quadro, com a rolagem mexendo na página, forçaria um recálculo de layout
    let hitTimer = 0;
    const hitTest = () => {
      hitTimer = 0;
      inspect(document.elementFromPoint(mx, my));
    };
    const tick = (_t: number, deltaTime: number) => {
      const dt = Math.min(deltaTime / 1000, 0.05);
      const k = 1 - Math.pow(1 - LERP, dt * 60);
      rx += (mx - rx) * k;
      ry += (my - ry) * k;
      d.style.transform = `translate3d(${mx}px, ${my}px, 0) translate(-50%, -50%)`;
      rp.style.transform = `translate3d(${rx}px, ${ry}px, 0)`;
      // gota: estica na direção do movimento conforme a distância anel ↔ mouse
      const dx = mx - rx;
      const dy = my - ry;
      const dist = Math.hypot(dx, dy);
      const target = reduced ? 0 : Math.min(dist / 120, 1) * 0.4;
      stretch += (target - stretch) * (1 - Math.pow(0.82, dt * 60));
      if (dist > 0.5) angle = Math.atan2(dy, dx);
      r.style.transform = `translate(-50%, -50%) rotate(${angle}rad) scale(${1 + stretch}, ${1 - stretch * 0.3})`;
      // com a página rolando, o elemento sob o cursor parado muda
      if (seen && ++frame % 6 === 0 && !hitTimer) hitTimer = window.setTimeout(hitTest, 0);
      // efeito magnético (até 6px na direção do cursor; volta com ease ao sair)
      magnets.forEach((m, node) => {
        let tx = 0;
        let ty = 0;
        if (node === active) {
          const b = node.getBoundingClientRect();
          tx = gsap.utils.clamp(-1, 1, (mx - (b.left + b.width / 2)) / (b.width / 2 || 1)) * MAGNET;
          ty = gsap.utils.clamp(-1, 1, (my - (b.top + b.height / 2)) / (b.height / 2 || 1)) * MAGNET;
        }
        const e = 1 - Math.pow(0.85, dt * 60);
        m.x += (tx - m.x) * e;
        m.y += (ty - m.y) * e;
        if (node !== active && Math.abs(m.x) < 0.05 && Math.abs(m.y) < 0.05) {
          node.style.translate = "";
          magnets.delete(node);
        } else node.style.translate = `${m.x.toFixed(2)}px ${m.y.toFixed(2)}px`;
      });
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);
    html.addEventListener("mouseleave", onLeave);
    html.addEventListener("mouseenter", onEnter);
    gsap.ticker.add(tick);

    return () => {
      gsap.ticker.remove(tick);
      window.clearTimeout(hitTimer);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      html.removeEventListener("mouseleave", onLeave);
      html.removeEventListener("mouseenter", onEnter);
      magnets.forEach((_, node) => (node.style.translate = ""));
      html.classList.remove("custom-cursor");
    };
  }, []);

  return (
    <div
      ref={root}
      aria-hidden="true"
      data-custom-cursor
      className="pointer-events-none fixed left-0 top-0 z-[300] mix-blend-difference transition-opacity duration-200"
      style={{ opacity: 0 }}
    >
      <div
        ref={dot}
        className="absolute left-0 top-0 h-2 w-2 rounded-full bg-[#D9D9D9] shadow-[0_0_6px_rgba(217,217,217,0.55)] transition-opacity duration-200"
      />
      <div ref={ringPos} className="absolute left-0 top-0">
        <div
          ref={ring}
          className="absolute left-0 top-0 rounded-full border transition-[width,height] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
          style={{ width: SIZE.base, height: SIZE.base, borderColor: "rgba(217,217,217,0.6)" }}
        />
      </div>
    </div>
  );
}

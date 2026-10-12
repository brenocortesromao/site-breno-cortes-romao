"use client";

import { Fragment, useEffect, useRef } from "react";
import gsap from "gsap";

/** Tempo parado em cada letra no modo automático (s). */
const DWELL = 1.8;
/** Glitch entre a letra antiga e a nova (s) e salto da caixa (s). */
const GLITCH = 0.15;
const JUMP = 0.25;
/** Partículas em volta da caixa. */
const PARTICLES = 8;
/** Só letras e números recebem a seleção (espaços e pontuação, não). */
const ELIGIBLE = /[\p{L}\p{N}]/u;

type Box = { x: number; y: number; w: number; h: number };

/**
 * "Texto técnico": simula uma ferramenta de design inspecionando a tipografia,
 * uma letra por vez. A letra ativa vira só o contorno tracejado (um <text> SVG
 * com a mesma fonte, tamanho e peso, na posição medida da letra real, que fica
 * transparente); em volta, a caixa de seleção tracejada com alças (como no
 * Figma), a etiqueta em Geist Mono com o caractere e as medidas reais em px, e
 * partículas piscando. Na troca de letra, as letras do caminho piscam em cinza
 * pixelado por ~150 ms e a caixa salta (0,25 s, power3.out) para a nova.
 * - Desktop (ponteiro fino): a letra ativa segue o cursor sobre o título; sem
 *   cursor, percorre as letras sozinho em ordem aleatória (~1,8 s em cada).
 * - Toque: só o modo automático. Só roda com o título visível.
 * - Medidas refeitas no resize e depois de carregar as fontes.
 * - prefers-reduced-motion: título normal, sem o efeito.
 * Quebras de linha iguais às do texto corrido: cada palavra é um inline-block
 * sem quebra; as letras são spans inline (preserva o kerning). O texto inteiro
 * fica no aria-label; letras, SVG e etiqueta são aria-hidden.
 */
export default function TechnicalText({
  text,
  id,
  className = "",
  as: Tag = "h2",
  lineColor = "#0A0A0A",
  labelColor = "#6B6B6B",
  glitchColor = "#9A9A9A",
}: {
  text: string;
  id?: string;
  className?: string;
  as?: "h1" | "h2" | "h3";
  /** Contorno da letra, caixa e alças. */
  lineColor?: string;
  /** Etiqueta com as medidas e partículas. */
  labelColor?: string;
  /** Letras do caminho durante o glitch. */
  glitchColor?: string;
}) {
  const root = useRef<HTMLHeadingElement>(null);
  const svg = useRef<SVGSVGElement>(null);
  const outline = useRef<SVGTextElement>(null);
  const frame = useRef<SVGRectElement>(null);
  const handles = useRef<SVGGElement>(null);
  const dots = useRef<SVGGElement>(null);
  const label = useRef<HTMLSpanElement>(null);
  const probe = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const host = root.current;
    const layer = svg.current;
    const out = outline.current;
    const rect = frame.current;
    const hs = handles.current;
    const ps = dots.current;
    const tag = label.current;
    const base = probe.current;
    if (!host || !layer || !out || !rect || !hs || !ps || !tag || !base) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const chars = [...host.querySelectorAll<HTMLElement>("[data-ch]")];
    const eligible = chars.map((c, i) => (ELIGIBLE.test(c.textContent ?? "") ? i : -1)).filter((i) => i >= 0);
    if (!eligible.length) return;
    const canHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

    let boxes: Box[] = [];
    let ascent = 0;
    const measure = () => {
      const o = host.getBoundingClientRect();
      boxes = chars.map((c) => {
        const r = c.getBoundingClientRect();
        return { x: r.left - o.left, y: r.top - o.top, w: r.width, h: r.height };
      });
      // linha de base: a sonda (inline-block vazio) tem o topo na linha de base
      ascent = base.getBoundingClientRect().top - chars[0].getBoundingClientRect().top;
      const cs = getComputedStyle(host);
      out.style.fontFamily = cs.fontFamily;
      out.style.fontSize = cs.fontSize;
      out.style.fontWeight = cs.fontWeight;
      out.style.fontStretch = cs.fontStretch;
      if (current >= 0) {
        gsap.killTweensOf(box);
        Object.assign(box, boxes[current]);
        draw();
        settle(current);
      }
    };

    // --- desenho ---
    const box: Box = { x: 0, y: 0, w: 0, h: 0 };
    const handleEls = [...hs.children] as SVGRectElement[];
    const draw = () => {
      rect.setAttribute("x", String(box.x));
      rect.setAttribute("y", String(box.y));
      rect.setAttribute("width", String(Math.max(box.w, 0)));
      rect.setAttribute("height", String(Math.max(box.h, 0)));
      const xs = [box.x, box.x + box.w / 2, box.x + box.w];
      const ys = [box.y, box.y + box.h / 2, box.y + box.h];
      let k = 0;
      for (const yy of ys)
        for (const xx of xs) {
          if (yy === ys[1] && xx === xs[1]) continue; // sem alça no centro
          handleEls[k].setAttribute("x", String(xx - 2.5));
          handleEls[k].setAttribute("y", String(yy - 2.5));
          k++;
        }
      tag.style.transform = `translate3d(${box.x}px, ${box.y - 18}px, 0)`;
    };
    /** Letra ativa: some o preenchimento real, aparece o contorno tracejado. */
    const settle = (i: number) => {
      const b = boxes[i];
      out.textContent = chars[i].textContent;
      out.setAttribute("x", String(b.x));
      out.setAttribute("y", String(b.y + ascent));
      out.style.opacity = "1";
      chars[i].style.color = "transparent";
      tag.textContent = `${chars[i].textContent} ${Math.round(b.w)} × ${Math.round(b.h)}`;
    };
    const release = (i: number) => {
      chars[i].style.color = "";
      out.style.opacity = "0";
    };

    // --- partículas ---
    const particleEls = [...ps.children] as SVGRectElement[];
    const particleCalls: gsap.core.Tween[] = [];
    const blink = (p: SVGRectElement, slot: number) => {
      const s = gsap.utils.random(2, 6, 1);
      // posição aleatória numa faixa de ~24px em volta da caixa (fora dela)
      let x = 0;
      let y = 0;
      for (let t = 0; t < 8; t++) {
        x = gsap.utils.random(box.x - 24, box.x + box.w + 24);
        y = gsap.utils.random(box.y - 24, box.y + box.h + 24);
        const inside = x > box.x - s && x < box.x + box.w && y > box.y - s && y < box.y + box.h;
        if (!inside) break;
      }
      const solid = Math.random() < 0.5;
      p.setAttribute("x", String(x));
      p.setAttribute("y", String(y));
      p.setAttribute("width", String(s));
      p.setAttribute("height", String(s));
      p.setAttribute("fill", solid ? labelColor : "none");
      p.setAttribute("stroke", solid ? "none" : labelColor);
      p.style.opacity = "1";
      particleCalls[slot] = gsap.delayedCall(gsap.utils.random(0.08, 0.35), () => {
        p.style.opacity = "0";
        particleCalls[slot] = gsap.delayedCall(gsap.utils.random(0.05, 0.4), () => blink(p, slot));
      });
    };

    // --- troca de letra ---
    let current = -1;
    let busy = false;
    let pending = -1;
    let auto: gsap.core.Tween | null = null;
    let glitchTimer: gsap.core.Tween | null = null;
    let hovering = false;

    const go = (next: number) => {
      if (next === current) return;
      if (busy) {
        pending = next;
        return;
      }
      if (current < 0) {
        current = next;
        Object.assign(box, boxes[next]);
        draw();
        settle(next);
        gsap.to(layer, { opacity: 1, duration: 0.3 });
        gsap.to(tag, { opacity: 1, duration: 0.3 });
        return;
      }
      busy = true;
      const from = current;
      release(from);
      current = next;
      // glitch: letras entre a antiga e a nova em cinza pixelado
      const lo = Math.min(from, next);
      const hi = Math.max(from, next);
      const path = chars.slice(lo + 1, hi);
      const pixel = (c: HTMLElement) => {
        c.style.color = "transparent";
        c.style.backgroundImage = `repeating-conic-gradient(${glitchColor} 0 25%, transparent 0 50%)`;
        c.style.backgroundSize = "3px 3px";
        c.style.backgroundPosition = `${Math.round(Math.random() * 3)}px ${Math.round(Math.random() * 3)}px`;
        c.style.webkitBackgroundClip = "text";
        c.style.backgroundClip = "text";
      };
      path.forEach(pixel);
      glitchTimer = gsap.delayedCall(GLITCH / 2, () => {
        path.forEach((c) => (c.style.backgroundPosition = `${Math.round(Math.random() * 3)}px 0`));
        glitchTimer = gsap.delayedCall(GLITCH / 2, () => {
          path.forEach((c) => {
            c.style.color = "";
            c.style.backgroundImage = "";
            c.style.backgroundSize = "";
            c.style.backgroundPosition = "";
            c.style.webkitBackgroundClip = "";
            c.style.backgroundClip = "";
          });
          tag.textContent = "";
          gsap.to(box, {
            ...boxes[next],
            duration: JUMP,
            ease: "power3.out",
            onUpdate: draw,
            onComplete: () => {
              settle(next);
              busy = false;
              if (pending >= 0 && pending !== current) {
                const p = pending;
                pending = -1;
                go(p);
              } else pending = -1;
            },
          });
        });
      });
    };

    const scheduleAuto = () => {
      auto?.kill();
      auto = gsap.delayedCall(DWELL, () => {
        if (!hovering) {
          const options = eligible.filter((i) => i !== current);
          go(options[Math.floor(Math.random() * options.length)]);
        }
        scheduleAuto();
      });
    };

    // --- cursor (só ponteiro fino) ---
    let raf = 0;
    let px = 0;
    let py = 0;
    const pick = () => {
      raf = 0;
      const o = host.getBoundingClientRect();
      const x = px - o.left;
      const y = py - o.top;
      let best = -1;
      let bestD = Infinity;
      for (const i of eligible) {
        const b = boxes[i];
        if (y < b.y || y > b.y + b.h) continue; // mesma linha
        const d = x < b.x ? b.x - x : x > b.x + b.w ? x - b.x - b.w : 0;
        if (d < bestD) {
          bestD = d;
          best = i;
        }
      }
      if (best >= 0 && bestD < 24) go(best);
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      hovering = true;
      px = e.clientX;
      py = e.clientY;
      if (!raf) raf = requestAnimationFrame(pick);
    };
    const onLeave = () => {
      hovering = false;
      scheduleAuto();
    };

    // --- só com o título visível ---
    let running = false;
    const start = () => {
      if (running) return;
      running = true;
      measure();
      if (current < 0) go(eligible[Math.floor(Math.random() * eligible.length)]);
      else gsap.to([layer, tag], { opacity: 1, duration: 0.3 });
      particleEls.forEach((p, i) => (particleCalls[i] = gsap.delayedCall(Math.random() * 0.4, () => blink(p, i))));
      scheduleAuto();
      if (canHover) {
        host.addEventListener("pointermove", onMove);
        host.addEventListener("pointerleave", onLeave);
      }
    };
    const stop = () => {
      if (!running) return;
      running = false;
      auto?.kill();
      particleCalls.forEach((c) => c?.kill());
      particleEls.forEach((p) => (p.style.opacity = "0"));
      host.removeEventListener("pointermove", onMove);
      host.removeEventListener("pointerleave", onLeave);
      hovering = false;
    };
    const io = new IntersectionObserver(([entry]) => (entry.isIntersecting ? start() : stop()), {
      threshold: 0.1,
    });
    io.observe(host);
    const ro = new ResizeObserver(() => running && measure());
    ro.observe(host);
    document.fonts?.ready.then(() => running && measure());

    return () => {
      stop();
      io.disconnect();
      ro.disconnect();
      if (raf) cancelAnimationFrame(raf);
      glitchTimer?.kill();
      gsap.killTweensOf([box, layer, tag]);
      chars.forEach((c) => c.removeAttribute("style"));
      out.style.opacity = "0";
      layer.style.opacity = "0";
      tag.style.opacity = "0";
    };
  }, [text, labelColor, glitchColor]);

  const words = text.split(" ");
  return (
    <Tag ref={root} id={id} className={`relative ${className}`} aria-label={text} translate="no" data-technical>
      {words.map((word, w) => (
        <Fragment key={w}>
          <span aria-hidden="true" className="inline-block whitespace-nowrap">
            {w === 0 && <span ref={probe} className="inline-block h-0 w-0" />}
            {Array.from(word).map((ch, i) => (
              <span key={i} aria-hidden="true" data-ch>
                {ch}
              </span>
            ))}
          </span>
          {w < words.length - 1 ? " " : null}
        </Fragment>
      ))}
      <svg
        ref={svg}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
        style={{ opacity: 0 }}
      >
        <text
          ref={outline}
          fill="transparent"
          stroke={lineColor}
          strokeWidth={1.5}
          strokeDasharray="4 3"
          style={{ opacity: 0 }}
        />
        <rect ref={frame} fill="none" stroke={lineColor} strokeWidth={1} strokeDasharray="3 3" />
        <g ref={handles} fill={lineColor}>
          {Array.from({ length: 8 }, (_, i) => (
            <rect key={i} width={5} height={5} />
          ))}
        </g>
        <g ref={dots} strokeWidth={1}>
          {Array.from({ length: PARTICLES }, (_, i) => (
            <rect key={i} style={{ opacity: 0 }} />
          ))}
        </g>
      </svg>
      <span
        ref={label}
        aria-hidden="true"
        className="pointer-events-none absolute left-0 top-0 whitespace-nowrap font-mono text-[11px] font-normal leading-none tracking-normal"
        style={{ color: labelColor, opacity: 0 }}
      />
    </Tag>
  );
}

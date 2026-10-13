"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import Image from "next/image";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { revealOnce } from "@/lib/reveal";

gsap.registerPlugin(useGSAP, ScrollTrigger);

/**
 * Retrato da Mensagem com entrada "luz de estúdio acendendo" (só CSS/máscaras,
 * sem WebGL), por GATILHO (retrato a 78% da tela), uma vez, ~2,1 s:
 *  a) estado inicial: moldura escura, só a borda fina visível, fraca;
 *  b) um feixe de luz entra pela esquerda com 2 piscadas, como um refletor
 *     ligando;
 *  c) a luz varre a foto da esquerda para a direita: uma máscara em degradê
 *     suave se desloca e revela primeiro o lado iluminado do rosto, depois o
 *     resto, com leve aumento de exposição e contraste;
 *  d) a luz se acomoda: exposição volta ao normal, o feixe some, a borda fica
 *     inteira. ESTADO FINAL = a foto real (next/image, quality 90), sem máscara
 *     nem filtro. `onRevealed` avisa o fim (a assinatura vem depois).
 * Sem JS / prefers-reduced-motion: foto final, estática, desde o início.
 * A borda é a camada `[data-portrait-outline]` do cartão (TiltCard overlay).
 */

/** Máscara da varredura: preto = foto visível; borda da luz em x (%). */
const sweepMask = (x: number) =>
  `linear-gradient(100deg, #000 ${x - 30}%, rgba(0,0,0,0.6) ${x - 12}%, rgba(0,0,0,0.18) ${x}%, transparent ${x + 14}%)`;

export default function PortraitReveal({
  src,
  alt,
  sizes,
  className = "",
  shape,
  onRevealed,
}: {
  src: string;
  alt: string;
  sizes: string;
  className?: string;
  /** Recorte da moldura (máscara CSS, ver portraitFrame). */
  shape?: CSSProperties;
  /** A foto real está no lugar (fim da entrada ou reduced motion). */
  onRevealed?: () => void;
}) {
  const root = useRef<HTMLDivElement>(null);
  const photo = useRef<HTMLDivElement>(null);
  const beam = useRef<HTMLDivElement>(null);
  /** static: foto visível (reduced motion); light: entrada com luz. null até detectar. */
  const [mode, setMode] = useState<"static" | "light" | null>(null);
  const reported = useRef(false);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- leitura única de capacidades do navegador
    setMode(reduced ? "static" : "light");
  }, []);

  const report = useCallback(() => {
    if (reported.current) return;
    reported.current = true;
    onRevealed?.();
  }, [onRevealed]);

  useEffect(() => {
    if (mode === "static") report();
  }, [mode, report]);

  useGSAP(
    () => {
      if (mode !== "light") return;
      const ph = photo.current!;
      const bm = beam.current!;
      const outline = root.current?.parentElement?.querySelector<SVGElement>("[data-portrait-outline]") ?? null;
      // x: borda da luz (%); lit: refletor ligado (0..1, pisca no começo);
      // exp: exposição/contraste extra (0..1)
      const s = { x: -40, lit: 0, exp: 0 };
      const apply = () => {
        const m = sweepMask(s.x);
        ph.style.maskImage = m;
        ph.style.webkitMaskImage = m;
        ph.style.opacity = String(s.lit);
        ph.style.filter = `brightness(${(1 + 0.3 * s.exp).toFixed(3)}) contrast(${(1 + 0.14 * s.exp).toFixed(3)})`;
        bm.style.setProperty("--bx", `${s.x}%`);
        bm.style.opacity = String(s.lit * (0.35 + 0.65 * s.exp));
      };
      apply();
      if (outline) gsap.set(outline, { opacity: 0.3 });

      const tl = gsap.timeline({
        paused: true,
        onComplete: () => {
          // estado final: a foto real, sem máscara nem filtro
          ph.style.maskImage = "none";
          ph.style.webkitMaskImage = "none";
          ph.style.filter = "none";
          ph.style.opacity = "1";
          bm.style.opacity = "0";
          report();
        },
      });
      // b) o feixe entra pela esquerda piscando (2 piscadas) e firma
      tl.to(s, { x: 10, duration: 0.42, ease: "power1.out", onUpdate: apply }, 0)
        .to(s, {
          keyframes: [
            { lit: 0.85, duration: 0.05 },
            { lit: 0.12, duration: 0.07 },
            { lit: 0.7, duration: 0.05 },
            { lit: 0.2, duration: 0.09 },
            { lit: 1, duration: 0.16 },
          ],
          ease: "none",
          onUpdate: apply,
        }, 0)
        // c) varredura com exposição um pouco acima
        .to(s, { exp: 1, duration: 0.45, ease: "power1.out", onUpdate: apply }, 0.42)
        .to(s, { x: 140, duration: 1.2, ease: "power2.inOut", onUpdate: apply }, 0.42)
        // d) a luz se acomoda
        .to(s, { exp: 0, duration: 0.5, ease: "power2.out", onUpdate: apply }, 1.6);
      if (outline) tl.to(outline, { opacity: 1, duration: 0.6, ease: "power1.out" }, 1.5);

      // revealOnce: gatilho + rede de segurança (a foto nunca fica presa no escuro)
      return revealOnce({ trigger: root.current!, start: "top 78%", play: () => tl.play(), finish: () => tl.progress(1) });
    },
    { scope: root, dependencies: [mode, report], revertOnUpdate: true },
  );

  return (
    // `shape` recorta tudo aqui dentro (foto, feixe e o fundo escuro); a borda
    // fina é desenhada por cima, fora deste recorte (portraitFrame)
    <div ref={root} className={`relative isolate aspect-[4/5] overflow-hidden bg-surface ${className}`} style={shape}>
      <div ref={photo} className="absolute inset-0">
        <Image src={src} alt={alt} fill sizes={sizes} quality={90} className="object-cover" />
      </div>
      {/* feixe de luz: mancha clara suave que acompanha a borda da varredura */}
      <div
        ref={beam}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-0 mix-blend-screen"
        style={{
          backgroundImage:
            "radial-gradient(ellipse 34% 80% at var(--bx, -40%) 42%, rgba(236,234,229,0.32), rgba(236,234,229,0.08) 55%, transparent 75%)",
        }}
      />
    </div>
  );
}

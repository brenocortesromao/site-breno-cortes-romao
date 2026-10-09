"use client";

import { useRef } from "react";
import Image from "next/image";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP, ScrollTrigger);

/** Pico nevado principal (fração da imagem): foco do enquadramento e do zoom. */
const PEAK = "62% 70%";

/**
 * Fundo de montanhas vistas de cima (public/fundo/, já em P&B) para o trecho
 * "O que eu faço" + "O que muda". Deve ser o primeiro filho de um contêiner
 * `relative` que envolve as duas seções: ocupa o contêiner inteiro e mantém a
 * imagem FIXA na tela (sticky) enquanto o trecho rola, atrás do conteúdo.
 * - Tratamento: opacidade ~24%, vinheta escura e degradê para o fundo no topo
 *   e na base; entra e sai em fade (sem corte).
 * - Movimento: "câmera descendo" — escala 1.0 → 1.5 com origem no pico e leve
 *   deslocamento vertical, ligado ao scroll do trecho (transform na GPU).
 * - next/image (AVIF/WebP via otimizador), versão mobile menor.
 * - prefers-reduced-motion: imagem estática (sem zoom nem fade animado).
 */
export default function MountainBackdrop({ alt }: { alt: string }) {
  const root = useRef<HTMLDivElement>(null);
  const layer = useRef<HTMLDivElement>(null);
  const zoom = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const trecho = root.current?.parentElement;
        if (!trecho) return;
        gsap.fromTo(
          zoom.current,
          { scale: 1, yPercent: 0 },
          {
            scale: 1.5,
            yPercent: -4,
            ease: "none",
            // zoom do topo do trecho até o fim de "O que muda" (fundo fixo na tela)
            scrollTrigger: { trigger: trecho, start: "top top", end: "bottom 40%", scrub: 0.8, refreshPriority: -1 },
          },
        );
        // entra em fade quando o trecho chega e sai em fade no fim de "O que muda"
        gsap.fromTo(
          layer.current,
          { opacity: 0 },
          { opacity: 1, ease: "none", scrollTrigger: { trigger: trecho, start: "top bottom", end: "top 30%", scrub: true, refreshPriority: -1 } },
        );
        gsap.to(layer.current, {
          opacity: 0,
          ease: "none",
          immediateRender: false,
          // recalculado DEPOIS do pin dos pilares (que muda a altura do trecho)
          scrollTrigger: { trigger: trecho, start: "bottom 95%", end: "bottom 35%", scrub: true, refreshPriority: -1 },
        });
      });
    },
    { scope: root },
  );

  return (
    <div ref={root} aria-hidden="true" className="pointer-events-none absolute inset-0 z-0">
      <div className="sticky top-0 h-svh overflow-hidden">
        <div ref={layer} className="absolute inset-0">
          <div ref={zoom} className="absolute inset-0 will-change-transform" style={{ transformOrigin: PEAK }}>
            <div className="absolute inset-0 opacity-[0.24]">
              <Image
                src="/fundo/montanhas.webp"
                alt={alt}
                fill
                sizes="100vw"
                className="hidden object-cover md:block"
                style={{ objectPosition: PEAK }}
              />
              <Image
                src="/fundo/montanhas-mobile.webp"
                alt={alt}
                fill
                sizes="100vw"
                className="object-cover md:hidden"
                style={{ objectPosition: PEAK }}
              />
            </div>
          </div>
          {/* vinheta e degradês para o fundo (entrada/saída sem corte) */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_35%,var(--bg)_100%)]" />
          <div className="absolute inset-x-0 top-0 h-1/4 bg-gradient-to-b from-background to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-t from-background to-transparent" />
        </div>
      </div>
    </div>
  );
}

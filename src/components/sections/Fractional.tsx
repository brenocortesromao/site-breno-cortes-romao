"use client";

import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { revealOnce } from "@/lib/reveal";
import GraphicLayer from "@/components/graphics/GraphicLayer";
import { protectTerms } from "@/components/Term";
import FractionalModel, { type FractionalModelCopy } from "./FractionalModel";

gsap.registerPlugin(useGSAP, ScrollTrigger);

export type FractionalCopy = {
  badge: string;
  title: string;
  /** Final do título, em cinza prata. */
  titleMuted: string;
  /** Faixa técnica abaixo do título: rótulo em mono + frase. */
  strip: { label: string; text: string }[];
  /** Parte escura logo abaixo ("O modelo fractional"). */
  model: FractionalModelCopy;
  note: string;
};

/**
 * "O que é fractional", em duas partes:
 * - CLARA (off-white, curvas de nível): selo com ponto que pisca, título leve
 *   com final em prata e faixa técnica de 3 colunas (linha fina em cima,
 *   divisórias de 1px; empilhadas no celular), que entram uma vez ao chegar à
 *   tela;
 * - ESCURA logo abaixo (FractionalModel): esfera de partículas e 6 caixas.
 * Sem JS / reduced motion, tudo visível.
 */
export default function Fractional({ copy }: { copy: FractionalCopy }) {
  const root = useRef<HTMLElement>(null);
  const strip = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const intro = gsap.timeline({ paused: true });
        intro.from("[data-strip-item]", { autoAlpha: 0, y: 28, duration: 0.9, ease: "power3.out", stagger: 0.12 });
        return revealOnce({
          trigger: strip.current!,
          start: "top 80%",
          play: () => intro.play(),
          finish: () => intro.progress(1),
        });
      });
    },
    { scope: root },
  );

  return (
    <>
      <section
        ref={root}
        id="fractional"
        data-theme="light"
        aria-labelledby="fractional-title"
        className="relative z-10 min-h-svh overflow-hidden"
      >
        {/* as curvas somem embaixo e as da parte escura surgem em cima: sem emenda reta */}
        <GraphicLayer variant="contours-a" className="fx-fade-b" />
        <div className="m-sec relative mx-auto w-full max-w-[1600px] px-6 py-[clamp(6rem,16lvh,12rem)] md:px-12">
          <p className="m-center flex w-fit max-w-full items-start gap-2.5 rounded-3xl border border-line bg-white/60 px-4 py-2 font-mono text-[11px] uppercase leading-snug tracking-[0.14em] text-foreground sm:items-center sm:rounded-full">
            <span aria-hidden="true" className="fractional-dot css-loop mt-[0.35em] h-1.5 w-1.5 shrink-0 rounded-full bg-foreground sm:mt-0" />
            <span className="min-w-0 break-words">{protectTerms(copy.badge)}</span>
          </p>

          <h2
            id="fractional-title"
            className="m-center mt-8 max-w-[22ch] text-[clamp(2.3rem,5vw,5.5rem)] font-light leading-[1.02] tracking-[-0.055em] md:mt-10"
          >
            {protectTerms(copy.title)} <span className="text-silver">{copy.titleMuted}</span>
          </h2>

          {/* faixa técnica: linha fina em cima; colunas separadas por linhas de 1px
              (verticais no desktop, horizontais no celular) */}
          <div
            ref={strip}
            className="m-g40 mt-12 grid divide-y divide-line border-t border-line md:mt-16 md:grid-cols-3 md:divide-x md:divide-y-0"
          >
            {copy.strip.map((item) => (
              <div key={item.label} data-strip-item className="py-6 md:px-8 md:py-7 md:first:pl-0 md:last:pr-0">
                <p className="m-center font-mono text-[11px] uppercase tracking-[0.14em] text-silver">{item.label}</p>
                <p className="m-center mt-3 text-[22px] font-light leading-snug tracking-[-0.025em]">{protectTerms(item.text)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <FractionalModel copy={copy.model} note={copy.note} />
    </>
  );
}

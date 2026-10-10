"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import GraphicLayer from "@/components/graphics/GraphicLayer";
import LiquidDrop from "@/components/graphics/LiquidDrop";
import ResilientBoundary from "@/components/ResilientBoundary";
import { useNearViewport } from "@/lib/useNearViewport";

gsap.registerPlugin(useGSAP, ScrollTrigger);

export type ProcessCopy = {
  eyebrow: string;
  title: string;
  steps: { title: string; text: string }[];
  note: string;
};

/**
 * "Como funciona" — seção CLARA com grade técnica. Linha do tempo vertical
 * desenhada pelo scroll (scaleY) e etapas que acendem quando a linha chega
 * nelas. Na coluna esquerda (sticky), uma gota de metal líquido (LiquidDrop)
 * muda de forma a cada etapa: fusão → ondulação → calma → fluxo → anel.
 * Etapas acendem (marcador preenche, texto ganha contraste). Sem JS / reduced
 * motion: linha e etapas completas, e a gota mostra o anel estático.
 */
export default function Process({ copy }: { copy: ProcessCopy }) {
  const root = useRef<HTMLElement>(null);
  const list = useRef<HTMLOListElement>(null);
  /** Etapa atual (0–4) lida pela gota a cada quadro. */
  const stage = useRef(0);
  const [drop, setDrop] = useState<{ light: boolean; reduce: boolean } | null>(null);
  /** A gota só existe com a seção a até ~1 tela (libera o contexto WebGL longe dela). */
  const near = useNearViewport(root);
  const [dropFailed, setDropFailed] = useState(false);
  const handleDropFail = useCallback(() => setDropFailed(true), []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- leitura única de capacidades do navegador
    setDrop({
      light: window.matchMedia("(pointer: coarse)").matches,
      reduce: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    });
  }, []);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.fromTo(
          "[data-process-line]",
          { scaleY: 0 },
          { scaleY: 1, ease: "none", scrollTrigger: { trigger: list.current, start: "top 60%", end: "bottom 60%", scrub: 0.6 } },
        );
        // etapa atual para a gota: a etapa cujo topo passou do meio da tela
        gsap.utils.toArray<HTMLElement>("[data-step]").forEach((step, i) => {
          ScrollTrigger.create({
            trigger: step,
            start: "top 55%",
            end: "bottom 55%",
            onEnter: () => (stage.current = i),
            onEnterBack: () => (stage.current = i),
          });
        });
        gsap.utils.toArray<HTMLElement>("[data-step]").forEach((step) => {
          gsap
            .timeline({ scrollTrigger: { trigger: step, start: "top 62%", end: "top 48%", scrub: 0.5 } })
            .fromTo(step.querySelector("[data-step-dot]"), { scale: 0.4, backgroundColor: "transparent" }, { scale: 1, backgroundColor: "var(--fg)", ease: "none" }, 0)
            .fromTo(step.querySelector("[data-step-body]"), { opacity: 0.25, x: 10 }, { opacity: 1, x: 0, ease: "none" }, 0);
        });
      });
    },
    { scope: root },
  );

  return (
    <section
      ref={root}
      id="como-funciona"
      data-theme="light"
      aria-labelledby="como-funciona-title"
      className="relative z-10 min-h-svh overflow-hidden"
    >
      <GraphicLayer variant="grid" />
      <div className="relative mx-auto w-full max-w-[1600px] px-6 py-[clamp(6rem,16vh,12rem)] md:px-12">
        <div className="grid gap-10 md:grid-cols-12 md:gap-8">
          <div className="md:col-span-5 md:flex md:flex-col">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-silver">{copy.eyebrow}</p>
              <h2
                id="como-funciona-title"
                className="mt-6 text-[clamp(2.3rem,4.6vw,5rem)] font-semibold leading-[0.98] tracking-[-0.055em]"
              >
                {copy.title}
              </h2>
              <p className="mt-8 max-w-md text-sm leading-relaxed text-silver md:text-[15px]">{copy.note}</p>
            </div>
            {/* gota de metal líquido: fixa nesta coluna enquanto as etapas passam
                (desktop); menor, acima da linha do tempo (mobile) */}
            <div className="mt-8 md:sticky md:top-32 md:mt-12">
              {/* o espaço da gota fica reservado mesmo sem o canvas montado */}
              <div className="mx-auto aspect-square w-40 md:mx-0 md:w-[min(100%,40svh,24rem)]">
                {drop && !dropFailed && (
                  <ResilientBoundary onGiveUp={handleDropFail}>
                    {(onLost) =>
                      near && (
                        <LiquidDrop
                          stageRef={stage}
                          light={drop.light}
                          reduceMotion={drop.reduce}
                          onLost={onLost}
                          className="h-full w-full"
                        />
                      )
                    }
                  </ResilientBoundary>
                )}
              </div>
            </div>
          </div>

          <ol ref={list} className="relative md:col-span-6 md:col-start-7">
            {/* trilho + linha desenhada */}
            <span aria-hidden="true" className="absolute bottom-2 left-[11px] top-2 w-px bg-line" />
            <span
              data-process-line
              aria-hidden="true"
              className="absolute bottom-2 left-[11px] top-2 w-px origin-top bg-foreground"
            />
            {copy.steps.map((step, i) => (
              <li key={step.title} data-step className="relative grid grid-cols-[2.5rem_1fr] gap-5 pb-14 last:pb-0 md:pb-20">
                <span
                  data-step-dot
                  aria-hidden="true"
                  className="relative z-10 mt-1.5 h-6 w-6 rounded-full border border-foreground bg-foreground"
                />
                <div data-step-body>
                  <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-silver">
                    {String(i + 1).padStart(2, "0")}
                  </p>
                  <h3 className="mt-2 text-[clamp(1.6rem,2.6vw,2.6rem)] font-semibold tracking-[-0.045em]">{step.title}</h3>
                  <p className="mt-3 max-w-md text-base leading-relaxed text-silver">{step.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

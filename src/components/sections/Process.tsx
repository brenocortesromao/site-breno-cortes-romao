"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import GraphicLayer from "@/components/graphics/GraphicLayer";
import LiquidDrop from "@/components/graphics/LiquidDrop";
import ResilientBoundary from "@/components/ResilientBoundary";
import { presetFor, useSceneMonitor, useTier, useWebglSlot } from "@/lib/quality";
import { webglSupport } from "@/lib/webgl";

gsap.registerPlugin(useGSAP, ScrollTrigger);

export type ProcessCopy = {
  eyebrow: string;
  title: string;
  /** phase: rótulo de fase em mono (nunca prazo); title: "\n" = quebra de linha controlada; text: história. */
  steps: { phase: string; title: string; text: string }[];
  note: string;
};

/**
 * "Como funciona": seção PRETA com grade técnica (linhas finas claras, baixa opacidade). Linha do tempo vertical
 * desenhada pelo scroll (scaleY) e etapas que acendem quando a linha chega
 * nelas. Na coluna esquerda (sticky), uma gota de metal líquido (LiquidDrop)
 * muda de forma a cada etapa: fusão → ondulação → calma → fluxo → anel.
 * Cada etapa (6): número + FASE (mono), título e história; a história acende
 * junto do ponto da linha. Depois do ponto 06 (parceria),
 * a linha segue em pontilhado para baixo, sem ponto final e sumindo
 * (continuidade); a gota termina como um anel girando.
 * Sem JS / reduced motion: linha e etapas completas, e a gota mostra o anel estático.
 */
export default function Process({ copy }: { copy: ProcessCopy }) {
  const root = useRef<HTMLElement>(null);
  const list = useRef<HTMLOListElement>(null);
  /** Etapa atual (0–5) lida pela gota a cada quadro. */
  const stage = useRef(0);
  const [drop, setDrop] = useState<{ light: boolean; reduce: boolean; webgl: boolean } | null>(null);
  /** A gota só existe com a seção perto da tela e com vaga no orçamento de contextos. */
  const near = useWebglSlot(root);
  const tier = useTier();
  const [dropFailed, setDropFailed] = useState(false);
  const handleDropFail = useCallback(() => setDropFailed(true), []);
  useSceneMonitor(!!drop?.webgl && !dropFailed && near);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- leitura única de capacidades do navegador
    setDrop({
      light: window.matchMedia("(pointer: coarse)").matches,
      reduce: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      // sem WebGL2 ou renderizador por software: sem gota (o espaço fica reservado)
      webgl: webglSupport().webgl2,
    });
  }, []);

  // altura abaixo do ponto 06, para a linha sólida terminar nele
  useEffect(() => {
    const ol = list.current;
    const last = ol?.lastElementChild as HTMLElement | null;
    if (!ol || !last) return;
    const ro = new ResizeObserver(() => {
      const dot = last.querySelector<HTMLElement>("[data-step-dot]");
      const dotCenter = dot ? dot.offsetTop + dot.offsetHeight / 2 : 18;
      ol.style.setProperty("--tail", `${ol.offsetHeight - (last.offsetTop + dotCenter)}px`);
    });
    ro.observe(ol);
    return () => ro.disconnect();
  }, []);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        // a linha sólida termina no ponto 06: completa quando ele acende
        const lastDot = list.current?.lastElementChild?.querySelector("[data-step-dot]");
        gsap.fromTo(
          "[data-process-line]",
          { scaleY: 0 },
          {
            scaleY: 1,
            ease: "none",
            scrollTrigger: { trigger: list.current, start: "top 60%", endTrigger: lastDot, end: "center 50%", scrub: 0.6 },
          },
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
      data-theme="dark"
      aria-labelledby="como-funciona-title"
      // overflow-clip (e não hidden): recorta igual, mas não cria contêiner de
      // rolagem, que anularia o sticky da gota
      className="relative z-10 min-h-svh overflow-clip"
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
                {drop?.webgl && !dropFailed && (
                  <ResilientBoundary name="gota" onGiveUp={handleDropFail}>
                    {(onLost) =>
                      near && (
                        <LiquidDrop
                          stageRef={stage}
                          light={drop.light || tier === "low"}
                          maxDpr={presetFor(tier).maxDpr}
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

          <ol ref={list} className="relative pb-40 md:col-span-6 md:col-start-7">
            {/* trilho + linha desenhada: sólidos até o ponto 06 (--tail = altura
                da última etapa abaixo do ponto + o respiro final) */}
            <span aria-hidden="true" className="absolute bottom-[var(--tail,10rem)] left-[11px] top-2 w-px bg-line" />
            <span
              data-process-line
              aria-hidden="true"
              className="absolute bottom-[var(--tail,10rem)] left-[11px] top-2 w-px origin-top bg-foreground"
            />
            {/* depois do ponto 06: pontilhado para baixo, sem ponto final, sumindo */}
            <span
              aria-hidden="true"
              className="absolute bottom-0 left-[11px] h-[var(--tail,10rem)] w-px bg-[repeating-linear-gradient(to_bottom,var(--fg)_0_2px,transparent_2px_8px)] [mask-image:linear-gradient(to_bottom,#000_45%,transparent)]"
            />
            {copy.steps.map((step, i) => (
              <li key={step.title} data-step className="relative grid grid-cols-[2.5rem_1fr] gap-5 pb-14 last:pb-0 md:pb-20">
                <span
                  data-step-dot
                  aria-hidden="true"
                  className="relative z-10 mt-1.5 h-6 w-6 rounded-full border border-foreground bg-foreground"
                />
                <div data-step-body>
                  <p className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.22em] text-silver">
                    <span>{String(i + 1).padStart(2, "0")}</span>
                    <span aria-hidden="true" className="h-px w-6 bg-line" />
                    <span>{step.phase}</span>
                  </p>
                  <h3 className="mt-2 text-[clamp(1.6rem,2.6vw,2.6rem)] font-semibold leading-[1.08] tracking-[-0.045em]">
                    {/* "\n" no título = quebra controlada: a parte seguinte sempre
                        começa numa linha nova (a anterior pode quebrar sozinha) */}
                    {step.title.split("\n").map((part, k, all) => (
                      <span key={k} className={k ? "block" : undefined}>
                        {/* espaço no fim da linha: o texto indexado não cola as partes */}
                        {k < all.length - 1 ? `${part} ` : part}
                      </span>
                    ))}
                  </h3>
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

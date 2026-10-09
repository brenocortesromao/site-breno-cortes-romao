"use client";

import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import GraphicLayer from "@/components/graphics/GraphicLayer";

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
 * nelas (marcador preenche, texto ganha contraste). Sem JS / reduced motion:
 * linha e etapas completas.
 */
export default function Process({ copy }: { copy: ProcessCopy }) {
  const root = useRef<HTMLElement>(null);
  const list = useRef<HTMLOListElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.fromTo(
          "[data-process-line]",
          { scaleY: 0 },
          { scaleY: 1, ease: "none", scrollTrigger: { trigger: list.current, start: "top 60%", end: "bottom 60%", scrub: 0.6 } },
        );
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
          <div className="md:col-span-5">
            <div className="md:sticky md:top-32">
              <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-silver">{copy.eyebrow}</p>
              <h2
                id="como-funciona-title"
                className="mt-6 text-[clamp(2.3rem,4.6vw,5rem)] font-semibold leading-[0.98] tracking-[-0.055em]"
              >
                {copy.title}
              </h2>
              <p className="mt-8 max-w-md text-sm leading-relaxed text-silver md:text-[15px]">{copy.note}</p>
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

"use client";

import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP, ScrollTrigger);

export type ChangesCopy = {
  eyebrow: string;
  title: string;
  before: string;
  after: string;
  rows: { before: string; after: string }[];
};

/**
 * "O que muda" — antes/depois. Modo animado (data-mode="flip", sem reduced
 * motion): cada linha mostra o "antes" e VIRA para o "depois" ao cruzar o meio
 * da tela (o antes sobe e some, o depois entra por baixo, numa máscara).
 * Sem JS / reduced motion: as duas colunas aparecem lado a lado.
 * Os dois textos estão sempre no HTML (leitura e indexação).
 */
export default function Changes({ copy }: { copy: ChangesCopy }) {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const section = root.current!;
        section.dataset.mode = "flip";
        gsap.utils.toArray<HTMLElement>("[data-change-row]").forEach((row) => {
          gsap
            .timeline({ scrollTrigger: { trigger: row, start: "top 62%", end: "top 38%", scrub: 0.6 } })
            .fromTo(row.querySelector("[data-before]"), { yPercent: 0, opacity: 1 }, { yPercent: -110, opacity: 0, ease: "power2.in" }, 0)
            .fromTo(row.querySelector("[data-after]"), { yPercent: 110, opacity: 0 }, { yPercent: 0, opacity: 1, ease: "power2.out" }, 0.15)
            .fromTo(row.querySelector("[data-state]"), { "--p": 0 }, { "--p": 1, ease: "none" }, 0);
        });
        return () => {
          delete section.dataset.mode;
        };
      });
    },
    { scope: root },
  );

  return (
    <section ref={root} id="o-que-muda" data-theme="dark" aria-labelledby="o-que-muda-title" className="group relative z-10 min-h-svh">
      <div className="mx-auto w-full max-w-[1600px] px-6 py-[clamp(6rem,16vh,12rem)] md:px-12">
        <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-silver">{copy.eyebrow}</p>
        <h2
          id="o-que-muda-title"
          className="mt-6 max-w-4xl text-[clamp(2.3rem,5vw,5.5rem)] font-semibold leading-[0.98] tracking-[-0.055em]"
        >
          {copy.title}
        </h2>

        {/* cabeçalho das colunas (só no modo estático) */}
        <div className="mt-16 hidden grid-cols-12 gap-8 font-mono text-[11px] uppercase tracking-[0.22em] text-silver md:grid group-data-[mode=flip]:md:hidden">
          <span className="col-span-5 col-start-2">{copy.before}</span>
          <span className="col-span-5 col-start-8">{copy.after}</span>
        </div>

        <ol className="mt-10 border-t border-line md:mt-6">
          {copy.rows.map((row, i) => (
            <li key={i} data-change-row className="grid gap-4 border-b border-line py-8 md:grid-cols-12 md:gap-8 md:py-12">
              <span className="font-mono text-xs text-silver md:col-span-1">{String(i + 1).padStart(2, "0")}</span>

              {/* indicador antes → depois (só no modo animado) */}
              <span
                data-state
                aria-hidden="true"
                className="hidden font-mono text-[10px] uppercase tracking-[0.22em] text-silver group-data-[mode=flip]:block md:col-span-2"
                style={{ ["--p" as string]: 0 }}
              >
                <span className="relative inline-block overflow-hidden">
                  <span className="block">{copy.before}</span>
                  <span className="block h-px w-full origin-left bg-foreground [transform:scaleX(var(--p))]" />
                </span>
                <span className="mx-2">→</span>
                {copy.after}
              </span>

              <div className="grid gap-3 md:col-span-10 md:grid-cols-2 md:gap-8 group-data-[mode=flip]:grid-cols-1 group-data-[mode=flip]:gap-0 group-data-[mode=flip]:overflow-hidden group-data-[mode=flip]:md:col-span-9 group-data-[mode=flip]:md:grid-cols-1 group-data-[mode=flip]:md:gap-0">
                <p
                  data-before
                  className="text-[clamp(1.2rem,2.2vw,2.1rem)] font-light leading-[1.2] tracking-[-0.03em] text-silver line-through decoration-1 group-data-[mode=flip]:no-underline group-data-[mode=flip]:[grid-area:1/1]"
                >
                  <span className="sr-only">{copy.before}: </span>
                  {row.before}
                </p>
                <p
                  data-after
                  className="text-[clamp(1.2rem,2.2vw,2.1rem)] font-semibold leading-[1.2] tracking-[-0.03em] group-data-[mode=flip]:[grid-area:1/1]"
                >
                  <span className="sr-only">{copy.after}: </span>
                  {row.after}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

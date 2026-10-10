"use client";

import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP, ScrollTrigger);

export type PillarsCopy = {
  eyebrow: string;
  title: string;
  subtitle: string;
  items: { title: string; text: string }[];
};

/**
 * "O que eu faço" — 4 pilares.
 * Desktop sem reduced motion: o palco fica fixo (pin) por N telas e os pilares
 * trocam com o scroll — título sobe por máscara, texto cruza, índice e barra
 * de progresso acompanham. O modo é ligado por `data-mode="pin"` no <section>
 * (classes `group-data-[mode=pin]:*`).
 * Mobile / reduced motion / sem JS: os pilares ficam empilhados, sem pin.
 */
export default function Pillars({ copy }: { copy: PillarsCopy }) {
  const root = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const n = copy.items.length;

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(min-width: 768px) and (prefers-reduced-motion: no-preference)", () => {
        const section = root.current!;
        section.dataset.mode = "pin";

        const titles = gsap.utils.toArray<HTMLElement>("[data-pillar-title]");
        const texts = gsap.utils.toArray<HTMLElement>("[data-pillar-text]");
        const indexes = gsap.utils.toArray<HTMLElement>("[data-pillar-index]");
        gsap.set(titles.slice(1), { yPercent: 110 });
        gsap.set([...texts.slice(1), ...indexes.slice(1)], { autoAlpha: 0, y: 24 });

        const tl = gsap.timeline({
          defaults: { ease: "power2.inOut", duration: 1 },
          scrollTrigger: {
            trigger: stage.current,
            start: "top top",
            end: `+=${(n - 1) * 100}%`,
            pin: true,
            scrub: 0.8,
            anticipatePin: 1,
          },
        });
        tl.fromTo("[data-pillar-progress]", { scaleX: 1 / n }, { scaleX: 1, ease: "none", duration: n - 1 }, 0);
        for (let i = 1; i < n; i++) {
          const at = i - 1 + 0.15; // pequena pausa em cada pilar antes da troca
          tl.to(titles[i - 1], { yPercent: -110, duration: 0.7 }, at)
            .to(titles[i], { yPercent: 0, duration: 0.7 }, at)
            .to([texts[i - 1], indexes[i - 1]], { autoAlpha: 0, y: -24, duration: 0.5 }, at)
            .to([texts[i], indexes[i]], { autoAlpha: 1, y: 0, duration: 0.5 }, at + 0.2);
        }

        return () => {
          delete section.dataset.mode;
        };
      });
    },
    { scope: root },
  );

  return (
    <section ref={root} id="o-que-faco" data-theme="dark" aria-labelledby="o-que-faco-title" className="group relative z-10">
      <div
        ref={stage}
        className="mx-auto flex w-full max-w-[1600px] flex-col px-6 py-[clamp(6rem,16vh,12rem)] md:px-12 group-data-[mode=pin]:h-svh group-data-[mode=pin]:py-[clamp(5rem,12vh,9rem)]"
      >
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-silver">
              {copy.eyebrow}
            </p>
            <h2 id="o-que-faco-title" className="mt-6 max-w-3xl text-[clamp(2rem,3.6vw,3.75rem)] font-semibold leading-[1.02] tracking-[-0.05em]">
              {copy.title}
            </h2>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-silver md:text-lg">{copy.subtitle}</p>
          </div>
          {/* Progresso (só no modo fixo) */}
          <div aria-hidden="true" className="hidden w-48 group-data-[mode=pin]:block">
            <div className="h-px w-full bg-line">
              <div data-pillar-progress className="h-px w-full origin-left bg-foreground" />
            </div>
          </div>
        </div>

        <ol className="mt-16 grid gap-16 md:mt-20 group-data-[mode=pin]:relative group-data-[mode=pin]:mt-0 group-data-[mode=pin]:flex-1 group-data-[mode=pin]:gap-0">
          {copy.items.map((item, i) => (
            <li
              key={item.title}
              className="grid gap-6 border-t border-line pt-8 md:grid-cols-12 md:gap-8 group-data-[mode=pin]:absolute group-data-[mode=pin]:inset-0 group-data-[mode=pin]:items-center group-data-[mode=pin]:border-t-0 group-data-[mode=pin]:pt-0"
            >
              <span
                data-pillar-index
                className="font-mono text-xs text-silver md:col-span-2 group-data-[mode=pin]:text-sm"
              >
                {String(i + 1).padStart(2, "0")} / {String(n).padStart(2, "0")}
              </span>
              <h3 className="overflow-hidden pb-[0.12em] md:col-span-6">
                <span
                  data-pillar-title
                  // escala limitada pela palavra mais longa ("Acompanhamento", ~7,9em) na
                  // coluna de 6/12; o teto de 5.5rem vale a partir do contêiner de 1600px,
                  // onde a coluna para de crescer (com 6rem o "o" final era cortado)
                  className="block text-[clamp(2.3rem,4.9vw,5.5rem)] font-semibold leading-[0.95] tracking-[-0.06em] text-silver-gradient"
                >
                  {item.title}
                </span>
              </h3>
              <p
                data-pillar-text
                className="max-w-md text-base leading-relaxed text-silver md:col-span-4 md:text-lg"
              >
                {item.text}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

"use client";

import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import SprayTitle from "@/components/SprayTitle";

gsap.registerPlugin(useGSAP, ScrollTrigger);

export type TouchpointsCopy = { eyebrow: string; title: string; items: string[] };

/**
 * "Onde o trabalho aparece" — lista grande. Cada item sobe de dentro de uma
 * máscara quando entra na tela (scrub); no hover, o item avança e os demais
 * recuam em contraste. O título entra "pintado com spray" (SprayTitle).
 * Sem JS / reduced motion: título e lista estáticos e completos.
 */
export default function Touchpoints({ copy }: { copy: TouchpointsCopy }) {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.utils.toArray<HTMLElement>("[data-tp-line]").forEach((line) => {
          gsap.fromTo(
            line,
            { yPercent: 110 },
            {
              yPercent: 0,
              ease: "none",
              scrollTrigger: { trigger: line.parentElement, start: "top 92%", end: "top 70%", scrub: 0.6 },
            },
          );
        });
      });
      // toque (sem hover): o item que passa pelo meio da tela acende, como no
      // hover do desktop (avança e os demais recuam em contraste)
      mm.add("(hover: none)", () => {
        const list = root.current?.querySelector("ul");
        const items = gsap.utils.toArray<HTMLElement>("[data-tp-item]");
        const set = (on: HTMLElement | null) => {
          items.forEach((it) => (it === on ? (it.dataset.active = "") : delete it.dataset.active));
          if (!list) return;
          if (on) list.dataset.active = "";
          else delete list.dataset.active;
        };
        items.forEach((item) =>
          ScrollTrigger.create({
            trigger: item,
            start: "top 55%",
            end: "bottom 45%",
            onToggle: (self) => {
              if (self.isActive) set(item);
              else if (item.dataset.active !== undefined) set(null);
            },
          }),
        );
        return () => set(null);
      });
    },
    { scope: root },
  );

  return (
    <section ref={root} id="onde-aparece" data-theme="dark" aria-labelledby="onde-aparece-title" className="relative z-10 min-h-svh">
      <div className="mx-auto w-full max-w-[1600px] px-6 py-[clamp(6rem,16vh,12rem)] md:px-12">
        <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-silver m-center">{copy.eyebrow}</p>
        <SprayTitle
          id="onde-aparece-title"
          wrapClassName="mt-6 max-w-4xl"
          className="m-center text-[clamp(2.3rem,5vw,5.5rem)] font-semibold leading-[0.98] tracking-[-0.055em]"
        >
          {copy.title}
        </SprayTitle>

        <ul className="group/list mt-16 border-t border-line md:mt-24">
          {copy.items.map((item, i) => (
            <li key={item} data-tp-item className="group/item border-b border-line">
              <div className="grid grid-cols-[2.5rem_1fr] items-baseline gap-4 py-5 md:grid-cols-[4rem_1fr] md:py-7">
                <span className="font-mono text-xs text-silver">{String(i + 1).padStart(2, "0")}</span>
                <span className="block overflow-hidden pb-[0.1em] transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover/item:translate-x-3 group-data-[active]/item:translate-x-3">
                  <span
                    data-tp-line
                    className="block text-[clamp(1.9rem,5.2vw,5.5rem)] font-semibold leading-[1] tracking-[-0.055em] transition-colors duration-500 group-hover/list:text-silver group-hover/item:!text-foreground group-data-[active]/list:text-silver group-data-[active]/item:!text-foreground"
                  >
                    {item}
                  </span>
                </span>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

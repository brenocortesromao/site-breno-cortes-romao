"use client";

import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP, ScrollTrigger);

export type SignalsCopy = {
  eyebrow: string;
  title: string;
  items: string[];
  closing: string;
};

/**
 * "Quando você precisa de mim": lista que acende item a item. Cada sinal
 * começa apagado e acende (opacidade + leve avanço) quando cruza o meio da
 * tela, e permanece aceso. Com prefers-reduced-motion, todos já acesos.
 */
export default function Signals({ copy }: { copy: SignalsCopy }) {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.utils.toArray<HTMLElement>("[data-signal]").forEach((item) => {
          gsap.fromTo(
            item,
            { opacity: 0.14, x: -12 },
            {
              opacity: 1,
              x: 0,
              ease: "none",
              scrollTrigger: { trigger: item, start: "top 78%", end: "top 52%", scrub: 0.6 },
            },
          );
        });
        gsap.from("[data-signals-closing]", {
          autoAlpha: 0,
          y: 20,
          duration: 1,
          ease: "power3.out",
          scrollTrigger: { trigger: "[data-signals-closing]", start: "top 85%" },
        });
      });
    },
    { scope: root },
  );

  return (
    <section ref={root} id="sinais" data-theme="dark" className="relative z-10 min-h-svh">
      <div className="mx-auto w-full max-w-[1600px] px-6 py-[clamp(6rem,16vh,12rem)] md:px-12">
        <div className="grid gap-10 md:grid-cols-12 md:gap-8">
          <div className="md:col-span-4">
            <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-silver">
              {copy.eyebrow}
            </p>
            <h2 className="mt-6 text-[clamp(2.1rem,4vw,4.25rem)] font-semibold leading-[1.02] tracking-[-0.05em] md:sticky md:top-32">
              {copy.title}
            </h2>
          </div>

          <ol className="md:col-span-7 md:col-start-6">
            {copy.items.map((item, i) => (
              <li
                key={i}
                data-signal
                className="grid grid-cols-[3rem_1fr] gap-4 border-t border-line py-8 md:grid-cols-[4rem_1fr] md:py-12"
              >
                <span className="pt-2 font-mono text-xs text-silver">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <p className="text-[clamp(1.4rem,2.6vw,2.6rem)] font-light leading-[1.15] tracking-[-0.035em]">
                  {item}
                </p>
              </li>
            ))}
          </ol>
        </div>

        <p
          data-signals-closing
          className="mt-16 max-w-2xl text-base leading-relaxed text-silver md:ml-[calc(41.666%+1rem)] md:mt-24 md:text-lg"
        >
          {copy.closing}
        </p>
      </div>
    </section>
  );
}

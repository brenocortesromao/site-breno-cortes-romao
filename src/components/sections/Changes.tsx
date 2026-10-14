"use client";

import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { isMobileUI } from "@/lib/mobile";
import { playOnce } from "@/lib/reveal";

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
        // celular (modo curado): sem scrub; cada linha troca uma vez ao aparecer
        const mobile = isMobileUI();
        const stops: (() => void)[] = [];
        gsap.utils.toArray<HTMLElement>("[data-change-row]").forEach((row) => {
          const q = (sel: string) => row.querySelector<HTMLElement>(sel)!;
          const tabBefore = q("[data-tab-before]");
          const tabAfter = q("[data-tab-after]");
          // posição/largura do sublinhado sob cada rótulo (recalculadas no refresh)
          const under = (el: HTMLElement) => ({ x: el.offsetLeft, width: el.offsetWidth });

          const tl = gsap
            .timeline({
              defaults: { ease: "power2.inOut" },
              scrollTrigger: mobile ? undefined : { trigger: row, start: "top 62%", end: "top 38%", scrub: 0.6, invalidateOnRefresh: true },
            })
            // frases: "antes" (grafite) sai por cima; "depois" (branco + brilho) entra por baixo
            .fromTo(q("[data-before]"), { yPercent: 0, opacity: 1 }, { yPercent: -110, opacity: 0, ease: "power2.in", duration: 0.5 }, 0)
            .fromTo(q("[data-after]"), { yPercent: 110, opacity: 0 }, { yPercent: 0, opacity: 1, ease: "power2.out", duration: 0.55 }, 0.3)
            // indicador de aba: o sublinhado DESLIZA de ANTES para DEPOIS
            .fromTo(q("[data-tab-line]"), { x: () => under(tabBefore).x, width: () => under(tabBefore).width }, { x: () => under(tabAfter).x, width: () => under(tabAfter).width, duration: 0.4 }, 0.3)
            // rótulos: ANTES esmaece para grafite; DEPOIS acende (mais peso, branco)
            .to(q("[data-tab-before-on]"), { opacity: 0, duration: 0.3 }, 0.3)
            .fromTo(q("[data-tab-after-on]"), { opacity: 0 }, { opacity: 1, duration: 0.3 }, 0.4)
            // seta: leve impulso para a direita no momento da troca
            .to(q("[data-tab-arrow]"), { keyframes: [{ x: 7, duration: 0.18, ease: "power2.out" }, { x: 2, duration: 0.25, ease: "power2.inOut" }] }, 0.32);
          if (mobile) stops.push(playOnce(tl, row, { start: "top 65%", duration: 0.9, ease: "none" }));
        });
        return () => {
          stops.forEach((stop) => stop());
          delete section.dataset.mode;
        };
      });
    },
    { scope: root },
  );

  return (
    <section ref={root} id="o-que-muda" data-theme="gradient" aria-labelledby="o-que-muda-title" className="group relative z-10 min-h-svh">
      <div className="m-sec mx-auto w-full max-w-[1600px] px-6 py-[clamp(6rem,16lvh,12rem)] md:px-12">
        <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-silver m-center">{copy.eyebrow}</p>
        <h2
          id="o-que-muda-title"
          className="m-center m-g16 mt-6 max-w-4xl text-[clamp(2.3rem,5vw,5.5rem)] font-semibold leading-[0.98] tracking-[-0.055em]"
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

              {/* Indicador de aba antes → depois (só no modo animado). Cada rótulo tem
                  duas camadas sobrepostas (apagada / acesa) para trocar cor e peso
                  sem mudar a largura; o sublinhado único desliza entre eles. */}
              <span
                data-state
                aria-hidden="true"
                className="relative hidden h-fit items-center gap-2 pb-2 font-mono text-[10px] uppercase tracking-[0.22em] group-data-[mode=flip]:inline-flex md:col-span-2"
              >
                <span data-tab-before className="grid">
                  <span className="[grid-area:1/1] font-semibold text-silver opacity-45">{copy.before}</span>
                  <span data-tab-before-on className="[grid-area:1/1] font-semibold text-foreground">{copy.before}</span>
                </span>
                <span data-tab-arrow className="inline-block text-silver">→</span>
                <span data-tab-after className="grid">
                  <span className="[grid-area:1/1] font-semibold text-silver opacity-45">{copy.after}</span>
                  <span data-tab-after-on className="[grid-area:1/1] font-bold text-foreground opacity-0 [text-shadow:0_0_12px_rgba(225,228,233,0.45)]">
                    {copy.after}
                  </span>
                </span>
                <span data-tab-line className="absolute bottom-0 left-0 h-px w-8 bg-foreground" />
              </span>

              <div className="grid gap-3 md:col-span-10 md:grid-cols-2 md:gap-8 group-data-[mode=flip]:grid-cols-1 group-data-[mode=flip]:gap-0 group-data-[mode=flip]:overflow-hidden group-data-[mode=flip]:md:col-span-9 group-data-[mode=flip]:md:grid-cols-1 group-data-[mode=flip]:md:gap-0">
                <p
                  data-before
                  className="text-[clamp(1.2rem,2.2vw,2.1rem)] font-light leading-[1.2] tracking-[-0.03em] text-silver opacity-60 line-through decoration-1 group-data-[mode=flip]:no-underline group-data-[mode=flip]:[grid-area:1/1]"
                >
                  <span className="sr-only">{copy.before}: </span>
                  {row.before}
                </p>
                <p
                  data-after
                  className="text-[clamp(1.2rem,2.2vw,2.1rem)] font-semibold leading-[1.2] tracking-[-0.03em] group-data-[mode=flip]:[grid-area:1/1]"
                >
                  <span className="text-silver-gradient [filter:drop-shadow(0_0_14px_rgba(222,226,232,0.28))]">
                  <span className="sr-only">{copy.after}: </span>
                  {row.after}
                  </span>
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

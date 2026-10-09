"use client";

import { useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP, ScrollTrigger);

export type DiagnosticCopy = {
  eyebrow: string;
  title: string;
  hint: string;
  /** Já formatado para cada contagem possível: índice = número de marcadas. */
  counters: string[];
  items: string[];
  /** Fecho padrão (sem interação ou com menos de 2 marcadas). */
  closing: string;
  /** Fecho com 2 ou mais marcadas. */
  closingMatched: string;
  cta: string;
};

/**
 * Diagnóstico: frases na voz do fundador, marcáveis (clique, toque ou teclado:
 * são <button aria-pressed>). Contador "x de N" e fecho que muda com 2+
 * marcadas, revelando o botão para o contato. Sem JS/sem interação, o texto
 * padrão completo já está no HTML.
 * Movimento: as frases acendem ao cruzar o meio da tela (sem reduced motion).
 */
export default function Diagnostic({ copy, ctaHref }: { copy: DiagnosticCopy; ctaHref: string }) {
  const root = useRef<HTMLElement>(null);
  const [marked, setMarked] = useState<boolean[]>(() => copy.items.map(() => false));
  const count = marked.filter(Boolean).length;
  const matched = count >= 2;

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.utils.toArray<HTMLElement>("[data-diag-item]").forEach((item) => {
          gsap.fromTo(
            item,
            { opacity: 0.18, x: -12 },
            {
              opacity: 1,
              x: 0,
              ease: "none",
              scrollTrigger: { trigger: item, start: "top 80%", end: "top 55%", scrub: 0.6 },
            },
          );
        });
      });
    },
    { scope: root },
  );

  const toggle = (i: number) => setMarked((m) => m.map((v, j) => (j === i ? !v : v)));

  return (
    <section
      ref={root}
      id="diagnostico"
      data-theme="dark"
      aria-labelledby="diagnostico-title"
      className="relative z-10 min-h-svh"
    >
      <div className="mx-auto w-full max-w-[1600px] px-6 py-[clamp(6rem,16vh,12rem)] md:px-12">
        <div className="grid gap-10 md:grid-cols-12 md:gap-8">
          <div className="md:col-span-4">
            <div className="md:sticky md:top-32">
              <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-silver">{copy.eyebrow}</p>
              <h2
                id="diagnostico-title"
                className="mt-6 text-[clamp(2.1rem,4vw,4.25rem)] font-semibold leading-[1.02] tracking-[-0.05em]"
              >
                {copy.title}
              </h2>
              <p className="mt-6 max-w-xs text-sm leading-relaxed text-silver">{copy.hint}</p>
              <p aria-live="polite" className="mt-6 font-mono text-[11px] uppercase tracking-[0.22em]">
                {copy.counters[count]}
              </p>
            </div>
          </div>

          <ul className="md:col-span-7 md:col-start-6">
            {copy.items.map((item, i) => (
              <li key={i} data-diag-item className="border-t border-line">
                <button
                  type="button"
                  aria-pressed={marked[i]}
                  onClick={() => toggle(i)}
                  className="group grid w-full grid-cols-[2.5rem_1fr] items-start gap-4 py-7 text-left outline-none focus-visible:ring-1 focus-visible:ring-foreground md:grid-cols-[3.5rem_1fr] md:py-10"
                >
                  {/* marcador: anel vazio → preenchido em prata */}
                  <span
                    aria-hidden="true"
                    className={`mt-2 grid h-6 w-6 place-items-center rounded-full border transition-all duration-500 md:h-7 md:w-7 ${
                      marked[i]
                        ? "border-foreground bg-foreground text-background"
                        : "border-line text-transparent group-hover:border-silver"
                    }`}
                  >
                    <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 8.5 6.5 12 13 4.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  <span
                    className={`text-[clamp(1.35rem,2.5vw,2.5rem)] leading-[1.15] tracking-[-0.035em] transition-colors duration-500 ${
                      marked[i] ? "font-normal text-foreground" : "font-light text-silver group-hover:text-foreground"
                    }`}
                  >
                    {item}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div aria-live="polite" className="mt-16 md:ml-[calc(41.666%+1rem)] md:mt-24">
          <p
            key={matched ? "m" : "d"}
            className="max-w-2xl animate-[fadeIn_0.6s_ease] text-[clamp(1.5rem,2.6vw,2.6rem)] font-semibold leading-[1.1] tracking-[-0.04em]"
          >
            {matched ? copy.closingMatched : copy.closing}
          </p>
          {matched && (
            <a
              href={ctaHref}
              className="mt-8 inline-flex animate-[fadeIn_0.6s_ease] items-center gap-3 border border-foreground px-6 py-4 font-mono text-[11px] uppercase tracking-[0.24em] transition-colors hover:bg-foreground hover:text-background"
            >
              {copy.cta} <span aria-hidden="true">→</span>
            </a>
          )}
        </div>
      </div>
    </section>
  );
}

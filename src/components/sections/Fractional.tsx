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
  cards: { title: string; text: string }[];
  /** Parte escura logo abaixo ("O modelo fractional"). */
  model: FractionalModelCopy;
  note: string;
};

/** Ícones de traço fino dos três cartões (24 × 24, traço de 1.25). */
const ICONS = [
  // pessoa
  <>
    <circle cx="12" cy="8" r="3.5" />
    <path d="M4.5 20c.8-4 3.9-6 7.5-6s6.7 2 7.5 6" />
  </>,
  // calendário
  <>
    <rect x="3.5" y="5" width="17" height="15" rx="1.5" />
    <path d="M3.5 10h17M8 3v4M16 3v4" />
  </>,
  // linha de crescimento previsível
  <>
    <path d="M3.5 20.5h17M3.5 20.5V4" />
    <path d="M7 16l4-4 3 2.5 5-6.5" />
    <path d="M16 8h3v3" />
  </>,
];

/** Marcas de canto: superior esquerda e inferior direita. */
function CornerMarks() {
  return (
    <>
      <span aria-hidden="true" className="pointer-events-none absolute -left-px -top-px h-2.5 w-2.5 border-l border-t border-foreground" />
      <span aria-hidden="true" className="pointer-events-none absolute -bottom-px -right-px h-2.5 w-2.5 border-b border-r border-foreground" />
    </>
  );
}

/**
 * "O que é fractional", em duas partes:
 * - CLARA (off-white, curvas de nível): selo com ponto que pisca, título leve
 *   com final em prata e três cartões (marcas de canto, ícone de traço fino),
 *   que entram uma vez ao chegar à tela;
 * - ESCURA logo abaixo (FractionalModel): esfera de partículas e 6 caixas.
 * Sem JS / reduced motion, tudo visível.
 */
export default function Fractional({ copy }: { copy: FractionalCopy }) {
  const root = useRef<HTMLElement>(null);
  const cards = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const intro = gsap.timeline({ paused: true });
        intro.from("[data-card]", { autoAlpha: 0, y: 28, duration: 0.9, ease: "power3.out", stagger: 0.12 });
        return revealOnce({
          trigger: cards.current!,
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
        <GraphicLayer variant="contours-a" />
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

          <div ref={cards} className="m-g16 mt-12 grid gap-4 md:mt-16 md:grid-cols-3 md:gap-6">
            {copy.cards.map((card, i) => (
              <div
                key={card.title}
                data-card
                className="group relative border border-line bg-white/55 p-6 transition-[translate,box-shadow] duration-300 ease-out md:p-8 motion-safe:hover:-translate-y-1 hover:shadow-[0_18px_40px_-20px_rgb(0_0_0/0.28)]"
              >
                <CornerMarks />
                <div className="flex items-start justify-between gap-4">
                  <span className="font-mono text-[11px] tracking-[0.14em] text-silver">{String(i + 1).padStart(2, "0")}</span>
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.25"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-8 w-8 shrink-0 transition-transform duration-500 ease-out motion-safe:group-hover:rotate-[12deg]"
                  >
                    {ICONS[i]}
                  </svg>
                </div>
                <h3 className="mt-8 text-xl font-medium tracking-[-0.02em] md:mt-10 md:text-[22px]">{card.title}</h3>
                <p className="mt-3 text-[15px] leading-relaxed text-silver">{protectTerms(card.text)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <FractionalModel copy={copy.model} note={copy.note} />
    </>
  );
}

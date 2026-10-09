"use client";

import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import MediaSlot from "./MediaSlot";

gsap.registerPlugin(useGSAP, ScrollTrigger);

/** Frase do manifesto em trechos; `soft` = peso leve em prata (contraste editorial). */
const statement: { text: string; soft?: boolean }[] = [
  { text: "Design não é decoração." },
  { text: "É a forma mais precisa de dizer quem você é", soft: true },
  { text: "— e de decidir o que fica de fora." },
];

/**
 * Manifesto. Entra enquanto a hero (fixa) recua: as palavras da frase grande
 * acendem uma a uma conforme o scroll; texto de apoio e retrato aparecem em
 * seguida. Fundo transparente para a forma escurecida continuar visível atrás.
 */
export default function Manifesto() {
  const root = useRef<HTMLElement>(null);
  const phrase = useRef<HTMLParagraphElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.fromTo(
          "[data-word]",
          { opacity: 0.12, yPercent: 35 },
          {
            opacity: 1,
            yPercent: 0,
            ease: "none",
            stagger: 0.05,
            scrollTrigger: {
              trigger: phrase.current,
              start: "top 88%",
              end: "bottom 55%",
              scrub: 0.8,
            },
          },
        );

        gsap.from("[data-follow]", {
          autoAlpha: 0,
          y: 24,
          duration: 1.1,
          ease: "power3.out",
          stagger: 0.12,
          // gatilho na frase: o retrato de desktop fica `hidden` no mobile e não serve de referência
          scrollTrigger: { trigger: phrase.current, start: "bottom 75%" },
        });
      });
    },
    { scope: root },
  );

  return (
    <section
      ref={root}
      id="manifesto"
      className="relative z-10 mx-auto w-full max-w-[1600px] px-6 py-28 md:px-12 md:py-48"
    >
      <div className="grid gap-12 md:grid-cols-12 md:gap-8">
        <div className="md:col-span-3">
          <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-silver">
            (01) Manifesto
          </p>
          {/* Retrato do diretor: proporção vertical, alinhado à coluna esquerda */}
          <div data-follow className="mt-10 hidden max-w-[18rem] md:block">
            <MediaSlot label="Retrato" ratio="aspect-[3/4]" sizes="22vw" />
          </div>
        </div>
        <div className="md:col-span-9 md:col-start-4">
          <p
            ref={phrase}
            className="text-[clamp(2.1rem,5.4vw,5.75rem)] font-medium leading-[1.04] tracking-[-0.05em]"
          >
            {statement.map((part, i) => (
              <span key={i} className={part.soft ? "font-light text-silver" : undefined}>
                {part.text.split(" ").map((word, j) => (
                  <span key={j}>
                    <span data-word className="inline-block">
                      {word}
                    </span>{" "}
                  </span>
                ))}
              </span>
            ))}
          </p>
          <div className="mt-12 grid gap-10 md:mt-20 md:grid-cols-9">
            <p
              data-follow
              className="max-w-md text-sm leading-relaxed text-silver md:col-span-4 md:col-start-6"
            >
              Acredito em menos ruído e mais intenção. Cada linha, silêncio e
              espaço em branco é uma decisão. O resultado: marcas calmas,
              confiantes e impossíveis de confundir.
            </p>
            <div data-follow className="w-3/5 md:hidden">
              <MediaSlot label="Retrato" ratio="aspect-[4/5]" sizes="60vw" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

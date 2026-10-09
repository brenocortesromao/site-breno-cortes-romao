"use client";

import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import MediaSlot from "./MediaSlot";
import Signature from "./Signature";
import DraftBadge from "./theme/DraftBadge";

gsap.registerPlugin(useGSAP, ScrollTrigger);

export type ManifestoCopy = {
  eyebrow: string;
  /** Frase em trechos; `soft` = peso leve em prata (contraste editorial). */
  statement: { text: string; soft?: boolean }[];
  body: string;
  portrait: string;
  /** Nome completo + função, abaixo do texto de apoio. */
  name: string;
  role: string;
  signatureLabel: string;
  /** Rótulo do selo de conteúdo provisório (vazio = sem selo). */
  draft: string;
};

/**
 * Mensagem de Breno Côrtes Romão. Entra por cima da hero fixa (fundo
 * transparente: a bola escurecida segue visível atrás). Coreografia:
 * - as palavras da frase acendem uma a uma com o scroll;
 * - a assinatura é desenhada sobre o retrato (traço controlado pelo scroll);
 * - texto de apoio e nome aparecem em seguida.
 * Com prefers-reduced-motion, tudo já aparece pronto (assinatura completa).
 */
export default function Manifesto({
  copy,
  portraitSrc,
}: {
  copy: ManifestoCopy;
  portraitSrc?: string;
}) {
  const root = useRef<HTMLElement>(null);
  const phrase = useRef<HTMLParagraphElement>(null);
  const portrait = useRef<HTMLDivElement>(null);

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
              start: "top 85%",
              end: "bottom 50%",
              scrub: 0.8,
            },
          },
        );

        // Assinatura: cada traço começa escondido (dashoffset = comprimento) e é
        // "escrito" em sequência enquanto o retrato atravessa a tela.
        const paths = gsap.utils.toArray<SVGPathElement>("[data-signature-path]");
        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: portrait.current,
            start: "top 55%",
            end: "bottom 60%",
            scrub: 0.6,
          },
        });
        paths.forEach((path) => {
          const len = path.getTotalLength();
          gsap.set(path, { strokeDasharray: len, strokeDashoffset: len });
          tl.to(path, { strokeDashoffset: 0, ease: "none", duration: len / 400 });
        });

        gsap.from("[data-follow]", {
          autoAlpha: 0,
          y: 24,
          duration: 1.1,
          ease: "power3.out",
          stagger: 0.12,
          scrollTrigger: { trigger: phrase.current, start: "bottom 75%" },
        });
      });
    },
    { scope: root },
  );

  return (
    <section ref={root} id="manifesto" data-theme="dark" className="relative z-10 min-h-svh">
      <div className="mx-auto grid w-full max-w-[1600px] gap-14 px-6 py-[clamp(6rem,16vh,12rem)] md:grid-cols-12 md:gap-8 md:px-12">
        {/* Retrato + assinatura */}
        <div className="md:col-span-5">
          <div className="mb-8 flex flex-wrap items-center gap-4 md:mb-10">
            <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-silver">
              {copy.eyebrow}
            </p>
            {copy.draft && <DraftBadge label={copy.draft} />}
          </div>
          <div ref={portrait} className="relative">
            <MediaSlot
              src={portraitSrc}
              alt={copy.name}
              label={copy.portrait}
              ratio="aspect-[4/5]"
              tone="mono"
              sizes="(min-width: 768px) 38vw, 90vw"
            />
            <Signature
              label={copy.signatureLabel}
              className="pointer-events-none absolute -bottom-[7%] right-[-4%] w-[82%]"
            />
          </div>
        </div>

        {/* Frase do problema + apoio */}
        <div className="flex flex-col justify-center md:col-span-6 md:col-start-7">
          <p
            ref={phrase}
            className="text-[clamp(2rem,4.6vw,5rem)] font-medium leading-[1.05] tracking-[-0.05em]"
          >
            {copy.statement.map((part, i) => (
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
          <div className="mt-12 grid gap-8 md:mt-16 md:grid-cols-6">
            <p
              data-follow
              className="max-w-md text-sm leading-relaxed text-silver md:col-span-4 md:col-start-3 md:text-[15px]"
            >
              {copy.body}
            </p>
            <p data-follow className="md:col-span-4 md:col-start-3">
              <span className="block text-sm font-semibold tracking-[-0.01em]">{copy.name}</span>
              <span className="mt-1 block font-mono text-[10px] uppercase tracking-[0.22em] text-silver">
                {copy.role}
              </span>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

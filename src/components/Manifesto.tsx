"use client";

import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import MediaSlot from "./MediaSlot";
import PortraitReveal from "./PortraitReveal";
import Signature from "./Signature";
import type { SignatureData } from "@/content/signature";
import DraftBadge from "./theme/DraftBadge";
import { protectTerms } from "@/components/Term";

gsap.registerPlugin(useGSAP, ScrollTrigger);

export type ManifestoCopy = {
  eyebrow: string;
  /** Frase em trechos; `soft` = peso leve em prata (contraste editorial). */
  statement: { text: string; soft?: boolean }[];
  body: string;
  portrait: string;
  /** Texto alternativo do retrato ("Retrato de {name}"). */
  portraitAlt: string;
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
  signature,
  portraitSrc,
}: {
  copy: ManifestoCopy;
  /** viewBox + paths de public/assinatura.svg (lidos no servidor). */
  signature: SignatureData;
  portraitSrc?: string;
}) {
  const root = useRef<HTMLElement>(null);
  const phrase = useRef<HTMLHeadingElement>(null);
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

        // Assinatura: caneta contínua. Cada traço começa escondido (dashoffset =
        // comprimento E opacidade 0, senão a ponta redonda deixa um ponto solto)
        // e é escrito em sequência, com duração proporcional ao comprimento.
        // Começa depois da pintura do retrato (que termina no topo a 45%) e
        // fica completa com o retrato ainda inteiro na tela.
        const paths = gsap.utils.toArray<SVGPathElement>("[data-signature-path]");
        const shineLayer = root.current?.querySelector("[data-signature-shine-layer]");
        const shine = root.current?.querySelector("[data-signature-shine]");
        const sigWidth = Number(signature.viewBox.split(/\s+/)[2]) || 1000;

        // Reflexo: faixa de luz que atravessa o traço da esquerda para a direita.
        // Primeira passada ao terminar o desenho; depois repete sutil a cada ~5 s,
        // só com a seção visível.
        const sweep = gsap
          .timeline({ paused: true, repeat: -1, repeatDelay: 4.5 })
          .set(shineLayer ?? {}, { opacity: 1 })
          .fromTo(
            shine ?? {},
            { attr: { x1: -sigWidth * 0.3, x2: 0 } },
            { attr: { x1: sigWidth, x2: sigWidth * 1.3 }, duration: 1.6, ease: "power2.inOut" },
          );
        let drawn = false;
        let onScreen = false;
        const syncSweep = () => {
          if (drawn && onScreen) sweep.play();
          else sweep.pause();
        };

        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: portrait.current,
            start: "top 42%",
            end: "top 10%",
            scrub: 0.6,
          },
          onUpdate: () => {
            const done = tl.progress() >= 0.999;
            if (done && !drawn) sweep.restart();
            if (!done && drawn) {
              sweep.pause(0);
              gsap.set(shineLayer ?? {}, { opacity: 0 });
            }
            drawn = done;
            syncSweep();
          },
        });
        paths.forEach((path) => {
          const len = path.getTotalLength();
          gsap.set(path, { strokeDasharray: len, strokeDashoffset: len, opacity: 0 });
          tl.set(path, { opacity: 1 }).to(path, { strokeDashoffset: 0, ease: "none", duration: len / 900 });
        });

        ScrollTrigger.create({
          trigger: portrait.current,
          start: "top bottom",
          end: "bottom top",
          onToggle: (self) => {
            onScreen = self.isActive;
            syncSweep();
          },
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
    <section ref={root} id="manifesto" data-theme="dark" aria-labelledby="manifesto-title" className="relative z-10 min-h-svh">
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
            {portraitSrc ? (
              <PortraitReveal src={portraitSrc} alt={copy.portraitAlt} sizes="(min-width: 768px) 38vw, 90vw" />
            ) : (
              <MediaSlot label={copy.portrait} ratio="aspect-[4/5]" />
            )}
            <Signature
              data={signature}
              label={copy.signatureLabel}
              className="pointer-events-none absolute -bottom-[7%] right-[-4%] w-[82%]"
            />
          </div>
        </div>

        {/* Frase do problema + apoio */}
        <div className="flex flex-col justify-center md:col-span-6 md:col-start-7">
          {/* translate="no": a frase é partida em <span> por palavra para a
              animação, e o tradutor automático do navegador traduz cada palavra
              isolada ("si." vira "sim"). O texto já vem no idioma da página. */}
          <h2
            ref={phrase}
            id="manifesto-title"
            translate="no"
            // text-balance: linhas equilibradas, sem buraco à direita. No desktop
            // a frase avança um pouco sobre a área do retrato (sem chegar na
            // assinatura, que termina antes desse recuo).
            className="text-balance text-[clamp(2rem,4.6vw,5rem)] font-medium leading-[1.05] tracking-[-0.05em] md:-ml-[clamp(0px,5vw,6rem)]"
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
          </h2>
          <div className="mt-12 grid gap-8 md:mt-16 md:grid-cols-6">
            <p
              data-follow
              className="max-w-md text-sm leading-relaxed text-silver md:col-span-4 md:col-start-3 md:text-[15px]"
            >
              {protectTerms(copy.body)}
            </p>
            <p data-follow className="md:col-span-4 md:col-start-3">
              <span className="block text-sm font-semibold tracking-[-0.01em]">{copy.name}</span>
              <span className="mt-1 block font-mono text-[10px] uppercase tracking-[0.22em] text-silver">
                {protectTerms(copy.role)}
              </span>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

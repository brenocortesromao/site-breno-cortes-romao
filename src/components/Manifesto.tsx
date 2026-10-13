"use client";

import { useCallback, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { revealOnce } from "@/lib/reveal";
import MediaSlot from "./MediaSlot";
import PortraitReveal from "./PortraitReveal";
import TiltCard from "./TiltCard";
import { PORTRAIT_FRAME_MASK, PortraitFrameOutline } from "./portraitFrame";
import Signature from "./Signature";
import type { SignatureData } from "@/content/signature";
import DraftBadge from "./theme/DraftBadge";
import { protectTerms } from "@/components/Term";

gsap.registerPlugin(useGSAP, ScrollTrigger);

export type ManifestoCopy = {
  eyebrow: string;
  /** Frase em trechos; `soft` = peso leve em prata (contraste editorial). */
  statement: { text: string; soft?: boolean }[];
  body: string[];
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
 * - a frase se forma letra por letra, do desfocado ao nítido, acompanhando o
 *   scroll (opacity 0 + blur 10px → opacity 1 + blur 0; scrub);
 * - o retrato entra com uma luz de estúdio acendendo (PortraitReveal) e, com
 *   a foto no lugar, a assinatura é escrita sobre ele (~1,8 s, por tempo);
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
  /** A foto real já está no lugar (fim da entrada do retrato). */
  const revealed = useRef(false);
  /** Inicia a escrita da assinatura (definido pela animação; null sem ela). */
  const playSignature = useRef<(() => void) | null>(null);
  const handleRevealed = useCallback(() => {
    revealed.current = true;
    playSignature.current?.();
  }, []);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        // frase: letra por letra, do desfocado ao nítido, com o scroll (sem
        // movimento nem escala). will-change só enquanto o trecho está ativo.
        const letters = gsap.utils.toArray<HTMLElement>("[data-ch]", phrase.current!);
        gsap.fromTo(
          letters,
          { opacity: 0, filter: "blur(10px)" },
          {
            opacity: 1,
            filter: "blur(0px)",
            ease: "power2.out",
            duration: 0.5,
            stagger: 0.035,
            // nítida no fim (já com o atraso do scrub): tira o filtro (blur 0) para não pesar
            onComplete: () => gsap.set(letters, { clearProps: "filter" }),
            scrollTrigger: {
              trigger: phrase.current,
              start: "top 80%",
              end: "bottom 40%",
              scrub: 0.6,
              onToggle: (self) => gsap.set(letters, { willChange: self.isActive ? "filter, opacity" : "auto" }),
            },
          },
        );

        // Assinatura: caneta contínua. Cada traço começa escondido (dashoffset =
        // comprimento E opacidade 0, senão a ponta redonda deixa um ponto solto)
        // e é escrito em sequência, com duração proporcional ao comprimento.
        // Por tempo (~1,8 s), começando quando a foto real está no lugar (fim
        // da luz de estúdio); sem retrato, quando a moldura chega a 60% da tela.
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
          paused: true,
          onComplete: () => {
            drawn = true;
            sweep.restart();
            syncSweep();
          },
        });
        paths.forEach((path) => {
          const len = path.getTotalLength();
          gsap.set(path, { strokeDasharray: len, strokeDashoffset: len, opacity: 0 });
          tl.set(path, { opacity: 1 }).to(path, { strokeDashoffset: 0, ease: "none", duration: len / 900 });
        });
        tl.timeScale(tl.duration() / 1.8);
        const play = () => tl.play();
        if (portraitSrc) {
          if (revealed.current) play();
          else playSignature.current = play;
        } else {
          ScrollTrigger.create({ trigger: portrait.current, start: "top 60%", once: true, onEnter: play });
        }

        ScrollTrigger.create({
          trigger: portrait.current,
          start: "top bottom",
          end: "bottom top",
          onToggle: (self) => {
            onScreen = self.isActive;
            syncSweep();
          },
        });

        const follow = gsap.from("[data-follow]", {
          autoAlpha: 0,
          y: 24,
          duration: 1.1,
          ease: "power3.out",
          stagger: 0.12,
          paused: true,
        });
        // revealOnce: gatilho + rede de segurança (o texto nunca fica preso invisível)
        const stopFollow = revealOnce({
          trigger: phrase.current!,
          start: "bottom 75%",
          play: () => follow.play(),
          finish: () => follow.progress(1),
        });

        return () => {
          stopFollow();
          playSignature.current = null;
        };
      });
    },
    { scope: root },
  );

  return (
    <section ref={root} id="manifesto" data-theme="dark" aria-labelledby="manifesto-title" className="relative z-10 min-h-svh">
      <div className="mx-auto grid w-full max-w-[1600px] gap-14 px-6 py-[clamp(6rem,16vh,12rem)] md:grid-cols-12 md:gap-8 md:px-12">
        {/* Retrato + assinatura */}
        <div className="md:col-span-5">
          <div className="mb-8 flex flex-wrap items-center gap-4 max-md:justify-center md:mb-10">
            <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-silver m-center">
              {copy.eyebrow}
            </p>
            {copy.draft && <DraftBadge label={copy.draft} />}
          </div>
          {/* retrato a ~80% da coluna, como "cartão de vidro": inclina em 3D com
              o mouse; a assinatura fica numa camada à frente da foto, fora do
              recorte da moldura "curva líquida" */}
          <TiltCard
            ref={portrait}
            className="mx-auto w-4/5 md:mx-0 md:ml-[4%]"
            shape={PORTRAIT_FRAME_MASK}
            overlay={<PortraitFrameOutline />}
            front={
              <Signature
                data={signature}
                label={copy.signatureLabel}
                className="pointer-events-none absolute -bottom-[7%] right-[-4%] w-[82%]"
              />
            }
          >
            {portraitSrc ? (
              <PortraitReveal
                src={portraitSrc}
                alt={copy.portraitAlt}
                sizes="(min-width: 768px) 31vw, 72vw"
                shape={PORTRAIT_FRAME_MASK}
                onRevealed={handleRevealed}
              />
            ) : (
              <div style={PORTRAIT_FRAME_MASK}>
                <MediaSlot label={copy.portrait} ratio="aspect-[4/5]" className="border-0" />
              </div>
            )}
          </TiltCard>
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
            aria-label={copy.statement.map((p) => p.text).join(" ")}
            data-blur-scrub
            // text-balance: linhas equilibradas, sem buraco à direita. No desktop
            // a frase avança um pouco sobre a área do retrato (sem chegar na
            // assinatura, que termina antes desse recuo).
            className="m-center text-balance text-[clamp(2rem,4.6vw,5rem)] font-medium leading-[1.05] tracking-[-0.05em] md:-ml-[clamp(0px,5vw,6rem)]"
          >
            {copy.statement.map((part, i) => (
              <span key={i} className={part.soft ? "font-light text-silver" : undefined}>
                {part.text.split(" ").map((word, j) => (
                  <span key={j}>
                    {/* palavra inteira na quebra; letras inline (mantém o kerning) */}
                    <span aria-hidden="true" className="inline-block whitespace-nowrap">
                      {Array.from(word).map((ch, k) => (
                        <span key={k} aria-hidden="true" data-ch>
                          {ch}
                        </span>
                      ))}
                    </span>{" "}
                  </span>
                ))}
              </span>
            ))}
          </h2>
          <div className="mt-12 grid gap-8 md:mt-16 md:grid-cols-6">
            <div
              data-follow
              className="max-w-md space-y-4 text-sm leading-relaxed text-silver md:col-span-4 md:col-start-3 md:text-[15px]"
            >
              {copy.body.map((paragraph) => (
                <p key={paragraph}>{protectTerms(paragraph)}</p>
              ))}
            </div>
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

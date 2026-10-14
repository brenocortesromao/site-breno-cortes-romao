"use client";

import { Fragment, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { revealOnce } from "@/lib/reveal";
import { DecodeLetters, decode, hideLetters, shine, showLetters } from "@/components/decode";
import OceanBackdrop from "@/components/graphics/OceanBackdrop";
import { scrubFor } from "@/lib/mobile";

gsap.registerPlugin(useGSAP, ScrollTrigger);

export type AiCopy = {
  eyebrow: string;
  /** Objeção digitada na caixa de prompt. */
  prompt: string;
  title: string;
  /** Frases grandes, uma por linha. */
  lines: string[];
  body: string;
  closing: string;
  /** Trecho do fecho que recebe o reflexo prata. */
  closingHighlight: string;
  footnote: string;
};

/**
 * "E a inteligência artificial?" (§11b, preto), entre Sobre e Poucas parcerias.
 * 1. Caixa de prompt minimalista: ao entrar na tela, a objeção é digitada letra
 *    por letra com cursor piscando. A frase inteira está no HTML (camada
 *    transparente que também reserva o tamanho da caixa); a camada digitada é
 *    decorativa.
 * 2. Terminada a digitação, o título entra com a DECODIFICAÇÃO (a mesma de
 *    A distância, components/decode.tsx).
 * 3. As frases "A IA nunca..." acendem de grafite para branco com o scroll.
 * 4. Fecho com reflexo prata em `closingHighlight`, uma vez.
 * Sem JS / prefers-reduced-motion: tudo estático e visível (sem cursor).
 */
export default function Ai({ copy }: { copy: AiCopy }) {
  const root = useRef<HTMLElement>(null);
  const title = useRef<HTMLHeadingElement>(null);
  const closing = useRef<HTMLParagraphElement>(null);
  const chars = Array.from(copy.prompt);
  /** Letras já digitadas; null = frase inteira (HTML do servidor, reduced motion). */
  const [typed, setTyped] = useState<number | null>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const h = title.current!;
        hideLetters(h);
        setTyped(0);
        let stopDecode: (() => void) | undefined;
        // ritmo de digitação humano (variação por letra, pausa depois de
        // pontuação), calculado antes e lido POR TEMPO no ticker: com a página
        // pesada as letras saem em blocos, mas a digitação termina no horário
        const at: number[] = [];
        let acc = 0;
        chars.forEach((ch, i) => {
          acc += 0.034 + Math.random() * 0.052 + (/[.,?!]/.test(chars[i - 1] ?? "") ? 0.18 : 0);
          at.push(acc);
        });
        const decodeAt = acc + 0.38;
        let t0 = -1;
        let shown = 0;
        const tick = (time: number) => {
          if (t0 < 0) t0 = time;
          const t = time - t0;
          let n = shown;
          while (n < chars.length && at[n] <= t) n++;
          if (n !== shown) setTyped((shown = n));
          if (t >= decodeAt) {
            gsap.ticker.remove(tick);
            stopDecode = decode(h);
          }
        };
        // revealOnce: gatilho + rede de segurança (prompt e título nunca ficam presos)
        const stopReveal = revealOnce({
          trigger: root.current!.querySelector("[data-ai-prompt]")!,
          start: "top 75%",
          play: () => gsap.ticker.add(tick),
          finish: () => {
            setTyped(null);
            showLetters(h);
          },
        });

        gsap.utils.toArray<HTMLElement>("[data-ai-line]").forEach((line) => {
          gsap.fromTo(
            line,
            { opacity: 0.14 },
            { opacity: 1, ease: "none", scrollTrigger: { trigger: line, start: "top 80%", end: "top 52%", scrub: scrubFor(0.6) } },
          );
        });

        ScrollTrigger.create({
          trigger: closing.current,
          start: "top 65%",
          once: true,
          onEnter: () => closing.current && shine(closing.current),
        });

        return () => {
          stopReveal();
          gsap.ticker.remove(tick);
          stopDecode?.();
          setTyped(null);
        };
      });
    },
    { scope: root },
  );

  const at = copy.closing.indexOf(copy.closingHighlight);
  const before = at >= 0 ? copy.closing.slice(0, at) : copy.closing;
  const after = at >= 0 ? copy.closing.slice(at + copy.closingHighlight.length) : "";

  return (
    <section ref={root} id="ia" data-theme="dark" aria-labelledby="ia-title" className="relative z-10 min-h-svh overflow-clip">
      {/* oceano 3D fixo atrás do conteúdo (alto-mar → linha d'água → recife) */}
      <OceanBackdrop />
      <div className="m-sec relative z-10 mx-auto w-full max-w-[1600px] px-6 py-[clamp(6rem,16lvh,12rem)] md:px-12">
        <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-silver m-center">{copy.eyebrow}</p>

        {/* caixa de prompt (estilo chat de IA) */}
        <div data-ai-prompt className="m-g16 mt-10 max-w-2xl rounded-2xl border border-line bg-surface px-5 py-5 md:mt-12 md:px-7 md:py-6">
          <div className="grid font-mono text-[clamp(1rem,1.5vw,1.3rem)] leading-snug">
            {/* frase real (leitores de tela, buscadores) e reserva do tamanho final */}
            <p className="opacity-0 [grid-area:1/1]">{copy.prompt}</p>
            <p aria-hidden="true" className="[grid-area:1/1]">
              {typed === null ? copy.prompt : chars.slice(0, typed).join("")}
              <span className="ml-0.5 inline-block h-[1.05em] w-[0.5ch] translate-y-[0.18em] bg-foreground animate-[caretBlink_1.05s_steps(1)_infinite] motion-reduce:hidden" />
            </p>
          </div>
          {/* barra da caixa (decorativa): anexar e enviar */}
          <div aria-hidden="true" className="mt-5 flex items-center justify-between text-silver">
            <span className="grid h-8 w-8 place-items-center rounded-full border border-line">
              <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M8 3v10M3 8h10" strokeLinecap="round" />
              </svg>
            </span>
            <span className="grid h-8 w-8 place-items-center rounded-full bg-foreground text-background">
              <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M8 13V3M3.5 7.5 8 3l4.5 4.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          </div>
        </div>

        {/* título: decodificado depois da digitação (aria-label com a frase inteira) */}
        <h2
          ref={title}
          id="ia-title"
          aria-label={copy.title}
          translate="no"
          data-decode
          className="m-center m-g40 mt-16 max-w-5xl text-[clamp(2.4rem,5.6vw,6rem)] font-semibold leading-[1.02] tracking-[-0.055em] md:mt-24"
        >
          <DecodeLetters text={copy.title} />
        </h2>

        <ul className="m-g40 mt-[clamp(5rem,14lvh,10rem)] grid gap-6 md:gap-8">
          {copy.lines.map((line) => (
            <li
              key={line}
              data-ai-line
              className="text-[clamp(1.7rem,3.8vw,4rem)] font-semibold leading-[1.08] tracking-[-0.045em]"
            >
              {line}
            </li>
          ))}
        </ul>

        <div className="mt-[clamp(5rem,14lvh,10rem)] grid gap-12 md:grid-cols-12 md:gap-8">
          {/* degradê escuro suave atrás do parágrafo: legível mesmo com um tubarão passando */}
          <p className="relative max-w-xl text-base leading-relaxed text-silver before:pointer-events-none before:absolute before:-inset-x-10 before:-inset-y-8 before:-z-10 before:bg-[radial-gradient(ellipse_at_center,var(--bg)_15%,transparent_70%)] before:opacity-65 max-md:before:-inset-x-4 max-md:before:-inset-y-5 max-md:before:opacity-50 md:col-span-6 md:col-start-7 md:text-lg">
            {copy.body}
          </p>
        </div>

        <p
          ref={closing}
          className="m-center mt-[clamp(5rem,14lvh,10rem)] max-w-5xl text-[clamp(2rem,4.4vw,4.75rem)] font-semibold leading-[1.04] tracking-[-0.05em]"
        >
          {before}
          {at >= 0 &&
            copy.closingHighlight.split(" ").map((word, k) => (
              <Fragment key={k}>
                {k > 0 && " "}
                <span className="inline-block whitespace-nowrap">
                  {Array.from(word).map((ch, j) => (
                    <span key={j} data-key className="text-shine-fixed inline-block">
                      {ch}
                    </span>
                  ))}
                </span>
              </Fragment>
            ))}
          {after}
        </p>
        <p className="m-center-p mt-8 text-sm text-silver md:text-base">{copy.footnote}</p>
      </div>
    </section>
  );
}

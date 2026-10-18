"use client";

import { Fragment, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { revealOnce } from "@/lib/reveal";

gsap.registerPlugin(useGSAP, ScrollTrigger);

/** Duração de cada letra (s) e faixa do escalonamento entre letras (s). */
const DURATION = 0.5;
const STAGGER_MIN = 0.035;
const STAGGER_MAX = 0.04;
/** Duração total buscada (s): o escalonamento se ajusta dentro da faixa acima. */
const TOTAL = 2;

/**
 * Título que se forma letra por letra com desfoque: cada letra vai de
 * opacity 0 + blur(10px) a opacity 1 + blur(0), da esquerda para a direita
 * (35 a 40 ms entre letras, 0,5 s cada, power2.out; ~2 s no total). Sem
 * movimento nem escala. Dispara uma vez quando o título entra ~20% na tela.
 * Cada palavra é um inline-block sem quebra interna, então as quebras de linha
 * são as mesmas do texto corrido. O texto completo fica no aria-label; as
 * letras são aria-hidden. Sem JS ou com prefers-reduced-motion: título pronto.
 * Estado inicial antes da hidratação: `.js-motion [data-blur-reveal] [data-ch]`
 * (globals.css); o JS assume com estilo inline.
 * Uso: <BlurRevealTitle id="..." className="..." text={copy.title} />
 * Opcional: `unit="word"` anima palavra por palavra (cada palavra é a unidade
 * com data-ch); `muted` + `mutedClassName` acrescentam um trecho final com
 * classe própria (ex.: a parte em cinza de um título), que entra na sequência.
 */
export default function BlurRevealTitle({
  text,
  id,
  className,
  as: Tag = "h2",
  start = "top 80%",
  stagger: fixedStagger,
  unit = "char",
  muted,
  mutedClassName,
}: {
  text: string;
  id?: string;
  className?: string;
  as?: "h1" | "h2" | "h3";
  /** Início do ScrollTrigger (padrão: topo do título a 80% da tela). */
  start?: string;
  /** Intervalo fixo entre letras (s). Sem ele, ajusta entre 35 e 40 ms para ~2 s no total. */
  stagger?: number;
  /** Unidade animada: letra (padrão) ou palavra. */
  unit?: "char" | "word";
  /** Trecho final com classe própria (mutedClassName), depois de `text`. */
  muted?: string;
  mutedClassName?: string;
}) {
  const root = useRef<HTMLHeadingElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const chars = gsap.utils.toArray<HTMLElement>(root.current!.querySelectorAll("[data-ch]"));
        if (!chars.length) return;
        const stagger =
          fixedStagger ??
          Math.min(STAGGER_MAX, Math.max(STAGGER_MIN, (TOTAL - DURATION) / Math.max(chars.length - 1, 1)));
        gsap.set(chars, { opacity: 0, filter: "blur(10px)" });
        // revealOnce: gatilho + rede de segurança (nunca fica preso invisível)
        return revealOnce({
          trigger: root.current!,
          start,
          play: () => {
            gsap.set(chars, { willChange: "filter, opacity" });
            gsap.to(chars, {
              opacity: 1,
              filter: "blur(0px)",
              duration: DURATION,
              ease: "power2.out",
              stagger,
              // opacity fica inline em 1 (a regra .js-motion ainda pode existir)
              onComplete: () => gsap.set(chars, { clearProps: "willChange,filter" }),
            });
          },
          finish: () => gsap.set(chars, { opacity: 1, clearProps: "willChange,filter" }),
        });
      });
    },
    { scope: root, dependencies: [text, muted, unit, start, fixedStagger] },
  );

  const renderWords = (words: string[]) =>
    words.map((word, w) => (
      <Fragment key={w}>
        {unit === "word" ? (
          <span aria-hidden="true" className="inline-block whitespace-nowrap" data-ch>
            {word}
          </span>
        ) : (
          <span aria-hidden="true" className="inline-block whitespace-nowrap">
            {Array.from(word).map((ch, i) => (
              <span key={i} aria-hidden="true" data-ch>
                {ch}
              </span>
            ))}
          </span>
        )}
        {w < words.length - 1 ? " " : null}
      </Fragment>
    ));
  return (
    <Tag ref={root} id={id} className={className} aria-label={muted ? `${text} ${muted}` : text} translate="no" data-blur-reveal>
      {renderWords(text.split(" "))}
      {muted ? (
        <>
          {" "}
          <span aria-hidden="true" className={mutedClassName}>
            {renderWords(muted.split(" "))}
          </span>
        </>
      ) : null}
    </Tag>
  );
}

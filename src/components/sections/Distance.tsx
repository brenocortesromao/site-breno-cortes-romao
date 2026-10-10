"use client";

import { Fragment, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import type { DistanceCharts } from "@/content/charts";

gsap.registerPlugin(useGSAP, ScrollTrigger);

export type DistanceCopy = {
  eyebrow: string;
  /**
   * Texto de cada bloco (A, B, C), conforme o CONTEUDO-SITE.md, e os trechos
   * que a animação encena (localizados dentro do texto, então o texto segue
   * limpo e traduzível): gap (A), hits e close (B), shine (C).
   */
  charts: { text: string; gap?: string; hits?: string[]; close?: string; shine?: string }[];
};

const STEPS = ["a", "b", "c"] as const;

/** Prepara um path para ser "desenhado": dash = comprimento total, escondido. */
function prepDraw(path: Element | null) {
  if (!(path instanceof SVGPathElement)) return 0;
  const len = path.getTotalLength();
  gsap.set(path, { strokeDasharray: len, strokeDashoffset: len });
  return len;
}

type Word = { text: string; tag?: "gap" | "hit" | "close" | "shine" };

/** Divide o texto em palavras e marca as que pertencem aos trechos encenados. */
function markWords(chart: DistanceCopy["charts"][number]): Word[] {
  const words = chart.text.split(" ");
  const tags: (Word["tag"] | undefined)[] = words.map(() => undefined);
  const markRun = (phrase: string | undefined, tag: Word["tag"]) => {
    if (!phrase) return;
    const run = phrase.split(" ");
    for (let i = 0; i + run.length <= words.length; i++) {
      if (run.every((w, k) => words[i + k] === w || words[i + k].replace(/[.,;:!?]$/, "") === w)) {
        run.forEach((_, k) => (tags[i + k] = tag));
        return;
      }
    }
  };
  markRun(chart.gap, "gap");
  markRun(chart.close, "close");
  chart.hits?.forEach((h) => markRun(h, "hit"));
  markRun(chart.shine, "shine");
  return words.map((text, i) => ({ text, tag: tags[i] }));
}

/**
 * "A distância": TRÊS BLOCOS separados, um abaixo do outro, sem pin. Cada
 * bloco tem o texto à esquerda e o gráfico do dono à direita (public/graficos/,
 * inline com ids ga-/gb-/gc-; ver src/content/charts.ts):
 *  A. curvas + área "A DISTÂNCIA";
 *  B. marco "DIREÇÃO DE MARCA", fantasma "SEM DIREÇÃO" e a marca subindo até o
 *     negócio enquanto a área some (começa no estado final de A);
 *  C. consistência: pontos se alinham no eixo comum.
 * Cada gráfico é animado por SCRUB curto: começa quando o bloco entra pela base
 * da tela e termina quando o gráfico chega ao centro (cerca de meia tela).
 * Cada frase ENCENA o que diz, na mesma timeline do seu gráfico:
 *  A. palavras acendem uma a uma; "e o que ela parece." se afasta para a
 *     direita, abrindo um vão, junto com a área "A DISTÂNCIA" acendendo;
 *  B. "vendas", "talentos" e "preço" entram um a um com um tremor de glitch;
 *     "Meu trabalho é fechá-la." entra com as letras espaçadas que se fecham,
 *     junto com a marca alcançando o negócio;
 *  C. as letras começam desalinhadas (deslocadas, giradas, com peso variando
 *     por text-stroke, sem mudar a largura) e se encaixam junto com as setas;
 *     no fim, "confiar" recebe um reflexo prata uma vez.
 * O texto fica inteiro no HTML (palavras/letras em <span>, aria-label com a
 * frase completa). Os efeitos usam só transform/opacity/stroke: sem layout
 * shift. Sem JS ou com prefers-reduced-motion: texto e gráficos estáticos.
 */
export default function Distance({ copy, charts }: { copy: DistanceCopy; charts: DistanceCharts }) {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const section = root.current!;
        const q = (id: string) => section.querySelector(`#${id}`);
        const fig = (s: string) => section.querySelector(`[data-chart="${s}"]`);
        const words = (s: string, sel = "[data-w]") =>
          gsap.utils.toArray<HTMLElement>(section.querySelectorAll(`[data-step="${s}"] ${sel}`));
        const em = (el: Element | undefined) => parseFloat(getComputedStyle(el ?? section).fontSize) || 16;
        const mobile = window.matchMedia("(max-width: 767px)").matches;
        const ease = "none";
        const scrubbed = (s: string) =>
          gsap.timeline({
            defaults: { ease },
            scrollTrigger: { trigger: fig(s), start: "top bottom", end: "center center", scrub: 0.5, invalidateOnRefresh: true },
          });

        // ---------- A: eixos, curvas desenhadas, área da distância ----------
        prepDraw(q("ga-curva-negocio"));
        prepDraw(q("ga-curva-marca"));
        const wA = words("a");
        const gapA = words("a", '[data-w][data-tag="gap"]');
        scrubbed("a")
          .fromTo([q("ga-eixos"), q("ga-rotulos-eixos")], { opacity: 0 }, { opacity: 1, duration: 0.5 }, 0)
          .to([q("ga-curva-negocio"), q("ga-curva-marca")], { strokeDashoffset: 0, duration: 1.5 }, 0.2)
          .fromTo(q("ga-rotulos"), { opacity: 0 }, { opacity: 1, duration: 0.4 }, 1.4)
          .fromTo([q("ga-area-distancia"), q("ga-area-brilho")], { opacity: 0 }, { opacity: 1, duration: 0.7 }, 1.4)
          .fromTo([q("ga-rotulo-distancia"), q("ga-nota")], { opacity: 0 }, { opacity: 1, duration: 0.5 }, 1.9)
          // palavras: de grafite para branco, uma a uma
          .fromTo(wA, { opacity: 0.16 }, { opacity: 1, duration: 0.25, stagger: 1.2 / Math.max(wA.length, 1) }, 0)
          // o vão: "e o que ela parece." se afasta, junto com a área acendendo.
          // Só as palavras na mesma linha do início do vão (se o trecho quebrar
          // de linha, a linha de baixo fica no lugar, sem recuo estranho).
          .fromTo(
            gapA,
            { x: 0 },
            {
              x: (_: number, el: HTMLElement) =>
                el.offsetTop === gapA[0].offsetTop ? em(gapA[0]) * (mobile ? 0.3 : 0.75) : 0,
              duration: 0.7,
              ease: "power2.out",
            },
            1.4,
          );

        // ---------- B: parte do estado final de A ----------
        prepDraw(q("gb-curva-marca-depois"));
        const tlB = scrubbed("b")
          .fromTo(q("gb-marco-direcao"), { opacity: 0 }, { opacity: 1, duration: 0.5 }, 0)
          .fromTo(q("gb-curva-marca-fantasma"), { opacity: 0 }, { opacity: 1, duration: 0.5 }, 0.3)
          .to(q("gb-curva-marca-depois"), { strokeDashoffset: 0, duration: 1.4 }, 0.6)
          .to(q("gb-area-distancia"), { opacity: 0, duration: 1.4 }, 0.6)
          .fromTo(q("gb-rotulos"), { opacity: 0 }, { opacity: 1, duration: 0.4 }, 1.8);
        // custos entram um a um, com um tremor curto de glitch
        words("b", '[data-w][data-tag="hit"]').forEach((w, i) => {
          const at = 0.1 + i * 0.22;
          tlB
            .fromTo(w, { opacity: 0 }, { opacity: 1, duration: 0.02 }, at)
            .fromTo(w, { x: -4, skewX: 12 }, { x: 3, skewX: -8, duration: 0.03 }, at)
            .to(w, { x: 0, skewX: 0, duration: 0.03 }, at + 0.03);
        });
        // "Meu trabalho é fechá-la.": letras espaçadas que se fecham (por x, sem reflow)
        const closeWords = words("b", '[data-w][data-tag="close"]');
        tlB.fromTo(closeWords, { opacity: 0 }, { opacity: 1, duration: 0.3 }, 0.6);
        // como um letter-spacing de 0,4em: cada letra desloca 0,4em a mais que a
        // anterior, acumulando ao longo da frase (palavras seguintes também)
        let carry = 0;
        closeWords.forEach((w) => {
          const chars = gsap.utils.toArray<HTMLElement>(w.querySelectorAll("[data-ch]"));
          const step = em(w) * 0.4;
          const base = carry;
          tlB.fromTo(chars, { x: (i: number) => base + i * step }, { x: 0, duration: 1.4, ease: "power2.out" }, 0.6);
          carry += chars.length * step;
        });

        // ---------- C: pontos se alinham; letras se encaixam ----------
        const tlC = scrubbed("c");
        charts.cStart.forEach((p, i) => {
          const g = q(p.id);
          if (!g) return;
          const at = i * 0.3;
          tlC
            .fromTo(g, { x: p.dx, y: p.dy }, { x: 0, y: 0, duration: 0.9 }, at)
            .fromTo(
              g.querySelectorAll("line, polyline"),
              { rotation: p.angle, svgOrigin: `${p.cx} ${p.cy}` },
              { rotation: 0, svgOrigin: `${p.cx} ${p.cy}`, duration: 0.9 },
              at,
            );
        });
        const axis = [q("gc-eixo-comum"), q("gc-eixo-comum")?.nextElementSibling ?? null].filter(Boolean);
        const arrowsEnd = tlC.duration();
        tlC.fromTo(axis, { opacity: 0 }, { opacity: 1, duration: 0.5 }, Math.max(arrowsEnd - 0.3, 0));
        const charsC = words("c", "[data-ch]");
        const rnd = gsap.utils.random(-1, 1, 0.01, true);
        tlC.fromTo(
          charsC,
          {
            y: () => rnd() * em(charsC[0]) * 0.16,
            rotation: () => rnd() * 7,
            webkitTextStrokeWidth: () => `${Math.abs(rnd()) * 1.1}px`,
          },
          {
            y: 0,
            rotation: 0,
            webkitTextStrokeWidth: "0px",
            duration: 0.9,
            ease: "power2.out",
            stagger: { amount: Math.max(arrowsEnd - 0.9, 0.3), from: "random" },
          },
          0,
        );
        // reflexo prata em "confiar", uma vez, quando a frase termina de encaixar
        const shine = section.querySelectorAll<HTMLElement>('[data-step="c"] [data-tag="shine"] [data-ch]');
        if (shine.length) {
          ScrollTrigger.create({
            trigger: fig("c"),
            start: "center center",
            once: true,
            onEnter: () => {
              const first = shine[0].getBoundingClientRect();
              const lastR = shine[shine.length - 1].getBoundingClientRect();
              const vw = window.innerWidth;
              // gradiente em coordenadas da tela (background-attachment: fixed,
              // 300vw com a faixa no meio): a faixa atravessa a palavra inteira,
              // letra por letra, e para fora dela, à direita
              gsap.fromTo(
                shine,
                { backgroundPositionX: first.left - 120 - vw * 1.5 },
                { backgroundPositionX: lastR.right + 120 - vw * 1.5, duration: 1.1, ease: "power2.inOut" },
              );
            },
          });
        }
      });
    },
    { scope: root },
  );

  const svgs = [charts.a, charts.b, charts.c];

  return (
    <section
      ref={root}
      id="distancia"
      data-theme="gradient"
      aria-labelledby="distancia-title"
      className="relative z-10 overflow-x-clip"
    >
      <div className="mx-auto w-full max-w-[1600px] px-6 pb-[clamp(6rem,16vh,12rem)] pt-[clamp(6rem,16vh,12rem)] md:px-12">
        <h2 id="distancia-title" className="font-mono text-[11px] font-normal uppercase tracking-[0.28em] text-silver">
          {copy.eyebrow}
        </h2>

        <div className="mt-12 grid gap-[clamp(6rem,22vh,14rem)] md:mt-16">
          {copy.charts.map((chart, i) => {
            const step = STEPS[i];
            const marked = markWords(chart);
            return (
              <div key={step} data-step={step} className="grid items-center gap-8 md:grid-cols-12 md:gap-10">
                {/* aria-label: a frase inteira para leitores de tela; translate="no":
                    palavras em <span> isolados viram lixo no tradutor automático */}
                <h3
                  aria-label={chart.text}
                  translate="no"
                  className="text-[clamp(1.7rem,3.4vw,3.5rem)] font-semibold leading-[1.05] tracking-[-0.05em] md:col-span-5"
                >
                  {marked.map((w, k) => {
                    // letras separadas só onde a animação mexe nelas
                    const perChar = step === "c" || w.tag === "close";
                    return (
                      <Fragment key={k}>
                        <span
                          aria-hidden="true"
                          data-w
                          data-tag={w.tag}
                          className="inline-block whitespace-nowrap will-change-transform"
                        >
                          {perChar
                            ? [...w.text].map((ch, c) => (
                                <span
                                  key={c}
                                  data-ch
                                  className={`inline-block ${w.tag === "shine" ? "text-shine-fixed" : ""}`}
                                >
                                  {ch}
                                </span>
                              ))
                            : w.text}
                        </span>{" "}
                      </Fragment>
                    );
                  })}
                </h3>
                <figure
                  data-chart={step}
                  className="w-full md:col-span-7 [&>svg]:max-h-[70svh]"
                  // SVG do dono, lido do disco no build (conteúdo próprio, não de usuário)
                  dangerouslySetInnerHTML={{ __html: svgs[i] }}
                />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

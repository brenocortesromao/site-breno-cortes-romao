"use client";

import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { revealOnce } from "@/lib/reveal";
import type { DistanceCharts } from "@/content/charts";
import { DecodeLetters, decode, hideLetters, shine, showLetters } from "@/components/decode";
import FlowField, { type FlowStage } from "@/components/graphics/FlowField";
import { scrubFor } from "@/lib/mobile";

/**
 * Fundo em fluxo (FlowField), uma etapa por bloco: 1) correntes bem separadas
 * (a distância); 2) mais agitado (fechando a distância); 3) as correntes voltam
 * a se aproximar (o gráfico 3 termina com tudo alinhado na "mesma direção").
 */
const FLOW_STAGES: FlowStage[] = [
  { separation: 1, turbulence: 1 },
  { separation: 0.9, turbulence: 1.9 },
  { separation: 0.12, turbulence: 0.8 },
];

gsap.registerPlugin(useGSAP, ScrollTrigger);

export type DistanceCopy = {
  eyebrow: string;
  /**
   * Texto de cada bloco (A, B, C), conforme o CONTEUDO-SITE.md, e a
   * palavra-chave que recebe o reflexo prata no fim da decodificação
   * (localizada dentro do texto, então o texto segue limpo e traduzível).
   */
  charts: { text: string; highlight?: string }[];
};

const STEPS = ["a", "b", "c"] as const;

/** Prepara um path para ser "desenhado": dash = comprimento total, escondido. */
function prepDraw(path: Element | null) {
  if (!(path instanceof SVGPathElement)) return 0;
  const len = path.getTotalLength();
  gsap.set(path, { strokeDasharray: len, strokeDashoffset: len });
  return len;
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
 * As três frases usam o MESMO efeito, por gatilho (não scrub): DECODIFICAÇÃO
 * letra por letra (components/decode.tsx), ~1,6 s por frase, e no fim um reflexo prata
 * na palavra-chave (`highlight`: "distância", "fechá-la", "confiar").
 * Sem layout shift: cada letra real fica no lugar como reserva (invisível até
 * travar) e o caractere aleatório é uma camada absoluta por cima, então as
 * quebras de linha são as da frase final.
 * O texto fica inteiro no HTML (letras em <span>, camadas aleatórias vazias no
 * servidor; aria-label com a frase completa). Sem JS ou com
 * prefers-reduced-motion: frase final estática, gráficos no estado final.
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
        const ease = "none";
        const scrubbed = (s: string) =>
          gsap.timeline({
            defaults: { ease },
            scrollTrigger: { trigger: fig(s), start: "top bottom", end: "center center", scrub: scrubFor(0.5), invalidateOnRefresh: true },
          });

        // ---------- A: eixos, curvas desenhadas, área da distância ----------
        prepDraw(q("ga-curva-negocio"));
        prepDraw(q("ga-curva-marca"));
        scrubbed("a")
          .fromTo([q("ga-eixos"), q("ga-rotulos-eixos")], { opacity: 0 }, { opacity: 1, duration: 0.5 }, 0)
          .to([q("ga-curva-negocio"), q("ga-curva-marca")], { strokeDashoffset: 0, duration: 1.5 }, 0.2)
          .fromTo(q("ga-rotulos"), { opacity: 0 }, { opacity: 1, duration: 0.4 }, 1.4)
          .fromTo([q("ga-area-distancia"), q("ga-area-brilho")], { opacity: 0 }, { opacity: 1, duration: 0.7 }, 1.4)
          .fromTo([q("ga-rotulo-distancia"), q("ga-nota")], { opacity: 0 }, { opacity: 1, duration: 0.5 }, 1.9);

        // ---------- B: parte do estado final de A ----------
        prepDraw(q("gb-curva-marca-depois"));
        scrubbed("b")
          .fromTo(q("gb-marco-direcao"), { opacity: 0 }, { opacity: 1, duration: 0.5 }, 0)
          .fromTo(q("gb-curva-marca-fantasma"), { opacity: 0 }, { opacity: 1, duration: 0.5 }, 0.3)
          .to(q("gb-curva-marca-depois"), { strokeDashoffset: 0, duration: 1.4 }, 0.6)
          .to(q("gb-area-distancia"), { opacity: 0, duration: 1.4 }, 0.6)
          .fromTo(q("gb-rotulos"), { opacity: 0 }, { opacity: 1, duration: 0.4 }, 1.8);

        // ---------- C: pontos se alinham no eixo comum ----------
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
        tlC.fromTo(axis, { opacity: 0 }, { opacity: 1, duration: 0.5 }, Math.max(tlC.duration() - 0.3, 0));

        // ---------- frases: decodificação ao entrar na tela, uma vez ----------
        const cleanups: (() => void)[] = [];
        section.querySelectorAll<HTMLElement>("[data-decode]").forEach((phrase) => {
          hideLetters(phrase);
          cleanups.push(
            revealOnce({
              trigger: phrase,
              start: "top 85%",
              play: () => cleanups.push(decode(phrase, () => shine(phrase))),
              finish: () => showLetters(phrase),
            }),
          );
        });
        return () => cleanups.forEach((fn) => fn());
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
      <FlowField stagesSelector="[data-step]" stages={FLOW_STAGES} dimSelector="[data-step] h3, [data-chart]" />
      <div className="m-sec relative z-10 mx-auto w-full max-w-[1600px] px-6 pb-[clamp(6rem,16lvh,12rem)] pt-[clamp(6rem,16lvh,12rem)] md:px-12">
        <h2 id="distancia-title" className="font-mono text-[11px] font-normal uppercase tracking-[0.28em] text-silver m-center">
          {copy.eyebrow}
        </h2>

        <div className="m-g16 mt-12 grid gap-[clamp(6rem,22lvh,14rem)] md:mt-16">
          {copy.charts.map((chart, i) => {
            const step = STEPS[i];
            return (
              <div key={step} data-step={step} className="grid items-center gap-8 md:grid-cols-12 md:gap-10">
                {/* aria-label: a frase inteira para leitores de tela; translate="no":
                    letras em <span> isolados viram lixo no tradutor automático */}
                <h3
                  aria-label={chart.text}
                  translate="no"
                  data-decode
                  className="text-[clamp(1.7rem,3.4vw,3.5rem)] font-semibold leading-[1.05] tracking-[-0.05em] m-center md:col-span-5"
                >
                  <DecodeLetters text={chart.text} highlight={chart.highlight} />
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

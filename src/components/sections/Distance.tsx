"use client";

import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import type { DistanceCharts } from "@/content/charts";

gsap.registerPlugin(useGSAP, ScrollTrigger);

export type DistanceCopy = {
  eyebrow: string;
  /** Texto de cada bloco (A, B, C), conforme o CONTEUDO-SITE.md. */
  charts: { text: string }[];
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
 * bloco tem o texto à esquerda (sempre legível) e o gráfico do dono à direita
 * (public/graficos/, inline com ids ga-/gb-/gc-; ver src/content/charts.ts):
 *  A. curvas + área "A DISTÂNCIA";
 *  B. marco "DIREÇÃO DE MARCA", fantasma "SEM DIREÇÃO" e a marca subindo até o
 *     negócio enquanto a área some (começa no estado final de A);
 *  C. consistência: pontos se alinham no eixo comum.
 * Cada gráfico é animado por SCRUB curto: começa quando o bloco entra pela base
 * da tela e termina quando o gráfico chega ao centro (cerca de meia tela). Se
 * a rolagem parar, o gráfico fica onde está; no centro, está completo.
 * Sem JS ou com prefers-reduced-motion, os gráficos aparecem no estado final.
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
            scrollTrigger: { trigger: fig(s), start: "top bottom", end: "center center", scrub: 0.5 },
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
      });
    },
    { scope: root },
  );

  const svgs = [charts.a, charts.b, charts.c];

  return (
    <section ref={root} id="distancia" data-theme="gradient" aria-labelledby="distancia-title" className="relative z-10">
      <div className="mx-auto w-full max-w-[1600px] px-6 pb-[clamp(6rem,16vh,12rem)] pt-[clamp(6rem,16vh,12rem)] md:px-12">
        <h2 id="distancia-title" className="font-mono text-[11px] font-normal uppercase tracking-[0.28em] text-silver">
          {copy.eyebrow}
        </h2>

        <div className="mt-12 grid gap-[clamp(6rem,22vh,14rem)] md:mt-16">
          {copy.charts.map((chart, i) => (
            <div key={STEPS[i]} data-step={STEPS[i]} className="grid items-center gap-8 md:grid-cols-12 md:gap-10">
              <h3 className="text-[clamp(1.7rem,3.4vw,3.5rem)] font-semibold leading-[1.05] tracking-[-0.05em] md:col-span-5">
                {chart.text}
              </h3>
              <figure
                data-chart={STEPS[i]}
                className="w-full md:col-span-7 [&>svg]:max-h-[70svh]"
                // SVG do dono, lido do disco no build (conteúdo próprio, não de usuário)
                dangerouslySetInnerHTML={{ __html: svgs[i] }}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

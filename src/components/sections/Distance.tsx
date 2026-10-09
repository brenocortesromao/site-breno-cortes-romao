"use client";

import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import type { DistanceCharts } from "@/content/charts";

gsap.registerPlugin(useGSAP, ScrollTrigger);

export type DistanceCopy = {
  eyebrow: string;
  /** Texto de cada etapa (A, B, C), conforme o CONTEUDO-SITE.md. */
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
 * "A distância" — UMA cena fixa (pin) com 3 etapas, gráficos do dono
 * (public/graficos/, inline com ids ga-/gb-/gc-; ver src/content/charts.ts):
 *  1. curvas + área "A DISTÂNCIA" (gráfico A);
 *  2. marco "DIREÇÃO DE MARCA", fantasma "SEM DIREÇÃO" e a marca subindo até o
 *     negócio enquanto a área some (gráfico B — mesmo enquadramento de A, então
 *     a troca é invisível);
 *  3. consistência: pontos se alinham no eixo comum (gráfico C).
 * Cada etapa é uma ANIMAÇÃO COM GATILHO (~2,5 s, toca até o fim mesmo se a
 * rolagem parar); voltar o scroll reverte. Texto troca com fade; indicador 1/3.
 * Pin de 1 tela extra → a seção ocupa ~2 alturas de tela.
 * Modo "scene" ligado por JS (data-mode); sem JS ou com prefers-reduced-motion,
 * as 3 etapas aparecem empilhadas, no estado final e estáticas.
 */
export default function Distance({ copy, charts }: { copy: DistanceCopy; charts: DistanceCharts }) {
  const root = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const counter = useRef<HTMLSpanElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const section = root.current!;
        section.dataset.mode = "scene";
        const q = (id: string) => section.querySelector(`#${id}`);
        const layer = (s: string) => section.querySelector(`[data-step="${s}"]`);
        const text = (s: string) => layer(s)?.querySelector("[data-step-text]") ?? null;
        const fig = (s: string) => layer(s)?.querySelector("figure") ?? null;

        // ---------- estados iniciais ----------
        gsap.set([layer("b"), layer("c")], { autoAlpha: 0 });
        gsap.set(text("a"), { autoAlpha: 0, y: 16 });
        gsap.set([q("ga-eixos"), q("ga-rotulos-eixos"), q("ga-rotulos"), q("ga-area-distancia"), q("ga-area-brilho"), q("ga-rotulo-distancia"), q("ga-nota")], { opacity: 0 });
        prepDraw(q("ga-curva-negocio"));
        prepDraw(q("ga-curva-marca"));
        // B começa no estado em que A termina (eixos, negócio, marca até o marco, área)
        gsap.set([q("gb-marco-direcao"), q("gb-curva-marca-fantasma"), q("gb-rotulos")], { opacity: 0 });
        prepDraw(q("gb-curva-marca-depois"));
        gsap.set(text("b"), { autoAlpha: 0, y: 16 });
        gsap.set(text("c"), { autoAlpha: 0, y: 16 });
        gsap.set([q("gc-eixo-comum"), q("gc-eixo-comum")?.nextElementSibling ?? null].filter(Boolean), { opacity: 0 });
        charts.cStart.forEach((p) => {
          const g = q(p.id);
          if (!g) return;
          gsap.set(g, { x: p.dx, y: p.dy });
          gsap.set(g.querySelectorAll("line, polyline"), { rotation: p.angle, svgOrigin: `${p.cx} ${p.cy}` });
        });

        // ---------- etapas (pausadas; tocam por gatilho) ----------
        const ease = "power2.inOut";
        const tl1 = gsap
          .timeline({ paused: true, defaults: { ease } })
          .to(text("a"), { autoAlpha: 1, y: 0, duration: 0.7 }, 0)
          .to([q("ga-eixos"), q("ga-rotulos-eixos")], { opacity: 1, duration: 0.5 }, 0)
          .to([q("ga-curva-negocio"), q("ga-curva-marca")], { strokeDashoffset: 0, duration: 1.5 }, 0.3)
          .to(q("ga-rotulos"), { opacity: 1, duration: 0.4 }, 1.5)
          .to([q("ga-area-distancia"), q("ga-area-brilho")], { opacity: 1, duration: 0.7 }, 1.6)
          .to([q("ga-rotulo-distancia"), q("ga-nota")], { opacity: 1, duration: 0.5 }, 2.1);

        const tl2 = gsap
          .timeline({ paused: true, defaults: { ease } })
          .to(text("a"), { autoAlpha: 0, y: -16, duration: 0.5 }, 0)
          .set(layer("b"), { autoAlpha: 1 }, 0)
          .to(fig("a"), { autoAlpha: 0, duration: 0.4 }, 0)
          .to(text("b"), { autoAlpha: 1, y: 0, duration: 0.7 }, 0.3)
          .to(q("gb-marco-direcao"), { opacity: 1, duration: 0.5 }, 0.3)
          .to(q("gb-curva-marca-fantasma"), { opacity: 1, duration: 0.5 }, 0.6)
          .to(q("gb-curva-marca-depois"), { strokeDashoffset: 0, duration: 1.4, ease: "power2.in" }, 0.8)
          .to(q("gb-area-distancia"), { opacity: 0, duration: 1.4 }, 0.8)
          .to(q("gb-rotulos"), { opacity: 1, duration: 0.4 }, 2.1);

        const tl3 = gsap
          .timeline({ paused: true, defaults: { ease } })
          .to(layer("b"), { autoAlpha: 0, duration: 0.5 }, 0)
          .set(layer("c"), { autoAlpha: 1 }, 0.3)
          .to(text("c"), { autoAlpha: 1, y: 0, duration: 0.7 }, 0.4);
        charts.cStart.forEach((p, i) => {
          const g = q(p.id);
          if (!g) return;
          const at = 0.5 + i * 0.3;
          tl3
            .to(g, { x: 0, y: 0, duration: 0.9 }, at)
            .to(g.querySelectorAll("line, polyline"), { rotation: 0, svgOrigin: `${p.cx} ${p.cy}`, duration: 0.9 }, at);
        });
        tl3.to([q("gc-eixo-comum"), q("gc-eixo-comum")?.nextElementSibling ?? null].filter(Boolean), { opacity: 1, duration: 0.5 }, 2.1);

        const steps = [tl1, tl2, tl3];
        let current = 0; // 0 = nada mostrado
        const goTo = (n: number) => {
          // avançar: toca as etapas na ordem; voltar: reverte
          while (current < n) steps[current++].timeScale(1).play();
          while (current > n) steps[--current].timeScale(1.4).reverse();
          if (counter.current) counter.current.textContent = `${Math.max(n, 1)}/3`;
        };

        // pin de 1 tela extra; etapas 2 e 3 em ~30% e ~70% do trecho fixo
        ScrollTrigger.create({
          trigger: stage.current,
          start: "top top",
          end: "+=100%",
          pin: true,
          onUpdate: (self) => goTo(self.progress < 0.3 ? 1 : self.progress < 0.7 ? 2 : 3),
        });
        // etapa 1 começa quando a cena chega à tela (antes de fixar)
        ScrollTrigger.create({
          trigger: stage.current,
          start: "top 60%",
          onEnter: () => current === 0 && goTo(1),
          onLeaveBack: () => goTo(0),
        });

        return () => {
          delete section.dataset.mode;
        };
      });
    },
    { scope: root },
  );

  const svgs = [charts.a, charts.b, charts.c];

  return (
    <section ref={root} id="distancia" data-theme="gradient" aria-labelledby="distancia-title" className="group relative z-10">
      <div
        ref={stage}
        className="mx-auto w-full max-w-[1600px] px-6 pb-16 pt-[clamp(6rem,16vh,12rem)] md:px-12 group-data-[mode=scene]:flex group-data-[mode=scene]:h-svh group-data-[mode=scene]:flex-col group-data-[mode=scene]:pb-10 group-data-[mode=scene]:pt-28"
      >
        {/* topo da cena: rótulo + indicador de etapa (respiro abaixo do cabeçalho fixo) */}
        <div className="flex items-center justify-between">
          <h2 id="distancia-title" className="font-mono text-[11px] font-normal uppercase tracking-[0.28em] text-silver">
            {copy.eyebrow}
          </h2>
          <span
            ref={counter}
            aria-hidden="true"
            className="hidden font-mono text-[11px] tracking-[0.28em] text-silver group-data-[mode=scene]:inline"
          >
            1/3
          </span>
        </div>

        {/* etapas: empilhadas (estático) ou sobrepostas na mesma área (cena) */}
        <div className="mt-10 grid gap-24 group-data-[mode=scene]:mt-6 group-data-[mode=scene]:flex-1 group-data-[mode=scene]:gap-0">
          {copy.charts.map((chart, i) => (
            <div
              key={STEPS[i]}
              data-step={STEPS[i]}
              className="grid content-center items-center gap-8 md:grid-cols-12 group-data-[mode=scene]:[grid-area:1/1]"
            >
              <h3
                data-step-text
                className="text-[clamp(1.7rem,3.4vw,3.5rem)] font-semibold leading-[1.05] tracking-[-0.05em] md:col-span-5"
              >
                {chart.text}
              </h3>
              <figure
                data-chart={STEPS[i]}
                className="w-full md:col-span-7 group-data-[mode=scene]:max-h-[62svh] group-data-[mode=scene]:[&>svg]:max-h-[62svh]"
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

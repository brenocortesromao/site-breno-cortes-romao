"use client";

import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP, ScrollTrigger);

export type DistanceCopy = {
  eyebrow: string;
  note: string;
  labels: { business: string; brand: string; gap: string; direction: string; touchpoints: string[] };
  charts: { text: string }[];
};

/* ---------- Geometria conceitual (SEM escala numérica) ---------- */
const W = 600;
const H = 360;
const X0 = 40;
const X1 = 570;
const Y0 = 320; // base
const MARK = 0.5; // ponto "direção de marca" (fração do eixo x)

const business = (t: number) => Y0 - 290 * Math.pow(t, 0.85);
const brand = (t: number) => Y0 - 120 * Math.pow(t, 1.7);
const ease = (k: number) => k * k * (3 - 2 * k);
/** Marca depois da direção: acelera e alcança o negócio no fim. */
const brandClosing = (t: number) =>
  t <= MARK ? brand(t) : brand(t) + (business(t) - brand(t)) * ease((t - MARK) / (1 - MARK));

const pts = (fn: (t: number) => number, from = 0, to = 1, n = 60) =>
  Array.from({ length: n + 1 }, (_, i) => {
    const t = from + ((to - from) * i) / n;
    return [X0 + (X1 - X0) * t, fn(t)] as const;
  });
const line = (p: readonly (readonly [number, number])[]) =>
  "M" + p.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join("L");
const area = (top: readonly (readonly [number, number])[], bottom: readonly (readonly [number, number])[]) =>
  line(top) + "L" + [...bottom].reverse().map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join("L") + "Z";

const businessPts = pts(business);
const brandPts = pts(brand);
const markX = X0 + (X1 - X0) * MARK;

function Axes() {
  return (
    <g stroke="var(--line)" strokeWidth="1">
      <line x1={X0} y1={Y0} x2={X1 + 10} y2={Y0} />
      <line x1={X0} y1={Y0} x2={X0} y2={20} />
    </g>
  );
}

function Label({ x, y, children, anchor = "start", ...rest }: { x: number; y: number; children: string; anchor?: "start" | "middle" | "end" } & Record<string, unknown>) {
  return (
    <text
      x={x}
      y={y}
      textAnchor={anchor}
      className="fill-silver font-mono text-[11px] uppercase tracking-[0.16em]"
      {...rest}
    >
      {children}
    </text>
  );
}

/**
 * "A distância": três gráficos CONCEITUAIS (sem números, nota "ilustrativo"),
 * cada um desenhado com o scroll enquanto atravessa a tela.
 * A: negócio sobe forte, marca fica para trás, a área entre elas acende.
 * B: mesma cena; no ponto "direção de marca" a marca acelera e alcança.
 * C: pontos de contato dispersos se alinham num mesmo eixo.
 * O SVG final (estado completo) está no HTML; o GSAP só define os estados
 * iniciais — com reduced motion ou sem JS, os gráficos aparecem prontos.
 */
export default function Distance({ copy }: { copy: DistanceCopy }) {
  const root = useRef<HTMLElement>(null);
  const L = copy.labels;
  const tps = L.touchpoints;
  // dispersão inicial dos pontos de contato (ângulo em graus, deslocamento y)
  const scatter = [
    [-28, -70],
    [22, 40],
    [-12, 90],
    [34, -30],
  ];

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const scrub = (trigger: Element) => ({ trigger, start: "top 72%", end: "center 42%", scrub: 0.8 });
        const figs = gsap.utils.toArray<HTMLElement>("[data-chart]");

        // A
        gsap
          .timeline({ scrollTrigger: scrub(figs[0]) })
          .from(figs[0].querySelectorAll("[data-draw]"), { strokeDashoffset: 1, duration: 1, stagger: 0.25, ease: "none" })
          .from(figs[0].querySelectorAll("[data-gap]"), { opacity: 0, duration: 0.5 }, ">-0.2")
          .from(figs[0].querySelectorAll("[data-label]"), { opacity: 0, y: 8, duration: 0.4, stagger: 0.1 }, "<");

        // B
        gsap
          .timeline({ scrollTrigger: scrub(figs[1]) })
          .from(figs[1].querySelectorAll("[data-mark]"), { opacity: 0, duration: 0.3 })
          .from(figs[1].querySelectorAll("[data-draw]"), { strokeDashoffset: 1, duration: 1, ease: "none" })
          .from(figs[1].querySelectorAll("[data-gap]"), { opacity: 0, duration: 0.4 }, "<0.3")
          .from(figs[1].querySelectorAll("[data-label]"), { opacity: 0, y: 8, duration: 0.4, stagger: 0.1 }, "<");

        // C
        const tl = gsap.timeline({ scrollTrigger: scrub(figs[2]) });
        figs[2].querySelectorAll<SVGGElement>("[data-tp]").forEach((g, i) => {
          tl.from(g, { rotation: scatter[i][0], y: scatter[i][1], svgOrigin: `${g.dataset.cx} ${g.dataset.cy}`, duration: 1, ease: "power2.out" }, i * 0.08);
        });
        tl.from(figs[2].querySelectorAll("[data-axis]"), { opacity: 0, duration: 0.4 }, 0.7);
      });
    },
    { scope: root },
  );

  const figClass = "w-full max-w-3xl";
  const noteEl = (
    <span className="mt-3 block text-right font-mono text-[10px] uppercase tracking-[0.2em] text-silver">{copy.note}</span>
  );

  return (
    <section ref={root} id="distancia" data-theme="gradient" aria-labelledby="distancia-title" className="relative z-10">
      <div className="mx-auto w-full max-w-[1600px] px-6 pt-[clamp(6rem,16vh,12rem)] md:px-12">
        <h2 id="distancia-title" className="font-mono text-[11px] font-normal uppercase tracking-[0.28em] text-silver">
          {copy.eyebrow}
        </h2>
      </div>

      {copy.charts.map((chart, i) => (
        <div key={i} className="mx-auto grid min-h-svh w-full max-w-[1600px] items-center gap-10 px-6 py-16 md:grid-cols-12 md:gap-8 md:px-12">
          <h3 className="text-[clamp(1.9rem,3.6vw,3.75rem)] font-semibold leading-[1.04] tracking-[-0.05em] md:col-span-5">
            {chart.text}
          </h3>
          <figure data-chart className={`${figClass} md:col-span-7`}>
            <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={chart.text} className="w-full overflow-visible">
              <Axes />
              {i === 0 && (
                <>
                  <path data-gap d={area(businessPts, brandPts)} fill="var(--fg)" opacity="0.08" />
                  <path data-draw d={line(businessPts)} pathLength={1} strokeDasharray="1" fill="none" stroke="var(--fg)" strokeWidth="2" />
                  <path data-draw d={line(brandPts)} pathLength={1} strokeDasharray="1" fill="none" stroke="var(--muted)" strokeWidth="2" />
                  <Label data-label x={X1} y={business(1) - 10} anchor="end">{L.business}</Label>
                  <Label data-label x={X1} y={brand(1) + 22} anchor="end">{L.brand}</Label>
                  <Label data-label x={X0 + (X1 - X0) * 0.72} y={(business(0.72) + brand(0.72)) / 2 + 4} anchor="middle">{L.gap}</Label>
                </>
              )}
              {i === 1 && (
                <>
                  <path d={line(businessPts)} fill="none" stroke="var(--fg)" strokeWidth="2" />
                  <path d={line(pts(brand, MARK, 1))} fill="none" stroke="var(--muted)" strokeWidth="1" strokeDasharray="4 6" opacity="0.5" />
                  <path d={line(pts(brand, 0, MARK))} fill="none" stroke="var(--muted)" strokeWidth="2" />
                  <path data-gap d={area(pts(business, MARK, 1), pts(brandClosing, MARK, 1))} fill="var(--fg)" opacity="0.08" />
                  <g data-mark>
                    <line x1={markX} y1={Y0} x2={markX} y2={30} stroke="var(--line)" strokeDasharray="3 5" />
                    <circle cx={markX} cy={brand(MARK)} r="4" fill="var(--fg)" />
                    <Label x={markX + 10} y={44}>{L.direction}</Label>
                  </g>
                  <path data-draw d={line(pts(brandClosing, MARK, 1))} pathLength={1} strokeDasharray="1" fill="none" stroke="var(--fg)" strokeWidth="2" />
                  <Label data-label x={X1} y={business(1) - 10} anchor="end">{`${L.business} · ${L.brand}`}</Label>
                </>
              )}
              {i === 2 && (
                <>
                  <line data-axis x1={X0} y1={H / 2} x2={X1} y2={H / 2} stroke="var(--line)" />
                  {tps.map((tp, k) => {
                    const cx = X0 + 70 + k * ((X1 - X0 - 140) / Math.max(tps.length - 1, 1));
                    const cy = H / 2;
                    return (
                      <g key={tp} data-tp data-cx={cx} data-cy={cy}>
                        <line x1={cx - 46} y1={cy} x2={cx + 46} y2={cy} stroke="var(--fg)" strokeWidth="2" />
                        <circle cx={cx} cy={cy} r="5" fill="var(--fg)" />
                        <Label x={cx} y={cy - 18} anchor="middle">{tp}</Label>
                      </g>
                    );
                  })}
                </>
              )}
            </svg>
            <figcaption className="sr-only">{chart.text}</figcaption>
            {noteEl}
          </figure>
        </div>
      ))}
    </section>
  );
}

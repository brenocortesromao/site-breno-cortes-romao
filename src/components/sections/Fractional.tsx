"use client";

import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import GraphicLayer from "@/components/graphics/GraphicLayer";
import { protectTerms } from "@/components/Term";

gsap.registerPlugin(useGSAP, ScrollTrigger);

export type FractionalCopy = {
  eyebrow: string;
  title: string;
  text: string;
  compare: {
    caption: string;
    columns: string[];
    rows: { label: string; values: string[] }[];
  };
  note: string;
  /** Únicos dados externos permitidos no site (verificados, com fonte). */
  stats: {
    title: string;
    items: { prefix: string; value: number; suffix: string; caption: string }[];
    support: string;
    source: string;
  };
};

/** Índice da coluna em destaque (Fractional). */
const HIGHLIGHT = 2;

/**
 * "O que é fractional" — seção CLARA (off-white) com curvas de nível.
 * Comparativo: as 3 colunas entram uma a uma quando o quadro chega à tela
 * (desktop: tabela; mobile: 3 cartões). A coluna Fractional fica em destaque.
 */
export default function Fractional({ copy }: { copy: FractionalCopy }) {
  const root = useRef<HTMLElement>(null);
  const board = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        // números contam de 0 até o valor ao entrar na tela (uma vez). O HTML do
        // servidor já traz o valor final: sem JS / reduced motion, ficam estáticos.
        gsap.utils.toArray<HTMLElement>("[data-count]").forEach((el, i) => {
          const end = Number(el.dataset.count);
          const n = { v: 0 };
          gsap.to(n, {
            v: end,
            duration: 2,
            delay: i * 0.25,
            ease: "power3.out",
            onUpdate: () => {
              el.textContent = String(Math.round(n.v));
            },
            scrollTrigger: { trigger: "[data-stats]", start: "top 75%", once: true },
          });
        });
        gsap.from("[data-stat]", {
          autoAlpha: 0,
          y: 30,
          duration: 1,
          ease: "power3.out",
          stagger: 0.25,
          scrollTrigger: { trigger: "[data-stats]", start: "top 75%", once: true },
        });

        const tl = gsap.timeline({
          scrollTrigger: { trigger: board.current, start: "top 72%" },
        });
        copy.compare.columns.forEach((_, c) => {
          tl.from(
            `[data-col="${c}"]`,
            { autoAlpha: 0, y: 28, duration: 0.9, ease: "power3.out", stagger: 0.04 },
            c * 0.35,
          );
        });
      });
    },
    { scope: root },
  );

  const { columns, rows } = copy.compare;

  return (
    <section
      ref={root}
      id="fractional"
      data-theme="light"
      aria-labelledby="fractional-title"
      className="relative z-10 min-h-svh overflow-hidden"
    >
      <GraphicLayer variant="contours-a" />
      <div className="relative mx-auto w-full max-w-[1600px] px-6 py-[clamp(6rem,16vh,12rem)] md:px-12">
        <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-silver">
          {protectTerms(copy.eyebrow)}
        </p>
        <div className="mt-6 grid gap-10 md:grid-cols-12 md:gap-8">
          <h2 id="fractional-title" className="text-[clamp(2.3rem,5vw,5.5rem)] font-semibold leading-[0.98] tracking-[-0.055em] md:col-span-8">
            {protectTerms(copy.title)}
          </h2>
          <p className="max-w-md self-end text-base leading-relaxed text-silver md:col-span-4 md:text-[17px]">
            {protectTerms(copy.text)}
          </p>
        </div>

        {/* Dados verificados: dois números gigantes (empilhados no mobile) */}
        <figure data-stats className="mt-16 md:mt-24">
          <h3 className="text-[clamp(1.4rem,2.2vw,2.2rem)] font-semibold tracking-[-0.035em]">
            {protectTerms(copy.stats.title)}
          </h3>
          <dl className="mt-8 grid gap-10 border-t border-line pt-8 md:grid-cols-2 md:gap-8">
            {copy.stats.items.map((stat) => (
              <div key={stat.caption} data-stat className="flex flex-col-reverse">
                <dt className="mt-3 max-w-sm text-sm leading-relaxed text-silver md:text-base">
                  {protectTerms(stat.caption)}
                </dt>
                <dd className="text-[clamp(4.5rem,11vw,10rem)] font-semibold leading-[0.9] tracking-[-0.06em] tabular-nums">
                  {stat.prefix}
                  <span data-count={stat.value}>{stat.value}</span>
                  {stat.suffix}
                </dd>
              </div>
            ))}
          </dl>
          <figcaption className="mt-10 max-w-2xl">
            <span className="block text-base leading-relaxed md:text-lg">{protectTerms(copy.stats.support)}</span>
            <span className="mt-3 block font-mono text-[10px] uppercase tracking-[0.18em] text-silver">
              {protectTerms(copy.stats.source)}
            </span>
          </figcaption>
        </figure>

        <div ref={board} className="mt-16 md:mt-24">
          {/* Desktop: tabela semântica */}
          <table className="hidden w-full table-fixed border-collapse text-left md:table">
            <caption className="sr-only">{copy.compare.caption}</caption>
            <thead>
              <tr>
                <th scope="col" className="w-[22%]" />
                {columns.map((col, c) => (
                  <th
                    key={col}
                    scope="col"
                    data-col={c}
                    className={`border-b px-6 pb-5 align-bottom text-[clamp(1.1rem,1.6vw,1.6rem)] font-semibold tracking-[-0.03em] ${
                      c === HIGHLIGHT ? "border-foreground bg-surface/70 pt-5" : "border-line"
                    }`}
                  >
                    {protectTerms(col)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.label}>
                  <th
                    scope="row"
                    className="border-b border-line py-6 pr-6 align-top font-mono text-[11px] font-normal uppercase tracking-[0.22em] text-silver"
                  >
                    {row.label}
                  </th>
                  {row.values.map((value, c) => (
                    <td
                      key={c}
                      data-col={c}
                      className={`border-b px-6 py-6 align-top text-[15px] leading-snug ${
                        c === HIGHLIGHT
                          ? "border-line bg-surface/70 font-medium text-foreground"
                          : "border-line text-silver"
                      }`}
                    >
                      {value}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>

          {/* Mobile: um cartão por modelo */}
          <div className="grid gap-4 md:hidden">
            {columns.map((col, c) => (
              <div
                key={col}
                data-col={c}
                className={`border p-5 ${c === HIGHLIGHT ? "border-foreground bg-surface/70" : "border-line"}`}
              >
                <h3 className="text-xl font-semibold tracking-[-0.03em]">{protectTerms(col)}</h3>
                <dl className="mt-4 grid gap-3">
                  {rows.map((row) => (
                    <div key={row.label} className="grid grid-cols-[7.5rem_1fr] gap-3">
                      <dt className="pt-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-silver">
                        {row.label}
                      </dt>
                      <dd className={`text-sm leading-snug ${c === HIGHLIGHT ? "font-medium" : "text-silver"}`}>
                        {row.values[c]}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            ))}
          </div>

          <p className="mt-10 max-w-xl text-sm leading-relaxed text-silver">{protectTerms(copy.note)}</p>
        </div>
      </div>
    </section>
  );
}

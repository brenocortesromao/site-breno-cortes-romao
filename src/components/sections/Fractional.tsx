"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { revealOnce } from "@/lib/reveal";
import GraphicLayer from "@/components/graphics/GraphicLayer";
import { protectTerms } from "@/components/Term";
import TechnicalText from "@/components/TechnicalText";

gsap.registerPlugin(useGSAP, ScrollTrigger);

export type FractionalCopy = {
  eyebrow: string;
  title: string;
  text: string;
  compare: {
    caption: string;
    /** Rótulo em mono acima do título da coluna em destaque ("O modelo"). */
    highlightLabel: string;
    columns: string[];
    rows: { label: string; values: string[] }[];
  };
  note: string;
  /** Únicos dados externos permitidos no site (verificados, com fonte). */
  stats: {
    title: string;
    /** Complemento abaixo do título (texto de apoio); em en é outro texto, não tradução. */
    lead: string;
    items: { prefix: string; value: number; suffix: string; caption: string }[];
    support: string;
    source: string;
  };
};

/** Índice da coluna em destaque (Fractional). */
const HIGHLIGHT = 2;

/** Cartão da coluna em destaque: um pouco mais claro que o fundo (no preto;
 *  no off-white, um pouco mais escuro), borda prata fina e brilho suave. */
const CARD =
  "rounded-2xl border border-silver/45 bg-[color-mix(in_srgb,var(--fg)_6%,var(--bg))] shadow-[0_0_48px_-6px_color-mix(in_srgb,var(--fg)_16%,transparent)]";

/** Faixa de luz que passa uma vez pelo cartão no fim da entrada. */
function CardShine() {
  return (
    <span aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
      <span
        data-fx-shine
        className="absolute inset-y-0 left-0 w-2/3 opacity-0 bg-[linear-gradient(105deg,transparent_20%,color-mix(in_srgb,var(--fg)_16%,transparent)_50%,transparent_80%)]"
      />
    </span>
  );
}

/** Marcador prata antes de cada célula da coluna em destaque. */
function Marker() {
  return <span aria-hidden="true" className="mt-[0.5em] h-1.5 w-1.5 shrink-0 rounded-full bg-silver" />;
}

/** Cartões do carrossel: cada um vai de 85% da largura (o próximo aparece na borda). */
type Row = { label: string; values: string[] };

/**
 * Mobile (até 767px): comparativo POR CRITÉRIO, um cartão por linha da tabela,
 * num carrossel horizontal com scroll-snap. Cada cartão: critério + contador,
 * resposta do Fractional em destaque (mesmo cartão CARD do desktop) e, abaixo
 * de uma linha fina, Agência e Contratação executiva em linhas compactas.
 * Bolinhas embaixo marcam o cartão ativo. Ao trocar de cartão, a resposta do
 * Fractional entra com fade/blur e as outras duas logo depois (escalonadas);
 * os cartões vizinhos ficam com as respostas apagadas. Decorativo para
 * leitores de tela (aria-hidden): a <table> segue no DOM (sr-only no mobile).
 * Sem JS / reduced motion: tudo visível, sem animação.
 */
function CriteriaCarousel({ columns, rows }: { columns: string[]; rows: Row[] }) {
  const track = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [seen, setSeen] = useState(false);
  const total = String(rows.length).padStart(2, "0");
  const others = columns.map((_, c) => c).filter((c) => c !== HIGHLIGHT);

  // cartão ativo pela posição do scroll horizontal
  useEffect(() => {
    const el = track.current;
    if (!el) return;
    let raf = 0;
    const read = () => {
      raf = 0;
      const cards = el.children as HTMLCollectionOf<HTMLElement>;
      if (cards.length < 2) return;
      const step = cards[1].offsetLeft - cards[0].offsetLeft;
      const max = el.scrollWidth - el.clientWidth;
      const i = el.scrollLeft >= max - 2 ? cards.length - 1 : Math.round(el.scrollLeft / step);
      setActive(Math.min(Math.max(i, 0), cards.length - 1));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(read);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    // a primeira entrada acontece quando o carrossel chega à tela
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        setSeen(true);
        io.disconnect();
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => {
      el.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
      io.disconnect();
    };
  }, []);

  // respostas: a do Fractional primeiro, depois as outras duas
  useEffect(() => {
    const el = track.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    [...(el.children as HTMLCollectionOf<HTMLElement>)].forEach((card, i) => {
      const fx = card.querySelectorAll("[data-cr-fx]");
      if (seen && i === active) {
        gsap.to(fx, { autoAlpha: 1, filter: "blur(0px)", y: 0, duration: 0.6, ease: "power3.out", stagger: 0.12, overwrite: true });
      } else {
        gsap.to(fx, { autoAlpha: 0.15, filter: "blur(4px)", y: 6, duration: seen ? 0.3 : 0, ease: "power2.out", overwrite: true });
      }
    });
  }, [active, seen]);

  const go = (i: number) => {
    const el = track.current;
    const card = el?.children[i] as HTMLElement | undefined;
    if (!el || !card) return;
    el.scrollTo({ left: card.offsetLeft - (el.children[0] as HTMLElement).offsetLeft, behavior: "smooth" });
  };

  return (
    <div aria-hidden="true" className="md:hidden">
      <div
        ref={track}
        className="relative -mx-6 flex snap-x snap-mandatory scroll-px-6 gap-3 overflow-x-auto overscroll-x-contain px-6 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {rows.map((row, r) => (
          <div key={row.label} className="flex w-[85%] shrink-0 snap-start flex-col rounded-2xl border border-line p-5">
            <div className="flex items-baseline justify-between gap-4 font-mono text-[10px] uppercase tracking-[0.22em] text-silver">
              <span>{row.label}</span>
              <span className="shrink-0 tabular-nums tracking-[0.12em]">
                {String(r + 1).padStart(2, "0")} / {total}
              </span>
            </div>

            <div className={`relative mt-5 p-4 ${CARD}`}>
              <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-silver">
                <span className="mr-1.5">●</span>
                {protectTerms(columns[HIGHLIGHT])}
              </p>
              <p data-cr-fx className="mt-2 break-words text-[18px] font-medium leading-snug tracking-[-0.01em] text-foreground">
                {row.values[HIGHLIGHT]}
              </p>
            </div>

            <div className="mt-5 h-px bg-line" />

            <div className="mt-4 grid gap-3">
              {others.map((c) => (
                <div key={c} className="grid grid-cols-[6.5rem_minmax(0,1fr)] items-baseline gap-3">
                  <span className="font-mono text-[10px] uppercase leading-snug tracking-[0.16em] text-silver/75">
                    {protectTerms(columns[c])}
                  </span>
                  <span data-cr-fx className="break-words text-[14px] leading-snug text-silver">
                    {row.values[c]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-5 flex justify-center gap-1">
        {rows.map((row, r) => (
          <button key={row.label} type="button" tabIndex={-1} onClick={() => go(r)} className="p-1.5">
            <span
              className={`block h-2 w-2 rounded-full border transition-colors duration-300 ${
                r === active ? "border-foreground bg-foreground" : "border-silver/60 bg-transparent"
              }`}
            />
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * "O que é fractional" — seção CLARA (off-white) com curvas de nível.
 * Comparativo (versão 2 do CONTEUDO-SITE.md): as 3 colunas entram uma a uma
 * quando o quadro chega à tela (desktop: tabela; mobile: carrossel por critério,
 * CriteriaCarousel). A coluna
 * Fractional é um cartão em destaque (CARD), com o rótulo "O modelo" em mono,
 * título em prata, textos com mais peso e marcador prata em cada célula; ela
 * entra por último e uma faixa de luz passa por ela uma vez. Agência e
 * Contratação ficam em cinza médio, peso normal.
 */
export default function Fractional({ copy }: { copy: FractionalCopy }) {
  const root = useRef<HTMLElement>(null);
  const board = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        // números contam de 0 até o valor ao entrar na tela (uma vez) e, ao
        // terminar, um reflexo prata atravessa os dígitos uma vez. O HTML já traz
        // o valor final: sem JS / reduced motion, números estáticos e sem reflexo.
        const counts = gsap.utils.toArray<HTMLElement>("[data-count]");
        const numbers = gsap.timeline({ paused: true });
        numbers.from("[data-stat]", { autoAlpha: 0, y: 30, duration: 1, ease: "power3.out", stagger: 0.25 }, 0);
        counts.forEach((el, i) => {
          const n = { v: 0 };
          numbers.to(
            n,
            {
              v: Number(el.dataset.count),
              duration: 2,
              ease: "power3.out",
              onUpdate: () => {
                el.textContent = String(Math.round(n.v));
              },
            },
            i * 0.25,
          );
        });
        numbers
          .set("[data-num-shine]", { opacity: 1 })
          .fromTo(
            "[data-num-shine]",
            { backgroundPosition: "100% 0" },
            { backgroundPosition: "0% 0", duration: 1.5, ease: "power2.inOut", stagger: 0.2 },
          )
          .to("[data-num-shine]", { opacity: 0, duration: 0.3 });
        // revealOnce: gatilho + rede de segurança (os números nunca ficam presos invisíveis)
        return revealOnce({
          trigger: root.current!.querySelector("[data-stats]")!,
          start: "top 75%",
          play: () => numbers.play(),
          finish: () => numbers.progress(1),
        });
      });
      mm.add("(prefers-reduced-motion: no-preference) and (min-width: 768px)", () => {
        const tl = gsap.timeline({ paused: true });
        copy.compare.columns.forEach((_, c) => {
          tl.from(
            `[data-col="${c}"]`,
            { autoAlpha: 0, y: 28, duration: 0.9, ease: "power3.out", stagger: 0.04 },
            c * 0.35,
          );
        });
        // a coluna em destaque entra por último; depois, o brilho passa uma vez
        tl.set("[data-fx-shine]", { opacity: 1 })
          .fromTo("[data-fx-shine]", { xPercent: -110 }, { xPercent: 160, duration: 1.2, ease: "power2.inOut" })
          .to("[data-fx-shine]", { opacity: 0, duration: 0.2 });
        // revealOnce: gatilho + rede de segurança (as colunas nunca ficam presas invisíveis)
        return revealOnce({ trigger: board.current!, start: "top 72%", play: () => tl.play(), finish: () => tl.progress(1) });
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
      <div className="m-sec relative mx-auto w-full max-w-[1600px] px-6 py-[clamp(6rem,16vh,12rem)] md:px-12">
        <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-silver m-center">
          {protectTerms(copy.eyebrow)}
        </p>
        <div className="m-g16 m-rg20 mt-6 grid gap-10 md:grid-cols-12 md:gap-8">
          <TechnicalText
            id="fractional-title"
            className="m-center text-[clamp(2.3rem,5vw,5.5rem)] font-semibold leading-[0.98] tracking-[-0.055em] md:col-span-8"
            text={copy.title}
          />
          <p className="m-center-p max-w-md self-end text-base leading-relaxed text-silver md:col-span-4 md:text-[17px]">
            {protectTerms(copy.text)}
          </p>
        </div>

        {/* Dados verificados: dois números gigantes (empilhados no mobile) */}
        <figure data-stats className="m-g40 mt-16 md:mt-24">
          <h3 className="m-center text-[clamp(1.4rem,2.2vw,2.2rem)] font-semibold tracking-[-0.035em]">
            {protectTerms(copy.stats.title)}
          </h3>
          <p className="m-center-p mt-3 max-w-2xl text-base leading-relaxed text-silver md:text-[17px]">
            {protectTerms(copy.stats.lead)}
          </p>
          <div className="mt-8 grid gap-10 border-t border-line pt-8 md:grid-cols-2 md:gap-8">
            {copy.stats.items.map((stat) => (
              <div key={stat.caption} data-stat>
                {/* número primeiro, legenda depois: mesma linha de base nos dois */}
                <p className="relative w-fit text-[clamp(4.5rem,11vw,10rem)] max-md:mx-auto font-semibold leading-[0.9] tracking-[-0.06em] tabular-nums">
                  <span className="black-chrome">
                    {stat.prefix}
                    <span data-count={stat.value}>{stat.value}</span>
                    {stat.suffix}
                  </span>
                  {/* reflexo prata: mesmo texto, só a faixa de luz aparece */}
                  <span aria-hidden="true" data-num-shine className="num-shine pointer-events-none absolute inset-0 opacity-0">
                    {stat.prefix}
                    {stat.value}
                    {stat.suffix}
                  </span>
                </p>
                <p className="m-center-p mt-3 max-w-sm text-sm leading-relaxed text-silver md:text-base">
                  {protectTerms(stat.caption)}
                </p>
              </div>
            ))}
          </div>
          <figcaption className="m-center-p mt-10 max-w-2xl">
            <span className="block text-base leading-relaxed md:text-lg">{protectTerms(copy.stats.support)}</span>
            <span className="mt-3 block font-mono text-[10px] uppercase tracking-[0.18em] text-silver">
              {protectTerms(copy.stats.source)}
            </span>
          </figcaption>
        </figure>

        <div ref={board} className="mt-16 md:mt-24">
          {/* Desktop: tabela semântica; o cartão da coluna em destaque fica atrás
              dela (colunas: rótulos 22%, modelos 26% cada) */}
          {/* (no mobile a tabela fica só para leitores de tela: sr-only) */}
          <div className="relative max-md:sr-only">
            <div data-col={HIGHLIGHT} aria-hidden="true" className={`absolute -bottom-2 -top-3 left-[74%] w-[26%] ${CARD}`}>
              <CardShine />
            </div>
          <table className="relative w-full table-fixed border-collapse text-left">
            <caption className="sr-only">{copy.compare.caption}</caption>
            <thead>
              <tr>
                <th scope="col" className="w-[22%]" />
                {columns.map((col, c) => (
                  <th
                    key={col}
                    scope="col"
                    data-col={c}
                    className={`border-b border-line px-6 pb-5 align-bottom text-[clamp(1.1rem,1.6vw,1.6rem)] font-semibold tracking-[-0.03em] ${
                      c === HIGHLIGHT ? "pt-5" : "text-silver"
                    }`}
                  >
                    {c === HIGHLIGHT ? (
                      <>
                        <span aria-hidden="true" className="mb-2 block font-mono text-[10px] font-normal uppercase tracking-[0.28em] text-silver">
                          {copy.compare.highlightLabel}
                        </span>
                        <span className="text-silver-gradient">{protectTerms(col)}</span>
                      </>
                    ) : (
                      protectTerms(col)
                    )}
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
                      className={`border-b border-line px-6 py-6 align-top text-[15px] leading-snug ${
                        c === HIGHLIGHT ? "font-medium text-foreground" : "font-normal text-silver"
                      }`}
                    >
                      {c === HIGHLIGHT ? (
                        <span className="flex gap-3">
                          <Marker />
                          <span>{value}</span>
                        </span>
                      ) : (
                        value
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          </div>

          {/* Mobile: um cartão por critério, em carrossel */}
          <CriteriaCarousel columns={columns} rows={rows} />

          <p className="m-center-p mt-10 max-w-xl text-sm leading-relaxed text-silver">{protectTerms(copy.note)}</p>
        </div>
      </div>
    </section>
  );
}

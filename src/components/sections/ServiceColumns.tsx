"use client";

import { Fragment, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP, ScrollTrigger);

export type ServiceColumn = { title: string; items: string[] };

/** Caracteres do scramble. */
const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#/_*";
/** Duração do scramble na entrada e no hover (s); intervalo entre trocas (s). */
const ENTER = 0.5;
const HOVER = 0.25;
const SWAP = 0.04;
/** Escalonamento entre itens na entrada (s) e início dos itens na timeline (s). */
const STAGGER = 0.05;
const ITEMS_AT = 0.35;

const randomGlyph = () => GLYPHS[Math.floor(Math.random() * GLYPHS.length)];

type Job = { letters: HTMLElement[]; glyphs: HTMLElement[]; start: number; dur: number; last: number; done: boolean[] };

/**
 * Colunas de serviços de Projetos pontuais, com acabamento "tech":
 * - cabeçalho em Geist Mono "01 / MARCA" com cursor "_" piscando e contador
 *   "[09]" à direita; linha de 1px abaixo;
 * - grade de pontos sutil ao fundo (com fade nas bordas);
 * - entrada, uma vez (~25% na tela): linhas se desenham, uma varredura passa de
 *   cima para baixo, contadores contam de 00, e cada item se "decodifica"
 *   (caracteres aleatórios em mono que travam letra por letra, da esquerda para
 *   a direita), coluna por coluna;
 * - hover (só mouse): scramble rápido, cor clara, colchetes e barrinha acesa.
 * Sem mudança de largura: cada letra real fica no lugar (invisível durante o
 * scramble) e o caractere aleatório é uma camada absoluta por cima; os
 * colchetes têm espaço reservado. O texto real de cada item está num span
 * sr-only; as letras e os caracteres aleatórios são aria-hidden.
 * prefers-reduced-motion / sem JS: tudo visível, sem scramble, varredura nem blink.
 */
export default function ServiceColumns({ columns, className = "" }: { columns: ServiceColumn[]; className?: string }) {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const el = root.current!;
        const lines = gsap.utils.toArray<HTMLElement>("[data-col-line]", el);
        const titles = gsap.utils.toArray<HTMLElement>("[data-col-title]", el);
        const counters = gsap.utils.toArray<HTMLElement>("[data-col-count]", el);
        const scan = el.querySelector<HTMLElement>("[data-scan]");
        const items = gsap.utils.toArray<HTMLElement>("[data-col-item]", el); // coluna por coluna
        const partsOf = (item: HTMLElement) => ({
          letters: [...item.querySelectorAll<HTMLElement>("[data-ch]")],
          glyphs: [...item.querySelectorAll<HTMLElement>("[data-glyph]")],
        });

        // --- scramble: um único tick para todos os itens em andamento ---
        const jobs = new Map<HTMLElement, Job>();
        let clock = 0;
        const tick = (_t: number, deltaTime: number) => {
          clock += deltaTime / 1000;
          jobs.forEach((job, item) => {
            const t = clock - job.start;
            if (t < 0) return;
            const n = job.letters.length;
            const swap = clock - job.last >= SWAP;
            if (swap) job.last = clock;
            let finished = true;
            for (let i = 0; i < n; i++) {
              if (job.done[i]) continue;
              // a letra i trava em ~(i+1)/n do tempo (esquerda para a direita)
              if (t >= job.dur * (0.25 + (0.75 * (i + 1)) / n)) {
                job.done[i] = true;
                job.glyphs[i].textContent = "";
                job.letters[i].style.opacity = "1";
              } else {
                finished = false;
                job.letters[i].style.opacity = "0";
                if (swap || !job.glyphs[i].textContent) job.glyphs[i].textContent = randomGlyph();
              }
            }
            if (finished) jobs.delete(item);
          });
          if (!jobs.size) running(false);
        };
        let on = false;
        const running = (v: boolean) => {
          if (v === on) return;
          on = v;
          if (v) gsap.ticker.add(tick);
          else gsap.ticker.remove(tick);
        };
        const scramble = (item: HTMLElement, delay: number, dur: number) => {
          const { letters, glyphs } = partsOf(item);
          const done = letters.map(() => false);
          jobs.set(item, { letters, glyphs, start: clock + delay, dur, last: -1, done });
          running(true);
        };

        // --- estado inicial ---
        gsap.set(lines, { scaleX: 0, transformOrigin: "left center" });
        gsap.set(titles, { opacity: 0 });
        items.forEach((item) => gsap.set(partsOf(item).letters, { opacity: 0 }));
        counters.forEach((c) => (c.textContent = "[00]"));
        if (scan) gsap.set(scan, { opacity: 0 });

        const tl = gsap.timeline({ paused: true });
        tl.to(lines, { scaleX: 1, duration: 0.8, ease: "power3.out", stagger: 0.1 }, 0).to(
          titles,
          { opacity: 1, duration: 0.6, ease: "power2.out", stagger: 0.1 },
          0.15,
        );
        if (scan) {
          const h = () => el.getBoundingClientRect().height;
          tl.fromTo(scan, { y: 0, opacity: 1 }, { y: h, duration: 1.2, ease: "power1.inOut" }, 0.1).to(
            scan,
            { opacity: 0, duration: 0.2 },
            1.15,
          );
        }
        // itens: scramble em sequência; contadores de 00 até o total
        let index = 0;
        columns.forEach((col, c) => {
          const first = index;
          const counter = counters[c];
          const total = col.items.length;
          const n = { v: 0 };
          tl.to(
            n,
            {
              v: total,
              duration: total * STAGGER + ENTER,
              ease: "none",
              onUpdate: () => {
                if (counter) counter.textContent = `[${String(Math.round(n.v)).padStart(2, "0")}]`;
              },
            },
            ITEMS_AT + first * STAGGER,
          );
          index += total;
        });
        tl.call(() => items.forEach((item, i) => scramble(item, i * STAGGER, ENTER)), [], ITEMS_AT);

        ScrollTrigger.create({
          trigger: el.closest("section") ?? el,
          start: "top 75%",
          once: true,
          refreshPriority: -1,
          onEnter: () => tl.play(),
        });

        // --- hover (só mouse) ---
        const off: (() => void)[] = [];
        if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
          items.forEach((item) => {
            const enter = () => {
              // só depois da entrada (antes dela as letras ainda estão escondidas)
              if (tl.progress() === 1 && !jobs.has(item)) scramble(item, 0, HOVER);
            };
            item.addEventListener("mouseenter", enter);
            off.push(() => item.removeEventListener("mouseenter", enter));
          });
        }

        return () => {
          off.forEach((fn) => fn());
          running(false);
          items.forEach((item) => {
            const { letters, glyphs } = partsOf(item);
            letters.forEach((l) => (l.style.opacity = ""));
            glyphs.forEach((g) => (g.textContent = ""));
          });
          counters.forEach((c, i) => (c.textContent = `[${String(columns[i]?.items.length ?? 0).padStart(2, "0")}]`));
        };
      });
    },
    { scope: root, dependencies: [columns] },
  );

  return (
    <div ref={root} className={`relative ${className}`}>
      {/* grade de pontos (fade nas bordas) + linha de varredura da entrada */}
      <div aria-hidden="true" className="pointer-events-none absolute -inset-6 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle,#1E1E1E_1px,transparent_1.5px)] [background-size:24px_24px] [mask-image:radial-gradient(ellipse_at_center,#000_45%,transparent_100%)]" />
        <div
          data-scan
          className="absolute inset-x-0 top-6 h-px bg-[linear-gradient(to_right,transparent,rgba(236,234,229,0.3),transparent)] opacity-0"
        />
      </div>

      <div className="relative grid gap-10 md:grid-cols-3 md:gap-8">
        {columns.map((col, c) => (
          <div key={col.title}>
            <h3
              data-col-title
              className="whitespace-nowrap font-mono text-[11px] uppercase tracking-[0.28em] text-[#8A8A8A] lg:tracking-[0.08em] xl:tracking-[0.28em]"
            >
              {String(c + 1).padStart(2, "0")} / {col.title}
              <span aria-hidden="true" className="animate-[caretBlink_1s_steps(1)_infinite] motion-reduce:animate-none">
                _
              </span>
            </h3>
            {/* linha + contador à direita dela */}
            <div className="mt-3 flex items-center gap-3">
              <div data-col-line aria-hidden="true" className="h-px flex-1 bg-[#2A2A2A]" />
              <span data-col-count aria-hidden="true" className="font-mono text-[11px] tracking-[0.12em] text-[#8A8A8A]">
                [{String(col.items.length).padStart(2, "0")}]
              </span>
            </div>
            <ul className="mt-4">
              {col.items.map((item) => (
                <li
                  key={item}
                  data-col-item
                  className="group/item relative pl-5 text-[15px] leading-[2] text-[#9A9A9A] transition-colors duration-[250ms] hover:text-[#ECEAE5]"
                >
                  {/* barrinha acesa à esquerda (hover) */}
                  <span
                    aria-hidden="true"
                    className="absolute left-0 top-[0.5lh] h-[1em] w-[2px] -translate-y-1/2 bg-[#ECEAE5] opacity-0 transition-opacity duration-[250ms] group-hover/item:opacity-100"
                  />
                  <span className="sr-only">{item}</span>
                  {/* colchetes de largura zero (não deslocam nem mudam a quebra): "[" no
                      recuo à esquerda, "]" logo depois do texto */}
                  <span aria-hidden="true" className="relative inline-block h-[1lh] w-0 align-top">
                    <span className="absolute inset-y-0 right-[5px] flex items-center font-mono text-[11px] text-[#8A8A8A] opacity-0 transition-opacity duration-[250ms] group-hover/item:opacity-100">
                      [
                    </span>
                  </span>
                  <span aria-hidden="true">
                    {item.split(" ").map((word, w, all) => (
                      <Fragment key={w}>
                        {/* palavra inteira na quebra de linha; letras com largura própria */}
                        <span className="inline-block whitespace-nowrap">
                          {Array.from(word).map((ch, i) => (
                            <span key={i} className="relative inline-block">
                              <span data-ch>{ch}</span>
                              <span
                                data-glyph
                                className="pointer-events-none absolute inset-y-0 left-1/2 flex -translate-x-1/2 items-center font-mono text-[0.85em] text-[#8A8A8A]"
                              />
                            </span>
                          ))}
                        </span>
                        {w < all.length - 1 ? " " : null}
                      </Fragment>
                    ))}
                  </span>
                  <span aria-hidden="true" className="relative inline-block h-[1lh] w-0 align-top">
                    <span className="absolute inset-y-0 left-[5px] flex items-center font-mono text-[11px] text-[#8A8A8A] opacity-0 transition-opacity duration-[250ms] group-hover/item:opacity-100">
                      ]
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

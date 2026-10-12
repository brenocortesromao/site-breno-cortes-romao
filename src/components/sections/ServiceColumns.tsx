"use client";

import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP, ScrollTrigger);

export type ServiceColumn = { title: string; items: string[] };

/**
 * Colunas de serviços de Projetos pontuais (Marca, Comunicação, Tecnologia):
 * título em Geist Mono numerado, linha de 1px e itens um por linha.
 * - Hover (só mouse): item clareia, desliza 4px e mostra ↗ (0,25 s).
 * - Entrada, uma vez, com a seção ~25% na tela: as linhas se desenham da
 *   esquerda para a direita (0,1 s entre colunas), os títulos aparecem e os
 *   itens sobem de 12px com desfoque, coluna por coluna (0,04 s entre itens).
 * - prefers-reduced-motion / sem JS: tudo visível desde o início.
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
        const items = gsap.utils.toArray<HTMLElement>("[data-col-item]", el); // já em ordem: coluna por coluna
        gsap.set(lines, { scaleX: 0, transformOrigin: "left center" });
        gsap.set(titles, { opacity: 0 });
        gsap.set(items, { opacity: 0, y: 12, filter: "blur(6px)" });
        const tl = gsap.timeline({
          paused: true,
          // o GSAP grava translate/rotate/scale: none inline; limpa no fim para o
          // deslocamento do hover (propriedade CSS translate) voltar a valer
          onComplete: () => gsap.set(items, { clearProps: "filter,transform,translate,rotate,scale" }),
        });
        tl.to(lines, { scaleX: 1, duration: 0.8, ease: "power3.out", stagger: 0.1 }, 0)
          .to(titles, { opacity: 1, duration: 0.6, ease: "power2.out", stagger: 0.1 }, 0.15)
          .to(items, { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.55, ease: "power2.out", stagger: 0.04 }, 0.35);
        ScrollTrigger.create({
          trigger: el.closest("section") ?? el,
          start: "top 75%",
          once: true,
          refreshPriority: -1,
          onEnter: () => tl.play(),
        });
      });
    },
    { scope: root, dependencies: [columns] },
  );

  return (
    <div ref={root} className={`grid gap-10 md:grid-cols-3 md:gap-8 ${className}`}>
      {columns.map((col, c) => (
        <div key={col.title}>
          <h3
            data-col-title
            className="flex gap-3 font-mono text-[11px] uppercase tracking-[0.28em] text-[#8A8A8A]"
          >
            <span>{String(c + 1).padStart(2, "0")}</span>
            <span>{col.title}</span>
          </h3>
          <div data-col-line aria-hidden="true" className="mt-3 h-px bg-[#2A2A2A]" />
          <ul className="mt-4">
            {col.items.map((item) => (
              <li
                key={item}
                data-col-item
                className="group/item flex items-center gap-2 text-[15px] leading-[2] text-[#9A9A9A] transition-[color,translate] duration-[250ms] ease-out hover:translate-x-1 hover:text-[#ECEAE5]"
              >
                {item}
                <span
                  aria-hidden="true"
                  className="text-[11px] opacity-0 transition-opacity duration-[250ms] group-hover/item:opacity-100"
                >
                  ↗
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

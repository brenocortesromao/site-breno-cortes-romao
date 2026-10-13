"use client";

import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import BlurRevealTitle from "@/components/BlurRevealTitle";
import { getTier } from "@/lib/quality";
import { revealOnce } from "@/lib/reveal";

gsap.registerPlugin(useGSAP, ScrollTrigger);

export type PillarsCopy = {
  eyebrow: string;
  title: string;
  subtitle: string;
  items: { title: string; text: string }[];
};

/**
 * "O que eu faço" — 4 pilares.
 * Desktop sem reduced motion: o palco fica fixo (pin) por N telas e os pilares
 * trocam com o scroll — título sobe por máscara, texto cruza, índice e barra
 * de progresso acompanham. O modo é ligado por `data-mode="pin"` no <section>
 * (classes `group-data-[mode=pin]:*`).
 * Celular (até 767px), sem reduced motion e fora do nível "low": a mesma
 * troca, adaptada à tela em pé (`data-mode="pin-m"`): o título da seção rola
 * antes e só o palco dos pilares fica fixo (~80% da tela por pilar), tudo
 * centralizado (índice, barra de 120px, título numa linha, texto até 32ch).
 * Celular fraco (nível "low"/"none") ou reduced motion (`data-mode="stack-m"`):
 * empilhados, cada pilar entra uma vez ao aparecer (linha se desenhando,
 * índice, título subindo pela máscara, texto); com reduced motion, só fade.
 * Desktop com reduced motion / sem JS: empilhados, sem animação.
 */
export default function Pillars({ copy }: { copy: PillarsCopy }) {
  const root = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const pinBox = useRef<HTMLDivElement>(null);
  const n = copy.items.length;

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(min-width: 768px) and (prefers-reduced-motion: no-preference)", () => {
        const section = root.current!;
        section.dataset.mode = "pin";

        const titles = gsap.utils.toArray<HTMLElement>("[data-pillar-title]");
        const texts = gsap.utils.toArray<HTMLElement>("[data-pillar-text]");
        const indexes = gsap.utils.toArray<HTMLElement>("[data-pillar-index]");
        gsap.set(titles.slice(1), { yPercent: 110 });
        gsap.set([...texts.slice(1), ...indexes.slice(1)], { autoAlpha: 0, y: 24 });

        const tl = gsap.timeline({
          defaults: { ease: "power2.inOut", duration: 1 },
          scrollTrigger: {
            trigger: stage.current,
            start: "top top",
            end: `+=${(n - 1) * 100}%`,
            pin: true,
            scrub: 0.8,
            anticipatePin: 1,
          },
        });
        tl.fromTo("[data-pillar-progress]", { scaleX: 1 / n }, { scaleX: 1, ease: "none", duration: n - 1 }, 0);
        for (let i = 1; i < n; i++) {
          const at = i - 1 + 0.15; // pequena pausa em cada pilar antes da troca
          tl.to(titles[i - 1], { yPercent: -110, duration: 0.7 }, at)
            .to(titles[i], { yPercent: 0, duration: 0.7 }, at)
            .to([texts[i - 1], indexes[i - 1]], { autoAlpha: 0, y: -24, duration: 0.5 }, at)
            .to([texts[i], indexes[i]], { autoAlpha: 1, y: 0, duration: 0.5 }, at + 0.2);
        }

        return () => {
          delete section.dataset.mode;
        };
      });

      mm.add("(max-width: 767.98px)", () => {
        const section = root.current!;
        const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        const tier = getTier();
        const titles = gsap.utils.toArray<HTMLElement>("[data-pillar-title]");
        const texts = gsap.utils.toArray<HTMLElement>("[data-pillar-text]");
        const indexes = gsap.utils.toArray<HTMLElement>("[data-pillar-index]");

        if (!reduced && tier !== "low" && tier !== "none") {
          // barra de endereço do celular aparecendo/sumindo não recalcula o pin
          ScrollTrigger.config({ ignoreMobileResize: true });
          section.dataset.mode = "pin-m";
          // palco preso acima de tudo o que vem depois ("O que muda" é z-10, depois no DOM)
          section.style.zIndex = "20";
          // altura do palco em px, medida a cada refresh (não muda com a barra de endereço)
          const box = pinBox.current!;
          const fitBox = () => {
            box.style.height = `${window.innerHeight}px`;
          };
          fitBox();
          ScrollTrigger.addEventListener("refreshInit", fitBox);
          gsap.set(titles.slice(1), { yPercent: 110 });
          gsap.set([...texts.slice(1), ...indexes.slice(1)], { autoAlpha: 0, y: 24 });
          const tl = gsap.timeline({
            defaults: { ease: "power2.inOut", duration: 1 },
            scrollTrigger: {
              trigger: pinBox.current,
              start: "top top",
              end: `+=${(n - 1) * 80}%`,
              pin: true,
              pinType: "fixed",
              // o pai (palco) é flex: sem isto o GSAP desliga o espaço do pin e
              // "O que muda" subiria por cima dos pilares
              pinSpacing: true,
              invalidateOnRefresh: true,
              // calculado antes dos gatilhos das seções de baixo (que dependem do espaço do pin)
              refreshPriority: 1,
              scrub: 0.8,
              anticipatePin: 1,
            },
          });
          tl.fromTo("[data-pillar-progress-m]", { scaleX: 1 / n }, { scaleX: 1, ease: "none", duration: n - 1 }, 0);
          for (let i = 1; i < n; i++) {
            const at = i - 1 + 0.15;
            tl.to(titles[i - 1], { yPercent: -110, duration: 0.7 }, at)
              .to(titles[i], { yPercent: 0, duration: 0.7 }, at)
              .to([texts[i - 1], indexes[i - 1]], { autoAlpha: 0, y: -24, duration: 0.5 }, at)
              .to([texts[i], indexes[i]], { autoAlpha: 1, y: 0, duration: 0.5 }, at + 0.2);
          }
          return () => {
            ScrollTrigger.removeEventListener("refreshInit", fitBox);
            box.style.height = "";
            section.style.zIndex = "";
            delete section.dataset.mode;
          };
        }

        // plano B: empilhados, cada pilar entra uma vez ao aparecer
        section.dataset.mode = "stack-m";
        const stops = gsap.utils.toArray<HTMLElement>("[data-pillar]").map((li, i) => {
          const line = li.querySelector("[data-pillar-line]");
          const parts = [indexes[i], titles[i], texts[i]];
          const tl = gsap.timeline({ paused: true });
          if (reduced) {
            gsap.set(parts, { autoAlpha: 0 });
            tl.to(parts, { autoAlpha: 1, duration: 0.6, ease: "power1.out", stagger: 0.12 });
          } else {
            gsap.set(line, { scaleX: 0, transformOrigin: "left center" });
            gsap.set(titles[i], { yPercent: 110 });
            gsap.set([indexes[i], texts[i]], { autoAlpha: 0, y: 16 });
            tl.to(line, { scaleX: 1, duration: 0.8, ease: "power2.inOut" }, 0)
              .to(indexes[i], { autoAlpha: 1, y: 0, duration: 0.5, ease: "power2.out" }, 0.15)
              .to(titles[i], { yPercent: 0, duration: 0.8, ease: "power3.out" }, 0.25)
              .to(texts[i], { autoAlpha: 1, y: 0, duration: 0.6, ease: "power2.out" }, 0.45);
          }
          return revealOnce({ trigger: li, start: "top 85%", play: () => tl.play(), finish: () => tl.progress(1) });
        });
        return () => {
          stops.forEach((stop) => stop());
          delete section.dataset.mode;
        };
      });
    },
    { scope: root },
  );

  return (
    <section ref={root} id="o-que-faco" data-theme="dark" aria-labelledby="o-que-faco-title" className="group relative z-10">
      <div
        ref={stage}
        className="mx-auto flex w-full max-w-[1600px] flex-col px-6 py-[clamp(6rem,16vh,12rem)] md:px-12 group-data-[mode=pin]:h-svh group-data-[mode=pin]:py-[clamp(5rem,12vh,9rem)]"
      >
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-silver m-center">
              {copy.eyebrow}
            </p>
            <BlurRevealTitle
              id="o-que-faco-title"
              className="m-center mt-6 max-w-3xl text-[clamp(2rem,3.6vw,3.75rem)] font-semibold leading-[1.02] tracking-[-0.05em]"
              text={copy.title}
            />
            <p className="m-center-p mt-5 max-w-xl text-base leading-relaxed text-silver md:text-lg">{copy.subtitle}</p>
          </div>
          {/* Progresso (só no modo fixo) */}
          <div aria-hidden="true" className="hidden w-48 group-data-[mode=pin]:block">
            <div className="h-px w-full bg-line">
              <div data-pillar-progress className="h-px w-full origin-left bg-foreground" />
            </div>
          </div>
        </div>

        {/* palco fixo do celular (pin-m); fora dele, "contents" (não muda o layout) */}
        <div ref={pinBox} className="contents group-data-[mode=pin-m]:relative group-data-[mode=pin-m]:mt-10 group-data-[mode=pin-m]:block group-data-[mode=pin-m]:h-svh">
          {/* progresso do celular: logo abaixo do índice, 120px, centralizada */}
          <div aria-hidden="true" className="absolute left-1/2 top-[calc(24svh+2rem)] hidden h-px w-[120px] -translate-x-1/2 bg-line group-data-[mode=pin-m]:block">
            <div data-pillar-progress-m className="h-px w-full origin-left bg-foreground" />
          </div>
        <ol className="mt-16 grid gap-16 md:mt-20 group-data-[mode=pin]:relative group-data-[mode=pin]:mt-0 group-data-[mode=pin]:flex-1 group-data-[mode=pin]:gap-0 group-data-[mode=pin-m]:absolute group-data-[mode=pin-m]:inset-0 group-data-[mode=pin-m]:mt-0 group-data-[mode=pin-m]:block">
          {copy.items.map((item, i) => (
            <li
              key={item.title}
              data-pillar
              className="relative grid gap-6 border-t border-line pt-8 md:grid-cols-12 md:gap-8 group-data-[mode=pin]:absolute group-data-[mode=pin]:inset-0 group-data-[mode=pin]:items-center group-data-[mode=pin]:border-t-0 group-data-[mode=pin]:pt-0 group-data-[mode=pin-m]:absolute group-data-[mode=pin-m]:inset-0 group-data-[mode=pin-m]:flex group-data-[mode=pin-m]:flex-col group-data-[mode=pin-m]:items-center group-data-[mode=pin-m]:gap-0 group-data-[mode=pin-m]:border-t-0 group-data-[mode=pin-m]:pt-[24svh] group-data-[mode=pin-m]:text-center group-data-[mode=stack-m]:border-transparent"
            >
              {/* linha que se desenha na entrada (plano B do celular) */}
              <span aria-hidden="true" data-pillar-line className="pointer-events-none absolute inset-x-0 top-0 hidden h-px bg-line group-data-[mode=stack-m]:block" />
              <span
                data-pillar-index
                className="font-mono text-xs text-silver md:col-span-2 group-data-[mode=pin]:text-sm group-data-[mode=pin-m]:text-sm group-data-[mode=pin-m]:leading-5"
              >
                {String(i + 1).padStart(2, "0")} / {String(n).padStart(2, "0")}
              </span>
              <h3 className="overflow-hidden pb-[0.12em] md:col-span-6 group-data-[mode=pin-m]:mt-9 group-data-[mode=pin-m]:w-full">
                <span
                  data-pillar-title
                  // escala limitada pela palavra mais longa ("Acompanhamento", ~7,9em) na
                  // coluna de 6/12; o teto de 5.5rem vale a partir do contêiner de 1600px,
                  // onde a coluna para de crescer (com 6rem o "o" final era cortado)
                  // celular fixo: "Acompanhamento" (~8,2em) sempre numa linha
                  className="block text-[clamp(2.3rem,4.9vw,5.5rem)] font-semibold leading-[0.95] tracking-[-0.06em] text-silver-gradient group-data-[mode=pin-m]:text-[min(2.6rem,calc((100vw-3rem)/8.2))]"
                >
                  {item.title}
                </span>
              </h3>
              <p
                data-pillar-text
                className="max-w-md text-base leading-relaxed text-silver md:col-span-4 md:text-lg group-data-[mode=pin-m]:mt-5 group-data-[mode=pin-m]:max-w-[32ch] group-data-[mode=pin-m]:text-pretty"
              >
                {item.text}
              </p>
            </li>
          ))}
        </ol>
        </div>
      </div>
    </section>
  );
}

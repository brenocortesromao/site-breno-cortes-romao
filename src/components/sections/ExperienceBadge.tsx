"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { revealOnce } from "@/lib/reveal";

gsap.registerPlugin(useGSAP);

export type ExperienceLabels = {
  /** Texto pequeno embaixo do número ("Anos de experiência"). */
  label: string;
  /** Frase completa para leitores de tela ("+12 anos de experiência"). */
  full: string;
};

/** Anos de experiência (o número do destaque). */
const YEARS = 12;
/** Contagem de 0 a YEARS na entrada (s). */
const COUNT_S = 1.4;
/** Intervalo entre os brilhos metálicos e duração de cada passada (ms). */
const SHINE_EVERY = 6000;
const SHINE_MS = 1300;

/**
 * Destaque "+12 anos de experiência" no centro do mural de Trabalhos: cartão de
 * vidro fosco (blur 14px) por cima das artes, com sombra escura larga para a
 * leitura. pointer-events none: o mural continua desacelerando com o mouse.
 * - Ao entrar na tela (uma vez, revealOnce), o número conta de 0 a 12 com um
 *   desfoque saindo; depois, a cada ~6 s, um brilho diagonal passa pelo "+12"
 *   (.num-shine, o mesmo reflexo dos números do "O que é fractional").
 * - O HTML do servidor já traz "+12" (e a frase completa para leitores de tela).
 * - prefers-reduced-motion: "+12" direto, sem contagem e sem brilho.
 */
export default function ExperienceBadge({ labels }: { labels: ExperienceLabels }) {
  const root = useRef<HTMLDivElement>(null);
  const num = useRef<HTMLSpanElement>(null);
  const shine = useRef<HTMLSpanElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const el = num.current!;
        const glint = shine.current!;
        const counter = { v: 0 };
        const show = () => {
          el.textContent = `+${Math.round(counter.v)}`;
        };
        let timer: number | undefined;
        let pass: Animation | undefined;
        const sweep = () => {
          pass = glint.animate([{ backgroundPosition: "100% 0" }, { backgroundPosition: "0% 0" }], {
            duration: SHINE_MS,
            easing: "cubic-bezier(0.45, 0, 0.25, 1)",
          });
        };
        const startShine = () => {
          window.clearInterval(timer);
          timer = window.setInterval(sweep, SHINE_EVERY);
        };
        show();
        gsap.set(el, { filter: "blur(10px)", opacity: 0.35 });
        const tl = gsap
          .timeline({ paused: true, onComplete: startShine })
          .to(counter, { v: YEARS, duration: COUNT_S, ease: "power3.out", onUpdate: show }, 0)
          .to(el, { filter: "blur(0px)", opacity: 1, duration: COUNT_S, ease: "power2.out" }, 0)
          .call(sweep, [], COUNT_S - 0.2);
        const stop = revealOnce({
          trigger: root.current!,
          start: "top 80%",
          play: () => tl.play(),
          finish: () => tl.progress(1),
        });
        return () => {
          stop();
          window.clearInterval(timer);
          pass?.cancel();
          el.textContent = `+${YEARS}`;
        };
      });
    },
    { scope: root },
  );

  return (
    <div
      ref={root}
      className="pointer-events-none absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2"
    >
      {/* sombra escura, suave e larga, para a leitura por cima das artes */}
      <div
        aria-hidden="true"
        className="absolute -inset-x-12 -inset-y-8 -z-10 bg-[radial-gradient(closest-side,rgba(0,0,0,0.6),rgba(0,0,0,0.25)_60%,transparent)] md:-inset-x-16 md:-inset-y-12"
      />
      <p className="flex flex-col items-center rounded-[6px] border border-white/[0.08] bg-[rgba(10,10,10,0.45)] px-7 py-5 text-center shadow-[0_24px_80px_rgba(0,0,0,0.55)] backdrop-blur-[14px] mobile:bg-[rgba(10,10,10,0.8)] mobile:backdrop-blur-none md:px-11 md:py-8">
        <span className="sr-only">{labels.full}</span>
        <span aria-hidden="true" className="relative grid text-[48px] font-semibold leading-[0.95] tracking-[-0.04em] tabular-nums md:text-[clamp(56px,7vw,96px)]">
          {/* reserva a largura final: o cartão não muda de tamanho durante a contagem */}
          <span className="invisible col-start-1 row-start-1">+{YEARS}</span>
          <span ref={num} className="col-start-1 row-start-1 text-center text-silver-gradient">
            +{YEARS}
          </span>
          <span ref={shine} className="num-shine col-start-1 row-start-1 text-center">
            +{YEARS}
          </span>
        </span>
        <span aria-hidden="true" className="mt-3 whitespace-nowrap font-mono text-[10px] uppercase tracking-[0.3em] text-[#c8cacd] md:mt-4 md:text-[11px]">
          {labels.label}
        </span>
      </p>
    </div>
  );
}

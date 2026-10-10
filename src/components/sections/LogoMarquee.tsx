"use client";

import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import type { Logo } from "@/content/media";

gsap.registerPlugin(useGSAP, ScrollTrigger);

/** Repetições da fileira em cada cópia (5 logos ≈ 1080px; ×3 cobre telas de até ~3200px). */
const REPS = 3;

/** Um logo em prata monocromática: o arquivo vira MÁSCARA sobre um fundo prata. */
function LogoMark({ logo }: { logo: Logo }) {
  if (!logo.src) {
    return (
      <span className="flex h-12 w-36 shrink-0 items-center justify-center border border-dashed border-line font-mono text-[9px] uppercase tracking-[0.2em] text-silver md:w-44">
        {logo.name}
      </span>
    );
  }
  const url = `url(${logo.src})`;
  return (
    <span
      role="img"
      aria-label={logo.name}
      className="block h-12 w-36 shrink-0 bg-silver md:w-44"
      style={{
        maskImage: url,
        WebkitMaskImage: url,
        maskSize: "contain",
        WebkitMaskSize: "contain",
        maskRepeat: "no-repeat",
        WebkitMaskRepeat: "no-repeat",
        maskPosition: "center",
        WebkitMaskPosition: "center",
      }}
    />
  );
}

/**
 * Faixa de logos: 2 fileiras em loop infinito, direções opostas (cima ←,
 * baixo →), desacelerando no hover. Cada trilha tem duas CÓPIAS iguais e a
 * animação desloca exatamente uma (xPercent 50) para o loop não "pular". Cada
 * cópia repete a fileira REPS vezes, para ser mais larga que a tela: senão a
 * borda da trilha aparece e abre um buraco no fim da fileira.
 * Pausa fora da tela. Modo animado ligado por data-mode="loop"; sem JS ou com
 * prefers-reduced-motion, os logos ficam numa grade estática (cópia oculta).
 * Logos: public/logos/ + logos.json (src/content/media.ts).
 */
export default function LogoMarquee({
  logos,
  title,
}: {
  logos: Logo[];
  title: string;
}) {
  const root = useRef<HTMLDivElement>(null);
  const half = Math.ceil(logos.length / 2);
  const rows = [logos.slice(0, half), logos.slice(half).concat(logos.slice(0, Math.max(0, half - (logos.length - half))))];

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const el = root.current!;
        el.dataset.mode = "loop";
        const tracks = gsap.utils.toArray<HTMLElement>("[data-logo-track]");
        const tweens = tracks.map((track, i) =>
          gsap.fromTo(
            track,
            { xPercent: i === 0 ? 0 : -50 },
            { xPercent: i === 0 ? -50 : 0, duration: 38 + i * 6, ease: "none", repeat: -1, paused: true },
          ),
        );
        // desacelera no hover (cada fileira por si)
        const rowsEls = gsap.utils.toArray<HTMLElement>("[data-logo-row]");
        const off: (() => void)[] = [];
        rowsEls.forEach((row, i) => {
          const slow = () => gsap.to(tweens[i], { timeScale: 0.2, duration: 0.8, ease: "power2.out" });
          const fast = () => gsap.to(tweens[i], { timeScale: 1, duration: 0.8, ease: "power2.out" });
          row.addEventListener("mouseenter", slow);
          row.addEventListener("mouseleave", fast);
          off.push(() => {
            row.removeEventListener("mouseenter", slow);
            row.removeEventListener("mouseleave", fast);
          });
        });
        const visible = ScrollTrigger.create({
          trigger: el,
          start: "top bottom",
          end: "bottom top",
          onToggle: (self) => tweens.forEach((t) => (self.isActive ? t.play() : t.pause())),
        });
        if (visible.isActive) tweens.forEach((t) => t.play());
        return () => {
          off.forEach((fn) => fn());
          delete el.dataset.mode;
        };
      });
    },
    { scope: root },
  );

  return (
    <div ref={root} className="group/marquee">
      <h3 className="px-6 font-mono text-[11px] uppercase tracking-[0.28em] text-silver md:px-12">{title}</h3>
      <div className="mt-8 grid gap-6">
        {rows.map((row, r) => (
          <div
            key={r}
            data-logo-row
            className="overflow-hidden px-6 md:px-12 group-data-[mode=loop]/marquee:px-0 group-data-[mode=loop]/marquee:[mask-image:linear-gradient(to_right,transparent,#000_8%,#000_92%,transparent)]"
          >
            <ul
              data-logo-track
              className="flex flex-wrap gap-x-10 gap-y-6 group-data-[mode=loop]/marquee:w-max group-data-[mode=loop]/marquee:flex-nowrap group-data-[mode=loop]/marquee:gap-0"
            >
              {[0, 1].map((copyIdx) =>
                Array.from({ length: REPS }, (_, rep) =>
                  row.map((logo, i) => {
                    // só a primeira repetição da primeira cópia é conteúdo; o resto é eco do loop
                    const echo = copyIdx > 0 || rep > 0;
                    return (
                      <li
                        key={`${copyIdx}-${rep}-${i}`}
                        aria-hidden={echo ? true : undefined}
                        className={`${echo ? "hidden group-data-[mode=loop]/marquee:block" : ""} pr-0 group-data-[mode=loop]/marquee:pr-10`}
                      >
                        <LogoMark logo={logo} />
                      </li>
                    );
                  }),
                ),
              )}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

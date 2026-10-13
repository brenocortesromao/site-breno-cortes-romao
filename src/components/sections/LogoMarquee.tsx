"use client";

import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import type { Logo } from "@/content/media";
import { revealOnce } from "@/lib/reveal";

gsap.registerPlugin(useGSAP, ScrollTrigger);

/** Repetições da fileira em cada cópia (×3: a cópia fica bem mais larga que a tela, sem buraco no loop). */
const REPS = 3;

/** Segundos para um logo atravessar a largura da tela (fileira mais rápida), em qualquer tela. */
const CROSS_S = 16.7;
/** Velocidade relativa de cada fileira (não andam sincronizadas). */
const ROW_SPEED = [1, 0.85];
/** Velocidade com o mouse em cima (desktop): 30% mais lenta. */
const HOVER_SPEED = 0.7;

/**
 * Um logo (PNG branco, fundo transparente, canvas 480 × 200): altura fixa
 * (40px no celular, 56px no desktop), centralizado no mesmo espaço de antes.
 * Opacidade 60%; no desktop, 100% com o mouse em cima.
 */
function LogoMark({ logo }: { logo: Logo }) {
  return (
    <span className="flex h-12 w-36 shrink-0 items-center justify-center md:h-14 md:w-44">
      {/* eslint-disable-next-line @next/next/no-img-element -- PNGs já otimizados em public/logos */}
      <img
        src={logo.src}
        alt={logo.name}
        width={480}
        height={200}
        loading="lazy"
        decoding="async"
        draggable={false}
        className="h-10 w-auto opacity-60 transition-opacity duration-500 ease-out md:h-14 [@media(hover:hover)]:hover:opacity-100"
      />
    </span>
  );
}

/**
 * Faixa de logos: 2 fileiras em loop infinito, direções opostas (cima ←,
 * baixo →), lentas (CROSS_S por tela, proporcional à largura) e desacelerando
 * no hover do desktop. Cada trilha tem duas CÓPIAS iguais e a
 * animação desloca exatamente uma (xPercent 50) para o loop não "pular". Cada
 * cópia repete a fileira REPS vezes, para ser mais larga que a tela: senão a
 * borda da trilha aparece e abre um buraco no fim da fileira.
 * Pausa fora da tela. Modo animado ligado por data-mode="loop"; sem JS ou com
 * prefers-reduced-motion, os logos ficam numa grade estática (cópia oculta).
 * Logos: public/logos/ + logos.json (src/content/media.ts).
 * Embaixo das fileiras, a linha `note` ("E diversas outras empresas e
 * setores."), com entrada em fade (revealOnce).
 */
export default function LogoMarquee({
  logos,
  title,
  note,
}: {
  logos: Logo[];
  title: string;
  note: string;
}) {
  const root = useRef<HTMLDivElement>(null);
  // fileiras alternando a ordem do logos.json (1ª, 3ª, 5ª... em cima; 2ª, 4ª... embaixo)
  const shown = logos.filter((l) => l.src);
  const rows = [shown.filter((_, i) => i % 2 === 0), shown.filter((_, i) => i % 2 === 1)];

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const el = root.current!;
        el.dataset.mode = "loop";
        const tracks = gsap.utils.toArray<HTMLElement>("[data-logo-track]");
        // duração de uma volta (uma cópia) para a velocidade de travessia da tela
        const durationFor = (track: HTMLElement, i: number) =>
          track.scrollWidth / 2 / ((window.innerWidth / CROSS_S) * ROW_SPEED[i]);
        const tweens = tracks.map((track, i) =>
          gsap.fromTo(
            track,
            { xPercent: i === 0 ? 0 : -50 },
            { xPercent: i === 0 ? -50 : 0, duration: durationFor(track, i), ease: "none", repeat: -1, paused: true },
          ),
        );
        const off: (() => void)[] = [];
        // a velocidade acompanha a largura da tela (mesma sensação no celular);
        // a posição no loop se mantém ao recalcular
        let width = window.innerWidth;
        const onResize = () => {
          if (window.innerWidth === width) return; // barra do navegador no celular muda só a altura
          width = window.innerWidth;
          tweens.forEach((t, i) => {
            const p = t.progress();
            t.duration(durationFor(tracks[i], i));
            t.progress(p);
          });
        };
        window.addEventListener("resize", onResize);
        off.push(() => window.removeEventListener("resize", onResize));
        // desktop: desacelera um pouco no hover (cada fileira por si), sem parar
        const rowsEls = gsap.utils.toArray<HTMLElement>("[data-logo-row]");
        if (window.matchMedia("(hover: hover)").matches) {
          rowsEls.forEach((row, i) => {
            const slow = () => gsap.to(tweens[i], { timeScale: HOVER_SPEED, duration: 0.8, ease: "power2.out" });
            const fast = () => gsap.to(tweens[i], { timeScale: 1, duration: 0.8, ease: "power2.out" });
            row.addEventListener("mouseenter", slow);
            row.addEventListener("mouseleave", fast);
            off.push(() => {
              row.removeEventListener("mouseenter", slow);
              row.removeEventListener("mouseleave", fast);
            });
          });
        }
        const visible = ScrollTrigger.create({
          trigger: el,
          start: "top bottom",
          end: "bottom top",
          onToggle: (self) => tweens.forEach((t) => (self.isActive ? t.play() : t.pause())),
        });
        if (visible.isActive) tweens.forEach((t) => t.play());
        // linha de fecho: fade com leve subida, uma vez
        const noteEl = el.querySelector("[data-logo-note]")!;
        gsap.set(noteEl, { autoAlpha: 0, y: 16 });
        const stopNote = revealOnce({
          trigger: noteEl,
          start: "top 90%",
          play: () => gsap.to(noteEl, { autoAlpha: 1, y: 0, duration: 0.9, ease: "power3.out" }),
          finish: () => gsap.set(noteEl, { autoAlpha: 1, y: 0 }),
        });
        return () => {
          stopNote();
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
      <p data-logo-note className="mt-10 px-6 text-center text-xs leading-relaxed text-[#8a8a8a] md:mt-12 md:px-12 md:text-[13px]">
        {note}
      </p>
    </div>
  );
}

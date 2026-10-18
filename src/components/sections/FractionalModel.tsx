"use client";

import { useEffect, useRef, useState } from "react";
import { protectTerms } from "@/components/Term";
import { presetFor, useSceneTier, type Tier } from "@/lib/quality";
import { isMobileUI } from "@/lib/mobile";
import { startModelScene, STACKED_QUERY } from "@/components/graphics/fractional/modelScene";

export type FractionalModelCopy = {
  eyebrow: string;
  title: string;
  /** Final do título, em cinza. */
  titleMuted: string;
  text: string;
  /** Descrição da animação para leitores de tela. */
  sphereLabel: string;
  cueHover: string;
  cueTouch: string;
  /** "agora" no canto das caixas. */
  now: string;
  /** Esquerda ("Por que o modelo") e direita ("Por que comigo"), 3 caixas cada. */
  columns: { label: string; items: { tag: string; title: string; text: string }[] }[];
};

/** Ícones de traço fino, na ordem de chegada (data-i). */
const ICONS = [
  // mercado
  <>
    <circle cx="12" cy="12" r="3" />
    <ellipse cx="12" cy="12" rx="9" ry="4" transform="rotate(-25 12 12)" />
  </>,
  // seu time
  <>
    <circle cx="8" cy="9" r="3" />
    <circle cx="16" cy="9" r="3" />
    <path d="M3 19c.8-3 2.8-4.5 5-4.5s4.2 1.5 5 4.5M11 19c.8-3 2.8-4.5 5-4.5s4.2 1.5 5 4.5" />
  </>,
  // repertório
  <>
    <rect x="4" y="4" width="7" height="7" rx="2" />
    <rect x="13" y="4" width="7" height="7" rx="2" />
    <rect x="4" y="13" width="7" height="7" rx="2" />
    <circle cx="16.5" cy="16.5" r="3.5" />
  </>,
  // criação
  <>
    <path d="M4 20c4-1 6.5-3.5 8-7l3-6 2 2-6 3c-3.5 1.5-6 4-7 8Z" />
    <path d="M15 7l2-3 3 3-3 2" />
  </>,
  // direção
  <>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M15.5 8.5 13.3 13.3 8.5 15.5 10.7 10.7Z" />
  </>,
  // presença
  <>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 12V3.5A8.5 8.5 0 0 1 20.2 9.8Z" />
  </>,
];

/** Partículas por nível (tela larga / coluna única ou toque). */
function particlesFor(tier: Tier, compact: boolean) {
  const low = tier === "low" || tier === "none";
  if (compact) return low ? 1600 : 2800;
  return low ? 2600 : tier === "medium" ? 4500 : 6500;
}

/**
 * "O modelo fractional": parte ESCURA da seção Fractional (#08090B), logo
 * abaixo da parte clara. Cabeçalho centralizado, esfera de partículas com anel
 * de 6 frações no meio (canvas 2D, graphics/fractional/modelScene.ts) e 6
 * caixas de vidro escuro (3 de cada lado; empilhadas até 980px). Fundo e cores
 * são fixos (não seguem o tema vivo): corte seco com a parte clara, como no
 * protótipo; com data-theme-cut, o ThemeScroll só troca as cores vivas
 * (cabeçalho) quando a borda passa por baixo do cabeçalho. A cena só começa a ~1 tela de distância, pausa fora
 * da tela e entra no monitor de FPS (lib/quality.ts), que pode baixar o número
 * de partículas. Sem JS, as caixas ficam visíveis (o estado escondido só
 * existe com data-armed, posto no cliente).
 */
export default function FractionalModel({ copy, note }: { copy: FractionalModelCopy; note: string }) {
  const section = useRef<HTMLElement>(null);
  const row = useRef<HTMLDivElement>(null);
  const fx = useRef<HTMLCanvasElement>(null);
  const bg = useRef<HTMLCanvasElement>(null);
  const memo = useRef({ p: 0 });
  const [near, setNear] = useState(false);
  const tier = useSceneTier("esfera fractional", section, near);

  // arma o estado escondido das caixas e espera a seção chegar perto
  useEffect(() => {
    const el = section.current;
    if (!el) return;
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) el.setAttribute("data-armed", "");
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        setNear(true);
        io.disconnect();
      },
      { rootMargin: "100% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!near || !section.current || !row.current || !fx.current || !bg.current) return;
    const compact = isMobileUI() || window.matchMedia(STACKED_QUERY).matches;
    const low = tier === "low" || tier === "none";
    const cards = [...row.current.querySelectorAll<HTMLElement>("[data-i]")].sort(
      (a, b) => Number(a.dataset.i) - Number(b.dataset.i),
    );
    return startModelScene({
      section: section.current,
      row: row.current,
      fx: fx.current,
      bg: bg.current,
      cards,
      particles: particlesFor(tier, compact),
      maxDpr: presetFor(tier === "none" ? "low" : tier).maxDpr,
      bgEvery: compact || low ? 3 : 2,
      reduce: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      memo: memo.current,
    });
  }, [near, tier]);

  return (
    <section
      ref={section}
      id="o-modelo-fractional"
      data-theme="dark"
      data-theme-cut
      aria-labelledby="o-modelo-fractional-title"
      className="fm relative z-10 overflow-hidden px-6 pb-[120px] pt-[104px] md:px-12"
    >
      <canvas ref={bg} aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full" />
      <div className="relative mx-auto flex max-w-[1240px] flex-col gap-10">
        <div className="flex flex-col items-center gap-[22px] text-center">
          <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#A3A3AB]">{protectTerms(copy.eyebrow)}</span>
          <h2
            id="o-modelo-fractional-title"
            className="max-w-[900px] text-balance text-[clamp(36px,5vw,66px)] font-light leading-[1.03] tracking-[-0.04em] text-[#EDEDEF]"
          >
            {copy.title} <span className="text-[#7C7C85]">{copy.titleMuted}</span>
          </h2>
          <p className="max-w-[520px] text-balance text-[17px] font-light leading-[1.6] text-[#A3A3AB]">{copy.text}</p>
        </div>

        <div ref={row} className="fm-row">
          <canvas ref={fx} role="img" aria-label={copy.sphereLabel} className="fm-fx" />

          {copy.columns.map((col, side) => (
            <div key={col.label} className={`fm-col ${side === 0 ? "fm-col-l" : "fm-col-r"}`}>
              <span className="mb-1 pl-1.5 font-mono text-[11px] uppercase tracking-[0.16em] text-[#8A8A93]">{col.label}</span>
              {col.items.map((item, j) => {
                const i = j * 2 + side; // chegada alternando esquerda e direita
                return (
                  <article key={item.tag} data-i={i} className="fm-card">
                    <span aria-hidden="true" className="fm-ic">
                      <svg viewBox="0 0 24 24" fill="none" stroke="#EDEDEF" strokeWidth="1.3" strokeLinecap="round" className="h-5 w-5">
                        {ICONS[i]}
                      </svg>
                    </span>
                    <div className="min-w-0">
                      <div className="mb-1.5 flex items-center justify-between gap-2">
                        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#8A8A93]">{item.tag}</span>
                        <span className="text-xs text-[#7C7C85]">{copy.now}</span>
                      </div>
                      <h3 className="mb-1 text-base font-medium leading-[1.3] tracking-[-0.01em] text-[#EDEDEF]">{item.title}</h3>
                      <p className="text-sm font-light leading-normal text-[#A3A3AB]">{protectTerms(item.text)}</p>
                    </div>
                  </article>
                );
              })}
            </div>
          ))}

          <div className="fm-mid">
            <p className="fm-cue font-mono text-[11px] uppercase tracking-[0.16em] text-[#8A8A93]">
              <i aria-hidden="true" className="css-loop" />
              <span className="fm-cue-hover">{copy.cueHover}</span>
              <span className="fm-cue-touch">{copy.cueTouch}</span>
            </p>
          </div>
        </div>

        <p className="mx-auto mt-6 max-w-[620px] text-center text-[15px] font-light leading-[1.6] text-[#8A8A93]">
          {protectTerms(note)}
        </p>
      </div>
    </section>
  );
}

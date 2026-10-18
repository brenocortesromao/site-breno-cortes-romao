"use client";

import { useEffect, useRef, useState } from "react";
import { protectTerms } from "@/components/Term";
import { getTier, presetFor, useSceneTier, type Tier } from "@/lib/quality";
import { isMobileUI } from "@/lib/mobile";
import { startModelScene, STACKED_QUERY } from "@/components/graphics/fractional/modelScene";
import FractionalModelTitle, { type TitleMode } from "./FractionalModelTitle";

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
  /** Esquerda ("Por que o modelo") e direita ("Por que comigo"), 3 caixas cada. */
  columns: { label: string; items: { tag: string; title: string; text: string }[] }[];
};

/** Caixas = frações do anel. */
const SEGMENTS = 6;

/** Partículas por nível (tela larga / coluna única ou toque). */
function particlesFor(tier: Tier, compact: boolean) {
  const low = tier === "low" || tier === "none";
  if (compact) return low ? 1600 : 2800;
  return low ? 2600 : tier === "medium" ? 4500 : 6500;
}

/**
 * "O modelo fractional": parte ESCURA da seção Fractional, logo abaixo da
 * parte clara. Cabeçalho centralizado, esfera de partículas com anel de 6
 * frações no meio (canvas 2D, graphics/fractional/modelScene.ts) e 6 caixas de
 * vidro escuro (3 de cada lado; empilhadas até 980px). A troca claro → escuro é
 * a do ThemeScroll, como nas outras seções: fundo, textos do cabeçalho (.fm-t*,
 * misturas de --fg com --bg) e curvas do fundo seguem o tema vivo; só as caixas
 * têm cores fixas. A cena só começa a ~1 tela de distância, pausa fora da
 * tela e entra no monitor de FPS (lib/quality.ts), que pode baixar o número
 * de partículas. O título tem entrada própria (FractionalModelTitle); no modo
 * com partículas, a esfera só começa a se formar quando ele termina (gate). Sem JS, as caixas ficam visíveis (o estado escondido só
 * existe com data-armed, posto no cliente).
 */
export default function FractionalModel({ copy, note }: { copy: FractionalModelCopy; note: string }) {
  const section = useRef<HTMLElement>(null);
  const row = useRef<HTMLDivElement>(null);
  const fx = useRef<HTMLCanvasElement>(null);
  const bg = useRef<HTMLCanvasElement>(null);
  const memo = useRef({ p: 0 });
  /** Formação da esfera liberada (no modo com partículas, pelo título). */
  const gate = useRef({ open: false });
  const [near, setNear] = useState(false);
  const [titleMode, setTitleMode] = useState<TitleMode>("pending");
  const tier = useSceneTier("esfera fractional", section, near);

  // arma o estado escondido das caixas e espera a seção chegar perto
  useEffect(() => {
    const el = section.current;
    if (!el) return;
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) el.setAttribute("data-armed", "");
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        // entrada do título: partículas só no desktop com nível médio/alto
        const t = getTier();
        const mode: TitleMode = window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "static"
          : isMobileUI() || t === "low" || t === "none"
            ? "light"
            : "particles";
        if (mode !== "particles") gate.current.open = true;
        setTitleMode(mode);
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
      gate: gate.current,
    });
  }, [near, tier]);

  return (
    <section
      ref={section}
      id="o-modelo-fractional"
      data-theme="dark"
      aria-labelledby="o-modelo-fractional-title"
      className="fm relative z-10 overflow-hidden px-6 pb-[120px] pt-[104px] md:px-12"
    >
      <canvas ref={bg} aria-hidden="true" className="fm-bg-fade pointer-events-none absolute inset-0 h-full w-full" />
      <div className="relative mx-auto flex max-w-[1240px] flex-col gap-10">
        <FractionalModelTitle
          eyebrow={copy.eyebrow}
          title={copy.title}
          titleMuted={copy.titleMuted}
          text={copy.text}
          mode={titleMode}
          gate={gate}
          row={row}
        />

        <div ref={row} className="fm-row">
          <canvas ref={fx} role="img" aria-label={copy.sphereLabel} className="fm-fx" />

          {copy.columns.map((col, side) => (
            <div key={col.label} className={`fm-col ${side === 0 ? "fm-col-l" : "fm-col-r"}`}>
              <span className="mb-1 pl-1.5 font-mono text-[11px] uppercase tracking-[0.16em] fm-t3">{col.label}</span>
              {col.items.map((item, j) => {
                const i = j * 2 + side; // chegada alternando esquerda e direita
                return (
                  <article key={item.tag} data-i={i} className="fm-card">
                    <div className="mb-1.5 flex items-center justify-between gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[#8A8A93]">
                      <span>{item.tag}</span>
                      {/* fração da caixa no anel, na ordem de chegada */}
                      <span className="tabular-nums tracking-[0.08em]">
                        {i + 1}/{SEGMENTS}
                      </span>
                    </div>
                    <h3 className="mb-1 text-[17px] font-normal leading-[1.3] tracking-[-0.01em] text-[#EDEDEF]">{item.title}</h3>
                    <p className="text-[14px] font-light leading-[1.55] text-[#B4B4BC]">{protectTerms(item.text)}</p>
                  </article>
                );
              })}
            </div>
          ))}

          <div className="fm-mid">
            <p className="fm-cue font-mono text-[11px] uppercase tracking-[0.16em] fm-t3">
              <i aria-hidden="true" className="css-loop" />
              <span className="fm-cue-hover">{copy.cueHover}</span>
              <span className="fm-cue-touch">{copy.cueTouch}</span>
            </p>
          </div>
        </div>

        <p className="mx-auto mt-6 max-w-[620px] text-center text-[15px] font-light leading-[1.6] fm-t3">
          {protectTerms(note)}
        </p>
      </div>
    </section>
  );
}

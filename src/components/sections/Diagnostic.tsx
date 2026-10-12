"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import CloudBackdrop from "@/components/graphics/CloudBackdrop";

gsap.registerPlugin(useGSAP, ScrollTrigger);

export type DiagnosticCopy = {
  eyebrow: string;
  title: string;
  /** Instrução para telas de toque / para mouse (escolhida por CSS, sem JS). */
  hintTouch: string;
  hintClick: string;
  /** Etiquetas do cursor customizado (desktop). */
  cursorMark: string;
  cursorUnmark: string;
  /** Já formatado para cada contagem possível: índice = número de marcadas. */
  counters: string[];
  items: string[];
  /** Fecho padrão (sem interação / nenhuma marcada). */
  closing: string;
  /** Fecho com exatamente 1 marcada. */
  closingOne: string;
  /** Fecho com 2 ou mais marcadas. */
  closingMatched: string;
  cta: string;
};

const DEMO_KEY = "diag-demo-shown";
/** true só no cliente (portal do cursor), sem setState em efeito. */
const noopSubscribe = () => () => {};

/**
 * Diagnóstico (§3b): frases entre aspas na voz do fundador, marcáveis (clique,
 * toque ou teclado: são <button aria-pressed>). Marcadas ficam prata e acesas;
 * as demais, em grafite. Contador "x de N" e fecho em 3 estados (0 / 1 / 2+);
 * com 2+ aparece o botão para o contato. Sem JS/sem interação, o texto padrão
 * completo já está no HTML.
 * Pistas de que dá para clicar:
 * - demonstração única por visita (sessionStorage): ao entrar na tela, a 1ª
 *   frase acende sozinha e apaga após ~1 s (não conta no contador);
 * - círculos pulsam de leve até a primeira interação;
 * - hover (mouse): frase clareia, ✓ fraco no círculo e cursor customizado com
 *   "Marcar"/"Desmarcar";
 * - instrução visível com ícone ("Toque…" no toque, "Clique…" com mouse).
 * Sem pulso nem demonstração com prefers-reduced-motion.
 * Fundo: nuvens 3D (CloudBackdrop), fixas atrás do conteúdo; a câmera as
 * atravessa com o scroll e elas se abrem no fim da seção.
 */
export default function Diagnostic({ copy, ctaHref }: { copy: DiagnosticCopy; ctaHref: string }) {
  const root = useRef<HTMLElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const cursor = useRef<HTMLDivElement>(null);
  const [marked, setMarked] = useState<boolean[]>(() => copy.items.map(() => false));
  const [interacted, setInteracted] = useState(false);
  const [demo, setDemo] = useState<number | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const onClient = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const count = marked.filter(Boolean).length;
  const matched = count >= 2;
  const closing = matched ? copy.closingMatched : count === 1 ? copy.closingOne : copy.closing;

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.utils.toArray<HTMLElement>("[data-diag-item]").forEach((item) => {
          gsap.fromTo(
            item,
            { opacity: 0.18, x: -12 },
            {
              opacity: 1,
              x: 0,
              ease: "none",
              scrollTrigger: { trigger: item, start: "top 80%", end: "top 55%", scrub: 0.6 },
            },
          );
        });
      });
    },
    { scope: root },
  );

  // Demonstração única: 1ª frase acende sozinha quando a lista entra na tela.
  useEffect(() => {
    const el = list.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    try {
      if (sessionStorage.getItem(DEMO_KEY)) return;
    } catch {
      /* armazenamento indisponível: segue sem lembrar */
    }
    let on = 0;
    let off = 0;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        try {
          sessionStorage.setItem(DEMO_KEY, "1");
        } catch {
          /* ignora */
        }
        on = window.setTimeout(() => setDemo(0), 500);
        off = window.setTimeout(() => setDemo(null), 1600);
      },
      { threshold: 0.5 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      clearTimeout(on);
      clearTimeout(off);
    };
  }, []);

  // Cursor customizado: acompanha o mouse sobre a lista (só ponteiro fino).
  // Preso dentro da tela: perto da borda direita ele não sai da viewport
  // (nem é cortado, nem pode alargar a página).
  useEffect(() => {
    const el = list.current;
    if (!el) return;
    const move = (e: PointerEvent) => {
      const c = cursor.current;
      if (!c || e.pointerType !== "mouse") return;
      const vw = document.documentElement.clientWidth;
      const vh = document.documentElement.clientHeight;
      const x = Math.min(e.clientX + 18, vw - c.offsetWidth - 8);
      const y = Math.min(e.clientY + 14, vh - c.offsetHeight - 8);
      c.style.transform = `translate(${x}px, ${y}px)`;
    };
    el.addEventListener("pointermove", move);
    return () => el.removeEventListener("pointermove", move);
  }, []);

  const toggle = (i: number) => {
    setInteracted(true);
    setDemo(null);
    setMarked((m) => m.map((v, j) => (j === i ? !v : v)));
  };

  return (
    <section
      ref={root}
      id="diagnostico"
      data-theme="dark"
      aria-labelledby="diagnostico-title"
      // overflow-clip (e não hidden): recorta igual, mas não cria contêiner de
      // rolagem, que anularia o sticky do fundo de nuvens
      className="relative z-10 min-h-svh overflow-clip"
    >
      {/* fundo: camada absoluta atrás do conteúdo, fora da grid */}
      <CloudBackdrop />
      {/* conteúdo acima do fundo */}
      <div className="relative z-10 mx-auto w-full max-w-[1600px] px-6 py-[clamp(6rem,16vh,12rem)] md:px-12">
        <div className="grid gap-10 md:grid-cols-12 md:gap-8">
          <div className="md:col-span-4">
            <div className="md:sticky md:top-32">
              <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-silver m-center">{copy.eyebrow}</p>
              <h2
                id="diagnostico-title"
                className="m-center mt-6 text-[clamp(2.1rem,4vw,4.25rem)] font-semibold leading-[1.02] tracking-[-0.05em]"
              >
                {copy.title}
              </h2>
              {/* instrução com ícone; texto por tipo de ponteiro (CSS, sem JS) */}
              <p className="mt-6 flex max-w-xs items-center gap-3 text-base leading-snug text-foreground/85 max-md:mx-auto max-md:justify-center">
                <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="12" cy="12" r="3.2" />
                  <circle cx="12" cy="12" r="8" strokeOpacity="0.45" />
                </svg>
                <span className="[@media(pointer:fine)]:hidden">{copy.hintTouch}</span>
                <span className="hidden [@media(pointer:fine)]:inline">{copy.hintClick}</span>
              </p>
              <p aria-live="polite" className="m-center mt-6 font-mono text-[11px] uppercase tracking-[0.22em]">
                {copy.counters[count]}
              </p>
            </div>
          </div>

          <ul
            ref={list}
            onPointerLeave={() => setHover(null)}
            className="min-w-0 md:col-span-7 md:col-start-6"
          >
            {copy.items.map((item, i) => {
              const lit = marked[i] || demo === i;
              return (
                <li key={i} data-diag-item className="border-t border-line">
                  <button
                    type="button"
                    aria-pressed={marked[i]}
                    onClick={() => toggle(i)}
                    onPointerEnter={(e) => e.pointerType === "mouse" && setHover(i)}
                    className="group grid w-full cursor-pointer grid-cols-[2.5rem_minmax(0,1fr)] items-start gap-4 py-7 text-left outline-none focus-visible:ring-1 focus-visible:ring-foreground md:grid-cols-[3.5rem_minmax(0,1fr)] md:py-10 [@media(pointer:fine)]:cursor-none"
                  >
                    {/* marcador: anel (pulsa até a 1ª interação) → preenchido em prata */}
                    <span
                      aria-hidden="true"
                      className={`mt-2 grid h-6 w-6 place-items-center rounded-full border transition-all duration-500 md:h-7 md:w-7 ${
                        lit
                          ? "border-foreground bg-foreground text-background"
                          : "border-silver/60 text-transparent group-hover:border-foreground group-hover:text-foreground/40 group-focus-visible:text-foreground/40"
                      } ${!interacted && !lit ? "animate-[ringPulse_2.4s_ease-in-out_infinite] motion-reduce:animate-none" : ""}`}
                      style={!interacted && !lit ? { animationDelay: `${i * 0.18}s` } : undefined}
                    >
                      <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M3 8.5 6.5 12 13 4.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                    <span
                      className={`break-words text-[clamp(1.45rem,2.6vw,2.75rem)] leading-[1.12] tracking-[-0.04em] transition-[color,opacity] duration-500 ${
                        lit
                          ? "font-medium text-silver-gradient"
                          : "font-light text-silver opacity-55 group-hover:text-foreground group-hover:opacity-95 group-focus-visible:opacity-95"
                      }`}
                    >
                      {item}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        <div aria-live="polite" className="mt-16 md:ml-[calc(41.666%+1rem)] md:mt-24">
          <p
            key={count >= 2 ? "m" : count === 1 ? "o" : "d"}
            className="m-center max-w-2xl max-md:mx-auto animate-[fadeIn_0.6s_ease] text-[clamp(1.5rem,2.6vw,2.6rem)] font-semibold leading-[1.1] tracking-[-0.04em]"
          >
            {closing}
          </p>
          {matched && (
            <a
              href={ctaHref}
              className="mt-8 inline-flex animate-[fadeIn_0.6s_ease] items-center gap-3 border border-foreground px-6 py-4 font-mono text-[11px] uppercase tracking-[0.24em] transition-colors hover:bg-foreground hover:text-background"
            >
              {copy.cta} <span aria-hidden="true">→</span>
            </a>
          )}
        </div>
      </div>

      {/* cursor customizado (decorativo; o botão já informa o estado via aria-pressed).
          Portal direto no <body>: `fixed` sempre relativo à tela, mesmo que um
          ancestral da seção ganhe transform (aí ele viraria absolute e o
          translate com clientX poderia alargar a página). */}
      {onClient &&
        createPortal(
          <div
            ref={cursor}
            aria-hidden="true"
            className={`pointer-events-none fixed left-0 top-0 z-50 hidden rounded-full border border-foreground/40 bg-background/80 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.2em] backdrop-blur transition-opacity duration-200 [@media(pointer:fine)]:block ${
              hover === null ? "opacity-0" : "opacity-100"
            }`}
          >
            {hover !== null && marked[hover] ? copy.cursorUnmark : copy.cursorMark}
          </div>,
          document.body,
        )}
    </section>
  );
}

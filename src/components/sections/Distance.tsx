"use client";

import { Fragment, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import type { DistanceCharts } from "@/content/charts";

gsap.registerPlugin(useGSAP, ScrollTrigger);

export type DistanceCopy = {
  eyebrow: string;
  /**
   * Texto de cada bloco (A, B, C), conforme o CONTEUDO-SITE.md, e a
   * palavra-chave que recebe o reflexo prata no fim da decodificação
   * (localizada dentro do texto, então o texto segue limpo e traduzível).
   */
  charts: { text: string; highlight?: string }[];
};

const STEPS = ["a", "b", "c"] as const;

/** Caracteres de "código" que passam por cada letra antes de ela travar. */
const GLYPHS = "#%&/<>=+*01ABCDEFGHIJKLMNOPQRSTUVWXYZ";
/** Decodificação (s): letras surgem embaralhadas em APPEAR, a 1ª trava em LEAD
 * e a última em LEAD + SPREAD; cada uma acende de grafite a branco em FADE. */
const APPEAR = 0.2;
const LEAD = 0.3;
const SPREAD = 0.85;
const FADE = 0.45;
/** Intervalo entre trocas de caractere aleatório (s). */
const SWAP = 0.05;

/** Prepara um path para ser "desenhado": dash = comprimento total, escondido. */
function prepDraw(path: Element | null) {
  if (!(path instanceof SVGPathElement)) return 0;
  const len = path.getTotalLength();
  gsap.set(path, { strokeDasharray: len, strokeDashoffset: len });
  return len;
}

type Char = { ch: string; key: boolean };

/** Divide a frase em palavras de letras e marca as letras da palavra-chave. */
function splitPhrase(text: string, highlight?: string): Char[][] {
  const start = highlight ? text.indexOf(highlight) : -1;
  const end = start + (highlight?.length ?? 0);
  let pos = 0;
  return text.split(" ").map((word) => {
    const chars = Array.from(word).map((ch) => {
      const c = { ch, key: start >= 0 && pos >= start && pos < end };
      pos += ch.length;
      return c;
    });
    pos += 1; // espaço
    return chars;
  });
}

const randomGlyph = () => GLYPHS[Math.floor(Math.random() * GLYPHS.length)];

/**
 * Decodifica uma frase: cada letra mostra caracteres aleatórios trocando
 * rápido (camada sobreposta em Geist Mono prata) e trava na letra certa da
 * esquerda para a direita; ao travar, a letra real aparece em grafite e acende
 * para branco. Chama `onDone` quando a última letra termina de acender.
 * Retorna a limpeza (para o ticker e esvazia as camadas).
 */
function decode(phrase: HTMLElement, onDone: () => void) {
  const chars = gsap.utils.toArray<HTMLElement>(phrase.querySelectorAll("[data-ch]"));
  const glyphs = chars.map((c) => c.nextElementSibling as HTMLElement);
  const n = chars.length;
  const state = new Uint8Array(n); // 0 esperando, 1 embaralhando, 2 travada
  let t0 = -1;
  let lastSwap = -1;
  let locked = 0;

  const tick = (time: number) => {
    if (t0 < 0) t0 = time;
    const t = time - t0;
    const swap = t - lastSwap >= SWAP;
    if (swap) lastSwap = t;
    for (let i = 0; i < n; i++) {
      if (state[i] === 2) continue;
      const f = n > 1 ? i / (n - 1) : 1;
      if (t >= LEAD + f * SPREAD) {
        state[i] = 2;
        locked++;
        glyphs[i].textContent = "";
        gsap.fromTo(chars[i], { opacity: 0.16 }, { opacity: 1, duration: FADE, ease: "power1.out" });
      } else if (t >= f * APPEAR && (state[i] === 0 || swap)) {
        state[i] = 1;
        glyphs[i].textContent = randomGlyph();
      }
    }
    if (locked === n) {
      gsap.ticker.remove(tick);
      gsap.delayedCall(FADE, onDone);
    }
  };
  gsap.ticker.add(tick);

  return () => {
    gsap.ticker.remove(tick);
    gsap.killTweensOf(onDone);
    glyphs.forEach((g) => (g.textContent = ""));
  };
}

/** Reflexo prata uma vez sobre as letras da palavra-chave (ver .text-shine-fixed). */
function shine(phrase: HTMLElement) {
  const keys = phrase.querySelectorAll<HTMLElement>("[data-key]");
  if (!keys.length) return;
  const first = keys[0].getBoundingClientRect();
  const last = keys[keys.length - 1].getBoundingClientRect();
  const vw = window.innerWidth;
  // gradiente em coordenadas da tela (background-attachment: fixed, 300vw com
  // a faixa no meio): a faixa atravessa a palavra inteira e para fora dela
  gsap.fromTo(
    keys,
    { backgroundPositionX: first.left - 120 - vw * 1.5 },
    { backgroundPositionX: last.right + 120 - vw * 1.5, duration: 1.1, ease: "power2.inOut" },
  );
}

/**
 * "A distância": TRÊS BLOCOS separados, um abaixo do outro, sem pin. Cada
 * bloco tem o texto à esquerda e o gráfico do dono à direita (public/graficos/,
 * inline com ids ga-/gb-/gc-; ver src/content/charts.ts):
 *  A. curvas + área "A DISTÂNCIA";
 *  B. marco "DIREÇÃO DE MARCA", fantasma "SEM DIREÇÃO" e a marca subindo até o
 *     negócio enquanto a área some (começa no estado final de A);
 *  C. consistência: pontos se alinham no eixo comum.
 * Cada gráfico é animado por SCRUB curto: começa quando o bloco entra pela base
 * da tela e termina quando o gráfico chega ao centro (cerca de meia tela).
 * As três frases usam o MESMO efeito, por gatilho (não scrub): DECODIFICAÇÃO
 * letra por letra (ver `decode`), ~1,3 s por frase, e no fim um reflexo prata
 * na palavra-chave (`highlight`: "distância", "fechá-la", "confiar").
 * Sem layout shift: cada letra real fica no lugar como reserva (invisível até
 * travar) e o caractere aleatório é uma camada absoluta por cima, então as
 * quebras de linha são as da frase final.
 * O texto fica inteiro no HTML (letras em <span>, camadas aleatórias vazias no
 * servidor; aria-label com a frase completa). Sem JS ou com
 * prefers-reduced-motion: frase final estática, gráficos no estado final.
 */
export default function Distance({ copy, charts }: { copy: DistanceCopy; charts: DistanceCharts }) {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const section = root.current!;
        const q = (id: string) => section.querySelector(`#${id}`);
        const fig = (s: string) => section.querySelector(`[data-chart="${s}"]`);
        const ease = "none";
        const scrubbed = (s: string) =>
          gsap.timeline({
            defaults: { ease },
            scrollTrigger: { trigger: fig(s), start: "top bottom", end: "center center", scrub: 0.5, invalidateOnRefresh: true },
          });

        // ---------- A: eixos, curvas desenhadas, área da distância ----------
        prepDraw(q("ga-curva-negocio"));
        prepDraw(q("ga-curva-marca"));
        scrubbed("a")
          .fromTo([q("ga-eixos"), q("ga-rotulos-eixos")], { opacity: 0 }, { opacity: 1, duration: 0.5 }, 0)
          .to([q("ga-curva-negocio"), q("ga-curva-marca")], { strokeDashoffset: 0, duration: 1.5 }, 0.2)
          .fromTo(q("ga-rotulos"), { opacity: 0 }, { opacity: 1, duration: 0.4 }, 1.4)
          .fromTo([q("ga-area-distancia"), q("ga-area-brilho")], { opacity: 0 }, { opacity: 1, duration: 0.7 }, 1.4)
          .fromTo([q("ga-rotulo-distancia"), q("ga-nota")], { opacity: 0 }, { opacity: 1, duration: 0.5 }, 1.9);

        // ---------- B: parte do estado final de A ----------
        prepDraw(q("gb-curva-marca-depois"));
        scrubbed("b")
          .fromTo(q("gb-marco-direcao"), { opacity: 0 }, { opacity: 1, duration: 0.5 }, 0)
          .fromTo(q("gb-curva-marca-fantasma"), { opacity: 0 }, { opacity: 1, duration: 0.5 }, 0.3)
          .to(q("gb-curva-marca-depois"), { strokeDashoffset: 0, duration: 1.4 }, 0.6)
          .to(q("gb-area-distancia"), { opacity: 0, duration: 1.4 }, 0.6)
          .fromTo(q("gb-rotulos"), { opacity: 0 }, { opacity: 1, duration: 0.4 }, 1.8);

        // ---------- C: pontos se alinham no eixo comum ----------
        const tlC = scrubbed("c");
        charts.cStart.forEach((p, i) => {
          const g = q(p.id);
          if (!g) return;
          const at = i * 0.3;
          tlC
            .fromTo(g, { x: p.dx, y: p.dy }, { x: 0, y: 0, duration: 0.9 }, at)
            .fromTo(
              g.querySelectorAll("line, polyline"),
              { rotation: p.angle, svgOrigin: `${p.cx} ${p.cy}` },
              { rotation: 0, svgOrigin: `${p.cx} ${p.cy}`, duration: 0.9 },
              at,
            );
        });
        const axis = [q("gc-eixo-comum"), q("gc-eixo-comum")?.nextElementSibling ?? null].filter(Boolean);
        tlC.fromTo(axis, { opacity: 0 }, { opacity: 1, duration: 0.5 }, Math.max(tlC.duration() - 0.3, 0));

        // ---------- frases: decodificação ao entrar na tela, uma vez ----------
        const cleanups: (() => void)[] = [];
        section.querySelectorAll<HTMLElement>("[data-decode]").forEach((phrase) => {
          gsap.set(phrase.querySelectorAll("[data-ch]"), { opacity: 0 });
          ScrollTrigger.create({
            trigger: phrase,
            start: "top 85%",
            once: true,
            onEnter: () => cleanups.push(decode(phrase, () => shine(phrase))),
          });
        });
        return () => cleanups.forEach((fn) => fn());
      });
    },
    { scope: root },
  );

  const svgs = [charts.a, charts.b, charts.c];

  return (
    <section
      ref={root}
      id="distancia"
      data-theme="gradient"
      aria-labelledby="distancia-title"
      className="relative z-10 overflow-x-clip"
    >
      <div className="mx-auto w-full max-w-[1600px] px-6 pb-[clamp(6rem,16vh,12rem)] pt-[clamp(6rem,16vh,12rem)] md:px-12">
        <h2 id="distancia-title" className="font-mono text-[11px] font-normal uppercase tracking-[0.28em] text-silver">
          {copy.eyebrow}
        </h2>

        <div className="mt-12 grid gap-[clamp(6rem,22vh,14rem)] md:mt-16">
          {copy.charts.map((chart, i) => {
            const step = STEPS[i];
            return (
              <div key={step} data-step={step} className="grid items-center gap-8 md:grid-cols-12 md:gap-10">
                {/* aria-label: a frase inteira para leitores de tela; translate="no":
                    letras em <span> isolados viram lixo no tradutor automático */}
                <h3
                  aria-label={chart.text}
                  translate="no"
                  data-decode
                  className="text-[clamp(1.7rem,3.4vw,3.5rem)] font-semibold leading-[1.05] tracking-[-0.05em] md:col-span-5"
                >
                  {splitPhrase(chart.text, chart.highlight).map((word, k) => (
                    <Fragment key={k}>
                      <span aria-hidden="true" className="inline-block whitespace-nowrap">
                        {word.map((c, j) => (
                          // letra real (reserva a largura; invisível até travar)
                          // + camada do caractere aleatório, vazia no HTML
                          <span key={j} className="relative inline-block">
                            <span
                              data-ch
                              data-key={c.key || undefined}
                              className={`inline-block ${c.key ? "text-shine-fixed" : ""}`}
                            >
                              {c.ch}
                            </span>
                            <span className="pointer-events-none absolute inset-y-0 left-1/2 flex -translate-x-1/2 items-center font-mono text-[0.78em] font-normal tracking-normal text-silver" />
                          </span>
                        ))}
                      </span>{" "}
                    </Fragment>
                  ))}
                </h3>
                <figure
                  data-chart={step}
                  className="w-full md:col-span-7 [&>svg]:max-h-[70svh]"
                  // SVG do dono, lido do disco no build (conteúdo próprio, não de usuário)
                  dangerouslySetInnerHTML={{ __html: svgs[i] }}
                />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

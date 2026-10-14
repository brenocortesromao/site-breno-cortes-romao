"use client";

import { Fragment, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { revealOnce } from "@/lib/reveal";
import { isTouchScrolling } from "@/lib/mobile";

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
 * Destaque (só luz prateada, sem cor nova):
 * - moldura de 1px com uma faixa de luz percorrendo a borda (CSS .chrome-frame);
 * - grade de pontos que acende em volta do cursor (desktop) e uma onda de luz
 *   que atravessa a grade a cada ~6 s;
 * - scanner: a cada ~2,2 s um item de cada coluna acende (decode rápido, texto
 *   cromado, colchetes e barrinha), colunas defasadas 0 / 0,15 / 0,3 s, sem
 *   repetir o mesmo item seguido. No desktop pausa com o mouse sobre as colunas
 *   (vale o hover); no toque roda sempre, e tocar num item o acende.
 * Tudo pausa com a seção fora da tela.
 * prefers-reduced-motion / sem JS: tudo visível, sem scramble, varredura, blink,
 * scanner nem onda; moldura estática.
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
          if (isTouchScrolling()) return; // celular: congela enquanto a página rola
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

        // --- destaque: grade que reage, onda, scanner (pausam fora da tela) ---
        const frame = el.querySelector<HTMLElement>("[data-frame]")!;
        const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
        const cols = gsap.utils.toArray<HTMLElement>("[data-col]", el).map((c) => [...c.querySelectorAll<HTMLElement>("[data-col-item]")]);

        // pontos em volta do cursor (lerp suave via quickTo). As variáveis vão
        // direto na camada que as usa: gravadas na moldura, cada quadro
        // recalculava o estilo de todos os itens (variável CSS é herdada)
        const glow = el.querySelector<HTMLElement>("[data-dots-hover]");
        const waveLayer = el.querySelector<HTMLElement>("[data-wave]");
        const spot = { x: -999, y: -999 };
        const writeSpot = () => {
          glow?.style.setProperty("--mx", `${spot.x}px`);
          glow?.style.setProperty("--my", `${spot.y}px`);
        };
        const qx = gsap.quickTo(spot, "x", { duration: 0.35, ease: "power3.out", onUpdate: writeSpot });
        const qy = gsap.quickTo(spot, "y", { duration: 0.35, ease: "power3.out", onUpdate: writeSpot });
        const onSpot = (e: PointerEvent) => {
          if (e.pointerType !== "mouse") return;
          const r = frame.getBoundingClientRect();
          qx(e.clientX - r.left);
          qy(e.clientY - r.top);
        };
        const showSpot = () => glow && (glow.style.opacity = "1");
        const hideSpot = () => glow && (glow.style.opacity = "0");
        if (finePointer) {
          frame.addEventListener("pointermove", onSpot);
          frame.addEventListener("mouseenter", showSpot);
          frame.addEventListener("mouseleave", hideSpot);
          off.push(() => {
            frame.removeEventListener("pointermove", onSpot);
            frame.removeEventListener("mouseenter", showSpot);
            frame.removeEventListener("mouseleave", hideSpot);
          });
        }

        // onda de luz pela grade, da esquerda para a direita, a cada ~6 s
        const wave = { v: -30 };
        const wtl = gsap.timeline({ repeat: -1, repeatDelay: 4.5, paused: true, delay: 1 });
        wtl.fromTo(
          wave,
          { v: -30 },
          { v: 130, duration: 1.5, ease: "power1.inOut", onUpdate: () => waveLayer?.style.setProperty("--wx", `${wave.v}%`) },
        );

        // scanner
        let overCols = false;
        const grid = el.querySelector<HTMLElement>("[data-col-grid]");
        const enterCols = () => (overCols = true);
        const leaveCols = () => (overCols = false);
        if (finePointer && grid) {
          grid.addEventListener("mouseenter", enterCols);
          grid.addEventListener("mouseleave", leaveCols);
          off.push(() => {
            grid.removeEventListener("mouseenter", enterCols);
            grid.removeEventListener("mouseleave", leaveCols);
          });
        }
        const lastPick = cols.map(() => -1);
        const timers: gsap.core.Tween[] = [];
        const light = (item: HTMLElement) => {
          item.dataset.active = "";
          item.classList.add("scan-on");
          if (!jobs.has(item)) scramble(item, 0, HOVER);
          timers.push(
            gsap.delayedCall(1.4, () => {
              delete item.dataset.active;
              item.classList.remove("scan-on");
            }),
          );
        };
        let loop: gsap.core.Tween | null = null;
        const cycle = () => {
          if (!(finePointer && overCols)) {
            cols.forEach((list, c) => {
              if (!list.length) return;
              let i = Math.floor(Math.random() * list.length);
              if (i === lastPick[c]) i = (i + 1 + Math.floor(Math.random() * (list.length - 1))) % list.length;
              lastPick[c] = i;
              timers.push(gsap.delayedCall(c * 0.15, () => light(list[i])));
            });
          }
          loop = gsap.delayedCall(2.2, cycle);
        };
        // toque: tocar num item o acende
        const onTap = (e: PointerEvent) => {
          if (e.pointerType === "mouse" || tl.progress() < 1) return;
          const item = (e.target as Element).closest<HTMLElement>("[data-col-item]");
          if (item) light(item);
        };
        el.addEventListener("pointerdown", onTap);
        off.push(() => el.removeEventListener("pointerdown", onTap));

        // só com a seção na tela
        let visible = false;
        const sync = () => {
          const on2 = visible && !document.hidden;
          if (on2) {
            delete frame.dataset.paused;
            wtl.resume();
            if (tl.progress() === 1 && !loop) loop = gsap.delayedCall(0.6, cycle);
          } else {
            frame.dataset.paused = "";
            wtl.pause();
            loop?.kill();
            loop = null;
          }
        };
        tl.eventCallback("onComplete", sync); // o scanner começa depois da entrada
        const io = new IntersectionObserver(([e]) => {
          visible = e.isIntersecting;
          sync();
        });
        io.observe(el);
        document.addEventListener("visibilitychange", sync);

        // --- entrada: estado inicial só agora, com a animação registrada; a
        // rede de segurança (revealOnce) roda a entrada se o gatilho falhar e
        // mostra tudo direto se a página já estiver abaixo da seção ---
        gsap.set(lines, { scaleX: 0, transformOrigin: "left center" });
        gsap.set(titles, { opacity: 0 });
        items.forEach((item) => gsap.set(partsOf(item).letters, { opacity: 0 }));
        counters.forEach((c) => (c.textContent = "[00]"));
        const stopReveal = revealOnce({
          trigger: el.closest("section") ?? el,
          start: "top 75%",
          play: () => tl.play(),
          finish: () => {
            tl.progress(1, true);
            items.forEach((item) => gsap.set(partsOf(item).letters, { opacity: 1 }));
            counters.forEach((c, i) => (c.textContent = `[${String(columns[i]?.items.length ?? 0).padStart(2, "0")}]`));
            sync();
          },
        });
        off.push(() => {
          stopReveal();
          io.disconnect();
          document.removeEventListener("visibilitychange", sync);
          wtl.kill();
          loop?.kill();
          timers.forEach((t) => t.kill());
          gsap.killTweensOf(spot);
          items.forEach((item) => {
            delete item.dataset.active;
            item.classList.remove("scan-on");
          });
        });

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
      {/* moldura cromada viva (borda de 1px + faixa de luz: .chrome-frame) */}
      <div data-frame className="chrome-frame relative rounded-[4px] border border-[rgba(255,255,255,0.08)] p-5 md:p-7">
        {/* grade de pontos (fade nas bordas), pontos acesos no cursor, onda e varredura */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]">
          <div className="absolute inset-0 bg-[radial-gradient(circle,#1E1E1E_1px,transparent_1.5px)] [background-size:24px_24px] [mask-image:radial-gradient(ellipse_at_center,#000_45%,transparent_100%)]" />
          <div
            data-dots-hover
            className="absolute inset-0 bg-[radial-gradient(circle,#5c5c5c_1.4px,transparent_2px)] opacity-0 transition-opacity duration-500 [background-size:24px_24px]"
            style={{
              maskImage: "radial-gradient(circle 140px at var(--mx, -999px) var(--my, -999px), #000 0%, transparent 100%)",
              WebkitMaskImage: "radial-gradient(circle 140px at var(--mx, -999px) var(--my, -999px), #000 0%, transparent 100%)",
            }}
          />
          <div
            data-wave
            className="absolute inset-0 bg-[radial-gradient(circle,#4a4a4a_1.2px,transparent_1.8px)] [background-size:24px_24px] motion-reduce:hidden"
            style={{
              maskImage: "linear-gradient(90deg, transparent calc(var(--wx, -30%) - 14%), #000 var(--wx, -30%), transparent calc(var(--wx, -30%) + 14%))",
              WebkitMaskImage: "linear-gradient(90deg, transparent calc(var(--wx, -30%) - 14%), #000 var(--wx, -30%), transparent calc(var(--wx, -30%) + 14%))",
            }}
          />
          <div
            data-scan
            className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(to_right,transparent,rgba(236,234,229,0.3),transparent)] opacity-0"
          />
        </div>

      <div data-col-grid className="relative grid gap-10 md:grid-cols-3 md:gap-8">
        {columns.map((col, c) => (
          <div key={col.title} data-col>
            <h3
              data-col-title
              className="whitespace-nowrap font-mono text-[11px] uppercase tracking-[0.28em] text-[#8A8A8A] lg:tracking-[0.08em] xl:tracking-[0.28em]"
            >
              {String(c + 1).padStart(2, "0")} / {col.title}
              <span aria-hidden="true" className="css-loop animate-[caretBlink_1s_steps(1)_infinite] motion-reduce:animate-none">
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
                  className="group/item relative pl-5 text-[15px] leading-[2] text-[#9A9A9A] transition-colors duration-[250ms] hover:text-[#ECEAE5] data-[active]:text-[#ECEAE5]"
                >
                  {/* barrinha acesa à esquerda (hover) */}
                  <span
                    aria-hidden="true"
                    className="absolute left-0 top-[0.5lh] h-[1em] w-[2px] -translate-y-1/2 bg-[#ECEAE5] opacity-0 transition-opacity duration-[250ms] group-hover/item:opacity-100 group-data-[active]/item:opacity-100"
                  />
                  <span className="sr-only">{item}</span>
                  {/* colchetes de largura zero (não deslocam nem mudam a quebra): "[" no
                      recuo à esquerda, "]" logo depois do texto */}
                  <span aria-hidden="true" className="relative inline-block h-[1lh] w-0 align-top">
                    <span className="absolute inset-y-0 right-[5px] flex items-center font-mono text-[11px] text-[#8A8A8A] opacity-0 transition-opacity duration-[250ms] group-hover/item:opacity-100 group-data-[active]/item:opacity-100">
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
                    <span className="absolute inset-y-0 left-[5px] flex items-center font-mono text-[11px] text-[#8A8A8A] opacity-0 transition-opacity duration-[250ms] group-hover/item:opacity-100 group-data-[active]/item:opacity-100">
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
    </div>
  );
}

"use client";

import { Fragment, useEffect, useRef, type CSSProperties } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { revealOnce } from "@/lib/reveal";
import { isTouchScrolling } from "@/lib/mobile";

gsap.registerPlugin(useGSAP, ScrollTrigger);

export type ServiceColumn = { title: string; items: string[] };

/** Caracteres do scramble. */
const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#/_*";
/** Duração do scramble na entrada (s); intervalo entre trocas de caractere (s). */
const ENTER = 0.5;
const SWAP = 0.04;
/** Destaque automático: troca de item a cada SCAN_EVERY s. */
const SCAN_EVERY = 2;
/** Escalonamento entre itens na entrada (s) e início dos itens na timeline (s). */
const STAGGER = 0.05;
const ITEMS_AT = 0.35;

/**
 * Palavra gigante atrás do painel (nome da categoria em foco). Estilo inline
 * (não depende do CSS global): só contorno, enorme, invisível até o foco; o JS
 * troca opacidade e posição (uma por vez).
 */
const WORD_STYLE: CSSProperties = {
  position: "absolute",
  left: "50%",
  top: "50%",
  transform: "translate(-50%, calc(-50% + 28px))",
  whiteSpace: "nowrap",
  fontSize: "clamp(160px, 17vw, 320px)",
  fontWeight: 500,
  lineHeight: 1,
  letterSpacing: "-0.04em",
  textTransform: "uppercase",
  color: "transparent",
  WebkitTextStroke: "1px rgb(255 255 255 / 0.08)",
  opacity: 0,
  transition: "opacity 0.6s ease, transform 0.8s cubic-bezier(0.16, 1, 0.3, 1)",
};

/**
 * Painel das listas: preto sólido como o original, borda de 1px sutil, cantos
 * discretos e uma linha fina de brilho no topo. Inline (não depende do CSS
 * global): opaco, ele sempre cobre a palavra gigante que fica atrás dele.
 */
const PANEL_STYLE: CSSProperties = {
  borderRadius: 4,
  border: "1px solid rgb(255 255 255 / 0.08)",
  background: "#0b0b0c",
  boxShadow: "inset 0 1px 0 rgb(255 255 255 / 0.12)",
};

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
 * - hover (só mouse): texto branco e barrinha acesa (espaço reservado).
 * Sem mudança de largura: cada letra real fica no lugar (invisível durante o
 * scramble) e o caractere aleatório é uma camada absoluta por cima. O texto real de cada item está num span
 * sr-only; as letras e os caracteres aleatórios são aria-hidden.
 * Destaque (só luz prateada, sem cor nova):
 * - moldura de 1px com uma faixa de luz percorrendo a borda (CSS .chrome-frame);
 * - grade de pontos que acende em volta do cursor (desktop) e uma onda de luz
 *   que atravessa a grade a cada ~6 s;
 * - destaque automático: 1 item aceso por vez no painel inteiro (texto branco
 *   e barrinha, transição de 0,4 s); a cada 2 s passa para outro item
 *   aleatório, sem repetir o anterior. No desktop pausa com o mouse sobre o
 *   painel (só o item sob o mouse acende); no toque roda sempre, e tocar num
 *   item o acende.
 * Tudo pausa com a seção fora da tela.
 * prefers-reduced-motion / sem JS: tudo visível, sem scramble, varredura, blink,
 * scanner nem onda; moldura estática.
 * Painel preto sólido (PANEL_STYLE) com linha fina de brilho no topo.
 * Foco por coluna (data-focus na raiz e na coluna): com o mouse sobre uma
 * coluna (no celular, a coluna no meio da tela), ela fica com texto claro e as
 * outras caem para 0,4; atrás do painel, o nome da categoria aparece enorme, só
 * contorno (WORD_STYLE; a partir do tablet). Vale também com reduced motion
 * (sem deslocamento).
 */
export default function ServiceColumns({ columns, className = "" }: { columns: ServiceColumn[]; className?: string }) {
  const root = useRef<HTMLDivElement>(null);

  // foco por coluna: hover (mouse) ou coluna no meio da tela (celular, empilhadas)
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const cols = [...el.querySelectorAll<HTMLElement>("[data-col]")];
    const words = [...el.querySelectorAll<HTMLElement>("[data-word]")];
    const grid = el.querySelector<HTMLElement>("[data-col-grid]");
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // palavra gigante só a partir do tablet (no celular não cabe)
    const wordsOn = window.matchMedia("(min-width: 768px)").matches;
    if (still) words.forEach((w) => (w.style.transition = "opacity 0.3s ease"));
    const focus = (c: number) => {
      if (c < 0) delete el.dataset.focus;
      else el.dataset.focus = String(c);
      cols.forEach((col, i) => col.toggleAttribute("data-focus", i === c));
      // só a palavra da coluna ativa: fade e leve subida (sem subida com reduced motion)
      words.forEach((w, i) => {
        const on = wordsOn && i === c;
        w.style.opacity = on ? "1" : "0";
        w.style.transform = on || still ? "translate(-50%, -50%)" : "translate(-50%, calc(-50% + 28px))";
      });
    };
    if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
      const enters = cols.map((_, i) => () => focus(i));
      const leave = () => focus(-1);
      cols.forEach((col, i) => col.addEventListener("mouseenter", enters[i]));
      grid?.addEventListener("mouseleave", leave);
      return () => {
        cols.forEach((col, i) => col.removeEventListener("mouseenter", enters[i]));
        grid?.removeEventListener("mouseleave", leave);
      };
    }
    if (!window.matchMedia("(max-width: 767.98px)").matches) return;
    const inView = new Set<number>();
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          const i = cols.indexOf(e.target as HTMLElement);
          if (e.isIntersecting) inView.add(i);
          else inView.delete(i);
        });
        focus(inView.size ? Math.max(...inView) : -1);
      },
      { rootMargin: "-45% 0px -45% 0px" },
    );
    cols.forEach((col) => io.observe(col));
    return () => io.disconnect();
  }, [columns]);

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

        const off: (() => void)[] = [];

        // --- destaque: grade que reage, onda, scanner (pausam fora da tela) ---
        const frame = el.querySelector<HTMLElement>("[data-frame]")!;
        const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

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

        // destaque automático: 1 item aceso por vez no painel inteiro; a cada
        // SCAN_EVERY s passa para outro item aleatório (qualquer coluna, sem
        // repetir o anterior). O aceso é só texto branco + barrinha (CSS,
        // data-active, transição de 0,4 s). Mouse sobre o painel: pausa e só o
        // item sob o mouse acende (:hover); ao sair, volta.
        let current: HTMLElement | null = null;
        const setActive = (item: HTMLElement | null) => {
          if (current && current !== item) delete current.dataset.active;
          current = item;
          if (item) item.dataset.active = "";
        };
        let overPanel = false;
        let loop: gsap.core.Tween | null = null;
        const cycle = () => {
          if (!(finePointer && overPanel) && items.length > 1) {
            const pool = items.filter((item) => item !== current);
            setActive(pool[Math.floor(Math.random() * pool.length)]);
          }
          loop = gsap.delayedCall(SCAN_EVERY, cycle);
        };
        if (finePointer) {
          const enterPanel = () => {
            overPanel = true;
            setActive(null);
          };
          const leavePanel = () => {
            overPanel = false;
            // volta logo (se a seção estiver na tela e a entrada já tiver terminado)
            if (loop) {
              loop.kill();
              loop = gsap.delayedCall(0.4, cycle);
            }
          };
          frame.addEventListener("mouseenter", enterPanel);
          frame.addEventListener("mouseleave", leavePanel);
          off.push(() => {
            frame.removeEventListener("mouseenter", enterPanel);
            frame.removeEventListener("mouseleave", leavePanel);
          });
        }
        // toque: tocar num item o acende
        const onTap = (e: PointerEvent) => {
          if (e.pointerType === "mouse" || tl.progress() < 1) return;
          const item = (e.target as Element).closest<HTMLElement>("[data-col-item]");
          if (item) setActive(item);
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
          gsap.killTweensOf(spot);
          setActive(null);
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
    <div ref={root} className={`oo-root relative ${className}`}>
      {/* nome da categoria em foco, enorme e só contorno, atrás do painel */}
      <div aria-hidden="true" className="max-md:hidden" style={{ position: "absolute", inset: 0, zIndex: -10, pointerEvents: "none" }}>
        {columns.map((col, c) => (
          <span key={col.title} data-word={c} style={WORD_STYLE}>
            {col.title}
          </span>
        ))}
      </div>
      {/* painel preto + moldura cromada viva (faixa de luz na borda: .chrome-frame) */}
      <div data-frame style={PANEL_STYLE} className="chrome-frame relative p-6 md:p-9 lg:p-7 xl:p-8 min-[85.375rem]:p-10">
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

      <div data-col-grid className="relative grid gap-10 md:grid-cols-3 md:gap-8 lg:gap-6 xl:grid-cols-[auto_auto_auto] xl:justify-between min-[85.375rem]:gap-8">
        {columns.map((col, c) => (
          <div key={col.title} data-col>
            <h3
              data-col-title
              className="whitespace-nowrap font-mono text-[12px] uppercase tracking-[0.28em] text-[#B4B4B4] lg:tracking-[0.08em] xl:tracking-[0.28em]"
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
                  className="group/item relative pl-5 text-[18px] leading-[2] text-[#B0B0B0] lg:text-[16px] xl:text-[17px] min-[85.375rem]:text-[18px] transition-colors duration-[400ms] hover:text-white data-[active]:text-white"
                >
                  {/* barrinha à esquerda (hover / item aceso), com fade; o espaço dela
                      (pl-5) fica sempre reservado, então o texto não se desloca */}
                  <span
                    aria-hidden="true"
                    className="absolute left-0 top-[0.5lh] h-[1em] w-[2px] -translate-y-1/2 bg-white opacity-0 transition-opacity duration-[400ms] group-hover/item:opacity-100 group-data-[active]/item:opacity-100"
                  />
                  <span className="sr-only">{item}</span>
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

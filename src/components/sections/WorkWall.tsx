"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import gsap from "gsap";
import MediaSlot from "@/components/MediaSlot";
import { lockScroll } from "@/components/SmoothScroll";

export type WallItem = {
  src?: string;
  /** Legenda pronta: "Projeto · 2024". */
  caption: string;
  alt: string;
  /** Rótulo do botão do card: "Ampliar Projeto". */
  open: string;
};

export type WorkWallLabels = {
  title: string;
  label: string;
  prev: string;
  next: string;
  close: string;
  lightbox: string;
  /** Já formatado por item: "1 de 6", "2 de 6"... */
  counters: string[];
  placeholder: string;
};

/** Fileiras do mural (o plano girado precisa cobrir a seção inteira). */
const ROWS = 5;
/** Mínimo de cards por cópia de fileira: cada cópia tem de ser mais larga que o plano. */
const PER_COPY_MIN = 12;
/** Proporções (largura/altura) que se alternam, para os cards variarem um pouco. */
const ASPECTS = [1.5, 0.8, 1.25, 1, 1.6, 0.75, 1.33];
/** Velocidade base do loop, em px/s. */
const SPEED = 22;
/** Ângulo do mural (graus) e a direção das fileiras na tela, para o arraste. */
const ANGLE = -12;
const DIR_X = Math.cos((ANGLE * Math.PI) / 180);
const DIR_Y = Math.sin((ANGLE * Math.PI) / 180);

type Card = { item: number; aspect: number; focusable: boolean };

/** Distribui os itens pelas fileiras (repetindo se houver poucos). */
function buildRows(n: number): Card[][] {
  const perCopy = Math.max(Math.ceil(n / ROWS), PER_COPY_MIN);
  const seen = new Set<number>();
  return Array.from({ length: ROWS }, (_, r) =>
    Array.from({ length: perCopy }, (_, k) => {
      const item = (r * perCopy + k) % n;
      const focusable = !seen.has(item);
      seen.add(item);
      return { item, aspect: ASPECTS[(r * 2 + k) % ASPECTS.length], focusable };
    }),
  );
}

/**
 * Trabalhos em "mural inclinado": fileiras de cards girados em -12°, ocupando a
 * largura da seção, com fade nas bordas.
 * - Loop infinito com direções alternadas, lento; acelera um pouco com a
 *   velocidade do scroll. Arrastar (mouse ou toque) move as fileiras, com
 *   inércia ao soltar. Só CSS transforms; pausa fora da tela.
 * - Hover: o card cresce e fica em cor total, os outros escurecem; legenda em
 *   Geist Mono (projeto e ano).
 * - Clique / Enter: lightbox em tela cheia (setas, Esc, ← →).
 * - prefers-reduced-motion: mural parado (sem loop nem arraste), clicável.
 * Cada fileira tem duas cópias iguais; a posição dá a volta a cada cópia. Só a
 * primeira ocorrência de cada item é focável e lida por leitores de tela.
 * Imagens: public/trabalhos/ (src/content/works.ts).
 */
export default function WorkWall({ items, labels }: { items: WallItem[]; labels: WorkWallLabels }) {
  const root = useRef<HTMLDivElement>(null);
  const tracks = useRef<(HTMLDivElement | null)[]>([]);
  const suppressClick = useRef(false);
  const opener = useRef<HTMLElement | null>(null);
  const [open, setOpen] = useState<number | null>(null);
  const n = items.length;
  const rows = buildRows(n);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const state = tracks.current.map((track, r) => ({ track, x: 0, w: 0, r }));

    const place = (s: (typeof state)[number]) => {
      if (!s.track || !s.w) return;
      s.x = (((s.x % s.w) - s.w) % s.w) || 0; // sempre em (-w, 0]
      s.track.style.transform = `translate3d(${s.x.toFixed(2)}px,0,0)`;
    };
    const measure = () => {
      state.forEach((s) => {
        const copy = s.track?.firstElementChild as HTMLElement | null;
        const w = copy?.offsetWidth ?? 0;
        // mantém a fase relativa quando a largura muda (resize)
        s.x = s.w ? (s.x / s.w) * w : -w * ((s.r * 0.37) % 1);
        s.w = w;
        place(s);
      });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    if (reduced) return () => ro.disconnect();

    // --- arraste com inércia ---
    let pointerId = -1;
    let dragging = false;
    let startX = 0;
    let startY = 0;
    let lastX = 0;
    let lastY = 0;
    let pending = 0; // deslocamento do arraste ainda não aplicado
    let velocity = 0; // px/s ao longo das fileiras (inércia)
    let samples: { t: number; d: number }[] = [];

    const down = (e: PointerEvent) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      pointerId = e.pointerId;
      startX = lastX = e.clientX;
      startY = lastY = e.clientY;
      dragging = false;
      suppressClick.current = false;
      velocity = 0;
      samples = [];
    };
    const move = (e: PointerEvent) => {
      if (e.pointerId !== pointerId) return;
      if (!dragging) {
        if (Math.hypot(e.clientX - startX, e.clientY - startY) < 6) return;
        dragging = true;
        suppressClick.current = true;
        el.dataset.dragging = "";
        el.setPointerCapture(e.pointerId);
      }
      const d = (e.clientX - lastX) * DIR_X + (e.clientY - lastY) * DIR_Y;
      lastX = e.clientX;
      lastY = e.clientY;
      pending += d;
      const t = performance.now();
      samples.push({ t, d });
      samples = samples.filter((s) => t - s.t < 100);
    };
    const up = (e: PointerEvent) => {
      if (e.pointerId !== pointerId) return;
      pointerId = -1;
      if (!dragging) return;
      dragging = false;
      delete el.dataset.dragging;
      const t = performance.now();
      const recent = samples.filter((s) => t - s.t < 100);
      const span = recent.length > 1 ? (t - recent[0].t) / 1000 : 0;
      velocity = span > 0.005 ? recent.reduce((a, s) => a + s.d, 0) / span : 0;
      velocity = Math.max(-4000, Math.min(4000, velocity));
    };
    // clique depois de arrastar não abre o lightbox
    const click = (e: MouseEvent) => {
      if (!suppressClick.current) return;
      suppressClick.current = false;
      e.preventDefault();
      e.stopPropagation();
    };
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    el.addEventListener("click", click, true);

    // --- loop ---
    let lastScroll = window.scrollY;
    let boost = 0;
    const tick = (_time: number, deltaTime: number) => {
      const dt = Math.min(deltaTime / 1000, 0.05);
      if (dt <= 0) return;
      // aceleração leve pela velocidade do scroll (suavizada)
      const sy = window.scrollY;
      const target = Math.min(Math.abs(sy - lastScroll) / dt / 1500, 2.5);
      lastScroll = sy;
      boost += (target - boost) * (1 - Math.exp(-dt * 4));
      // parado enquanto um card tem foco (teclado), para não fugir da tela
      const auto = el.matches(":focus-within") ? 0 : SPEED * (1 + boost) * dt;
      if (!dragging) velocity *= Math.exp(-dt * 3.2);
      const shift = pending + (dragging ? 0 : velocity * dt);
      pending = 0;
      state.forEach((s) => {
        s.x += (s.r % 2 === 0 ? -1 : 1) * auto * (1 + s.r * 0.1) + shift;
        place(s);
      });
    };
    // toque (sem hover): a cada ~2,4 s um card visível perto do meio da tela
    // acende como no hover (cresce, cor total, legenda)
    const touch = !window.matchMedia("(hover: hover)").matches;
    let lit: HTMLElement | null = null;
    let spot: gsap.core.Tween | null = null;
    const highlight = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const candidates = [...el.querySelectorAll<HTMLElement>("button[data-cursor]")].filter((b) => {
        const r = b.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        return cx > vw * 0.2 && cx < vw * 0.8 && cy > vh * 0.25 && cy < vh * 0.75 && b !== lit;
      });
      if (lit) delete lit.dataset.active;
      lit = candidates.length ? candidates[Math.floor(Math.random() * candidates.length)] : null;
      if (lit) lit.dataset.active = "";
      spot = gsap.delayedCall(2.4, highlight);
    };
    let running = false;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !running) {
          lastScroll = window.scrollY;
          gsap.ticker.add(tick);
          running = true;
          if (touch) spot = gsap.delayedCall(0.8, highlight);
        } else if (!entry.isIntersecting && running) {
          gsap.ticker.remove(tick);
          running = false;
          spot?.kill();
          if (lit) delete lit.dataset.active;
          lit = null;
        }
      },
      { rootMargin: "100px 0px" },
    );
    io.observe(el);

    return () => {
      ro.disconnect();
      io.disconnect();
      gsap.ticker.remove(tick);
      spot?.kill();
      if (lit) delete lit.dataset.active;
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
      el.removeEventListener("click", click, true);
      delete el.dataset.dragging;
    };
  }, [n]);

  const show = useCallback(
    (i: number, from: HTMLElement) => {
      opener.current = from;
      setOpen(((i % n) + n) % n);
    },
    [n],
  );

  return (
    <div>
      <h3 className="px-6 font-mono text-[11px] uppercase tracking-[0.28em] text-silver md:px-12">{labels.title}</h3>

      <div
        ref={root}
        role="region"
        aria-label={labels.label}
        className="group/wall relative mt-8 h-[clamp(380px,62svh,560px)] cursor-grab touch-pan-y select-none overflow-hidden [--card-h:clamp(110px,14vw,240px)] [--gap:14px] [-webkit-mask-composite:source-in] [mask-composite:intersect] [mask-image:linear-gradient(to_right,transparent,#000_12%,#000_88%,transparent),linear-gradient(to_bottom,transparent,#000_14%,#000_86%,transparent)] data-[dragging]:cursor-grabbing md:h-[clamp(440px,72svh,820px)] md:[--gap:18px]"
      >
        <div className="absolute left-1/2 top-1/2 flex w-[130%] -translate-x-1/2 -translate-y-1/2 -rotate-12 flex-col gap-[var(--gap)]">
          {rows.map((row, r) => (
            <div
              key={r}
              ref={(node) => {
                tracks.current[r] = node;
              }}
              className="flex w-max will-change-transform"
            >
              {[0, 1].map((copy) => (
                <div key={copy} className="flex gap-[var(--gap)] pr-[var(--gap)]">
                  {row.map((card, k) => {
                    const it = items[card.item];
                    const primary = copy === 0 && card.focusable;
                    return (
                      <button
                        key={k}
                        type="button"
                        tabIndex={primary ? 0 : -1}
                        aria-hidden={primary ? undefined : true}
                        aria-label={it.open}
                        data-cursor="ver"
                        onClick={(e) => show(card.item, e.currentTarget)}
                        style={{ width: `calc(var(--card-h) * ${card.aspect})` } as CSSProperties}
                        className="group/card relative h-[var(--card-h)] shrink-0 cursor-[inherit] rounded-[12px] outline-none transition-[transform,filter] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] [filter:saturate(0.55)_brightness(0.9)] focus-visible:z-10 focus-visible:scale-[1.06] focus-visible:![filter:none] focus-visible:ring-1 focus-visible:ring-foreground group-hover/wall:[filter:saturate(0.5)_brightness(0.55)] hover:z-10 hover:scale-[1.06] hover:![filter:none] data-[active]:z-10 data-[active]:scale-[1.06] data-[active]:![filter:none]"
                      >
                        <MediaSlot
                          src={it.src}
                          alt={primary ? it.alt : ""}
                          label={labels.placeholder}
                          ratio="h-full w-full"
                          className="pointer-events-none rounded-[12px]"
                          sizes="(min-width: 768px) 380px, 180px"
                        />
                        <span
                          aria-hidden="true"
                          className="pointer-events-none absolute inset-x-0 bottom-0 rounded-b-[12px] bg-gradient-to-t from-background/85 to-transparent px-3 pb-2.5 pt-8 text-left font-mono text-[10px] uppercase tracking-[0.2em] text-foreground opacity-0 transition-opacity duration-300 group-hover/card:opacity-100 group-focus-visible/card:opacity-100 group-data-[active]/card:opacity-100"
                        >
                          {it.caption}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {open !== null && (
        <Lightbox
          items={items}
          index={open}
          labels={labels}
          onIndex={(i) => setOpen(((i % n) + n) % n)}
          onClose={() => {
            setOpen(null);
            opener.current?.focus({ preventScroll: true });
          }}
        />
      )}
    </div>
  );
}

/** Lightbox em tela cheia (portal no <body>): imagem em alta, legenda, setas, Esc e ← →. */
function Lightbox({
  items,
  index,
  labels,
  onIndex,
  onClose,
}: {
  items: WallItem[];
  index: number;
  labels: WorkWallLabels;
  onIndex: (i: number) => void;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDivElement>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);
  const it = items[index];
  const many = items.length > 1;

  useEffect(() => {
    lockScroll(true);
    closeBtn.current?.focus({ preventScroll: true });
    return () => lockScroll(false);
  }, []);

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight" && many) onIndex(index + 1);
      else if (e.key === "ArrowLeft" && many) onIndex(index - 1);
      else if (e.key === "Tab" && dialog.current) {
        // foco preso dentro do lightbox
        const f = dialog.current.querySelectorAll<HTMLElement>("button:not([disabled])");
        const first = f[0];
        const last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [index, many, onIndex, onClose]);

  return createPortal(
    <div
      ref={dialog}
      role="dialog"
      aria-modal="true"
      aria-label={labels.lightbox}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-[200] flex flex-col bg-background/95 backdrop-blur-sm"
    >
      <button
        ref={closeBtn}
        type="button"
        onClick={onClose}
        aria-label={labels.close}
        className="absolute right-4 top-4 z-10 grid h-12 w-12 place-items-center rounded-full border border-line text-lg transition-colors hover:border-foreground md:right-8 md:top-8"
      >
        <span aria-hidden="true">✕</span>
      </button>

      <div
        key={index}
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
        className="relative mx-4 mt-20 flex-1 animate-[fadeIn_0.4s_ease] md:mx-24 md:mt-24"
      >
        {it.src ? (
          <Image src={it.src} alt={it.alt} fill quality={90} sizes="100vw" className="object-contain" />
        ) : (
          <div className="absolute inset-0 m-auto aspect-[16/10] max-h-full max-w-full">
            <MediaSlot label={labels.placeholder} ratio="h-full w-full" className="rounded-[12px]" />
          </div>
        )}
      </div>

      <div className="flex items-end justify-between gap-6 px-4 pb-6 pt-6 md:px-24 md:pb-10">
        <p aria-live="polite">
          <span className="block font-mono text-[11px] uppercase tracking-[0.22em]">{it.caption}</span>
          <span className="mt-1 block font-mono text-[10px] uppercase tracking-[0.22em] text-silver">
            {labels.counters[index]}
          </span>
        </p>
        {many && (
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => onIndex(index - 1)}
              aria-label={labels.prev}
              className="grid h-12 w-12 place-items-center rounded-full border border-line transition-colors hover:border-foreground"
            >
              <span aria-hidden="true">←</span>
            </button>
            <button
              type="button"
              onClick={() => onIndex(index + 1)}
              aria-label={labels.next}
              className="grid h-12 w-12 place-items-center rounded-full border border-line transition-colors hover:border-foreground"
            >
              <span aria-hidden="true">→</span>
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

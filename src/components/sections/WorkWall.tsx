"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import MediaSlot from "@/components/MediaSlot";
import ExperienceBadge, { type ExperienceLabels } from "./ExperienceBadge";
import { isTouchScrolling } from "@/lib/mobile";

export type WallItem = {
  src?: string;
  alt: string;
  /** Proporção (largura/altura) da arte; sem ela (placeholders), ASPECTS. */
  aspect?: number;
  /** Marca da arte: a mesma marca não fica seguida numa fileira. */
  brand?: string;
};

export type WorkWallLabels = {
  title: string;
  label: string;
  placeholder: string;
  experience: ExperienceLabels;
};

/** Fileiras do mural (o plano girado precisa cobrir a seção inteira). */
const ROWS = 5;
/**
 * Soma mínima das proporções de uma cópia de fileira (em alturas de card): cada
 * cópia tem de ser mais larga que o plano (130% da tela) até ~2.900px de
 * largura; fileiras curtas se repetem dentro da cópia.
 */
const COPY_MIN_ASPECT = 16;
/** Proporções dos placeholders (sem arte), alternadas. */
const ASPECTS = [1.5, 0.8, 1.25, 1, 1.6, 0.75, 1.33];
/**
 * Velocidade de cada fileira (px/s com o card de uma tela de 1440px), em ciclo;
 * a direção alterna (esquerda, direita...). Escala com a altura do card (que
 * acompanha a largura da tela), então o ritmo é o mesmo no celular.
 */
const SPEEDS = [45, 54, 38];
/** Altura do card numa tela de 1440px (14vw): referência das SPEEDS. */
const REF_CARD_H = 201.6;
/** Impulso do scroll: px/s de scroll que dobram a velocidade, e o teto do impulso. */
const SCROLL_REF = 1000;
const BOOST_MAX = 3;
/** Constantes de tempo (s): subida do impulso e volta ao ritmo normal (~0,8 s). */
const BOOST_UP = 0.12;
const BOOST_DOWN = 0.27;

type Card = { item: number; aspect: number; primary: boolean };

/**
 * Distribui os itens pelas fileiras na ordem da lista, alternando (1º na
 * fileira 1, 2º na 2...), e evita a mesma marca seguida numa fileira (inclusive
 * na volta do loop). Cada fileira se repete até a cópia cobrir o plano.
 */
function buildRows(items: WallItem[]): Card[][] {
  const rows: number[][] = Array.from({ length: ROWS }, () => []);
  items.forEach((_, i) => rows[i % ROWS].push(i));
  const brand = (i: number) => items[i].brand;
  rows.forEach((row) => {
    if (row.length < 3) return;
    for (let k = 0; k < row.length; k++) {
      const next = (k + 1) % row.length;
      if (!brand(row[k]) || brand(row[k]) !== brand(row[next])) continue;
      const j = row.findIndex((it, m) => m !== k && m !== next && brand(it) !== brand(row[k]));
      if (j >= 0) [row[next], row[j]] = [row[j], row[next]];
    }
  });
  return rows.map((row) => {
    if (row.length === 0) return [];
    const base = row.map((item) => ({ item, aspect: items[item].aspect ?? ASPECTS[item % ASPECTS.length] }));
    const sum = base.reduce((acc, c) => acc + c.aspect, 0);
    const reps = Math.max(1, Math.ceil(COPY_MIN_ASPECT / sum));
    // cada item está numa fileira só: a 1ª repetição é a que leitores de tela leem
    return Array.from({ length: reps }, (_, rep) => base.map((c) => ({ ...c, primary: rep === 0 }))).flat();
  });
}

/** `sizes` do card: largura = altura do card (clamp(110px, 14vw, 240px)) × proporção. */
const cardSizes = (a: number) =>
  `(min-width: 1715px) ${Math.round(240 * a)}px, (min-width: 786px) ${Math.round(14 * a)}vw, ${Math.round(110 * a)}px`;

/**
 * Trabalhos em "mural inclinado": fileiras de cards girados em -12°, ocupando a
 * largura da seção, com fade nas bordas. Só exibição (sem clique, lightbox nem
 * arraste).
 * - Cada fileira anda sozinha em loop infinito, com direções alternadas e
 *   velocidades levemente diferentes (SPEEDS, proporcionais ao tamanho do card).
 * - O scroll da página dá um impulso proporcional à velocidade dele, que volta
 *   ao ritmo normal com ease (~0,8 s).
 * - O mouse não muda a velocidade (sem desaceleração no hover).
 * - Só transform (translate3d), um único requestAnimationFrame para todas as
 *   fileiras, pausado fora da tela e com a aba oculta.
 * - prefers-reduced-motion: mural parado.
 * Cada fileira tem duas cópias iguais; a posição dá a volta a cada cópia. Só a
 * primeira ocorrência de cada item é lida por leitores de tela.
 * Altura: proporcional à tela. No celular, limitada à faixa que as fileiras
 * inclinadas cobrem (5 cards de 110px + vãos, menos o desnível de 12° na
 * largura), para não sobrar canto vazio.
 * Artes: public/trabalhos/ + trabalhos.json (src/content/works.ts), na
 * proporção de cada uma, sem legenda nem clique, carregadas sob demanda;
 * sem imagens, peças placeholder ("Imagem pendente").
 */
export default function WorkWall({ items, labels }: { items: WallItem[]; labels: WorkWallLabels }) {
  const root = useRef<HTMLDivElement>(null);
  const tracks = useRef<(HTMLDivElement | null)[]>([]);
  const n = items.length;
  const rows = buildRows(items);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const state = tracks.current.map((track, r) => ({
      track,
      x: 0,
      w: 0,
      r,
      v: (r % 2 === 0 ? -1 : 1) * SPEEDS[r % SPEEDS.length],
    }));

    const place = (s: (typeof state)[number]) => {
      if (!s.track || !s.w) return;
      s.x = (((s.x % s.w) - s.w) % s.w) || 0; // sempre em (-w, 0]
      s.track.style.transform = `translate3d(${s.x.toFixed(2)}px,0,0)`;
    };
    // escala das SPEEDS: altura atual do card / altura numa tela de 1440px
    let scale = 1;
    const measure = () => {
      const card = el.querySelector<HTMLElement>("[data-wall-card]");
      if (card?.offsetHeight) scale = card.offsetHeight / REF_CARD_H;
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

    // --- loop (um único rAF para todas as fileiras) ---
    let raf = 0;
    let last = 0;
    let lastScroll = 0;
    let boost = 0;
    let frozen = false;
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      if (dt <= 0) return;
      // celular: congela enquanto a página rola (só o compositor trabalha);
      // ao voltar, o impulso recomeça da posição atual
      if (isTouchScrolling()) {
        frozen = true;
        return;
      }
      if (frozen) {
        frozen = false;
        lastScroll = window.scrollY;
      }
      // impulso proporcional à velocidade do scroll; sobe rápido e volta com ease
      const sy = window.scrollY;
      const target = Math.min(Math.abs(sy - lastScroll) / dt / SCROLL_REF, BOOST_MAX);
      lastScroll = sy;
      boost += (target - boost) * (1 - Math.exp(-dt / (target > boost ? BOOST_UP : BOOST_DOWN)));
      const k = (1 + boost) * scale * dt;
      state.forEach((s) => {
        s.x += s.v * k;
        place(s);
      });
    };
    let visible = false;
    const sync = () => {
      const run = visible && !document.hidden;
      if (run && !raf) {
        last = performance.now();
        lastScroll = window.scrollY;
        raf = requestAnimationFrame(frame);
      } else if (!run && raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    };
    const io = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        sync();
      },
      { rootMargin: "100px 0px" },
    );
    io.observe(el);
    document.addEventListener("visibilitychange", sync);

    return () => {
      ro.disconnect();
      io.disconnect();
      cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", sync);
    };
  }, [n]);

  return (
    <div>
      <h3 className="px-6 font-mono text-[11px] uppercase tracking-[0.28em] text-silver md:px-12">{labels.title}</h3>

      <div
        ref={root}
        role="region"
        aria-label={labels.label}
        className="relative mt-8 h-[min(62svh,calc(610px-21.3vw))] select-none overflow-hidden [--card-h:clamp(110px,14vw,240px)] [--gap:14px] [-webkit-mask-composite:source-in] [mask-composite:intersect] [mask-image:linear-gradient(to_right,transparent,#000_12%,#000_88%,transparent),linear-gradient(to_bottom,transparent,#000_14%,#000_86%,transparent)] md:h-[clamp(440px,72svh,820px)] md:[--gap:18px]"
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
                    const primary = copy === 0 && card.primary;
                    return (
                      <div
                        key={k}
                        data-wall-card
                        aria-hidden={primary ? undefined : true}
                        style={{ width: `calc(var(--card-h) * ${card.aspect.toFixed(4)})` }}
                        className="relative h-[var(--card-h)] shrink-0 overflow-hidden rounded-[12px]"
                      >
                        {it.src ? (
                          // arte inteira, nas cores originais: quadro na proporção dela,
                          // contain (nada cortado), sem filtro, borda ou véu por cima
                          <Image
                            src={it.src}
                            alt={primary ? it.alt : ""}
                            fill
                            sizes={cardSizes(card.aspect)}
                            draggable={false}
                            className="object-contain"
                          />
                        ) : (
                          <MediaSlot
                            label={labels.placeholder}
                            ratio="h-full w-full"
                            className="rounded-[12px]"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* destaque "+12" no centro, por cima das fileiras (não bloqueia o mouse) */}
        <ExperienceBadge labels={labels.experience} />
      </div>
    </div>
  );
}

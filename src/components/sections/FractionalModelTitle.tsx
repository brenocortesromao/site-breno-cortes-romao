"use client";

import { Fragment, useEffect, useRef, useState, type RefObject } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import BlurRevealTitle from "@/components/BlurRevealTitle";
import { revealOnce } from "@/lib/reveal";
import { protectTerms } from "@/components/Term";
import { playTitleParticles } from "@/components/graphics/fractional/titleParticles";

gsap.registerPlugin(useGSAP);

/**
 * Modo da entrada, escolhido quando a seção chega perto (FractionalModel):
 * - "pending": antes disso (HTML do servidor: título pronto, visível);
 * - "particles": desktop, nível médio/alto: partículas formam o título;
 * - "light": celular ou nível baixo: BlurRevealTitle palavra por palavra;
 * - "static": prefers-reduced-motion: tudo pronto, sem animação.
 */
export type TitleMode = "pending" | "particles" | "light" | "static";

/** Pausa entre a 1ª parte pronta e o brilho na parte em cinza (s) e duração do brilho (s). */
const PAUSE_S = 0.25;
const SWEEP_S = 1.4;

/**
 * Cabeçalho da parte escura do Fractional: rótulo, título (texto real no HTML,
 * um span por palavra) e texto de apoio. No modo "particles", quando o título
 * chega ao meio da tela (uma vez por visita):
 * 1. partículas se juntam nas letras de "O mercado mudou.", palavra por
 *    palavra (graphics/fractional/titleParticles.ts); cada palavra pronta
 *    aparece de blur(8px) para nítida e as partículas dela somem;
 * 2. 250 ms depois, a parte em cinza entra com uma faixa de luz da esquerda
 *    para a direita (máscara + brilho em background-clip; a cor final não muda);
 * 3. parte da poeira que sobrou escorre para a esfera e some; ao terminar,
 *    `gate` libera a formação da esfera (modelScene.ts) e o canvas sai;
 * 4. o texto de apoio entra com fade e leve subida.
 * Se o título já passou da tela quando a seção chega, tudo aparece pronto.
 */
export default function FractionalModelTitle({
  eyebrow,
  title,
  titleMuted,
  text,
  mode,
  gate,
  row,
}: {
  eyebrow: string;
  title: string;
  titleMuted: string;
  text: string;
  mode: TitleMode;
  /** Libera a formação da esfera. */
  gate: RefObject<{ open: boolean }>;
  /** Linha da esfera (centro do escorrer). */
  row: RefObject<HTMLDivElement | null>;
}) {
  const head = useRef<HTMLDivElement>(null);
  const h2 = useRef<HTMLHeadingElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [canvasOn, setCanvasOn] = useState(false);

  // modo partículas: estado escondido, disparo único e sequência
  useEffect(() => {
    if (mode !== "particles" || !h2.current) return;
    const g = gate.current;
    const words = [...h2.current.querySelectorAll<HTMLElement>("[data-w]")];
    const muted = h2.current.querySelector<HTMLElement>("[data-muted]")!;
    const support = head.current!.querySelector<HTMLElement>("[data-support]")!;
    gsap.set(words, { opacity: 0, filter: "blur(8px)" });
    gsap.set(muted, { opacity: 0 });
    gsap.set(support, { opacity: 0, y: 12 });

    const showAll = () => {
      gsap.set(words, { opacity: 1, clearProps: "filter" });
      gsap.set(muted, { opacity: 1 });
      gsap.set(support, { opacity: 1, y: 0 });
      g.open = true;
    };

    let handle: ReturnType<typeof playTitleParticles> | null = null;
    let sweep: gsap.core.Timeline | null = null;
    const play = () => {
      setCanvasOn(true);
      // dois quadros: o canvas já foi montado pelo React
      requestAnimationFrame(() => requestAnimationFrame(() => {
        const c = canvas.current;
        if (!c) return showAll();
        handle = playTitleParticles({
          canvas: c,
          words,
          sphere: () => {
            const r = row.current?.getBoundingClientRect();
            return r ? { x: r.left + r.width / 2, y: r.top + r.height * 0.47 } : { x: 0, y: window.innerHeight };
          },
          onWord: (k) => gsap.to(words[k], { opacity: 1, filter: "blur(0px)", duration: 0.5, ease: "power2.out", clearProps: "filter" }),
          onAssembled: () => {
            // parte em cinza: faixa de luz da esquerda para a direita (máscara
            // revelando + brilho por background-clip; no fim, estilos limpos)
            sweep = gsap
              .timeline({ delay: PAUSE_S })
              .set(muted, { opacity: 1, attr: { "data-sweep": "" } })
              .fromTo(
                muted,
                { backgroundPosition: "100% 0", maskPosition: "100% 0", webkitMaskPosition: "100% 0" },
                { backgroundPosition: "0% 0", maskPosition: "0% 0", webkitMaskPosition: "0% 0", duration: SWEEP_S, ease: "power2.inOut" },
              )
              .call(() => {
                muted.removeAttribute("data-sweep");
                gsap.set(muted, { clearProps: "backgroundPosition,maskPosition,webkitMaskPosition" });
                handle?.drip();
              })
              .to(support, { opacity: 1, y: 0, duration: 0.9, ease: "power3.out" }, "<");
          },
          onDone: () => {
            g.open = true;
            setCanvasOn(false);
          },
        });
      }));
    };

    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          io.disconnect();
          play();
        } else if (e.boundingClientRect.bottom < 0) {
          io.disconnect();
          showAll(); // já passou da tela: sem animação
        }
      },
      { rootMargin: "0px 0px -50% 0px" },
    );
    io.observe(h2.current);
    return () => {
      io.disconnect();
      handle?.cancel();
      sweep?.kill();
      g.open = true;
      gsap.set([...words, muted, support], { clearProps: "all" });
    };
  }, [mode, gate, row]);

  // modo leve: o texto de apoio entra depois do título
  useGSAP(
    () => {
      if (mode !== "light") return;
      const support = head.current!.querySelector<HTMLElement>("[data-support]")!;
      gsap.set(support, { opacity: 0, y: 12 });
      return revealOnce({
        trigger: head.current!,
        start: "top 60%",
        play: () => gsap.to(support, { opacity: 1, y: 0, duration: 0.9, ease: "power3.out", delay: 0.9 }),
        finish: () => gsap.set(support, { opacity: 1, y: 0 }),
      });
    },
    { scope: head, dependencies: [mode] },
  );

  const h2Class =
    "max-w-[900px] text-balance text-[clamp(36px,5vw,66px)] font-light leading-[1.03] tracking-[-0.04em] text-foreground";
  const words = title.split(" ");

  return (
    <div ref={head} className="relative flex flex-col items-center gap-[22px] text-center">
      {canvasOn && (
        <canvas
          ref={canvas}
          aria-hidden="true"
          className="pointer-events-none absolute -left-6 -top-[140px] h-[calc(100%+460px)] w-[calc(100%+48px)]"
        />
      )}
      <span className="font-mono text-[11px] uppercase tracking-[0.16em] fm-t2">{protectTerms(eyebrow)}</span>
      {mode === "light" ? (
        <BlurRevealTitle
          id="o-modelo-fractional-title"
          className={h2Class}
          text={title}
          muted={titleMuted}
          mutedClassName="fm-t4"
          unit="word"
          stagger={0.12}
          start="top 70%"
        />
      ) : (
        <h2 ref={h2} id="o-modelo-fractional-title" className={h2Class}>
          {words.map((w, k) => (
            <Fragment key={k}>
              <span data-w className="inline-block whitespace-nowrap">
                {/* sonda: o topo dela é a linha de base (amostra das partículas) */}
                <span aria-hidden="true" className="inline-block h-0 w-0" />
                {w}
              </span>{" "}
            </Fragment>
          ))}
          <span data-muted className="fm-t4 fm-sweep">
            {titleMuted}
          </span>
        </h2>
      )}
      <p data-support className="max-w-[520px] text-balance text-[17px] font-light leading-[1.6] fm-t2">
        {text}
      </p>
    </div>
  );
}

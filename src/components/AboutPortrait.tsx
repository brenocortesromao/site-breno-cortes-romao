"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import TiltCard from "./TiltCard";
import { revealOnce } from "@/lib/reveal";

gsap.registerPlugin(useGSAP, ScrollTrigger);

/**
 * Retrato do Sobre: a moldura com cantos (a mesma do MediaSlot) com a foto
 * real, em <picture> (800 px no celular, 1500 px no desktop; webp com jpg de
 * reserva).
 * Entrada por GATILHO (quadro ~25% na tela), uma vez, ~2,4 s:
 *  1. o quadro começa escuro; uma linha de luz prateada fina, com brilho
 *     suave, varre a foto na diagonal (do canto superior esquerdo ao inferior
 *     direito, 1,1 s, power2.inOut) e a máscara revela a imagem atrás dela;
 *  2. a foto surge em preto e branco e a cor "floresce" (grayscale 1 → 0,
 *     1,2 s), com um leve aumento de contraste no meio;
 *  3. "settle": escala 1.06 → 1.
 * Depois da entrada: o cartão de vidro da Mensagem (TiltCard: inclinação com o
 * mouse e reflexo); no toque, sem inclinação, o reflexo passa com o scroll.
 * A moldura tem a proporção da foto (806 x 1448) e a foto aparece inteira, sem
 * corte (por isso não há parallax interno); no desktop, a altura fica limitada a 85vh.
 * Sem JS / prefers-reduced-motion: foto final, estática.
 */

/** Máscara da varredura: preto = foto visível; x = posição da linha (%) na diagonal. */
const sweepMask = (x: number) => `linear-gradient(to bottom right, #000 ${x - 1.5}%, transparent ${x}%)`;

/** Linha de luz prateada (núcleo fino + brilho largo e fraco), na mesma diagonal da máscara. */
const sweepLine = (x: number) =>
  `linear-gradient(to bottom right, transparent ${x - 7}%, rgba(200,206,214,0.14) ${x - 2}%, rgba(225,229,235,0.55) ${x - 0.45}%, #fff ${x - 0.1}%, #fff ${x + 0.1}%, rgba(225,229,235,0.55) ${x + 0.45}%, rgba(200,206,214,0.14) ${x + 2}%, transparent ${x + 7}%)`;

export default function AboutPortrait({
  alt,
  priority,
}: {
  alt: string;
  /** Página /sobre: o retrato está no alto, carrega na hora. */
  priority?: boolean;
}) {
  const frame = useRef<HTMLDivElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const photo = useRef<HTMLDivElement>(null);
  const zoom = useRef<HTMLDivElement>(null);
  const line = useRef<HTMLDivElement>(null);
  /** static: foto visível (reduced motion); reveal: entrada animada. null até detectar. */
  const [mode, setMode] = useState<"static" | "reveal" | null>(null);
  /** O vidro (inclinação e reflexo) só liga depois da entrada. */
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- leitura única de capacidades do navegador
    setMode(reduced ? "static" : "reveal");
  }, []);

  useGSAP(
    () => {
      if (mode !== "reveal") return;
      const ph = photo.current!;
      const zm = zoom.current!;
      const ln = line.current!;

      // x: linha (%); gray: preto e branco (1..0); pop: contraste extra (0..1); scale
      const s = { x: -8, gray: 1, pop: 0, scale: 1.06, line: 1 };
      const apply = () => {
        const m = sweepMask(s.x);
        ph.style.maskImage = m;
        ph.style.webkitMaskImage = m;
        ph.style.filter = `grayscale(${s.gray.toFixed(3)}) contrast(${(1 + 0.12 * s.pop).toFixed(3)})`;
        zm.style.transform = `scale(${s.scale.toFixed(4)})`;
        ln.style.backgroundImage = sweepLine(s.x);
        ln.style.opacity = String(s.line);
      };
      apply();

      const tl = gsap.timeline({
        paused: true,
        onComplete: () => {
          // estado final: a foto real, sem máscara nem filtro
          ph.style.maskImage = "none";
          ph.style.webkitMaskImage = "none";
          ph.style.filter = "none";
          zm.style.transform = "none";
          ln.style.opacity = "0";
          setRevealed(true);
        },
      });
      // 1) a linha varre a diagonal revelando a foto
      tl.to(s, { x: 108, duration: 1.1, ease: "power2.inOut", onUpdate: apply }, 0)
        .to(s, { line: 0, duration: 0.2, ease: "power1.out", onUpdate: apply }, 1.0)
        // 2) a cor floresce logo depois, com o contraste subindo e voltando no meio
        .to(s, { gray: 0, duration: 1.2, ease: "power1.inOut", onUpdate: apply }, 0.95)
        .to(s, {
          keyframes: [
            { pop: 1, duration: 0.6, ease: "sine.out" },
            { pop: 0, duration: 0.6, ease: "sine.in" },
          ],
          onUpdate: apply,
        }, 0.95)
        // 3) settle
        .to(s, { scale: 1, duration: 1.4, ease: "power3.out", onUpdate: apply }, 1.0);

      // revealOnce: gatilho + rede de segurança (a foto nunca fica presa no escuro)
      return revealOnce({ trigger: root.current!, start: "top 75%", play: () => tl.play(), finish: () => tl.progress(1) });
    },
    { scope: root, dependencies: [mode], revertOnUpdate: true },
  );

  return (
    <TiltCard
      ref={frame}
      className="md:max-w-[calc(85vh*806/1448)]"
      active={mode === "static" || revealed}
      touchMode="glare"
      overlay={
        // marcas de corte nos cantos, como num contact sheet (as mesmas do MediaSlot)
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <span className="absolute left-3 top-3 h-3 w-3 border-l border-t border-foreground/30" />
          <span className="absolute right-3 top-3 h-3 w-3 border-r border-t border-foreground/30" />
          <span className="absolute bottom-3 left-3 h-3 w-3 border-b border-l border-foreground/30" />
          <span className="absolute bottom-3 right-3 h-3 w-3 border-b border-r border-foreground/30" />
        </div>
      }
    >
      <div ref={root} className="relative isolate aspect-[806/1448] overflow-hidden border border-line bg-surface">
        {/* máscara e filtro no tamanho do quadro (alinhados à linha de luz);
            dentro, a imagem 16% mais alta que o quadro (a sobra cobre o
            parallax) e a camada da escala */}
        <div ref={photo} className="absolute inset-0">
          <div className="absolute inset-0">
            <div ref={zoom} className="absolute inset-0">
              <picture>
                <source media="(min-width: 768px)" type="image/webp" srcSet="/retrato/breno-sobre.webp" />
                <source media="(min-width: 768px)" srcSet="/retrato/breno-sobre.jpg" />
                <source type="image/webp" srcSet="/retrato/breno-sobre-800.webp" />
                <img
                  src="/retrato/breno-sobre-800.jpg"
                  alt={alt}
                  width={806}
                  height={1448}
                  loading={priority ? "eager" : "lazy"}
                  fetchPriority={priority ? "high" : undefined}
                  decoding="async"
                  translate="no"
                  className="h-full w-full object-cover"
                />
              </picture>
            </div>
          </div>
        </div>
        {/* linha de luz da entrada (screen: só clareia) */}
        <div ref={line} aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-0 mix-blend-screen" />
      </div>
    </TiltCard>
  );
}

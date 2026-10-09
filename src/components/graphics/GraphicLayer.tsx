"use client";

import { useRef, type CSSProperties } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP, ScrollTrigger);

/**
 * Grafismo de fundo das seções claras: linhas finas na cor do token --graphic.
 * - "contours-a" / "contours-b": curvas de nível (SVGs gerados por
 *   scripts/generate-contours.mjs), aplicadas como MÁSCARA CSS — a cor vem do
 *   fundo (bg-graphic), então acompanham o tema sem duplicar arquivos.
 * - "grid": grade técnica em CSS puro (sem imagem).
 * Movimento (só sem prefers-reduced-motion; só com transform):
 * - parallax sutil com o scroll (camada externa, ~8% mais devagar);
 * - deriva orgânica contínua (camada interna): deslocamentos lentos em x/y,
 *   rotação mínima e "respiração" de escala, com períodos diferentes que não se
 *   sincronizam — as linhas parecem ondular devagar, sem loop perceptível.
 *   Pausa quando a seção sai da tela (economia no mobile).
 * O pai precisa ser `relative overflow-hidden`.
 */
export default function GraphicLayer({
  variant,
  className = "",
}: {
  variant: "contours-a" | "contours-b" | "grid";
  className?: string;
}) {
  const layer = useRef<HTMLDivElement>(null);
  const drift = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      gsap.fromTo(
        layer.current,
        { yPercent: -4 },
        {
          yPercent: 4,
          ease: "none",
          scrollTrigger: {
            trigger: layer.current?.parentElement,
            start: "top bottom",
            end: "bottom top",
            scrub: true,
          },
        },
      );

      // Deriva: cada eixo com período próprio (s), ida e volta em seno.
      const tweens = [
        gsap.to(drift.current, { paused: true, x: 22, duration: 23, ease: "sine.inOut", repeat: -1, yoyo: true }),
        gsap.to(drift.current, { paused: true, y: -28, duration: 31, ease: "sine.inOut", repeat: -1, yoyo: true }),
        gsap.to(drift.current, { paused: true, rotation: 0.8, duration: 41, ease: "sine.inOut", repeat: -1, yoyo: true }),
        gsap.to(drift.current, { paused: true, scale: 1.035, duration: 29, ease: "sine.inOut", repeat: -1, yoyo: true }),
      ];
      // começa pausada; só anda enquanto a seção está na tela
      const visible = ScrollTrigger.create({
        trigger: layer.current?.parentElement,
        start: "top bottom",
        end: "bottom top",
        onToggle: (self) => tweens.forEach((t) => (self.isActive ? t.play() : t.pause())),
      });
      if (visible.isActive) tweens.forEach((t) => t.play());
    });
  });

  const mask: CSSProperties | undefined =
    variant === "grid"
      ? undefined
      : {
          maskImage: `url(/graphics/${variant}.svg)`,
          WebkitMaskImage: `url(/graphics/${variant}.svg)`,
          maskSize: "cover",
          WebkitMaskSize: "cover",
          maskPosition: "center",
          WebkitMaskPosition: "center",
          maskRepeat: "no-repeat",
          WebkitMaskRepeat: "no-repeat",
        };

  return (
    <div aria-hidden="true" className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}>
      <div ref={layer} className="absolute inset-x-0 -inset-y-[8%]">
        {/* margem extra (-3%) para a deriva/rotação nunca revelar as bordas */}
        <div
          ref={drift}
          className={`absolute -inset-[3%] will-change-transform ${
            variant === "grid"
              ? "bg-[linear-gradient(to_right,var(--graphic)_1px,transparent_1px),linear-gradient(to_bottom,var(--graphic)_1px,transparent_1px)] bg-[size:80px_80px]"
              : "bg-graphic"
          }`}
          style={mask}
        />
      </div>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import LiquidContours from "./LiquidContours";
import ResilientBoundary from "@/components/ResilientBoundary";
import { webglSupport } from "@/lib/webgl";
import { presetFor, useSceneTier, useWebglSlot } from "@/lib/quality";
import { isMobileUI } from "@/lib/mobile";

gsap.registerPlugin(useGSAP, ScrollTrigger);

type Variant = "contours-a" | "contours-b" | "grid";

/** Máscara CSS com um dos SVGs de curvas (a cor vem do fundo do elemento). */
function maskOf(file: "contours-a" | "contours-b"): CSSProperties {
  const url = `url(/graphics/${file}.svg)`;
  return {
    maskImage: url,
    WebkitMaskImage: url,
    maskSize: "cover",
    WebkitMaskSize: "cover",
    maskPosition: "center",
    WebkitMaskPosition: "center",
    maskRepeat: "no-repeat",
    WebkitMaskRepeat: "no-repeat",
  };
}

/**
 * Grafismo de fundo das seções claras, na cor do token --graphic.
 * - "contours-a" / "contours-b": curvas de nível.
 *   - Com WebGL2 e sem prefers-reduced-motion: LÍQUIDAS em tempo real
 *     (LiquidContours: isolinhas de ruído 3D animado + ondulação do cursor).
 *   - Senão (e como poster até o shader ficar pronto): SVG estático gerado por
 *     scripts/generate-contours.mjs, aplicado como máscara CSS.
 *   A variante escolhe o desenho do SVG e a semente do shader.
 * - "grid": grade técnica em CSS puro.
 * Parallax sutil com o scroll na camada externa (só sem reduced motion).
 * O pai precisa ser `relative overflow-hidden`.
 */
export default function GraphicLayer({
  variant,
  className = "",
}: {
  variant: Variant;
  className?: string;
}) {
  const outer = useRef<HTMLDivElement>(null);
  const layer = useRef<HTMLDivElement>(null);
  /** O canvas só existe com a seção perto da tela e com vaga no orçamento de contextos. */
  const near = useWebglSlot(outer);
  const [mode, setMode] = useState<{ liquid: boolean; light: boolean } | null>(null);
  const [liquidReady, setLiquidReady] = useState(false);

  useEffect(() => {
    if (variant === "grid") return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- leitura única de capacidades do navegador
    setMode({
      liquid: !reduced && webglSupport().webgl2,
      light: window.matchMedia("(pointer: coarse)").matches,
    });
  }, [variant]);

  const handleReady = useCallback(() => setLiquidReady(true), []);
  // canvas desmontado: volta ao SVG estático até o próximo ficar pronto
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reflete a desmontagem do canvas
    if (!near) setLiquidReady(false);
  }, [near]);
  const handleFail = useCallback(() => setMode((m) => (m ? { ...m, liquid: false } : m)), []);
  const tier = useSceneTier("curvas", outer, !!mode?.liquid && near);
  /** Celular: rolagem lenta manda as curvas para o SVG estático (lib/quality). */
  const poster = tier === "none";
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reflete a desmontagem do canvas
    if (poster) setLiquidReady(false);
  }, [poster]);

  useGSAP(() => {
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      // celular: sem parallax preso ao scroll; deriva lenta em CSS (.poster-drift)
      if (isMobileUI()) return;
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
    });
  });

  return (
    <div ref={outer} aria-hidden="true" className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}>
      <div ref={layer} className="poster-drift absolute inset-x-0 -inset-y-[8%]">
        {variant === "grid" ? (
          <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--graphic)_1px,transparent_1px),linear-gradient(to_bottom,var(--graphic)_1px,transparent_1px)] bg-[size:80px_80px]" />
        ) : (
          <>
            <div
              className={`absolute inset-0 bg-graphic transition-opacity duration-700 ${
                liquidReady ? "opacity-0" : "opacity-100"
              }`}
              style={maskOf(variant)}
            />
            {mode?.liquid && (
              <div
                className={`absolute inset-0 transition-opacity duration-700 ${
                  liquidReady ? "opacity-100" : "opacity-0"
                }`}
              >
                {/* falha ou perda de contexto: remonta; só fica no SVG se falhar de novo */}
                <ResilientBoundary name="curvas líquidas" onGiveUp={handleFail}>
                  {(onLost) =>
                    near && !poster && (
                      <LiquidContours
                        seed={variant === "contours-a" ? 1 : 2}
                        light={mode.light || tier === "low"}
                        maxDpr={presetFor(tier).maxDpr}
                        onReady={handleReady}
                        onFail={onLost}
                      />
                    )
                  }
                </ResilientBoundary>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

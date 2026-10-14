"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import ResilientBoundary from "@/components/ResilientBoundary";
import { webglSupport } from "@/lib/webgl";
import { presetFor, useSceneTier, useWebglSlot } from "@/lib/quality";
import { fadeWhileActive } from "@/lib/reveal";
import { isMobileUI, useIsMobileUI } from "@/lib/mobile";
import SceneSwap, { Poster, useSceneSwap } from "./SceneSwap";
import { prefetchGltf } from "@/lib/gltf";
import { usePreloadBeforeSection } from "@/lib/preload";

gsap.registerPlugin(useGSAP, ScrollTrigger);

const AerialScene = dynamic(() => import("./forest/AerialScene"), { ssr: false });

type Env = { webgl: boolean; reduced: boolean; coarse: boolean };

/** Opacidade da cena (o texto do Sobre fica por cima). */
const OPACITY = 0.5;
/** Celular: a cena ~35% mais clara (o urso aparecia escuro demais na tela pequena). */
const MOBILE_OPACITY = OPACITY * 1.35;

/**
 * Fundo 3D do Sobre: descida aérea sobre uma floresta nevada cortada por um
 * rio, até a cachoeira, com o urso em pé numa pedra no alto da queda (ver
 * forest/aerial.ts). Deve ser o primeiro filho da seção (`relative`,
 * `overflow-clip`): ocupa a seção inteira e mantém o fundo FIXO na tela
 * (sticky), atrás do conteúdo (que fica em `relative z-10`).
 * - Scroll: a câmera percorre a descida do início ao fim da seção (o
 *   amortecimento da câmera dá o scrub suave).
 * - Sem WebGL2: nada (o gradiente escuro da seção).
 * - Toque / nível "low": versão leve (menos árvores e partículas, sem sombras).
 * - prefers-reduced-motion: enquadramento final parado.
 * A cena e o modelo do urso só carregam com a seção a até ~1 tela e com vaga
 * no orçamento de contextos (useWebglSlot); só renderiza com ela visível.
 * Celular: pôster do 1º quadro enquanto carrega e troca invisível (SceneSwap).
 */
export default function ForestBackdrop({ bearSrc }: { bearSrc?: string }) {
  const root = useRef<HTMLDivElement>(null);
  const layer = useRef<HTMLDivElement>(null);
  /** Progresso da seção (0→1), lido pela câmera a cada quadro. */
  const progress = useRef(0);
  const pointer = useRef({ x: 0, y: 0 });
  const [env, setEnv] = useState<Env | null>(null);
  const [active, setActive] = useState(false);
  /** Celular: pôster ↔ cena sem a troca aparecer (sem reduced motion). */
  const swap = useSceneSwap(root, useIsMobileUI() && env?.reduced === false);
  const near = useWebglSlot(root, undefined, { name: "floresta", onRelease: swap.release });
  // pré-carga quando "Trabalhos" aparece: código da cena e o urso (bytes)
  usePreloadBeforeSection(root, () => {
    if (!webglSupport().webgl2) return;
    import("./forest/AerialScene").catch(() => undefined);
    if (bearSrc) prefetchGltf(bearSrc).catch(() => undefined);
  });

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const webgl = webglSupport().webgl2;
    if (!webgl) console.info("[floresta] sem WebGL2 acelerado: só o gradiente da seção.");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- leitura única de capacidades do navegador
    setEnv({ webgl, reduced, coarse: window.matchMedia("(pointer: coarse)").matches });
    if (reduced) progress.current = 1; // enquadramento final
  }, []);

  // renderiza só com a seção na tela (com margem para não piscar ao entrar)
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setActive(e.isIntersecting), { rootMargin: "50% 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // parallax leve com o mouse (só ponteiro fino)
  useEffect(() => {
    if (!env || env.coarse || env.reduced) return;
    const onMove = (e: PointerEvent) => {
      pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [env]);

  const handleFail = useCallback(() => setEnv((e) => (e ? { ...e, webgl: false } : e)), []);
  const scene = env?.webgl === true;
  const tier = useSceneTier("floresta", root, scene && near);

  useGSAP(
    () => {
      if (!scene) return;
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const section = root.current?.parentElement;
        if (!section) return;
        // a câmera desce da vista aérea até a cachoeira ao longo da seção
        ScrollTrigger.create({
          trigger: section,
          start: "top 60%",
          end: "bottom bottom",
          refreshPriority: -1,
          onUpdate: (self) => {
            progress.current = self.progress;
          },
        });
        // entra e sai em fade com a seção
        if (isMobileUI()) {
          // celular: fade curto enquanto a seção está na tela (sem scrub)
          fadeWhileActive(layer.current!, section, "top 63%", "bottom 35%");
        } else {
          gsap.fromTo(
            layer.current,
            { opacity: 0 },
            { opacity: 1, ease: "none", scrollTrigger: { trigger: section, start: "top 90%", end: "top 35%", scrub: true, refreshPriority: -1 } },
          );
          gsap.to(layer.current, {
            opacity: 0,
            ease: "none",
            immediateRender: false,
            scrollTrigger: { trigger: section, start: "bottom 60%", end: "bottom 10%", scrub: true, refreshPriority: -1 },
          });
        }
      });
    },
    { scope: root, dependencies: [scene], revertOnUpdate: true },
  );

  if (!scene) return <div ref={root} aria-hidden="true" className="pointer-events-none absolute inset-0 z-0" />;

  return (
    <div ref={root} aria-hidden="true" data-scene="floresta" className="pointer-events-none absolute inset-0 z-0">
      <div className="sticky top-0 h-svh overflow-hidden">
        <div ref={layer} className="absolute inset-0">
          <div className="absolute inset-0" style={{ opacity: isMobileUI() ? MOBILE_OPACITY : OPACITY }}>
            <SceneSwap swap={swap} poster={(end) => <Poster name="floresta" end={end} />}>
              {/* erro ou perda de contexto: remonta; desiste (só o gradiente) se falhar de novo */}
              <ResilientBoundary name="floresta" onGiveUp={handleFail}>
                {(onLost) =>
                  near && tier !== "none" && (
                    <AerialScene
                      progressRef={progress}
                      pointerRef={pointer}
                      bearSrc={bearSrc}
                      active={active}
                      light={env.coarse || tier === "low"}
                      maxDpr={presetFor(tier).maxDpr}
                      reducedMotion={env.reduced}
                      onContextLost={onLost}
                      link={swap.link}
                    />
                  )
                }
              </ResilientBoundary>
            </SceneSwap>
          </div>
          {/* vinheta, degradês de entrada/saída e o degradê escuro atrás do texto (direita).
              Celular: vinheta mais aberta e camada escura geral menor; a leitura vem do
              degradê atrás de cada bloco de texto (AboutStory), com o urso visível entre eles */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,var(--bg)_100%)] mobile:bg-[radial-gradient(ellipse_at_center,transparent_55%,var(--bg)_100%)]" />
          <div className="absolute inset-0 bg-background/35 mobile:bg-background/10 md:bg-transparent md:bg-gradient-to-l md:from-background/80 md:via-background/45 md:via-40% md:to-transparent md:to-65%" />
          <div className="absolute inset-x-0 top-0 h-1/4 bg-gradient-to-b from-background to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-t from-background to-transparent" />
        </div>
      </div>
    </div>
  );
}

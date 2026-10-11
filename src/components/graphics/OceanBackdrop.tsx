"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import ResilientBoundary from "@/components/ResilientBoundary";
import { webglSupport } from "@/lib/webgl";
import { presetFor, useSceneMonitor, useTier, useWebglSlot } from "@/lib/quality";

gsap.registerPlugin(useGSAP, ScrollTrigger);

const OceanScene = dynamic(() => import("./ocean/OceanScene"), { ssr: false });

type Env = { webgl: boolean; reduced: boolean; coarse: boolean };

/**
 * Fundo de oceano 3D de "E a inteligência artificial?" (mesmo espírito das
 * montanhas e das nuvens). Deve ser o primeiro filho da seção (`relative`,
 * `overflow-clip`): ocupa a seção inteira e mantém o fundo FIXO na tela
 * (sticky), atrás do conteúdo (que fica em `relative z-10`).
 * Narrativa (superfície = o que a IA alcança; profundidade = a experiência
 * humana): a câmera começa acima do alto-mar, desce, atravessa a linha d'água
 * e mergulha até o recife, com raios de luz, cáusticas, partículas, cardume e
 * tartarugas, cardume e tubarões (ver ocean/world.ts). Opacidade 40% acima
 * d'água e 52% submersa, vinheta e fades.
 * - Sem WebGL2: nada (fundo preto da seção).
 * - Toque / nível "low": versão leve (menos ondas, peixes, corais e
 *   partículas, resolução 0,6x).
 * - prefers-reduced-motion: quadro estático, já no fundo, perto do recife.
 * A cena só existe com a seção a até ~1 tela e com vaga no orçamento de
 * contextos (useWebglSlot), e só renderiza com ela visível.
 */
export default function OceanBackdrop() {
  const root = useRef<HTMLDivElement>(null);
  const layer = useRef<HTMLDivElement>(null);
  /** Opacidade da cena: 0,4 acima d'água, um pouco mais (0,52) submersa. */
  const fade = useRef<HTMLDivElement>(null);
  /** Progresso da seção (0→1), lido pela câmera a cada quadro. */
  const progress = useRef(0);
  const pointer = useRef({ x: 0, y: 0 });
  const [env, setEnv] = useState<Env | null>(null);
  const [active, setActive] = useState(false);
  const near = useWebglSlot(root);
  const tier = useTier();

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const webgl = webglSupport().webgl2;
    if (!webgl) console.info("[oceano] sem WebGL2 acelerado: sem fundo de oceano.");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- leitura única de capacidades do navegador
    setEnv({ webgl, reduced, coarse: window.matchMedia("(pointer: coarse)").matches });
    if (reduced) progress.current = 0.92;
  }, []);

  const setDepth = useCallback((p: number) => {
    if (fade.current) fade.current.style.opacity = String(0.4 + 0.12 * Math.min(1, Math.max(0, (p - 0.4) / 0.15)));
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
  useSceneMonitor(scene && near);

  useGSAP(
    () => {
      if (!scene) return;
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const section = root.current?.parentElement;
        if (!section) return;
        // alto-mar → linha d'água → recife, ao longo da seção
        ScrollTrigger.create({
          trigger: section,
          start: "top 70%",
          end: "bottom 85%",
          refreshPriority: -1,
          onUpdate: (self) => {
            progress.current = self.progress;
            setDepth(self.progress);
          },
        });
        // entra em fade com a seção; sai em fade no fim (antes do off-white
        // de "Poucas parcerias"), depois de a câmera chegar ao recife
        gsap.fromTo(
          layer.current,
          { opacity: 0 },
          { opacity: 1, ease: "none", scrollTrigger: { trigger: section, start: "top 90%", end: "top 35%", scrub: true, refreshPriority: -1 } },
        );
        gsap.to(layer.current, {
          opacity: 0,
          ease: "none",
          immediateRender: false,
          scrollTrigger: { trigger: section, start: "bottom 75%", end: "bottom 25%", scrub: true, refreshPriority: -1 },
        });
      });
    },
    { scope: root, dependencies: [scene, setDepth], revertOnUpdate: true },
  );

  if (!scene) return <div ref={root} aria-hidden="true" className="pointer-events-none absolute inset-0 z-0" />;

  return (
    <div ref={root} aria-hidden="true" className="pointer-events-none absolute inset-0 z-0">
      <div className="sticky top-0 h-svh overflow-hidden">
        <div ref={layer} className="absolute inset-0">
          <div ref={fade} className="absolute inset-0" style={{ opacity: env.reduced ? 0.52 : 0.4 }}>
            {/* erro ou perda de contexto: remonta; desiste (sem oceano) se falhar de novo */}
            <ResilientBoundary name="oceano" onGiveUp={handleFail}>
              {(onLost) =>
                near && (
                  <OceanScene
                    progressRef={progress}
                    pointerRef={pointer}
                    active={active}
                    light={env.coarse || tier === "low"}
                    maxDpr={presetFor(tier).maxDpr}
                    reducedMotion={env.reduced}
                    onContextLost={onLost}
                  />
                )
              }
            </ResilientBoundary>
          </div>
          {/* vinheta e degradês para o fundo (entrada/saída sem corte, texto legível) */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_35%,var(--bg)_100%)]" />
          <div className="absolute inset-x-0 top-0 h-1/4 bg-gradient-to-b from-background to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-t from-background to-transparent" />
        </div>
      </div>
    </div>
  );
}

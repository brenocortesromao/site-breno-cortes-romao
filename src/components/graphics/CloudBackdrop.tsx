"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import ResilientBoundary from "@/components/ResilientBoundary";
import { webglSupport } from "@/lib/webgl";
import { useSceneMonitor, useTier, useWebglSlot } from "@/lib/quality";

gsap.registerPlugin(useGSAP, ScrollTrigger);

const CloudScene = dynamic(() => import("./clouds/CloudScene"), { ssr: false });

type Env = { webgl: boolean; reduced: boolean; coarse: boolean };

/**
 * Fundo de nuvens 3D do "Diagnóstico" (mesmo espírito das montanhas, ver
 * MountainBackdrop). Deve ser o primeiro filho da seção (`relative`): ocupa a
 * seção inteira e mantém o fundo FIXO na tela (sticky), atrás do conteúdo.
 * - Com WebGL2: mar de nuvens (clouds/CloudScene). A câmera começa alta, desce
 *   atravessando as camadas com o scroll da seção e, no fim, as nuvens se abrem
 *   (a falta de clareza se dissipa). Opacidade ~30%, vinheta e fades.
 * - Sem WebGL2: nada (fundo preto da seção); não há foto de fallback.
 * - prefers-reduced-motion: quadro estático. Toque: versão mais leve.
 * A cena só é montada com a seção a até ~1 tela e só renderiza com ela visível.
 */
export default function CloudBackdrop() {
  const root = useRef<HTMLDivElement>(null);
  const layer = useRef<HTMLDivElement>(null);
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
    if (!webgl) console.info("[nuvens] sem WebGL2 acelerado: sem fundo de nuvens.");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- leitura única de capacidades do navegador
    setEnv({ webgl, reduced, coarse: window.matchMedia("(pointer: coarse)").matches });
    if (reduced) progress.current = 0.3;
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
        // descida da câmera e abertura das nuvens ao longo da seção
        ScrollTrigger.create({
          trigger: section,
          start: "top 40%",
          end: "bottom 70%",
          refreshPriority: -1,
          onUpdate: (self) => (progress.current = self.progress),
        });
        // entra em fade com a seção; sai em fade DEPOIS de as nuvens se abrirem
        // (fim do progresso) e antes do off-white seguinte
        gsap.fromTo(
          layer.current,
          { opacity: 0 },
          { opacity: 1, ease: "none", scrollTrigger: { trigger: section, start: "top 85%", end: "top 25%", scrub: true, refreshPriority: -1 } },
        );
        gsap.to(layer.current, {
          opacity: 0,
          ease: "none",
          immediateRender: false,
          scrollTrigger: { trigger: section, start: "bottom 70%", end: "bottom 30%", scrub: true, refreshPriority: -1 },
        });
      });
    },
    { scope: root, dependencies: [scene], revertOnUpdate: true },
  );

  if (!scene) return <div ref={root} aria-hidden="true" className="pointer-events-none absolute inset-0 z-0" />;

  return (
    <div ref={root} aria-hidden="true" className="pointer-events-none absolute inset-0 z-0">
      <div className="sticky top-0 h-svh overflow-hidden">
        <div ref={layer} className="absolute inset-0">
          <div className="absolute inset-0 opacity-[0.34]">
            {/* erro ou perda de contexto: remonta; desiste (sem nuvens) se falhar de novo */}
            <ResilientBoundary name="nuvens" onGiveUp={handleFail}>
              {(onLost) =>
                near && (
                  <CloudScene
                    progressRef={progress}
                    pointerRef={pointer}
                    active={active}
                    light={env.coarse || tier === "low"}
                    reducedMotion={env.reduced}
                    onContextLost={onLost}
                  />
                )
              }
            </ResilientBoundary>
          </div>
          {/* vinheta e degradês para o fundo (entrada/saída sem corte, texto legível) */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,var(--bg)_100%)]" />
          <div className="absolute inset-x-0 top-0 h-1/4 bg-gradient-to-b from-background to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-t from-background to-transparent" />
        </div>
      </div>
    </div>
  );
}

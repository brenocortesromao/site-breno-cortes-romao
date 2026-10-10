"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import ResilientBoundary from "@/components/ResilientBoundary";
import { webglSupport } from "@/lib/webgl";
import { useNearViewport } from "@/lib/useNearViewport";

gsap.registerPlugin(useGSAP, ScrollTrigger);

const MountainScene = dynamic(() => import("./terrain/MountainScene"), { ssr: false });

/** Pico nevado principal da foto de fallback (fração da imagem): foco do zoom. */
const PEAK = "62% 70%";

type Env = { webgl: boolean; reduced: boolean; coarse: boolean };

/**
 * Fundo de montanhas para o trecho "O que eu faço" + "O que muda". Deve ser o
 * primeiro filho de um contêiner `relative` que envolve as duas seções: ocupa
 * o contêiner inteiro e mantém o fundo FIXO na tela (sticky), atrás do conteúdo.
 * - Com WebGL2: terreno 3D procedural (terrain/MountainScene), câmera descendo
 *   com o scroll do trecho, deriva lenta e parallax leve do mouse; opacidade
 *   ~36%. Renderiza só com o trecho visível.
 * - Sem WebGL: a foto de public/fundo/ (P&B) com zoom 1.0 → 1.5 no pico.
 * - Vinheta e degradê para o fundo; entra e sai em fade (sem corte).
 * - prefers-reduced-motion: quadro estático (sem deriva nem descida).
 */
export default function MountainBackdrop({ alt }: { alt: string }) {
  const root = useRef<HTMLDivElement>(null);
  const layer = useRef<HTMLDivElement>(null);
  const zoom = useRef<HTMLDivElement>(null);
  /** Progresso do trecho (0→1), lido pela câmera a cada quadro. */
  const progress = useRef(0);
  const pointer = useRef({ x: 0, y: 0 });
  const [env, setEnv] = useState<Env | null>(null);
  const [active, setActive] = useState(false);
  /** A cena só existe com o trecho a até ~1 tela: longe, é desmontada (libera o contexto WebGL). */
  const near = useNearViewport(root);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- leitura única de capacidades do navegador
    setEnv({ webgl: webglSupport().webgl2, reduced, coarse: window.matchMedia("(pointer: coarse)").matches });
    if (reduced) progress.current = 0.45;
  }, []);

  // renderiza só com o trecho na tela (com margem para não piscar ao entrar)
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => setActive(e.isIntersecting),
      { rootMargin: "50% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // gera o terreno (com cache) num momento ocioso logo após o carregamento
  useEffect(() => {
    if (!env?.webgl) return;
    const run = () => import("./terrain/heightmap").then((m) => m.getTerrain(m.terrainSize(env.coarse)));
    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(run, { timeout: 4000 });
      return () => window.cancelIdleCallback(id);
    }
    const id = setTimeout(run, 1500);
    return () => clearTimeout(id);
  }, [env]);

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
  const mountScene = scene && near;

  useGSAP(
    () => {
      if (!env) return; // espera a detecção (3D ou foto) para animar o alvo certo
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const trecho = root.current?.parentElement;
        if (!trecho) return;
        // descida da câmera (3D) e zoom da foto (fallback) no mesmo trecho
        ScrollTrigger.create({
          trigger: trecho,
          start: "top top",
          end: "bottom 40%",
          refreshPriority: -1,
          onUpdate: (self) => (progress.current = self.progress),
        });
        if (!scene && zoom.current)
          gsap.fromTo(
            zoom.current,
            { scale: 1, yPercent: 0 },
            {
              scale: 1.5,
              yPercent: -4,
              ease: "none",
              scrollTrigger: { trigger: trecho, start: "top top", end: "bottom 40%", scrub: 0.8, refreshPriority: -1 },
            },
          );
        // entra em fade quando o trecho chega e sai em fade no fim de "O que muda"
        gsap.fromTo(
          layer.current,
          { opacity: 0 },
          { opacity: 1, ease: "none", scrollTrigger: { trigger: trecho, start: "top bottom", end: "top 30%", scrub: true, refreshPriority: -1 } },
        );
        gsap.to(layer.current, {
          opacity: 0,
          ease: "none",
          immediateRender: false,
          // recalculado DEPOIS do pin dos pilares (que muda a altura do trecho)
          scrollTrigger: { trigger: trecho, start: "bottom 95%", end: "bottom 35%", scrub: true, refreshPriority: -1 },
        });
      });
    },
    { scope: root, dependencies: [env, scene], revertOnUpdate: true },
  );

  return (
    <div ref={root} aria-hidden="true" className="pointer-events-none absolute inset-0 z-0">
      <div className="sticky top-0 h-svh overflow-hidden">
        <div ref={layer} className="absolute inset-0">
          {scene ? (
            <div className="absolute inset-0 opacity-[0.36]">
              {/* erro ou perda de contexto: remonta; só cai na foto se falhar de novo */}
              <ResilientBoundary onGiveUp={handleFail}>
                {(onLost) =>
                  mountScene && (
                    <MountainScene
                      progressRef={progress}
                      pointerRef={pointer}
                      active={active}
                      light={env.coarse}
                      reducedMotion={env.reduced}
                      onContextLost={onLost}
                    />
                  )
                }
              </ResilientBoundary>
            </div>
          ) : (
            env && (
              <div ref={zoom} className="absolute inset-0 will-change-transform" style={{ transformOrigin: PEAK }}>
                <div className="absolute inset-0 opacity-[0.24]">
                  <Image
                    src="/fundo/montanhas.webp"
                    alt={alt}
                    fill
                    sizes="100vw"
                    className="hidden object-cover md:block"
                    style={{ objectPosition: PEAK }}
                  />
                  <Image
                    src="/fundo/montanhas-mobile.webp"
                    alt={alt}
                    fill
                    sizes="100vw"
                    className="object-cover md:hidden"
                    style={{ objectPosition: PEAK }}
                  />
                </div>
              </div>
            )
          )}
          {/* vinheta e degradês para o fundo (entrada/saída sem corte) */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_35%,var(--bg)_100%)]" />
          <div className="absolute inset-x-0 top-0 h-1/4 bg-gradient-to-b from-background to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-t from-background to-transparent" />
        </div>
      </div>
    </div>
  );
}

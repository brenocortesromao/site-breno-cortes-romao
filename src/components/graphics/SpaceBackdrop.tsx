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
import { isMobileUI } from "@/lib/mobile";

gsap.registerPlugin(useGSAP, ScrollTrigger);

const SpaceScene = dynamic(() => import("./space/SpaceScene"), { ssr: false });

type Env = { webgl: boolean; reduced: boolean; coarse: boolean };

/**
 * Fundo de espaço 3D do Contato (monocromático: estrelas em 3 camadas, planeta
 * de metal líquido à direita com anéis, galáxia fraca no alto à esquerda,
 * poeira em primeiro plano; ver space/world.ts). Primeiro filho da seção
 * (`relative`, `overflow-clip`); o conteúdo fica em `relative z-10`.
 * - Scroll: enquanto a seção entra, a câmera avança devagar em direção ao
 *   planeta ("fechar a distância").
 * - Hover no botão principal ([data-warp]): as estrelas esticam em rastros na
 *   direção do centro por ~0,6 s e voltam com ease.
 * - Legibilidade: degradê escuro por cima do 3D do lado esquerdo (texto).
 * - Sem WebGL2: nada (o gradiente escuro da seção). Toque / nível "low":
 *   versão leve (~1500 estrelas, sem poeira, planeta com menos segmentos).
 * - prefers-reduced-motion: quadro estático, sem warp e sem avanço da câmera.
 * A cena só existe com a seção a até ~1 tela e com vaga no orçamento de
 * contextos (useWebglSlot), e só renderiza com ela visível.
 */
export default function SpaceBackdrop() {
  const root = useRef<HTMLDivElement>(null);
  const layer = useRef<HTMLDivElement>(null);
  const progress = useRef(0);
  const pointer = useRef({ x: 0, y: 0 });
  const warp = useRef(0);
  const [env, setEnv] = useState<Env | null>(null);
  const [active, setActive] = useState(false);
  const near = useWebglSlot(root);
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const webgl = webglSupport().webgl2;
    if (!webgl) console.info("[espaço] sem WebGL2 acelerado: só o gradiente da seção.");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- leitura única de capacidades do navegador
    setEnv({ webgl, reduced, coarse: window.matchMedia("(pointer: coarse)").matches });
    if (reduced) progress.current = 1;
  }, []);

  // renderiza só com a seção na tela
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setActive(e.isIntersecting), { rootMargin: "25% 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // toque: warp ao tocar no botão principal e uma vez quando a seção entra
  useEffect(() => {
    if (!env || !env.coarse || env.reduced) return;
    const section = root.current?.parentElement;
    if (!section) return;
    const w = { v: 0 };
    const fire = () =>
      gsap
        .timeline({ onUpdate: () => (warp.current = w.v) })
        .to(w, { v: 1, duration: 0.25, ease: "power2.out", overwrite: true })
        .to(w, { v: 0, duration: 0.6, ease: "power2.inOut" }, "+=0.35");
    const onDown = (e: Event) => {
      if ((e.target as Element).closest("[data-warp]")) fire();
    };
    section.addEventListener("pointerdown", onDown);
    let done = false;
    const io = new IntersectionObserver(
      ([e]) => {
        if (done || !e.isIntersecting) return;
        done = true;
        io.disconnect();
        gsap.delayedCall(0.6, fire); // depois da cena compilar e aparecer
      },
      { threshold: 0.5 },
    );
    io.observe(section);
    return () => {
      section.removeEventListener("pointerdown", onDown);
      io.disconnect();
      gsap.killTweensOf(w);
      gsap.killTweensOf(fire);
    };
  }, [env]);

  // parallax com o mouse + warp no hover do botão principal (só ponteiro fino)
  useEffect(() => {
    if (!env || env.coarse || env.reduced) return;
    const section = root.current?.parentElement;
    const onMove = (e: PointerEvent) => {
      pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    const w = { v: 0 };
    const onOver = (e: Event) => {
      const t = (e.target as Element).closest("[data-warp]");
      const from = (e as MouseEvent).relatedTarget as Element | null;
      if (!t || (from && t.contains(from))) return;
      gsap
        .timeline({ onUpdate: () => (warp.current = w.v) })
        .to(w, { v: 1, duration: 0.25, ease: "power2.out", overwrite: true })
        .to(w, { v: 0, duration: 0.6, ease: "power2.inOut" }, "+=0.35");
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    section?.addEventListener("mouseover", onOver);
    return () => {
      window.removeEventListener("pointermove", onMove);
      section?.removeEventListener("mouseover", onOver);
      gsap.killTweensOf(w);
    };
  }, [env]);

  const handleFail = useCallback(() => setEnv((e) => (e ? { ...e, webgl: false } : e)), []);
  const scene = env?.webgl === true;
  const tier = useSceneTier("espaço", root, scene && near);

  useGSAP(
    () => {
      if (!scene) return;
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const section = root.current?.parentElement;
        if (!section) return;
        // a câmera avança enquanto a seção entra na tela (scrub)
        ScrollTrigger.create({
          trigger: section,
          start: "top bottom",
          end: "top top",
          scrub: true,
          refreshPriority: -1,
          onUpdate: (self) => {
            progress.current = self.progress;
          },
        });
        if (isMobileUI()) {
          // celular: fade curto enquanto a seção está na tela (sem scrub)
          fadeWhileActive(layer.current!, section, "top 63%", "bottom top");
        } else {
          gsap.fromTo(
            layer.current,
            { opacity: 0 },
            { opacity: 1, ease: "none", scrollTrigger: { trigger: section, start: "top 90%", end: "top 35%", scrub: true, refreshPriority: -1 } },
          );
        }
      });
    },
    { scope: root, dependencies: [scene], revertOnUpdate: true },
  );

  if (!scene) return <div ref={root} aria-hidden="true" className="pointer-events-none absolute inset-0 z-0" />;

  return (
    <div ref={root} aria-hidden="true" className="pointer-events-none absolute inset-0 z-0">
      <div ref={layer} className="absolute inset-0">
        {/* erro ou perda de contexto: remonta; desiste (só o gradiente) se falhar de novo */}
        <ResilientBoundary name="espaço" onGiveUp={handleFail}>
          {(onLost) =>
            near && tier !== "none" && (
              <SpaceScene
                progressRef={progress}
                pointerRef={pointer}
                warpRef={warp}
                active={active}
                light={env.coarse || tier === "low"}
                maxDpr={presetFor(tier).maxDpr}
                reducedMotion={env.reduced}
                onContextLost={onLost}
              />
            )
          }
        </ResilientBoundary>
        {/* legibilidade: degradê escuro sobre o lado do texto; bordas suaves */}
        <div className="absolute inset-0 bg-gradient-to-b from-background/45 via-background/35 to-background/70 md:bg-gradient-to-r md:from-background/80 md:via-background/60 md:via-45% md:to-transparent md:to-75%" />
        <div className="absolute inset-x-0 top-0 h-1/5 bg-gradient-to-b from-background to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-1/6 bg-gradient-to-t from-background to-transparent" />
      </div>
    </div>
  );
}

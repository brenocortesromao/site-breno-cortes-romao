"use client";

import dynamic from "next/dynamic";
import { Component, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import HeroVisual from "./HeroVisual";

gsap.registerPlugin(useGSAP, ScrollTrigger);

// Three.js só é baixado no cliente e depois que a página já está visível.
const HeroScene = dynamic(() => import("./HeroScene"), { ssr: false });

/** Se a criação do WebGL falhar em tempo de execução, cai no SVG em vez de quebrar a página. */
class SceneBoundary extends Component<
  { children: ReactNode; onError: () => void },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onError();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

function hasWebGL() {
  try {
    const canvas = document.createElement("canvas");
    const gl = (canvas.getContext("webgl2") ||
      canvas.getContext("webgl")) as WebGLRenderingContext | null;
    if (!gl) return false;
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return true;
  } catch {
    return false;
  }
}

type Env = { webgl: boolean; reduced: boolean; coarse: boolean };

export default function Hero() {
  const section = useRef<HTMLElement>(null);
  const visual = useRef<HTMLDivElement>(null);
  const text = useRef<HTMLDivElement>(null);
  /** Progresso 0→1 da transição para o manifesto; lido pela cena 3D a cada quadro. */
  const progress = useRef(0);

  const [env, setEnv] = useState<Env | null>(null);
  const [inView, setInView] = useState(true);
  const [sceneReady, setSceneReady] = useState(false);

  // Detecta capacidades do dispositivo (só existe no cliente).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- leitura única de APIs do navegador
    setEnv({
      webgl: hasWebGL(),
      reduced: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      coarse: window.matchMedia("(pointer: coarse)").matches,
    });
  }, []);

  // Pausa o render 3D quando a hero sai da tela.
  useEffect(() => {
    const el = section.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), {
      threshold: 0,
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const handleReady = useCallback(() => setSceneReady(true), []);
  const handleFail = useCallback(
    () => setEnv((e) => (e ? { ...e, webgl: false } : e)),
    [],
  );

  // Entrada da tipografia + transição para o manifesto (somente sem prefers-reduced-motion).
  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const intro = gsap.timeline({ defaults: { ease: "expo.out" } });
        intro
          .fromTo(
            "[data-reveal]",
            // `y: 0` explícito: o GSAP lê o translateY(120%) do CSS inicial como pixels
            // e, sem isso, deixaria esse resíduo e o título preso atrás da máscara.
            { yPercent: 120, y: 0 },
            { yPercent: 0, y: 0, duration: 1.5, stagger: 0.16 },
            0.15,
          )
          .fromTo(
            "[data-fade]",
            { autoAlpha: 0, y: 14 },
            { autoAlpha: 1, y: 0, duration: 1.1, stagger: 0.14, ease: "power3.out" },
            0.7,
          );

        // A hero fica fixa por 1 tela (pinSpacing: false) enquanto o manifesto sobe
        // por cima. Nesse trecho o título sai, a forma recua e escurece (na cena 3D,
        // via `progress`) e some no fim — quando o pin solta, nada "pula".
        const proxy = { v: 0 };
        gsap
          .timeline({
            defaults: { ease: "none" },
            scrollTrigger: {
              trigger: section.current,
              start: "top top",
              end: "+=100%",
              pin: true,
              pinSpacing: false,
              scrub: 1,
              anticipatePin: 1,
            },
          })
          .to(
            proxy,
            {
              v: 1,
              duration: 1,
              onUpdate: () => {
                progress.current = proxy.v;
              },
            },
            0,
          )
          // o título sai cedo (30% do trecho), antes da faixa de clientes e do manifesto passarem por cima
          .to(text.current, { yPercent: -14, autoAlpha: 0, duration: 0.3, ease: "power1.in" }, 0)
          .to(visual.current, { autoAlpha: 0, duration: 0.2 }, 0.8);
      });
    },
    { scope: section },
  );

  const showScene = env?.webgl === true;

  return (
    <section
      ref={section}
      className="relative flex min-h-svh flex-col justify-end overflow-hidden px-6 pb-12 pt-32 md:px-12 md:pb-16"
    >
      {/* Mesmo posicionamento do SVG original; o canvas é quadrado como o viewBox. */}
      <div className="pointer-events-none absolute left-1/2 top-[44%] aspect-square w-[135vw] max-w-[1000px] -translate-x-1/2 -translate-y-1/2 md:left-[62%] md:top-[46%] md:w-[min(78vh,62vw)] md:max-w-none">
        <div ref={visual} className="relative h-full w-full">
          {/* Poster SVG: aparece de imediato, serve de alternativa sem WebGL e some quando o 3D está pronto. */}
          <HeroVisual
            className={`absolute inset-0 h-full w-full transition-opacity duration-1000 motion-reduce:transition-none ${
              showScene && sceneReady ? "opacity-0" : "opacity-100"
            }`}
          />
          {showScene && (
            <div
              className={`absolute inset-0 transition-opacity duration-1000 motion-reduce:transition-none ${
                sceneReady ? "opacity-100" : "opacity-0"
              }`}
            >
              <SceneBoundary onError={handleFail}>
                <HeroScene
                  active={inView}
                  reducedMotion={env.reduced}
                  coarse={env.coarse}
                  progress={progress}
                  onReady={handleReady}
                />
              </SceneBoundary>
            </div>
          )}
        </div>
      </div>

      <div ref={text} className="relative z-10 mx-auto w-full max-w-[1600px]">
        <p
          data-fade
          className="mb-8 font-mono text-[11px] uppercase tracking-[0.28em] text-silver md:mb-10"
        >
          Diretor criativo — Branding / Estratégia / Digital
        </p>
        <h1 className="font-display text-[clamp(2.4rem,13vw,4rem)] leading-[0.92] tracking-[-0.055em] md:text-[min(9.6vw,10.5rem)]">
          <span className="block overflow-hidden pb-[0.16em] -mb-[0.16em]">
            <span data-reveal className="block font-light">
              Marcas com
            </span>
          </span>
          <span className="block overflow-hidden pb-[0.16em] pr-[0.1em] -mb-[0.16em] md:pl-[14vw]">
            <span
              data-reveal
              className="block pb-[0.1em] -mb-[0.1em] font-semibold text-silver-gradient"
            >
              ponto de vista.
            </span>
          </span>
        </h1>

        <div
          data-fade
          className="mt-14 flex flex-col gap-8 border-t border-line pt-6 md:mt-20 md:flex-row md:items-end md:justify-between"
        >
          <p className="max-w-sm text-sm leading-relaxed text-silver">
            Construo identidades, estratégias e experiências digitais para
            empresas que preferem ser lembradas a ser comuns.
          </p>
          <a
            href="#projetos"
            className="font-mono text-[11px] uppercase tracking-[0.28em]"
          >
            Ver projetos <span aria-hidden="true">↓</span>
          </a>
        </div>
      </div>
    </section>
  );
}

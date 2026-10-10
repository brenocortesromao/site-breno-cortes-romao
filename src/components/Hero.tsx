"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import HeroVisual from "./HeroVisual";
import DraftBadge from "./theme/DraftBadge";
import { protectTerms } from "@/components/Term";
import ResilientBoundary from "@/components/ResilientBoundary";
import { webglSupport } from "@/lib/webgl";
import { useNearViewport } from "@/lib/useNearViewport";

gsap.registerPlugin(useGSAP, ScrollTrigger);

// Three.js só é baixado no cliente e depois que a página já está visível.
const HeroScene = dynamic(() => import("./HeroScene"), { ssr: false });

type Env = { webgl: boolean; reduced: boolean; coarse: boolean };

export type HeroCopy = {
  /** Frase grande à esquerda da bola (acima dela no mobile). */
  left: string;
  /** Frase grande à direita da bola (abaixo dela no mobile). */
  right: string;
  /** Texto de apoio curto, canto inferior esquerdo. */
  support: string;
  /** Rótulo pequeno acima do texto de apoio ("Nome — Função"). */
  label: string;
  /** Indicador de scroll, canto inferior direito. */
  scrollHint: string;
  /** Rótulo do selo de conteúdo provisório (vazio = sem selo). */
  draft: string;
};

/**
 * Hero: bola de metal líquido grande no centro, uma frase de cada lado (com
 * respiro: a bola nunca cobre as palavras) e texto de apoio no canto inferior
 * esquerdo. No mobile: frase, bola, frase, apoio. O quadrado `anchor` define
 * onde e de que tamanho a bola aparece; a cena 3D se enquadra nele.
 */
export default function Hero({ copy }: { copy: HeroCopy }) {
  const section = useRef<HTMLElement>(null);
  const visual = useRef<HTMLDivElement>(null);
  const anchor = useRef<HTMLDivElement>(null);
  /** Progresso 0→1 da transição para o manifesto; lido pela cena 3D a cada quadro. */
  const progress = useRef(0);

  const [env, setEnv] = useState<Env | null>(null);
  const [inView, setInView] = useState(true);
  const [sceneReady, setSceneReady] = useState(false);
  /** A cena 3D só existe com a hero a até ~1 tela; longe, é desmontada (libera o contexto). */
  const near = useNearViewport(section);

  // Detecta capacidades do dispositivo (só existe no cliente).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- leitura única de APIs do navegador
    setEnv({
      webgl: webglSupport().webgl,
      reduced: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      coarse: window.matchMedia("(pointer: coarse)").matches,
    });
  }, []);

  // Cena desmontada: volta ao poster até a próxima ficar pronta.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reflete a desmontagem da cena
    if (!near) setSceneReady(false);
  }, [near]);

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
        gsap
          .timeline({ defaults: { ease: "expo.out" } })
          .fromTo(
            "[data-reveal]",
            // `y: 0` explícito: o GSAP lê o translateY(120%) do CSS inicial como pixels
            // e, sem isso, deixaria esse resíduo e o título preso atrás da máscara.
            { yPercent: 120, y: 0 },
            { yPercent: 0, y: 0, duration: 1.5, stagger: 0.18 },
            0.2,
          )
          .fromTo(
            "[data-fade]",
            { autoAlpha: 0, y: 14 },
            { autoAlpha: 1, y: 0, duration: 1.1, ease: "power3.out" },
            0.9,
          );

        // A hero fica fixa por 1 tela (pinSpacing: false) enquanto o manifesto sobe
        // por cima. Nesse trecho os textos saem, a bola recua e escurece (na cena 3D,
        // via `progress`) e some no fim — quando o pin solta, nada "pula".
        // Os textos saem individualmente: a âncora da bola não pode se mover.
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
          .to("[data-hero-text]", { yPercent: -14, autoAlpha: 0, duration: 0.3, ease: "power1.in" }, 0)
          // some no fim (3D e, sem WebGL, o poster na âncora)
          .to([visual.current, anchor.current].filter(Boolean), { autoAlpha: 0, duration: 0.2 }, 0.8);
      });
    },
    { scope: section },
  );

  const showScene = env?.webgl === true;
  const mountScene = showScene && near;
  const phrase =
    "font-display text-[clamp(2.4rem,11vw,4rem)] leading-[0.95] tracking-[-0.055em] md:text-[min(3.9vw,5rem)]";

  return (
    <section
      ref={section}
      data-theme="dark"
      aria-labelledby="hero-title"
      className="relative flex min-h-svh flex-col justify-center overflow-hidden px-6 pb-10 pt-24 md:px-12 md:pb-14 md:pt-28"
    >
      {/* Título semântico completo (leitores de tela/SEO); as frases visuais ao redor da bola são decorativas. */}
      <h1 id="hero-title" className="sr-only">{`${copy.left} ${copy.right}`}</h1>

      <div className="relative z-30 mx-auto flex w-full max-w-[1600px] flex-col items-center gap-6 md:grid md:grid-cols-[1fr_auto_1fr] md:items-center md:gap-[3.5vw]">
        {/* Frase à esquerda (acima no mobile) */}
        <div aria-hidden="true" data-hero-text className={`${phrase} w-full md:text-right`}>
          <span className="block overflow-hidden pb-[0.16em] -mb-[0.16em]">
            <span data-reveal className="block font-light">
              {copy.left}
            </span>
          </span>
        </div>

        {/* Âncora da bola: o 3D se enquadra neste quadrado; o poster SVG vive aqui. */}
        <div
          ref={anchor}
          aria-hidden="true"
          className="relative z-10 aspect-square w-[min(85vw,46svh)] shrink-0 md:w-auto md:h-[60svh]"
        >
          <HeroVisual
            className={`absolute inset-0 h-full w-full transition-opacity duration-1000 motion-reduce:transition-none ${
              showScene && sceneReady ? "opacity-0" : "opacity-100"
            }`}
          />
        </div>

        {/* Frase à direita (abaixo no mobile) */}
        <div aria-hidden="true" data-hero-text className={`${phrase} w-full`}>
          <span className="block overflow-hidden pb-[0.16em] pr-[0.1em] -mb-[0.16em]">
            <span
              data-reveal
              className="block pb-[0.1em] -mb-[0.1em] font-semibold text-silver-gradient"
            >
              {copy.right}
            </span>
          </span>
        </div>
      </div>

      {/* Texto de apoio: canto inferior esquerdo (no fim do fluxo no mobile) */}
      <div
        data-hero-text
        className="relative z-30 mx-auto mt-10 w-full max-w-[1600px] md:absolute md:inset-x-12 md:bottom-14 md:mt-0"
      >
        <div data-fade className="max-w-sm">
          {copy.draft && <DraftBadge label={copy.draft} className="mb-4" />}
          <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.22em] text-silver">
            {protectTerms(copy.label)}
          </p>
          <p className="text-sm leading-relaxed text-silver md:text-[15px]">{copy.support}</p>
        </div>
      </div>

      {/* Indicador de scroll */}
      <a
        href="#manifesto"
        data-hero-text
        className="absolute bottom-10 right-6 z-30 hidden items-center gap-3 font-mono text-[10px] uppercase tracking-[0.24em] text-silver transition-colors hover:text-foreground md:bottom-14 md:right-12 md:flex"
      >
        <span data-fade>{copy.scrollHint}</span>
        <span aria-hidden="true" data-fade className="block h-8 w-px origin-top animate-pulse bg-silver" />
      </a>

      {/* Camada 3D em tela cheia, ABAIXO dos textos (z-20 < z-30): o espaço entre as
          colunas mantém a bola afastada, e se ela se aproximar passa por trás das palavras. */}
      {showScene && (
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-20">
          <div
            ref={visual}
            className={`h-full w-full transition-opacity duration-1000 motion-reduce:transition-none ${
              sceneReady ? "opacity-100" : "opacity-0"
            }`}
          >
            {/* erro ou perda de contexto: remonta; só cai no poster se falhar de novo */}
            <ResilientBoundary onGiveUp={handleFail}>
              {(onLost) =>
                mountScene && (
                  <HeroScene
                    active={inView}
                    reducedMotion={env.reduced}
                    coarse={env.coarse}
                    progress={progress}
                    anchorRef={anchor}
                    onReady={handleReady}
                    onContextLost={onLost}
                  />
                )
              }
            </ResilientBoundary>
          </div>
        </div>
      )}
    </section>
  );
}


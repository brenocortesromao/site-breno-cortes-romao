"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from "react";
import { scenePoster } from "@/lib/posters";

/**
 * Troca invisível entre o pôster e a cena 3D ao vivo, só no celular (no
 * desktop, `SceneSwap` devolve a cena como antes, sem nada em volta).
 * - Antes de a cena carregar: o pôster (lib/posters: o 1º quadro da cena).
 * - A cena monta escondida e só aparece depois de 2 quadros JÁ desenhados
 *   (nada de quadro preto ou incompleto): fade de FADE_MS, ease-in-out.
 * - Perdeu a vaga de contexto WebGL (lib/quality): o último quadro é copiado
 *   para um canvas 2D ANTES de a cena desmontar e fica no lugar (a imagem não
 *   muda); quando a seção sai da tela, ele dá lugar ao pôster com o mesmo fade.
 * - Os fades cruzam as camadas com `mix-blend-mode: plus-lighter` num grupo
 *   isolado: soma exata das duas imagens (sem escurecer no meio, mesmo com
 *   transparência), ligado só durante o fade.
 */
export const FADE_MS = 1200;
const EASE = "cubic-bezier(0.65, 0, 0.35, 1)";

/** O que a cena recebe do SceneSwap (só no celular). */
export type SceneLink = {
  /** 2 quadros desenhados: começa o fade. */
  onDrawn: () => void;
  /** A cena desmontou (erro, perda de contexto, nível "none"). */
  onGone: () => void;
  /** A cena registra como copiar o último quadro para um canvas 2D (null ao sair). */
  setSnapshot: (copy: ((into: HTMLCanvasElement) => boolean) | null) => void;
};

export type Swap = ReturnType<typeof useSceneSwap>;

/**
 * Estado da troca. `anchor`: o elemento da cena (para saber se a seção está
 * acima ou abaixo da tela e quando ela sai). `enabled`: celular sem
 * prefers-reduced-motion (senão, nada muda).
 */
export function useSceneSwap(anchor: RefObject<Element | null>, enabled: boolean) {
  const [drawn, setDrawn] = useState(false);
  const [snap, setSnap] = useState(false);
  const [blend, setBlend] = useState(false);
  /** Pôster do fim (seção acima da tela) ou do início. */
  const [end, setEnd] = useState(false);
  const snapCanvas = useRef<HTMLCanvasElement | null>(null);
  const snapshot = useRef<((into: HTMLCanvasElement) => boolean) | null>(null);
  /** Callback ref do canvas da cópia (o objeto devolvido não expõe refs). */
  const attachCopy = useCallback((el: HTMLCanvasElement | null) => {
    snapCanvas.current = el;
  }, []);
  const drawnNow = useRef(false);
  const snapNow = useRef(false);
  const blendTimer = useRef(0);

  const crossfade = useCallback(() => {
    setBlend(true);
    window.clearTimeout(blendTimer.current);
    blendTimer.current = window.setTimeout(() => setBlend(false), FADE_MS + 150);
  }, []);
  useEffect(() => () => window.clearTimeout(blendTimer.current), []);

  const link = useMemo<SceneLink | undefined>(
    () =>
      enabled
        ? {
            onDrawn: () => {
              drawnNow.current = true;
              snapNow.current = false;
              crossfade();
              setDrawn(true);
              setSnap(false);
            },
            onGone: () => {
              if (!drawnNow.current) return;
              drawnNow.current = false;
              if (!snapNow.current) crossfade(); // sem cópia: volta ao pôster com fade
              setDrawn(false);
            },
            setSnapshot: (copy) => {
              snapshot.current = copy;
            },
          }
        : undefined,
    [enabled, crossfade],
  );

  /** Chamado pelo orçamento de contextos logo antes de a cena perder a vaga. */
  const release = useCallback(() => {
    const c = snapCanvas.current;
    if (!enabled || !drawnNow.current || !c || !snapshot.current) return;
    try {
      if (!snapshot.current(c)) return;
    } catch {
      return;
    }
    snapNow.current = true;
    setSnap(true);
  }, [enabled]);

  // posição da seção: escolhe o pôster (início/fim) e, com a cópia do último
  // quadro na tela, troca pelo pôster assim que a seção sai da tela
  useEffect(() => {
    const el = anchor.current;
    if (!enabled || !el) return;
    let first = true;
    const io = new IntersectionObserver(([e]) => {
      const r = e.boundingClientRect;
      if (!e.isIntersecting) {
        setEnd(r.bottom <= 0);
        if (snapNow.current) {
          snapNow.current = false;
          crossfade();
          setSnap(false);
        }
      } else if (first) setEnd(r.top < -r.height / 2); // abriu no meio da seção
      first = false;
    });
    io.observe(el);
    return () => io.disconnect();
  }, [anchor, enabled, crossfade]);

  // a cópia ocupa memória: some depois do fade
  useEffect(() => {
    if (snap) return;
    const id = window.setTimeout(() => {
      const c = snapCanvas.current;
      if (c && !snapNow.current) c.width = c.height = 0;
    }, FADE_MS + 200);
    return () => window.clearTimeout(id);
  }, [snap]);

  return { enabled, link, release, drawn, snap, blend, end, attachCopy };
}

/**
 * Camadas da troca. `poster(end)`: o pôster (imagem ou máscara), que preenche
 * a caixa como o canvas da cena. Sem `swap.enabled` (desktop, reduced motion),
 * devolve só a cena.
 */
export default function SceneSwap({
  swap,
  poster,
  children,
}: {
  swap: Swap;
  poster: (end: boolean) => ReactNode;
  children: ReactNode;
}) {
  const { enabled, drawn, snap, blend, end, attachCopy } = swap;
  if (!enabled) return <>{children}</>;
  const fade = `opacity ${FADE_MS}ms ${EASE}`;
  const mixBlendMode = blend ? ("plus-lighter" as const) : undefined;
  return (
    <div className="absolute inset-0 isolate">
      <div className="absolute inset-0" style={{ opacity: !drawn && !snap ? 1 : 0, transition: fade, mixBlendMode }}>
        {poster(end)}
      </div>
      <canvas
        ref={attachCopy}
        width={0}
        height={0}
        className="absolute inset-0 h-full w-full"
        style={{ opacity: snap ? 1 : 0, transition: snap ? "none" : fade, mixBlendMode }}
      />
      <div className="absolute inset-0" style={{ opacity: drawn ? 1 : 0, transition: drawn ? fade : "none", mixBlendMode }}>
        {children}
      </div>
    </div>
  );
}

/** Pôster de imagem de uma cena 3D (lib/posters): preenche a caixa como o canvas. */
export function Poster({ name, end }: { name: string; end: boolean }) {
  const p = scenePoster(name);
  if (!p) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- já no tamanho do canvas; sem otimizador
    <img
      src={end ? p.fim : p.inicio}
      alt=""
      aria-hidden="true"
      decoding="async"
      draggable={false}
      className="absolute inset-0 h-full w-full object-cover"
    />
  );
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { posterCapture, publishPoster } from "@/lib/posters";
import type { SceneLink } from "./SceneSwap";

/**
 * Estado de quadros de uma cena R3F de fundo (celular, ver SceneSwap):
 * - `prime`: a cena ainda não desenhou os 2 primeiros quadros; o `frameloop`
 *   fica "always" até lá, mesmo fora da tela ou com a página rolando (a cena
 *   fica pronta escondida, antes de entrar na tela);
 * - `captured`: modo de captura dos pôsteres (lib/posters): depois do 1º
 *   quadro a cena para;
 * - `preserve`: `preserveDrawingBuffer` só no modo de captura.
 * Sem `link` (desktop, reduced motion): nada muda.
 */
export function useSceneFrames(link?: SceneLink) {
  const [primed, setPrimed] = useState(false);
  const [captured, setCaptured] = useState(false);
  const onPrimed = useCallback(() => setPrimed(true), []);
  const onCaptured = useCallback(() => setCaptured(true), []);
  return {
    prime: !!link && !primed,
    captured,
    preserve: !!posterCapture(),
    onPrimed,
    onCaptured,
  };
}

/**
 * Dentro do <Canvas>: conta os quadros (avisa o SceneSwap depois de 2
 * desenhados), registra a cópia do último quadro e, no modo de captura,
 * publica o 1º quadro. O aviso dos 2 quadros vai num setTimeout: roda depois
 * do render do quadro (que acontece logo após os useFrame, na mesma tarefa).
 */
export function FrameSignals({
  link,
  onPrimed,
  onCaptured,
}: {
  link?: SceneLink;
  onPrimed: () => void;
  onCaptured: () => void;
}) {
  const get = useThree((s) => s.get);
  const frames = useRef(0);

  useEffect(() => {
    if (!link) return;
    link.setSnapshot((into) => {
      if (frames.current < 2) return false;
      const { gl, scene, camera } = get();
      // redesenha o estado atual (o buffer do último quadro já foi apresentado)
      // e copia na mesma tarefa
      gl.render(scene, camera);
      const src = gl.domElement;
      into.width = src.width;
      into.height = src.height;
      const ctx = into.getContext("2d");
      if (!ctx) return false;
      ctx.drawImage(src, 0, 0);
      return true;
    });
    return () => {
      link.setSnapshot(null);
      link.onGone();
    };
  }, [link, get]);

  useFrame(() => {
    const n = ++frames.current;
    // captura: antes de desenhar o 2º quadro, o buffer (preservado) ainda tem o 1º
    if (n === 2 && posterCapture()) {
      publishPoster(get().gl.domElement);
      onCaptured();
    }
    if (n === 2 && link)
      setTimeout(() => {
        onPrimed();
        link.onDrawn();
      }, 0);
  });
  return null;
}

"use client";

import { useEffect, useState, type RefObject } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import type { PerspectiveCamera } from "three";
import ContextLossWatcher from "@/components/ContextLossWatcher";
import { ForestWorld } from "./world";

/**
 * Floresta do fundo do Sobre (ver forest/world.ts para a câmera, as árvores e
 * o urso, forest/shaders.ts para céu, névoa e materiais). Um canvas: quadro de
 * fundo analítico + chão + abetos instanciados (2 níveis de LOD) + urso +
 * neve. Sem modelos baixados: tudo é gerado em código.
 */
function Forest({
  progressRef,
  pointerRef,
  light,
  still,
}: {
  progressRef: RefObject<number>;
  pointerRef: RefObject<{ x: number; y: number }>;
  light: boolean;
  still: boolean;
}) {
  const [world] = useState(() => new ForestWorld(light));
  useEffect(() => () => world.dispose(), [world]);

  useFrame(({ gl, camera }, delta) => {
    world.update(gl, camera as PerspectiveCamera, progressRef.current ?? 0, pointerRef.current ?? { x: 0, y: 0 }, Math.min(delta, 0.05), still);
  });

  return <primitive object={world.root} dispose={null} />;
}

export default function ForestScene({
  progressRef,
  pointerRef,
  active,
  light,
  maxDpr,
  reducedMotion,
  onContextLost,
}: {
  progressRef: RefObject<number>;
  pointerRef: RefObject<{ x: number; y: number }>;
  active: boolean;
  light: boolean;
  maxDpr: number;
  reducedMotion: boolean;
  /** Perda do contexto WebGL (o pai remonta a cena). */
  onContextLost?: () => void;
}) {
  return (
    <Canvas
      aria-hidden="true"
      className="!pointer-events-none"
      frameloop={reducedMotion ? "demand" : active ? "always" : "never"}
      // fundo suave a ~38% de opacidade: resolução 1x basta
      dpr={Math.min(maxDpr, light ? 0.6 : 1)}
      camera={{ fov: 42, near: 0.1, far: 400, position: [0, 1.75, 2] }}
      gl={{ antialias: !light, alpha: false, powerPreference: "default" }}
    >
      <ContextLossWatcher onLost={onContextLost} />
      <Forest progressRef={progressRef} pointerRef={pointerRef} light={light} still={reducedMotion} />
    </Canvas>
  );
}

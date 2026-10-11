"use client";

import { useEffect, useState, type RefObject } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import type { PerspectiveCamera } from "three";
import ContextLossWatcher from "@/components/ContextLossWatcher";
import { loadOceanModels } from "./models";
import { OceanWorld } from "./world";

/**
 * Oceano do fundo de "E a inteligência artificial?" (ver ocean/world.ts para a
 * câmera e os elementos, ocean/shaders.ts para a água). Um canvas, um quadro de
 * fundo analítico + poucas malhas (recife instanciado, cardume instanciado,
 * 1 ou 2 tubarões, partículas).
 */
function Ocean({
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
  const [world] = useState(() => new OceanWorld(light));
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => () => world.dispose(), [world]);

  // tubarão e cardume chegam depois (glb + Draco num worker); até lá, só água e recife
  useEffect(() => {
    let alive = true;
    loadOceanModels()
      .then((m) => {
        if (!alive) return;
        world.setModels(m);
        invalidate(); // quadro parado (reduced motion): redesenha com eles
      })
      .catch((e) => console.warn("[oceano] modelos não carregaram:", e));
    return () => {
      alive = false;
    };
  }, [world, invalidate]);

  useFrame(({ gl, camera }, delta) => {
    world.update(gl, camera as PerspectiveCamera, progressRef.current ?? 0, pointerRef.current ?? { x: 0, y: 0 }, Math.min(delta, 0.05), still);
  });

  return <primitive object={world.root} dispose={null} />;
}

export default function OceanScene({
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
      // o fundo é suave e fica a ~40% de opacidade: resolução 1x basta
      dpr={Math.min(maxDpr, light ? 0.6 : 1)}
      camera={{ fov: 50, near: 0.1, far: 220, position: [0, 8, 14] }}
      gl={{ antialias: !light, alpha: false, powerPreference: "default" }}
    >
      <ContextLossWatcher onLost={onContextLost} />
      <Ocean progressRef={progressRef} pointerRef={pointerRef} light={light} still={reducedMotion} />
    </Canvas>
  );
}

"use client";

import { useCallback, useEffect, useState, type RefObject } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import type { PerspectiveCamera } from "three";
import ContextLossWatcher from "@/components/ContextLossWatcher";
import { SpaceWorld } from "./world";

/** Espaço do Contato (ver space/world.ts). Um canvas transparente: o gradiente da seção fica por trás. */
function Space({
  progressRef,
  pointerRef,
  warpRef,
  light,
  still,
  onCompiled,
}: {
  progressRef: RefObject<number>;
  pointerRef: RefObject<{ x: number; y: number }>;
  warpRef: RefObject<number>;
  light: boolean;
  still: boolean;
  onCompiled: () => void;
}) {
  const [world] = useState(() => new SpaceWorld(light));
  const get = useThree((s) => s.get);
  useEffect(() => {
    const { gl, scene, camera } = get();
    world.setEnvironment(gl);
    let alive = true;
    // shaders compilados em paralelo antes do 1º quadro (sem travar a entrada da seção)
    gl.compileAsync(scene, camera)
      .catch(() => undefined)
      .then(() => {
        if (!alive) return;
        onCompiled();
        get().invalidate(); // modo "demand" (reduced motion): primeiro quadro
      });
    return () => {
      alive = false;
      world.dispose();
    };
  }, [world, get, onCompiled]);

  useFrame(({ camera, viewport }, delta) => {
    world.update(
      camera as PerspectiveCamera,
      viewport.dpr,
      progressRef.current ?? 0,
      pointerRef.current ?? { x: 0, y: 0 },
      still ? 0 : (warpRef.current ?? 0),
      Math.min(delta, 0.05),
      still,
    );
  });

  return <primitive object={world.root} dispose={null} />;
}

export default function SpaceScene({
  progressRef,
  pointerRef,
  warpRef,
  active,
  light,
  maxDpr,
  reducedMotion,
  onContextLost,
}: {
  progressRef: RefObject<number>;
  pointerRef: RefObject<{ x: number; y: number }>;
  warpRef: RefObject<number>;
  active: boolean;
  light: boolean;
  maxDpr: number;
  reducedMotion: boolean;
  /** Perda do contexto WebGL (o pai remonta a cena). */
  onContextLost?: () => void;
}) {
  /** Shaders prontos (compileAsync): antes disso, nenhum quadro é desenhado. */
  const [compiled, setCompiled] = useState(false);
  const handleCompiled = useCallback(() => setCompiled(true), []);

  return (
    <Canvas
      aria-hidden="true"
      className="!pointer-events-none"
      frameloop={!compiled ? "never" : reducedMotion ? "demand" : active ? "always" : "never"}
      dpr={[1, Math.min(maxDpr, 1.5)]}
      camera={{ fov: 45, near: 0.1, far: 200, position: [0, 0, 16] }}
      gl={{ antialias: !light, alpha: true, powerPreference: "default" }}
    >
      <ContextLossWatcher onLost={onContextLost} />
      <Space
        progressRef={progressRef}
        pointerRef={pointerRef}
        warpRef={warpRef}
        light={light}
        still={reducedMotion}
        onCompiled={handleCompiled}
      />
    </Canvas>
  );
}

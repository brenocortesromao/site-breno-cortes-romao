"use client";

import { useCallback, useEffect, useState, type RefObject } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import type { PerspectiveCamera } from "three";
import ContextLossWatcher from "@/components/ContextLossWatcher";
import { warmup } from "@/lib/warmup";
import { SpaceWorld } from "./world";
import { motionScale, useMotionRunning } from "@/lib/mobile";
import { FrameSignals, useSceneFrames } from "../frameSignals";
import type { SceneLink } from "../SceneSwap";

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
    // shaders compilados e texturas na GPU antes do 1º quadro, sem a thread
    // principal esperar o compilador (ver lib/warmup)
    warmup(gl, scene, camera).then(() => {
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
      // celular: desacelera até parar quando a página rola (lib/mobile)
      Math.min(delta, 0.05) * motionScale(),
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
  link,
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
  /** Celular: troca pôster ↔ cena (SceneSwap). */
  link?: SceneLink;
}) {
  /** Shaders prontos (compileAsync): antes disso, nenhum quadro é desenhado. */
  const [compiled, setCompiled] = useState(false);
  const handleCompiled = useCallback(() => setCompiled(true), []);

  /** Celular: para (depois de desacelerar) enquanto o dedo rola a página (lib/mobile). */
  const running = useMotionRunning();
  const frames = useSceneFrames(link);
  return (
    <Canvas
      aria-hidden="true"
      className="!pointer-events-none"
      frameloop={
        !compiled || frames.captured ? "never" : reducedMotion ? "demand" : (active && running) || frames.prime ? "always" : "never"
      }
      dpr={[1, Math.min(maxDpr, 1.5)]}
      camera={{ fov: 45, near: 0.1, far: 200, position: [0, 0, 16] }}
      gl={{ antialias: !light, alpha: true, powerPreference: "default", preserveDrawingBuffer: frames.preserve }}
    >
      <ContextLossWatcher onLost={onContextLost} />
      <FrameSignals link={link} onPrimed={frames.onPrimed} onCaptured={frames.onCaptured} />
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

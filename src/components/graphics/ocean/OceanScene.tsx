"use client";

import { useCallback, useEffect, useState, type RefObject } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import type { Object3D, PerspectiveCamera } from "three";
import ContextLossWatcher from "@/components/ContextLossWatcher";
import { warmup } from "@/lib/warmup";
import { loadOceanModels } from "./models";
import { loadOceanAnimals } from "./animals";
import { OceanWorld } from "./world";
import { useTouchScrolling } from "@/lib/mobile";

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
  mobile,
  few,
  still,
  onReady,
}: {
  progressRef: RefObject<number>;
  pointerRef: RefObject<{ x: number; y: number }>;
  light: boolean;
  mobile: boolean;
  few: boolean;
  still: boolean;
  /** Shaders compilados e texturas na GPU: o canvas pode começar a desenhar. */
  onReady: () => void;
}) {
  const [world] = useState(() => new OceanWorld(light, mobile));
  const get = useThree((s) => s.get);
  useEffect(() => () => world.dispose(), [world]);

  // água e recife: tudo compilado (inclusive o que só aparece no mergulho)
  // antes do 1º quadro
  useEffect(() => {
    let alive = true;
    const { gl, scene, camera } = get();
    warmup(gl, scene, camera).then(() => {
      if (!alive) return;
      onReady();
      get().invalidate();
    });
    return () => {
      alive = false;
    };
  }, [get, onReady]);

  // cardume, tubarões e tartaruga (pré-carregados quando o "Sobre" apareceu):
  // entram escondidos, ficam visíveis só com os shaders e as texturas prontos
  useEffect(() => {
    let alive = true;
    const show = async (obj: Object3D | null) => {
      if (!obj || !alive) return;
      obj.visible = false;
      const { gl, scene, camera } = get();
      await warmup(gl, obj, camera, scene);
      if (!alive) return;
      obj.visible = true;
      get().invalidate(); // quadro parado (reduced motion): redesenha com eles
    };
    loadOceanModels()
      .then((m) => (alive ? show(world.setModels(m)) : undefined))
      .catch((e) => console.warn("[oceano] modelos não carregaram:", e));
    loadOceanAnimals()
      .then((src) => (alive ? show(world.setAnimals(src, few)) : undefined))
      .catch((e) => console.warn("[oceano] animais não carregaram:", e));
    return () => {
      alive = false;
    };
  }, [world, get, few]);

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
  mobile = false,
  few = false,
  maxDpr,
  reducedMotion,
  onContextLost,
}: {
  progressRef: RefObject<number>;
  pointerRef: RefObject<{ x: number; y: number }>;
  active: boolean;
  light: boolean;
  /** Celular (até 767px): enquadramento em pé, mais claro e com menos névoa (ver OceanWorld). */
  mobile?: boolean;
  /** Nível "low": 1 tubarão e sem "circling". */
  few?: boolean;
  maxDpr: number;
  reducedMotion: boolean;
  /** Perda do contexto WebGL (o pai remonta a cena). */
  onContextLost?: () => void;
}) {
  const [ready, setReady] = useState(false);
  const handleReady = useCallback(() => setReady(true), []);
  /** Celular: congela o quadro enquanto o dedo rola a página (lib/mobile). */
  const scrolling = useTouchScrolling();
  return (
    <Canvas
      aria-hidden="true"
      className="!pointer-events-none"
      // nenhum quadro antes do aquecimento (ver lib/warmup); o canvas fica vazio até lá
      frameloop={!ready ? "never" : reducedMotion ? "demand" : active && !scrolling ? "always" : "never"}
      // o fundo é suave e fica a ~40% de opacidade: resolução 1x basta
      dpr={Math.min(maxDpr, light ? 0.6 : 1)}
      camera={{ fov: 50, near: 0.1, far: 220, position: [0, 8, 14] }}
      gl={{ antialias: !light, alpha: false, powerPreference: "default" }}
    >
      <ContextLossWatcher onLost={onContextLost} />
      <Ocean progressRef={progressRef} pointerRef={pointerRef} light={light} mobile={mobile} few={few} still={reducedMotion} onReady={handleReady} />
    </Canvas>
  );
}

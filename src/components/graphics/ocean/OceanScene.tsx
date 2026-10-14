"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import type { Object3D, PerspectiveCamera } from "three";
import ContextLossWatcher from "@/components/ContextLossWatcher";
import { warmup } from "@/lib/warmup";
import { loadOceanModels } from "./models";
import { loadOceanAnimals } from "./animals";
import { OceanWorld } from "./world";
import { motionScale, useMotionRunning } from "@/lib/mobile";
import { FrameSignals, useSceneFrames } from "../frameSignals";
import type { SceneLink } from "../SceneSwap";

/** Celular: espera máxima pelos animais antes do 1º quadro (depois, desenha sem eles). */
const WAIT_ALL_MS = 8000;

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
  waitAll,
  onReady,
}: {
  progressRef: RefObject<number>;
  pointerRef: RefObject<{ x: number; y: number }>;
  light: boolean;
  mobile: boolean;
  few: boolean;
  still: boolean;
  /**
   * Celular (troca pelo pôster): o 1º quadro só sai com cardume, tubarões e
   * tartaruga já na cena (é o quadro do pôster; nada "entra" depois).
   */
  waitAll: boolean;
  /** Shaders compilados e texturas na GPU: o canvas pode começar a desenhar. */
  onReady: () => void;
}) {
  const [world] = useState(() => new OceanWorld(light, mobile));
  const get = useThree((s) => s.get);
  useEffect(() => () => world.dispose(), [world]);
  /** Partes prontas (água/recife, cardume, animais); avisa `onReady` uma vez. */
  const parts = useRef({ base: false, models: !waitAll, animals: !waitAll, sent: false });
  const check = useCallback(() => {
    const p = parts.current;
    if (p.sent || !p.base || !p.models || !p.animals) return;
    p.sent = true;
    onReady();
    get().invalidate();
  }, [onReady, get]);
  useEffect(() => {
    if (!waitAll) return;
    const id = window.setTimeout(() => {
      parts.current.models = parts.current.animals = true;
      check();
    }, WAIT_ALL_MS);
    return () => window.clearTimeout(id);
  }, [waitAll, check]);

  // água e recife: tudo compilado (inclusive o que só aparece no mergulho)
  // antes do 1º quadro
  useEffect(() => {
    let alive = true;
    const { gl, scene, camera } = get();
    warmup(gl, scene, camera).then(() => {
      if (!alive) return;
      parts.current.base = true;
      check();
    });
    return () => {
      alive = false;
    };
  }, [get, check]);

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
    const done = (part: "models" | "animals") => () => {
      if (!alive) return;
      parts.current[part] = true;
      check();
    };
    loadOceanModels()
      .then((m) => (alive ? show(world.setModels(m)) : undefined))
      .catch((e) => console.warn("[oceano] modelos não carregaram:", e))
      .finally(done("models"));
    loadOceanAnimals()
      .then((src) => (alive ? show(world.setAnimals(src, few)) : undefined))
      .catch((e) => console.warn("[oceano] animais não carregaram:", e))
      .finally(done("animals"));
    return () => {
      alive = false;
    };
  }, [world, get, few, check]);

  useFrame(({ gl, camera }, delta) => {
    // celular: desacelera até parar quando a página rola (lib/mobile)
    world.update(gl, camera as PerspectiveCamera, progressRef.current ?? 0, pointerRef.current ?? { x: 0, y: 0 }, Math.min(delta, 0.05) * motionScale(), still);
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
  link,
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
  /** Celular: troca pôster ↔ cena (SceneSwap). */
  link?: SceneLink;
}) {
  const [ready, setReady] = useState(false);
  const handleReady = useCallback(() => setReady(true), []);
  /** Celular: para (depois de desacelerar) enquanto o dedo rola a página (lib/mobile). */
  const running = useMotionRunning();
  const frames = useSceneFrames(link);
  return (
    <Canvas
      aria-hidden="true"
      className="!pointer-events-none"
      // nenhum quadro antes do aquecimento (ver lib/warmup); o canvas fica vazio até lá
      frameloop={
        !ready || frames.captured ? "never" : reducedMotion ? "demand" : (active && running) || frames.prime ? "always" : "never"
      }
      // o fundo é suave e fica a ~40% de opacidade: resolução 1x basta
      dpr={Math.min(maxDpr, light ? 0.6 : 1)}
      camera={{ fov: 50, near: 0.1, far: 220, position: [0, 8, 14] }}
      gl={{ antialias: !light, alpha: false, powerPreference: "default", preserveDrawingBuffer: frames.preserve }}
    >
      <ContextLossWatcher onLost={onContextLost} />
      <FrameSignals link={link} onPrimed={frames.onPrimed} onCaptured={frames.onCaptured} />
      <Ocean
        progressRef={progressRef}
        pointerRef={pointerRef}
        light={light}
        mobile={mobile}
        few={few}
        still={reducedMotion}
        waitAll={!!link}
        onReady={handleReady}
      />
    </Canvas>
  );
}

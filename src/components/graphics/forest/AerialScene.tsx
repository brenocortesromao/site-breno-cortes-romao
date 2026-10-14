"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Group, Mesh, type PerspectiveCamera } from "three";
import ContextLossWatcher from "@/components/ContextLossWatcher";
import { warmup } from "@/lib/warmup";
import { AerialWorld } from "./aerial";
import { CloseDof } from "./dof";
import { motionScale, useMotionRunning } from "@/lib/mobile";
import { FrameSignals, useSceneFrames } from "../frameSignals";
import type { SceneLink } from "../SceneSwap";

/** Celular: espera máxima pelo urso antes do 1º quadro (depois, desenha sem ele). */
const WAIT_ALL_MS = 8000;

/** Descida aérea do Sobre (ver forest/aerial.ts). */
function Aerial({
  progressRef,
  pointerRef,
  bearSrc,
  light,
  still,
  waitAll,
  onCompiled,
}: {
  progressRef: RefObject<number>;
  pointerRef: RefObject<{ x: number; y: number }>;
  bearSrc?: string;
  light: boolean;
  still: boolean;
  /** Celular (troca pelo pôster): o 1º quadro só sai com o urso já na cena (é o quadro do pôster). */
  waitAll: boolean;
  onCompiled: () => void;
}) {
  const [world] = useState(() => new AerialWorld(light));
  // profundidade de campo do close (só desktop; no modo leve, só névoa)
  const [dof] = useState(() => (light ? null : new CloseDof()));
  useEffect(() => () => dof?.dispose(), [dof]);
  const get = useThree((s) => s.get);
  /** Partes prontas (mundo compilado, urso); avisa `onCompiled` uma vez. */
  const parts = useRef({ world: false, bear: !waitAll || !bearSrc, sent: false });
  useEffect(() => {
    const { gl, scene, camera } = get();
    world.attach(scene, gl);
    let alive = true;
    const check = () => {
      const p = parts.current;
      if (!alive || p.sent || !p.world || !p.bear) return;
      p.sent = true;
      onCompiled();
      get().invalidate();
    };
    const bearDone = () => {
      parts.current.bear = true;
      check();
    };
    const wait = waitAll ? window.setTimeout(bearDone, WAIT_ALL_MS) : 0;
    // mundo montado em pedaços (sem travar a rolagem) e shaders compilados em
    // paralelo, tudo antes do 1º quadro
    world
      .build()
      .then(() => (alive ? Promise.all([warmup(gl, scene, camera), dof?.warm(gl, camera)]) : undefined))
      .then(() => {
        if (!alive) return;
        parts.current.world = true;
        check();
      });
    // urso: só quando o modelo existe (os bytes já vieram na pré-carga). Entra
    // na cena só com os shaders (inclusive os da sombra) compilados e as
    // texturas na GPU: nada compila no quadro em que ele aparece
    if (bearSrc)
      world
        .loadBear(bearSrc)
        .then(async (bear) => {
          if (!bear || !alive) return;
          const shadows = new Group();
          bear.traverse((o) => {
            if (o instanceof Mesh && o.customDepthMaterial) shadows.add(new Mesh(o.geometry, o.customDepthMaterial));
          });
          await Promise.all([warmup(gl, bear, camera, scene), warmup(gl, shadows, camera, scene)]);
          if (!alive) return;
          world.addBear(bear);
          get().invalidate();
        })
        .catch((e) => console.warn("[urso] não carregou:", e))
        .finally(bearDone);
    return () => {
      alive = false;
      window.clearTimeout(wait);
      world.dispose();
    };
  }, [world, dof, get, onCompiled, bearSrc, waitAll]);

  // prioridade 1: este quadro renderiza a cena (e, no close, o desfoque do fundo)
  useFrame(({ camera, gl, scene, viewport }, delta) => {
    world.update(
      camera as PerspectiveCamera,
      gl,
      viewport.dpr,
      progressRef.current ?? 0,
      pointerRef.current ?? { x: 0, y: 0 },
      // celular: desacelera até parar quando a página rola (lib/mobile)
      Math.min(delta, 0.05) * motionScale(),
      still,
    );
    gl.render(scene, camera);
    if (dof && world.dof.amount > 0.01) dof.apply(gl, world.dof.amount, world.dof.focus);
  }, 1);

  return <primitive object={world.root} dispose={null} />;
}

export default function AerialScene({
  progressRef,
  pointerRef,
  bearSrc,
  active,
  light,
  maxDpr,
  reducedMotion,
  onContextLost,
  link,
}: {
  progressRef: RefObject<number>;
  pointerRef: RefObject<{ x: number; y: number }>;
  bearSrc?: string;
  active: boolean;
  light: boolean;
  maxDpr: number;
  reducedMotion: boolean;
  /** Perda do contexto WebGL (o pai remonta a cena). */
  onContextLost?: () => void;
  /** Celular: troca pôster ↔ cena (SceneSwap). */
  link?: SceneLink;
}) {
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
      dpr={[1, Math.min(maxDpr, light ? 1.5 : 1.5)]}
      camera={{ fov: 45, near: 0.5, far: 900, position: [0, 190, -150] }}
      gl={{ antialias: !light, alpha: false, powerPreference: "default", preserveDrawingBuffer: frames.preserve }}
    >
      <ContextLossWatcher onLost={onContextLost} />
      <FrameSignals link={link} onPrimed={frames.onPrimed} onCaptured={frames.onCaptured} />
      <Aerial
        progressRef={progressRef}
        pointerRef={pointerRef}
        bearSrc={bearSrc}
        light={light}
        still={reducedMotion}
        waitAll={!!link}
        onCompiled={handleCompiled}
      />
    </Canvas>
  );
}

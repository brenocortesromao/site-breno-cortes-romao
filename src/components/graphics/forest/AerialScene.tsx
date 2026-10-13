"use client";

import { useCallback, useEffect, useState, type RefObject } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Group, Mesh, type PerspectiveCamera } from "three";
import ContextLossWatcher from "@/components/ContextLossWatcher";
import { warmup } from "@/lib/warmup";
import { AerialWorld } from "./aerial";
import { CloseDof } from "./dof";

/** Descida aérea do Sobre (ver forest/aerial.ts). */
function Aerial({
  progressRef,
  pointerRef,
  bearSrc,
  light,
  still,
  onCompiled,
}: {
  progressRef: RefObject<number>;
  pointerRef: RefObject<{ x: number; y: number }>;
  bearSrc?: string;
  light: boolean;
  still: boolean;
  onCompiled: () => void;
}) {
  const [world] = useState(() => new AerialWorld(light));
  // profundidade de campo do close (só desktop; no modo leve, só névoa)
  const [dof] = useState(() => (light ? null : new CloseDof()));
  useEffect(() => () => dof?.dispose(), [dof]);
  const get = useThree((s) => s.get);
  useEffect(() => {
    const { gl, scene, camera } = get();
    world.attach(scene, gl);
    let alive = true;
    // mundo montado em pedaços (sem travar a rolagem) e shaders compilados em
    // paralelo, tudo antes do 1º quadro
    world
      .build()
      .then(() => (alive ? Promise.all([warmup(gl, scene, camera), dof?.warm(gl, camera)]) : undefined))
      .then(() => {
        if (!alive) return;
        onCompiled();
        get().invalidate();
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
        .catch((e) => console.warn("[urso] não carregou:", e));
    return () => {
      alive = false;
      world.dispose();
    };
  }, [world, dof, get, onCompiled, bearSrc]);

  // prioridade 1: este quadro renderiza a cena (e, no close, o desfoque do fundo)
  useFrame(({ camera, gl, scene, viewport }, delta) => {
    world.update(
      camera as PerspectiveCamera,
      gl,
      viewport.dpr,
      progressRef.current ?? 0,
      pointerRef.current ?? { x: 0, y: 0 },
      Math.min(delta, 0.05),
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
}) {
  const [compiled, setCompiled] = useState(false);
  const handleCompiled = useCallback(() => setCompiled(true), []);

  return (
    <Canvas
      aria-hidden="true"
      className="!pointer-events-none"
      frameloop={!compiled ? "never" : reducedMotion ? "demand" : active ? "always" : "never"}
      dpr={[1, Math.min(maxDpr, light ? 1.5 : 1.5)]}
      camera={{ fov: 45, near: 0.5, far: 900, position: [0, 190, -150] }}
      gl={{ antialias: !light, alpha: false, powerPreference: "default" }}
    >
      <ContextLossWatcher onLost={onContextLost} />
      <Aerial
        progressRef={progressRef}
        pointerRef={pointerRef}
        bearSrc={bearSrc}
        light={light}
        still={reducedMotion}
        onCompiled={handleCompiled}
      />
    </Canvas>
  );
}

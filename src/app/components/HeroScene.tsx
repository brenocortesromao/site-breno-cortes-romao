"use client";

import { useEffect, useMemo, useRef, type ReactNode, type RefObject } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  BackSide,
  BoxGeometry,
  Color,
  Group,
  Mesh,
  MeshBasicMaterial,
  PMREMGenerator,
  PlaneGeometry,
  Scene,
  Vector3,
  type MeshPhysicalMaterial,
  type WebGLRenderer,
} from "three";
import {
  createLiquidMetalMaterial,
  GRAPHITE,
  SILVER,
  type LiquidUniforms,
} from "./hero/liquidMetal";
import { createPlaceholderGeometry } from "./hero/shape";

/** Escala da cena: metade da largura do quadro = 4 unidades (igual ao viewBox 800 do poster SVG). */
const CAMERA_FOV = 20;
const CAMERA_Z = 4 / Math.tan((CAMERA_FOV / 2) * (Math.PI / 180));

/**
 * Estúdio grafite gerado por código (sem HDRI externo): softbox principal,
 * difusor no teto, recortes laterais e um fill frontal baixo. É o fill que faz
 * o cromo ler como prata em vez de "vidro preto".
 */
function buildStudioEnvironment(renderer: WebGLRenderer) {
  const room = new Scene();

  room.add(
    new Mesh(
      new BoxGeometry(40, 40, 40),
      new MeshBasicMaterial({ color: new Color(0.045, 0.046, 0.05), side: BackSide }),
    ),
  );

  const panel = (w: number, h: number, position: [number, number, number], intensity: number) => {
    const mesh = new Mesh(
      new PlaneGeometry(w, h),
      new MeshBasicMaterial({ color: new Color(intensity, intensity, intensity * 1.02), side: 2 }),
    );
    mesh.position.set(...position);
    mesh.lookAt(new Vector3(0, 0, 0));
    room.add(mesh);
  };

  panel(10, 6, [-8, 9, 6], 4); // softbox principal (alto, esquerda)
  panel(16, 16, [0, 14, 0], 1.3); // difusor de teto
  panel(1.5, 16, [10, 0, 2], 3); // recorte à direita
  panel(1, 14, [-11, -1, -3], 1.1); // recorte discreto à esquerda
  panel(14, 8, [0, 1, 14], 0.45); // fill frontal (atrás da câmera)
  panel(20, 20, [0, -12, 0], 0.16); // rebatimento do chão

  const pmrem = new PMREMGenerator(renderer);
  const target = pmrem.fromScene(room, 0.035);
  pmrem.dispose();

  room.traverse((obj) => {
    if (obj instanceof Mesh) {
      obj.geometry.dispose();
      (obj.material as MeshBasicMaterial).dispose();
    }
  });

  return target;
}

function Environment({ onReady }: { onReady: () => void }) {
  const gl = useThree((s) => s.gl);
  const get = useThree((s) => s.get);
  const invalidate = useThree((s) => s.invalidate);

  useEffect(() => {
    const { scene } = get();
    const target = buildStudioEnvironment(gl);
    scene.environment = target.texture;
    scene.environmentIntensity = 1;
    invalidate();

    // Espera o primeiro quadro com o ambiente aplicado antes de revelar o canvas.
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(onReady);
    });

    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      scene.environment = null;
      target.dispose();
    };
  }, [gl, get, invalidate, onReady]);

  return null;
}

type Pointer = { x: number; y: number };

/**
 * Mouse com atraso suave (lerp exponencial, independente do FPS): desloca e
 * inclina o conjunto dentro de limites curtos e escreve a posição suavizada em
 * `pointerRef` para o shader usar.
 */
function Rig({
  children,
  interactive,
  animate,
  pointerRef,
}: {
  children: ReactNode;
  interactive: boolean;
  animate: boolean;
  pointerRef: RefObject<Pointer>;
}) {
  const group = useRef<Group>(null);
  const target = useRef<Pointer>({ x: 0, y: 0 });

  useEffect(() => {
    if (!interactive) return;
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      target.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      target.current.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [interactive]);

  useFrame(({ scene, clock }, dt) => {
    const g = group.current;
    if (!g || !animate) return;

    const p = pointerRef.current;
    const k = 1 - Math.exp(-dt * 2.2); // atraso perceptível, sem "elástico"
    p.x += (target.current.x - p.x) * k;
    p.y += (target.current.y - p.y) * k;

    g.position.x = p.x * 0.18;
    g.position.y = -p.y * 0.12;
    g.rotation.y = p.x * 0.14;
    g.rotation.x = p.y * 0.09;

    // Os reflexos "varrem" a superfície conforme o mouse e um leve drift no tempo.
    const drift = Math.sin(clock.elapsedTime * 0.2) * 0.08;
    scene.environmentRotation.y = p.x * 0.45 + drift;
    scene.environmentRotation.x = p.y * 0.2;
  });

  return <group ref={group}>{children}</group>;
}

/**
 * Protagonista da hero. Independe da geometria: hoje recebe a forma provisória,
 * na Etapa 3 receberá a malha do urso (ver hero/shape.ts).
 */
function LiquidShape({
  light,
  animate,
  interactive,
  pointerRef,
  progress,
}: {
  light: boolean;
  animate: boolean;
  interactive: boolean;
  pointerRef: RefObject<Pointer>;
  progress: RefObject<number>;
}) {
  const geometry = useMemo(() => createPlaceholderGeometry({ light }), [light]);
  const material = useMemo(() => createLiquidMetalMaterial({ light }), [light]);
  const recede = useRef<Group>(null);
  const mesh = useRef<Mesh>(null);

  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );

  useFrame(({ scene }, dt) => {
    const m = mesh.current;
    const g = recede.current;
    if (!m || !g) return;
    const mat = m.material as MeshPhysicalMaterial;
    const u = mat.userData.uniforms as LiquidUniforms;

    if (animate) u.uTime.value += dt;

    const p = pointerRef.current;
    u.uPointerDir.value.set(p.x, -p.y, 0.9).normalize();
    u.uPointerStrength.value = interactive ? Math.min(Math.hypot(p.x, p.y), 1) * 0.09 : 0;

    // Transição para o manifesto: a forma recua, perde brilho e escurece para grafite.
    const s = Math.min(Math.max(progress.current ?? 0, 0), 1);
    const e = s * s * (3 - 2 * s);
    g.scale.setScalar(1 - 0.36 * e);
    g.position.set(0, 0.25 * e, -2.4 * e);
    mat.color.lerpColors(SILVER, GRAPHITE, e);
    scene.environmentIntensity = 1 - 0.78 * e;
  });

  return (
    <group ref={recede}>
      <mesh ref={mesh} geometry={geometry} material={material} />
    </group>
  );
}

export type HeroSceneProps = {
  /** Hero visível na tela? Fora dela o render é pausado. */
  active: boolean;
  /** Usuário prefere menos movimento: render estático, sem reação ao mouse. */
  reducedMotion: boolean;
  /** Dispositivo de toque: menos polígonos, 1 oitava de ruído, DPR menor e sem mouse. */
  coarse: boolean;
  /** Progresso 0→1 da transição hero → manifesto (escrito pelo ScrollTrigger). */
  progress: RefObject<number>;
  onReady: () => void;
};

export default function HeroScene({
  active,
  reducedMotion,
  coarse,
  progress,
  onReady,
}: HeroSceneProps) {
  const animate = !reducedMotion;
  const interactive = animate && !coarse;
  const pointer = useRef<Pointer>({ x: 0, y: 0 });

  return (
    <Canvas
      aria-hidden="true"
      className="!pointer-events-none"
      frameloop={reducedMotion ? "demand" : active ? "always" : "never"}
      dpr={[1, coarse ? 1.5 : 2]}
      camera={{ position: [0, 0, CAMERA_Z], fov: CAMERA_FOV }}
      gl={{ antialias: true, alpha: true, powerPreference: "default" }}
    >
      <Environment onReady={onReady} />
      <Rig interactive={interactive} animate={animate} pointerRef={pointer}>
        <LiquidShape
          light={coarse}
          animate={animate}
          interactive={interactive}
          pointerRef={pointer}
          progress={progress}
        />
      </Rig>
    </Canvas>
  );
}

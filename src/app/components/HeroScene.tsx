"use client";

import { useEffect, useMemo, useRef, type ReactNode } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  BackSide,
  BoxGeometry,
  BufferGeometry,
  Color,
  Group,
  Mesh,
  MeshBasicMaterial,
  PMREMGenerator,
  PlaneGeometry,
  Scene,
  Vector3,
  type WebGLRenderer,
} from "three";

/**
 * Escala da cena: metade da largura do quadro = 4 unidades. Isso espelha o
 * SVG original (viewBox 800): esfera r190 -> 1.9, órbitas r330/370 -> 3.3/3.7.
 */
const SPHERE_RADIUS = 1.9;
const CAMERA_FOV = 20;
const CAMERA_Z = 4 / Math.tan((CAMERA_FOV / 2) * (Math.PI / 180));

/** Estúdio escuro com poucas fontes de luz suaves, gerado por código (sem arquivos externos). */
function buildStudioEnvironment(renderer: WebGLRenderer) {
  const room = new Scene();

  const shell = new Mesh(
    new BoxGeometry(40, 40, 40),
    new MeshBasicMaterial({ color: new Color(0.012, 0.012, 0.014), side: BackSide }),
  );
  room.add(shell);

  const panel = (
    w: number,
    h: number,
    position: [number, number, number],
    intensity: number,
  ) => {
    const mesh = new Mesh(
      new PlaneGeometry(w, h),
      new MeshBasicMaterial({
        color: new Color(intensity, intensity, intensity * 1.02),
        side: 2,
      }),
    );
    mesh.position.set(...position);
    mesh.lookAt(new Vector3(0, 0, 0));
    room.add(mesh);
  };

  panel(9, 7, [-9, 8, 7], 5.5); // softbox principal (alto, esquerda)
  panel(1.4, 14, [10, 0, 3], 2.6); // faixa de recorte à direita
  panel(12, 2, [0, -9, -4], 0.7); // reflexo baixo, bem discreto
  panel(5, 5, [3, 12, -2], 1.2); // topo

  const pmrem = new PMREMGenerator(renderer);
  const target = pmrem.fromScene(room, 0.03);
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
    scene.environmentIntensity = 0.95;
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

function circleGeometry(radius: number, segments = 256) {
  const pts: Vector3[] = [];
  for (let i = 0; i < segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    pts.push(new Vector3(Math.cos(a) * radius, Math.sin(a) * radius, 0));
  }
  return new BufferGeometry().setFromPoints(pts);
}

type OrbitProps = {
  radius: number;
  roll: number; // giro no plano da tela (rad)
  tilt: number; // inclinação em X (rad)
  opacity: number;
  dot?: { size: number; opacity: number; angle: number };
  spin: number; // velocidade do ponto (rad/s)
  animate: boolean;
};

function Orbit({ radius, roll, tilt, opacity, dot, spin, animate }: OrbitProps) {
  const geometry = useMemo(() => circleGeometry(radius), [radius]);
  const spinner = useRef<Group>(null);

  useEffect(() => () => geometry.dispose(), [geometry]);

  useFrame((_, dt) => {
    if (animate && spinner.current) spinner.current.rotation.z += dt * spin;
  });

  return (
    <group rotation={[0, 0, roll]}>
      <group rotation={[tilt, 0, 0]}>
        <lineLoop geometry={geometry}>
          <lineBasicMaterial color="#ffffff" transparent opacity={opacity} />
        </lineLoop>
        {dot && (
          <group ref={spinner} rotation={[0, 0, dot.angle]}>
            <mesh position={[radius, 0, 0]}>
              <sphereGeometry args={[dot.size, 16, 16]} />
              <meshBasicMaterial color="#ffffff" transparent opacity={dot.opacity} />
            </mesh>
          </group>
        )}
      </group>
    </group>
  );
}

/** Movimento suave: o mouse desloca e inclina o conjunto dentro de limites curtos. */
function Rig({
  children,
  interactive,
  animate,
}: {
  children: ReactNode;
  interactive: boolean;
  animate: boolean;
}) {
  const group = useRef<Group>(null);
  const target = useRef({ x: 0, y: 0 });
  const current = useRef({ x: 0, y: 0 });

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

  useFrame(({ clock, scene }, dt) => {
    const g = group.current;
    if (!g || !animate) return;

    const k = 1 - Math.exp(-dt * 3);
    current.current.x += (target.current.x - current.current.x) * k;
    current.current.y += (target.current.y - current.current.y) * k;
    const { x, y } = current.current;

    g.position.x = x * 0.22;
    g.position.y = -y * 0.16;
    g.rotation.y = x * 0.12;
    g.rotation.x = y * 0.08;

    // Os reflexos "varrem" a superfície: é o que dá a sensação de girar a esfera.
    const drift = Math.sin(clock.elapsedTime * 0.25) * 0.07;
    scene.environmentRotation.y = x * 0.5 + drift;
    scene.environmentRotation.x = y * 0.22;
  });

  return <group ref={group}>{children}</group>;
}

export type HeroSceneProps = {
  /** Hero visível na tela? Fora dela o render é pausado. */
  active: boolean;
  /** Usuário prefere menos movimento: render estático, sem reação ao mouse. */
  reducedMotion: boolean;
  /** Dispositivo de toque: menos polígonos, DPR menor e sem rastreio de mouse. */
  coarse: boolean;
  onReady: () => void;
};

export default function HeroScene({
  active,
  reducedMotion,
  coarse,
  onReady,
}: HeroSceneProps) {
  const segments = coarse ? 48 : 96;
  const animate = !reducedMotion;

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
      <Rig interactive={animate && !coarse} animate={animate}>
        <mesh>
          <sphereGeometry args={[SPHERE_RADIUS, segments, segments]} />
          <meshStandardMaterial color="#c9ccd1" metalness={1} roughness={0.24} />
        </mesh>

        <Orbit
          radius={3.3}
          roll={0}
          tilt={0.18}
          opacity={0.32}
          spin={0.05}
          animate={animate}
          dot={{ size: 0.05, opacity: 0.55, angle: 2.2 }}
        />
        <Orbit radius={2.7} roll={0} tilt={0} opacity={0.09} spin={0} animate={false} />
        <Orbit
          radius={3.7}
          roll={-0.42}
          tilt={1.24}
          opacity={0.38}
          spin={0.07}
          animate={animate}
          dot={{ size: 0.075, opacity: 1, angle: 0.55 }}
        />
        <Orbit
          radius={3.7}
          roll={0.66}
          tilt={1.24}
          opacity={0.12}
          spin={-0.04}
          animate={animate}
        />
      </Rig>
    </Canvas>
  );
}

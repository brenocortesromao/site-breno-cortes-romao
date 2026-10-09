"use client";

import { useEffect, useMemo, useRef, type ReactNode, type RefObject } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  AdditiveBlending,
  BackSide,
  Float32BufferAttribute,
  Group,
  Mesh,
  MeshBasicMaterial,
  PMREMGenerator,
  PlaneGeometry,
  Scene,
  SphereGeometry,
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
import { createPlaceholderGeometry, SHAPE_RADIUS } from "./hero/shape";

const CAMERA_FOV = 20;
/** Diâmetro aparente da bola (raio + margem da ondulação). */
const SHAPE_DIAMETER = 2 * (SHAPE_RADIUS + 0.05);

/**
 * Enquadramento guiado pelo layout: a bola ocupa exatamente o elemento-âncora
 * do DOM (`anchorRef`, um quadrado posicionado pelo CSS da hero). A câmera é
 * afastada para o diâmetro da bola = altura da âncora e deslocada para o
 * centro dela. Assim tipografia e 3D compõem juntos em qualquer tela, e o
 * poster SVG (renderizado dentro da âncora) fica no mesmo lugar.
 */
function Framing({ anchorRef }: { anchorRef: RefObject<HTMLElement | null> }) {
  const width = useThree((s) => s.size.width);
  const height = useThree((s) => s.size.height);
  const get = useThree((s) => s.get);
  const invalidate = useThree((s) => s.invalidate);

  useEffect(() => {
    const anchor = anchorRef.current;
    if (!anchor) return;
    const { gl } = get();

    const fit = () => {
      const { camera } = get();
      const c = gl.domElement.getBoundingClientRect();
      const a = anchor.getBoundingClientRect();
      if (!c.height || !a.height) return;
      const tanHalf = Math.tan((CAMERA_FOV / 2) * (Math.PI / 180));
      const halfH = (SHAPE_DIAMETER / 2) * (c.height / a.height);
      const pxPerUnit = c.height / (2 * halfH);
      const dx = (a.left + a.width / 2 - (c.left + c.width / 2)) / pxPerUnit;
      const dy = (a.top + a.height / 2 - (c.top + c.height / 2)) / pxPerUnit;
      camera.position.set(-dx, dy, halfH / tanHalf);
      camera.updateProjectionMatrix();
      invalidate();
    };

    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(anchor);
    ro.observe(gl.domElement);
    return () => ro.disconnect();
  }, [anchorRef, width, height, get, invalidate]);

  return null;
}

/**
 * Estúdio de produto gerado por código (sem HDRI externo), pensado para cromo
 * polido / mercúrio:
 * - ambiente QUASE PRETO (cúpula em degradê bem escuro): as áreas escuras é que
 *   dão o contraste do metal — um "céu" claro deixaria a bola com cara de pérola;
 * - softboxes com BORDAS SUAVES (falloff por cor de vértice) em posições
 *   ASSIMÉTRICAS, alguns inclinados: viram faixas de luz curvas e macias no
 *   metal. Faixas verticais simétricas viram "parênteses" — evite;
 * - nenhuma fonte enorme no topo (topo estourado em branco).
 */
function buildStudioEnvironment(renderer: WebGLRenderer) {
  const room = new Scene();

  const dome = new SphereGeometry(30, 64, 32);
  const pos = dome.getAttribute("position");
  const colors = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const t = pos.getY(i) / 30; // -1 (chão) … 1 (topo)
    const v = t > 0 ? 0.07 + 0.2 * Math.pow(t, 1.4) : 0.07 - 0.05 * Math.min(-t / 0.4, 1);
    colors.set([v, v, v * 1.04], i * 3);
  }
  dome.setAttribute("color", new Float32BufferAttribute(colors, 3));
  room.add(new Mesh(dome, new MeshBasicMaterial({ vertexColors: true, side: BackSide })));

  /** Softbox com borda macia: intensidade cai suavemente do centro às bordas. */
  const softbox = (
    w: number,
    h: number,
    position: [number, number, number],
    intensity: number,
    tilt = 0,
  ) => {
    const geo = new PlaneGeometry(w, h, 32, 12);
    const p = geo.getAttribute("position");
    const c = new Float32Array(p.count * 3);
    const smooth = (e0: number, e1: number, x: number) => {
      const k = Math.min(Math.max((x - e0) / (e1 - e0), 0), 1);
      return k * k * (3 - 2 * k);
    };
    for (let i = 0; i < p.count; i++) {
      const u = Math.abs(p.getX(i)) / (w / 2);
      const v = Math.abs(p.getY(i)) / (h / 2);
      // queda longa (do centro até a borda): o reflexo vira degradê, não "janela"
      const f = intensity * smooth(1, 0.05, u) * smooth(1, 0.05, v);
      c.set([f, f, f * 1.03], i * 3);
    }
    geo.setAttribute("color", new Float32BufferAttribute(c, 3));
    // aditivo: a luz SOMA ao ambiente (bordas pretas do degradê não criam contorno)
    const mesh = new Mesh(
      geo,
      new MeshBasicMaterial({
        vertexColors: true,
        side: 2,
        transparent: true,
        blending: AdditiveBlending,
        depthWrite: false,
      }),
    );
    mesh.position.set(...position);
    mesh.lookAt(new Vector3(0, 0, 0));
    mesh.rotateZ(tilt);
    room.add(mesh);
  };

  // Fontes fortes nas LATERAIS e ATRÁS: os reflexos vão para perto das bordas da
  // bola. O centro (que reflete o que está atrás da câmera) recebe só um fill
  // difuso — formas fortes no centro viram "olhos"/"rosto".
  softbox(20, 9, [-12, 9, 3], 3.6, -0.3); // principal: faixa macia na borda superior esquerda
  softbox(14, 10, [13, 1, -4], 2.6, 0.5); // contraluz à direita, inclinado: prata na borda
  softbox(40, 1.4, [0, -1, -12], 2.4); // fio de horizonte atrás: linha fina perto da borda
  softbox(16, 6, [0, 14, 0], 1.0); // teto discreto: topo prateado, sem estourar
  softbox(26, 16, [0, 2, 14], 0.4); // fill frontal muito difuso: centro prata-grafite, sem forma
  softbox(24, 24, [0, -12, 2], 0.3); // rebatimento do chão

  const pmrem = new PMREMGenerator(renderer);
  const target = pmrem.fromScene(room, 0.012);
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

    // deslocamento curto: cabe no respiro entre a bola e as frases da hero
    g.position.x = p.x * 0.1;
    g.position.y = -p.y * 0.08;
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
 * Protagonista da hero: a bola de metal líquido. Respira o tempo todo (escala e
 * amplitude da ondulação oscilam devagar), reage ao mouse via `pointerRef` e
 * aplica a transição de scroll. O urso da Etapa 4 nasce desta mesma malha
 * animando os uniforms de forma (uMorph/uFeature*) — ver hero/liquidMetal.ts.
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
  const breath = useRef<Group>(null);
  const mesh = useRef<Mesh>(null);
  const baseAmp = useRef<number | null>(null);

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
    const b = breath.current;
    if (!m || !g || !b) return;
    const mat = m.material as MeshPhysicalMaterial;
    const u = mat.userData.uniforms as LiquidUniforms;
    baseAmp.current ??= u.uAmp.value;

    if (animate) {
      u.uTime.value += dt;
      // respiração: ciclo lento (~11 s) de volume e de intensidade da ondulação
      const t = u.uTime.value;
      b.scale.setScalar(1 + Math.sin(t * 0.55) * 0.018);
      u.uAmp.value = baseAmp.current * (0.8 + 0.2 * Math.sin(t * 0.3 + 1.2));
    }

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
      <group ref={breath}>
        <mesh ref={mesh} geometry={geometry} material={material} />
      </group>
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
  /** Elemento do DOM que define posição e tamanho da bola (ver Framing). */
  anchorRef: RefObject<HTMLElement | null>;
  onReady: () => void;
};

export default function HeroScene({
  active,
  reducedMotion,
  coarse,
  progress,
  anchorRef,
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
      camera={{ position: [0, 0, 20], fov: CAMERA_FOV }}
      gl={{ antialias: true, alpha: true, powerPreference: "default" }}
    >
      <Framing anchorRef={anchorRef} />
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

"use client";

import { useEffect, useMemo, useRef, type RefObject } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { BufferAttribute, BufferGeometry, Mesh, ShaderMaterial, Vector3 } from "three";
import ContextLossWatcher from "@/components/ContextLossWatcher";
import { getTerrain, SUN, terrainSize } from "./heightmap";

/**
 * Cordilheiras 3D procedurais (ver heightmap.ts), monocromáticas: rocha
 * grafite quase preta, neve e cristas em prata nas partes altas e nas faces
 * voltadas para o sol baixo, sombras longas, névoa escura entre as camadas
 * (com deriva lenta). A câmera desce de uma vista alta até perto do pico
 * principal conforme `progressRef` (0→1, escrito pelo scroll do trecho).
 */

const VERT = /* glsl */ `
attribute float aShadow;
varying vec3 vWorld;
varying vec3 vNormal;
varying float vShadow;
void main() {
  vWorld = position;
  vNormal = normal;
  vShadow = aShadow;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const FRAG = /* glsl */ `
uniform vec3 uSun;
uniform float uTime;
uniform float uSnow;
uniform float uDetail;
varying vec3 vWorld;
varying vec3 vNormal;
varying float vShadow;

float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vnoise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1,0)), u.x), mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), u.x), u.y);
}
float fbm(vec2 p){ float a = 0.5, s = 0.0; for (int i = 0; i < 4; i++) { s += a * vnoise(p); p = p * 2.07 + 11.3; a *= 0.5; } return s; }

void main() {
  float dist = length(vWorld - cameraPosition);
  // detalhe fino de normal (estrias de rocha), some com a distância: nítido de perto
  vec3 n = normalize(vNormal);
  float near = uDetail * (1.0 - smoothstep(6.0, 40.0, dist));
  vec2 q = vWorld.xz * 2.4;
  float e = 0.04;
  float h0 = fbm(q);
  vec2 g = vec2(fbm(q + vec2(e, 0.0)) - h0, fbm(q + vec2(0.0, e)) - h0) / e;
  n = normalize(n + near * 0.28 * vec3(-g.x, 0.0, -g.y));

  float diff = max(dot(n, uSun), 0.0);
  float lit = diff * vShadow;
  // neve: alto + pouco íngreme, com borda irregular; acumula nas faces de sol
  float slope = n.y;
  float snowLine = uSnow + (fbm(vWorld.xz * 0.35) - 0.5) * 1.4;
  float snow = smoothstep(snowLine, snowLine + 0.7, vWorld.y) * smoothstep(0.45, 0.72, slope);
  float rock = 0.045 + 0.03 * fbm(vWorld.xz * 0.8);
  float albedo = mix(rock, 0.86, snow);
  // luz do céu (preenche as sombras em grafite) + sol rasante
  float sky = 0.05 + 0.09 * max(n.y, 0.0);
  float c = albedo * (sky + 1.6 * lit);
  // brilho prata nas cristas iluminadas (luz rasante)
  vec3 v = normalize(cameraPosition - vWorld);
  float spec = pow(max(dot(reflect(-uSun, n), v), 0.0), 24.0) * vShadow;
  c += spec * mix(0.08, 0.35, snow);
  c = c / (c + 0.55) * 1.45; // tone map suave

  // névoa: distância + névoa baixa nos vales, que deriva devagar
  float fog = 1.0 - exp(-max(dist - 16.0, 0.0) * 0.022);
  float valley = exp(-max(vWorld.y, 0.0) * 0.55) * (0.45 + 0.55 * fbm(vWorld.xz * 0.06 + vec2(uTime * 0.012, uTime * 0.007)));
  fog = clamp(fog + valley * 0.75, 0.0, 1.0);
  float fogC = 0.03 + 0.025 * fbm(vWorld.xz * 0.04 - uTime * 0.01);
  c = mix(c, fogC, fog);
  // levíssimo tom prata frio-neutro (nada de azul)
  gl_FragColor = vec4(vec3(c) * vec3(0.985, 0.99, 1.0), 1.0);
}`;

const smooth = (t: number) => t * t * (3 - 2 * t);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

function Terrain({
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
  const mesh = useRef<Mesh>(null);
  const data = useMemo(() => getTerrain(terrainSize(light)), [light]);
  const geometry = useMemo(() => {
    const g = new BufferGeometry();
    g.setAttribute("position", new BufferAttribute(data.positions, 3));
    g.setAttribute("aShadow", new BufferAttribute(data.shadows, 1));
    g.setIndex(new BufferAttribute(data.indices, 1));
    g.computeVertexNormals();
    return g;
  }, [data]);
  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: VERT,
        fragmentShader: FRAG,
        uniforms: {
          uSun: { value: new Vector3(...SUN) },
          uTime: { value: 0 },
          uSnow: { value: data.snow },
          uDetail: { value: light ? 0.6 : 1 },
        },
      }),
    [data, light],
  );
  useEffect(() => () => {
    geometry.dispose();
    material.dispose();
  }, [geometry, material]);

  const look = useMemo(() => new Vector3(), []);
  const tilt = useRef({ x: 0, y: 0 });
  const time = useRef(0);

  useFrame(({ camera }, delta) => {
    const dt = Math.min(delta, 0.05);
    if (!still) time.current += dt;
    const t = time.current;
    const p = smooth(Math.min(1, Math.max(0, progressRef.current ?? 0)));
    const [px, peak, pz] = data.peak;
    // drone: começa alto vendo várias cordilheiras, desce até perto do pico
    const k = 1 - Math.exp(-dt * 2);
    const ptr = pointerRef.current ?? { x: 0, y: 0 };
    tilt.current.x += (ptr.x - tilt.current.x) * k;
    tilt.current.y += (ptr.y - tilt.current.y) * k;
    const drift = still ? 0 : 1;
    // começa quase a pino, alto; termina baixo e perto das cristas do pico,
    // do lado do sol (esquerda), vendo a face iluminada
    camera.position.set(
      px + lerp(-1, -3.2, p) + Math.sin(t * 0.07) * 0.7 * drift + tilt.current.x * 0.9,
      lerp(36, peak + 3.4, p) + Math.sin(t * 0.05 + 1) * 0.3 * drift - tilt.current.y * 0.4,
      pz + lerp(17, 6.5, p) + Math.cos(t * 0.06) * 0.4 * drift,
    );
    look.set(px + tilt.current.x * 0.4, lerp(0, peak * 0.72, p), pz + lerp(-5, 0, p));
    camera.lookAt(look);
    const mat = mesh.current?.material;
    if (mat instanceof ShaderMaterial) mat.uniforms.uTime.value = t;
  });

  return <mesh ref={mesh} geometry={geometry} material={material} />;
}

export default function MountainScene({
  progressRef,
  pointerRef,
  active,
  light,
  maxDpr = 2,
  reducedMotion,
  onContextLost,
}: {
  progressRef: RefObject<number>;
  pointerRef: RefObject<{ x: number; y: number }>;
  active: boolean;
  light: boolean;
  /** Teto de DPR do nível de qualidade (lib/quality). */
  maxDpr?: number;
  reducedMotion: boolean;
  /** Perda do contexto WebGL (o pai remonta a cena). */
  onContextLost?: () => void;
}) {
  return (
    <Canvas
      aria-hidden="true"
      className="!pointer-events-none"
      frameloop={reducedMotion ? "demand" : active ? "always" : "never"}
      dpr={[1, Math.min(light ? 1 : 1.5, maxDpr)]}
      camera={{ position: [0, 26, 30], fov: 42, near: 0.1, far: 140 }}
      gl={{ antialias: !light, alpha: true, powerPreference: "default" }}
    >
      <ContextLossWatcher onLost={onContextLost} />
      <Terrain progressRef={progressRef} pointerRef={pointerRef} light={light} still={reducedMotion} />
    </Canvas>
  );
}

"use client";

import { useEffect, useMemo, useRef, type RefObject } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Mesh, NoBlending, PlaneGeometry, ShaderMaterial, Vector2 } from "three";
import ContextLossWatcher from "@/components/ContextLossWatcher";

/**
 * Mar de nuvens visto do céu, monocromático (branco, prata, grafite), leve:
 * NÃO é raymarch. Um único quadro em tela cheia; para cada pixel o raio da
 * câmera é intersectado analiticamente com LAYERS planos horizontais de nuvem
 * (um acima do outro) e cada plano amostra um ruído fbm animado (cobertura,
 * luz rasante pela diferença de ruído, escurece com a profundidade). As camadas
 * são compostas da frente para trás. Renderizado em resolução baixa (DPR < 1),
 * reescalado pelo CSS: nuvem é suave, não precisa de pixel.
 * A câmera (progressRef 0→1, scroll da seção) começa alta, vendo o mar de
 * nuvens de cima, desce atravessando as camadas (véu de névoa ao cruzar cada
 * uma) e termina olhando para o horizonte enquanto as nuvens se abrem (uOpen).
 * Deriva lenta contínua (avança e as camadas correm em velocidades diferentes,
 * parallax), mesmo com o scroll parado.
 */

const VERT = /* glsl */ `
void main() { gl_Position = vec4(position.xy, 0.0, 1.0); }`;

const FRAG = (layers: number, octaves: number) => /* glsl */ `
uniform vec2 uRes;
uniform float uTime;
uniform float uCamY;
uniform float uPitch;
uniform float uYaw;
uniform float uOpen;

#define LAYERS ${layers}
#define SPACING 1.35

float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vnoise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1,0)), u.x), mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), u.x), u.y);
}
float fbm(vec2 p){
  float a = 0.5, s = 0.0;
  for (int i = 0; i < ${octaves}; i++) { s += a * vnoise(p); p = mat2(1.6, 1.2, -1.2, 1.6) * p + 7.1; a *= 0.5; }
  return s;
}

void main(){
  vec2 uv = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
  // câmera: avança devagar (deriva) e desce com o scroll
  vec3 ro = vec3(uTime * 0.04, uCamY, -uTime * 0.28);
  vec3 rd = normalize(vec3(uv.x, uv.y, -1.35));
  float cp = cos(uPitch), sp = sin(uPitch);
  rd = vec3(rd.x, rd.y * cp + rd.z * sp, -rd.y * sp + rd.z * cp);
  float cy = cos(uYaw), sy = sin(uYaw);
  rd = vec3(rd.x * cy - rd.z * sy, rd.y, rd.x * sy + rd.z * cy);

  // abrir: cobertura cai (limiar sobe), as nuvens se rasgam
  float cov = mix(0.44, 0.86, uOpen);
  vec3 col = vec3(0.0);
  float acc = 0.0;
  for (int k = 0; k < LAYERS; k++) {
    // ordem da frente para trás: olhando para baixo, de cima para baixo
    int i = rd.y < 0.0 ? k : LAYERS - 1 - k;
    float fi = float(i);
    float h = -fi * SPACING - ro.y;
    if (h * rd.y <= 0.0) continue; // plano atrás da câmera
    float t = h / rd.y;
    if (t > 70.0) continue;
    vec2 xz = ro.xz + rd.xz * t;
    // cada camada corre numa velocidade (parallax) e tem seu próprio desenho
    vec2 q = xz * 0.22 + vec2(fi * 7.3 + uTime * 0.012 * (1.0 + fi * 0.35), fi * 3.1);
    float n = fbm(q);
    float d = smoothstep(cov, cov + 0.22, n);
    if (d <= 0.0) continue;
    // luz rasante: mais clara onde o ruído sobe na direção do sol
    float n2 = fbm(q + vec2(0.07, 0.05));
    float lit = clamp(0.55 + (n - n2) * 7.0, 0.12, 1.0);
    float c = mix(0.28, 1.0, lit) * mix(1.0, 0.62, fi / float(LAYERS));
    // some ao longe e bem perto da câmera (sem estalo ao cruzar a camada) e
    // em ângulo rasante (de perfil a camada vira riscos horizontais)
    float a = d * exp(-t * 0.03) * smoothstep(0.0, 1.4, t) * smoothstep(0.03, 0.22, abs(rd.y)) * 0.92;
    col += (1.0 - acc) * a * c;
    acc += (1.0 - acc) * a;
  }

  // atravessando uma camada: véu de névoa na tela inteira
  float mist = 0.0;
  for (int i = 0; i < LAYERS; i++) {
    float dy = (ro.y + float(i) * SPACING) / 0.42;
    mist = max(mist, exp(-dy * dy));
  }
  float veil = mist * smoothstep(0.25, 0.75, fbm(uv * 1.6 + vec2(uTime * 0.04, uCamY * 0.6))) * (1.0 - uOpen) * 0.5;
  col = col * (1.0 - veil) + veil * 0.78;
  acc += veil * (1.0 - acc);

  // clareia ao abrir
  col *= 1.0 + 0.3 * uOpen;
  // alfa pré-multiplicado; levíssimo prata frio-neutro (nada de azul)
  gl_FragColor = vec4(col * vec3(0.985, 0.99, 1.0), acc);
}`;

const smooth = (t: number) => t * t * (3 - 2 * t);
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

function Clouds({
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
  const geometry = useMemo(() => new PlaneGeometry(2, 2), []);
  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: VERT,
        fragmentShader: FRAG(light ? 4 : 6, light ? 3 : 4),
        depthTest: false,
        depthWrite: false,
        // o shader já escreve alfa pré-multiplicado, como o canvas espera
        blending: NoBlending,
        uniforms: {
          uRes: { value: new Vector2(1, 1) },
          uTime: { value: 0 },
          uCamY: { value: 7 },
          uPitch: { value: -0.8 },
          uYaw: { value: 0 },
          uOpen: { value: 0 },
        },
      }),
    [light],
  );
  useEffect(() => () => {
    geometry.dispose();
    material.dispose();
  }, [geometry, material]);

  const time = useRef(0);
  const tilt = useRef({ x: 0, y: 0 });

  useFrame(({ gl }, delta) => {
    const dt = Math.min(delta, 0.05);
    if (!still) time.current += dt;
    const mat = mesh.current?.material;
    if (!(mat instanceof ShaderMaterial)) return;
    const p = clamp01(progressRef.current ?? 0);
    const descend = smooth(clamp01(p / 0.7));
    const k = 1 - Math.exp(-dt * 2);
    const ptr = pointerRef.current ?? { x: 0, y: 0 };
    tilt.current.x += (ptr.x - tilt.current.x) * k;
    tilt.current.y += (ptr.y - tilt.current.y) * k;
    const u = mat.uniforms;
    gl.getDrawingBufferSize(u.uRes.value);
    u.uTime.value = time.current;
    // alto acima do mar de nuvens → abaixo da última camada
    u.uCamY.value = lerp(7, -8.2, descend);
    // olhando para baixo no começo; para o horizonte (um pouco acima) no fim
    u.uPitch.value = lerp(-0.8, 0.12, smooth(p)) - tilt.current.y * 0.05;
    u.uYaw.value = tilt.current.x * 0.08 + (still ? 0 : Math.sin(time.current * 0.05) * 0.04);
    u.uOpen.value = smooth(clamp01((p - 0.6) / 0.35));
  });

  return <mesh ref={mesh} geometry={geometry} material={material} frustumCulled={false} />;
}

export default function CloudScene({
  progressRef,
  pointerRef,
  active,
  light,
  reducedMotion,
  onContextLost,
}: {
  progressRef: RefObject<number>;
  pointerRef: RefObject<{ x: number; y: number }>;
  active: boolean;
  light: boolean;
  reducedMotion: boolean;
  /** Perda do contexto WebGL (o pai remonta a cena). */
  onContextLost?: () => void;
}) {
  return (
    <Canvas
      aria-hidden="true"
      className="!pointer-events-none"
      frameloop={reducedMotion ? "demand" : active ? "always" : "never"}
      // resolução baixa de propósito (nuvem é suave): o CSS reescala
      dpr={light ? 0.45 : 0.6}
      gl={{ antialias: false, alpha: true, powerPreference: "default" }}
    >
      <ContextLossWatcher onLost={onContextLost} />
      <Clouds progressRef={progressRef} pointerRef={pointerRef} light={light} still={reducedMotion} />
    </Canvas>
  );
}

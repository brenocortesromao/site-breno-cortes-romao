"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  CanvasTexture,
  InstancedBufferAttribute,
  InstancedMesh,
  LinearFilter,
  Matrix3,
  Mesh,
  NoBlending,
  PlaneGeometry,
  ShaderMaterial,
  Vector2,
  Vector3,
  type PerspectiveCamera,
} from "three";
import ContextLossWatcher from "@/components/ContextLossWatcher";
import { warmup } from "@/lib/warmup";
import { motionScale, useMotionRunning } from "@/lib/mobile";
import { FrameSignals, useSceneFrames } from "../frameSignals";
import type { SceneLink } from "../SceneSwap";

/**
 * Diagnóstico: voo de avião em primeira pessoa atravessando as nuvens
 * (scroll da seção, progressRef 0→1, suavizado aqui):
 * 1. começo: a câmera olha pela janela entre duas camadas de nuvens; o avião
 *    avança e as nuvens passam da direita para a esquerda, com parallax pela
 *    profundidade (as perto mais rápidas e mais suaves, as longe mais lentas),
 *    em movimento contínuo mesmo sem scroll;
 * 2. meio: desce para dentro da camada densa: a tela fica clara e difusa, com
 *    uma turbulência leve (balanço sutil por ruído);
 * 3. fim: sobe e sai ACIMA do mar de nuvens: céu do grafite ao prata e luz
 *    rasante prateada nos topos (silver lining), horizonte amplo.
 * Mouse (desktop): rolagem ±3° e arfagem ±2°, com inércia.
 * Desktop: nuvens volumétricas por raymarching (FBM 3D, absorção, espalhamento
 * Henyey-Greenstein, poucos passos com jitter) em meia resolução. Celular e
 * nível "low": billboards instanciados com textura de nuvem gerada por ruído,
 * com o mesmo roteiro (campo de visão maior na tela em pé).
 * Paleta monocromática; a claridade máxima é limitada (as frases ficam por
 * cima). prefers-reduced-motion: quadro parado acima das nuvens.
 */

const smooth = (t: number) => t * t * (3 - 2 * t);
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const band = (p: number, a: number, b: number) => smooth(clamp01((p - a) / (b - a)));

/** Sol baixo, à frente e à direita: luz rasante nos topos no fim do voo. */
const SUN = new Vector3(0.45, 0.16, -1).normalize();
/** Claridade máxima (0..1) do que fica atrás das frases. */
const MAX_BRIGHT = 0.82;

type Flight = { x: number; y: number; z: number; yaw: number; pitch: number; roll: number; dense: number; sky: number };

/**
 * Roteiro do voo: posição e atitude da câmera, véu de dentro da nuvem e céu
 * aberto. Mundo: camada principal (o "mar") entre y -1,6 e 1,8, camada fina de
 * cima entre 3 e 5. A câmera avança em +X (as nuvens passam para a esquerda).
 */
function flight(p: number, t: number, still: boolean, tilt: Vector2): Flight {
  const inA = band(p, 0.3, 0.5); // entra na nuvem
  const out = band(p, 0.58, 0.88); // sobe e sai por cima
  const y = lerp(lerp(2.45, 0.35, inA), 8.2, out);
  const dense = inA * (1 - band(p, 0.55, 0.72));
  const sky = out;
  // turbulência: só dentro e na saída da nuvem, leve
  const turb = still ? 0 : dense * 1 + out * (1 - out) * 1.5;
  const n = (k: number) => Math.sin(t * k) * 0.6 + Math.sin(t * k * 2.31 + 1.7) * 0.4;
  return {
    x: still ? 0 : t * 1.15 + p * 6,
    y: y + turb * 0.05 * n(1.9),
    z: 0,
    yaw: 0,
    // olha um pouco para baixo no fim (os topos iluminados) + mouse
    pitch: lerp(0.02, -0.16, out) + tilt.y * 0.035 + turb * 0.008 * n(2.7),
    roll: tilt.x * 0.052 + turb * 0.012 * n(1.3),
    dense,
    sky,
  };
}

// ------------------------------------------------------------------ desktop: raymarching
const VOL_VERT = /* glsl */ `
void main() { gl_Position = vec4(position.xy, 0.0, 1.0); }`;

const VOL_FRAG = (steps: number) => /* glsl */ `
uniform vec2 uRes;
uniform float uTime;
uniform vec3 uCam;
uniform mat3 uRot;
uniform float uTan;
uniform vec3 uSun;
uniform float uDense;
uniform float uSky;
uniform float uMax;

#define STEPS ${steps}

float hash3(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float noise3(vec3 x) {
  vec3 i = floor(x), f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hash3(i + vec3(0,0,0)), hash3(i + vec3(1,0,0)), f.x), mix(hash3(i + vec3(0,1,0)), hash3(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(hash3(i + vec3(0,0,1)), hash3(i + vec3(1,0,1)), f.x), mix(hash3(i + vec3(0,1,1)), hash3(i + vec3(1,1,1)), f.x), f.y), f.z);
}
float fbm3(vec3 p) {
  float s = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++) { s += a * noise3(p); p = p * 2.03 + vec3(1.7, 9.2, 3.1); a *= 0.5; }
  return s;
}
// perfil de altura: mar de nuvens (camada principal) e camada fina de cima
float profile(float y) {
  float a = smoothstep(-1.6, -0.5, y) * (1.0 - smoothstep(0.7, 1.8, y));
  float b = smoothstep(3.0, 3.5, y) * (1.0 - smoothstep(4.2, 5.0, y)) * 0.75 * (1.0 - uSky);
  return a + b;
}
float density(vec3 p) {
  float h = profile(p.y);
  if (h <= 0.001) return 0.0;
  vec3 q = p * vec3(0.24, 0.36, 0.24) + vec3(uTime * 0.012, 0.0, uTime * 0.006);
  float n = fbm3(q);
  // topos mais "couve-flor" na camada principal
  return clamp((n * h - 0.33) * 3.2, 0.0, 1.0);
}
float hg(float c, float g) { float g2 = g * g; return (1.0 - g2) / (4.0 * 3.14159 * pow(1.0 + g2 - 2.0 * g * c, 1.5)); }
// ruído de tela para o jitter (gradiente intercalado)
float ign(vec2 p) { return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715)))); }

vec3 skyCol(vec3 rd) {
  float up = clamp(rd.y, -0.2, 1.0);
  vec3 c = mix(vec3(0.62, 0.63, 0.64), vec3(0.07, 0.072, 0.075), pow(clamp(up + 0.05, 0.0, 1.0), 0.45));
  c += vec3(0.55) * pow(max(dot(rd, uSun), 0.0), 24.0) * 0.6;
  return c;
}

void main() {
  vec2 uv = (gl_FragCoord.xy / uRes) * 2.0 - 1.0;
  vec3 rd = normalize(uRot * vec3(uv.x * uTan * uRes.x / uRes.y, uv.y * uTan, -1.0));
  vec3 ro = uCam;
  // só a faixa de altura das nuvens (-1,6 a 5)
  float t0 = 0.0, t1 = 46.0;
  if (abs(rd.y) > 1e-4) {
    float ta = (-1.6 - ro.y) / rd.y, tb = (5.0 - ro.y) / rd.y;
    t0 = max(min(ta, tb), 0.0);
    t1 = min(max(ta, tb), 46.0);
  } else if (ro.y < -1.6 || ro.y > 5.0) { t1 = -1.0; }
  float T = 1.0;
  vec3 col = vec3(0.0);
  if (t1 > t0) {
    float dt = (t1 - t0) / float(STEPS);
    float t = t0 + dt * ign(gl_FragCoord.xy + fract(uTime * 7.0) * 61.0);
    float cosT = dot(rd, uSun);
    float phase = mix(hg(cosT, 0.62), hg(cosT, -0.2), 0.3) * 4.0 * 3.14159;
    for (int i = 0; i < STEPS; i++) {
      vec3 p = ro + rd * t;
      float d = density(p);
      if (d > 0.01) {
        // perto da câmera: mais suave (desfoque falso por profundidade)
        float near = smoothstep(0.0, 4.0, t);
        float dd = d * mix(0.35, 1.0, near);
        // sombra própria: uma amostra na direção do sol
        float ds = density(p + uSun * 0.7);
        float lightT = exp(-ds * 2.2);
        vec3 lum = vec3(0.16, 0.165, 0.17) + vec3(0.92, 0.94, 0.96) * lightT * (0.35 + 0.65 * phase) * (0.55 + 0.45 * uSky);
        float a = 1.0 - exp(-dd * dt * 1.6);
        col += T * a * lum;
        T *= 1.0 - a;
        if (T < 0.03) break;
      }
      t += dt;
      if (t > t1) break;
    }
  }
  // céu: some nas fases 1 e 2 (a seção é preta), abre no fim
  float skyA = uSky;
  vec3 sky = skyCol(rd);
  vec3 rgb = col + T * sky * skyA;
  float alpha = (1.0 - T) + T * skyA;
  // dentro da nuvem: véu claro e difuso que respira devagar
  float veil = uDense * (0.72 + 0.28 * fbm3(vec3(uv * 1.6, uTime * 0.12)));
  rgb = mix(rgb, vec3(0.86, 0.87, 0.88) * veil, veil * 0.85);
  alpha = max(alpha, veil * 0.85);
  // claridade máxima limitada (as frases ficam por cima)
  rgb = min(rgb, vec3(uMax));
  gl_FragColor = vec4(rgb, alpha);
}`;

function Volume({ progressRef, pointerRef, still, steps }: { progressRef: RefObject<number>; pointerRef: RefObject<{ x: number; y: number }>; still: boolean; steps: number }) {
  const mesh = useRef<Mesh>(null);
  const geometry = useMemo(() => new PlaneGeometry(2, 2), []);
  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: VOL_VERT,
        fragmentShader: VOL_FRAG(steps),
        depthTest: false,
        depthWrite: false,
        // alfa pré-multiplicado, como o canvas espera
        blending: NoBlending,
        uniforms: {
          uRes: { value: new Vector2(1, 1) },
          uTime: { value: 0 },
          uCam: { value: new Vector3() },
          uRot: { value: new Matrix3() },
          uTan: { value: Math.tan((50 * Math.PI) / 360) },
          uSun: { value: SUN.clone() },
          uDense: { value: 0 },
          uSky: { value: 0 },
          uMax: { value: MAX_BRIGHT },
        },
      }),
    [steps],
  );
  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );
  const st = useRef({ time: 0, p: -1, tilt: new Vector2() });

  useFrame(({ gl }, delta) => {
    // celular: desacelera até parar quando a página rola (lib/mobile)
    const dt = Math.min(delta, 0.05) * motionScale();
    const s = st.current;
    if (!still) s.time += dt;
    const target = still ? 1 : clamp01(progressRef.current ?? 0);
    s.p = s.p < 0 || still ? target : s.p + (target - s.p) * (1 - Math.exp(-dt * 3)); // scrub suave
    const ptr = pointerRef.current ?? { x: 0, y: 0 };
    const k = 1 - Math.exp(-dt * 2.5);
    s.tilt.x += (ptr.x - s.tilt.x) * k;
    s.tilt.y += (ptr.y - s.tilt.y) * k;
    const f = flight(s.p, s.time, still, s.tilt);
    const mat = mesh.current?.material;
    if (!(mat instanceof ShaderMaterial)) return;
    const u = mat.uniforms;
    gl.getDrawingBufferSize(u.uRes.value);
    u.uTime.value = s.time;
    u.uCam.value.set(f.x, f.y, f.z);
    // base da câmera: arfagem e rolagem (olhando para -Z)
    const cp = Math.cos(f.pitch), sp = Math.sin(f.pitch), cr = Math.cos(f.roll), sr = Math.sin(f.roll);
    // R = Rx(pitch) * Rz(roll), colunas
    (u.uRot.value as Matrix3).set(cr, -sr, 0, cp * sr, cp * cr, -sp, sp * sr, sp * cr, cp);
    u.uDense.value = f.dense;
    u.uSky.value = f.sky;
  });

  return <mesh ref={mesh} geometry={geometry} material={material} frustumCulled={false} />;
}

// ------------------------------------------------------------------ celular / low: billboards
/** Textura de um "puff" de nuvem: falloff radial deformado por ruído (gerada uma vez). */
function puffTexture() {
  const N = 128;
  const c = document.createElement("canvas");
  c.width = c.height = N;
  const ctx = c.getContext("2d")!;
  const img = ctx.createImageData(N, N);
  const h = (x: number, y: number) => {
    const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
    return s - Math.floor(s);
  };
  const vn = (x: number, y: number) => {
    const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
    const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
    return lerp(lerp(h(ix, iy), h(ix + 1, iy), ux), lerp(h(ix, iy + 1), h(ix + 1, iy + 1), ux), uy);
  };
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      const u = (x / N) * 2 - 1, v = (y / N) * 2 - 1;
      let n = 0, a = 0.5, fx = x / 16, fy = y / 16;
      for (let o = 0; o < 4; o++) {
        n += a * vn(fx, fy);
        fx *= 2.1;
        fy *= 2.1;
        a *= 0.5;
      }
      const r = Math.sqrt(u * u + v * v) + (n - 0.5) * 0.55;
      const alpha = clamp01(1 - smooth(clamp01((r - 0.25) / 0.65)));
      const i = (y * N + x) * 4;
      // canal R: densidade; G: "topo" (mais claro em cima), B: ruído
      img.data[i] = 255;
      img.data[i + 1] = Math.round(clamp01(0.5 - v * 0.5 + (n - 0.5) * 0.4) * 255);
      img.data[i + 2] = Math.round(n * 255);
      img.data[i + 3] = Math.round(alpha * 255);
    }
  ctx.putImageData(img, 0, 0);
  const tex = new CanvasTexture(c);
  tex.minFilter = LinearFilter;
  tex.generateMipmaps = false;
  return tex;
}

const SPRITE_VERT = /* glsl */ `
attribute vec4 aPuff; // x, y, z (centro), escala
attribute vec2 aSeed;
uniform float uCamX;
uniform float uSpan;
varying vec2 vUv;
varying float vNear;
varying float vSeed;
void main() {
  vUv = uv;
  vSeed = aSeed.x;
  vec3 c = aPuff.xyz;
  // mundo "infinito" em X: o puff volta ao lado direito quando sai pela esquerda
  c.x = uCamX + mod(c.x - uCamX + uSpan * 0.5, uSpan) - uSpan * 0.5;
  vec4 mv = viewMatrix * vec4(c, 1.0);
  float d = -mv.z;
  vNear = d;
  // billboard: o quadrado sempre de frente para a câmera, girado pela semente
  float a = aSeed.y * 6.2832;
  vec2 q = mat2(cos(a), -sin(a), sin(a), cos(a)) * position.xy;
  mv.xy += q * aPuff.w * vec2(1.6, 1.0);
  gl_Position = projectionMatrix * mv;
}`;

const SPRITE_FRAG = /* glsl */ `
uniform sampler2D uTex;
uniform float uSky;
uniform float uMax;
varying vec2 vUv;
varying float vNear;
varying float vSeed;
void main() {
  vec4 t = texture2D(uTex, vUv);
  // perto: mais transparente (desfoque falso); longe: some na distância
  float a = t.a * smoothstep(0.6, 3.5, vNear) * (1.0 - smoothstep(26.0, 40.0, vNear)) * 0.92;
  if (a < 0.004) discard;
  // topo claro (luz de cima), base grafite; no fim, luz rasante prateada mais forte
  float lit = mix(0.32, 1.0, t.g) * mix(0.75, 1.0, uSky) + (t.b - 0.5) * 0.12 + vSeed * 0.05;
  vec3 col = min(vec3(0.9, 0.91, 0.92) * lit, vec3(uMax));
  gl_FragColor = vec4(col * a, a); // pré-multiplicado
}`;

const BG_FRAG = /* glsl */ `
uniform vec2 uRes;
uniform float uSky;
uniform float uDense;
uniform float uTime;
uniform float uMax;
uniform float uHorizon;
void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  // céu: grafite em cima, prata no horizonte (só no fim do voo)
  float up = clamp((uv.y - uHorizon) * 1.6, 0.0, 1.0);
  vec3 sky = mix(vec3(0.6, 0.61, 0.62), vec3(0.07, 0.072, 0.075), pow(up, 0.5));
  float a = uSky * smoothstep(uHorizon - 0.15, uHorizon + 0.05, uv.y);
  vec3 c = sky * a;
  // dentro da nuvem: véu claro e difuso
  float n = 0.5 + 0.5 * sin(uv.x * 5.0 + uTime * 0.4) * sin(uv.y * 4.0 - uTime * 0.3);
  float veil = uDense * (0.75 + 0.25 * n) * 0.85;
  c = mix(c, vec3(0.86, 0.87, 0.88) * veil, veil);
  a = max(a, veil);
  gl_FragColor = vec4(min(c, vec3(uMax)), a);
}`;

const VEIL_FRAG = /* glsl */ `
uniform float uDense;
uniform float uMax;
void main() {
  float a = uDense * 0.55;
  gl_FragColor = vec4(vec3(min(0.86, uMax)) * a, a);
}`;

function Sprites({ progressRef, still, count }: { progressRef: RefObject<number>; still: boolean; count: number }) {
  const getThree = useThree((s) => s.get);
  const mesh = useRef<InstancedMesh>(null);
  const bg = useRef<Mesh>(null);
  const veil = useRef<Mesh>(null);
  const tex = useMemo(() => puffTexture(), []);
  const quad = useMemo(() => new PlaneGeometry(2, 2), []);
  const SPAN = 64;
  const { geometry, material } = useMemo(() => {
    const g = new PlaneGeometry(1, 1);
    const puff = new Float32Array(count * 4);
    const seed = new Float32Array(count * 2);
    let s = 7;
    const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    const list = Array.from({ length: count }, (_, i) => {
      const upper = i % 4 === 0; // 1 em 4 na camada fina de cima
      return {
        x: (rnd() - 0.5) * SPAN,
        y: upper ? 3.3 + rnd() * 1.4 : -1.1 + rnd() * 2.9,
        z: -2 - Math.pow(rnd(), 1.2) * 34,
        s: upper ? 2.2 + rnd() * 2.2 : 3.5 + rnd() * 4.5,
        a: rnd(),
        b: rnd(),
      };
    });
    // ordem de desenho de trás para a frente (a câmera sempre olha para -Z e
    // só anda em X: a profundidade de cada puff é o próprio z)
    list.sort((p, q) => p.z - q.z);
    list.forEach((p, i) => {
      puff.set([p.x, p.y, p.z, p.s], i * 4);
      seed.set([p.a, p.b], i * 2);
    });
    g.setAttribute("aPuff", new InstancedBufferAttribute(puff, 4));
    g.setAttribute("aSeed", new InstancedBufferAttribute(seed, 2));
    const m = new ShaderMaterial({
      vertexShader: SPRITE_VERT,
      fragmentShader: SPRITE_FRAG,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      premultipliedAlpha: true,
      uniforms: { uTex: { value: tex }, uCamX: { value: 0 }, uSpan: { value: SPAN }, uSky: { value: 0 }, uMax: { value: MAX_BRIGHT } },
    });
    return { geometry: g, material: m };
  }, [count, tex]);
  const bgMat = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: VOL_VERT,
        fragmentShader: BG_FRAG,
        depthTest: false,
        depthWrite: false,
        transparent: true,
        premultipliedAlpha: true,
        uniforms: { uRes: { value: new Vector2(1, 1) }, uSky: { value: 0 }, uDense: { value: 0 }, uTime: { value: 0 }, uMax: { value: MAX_BRIGHT }, uHorizon: { value: 0.5 } },
      }),
    [],
  );
  const veilMat = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: VOL_VERT,
        fragmentShader: VEIL_FRAG,
        depthTest: false,
        depthWrite: false,
        transparent: true,
        premultipliedAlpha: true,
        uniforms: { uDense: { value: 0 }, uMax: { value: MAX_BRIGHT } },
      }),
    [],
  );
  useEffect(
    () => () => {
      [geometry, quad].forEach((g) => g.dispose());
      [material, bgMat, veilMat].forEach((m) => m.dispose());
      tex.dispose();
    },
    [geometry, material, bgMat, veilMat, quad, tex],
  );
  const st = useRef({ time: 0, p: -1, tilt: new Vector2() });

  useFrame(({ gl }, delta) => {
    const dt = Math.min(delta, 0.05) * motionScale();
    const s = st.current;
    if (!still) s.time += dt;
    const target = still ? 1 : clamp01(progressRef.current ?? 0);
    s.p = s.p < 0 || still ? target : s.p + (target - s.p) * (1 - Math.exp(-dt * 3));
    const f = flight(s.p, s.time, still, s.tilt);
    const cam = getThree().camera as PerspectiveCamera;
    // tela em pé: campo de visão vertical maior
    const fov = cam.aspect < 1 ? 64 : 50;
    if (cam.fov !== fov) {
      cam.fov = fov;
      cam.updateProjectionMatrix();
    }
    cam.position.set(f.x, f.y, f.z);
    cam.rotation.set(f.pitch, f.yaw, f.roll, "YXZ");
    cam.updateMatrixWorld();
    // materiais pelos refs das malhas (as regras do React Compiler não deixam mutar o useMemo)
    const sm = mesh.current?.material;
    const bm = bg.current?.material;
    const vm = veil.current?.material;
    if (!(sm instanceof ShaderMaterial) || !(bm instanceof ShaderMaterial) || !(vm instanceof ShaderMaterial)) return;
    sm.uniforms.uCamX.value = f.x;
    sm.uniforms.uSky.value = f.sky;
    const bu = bm.uniforms;
    gl.getDrawingBufferSize(bu.uRes.value);
    bu.uSky.value = f.sky;
    bu.uDense.value = f.dense;
    bu.uTime.value = s.time;
    // linha do horizonte na tela (y = altura da câmera vista com a arfagem)
    bu.uHorizon.value = clamp01(0.5 + Math.tan(-f.pitch) / (2 * Math.tan((fov * Math.PI) / 360)) - 0.08);
    vm.uniforms.uDense.value = f.dense;
  });

  return (
    <>
      <mesh ref={bg} geometry={quad} material={bgMat} frustumCulled={false} renderOrder={-1} />
      <instancedMesh ref={mesh} args={[geometry, material, count]} frustumCulled={false} renderOrder={1} />
      <mesh ref={veil} geometry={quad} material={veilMat} frustumCulled={false} renderOrder={2} />
    </>
  );
}

/**
 * Aquecimento antes do 1º quadro: o raymarching é um shader pesado de compilar
 * (laços desenrolados); compilado em paralelo aqui, quando a cena monta (~1
 * tela antes da seção), e não no quadro em que a seção entra.
 */
function Warm({ onReady }: { onReady: () => void }) {
  const get = useThree((s) => s.get);
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
  return null;
}

export default function CloudScene({
  progressRef,
  pointerRef,
  active,
  light,
  reducedMotion,
  maxDpr = 1.5,
  onContextLost,
  link,
}: {
  progressRef: RefObject<number>;
  pointerRef: RefObject<{ x: number; y: number }>;
  active: boolean;
  /** Celular / nível low: billboards; senão, raymarching. */
  light: boolean;
  reducedMotion: boolean;
  /** Teto de DPR (no máximo 1,5 nas nuvens). */
  maxDpr?: number;
  /** Perda do contexto WebGL (o pai remonta a cena). */
  onContextLost?: () => void;
  /** Celular: troca pôster ↔ cena (SceneSwap). */
  link?: SceneLink;
}) {
  const dpr = Math.min(typeof window === "undefined" ? 1 : window.devicePixelRatio || 1, maxDpr, 1.5);
  const [ready, setReady] = useState(false);
  const handleReady = useCallback(() => setReady(true), []);
  /** Celular: para (depois de desacelerar) enquanto o dedo rola a página (lib/mobile). */
  const running = useMotionRunning();
  const frames = useSceneFrames(link);
  return (
    <Canvas
      aria-hidden="true"
      className="!pointer-events-none"
      // nenhum quadro antes do aquecimento (canvas transparente até lá)
      frameloop={
        !ready || frames.captured ? "never" : reducedMotion ? "demand" : (active && running) || frames.prime ? "always" : "never"
      }
      // raymarching em meia resolução (o CSS reescala); billboards na resolução da tela
      dpr={light ? dpr : dpr * 0.5}
      camera={{ fov: 50, near: 0.1, far: 80, position: [0, 2.45, 0] }}
      gl={{ antialias: false, alpha: true, powerPreference: "default", preserveDrawingBuffer: frames.preserve }}
    >
      <ContextLossWatcher onLost={onContextLost} />
      <FrameSignals link={link} onPrimed={frames.onPrimed} onCaptured={frames.onCaptured} />
      {light ? (
        <Sprites progressRef={progressRef} still={reducedMotion} count={120} />
      ) : (
        <Volume progressRef={progressRef} pointerRef={pointerRef} still={reducedMotion} steps={40} />
      )}
      <Warm onReady={handleReady} />
    </Canvas>
  );
}

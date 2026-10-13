import {
  AdditiveBlending,
  Box3,
  BufferAttribute,
  BufferGeometry,
  CatmullRomCurve3,
  CircleGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DirectionalLight,
  DoubleSide,
  FogExp2,
  Group,
  HemisphereLight,
  IcosahedronGeometry,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshDepthMaterial,
  MeshStandardMaterial,
  OrthographicCamera,
  PCFShadowMap,
  PerspectiveCamera,
  PlaneGeometry,
  Points,
  Quaternion,
  RGBADepthPacking,
  Scene,
  LinearFilter,
  ShaderMaterial,
  Sphere,
  Vector2,
  Vector3,
  WebGLRenderTarget,
  type WebGLRenderer,
} from "three";
import { mergeGeometries, mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";

/*
 * Descida aérea do Sobre: floresta densa (sem neve), monocromática com um
 * toque de verde musgo (#1C221D, #2A332B, #3B463C), troncos escuros, água
 * cinza-escura com brilhos frios.
 * - Terreno: planalto de floresta cortado por um rio que serpenteia até um
 *   penhasco; a cachoeira cai num poço e o rio segue abaixo. Altura em JS
 *   (height()), a mesma usada para pôr árvores, plantas, pedras e o urso.
 * - Rio e poço: água escura reflexiva (normais por ruído animado correndo para
 *   a queda), brilhos frios do sol, espuma no pé da queda.
 * - Cachoeira: folha curva com fluxo vertical (UV animado com ruído, faixas de
 *   espuma); névoa subindo na base e respingos (partículas).
 * - Floresta: 4 variações (2 coníferas, 2 de copa larga), copas se tocando.
 *   Em chunks de 60 m (frustum culling por grupo): perto da câmera, árvores 3D
 *   instanciadas; longe, IMPOSTORES (cartões com a textura da própria árvore
 *   renderizada em vista lateral e de cima, misturadas pelo ângulo da câmera).
 *   A troca acompanha a descida.
 * - Chão perto da cachoeira: samambaias, tufos de musgo e folhas secas
 *   (instanciados); pedras com limo na margem e sob o urso.
 * - Luz: sol filtrado entre as copas, raios de luz falsos (planos aditivos) e
 *   pólen flutuando (sem raios no modo leve); névoa leve na descida e na base
 *   da queda.
 * - Câmera numa curva: do alto (~85° para baixo) seguindo o rio até a
 *   cachoeira (~45°), com o urso em pé numa pedra no alto da queda, de lado,
 *   olhando a água caindo.
 * - Urso: public/modelos/urso/urso.glb ("Realistic Grizzly Bear" por 3Dima,
 *   CC BY 4.0; Meshopt + WebP). Modelo ESTÁTICO (sem esqueleto/animação): a
 *   vida vem do vertex shader (respiração no tronco, cabeça girando devagar,
 *   pelo das costas ondulando), com máscaras suaves no espaço do modelo
 *   (cabeça para +Z, Y para cima, comprimento 1; medido no arquivo).
 * - Sombras (desktop): mapa de 1024, estático, só do urso, das pedras e das
 *   árvores 3D perto dele.
 */

// ------------------------------------------------------------------ geografia
const PLATEAU = 14; // planalto (rio de cima)
const WATER_UP = PLATEAU - 1.2; // nível do rio de cima
const WATER_LOW = -0.8; // nível do poço e do rio de baixo
const POOL_Z = 15;
const POOL_R = 13;
const X0 = -170;
const X1 = 170;
const Z0 = -260;
const Z1 = 90;

/** Curso do rio de cima (z ≤ 0) e de baixo (depois do poço). */
export function riverX(z: number) {
  if (z <= 0) return 16 * Math.sin(z * 0.017) + 5 * Math.sin(z * 0.046 + 1.3);
  const fx = 5 * Math.sin(1.3);
  return z < POOL_Z ? fx : fx + 8 * Math.sin((z - POOL_Z) * 0.04);
}
const FALL_X = riverX(0);

function hash(x: number, y: number) {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
}
function vnoise(x: number, y: number) {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  const a = hash(ix, iy);
  const b = hash(ix + 1, iy);
  const c = hash(ix, iy + 1);
  const d = hash(ix + 1, iy + 1);
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}
function fbm(x: number, y: number, oct = 4) {
  let v = 0;
  let a = 0.5;
  for (let i = 0; i < oct; i++) {
    v += a * vnoise(x, y);
    x *= 2.03;
    y *= 2.03;
    a *= 0.5;
  }
  return v;
}
const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(Math.max((x - a) / (b - a), 0), 1);
  return t * t * (3 - 2 * t);
};

/** Altura do terreno. */
export function height(x: number, z: number) {
  const dx = Math.abs(x - riverX(z));
  // planalto (z < 0) → degrau do penhasco → baixada (z > 7)
  const step = smooth(-1, 7, z);
  let h = PLATEAU * (1 - step);
  // colinas que sobem para longe do rio (vale), com ruído
  const valley = smooth(7, 40, dx);
  h += valley * (6 + fbm(x * 0.018, z * 0.018) * 16) + fbm(x * 0.07, z * 0.07, 3) * 1.2;
  // leito do rio (em cima e embaixo)
  h -= 2.4 * (1 - smooth(3.5, 9, dx));
  // poço da cachoeira
  const dp = Math.hypot(x - FALL_X, z - POOL_Z);
  if (z > 1) h = Math.min(h, WATER_LOW - 1.6 + smooth(POOL_R - 4, POOL_R + 4, dp) * 3.6 + Math.max(h, 0) * smooth(POOL_R, POOL_R + 10, dp));
  // face do penhasco com rocha irregular
  h += (fbm(x * 0.3, z * 0.3, 2) - 0.5) * 1.6 * smooth(-2, 1, z) * (1 - smooth(5, 8, z));
  return h;
}

// pedra do urso: na beira do penhasco, ao lado da boca da cachoeira
const ROCK_BASE = new Vector3(FALL_X + 7.2, 0, -1.2);
ROCK_BASE.y = height(ROCK_BASE.x, ROCK_BASE.z);
/** Topo da pedra (onde o urso fica em pé). */
const ROCK = ROCK_BASE.clone().setY(ROCK_BASE.y + 1.25);
/** Para onde o urso olha: a água caindo. */
const FALL_FOCUS = new Vector3(FALL_X, 7, 3);
/** Comprimento do urso (m). */
const BEAR_LENGTH = 2.2;
// câmera final: de lado para o urso (perpendicular ao olhar dele), ~45° para baixo
const TO_FALL = new Vector3().subVectors(FALL_FOCUS, ROCK).setY(0).normalize();
const SIDE = new Vector3(TO_FALL.z, 0, -TO_FALL.x);
if (SIDE.z < 0) SIDE.negate(); // do lado de baixo do rio: a queda aparece de frente
const END_CAM = ROCK.clone().addScaledVector(SIDE, 13).add(new Vector3(0, 14, 0));
// close final (últimos ~30% da seção): a câmera continua se aproximando e faz
// um arco em volta do urso, da vista lateral (90° do focinho) até 3/4 de frente
// (~40°), um pouco abaixo dos olhos, olhando levemente para cima
/** Início do trecho do close no progresso da seção. */
const CLOSE_AT = 0.7;
const CLOSE_ANGLE = (40 * Math.PI) / 180;
/** Distância final até a cabeça (m): cabeça e ombros com ~45% da altura da tela (fov 45°). */
const CLOSE_DIST = 2.5;
/** Cabeça estimada (antes do modelo carregar): à frente e no alto do corpo. */
const HEAD_GUESS = ROCK.clone().addScaledVector(TO_FALL, 0.9).add(new Vector3(0, 0.95, 0));
/** Giro máximo da cabeça para a câmera (rad), para a máscara não deformar o pescoço. */
const LOOK_YAW_MAX = 0.3;
const LOOK_PITCH_MAX = 0.12;
/** Ciclo do olhar (s): vira em 1,2, olha 2, volta em 1,4; repete a cada 10. */
const LOOK_TURN = 1.2;
const LOOK_HOLD = 2;
const LOOK_BACK = 1.4;
const LOOK_EVERY = 10;
const easeInOut = (x: number) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);

/** Pé da cachoeira (impacto no poço): espuma e névoa. */
const FALL_FOOT = new Vector2(FALL_X, 7.6);

// paleta: verdes muito escuros e dessaturados, troncos escuros
const CANOPY = [new Color(0x1c221d), new Color(0x2a332b), new Color(0x3b463c)];
const TRUNK = new Color(0x13120f);
const FOG = new Color(0x3a423c);
/** A cor da névoa em sRGB: os shaders próprios (água, queda, partículas) escrevem a cor sem conversão. */
const FOG_SRGB = FOG.clone().convertLinearToSRGB();

// ------------------------------------------------------------------ shaders
const NOISE_GLSL = /* glsl */ `
  float a_hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float a_noise(vec2 p) {
    vec2 i = floor(p); vec2 f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(a_hash(i), a_hash(i + vec2(1, 0)), u.x), mix(a_hash(i + vec2(0, 1)), a_hash(i + vec2(1, 1)), u.x), u.y);
  }
`;

const WATER_VERT = /* glsl */ `
  varying vec3 vW;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    vec4 w = modelMatrix * vec4(position, 1.0);
    vW = w.xyz;
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`;
const WATER_FRAG = /* glsl */ `
  uniform float uTime;
  uniform vec3 uSun;
  uniform vec3 uSky;
  uniform vec3 uFogColor;
  uniform float uFogDensity;
  uniform float uPool;      // 1: poço (fluxo radial a partir da queda)
  uniform vec2 uFall;       // ponto de impacto (xz)
  varying vec3 vW;
  varying vec2 vUv;
  ${NOISE_GLSL}
  void main() {
    // direção do fluxo: ao longo do rio (v), ou radial no poço
    vec2 flowUv = uPool > 0.5 ? vec2(atan(vW.z - uFall.y, vW.x - uFall.x) * 3.0, length(vW.xz - uFall)) : vec2(vUv.x * 4.0, vUv.y);
    float t = uTime;
    float n1 = a_noise(flowUv * vec2(2.0, 0.6) - vec2(0.0, t * 1.4));
    float n2 = a_noise(flowUv * vec2(5.0, 1.6) - vec2(0.0, t * 2.3) + 7.0);
    vec3 nrm = normalize(vec3((n1 - 0.5) * 0.35 + (n2 - 0.5) * 0.18, 1.0, (n2 - 0.5) * 0.3));
    vec3 V = normalize(cameraPosition - vW);
    float fres = pow(1.0 - max(dot(nrm, V), 0.0), 4.0);
    vec3 col = vec3(0.05, 0.056, 0.058);
    col = mix(col, uSky, 0.05 + 0.32 * fres);
    // brilhos frios do sol
    vec3 R = reflect(-V, nrm);
    col += vec3(0.85, 0.9, 0.95) * pow(max(dot(R, uSun), 0.0), 140.0) * 1.3;
    // espuma perto da queda (poço)
    float foam = 0.0;
    if (uPool > 0.5) {
      float d = length(vW.xz - uFall);
      foam = (1.0 - smoothstep(1.5, 9.0, d)) * smoothstep(0.35, 0.8, a_noise(vW.xz * 0.9 + t * vec2(0.3, 0.6)));
    }
    col = mix(col, vec3(0.82, 0.85, 0.86), foam * 0.75);
    float fd = length(cameraPosition - vW) * uFogDensity;
    col = mix(col, uFogColor, 1.0 - exp(-fd * fd));
    gl_FragColor = vec4(col, 1.0);
  }
`;

const FALL_FRAG = /* glsl */ `
  uniform float uTime;
  uniform vec3 uFogColor;
  uniform float uFogDensity;
  varying vec3 vW;
  varying vec2 vUv;
  ${NOISE_GLSL}
  void main() {
    // fluxo vertical: vUv.y = 0 no topo, 1 embaixo
    float t = uTime;
    float streak = a_noise(vec2(vUv.x * 26.0, vUv.y * 3.0 - t * 2.4));
    float fine = a_noise(vec2(vUv.x * 70.0, vUv.y * 9.0 - t * 4.0));
    float foam = smoothstep(0.45, 0.85, streak * 0.7 + fine * 0.4) + smoothstep(0.55, 1.0, vUv.y) * 0.6;
    vec3 col = mix(vec3(0.14, 0.15, 0.155), vec3(0.85, 0.87, 0.88), clamp(foam, 0.0, 1.0));
    float side = smoothstep(0.0, 0.12, vUv.x) * smoothstep(1.0, 0.88, vUv.x);
    float a = (0.55 + 0.45 * foam) * side * smoothstep(0.0, 0.04, vUv.y);
    float fd = length(cameraPosition - vW) * uFogDensity;
    col = mix(col, uFogColor, 1.0 - exp(-fd * fd));
    gl_FragColor = vec4(col, a);
  }
`;

/** Partículas: 0 = pólen/poeira flutuando perto da cachoeira; 1 = névoa da queda. */
const PARTICLE_VERT = /* glsl */ `
  attribute float aSize;
  attribute float aSeed;
  uniform float uTime;
  uniform float uDpr;
  uniform float uMode;
  uniform vec3 uOrigin;
  varying float vA;
  void main() {
    vec3 p;
    if (uMode < 0.5) {
      // pólen: deriva lenta numa caixa em volta da cachoeira, cintilando nos raios
      vec3 box = vec3(80.0, 26.0, 80.0);
      p = position + vec3(sin(uTime * 0.21 + aSeed * 6.28) * 1.5, uTime * (0.12 + aSeed * 0.15), cos(uTime * 0.17 + aSeed * 4.0) * 1.5);
      p = mod(p + box * 0.5, box) - box * 0.5 + uOrigin;
      vA = (0.35 + 0.65 * (0.5 + 0.5 * sin(uTime * 1.3 + aSeed * 30.0))) * 0.55;
    } else {
      // névoa: sobe e se abre a partir do pé da queda, em ciclos
      float life = fract(uTime * (0.07 + aSeed * 0.05) + aSeed);
      p = uOrigin + position * (0.6 + life * 1.4) + vec3(0.0, life * 7.0, life * 2.5);
      vA = sin(3.14159 * life) * 0.45;
    }
    vec4 mv = viewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = clamp(aSize * uDpr * 40.0 / -mv.z, 1.0, 180.0);
  }
`;
const PARTICLE_FRAG = /* glsl */ `
  uniform float uSoft;
  uniform vec3 uTint;
  varying float vA;
  void main() {
    float d = length(gl_PointCoord - 0.5) * 2.0;
    float a = mix(smoothstep(1.0, 0.3, d), exp(-d * d * 3.0), uSoft) * vA;
    if (a < 0.004) discard;
    gl_FragColor = vec4(uTint * a, a);
  }
`;

/** Raios de luz falsos: faixas aditivas ao longo da direção do sol, de frente para a câmera. */
const RAY_VERT = /* glsl */ `
  attribute vec3 aCenter;
  attribute vec2 aSize;
  attribute float aSeed;
  uniform vec3 uSun;
  varying vec2 vUv;
  varying float vSeed;
  varying float vNear;
  void main() {
    vec3 axis = normalize(uSun);
    // some quando a câmera chega perto (o close do urso passa entre os raios)
    vNear = smoothstep(4.0, 12.0, length(cameraPosition - aCenter));
    vec3 toCam = normalize(cameraPosition - aCenter);
    vec3 right = normalize(cross(axis, toCam));
    vec3 p = aCenter + axis * position.y * aSize.y + right * position.x * aSize.x;
    vUv = uv;
    vSeed = aSeed;
    gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
  }
`;
const RAY_FRAG = /* glsl */ `
  uniform float uTime;
  varying vec2 vUv;
  varying float vSeed;
  varying float vNear;
  void main() {
    float along = smoothstep(0.0, 0.3, vUv.y) * smoothstep(1.0, 0.55, vUv.y);
    float across = exp(-pow((vUv.x - 0.5) * 3.4, 2.0));
    float flick = 0.7 + 0.3 * sin(uTime * 0.35 + vSeed * 6.28);
    float a = along * across * flick * 0.11 * vNear;
    gl_FragColor = vec4(vec3(0.86, 0.88, 0.8) * a, a);
  }
`;

/** Cabeça do urso (material e sombra): máscara no espaço do modelo e giro em volta do pescoço. */
const BEAR_HEAD_GLSL = /* glsl */ `
  uniform float uTime;
  uniform float uLookYaw;
  uniform float uLookPitch;
  uniform float uLookAmt;
  mat3 bear_rotY(float a) { float c = cos(a), s = sin(a); return mat3(c, 0.0, -s, 0.0, 1.0, 0.0, s, 0.0, c); }
  mat3 bear_rotX(float a) { float c = cos(a), s = sin(a); return mat3(1.0, 0.0, 0.0, 0.0, c, s, 0.0, -s, c); }
  // cabeça e pescoço: à frente das patas dianteiras e acima delas
  float bear_headMask(vec3 p) { return smoothstep(0.13, 0.26, p.z) * smoothstep(-0.05, 0.06, p.y); }
  mat3 bear_headRot() {
    float yaw = (sin(uTime * 0.23) * 0.6 + sin(uTime * 0.097 + 1.7) * 0.4) * 0.105;
    float pitch = (sin(uTime * 0.17 + 0.4) * 0.55 + sin(uTime * 0.061 + 2.0) * 0.45) * 0.052;
    return bear_rotY(yaw * (1.0 - uLookAmt)) * bear_rotX(pitch * (1.0 - uLookAmt));
  }
  // olhar para a câmera (close): o giro se distribui pelo pescoço inteiro, dos
  // ombros à cabeça (transição longa, sem esticar a malha); patas de fora
  float bear_lookMask(vec3 p) { return smoothstep(0.0, 0.3, p.z) * smoothstep(-0.1, 0.06, p.y); }
  mat3 bear_lookRot() { return bear_rotY(uLookYaw * uLookAmt) * bear_rotX(uLookPitch * uLookAmt); }
  const vec3 bear_lookPivot = vec3(0.0, 0.08, 0.04);
  vec3 bear_look(vec3 p, vec3 rest) { return mix(p, bear_lookRot() * (p - bear_lookPivot) + bear_lookPivot, bear_lookMask(rest)); }
`;

/** Impostores: cartão de frente para a câmera com a árvore em vista lateral ou de cima. */
const IMPOSTOR_VERT = /* glsl */ `
  attribute vec3 aPos;
  attribute float aScale;
  attribute float aVar;
  attribute float aRot;
  attribute float aShade;
  uniform float uSide[4];
  uniform float uTop[4];
  uniform float uHeight[4];
  varying vec2 vUv;
  varying float vTop;
  varying float vVar;
  varying float vRot;
  varying float vShade;
  varying vec3 vW;
  void main() {
    int vi = int(aVar + 0.5);
    float S = uSide[vi] * aScale;
    float T = uTop[vi] * aScale;
    float H = uHeight[vi] * aScale;
    vec3 sideC = aPos + vec3(0.0, S * 0.5, 0.0);
    vec3 d = normalize(sideC - cameraPosition);
    float top = smoothstep(0.5, 0.85, -d.y); // olhando de cima: vista de cima
    vec3 c = mix(sideC, aPos + vec3(0.0, H * 0.8, 0.0), top);
    float size = mix(S, T, top);
    vec3 right = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
    vec3 up = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
    vec3 p = c + (right * position.x + up * position.y) * size;
    vUv = uv;
    vTop = top;
    vVar = aVar;
    vRot = aRot;
    vShade = aShade;
    vW = p;
    gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
  }
`;
const IMPOSTOR_FRAG = /* glsl */ `
  uniform sampler2D uAtlas;
  uniform float uPad;
  uniform vec3 uFogColor;
  uniform float uFogDensity;
  varying vec2 vUv;
  varying float vTop;
  varying float vVar;
  varying float vRot;
  varying float vShade;
  varying vec3 vW;
  void main() {
    // atlas: 4 colunas (variações); metade de cima = vista lateral, de baixo = de cima
    // cada quadro tem margem (uPad): o cartão usa só a área interna
    vec2 q = uPad + vUv * (1.0 - 2.0 * uPad);
    vec2 uvS = vec2((vVar + q.x) / 4.0, 0.5 + q.y * 0.5);
    vec2 r = vUv - 0.5;
    float cs = cos(vRot), sn = sin(vRot);
    vec2 rr = uPad + clamp(vec2(cs * r.x - sn * r.y, sn * r.x + cs * r.y) + 0.5, 0.0, 1.0) * (1.0 - 2.0 * uPad);
    vec2 uvT = vec2((vVar + rr.x) / 4.0, rr.y * 0.5);
    vec4 c = mix(texture2D(uAtlas, uvS), texture2D(uAtlas, uvT), vTop);
    if (c.a < 0.45) discard;
    vec3 col = c.rgb / max(c.a, 0.001) * vShade;
    float fd = length(cameraPosition - vW) * uFogDensity;
    col = mix(col, uFogColor, 1.0 - exp(-fd * fd));
    gl_FragColor = linearToOutputTexel(vec4(col, 1.0));
  }
`;

// ------------------------------------------------------------------ modelos
type Rand = () => number;
function seeded(seed: number): Rand {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const paint = (g: BufferGeometry, fn: (y: number, ny: number, i: number) => Color) => {
  const pos = g.getAttribute("position");
  const nrm = g.getAttribute("normal");
  const col = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const c = fn(pos.getY(i), nrm ? nrm.getY(i) : 0, i);
    col.set([c.r, c.g, c.b], i * 3);
  }
  g.setAttribute("color", new BufferAttribute(col, 3));
};

type TreeDef = { geo: BufferGeometry; h: number; r: number };

/** Conífera: camadas de cones irregulares (sem neve) + tronco. */
function conifer(seed: number, H: number, R: number, layers: number, seg: number): TreeDef {
  const rand = seeded(seed);
  const parts: BufferGeometry[] = [];
  for (let i = 0; i < layers; i++) {
    const f = i / layers;
    const r = R * (1 - f * 0.8) * (0.9 + rand() * 0.2);
    const h = H * 0.36 * (1 - f * 0.35);
    const g = new ConeGeometry(r, h, seg, 2, true);
    const gp = g.getAttribute("position");
    for (let v = 0; v < gp.count; v++) {
      if (gp.getY(v) > -h / 2 + 0.01) continue;
      const k = 0.78 + rand() * 0.44;
      gp.setXYZ(v, gp.getX(v) * k, gp.getY(v) - rand() * 0.4, gp.getZ(v) * k);
    }
    g.translate(0, H * 0.24 + f * H * 0.62 + h / 2, 0);
    g.computeVertexNormals();
    const base = CANOPY[0].clone().lerp(CANOPY[1], rand() * 0.8);
    const top = H * 0.24 + f * H * 0.62 + h;
    paint(g, (y) => base.clone().lerp(CANOPY[2], smooth(top - h * 0.6, top, y) * 0.7));
    parts.push(g);
  }
  const trunk = new CylinderGeometry(0.2, 0.34, H * 0.32, 6, 1, true);
  trunk.translate(0, H * 0.16, 0);
  paint(trunk, () => TRUNK);
  parts.push(trunk);
  parts.forEach((p) => p.deleteAttribute("uv"));
  const geo = mergeGeometries(parts)!;
  geo.computeVertexNormals();
  parts.forEach((p) => p.dispose());
  return { geo, h: H, r: R };
}

/** Árvore de copa larga: tronco + blocos de folhagem fundidos. */
function broadleaf(seed: number, H: number, R: number, blobs: number, detail: number, flat: number): TreeDef {
  const rand = seeded(seed);
  const parts: BufferGeometry[] = [];
  const trunk = new CylinderGeometry(0.22, 0.42, H * 0.55, 6, 1, true).toNonIndexed();
  trunk.translate(0, H * 0.27, 0);
  paint(trunk, () => TRUNK);
  parts.push(trunk);
  for (let i = 0; i < blobs; i++) {
    const a = (i / blobs) * Math.PI * 2 + rand() * 0.6;
    const d = i === 0 ? 0 : R * (0.35 + rand() * 0.3);
    const br = R * (0.42 + rand() * 0.2);
    const g = new IcosahedronGeometry(1, detail);
    const gp = g.getAttribute("position");
    for (let v = 0; v < gp.count; v++) {
      const k = 0.85 + hash(gp.getX(v) * 13 + i, gp.getZ(v) * 7 + gp.getY(v) * 5) * 0.3;
      gp.setXYZ(v, gp.getX(v) * k, gp.getY(v) * k, gp.getZ(v) * k);
    }
    g.scale(br, br * flat, br);
    g.translate(Math.cos(a) * d, H * (0.62 + rand() * 0.22), Math.sin(a) * d);
    g.computeVertexNormals();
    const base = CANOPY[1].clone().lerp(CANOPY[i % 2 ? 0 : 2], rand() * 0.6);
    paint(g, (_y, ny) => base.clone().lerp(CANOPY[2], smooth(0.2, 0.9, ny) * 0.55));
    parts.push(g);
  }
  parts.forEach((p) => p.deleteAttribute("uv"));
  const merged = mergeGeometries(parts)!;
  parts.forEach((p) => p.dispose());
  const geo = mergeVertices(merged); // vértices compartilhados: sombreamento suave
  merged.dispose();
  geo.computeVertexNormals();
  return { geo, h: H, r: R };
}

/** Pedra irregular com limo por cima. */
function rockGeometry(seed: number, detail: number) {
  const rand = seeded(seed);
  const g = new IcosahedronGeometry(1, detail);
  const pos = g.getAttribute("position");
  const map = new Map<string, number>();
  for (let v = 0; v < pos.count; v++) {
    const key = `${pos.getX(v).toFixed(3)},${pos.getY(v).toFixed(3)},${pos.getZ(v).toFixed(3)}`;
    if (!map.has(key)) map.set(key, 0.78 + rand() * 0.42);
    const s = map.get(key)!;
    pos.setXYZ(v, pos.getX(v) * s, pos.getY(v) * s * 0.75, pos.getZ(v) * s);
  }
  g.computeVertexNormals();
  const stone = new Color(0.2, 0.205, 0.2);
  const moss = new Color(0.13, 0.17, 0.13);
  paint(g, (_y, ny) => stone.clone().lerp(moss, smooth(0.3, 0.75, ny)));
  return g;
}

/** Samambaia: folhas finas abertas em leque. */
function fernGeometry() {
  const parts: BufferGeometry[] = [];
  for (let i = 0; i < 6; i++) {
    const g = new PlaneGeometry(0.12, 0.8, 1, 2);
    g.translate(0, 0.4, 0);
    g.rotateX(-0.75 - (i % 2) * 0.25);
    g.rotateY((i / 6) * Math.PI * 2 + (i % 3) * 0.2);
    parts.push(g);
  }
  const geo = mergeGeometries(parts)!;
  parts.forEach((p) => p.dispose());
  geo.computeVertexNormals();
  paint(geo, (y) => CANOPY[0].clone().lerp(CANOPY[1], smooth(0, 0.5, y)));
  return geo;
}

// ------------------------------------------------------------------ mundo
const tmpM = new Matrix4();
const tmpQ = new Quaternion();
const tmpP = new Vector3();
const tmpS = new Vector3();
const tmpC = new Color();
const UP = new Vector3(0, 1, 0);
/** Tamanho do chunk (m). */
const CHUNK = 60;
/** Margem interna de cada quadro do atlas (fração): sem vazar o quadro vizinho. */
const ATLAS_PAD = 0.06;

type Chunk = { center: Vector3; meshes: InstancedMesh[]; impostor: Mesh; near: boolean; shadow: boolean };

export class AerialWorld {
  readonly root = new Group();
  private uniforms = {
    uTime: { value: 0 },
    uSun: { value: new Vector3(-0.55, 0.62, -0.55).normalize() },
    uSky: { value: new Vector3(0.3, 0.34, 0.32) },
    uFogColor: { value: new Vector3(FOG_SRGB.r, FOG_SRGB.g, FOG_SRGB.b) },
    uFogDensity: { value: 0.0025 },
  };
  private fog = new FogExp2(FOG.getHex(), 0.0025);
  private sun!: DirectionalLight;
  private mats: (ShaderMaterial | MeshStandardMaterial | MeshDepthMaterial)[] = [];
  private geos: BufferGeometry[] = [];
  private pollenMat: ShaderMaterial | null = null;
  private mistMat: ShaderMaterial | null = null;
  private atlas: WebGLRenderTarget | null = null;
  private chunks: Chunk[] = [];
  private camPath!: CatmullRomCurve3;
  private lookPath!: CatmullRomCurve3;
  private cam = new Vector3();
  private look = new Vector3();
  private camT = new Vector3();
  private lookT = new Vector3();
  private time = 0;
  private bear: Group | null = null;
  /** Centro da cabeça no espaço do modelo normalizado e no mundo. */
  private headLocal = new Vector3(0, 0.1, 0.4);
  private head = HEAD_GUESS.clone();
  /** Uniforms do urso no close: olhar para a câmera e luz do close. */
  private bearU = {
    uLookYaw: { value: 0 },
    uLookPitch: { value: 0 },
    uLookAmt: { value: 0 },
    uClose: { value: 0 },
  };
  /** Relógio do ciclo do olhar (< 0: esperando o enquadramento final). */
  private lookClock = -1;
  private closeV = { dir: new Vector3(), arc: new Vector3(), right: new Vector3(), look: new Vector3() };
  /** Cabeça usada no enquadramento: meio do caminho entre parada e virada para a câmera. */
  private frameHead = HEAD_GUESS.clone();
  private rotM = new Matrix4();
  private lookAmt = 0;
  /** Profundidade de campo do close (0..1) e o foco na tela (uv): lidos pela cena. */
  readonly dof = { amount: 0, focus: new Vector2(0.3, 0.55) };
  private shadowFrames = 0;
  private disposed = false;
  private gl: WebGLRenderer | null = null;
  private building: Promise<void> | null = null;

  constructor(private light: boolean) {}

  attach(scene: Scene, gl: WebGLRenderer) {
    this.gl = gl;
    scene.fog = this.fog;
    scene.background = FOG.clone();
    gl.shadowMap.enabled = !this.light;
    gl.shadowMap.type = PCFShadowMap;
    gl.shadowMap.autoUpdate = false; // cena estática: o mapa só é refeito quando algo entra
    gl.shadowMap.needsUpdate = true;
  }

  /**
   * Monta o mundo em pedaços (cede a vez ao navegador entre eles), para não
   * travar a rolagem ao entrar perto da seção. Antes do 1º quadro; uma vez só.
   */
  build() {
    this.building ??= this.assemble();
    return this.building;
  }

  private async assemble() {
    let last = performance.now();
    /** Cede a vez quando o pedaço atual passou de ~8 ms. */
    const breathe = async () => {
      if (performance.now() - last < 8) return;
      await new Promise((r) => setTimeout(r, 0));
      last = performance.now();
    };
    const light = this.light;
    const rand = seeded(42);

    // luz: céu esverdeado-acinzentado + sol filtrado; sombras só no desktop
    const hemi = new HemisphereLight(0xc4ccc4, 0x161b17, 1.0);
    this.sun = new DirectionalLight(0xeeeee4, 1.55);
    this.sun.position.copy(ROCK).addScaledVector(this.uniforms.uSun.value, 80);
    this.sun.target.position.copy(ROCK);
    this.root.add(hemi, this.sun, this.sun.target);
    if (!light) {
      this.sun.castShadow = true;
      this.sun.shadow.mapSize.set(1024, 1024);
      const c = this.sun.shadow.camera;
      c.left = -32;
      c.right = 32;
      c.top = 32;
      c.bottom = -32;
      c.near = 20;
      c.far = 160;
      this.sun.shadow.bias = -0.0006;
      this.sun.shadow.normalBias = 0.05;
      this.sun.shadow.radius = 3;
    }

    // --- terreno: chão de floresta (musgo e folhas), rocha nas encostas ---
    const seg = light ? 120 : 200;
    const grid = new Float32Array((seg + 1) * (seg + 1));
    const hAt = (x: number, z: number) => {
      const gx = Math.min(Math.max(((x - X0) / (X1 - X0)) * seg, 0), seg - 1e-4);
      const gz = Math.min(Math.max(((z - Z0) / (Z1 - Z0)) * seg, 0), seg - 1e-4);
      const ix = Math.floor(gx);
      const iz = Math.floor(gz);
      const fx = gx - ix;
      const fz = gz - iz;
      const r = seg + 1;
      const a = grid[iz * r + ix];
      const b = grid[iz * r + ix + 1];
      const c = grid[(iz + 1) * r + ix];
      const d = grid[(iz + 1) * r + ix + 1];
      return a + (b - a) * fx + (c - a) * fz + (a - b - c + d) * fx * fz;
    };
    {
      const g = new PlaneGeometry(X1 - X0, Z1 - Z0, seg, seg);
      g.rotateX(-Math.PI / 2);
      g.translate((X0 + X1) / 2, 0, (Z0 + Z1) / 2);
      const pos = g.getAttribute("position");
      for (let i = 0; i < pos.count; i++) {
        if ((i & 511) === 0) await breathe();
        const y = height(pos.getX(i), pos.getZ(i));
        pos.setY(i, y);
        const ix = Math.round(((pos.getX(i) - X0) / (X1 - X0)) * seg);
        const iz = Math.round(((pos.getZ(i) - Z0) / (Z1 - Z0)) * seg);
        grid[iz * (seg + 1) + ix] = y;
      }
      g.computeVertexNormals();
      const nrm = g.getAttribute("normal");
      const col = new Float32Array(pos.count * 3);
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const z = pos.getZ(i);
        const steep = 1 - smooth(0.6, 0.85, nrm.getY(i));
        const leaves = smooth(0.45, 0.75, vnoise(x * 0.18, z * 0.18));
        const wet = 1 - smooth(4, 7, Math.abs(x - riverX(z)));
        // musgo escuro / folhas secas acinzentadas / rocha nas encostas / margem úmida
        let r = 0.095 + leaves * 0.05;
        let gg = 0.115 + leaves * 0.03;
        let b = 0.098 + leaves * 0.015;
        r += (0.19 - r) * steep;
        gg += (0.195 - gg) * steep;
        b += (0.19 - b) * steep;
        const k = 1 - wet * 0.45;
        col.set([r * k, gg * k, b * k], i * 3);
      }
      g.setAttribute("color", new BufferAttribute(col, 3));
      const m = new MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0 });
      const mesh = new Mesh(g, m);
      mesh.receiveShadow = !light;
      this.root.add(mesh);
      this.mats.push(m);
      this.geos.push(g);
    }

    // --- água: rio de cima, rio de baixo e poço ---
    const waterMat = (pool: boolean) => {
      const m = new ShaderMaterial({
        vertexShader: WATER_VERT,
        fragmentShader: WATER_FRAG,
        uniforms: { ...this.uniforms, uPool: { value: pool ? 1 : 0 }, uFall: { value: FALL_FOOT } },
        side: DoubleSide,
      });
      this.mats.push(m);
      return m;
    };
    const ribbon = (za: number, zb: number, y: number, width: number) => {
      const steps = Math.ceil((zb - za) / 2);
      const p: number[] = [];
      const uv: number[] = [];
      const idx: number[] = [];
      for (let i = 0; i <= steps; i++) {
        const z = za + ((zb - za) * i) / steps;
        const x = riverX(z);
        const tx = riverX(z + 0.5) - riverX(z - 0.5);
        const len = Math.hypot(tx, 1);
        const nx = 1 / len;
        const nz = -tx / len;
        for (const s of [-1, 1]) {
          p.push(x + (nx * s * width) / 2, y, z + (nz * s * width) / 2);
          uv.push(s < 0 ? 0 : 1, (z - za) * 0.08);
        }
        if (i < steps) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
      }
      const g = new BufferGeometry();
      g.setAttribute("position", new BufferAttribute(new Float32Array(p), 3));
      g.setAttribute("uv", new BufferAttribute(new Float32Array(uv), 2));
      g.setIndex(idx);
      this.geos.push(g);
      return g;
    };
    this.root.add(new Mesh(ribbon(Z0, 0.4, WATER_UP, 9), waterMat(false)));
    this.root.add(new Mesh(ribbon(POOL_Z + 8, Z1, WATER_LOW, 9), waterMat(false)));
    {
      const g = new CircleGeometry(POOL_R + 1, light ? 32 : 56);
      g.rotateX(-Math.PI / 2);
      this.geos.push(g);
      const pool = new Mesh(g, waterMat(true));
      pool.position.set(FALL_X, WATER_LOW, POOL_Z);
      this.root.add(pool);
    }

    // --- cachoeira: folha curva do alto do penhasco até o poço ---
    {
      const g = new PlaneGeometry(1, 1, 8, light ? 16 : 30);
      const pos = g.getAttribute("position");
      const uv = g.getAttribute("uv");
      for (let i = 0; i < pos.count; i++) {
        const u = pos.getX(i) + 0.5;
        const s = 1 - (pos.getY(i) + 0.5); // 0 no topo
        const w = 9 - s * 1.2;
        // avança para fora do penhasco ao cair (fica sempre à frente da rocha)
        pos.setXYZ(i, FALL_X + (u - 0.5) * w, WATER_UP + 0.1 - (WATER_UP - WATER_LOW + 0.2) * s, 0.3 + 7.5 * Math.pow(s, 1.2));
        uv.setXY(i, u, s);
      }
      g.computeVertexNormals();
      const m = new ShaderMaterial({
        vertexShader: WATER_VERT,
        fragmentShader: FALL_FRAG,
        uniforms: this.uniforms,
        transparent: true,
        depthWrite: false,
        side: DoubleSide,
      });
      this.mats.push(m);
      this.geos.push(g);
      this.root.add(new Mesh(g, m));
    }

    // --- partículas: névoa no pé da queda; pólen nos raios ---
    const particles = (n: number, mode: number, origin: Vector3, spread: (i: number) => [number, number, number], size: () => number, soft: number, tint: Color) => {
      const pos = new Float32Array(n * 3);
      const sz = new Float32Array(n);
      const seed = new Float32Array(n);
      for (let i = 0; i < n; i++) {
        pos.set(spread(i), i * 3);
        sz[i] = size();
        seed[i] = rand();
      }
      const g = new BufferGeometry();
      g.setAttribute("position", new BufferAttribute(pos, 3));
      g.setAttribute("aSize", new BufferAttribute(sz, 1));
      g.setAttribute("aSeed", new BufferAttribute(seed, 1));
      const m = new ShaderMaterial({
        vertexShader: PARTICLE_VERT,
        fragmentShader: PARTICLE_FRAG,
        uniforms: {
          uTime: this.uniforms.uTime,
          uDpr: { value: 1 },
          uMode: { value: mode },
          uOrigin: { value: origin },
          uSoft: { value: soft },
          uTint: { value: tint },
        },
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
      });
      const pts = new Points(g, m);
      pts.frustumCulled = false;
      this.geos.push(g);
      this.mats.push(m);
      this.root.add(pts);
      return m;
    };
    this.mistMat = particles(
      light ? 70 : 200,
      1,
      new Vector3(FALL_FOOT.x, WATER_LOW, FALL_FOOT.y - 1.5),
      () => [(rand() - 0.5) * 9, rand() * 1.5, (rand() - 0.2) * 5],
      () => 12 + rand() * 26,
      1,
      new Color(0.86, 0.88, 0.88),
    );
    this.pollenMat = particles(
      light ? 200 : 700,
      0,
      ROCK.clone().add(new Vector3(-4, 8, 6)),
      () => [(rand() - 0.5) * 80, (rand() - 0.5) * 26, (rand() - 0.5) * 80],
      () => 0.35 + rand() * 0.55,
      0,
      new Color(0.9, 0.9, 0.8),
    );

    // --- raios de sol entre as copas (só desktop) ---
    if (!light) {
      const n = 12;
      const center = new Float32Array(n * 3);
      const size = new Float32Array(n * 2);
      const seed = new Float32Array(n);
      for (let i = 0; i < n; i++) {
        const a = rand() * Math.PI * 2;
        const d = 6 + rand() * 30;
        const x = ROCK.x - 4 + Math.cos(a) * d;
        const z = ROCK.z + 6 + Math.sin(a) * d;
        center.set([x, hAt(x, z) + 9 + rand() * 6, z], i * 3);
        size.set([2.5 + rand() * 3.5, 34 + rand() * 18], i * 2);
        seed[i] = rand();
      }
      const g = new InstancedBufferGeometry();
      const quad = new PlaneGeometry(1, 1);
      g.index = quad.index;
      g.setAttribute("position", quad.getAttribute("position"));
      g.setAttribute("uv", quad.getAttribute("uv"));
      g.setAttribute("aCenter", new InstancedBufferAttribute(center, 3));
      g.setAttribute("aSize", new InstancedBufferAttribute(size, 2));
      g.setAttribute("aSeed", new InstancedBufferAttribute(seed, 1));
      g.instanceCount = n;
      g.boundingSphere = new Sphere(ROCK.clone(), 70);
      const m = new ShaderMaterial({
        vertexShader: RAY_VERT,
        fragmentShader: RAY_FRAG,
        uniforms: { uTime: this.uniforms.uTime, uSun: this.uniforms.uSun },
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        side: DoubleSide,
      });
      this.geos.push(g, quad);
      this.mats.push(m);
      this.root.add(new Mesh(g, m));
    }

    await breathe();

    // --- floresta: 4 variações, 3D perto e impostores longe, em chunks ---
    const defs: TreeDef[] = [
      conifer(101, 13, 3.1, 6, light ? 8 : 11),
      conifer(102, 10, 3.5, 5, light ? 8 : 11),
      broadleaf(103, 11, 4.3, 7, light ? 1 : 2, 0.82),
      broadleaf(104, 9, 4.9, 8, light ? 1 : 2, 0.68),
    ];
    defs.forEach((d) => this.geos.push(d.geo));
    const treeMat = new MeshStandardMaterial({ vertexColors: true, roughness: 0.92 });
    this.mats.push(treeMat);
    // tamanho dos quadros do atlas pela caixa real de cada árvore (a folhagem
    // das copas largas passa do raio nominal)
    const half = defs.map((d) => {
      d.geo.computeBoundingBox();
      const b = d.geo.boundingBox!;
      return Math.max(-b.min.x, b.max.x, -b.min.z, b.max.z);
    });
    const sideSize = defs.map((d, i) => Math.max(half[i] * 2, d.geo.boundingBox!.max.y) * 1.04);
    const topSize = half.map((h) => h * 2 * 1.06);
    this.atlas = this.bakeAtlas(defs, treeMat, sideSize, topSize);
    await breathe();

    const nx = Math.ceil((X1 - X0) / CHUNK);
    const nz = Math.ceil((Z1 - Z0) / CHUNK);
    type T = { x: number; y: number; z: number; v: number; s: number; rot: number; shade: number };
    const lists: T[][] = Array.from({ length: nx * nz }, () => []);
    const spacing = light ? 6 : 4.9;
    for (let gz = Z0 + 2; gz < Z1; gz += spacing) {
      await breathe();
      for (let gx = X0 + 2; gx < X1; gx += spacing) {
        const x = gx + (rand() - 0.5) * spacing * 0.9;
        const z = gz + (rand() - 0.5) * spacing * 0.9;
        if (Math.abs(x - riverX(z)) < 7.5) continue; // o rio abre caminho
        if (Math.hypot(x - FALL_X, z - POOL_Z) < POOL_R + 3) continue; // poço
        if (z > -3 && z < 8 && Math.abs(x - FALL_X) < 22) continue; // face do penhasco
        if (Math.hypot(x - ROCK.x, z - ROCK.z) < 6) continue; // em volta do urso
        if (Math.hypot(x - END_CAM.x, z - END_CAM.z) < 16) continue; // nada colado na câmera final
        if (vnoise(x * 0.02 + 9, z * 0.02) < 0.12) continue; // raras clareiras
        const y = hAt(x, z);
        const slope = Math.hypot(hAt(x + 1, z) - y, hAt(x, z + 1) - y);
        if (slope > 1.1) continue;
        // coníferas no alto, copas largas nas baixadas, misturadas
        const zone = vnoise(x * 0.012, z * 0.012) + (y - 10) * 0.012;
        const v = rand() < 0.5 + (zone - 0.5) * 0.9 ? (rand() < 0.5 ? 0 : 1) : rand() < 0.5 ? 2 : 3;
        // a variação de posição pode passar da borda: índice sempre dentro da grade
        const cx = Math.min(Math.max(Math.floor((x - X0) / CHUNK), 0), nx - 1);
        const cz = Math.min(Math.max(Math.floor((z - Z0) / CHUNK), 0), nz - 1);
        const ci = cx + cz * nx;
        lists[ci].push({ x, y: y - 0.3, z, v, s: 0.78 + rand() * 0.5, rot: rand() * Math.PI * 2, shade: 0.82 + rand() * 0.3 });
      }
    }

    const impostorMat = new ShaderMaterial({
      vertexShader: IMPOSTOR_VERT,
      fragmentShader: IMPOSTOR_FRAG,
      uniforms: {
        uAtlas: { value: this.atlas.texture },
        uPad: { value: ATLAS_PAD },
        uSide: { value: sideSize },
        uTop: { value: topSize },
        uHeight: { value: defs.map((d) => d.h) },
        // o impostor converte para a saída no fim: névoa em linear, como a da cena
        uFogColor: { value: new Vector3(FOG.r, FOG.g, FOG.b) },
        uFogDensity: this.uniforms.uFogDensity,
      },
    });
    this.mats.push(impostorMat);
    const quad = new PlaneGeometry(1, 1);
    this.geos.push(quad);
    for (let ci = 0; ci < lists.length; ci++) {
      const list = lists[ci];
      if (!list.length) continue;
      if ((ci & 3) === 0) await breathe();
      const center = new Vector3(X0 + ((ci % nx) + 0.5) * CHUNK, 0, Z0 + (Math.floor(ci / nx) + 0.5) * CHUNK);
      center.y = list.reduce((a, t) => a + t.y, 0) / list.length;
      // árvores 3D (uma malha instanciada por variação)
      const meshes: InstancedMesh[] = [];
      for (let v = 0; v < 4; v++) {
        const own = list.filter((t) => t.v === v);
        if (!own.length) continue;
        const mesh = new InstancedMesh(defs[v].geo, treeMat, own.length);
        own.forEach((t, i) => {
          tmpQ.setFromAxisAngle(UP, t.rot);
          mesh.setMatrixAt(i, tmpM.compose(tmpP.set(t.x, t.y, t.z), tmpQ, tmpS.setScalar(t.s)));
          mesh.setColorAt(i, tmpC.setScalar(t.shade));
        });
        mesh.computeBoundingSphere();
        mesh.visible = false;
        meshes.push(mesh);
        this.root.add(mesh);
      }
      // impostores (mesmas árvores, como cartões)
      const n = list.length;
      const g = new InstancedBufferGeometry();
      g.index = quad.index;
      g.setAttribute("position", quad.getAttribute("position"));
      g.setAttribute("uv", quad.getAttribute("uv"));
      const aPos = new Float32Array(n * 3);
      const aScale = new Float32Array(n);
      const aVar = new Float32Array(n);
      const aRot = new Float32Array(n);
      const aShade = new Float32Array(n);
      list.forEach((t, i) => {
        aPos.set([t.x, t.y, t.z], i * 3);
        aScale[i] = t.s;
        aVar[i] = t.v;
        aRot[i] = t.rot;
        aShade[i] = t.shade;
      });
      g.setAttribute("aPos", new InstancedBufferAttribute(aPos, 3));
      g.setAttribute("aScale", new InstancedBufferAttribute(aScale, 1));
      g.setAttribute("aVar", new InstancedBufferAttribute(aVar, 1));
      g.setAttribute("aRot", new InstancedBufferAttribute(aRot, 1));
      g.setAttribute("aShade", new InstancedBufferAttribute(aShade, 1));
      g.instanceCount = n;
      g.boundingSphere = new Sphere(center.clone().add(new Vector3(0, 6, 0)), CHUNK * 0.75 + 12);
      this.geos.push(g);
      const impostor = new Mesh(g, impostorMat);
      this.root.add(impostor);
      const shadow = !light && center.distanceTo(ROCK) < 55;
      meshes.forEach((m) => (m.castShadow = shadow));
      this.chunks.push({ center, meshes, impostor, near: false, shadow });
    }

    // --- chão perto da cachoeira: samambaias, musgo e folhas (instanciados) ---
    {
      const near = (n: number, cb: (i: number, x: number, z: number) => void) => {
        let i = 0;
        let tries = 0;
        while (i < n && tries < n * 6) {
          tries++;
          const a = rand() * Math.PI * 2;
          const d = Math.sqrt(rand()) * 62;
          const x = ROCK.x - 2 + Math.cos(a) * d;
          const z = ROCK.z + 8 + Math.sin(a) * d;
          if (Math.abs(x - riverX(z)) < 5 || Math.hypot(x - FALL_X, z - POOL_Z) < POOL_R + 0.5) continue;
          if (z > -2 && z < 7.5 && Math.abs(x - FALL_X) < 9) continue;
          cb(i++, x, z);
        }
        return i;
      };
      const fern = fernGeometry();
      const moss = new IcosahedronGeometry(1, 1);
      moss.scale(0.7, 0.28, 0.7);
      paint(moss, (_y, ny) => new Color(0.11, 0.14, 0.11).lerp(CANOPY[2], smooth(0.3, 0.9, ny) * 0.6));
      const leaf = new PlaneGeometry(0.34, 0.2);
      leaf.rotateX(-Math.PI / 2);
      paint(leaf, () => new Color(0.17, 0.155, 0.13));
      const vegMat = new MeshStandardMaterial({ vertexColors: true, roughness: 0.95, side: DoubleSide });
      this.mats.push(vegMat);
      this.geos.push(fern, moss, leaf);
      const kinds: [BufferGeometry, number, number, number][] = [
        // geometria, quantidade, escala mín., escala máx.
        [fern, light ? 300 : 900, 0.5, 1.1],
        [moss, light ? 200 : 600, 0.5, 1.6],
        [leaf, light ? 700 : 2500, 0.7, 1.4],
      ];
      for (const [geo, n, s0, s1] of kinds) {
        await breathe();
        const mesh = new InstancedMesh(geo, vegMat, n);
        const placed = near(n, (i, x, z) => {
          const s = s0 + rand() * (s1 - s0);
          tmpQ.setFromAxisAngle(UP, rand() * Math.PI * 2);
          mesh.setMatrixAt(i, tmpM.compose(tmpP.set(x, hAt(x, z) + 0.02, z), tmpQ, tmpS.setScalar(s)));
          mesh.setColorAt(i, tmpC.setScalar(0.75 + rand() * 0.45));
        });
        mesh.count = placed;
        mesh.computeBoundingSphere();
        mesh.receiveShadow = !light;
        this.root.add(mesh);
      }
    }

    // --- pedras com limo na margem + a pedra do urso ---
    {
      const g = rockGeometry(7, light ? 1 : 2);
      const m = new MeshStandardMaterial({ vertexColors: true, roughness: 0.9, flatShading: true });
      this.mats.push(m);
      this.geos.push(g);
      const n = light ? 26 : 50;
      const mesh = new InstancedMesh(g, m, n + 1);
      for (let i = 0; i < n; i++) {
        let x: number;
        let z: number;
        if (i < n * 0.6) {
          // em volta do poço
          const a = rand() * Math.PI * 2;
          const r = POOL_R - 1 + rand() * 4;
          x = FALL_X + Math.cos(a) * r;
          z = POOL_Z + Math.sin(a) * r;
          if (z < 6) z = 6 + rand() * 2;
        } else {
          // margens do rio de cima, perto da queda
          z = -rand() * 60;
          x = riverX(z) + (rand() < 0.5 ? -1 : 1) * (4.5 + rand() * 2.5);
        }
        const s = 0.5 + rand() * 1.6;
        tmpQ.setFromAxisAngle(UP, rand() * 6.28);
        tmpM.compose(tmpP.set(x, hAt(x, z) + s * 0.25, z), tmpQ, tmpS.set(s * (0.9 + rand() * 0.5), s, s * (0.9 + rand() * 0.5)));
        mesh.setMatrixAt(i, tmpM);
      }
      // pedra do urso
      tmpQ.setFromAxisAngle(UP, 0.6);
      tmpM.compose(tmpP.set(ROCK_BASE.x, ROCK_BASE.y + 0.15, ROCK_BASE.z), tmpQ, tmpS.set(2.4, 1.45, 2.1));
      mesh.setMatrixAt(n, tmpM);
      mesh.computeBoundingSphere();
      mesh.castShadow = !light;
      mesh.receiveShadow = !light;
      this.root.add(mesh);
    }

    // --- câmera: do alto seguindo o rio até a cachoeira e o urso ---
    const endPos = END_CAM;
    // olhar um pouco à direita e além do urso e da queda: o par fica no meio
    // à esquerda e abaixo do centro (o texto do Sobre ocupa a direita e o alto)
    const mid = ROCK.clone().lerp(FALL_FOCUS, 0.35);
    const fwd = new Vector3().subVectors(mid, endPos).setY(0).normalize();
    const right = new Vector3().crossVectors(fwd, UP).normalize();
    const endLook = mid.clone().addScaledVector(right, 2.5).addScaledVector(fwd, 6.5);
    this.camPath = new CatmullRomCurve3([
      new Vector3(riverX(-150) + 10, 190, -150),
      new Vector3(riverX(-100) + 8, 125, -108),
      new Vector3(riverX(-55) + 6, 58, -62),
      new Vector3(FALL_X + 14, 30, -16),
      endPos,
    ]);
    this.lookPath = new CatmullRomCurve3([
      new Vector3(riverX(-140), PLATEAU, -140),
      new Vector3(riverX(-82), PLATEAU, -80),
      new Vector3(riverX(-28), PLATEAU, -26),
      new Vector3(FALL_X + 3, 6, 6),
      endLook,
    ]);

    // tudo é estático: matrizes congeladas (a câmera e o urso não estão aqui)
    this.root.updateMatrixWorld(true);
    this.root.traverse((o) => {
      o.matrixAutoUpdate = false;
    });
    this.shadowFrames = 2;
  }

  /**
   * Atlas dos impostores: cada variação renderizada de lado (metade de cima) e
   * de cima (metade de baixo), fundo transparente, com a mesma luz da cena.
   */
  private bakeAtlas(defs: TreeDef[], mat: MeshStandardMaterial, sideSize: number[], topSize: number[]) {
    const gl = this.gl!;
    const tile = this.light ? 128 : 256;
    // sem mipmaps: os níveis menores misturariam o quadro vizinho na borda do cartão
    const rt = new WebGLRenderTarget(tile * 4, tile * 2, {
      depthBuffer: true,
      generateMipmaps: false,
      minFilter: LinearFilter,
      magFilter: LinearFilter,
    });
    const m = Math.round(tile * ATLAS_PAD);
    const scene = new Scene();
    scene.add(new HemisphereLight(0xc4ccc4, 0x161b17, 1.0));
    const sun = new DirectionalLight(0xeeeee4, 1.55);
    sun.position.copy(this.uniforms.uSun.value).multiplyScalar(50);
    scene.add(sun);
    const cam = new OrthographicCamera(-1, 1, 1, -1, 0.1, 200);
    const prevTarget = gl.getRenderTarget();
    const prevClear = gl.getClearAlpha();
    const prevColor = new Color();
    gl.getClearColor(prevColor);
    gl.setRenderTarget(rt);
    gl.setClearColor(0x000000, 0);
    gl.clear(true, true, true);
    rt.scissorTest = true;
    defs.forEach((d, v) => {
      const mesh = new Mesh(d.geo, mat);
      scene.add(mesh);
      // de lado (metade de cima do atlas)
      const S = sideSize[v];
      cam.left = -S / 2;
      cam.right = S / 2;
      cam.top = S;
      cam.bottom = 0;
      cam.position.set(0, 0, 60);
      cam.up.set(0, 1, 0);
      cam.lookAt(0, 0, 0);
      cam.updateProjectionMatrix();
      rt.viewport.set(v * tile + m, tile + m, tile - 2 * m, tile - 2 * m);
      rt.scissor.set(v * tile, tile, tile, tile);
      gl.setRenderTarget(rt); // o viewport/scissor do alvo só valem ao (re)aplicá-lo
      gl.render(scene, cam);
      // de cima (metade de baixo)
      const T = topSize[v];
      cam.left = -T / 2;
      cam.right = T / 2;
      cam.top = T / 2;
      cam.bottom = -T / 2;
      cam.position.set(0, d.h + 40, 0);
      cam.up.set(0, 0, -1);
      cam.lookAt(0, 0, 0);
      cam.updateProjectionMatrix();
      rt.viewport.set(v * tile + m, m, tile - 2 * m, tile - 2 * m);
      rt.scissor.set(v * tile, 0, tile, tile);
      gl.setRenderTarget(rt);
      gl.render(scene, cam);
      scene.remove(mesh);
    });
    rt.scissorTest = false;
    gl.setRenderTarget(prevTarget);
    gl.setClearColor(prevColor, prevClear);
    return rt;
  }

  /**
   * Carrega o urso (glTF com Meshopt; o mesmo decodificador do useGLTF) e o põe
   * em pé na pedra, olhando a queda. A vida vem do shader (ver bearShader).
   */
  async loadBear(url: string) {
    const [{ GLTFLoader }, { MeshoptDecoder }] = await Promise.all([
      import("three/examples/jsm/loaders/GLTFLoader.js"),
      import("three/examples/jsm/libs/meshopt_decoder.module.js"),
    ]);
    const gltf = await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync(url);
    if (this.disposed) return;
    gltf.scene.updateMatrixWorld(true);
    const bear = new Group();
    const geos: BufferGeometry[] = [];
    gltf.scene.traverse((o) => {
      if (!(o instanceof Mesh)) return;
      // assa a transformação dos nós na geometria, em float (o arquivo usa
      // KHR_mesh_quantization: em int16 os valores transformados seriam cortados)
      const g = o.geometry.clone() as BufferGeometry;
      for (const name of ["position", "normal"]) {
        const a = g.getAttribute(name);
        if (!a) continue;
        const arr = new Float32Array(a.count * 3);
        for (let i = 0; i < a.count; i++) arr.set([a.getX(i), a.getY(i), a.getZ(i)], i * 3);
        g.setAttribute(name, new BufferAttribute(arr, 3));
      }
      g.applyMatrix4(o.matrixWorld);
      geos.push(g);
      const mats = (Array.isArray(o.material) ? o.material : [o.material]).map((m) => this.bearShader(m.clone()));
      const mesh = new Mesh(g, Array.isArray(o.material) ? mats : mats[0]);
      mesh.castShadow = !this.light;
      // sombra com a mesma cabeça girada (senão a sombra da cabeça parada cai sobre a girada)
      if (!this.light) mesh.customDepthMaterial = this.bearDepth();
      mesh.receiveShadow = !this.light;
      bear.add(mesh);
    });
    // espaço do modelo normalizado: centrado, comprimento (Z) = 1, cabeça em +Z
    const box = new Box3();
    geos.forEach((g) => {
      g.computeBoundingBox();
      box.union(g.boundingBox!);
    });
    const c = box.getCenter(new Vector3());
    const len = Math.max(box.max.z - box.min.z, 0.001);
    geos.forEach((g) => {
      g.translate(-c.x, -c.y, -c.z);
      g.scale(1 / len, 1 / len, 1 / len);
      g.computeBoundingSphere();
    });
    // cabeça: média dos vértices da frente e do alto (mesma região da máscara do shader)
    {
      const sum = new Vector3();
      let n = 0;
      for (const g of geos) {
        const pos = g.getAttribute("position");
        for (let i = 0; i < pos.count; i++) {
          const z = pos.getZ(i);
          const y = pos.getY(i);
          if (z < 0.3 || y < -0.02) continue;
          sum.x += pos.getX(i);
          sum.y += y;
          sum.z += z;
          n++;
        }
      }
      if (n > 0) this.headLocal.copy(sum.divideScalar(n));
    }
    const feet = (box.min.y - c.y) / len; // patas (≈ -0,31)
    bear.scale.setScalar(BEAR_LENGTH);
    bear.position.set(ROCK.x, ROCK.y - feet * BEAR_LENGTH, ROCK.z);
    // de lado para a câmera, olhando a água caindo (cabeça em +Z)
    const dir = new Vector3().subVectors(FALL_FOCUS, ROCK);
    bear.rotation.y = Math.atan2(dir.x, dir.z);
    bear.updateMatrixWorld(true);
    bear.traverse((o) => (o.matrixAutoUpdate = false));
    this.head.copy(this.headLocal).applyMatrix4(bear.matrixWorld);
    this.bear = bear;
    this.root.add(bear);
    this.shadowFrames = 2; // a sombra do urso entra no mapa (estático)
  }

  /** Material de sombra do urso: só o giro da cabeça (mesma máscara e pivô do bearShader). */
  private bearDepth() {
    const m = new MeshDepthMaterial({ depthPacking: RGBADepthPacking });
    m.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = this.uniforms.uTime;
      Object.assign(shader.uniforms, this.bearU);
      shader.vertexShader = shader.vertexShader
        .replace("#include <common>", `#include <common>
${BEAR_HEAD_GLSL}`)
        .replace(
          "#include <begin_vertex>",
          `#include <begin_vertex>
          vec3 bear_pivot = vec3(0.0, 0.1, 0.16);
          transformed = mix(transformed, bear_headRot() * (transformed - bear_pivot) + bear_pivot, bear_headMask(position));
          transformed = bear_look(transformed, position);`,
        );
    };
    this.mats.push(m);
    return m;
  }

  /**
   * Material do urso: pelo dessaturado ~35% e um pouco mais escuro; no vertex
   * shader, respiração (tronco), cabeça girando devagar (±6° yaw, ±3° pitch,
   * ciclos longos e irregulares) e ondulação mínima do pelo das costas.
   * Máscaras no espaço do modelo normalizado (cabeça +Z, y de -0,31 a 0,31).
   */
  private bearShader(m: MeshStandardMaterial) {
    m.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = this.uniforms.uTime;
      Object.assign(shader.uniforms, this.bearU);
      shader.vertexShader = shader.vertexShader
        .replace(
          "#include <common>",
          `#include <common>
          ${BEAR_HEAD_GLSL}
          varying vec3 vBearP;`,
        )
        .replace(
          "#include <beginnormal_vertex>",
          `#include <beginnormal_vertex>
          float bear_hm = bear_headMask(position);
          mat3 bear_R = bear_headRot();
          objectNormal = normalize(mix(objectNormal, bear_R * objectNormal, bear_hm));
          objectNormal = normalize(mix(objectNormal, bear_lookRot() * objectNormal, bear_lookMask(position)));`,
        )
        .replace(
          "#include <begin_vertex>",
          `#include <begin_vertex>
          vBearP = position;
          // cabeça: gira em torno do pescoço
          vec3 bear_pivot = vec3(0.0, 0.1, 0.16);
          transformed = mix(transformed, bear_R * (transformed - bear_pivot) + bear_pivot, bear_hm);
          transformed = bear_look(transformed, position);
          // respiração: tórax e barriga (sem as pernas), ~0,6% do tamanho, ciclo de 3,5 s
          float bear_torso = smoothstep(-0.34, -0.22, position.z) * (1.0 - smoothstep(0.1, 0.2, position.z))
            * smoothstep(-0.14, -0.02, position.y);
          transformed += normalize(objectNormal) * (0.5 + 0.5 * sin(uTime * 6.2832 / 3.5)) * 0.006 * bear_torso;
          // vento: ondulação mínima do pelo das costas
          float bear_back = smoothstep(0.16, 0.26, position.y) * smoothstep(-0.42, -0.25, position.z)
            * (1.0 - smoothstep(0.12, 0.22, position.z));
          transformed += normalize(objectNormal) * sin(position.z * 45.0 + uTime * 2.3) * sin(position.x * 31.0 - uTime * 1.4) * 0.0015 * bear_back;`,
        );
      shader.fragmentShader = shader.fragmentShader
        .replace(
          "#include <common>",
          `#include <common>
          uniform float uClose;
          varying vec3 vBearP;`,
        )
        .replace(
          "#include <map_fragment>",
          `#include <map_fragment>
          // pelo: dessatura ~35% e escurece um pouco, mantendo os detalhes da textura
          float bear_lum = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114));
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(bear_lum), 0.35) * mix(0.85, 1.0, uClose);`,
        )
        .replace(
          "#include <opaque_fragment>",
          `// close: cabeça e ombros (frente e alto do corpo)
          float bear_front = smoothstep(-0.05, 0.2, vBearP.z) * smoothstep(-0.08, 0.1, vBearP.y);
          vec3 bear_V = normalize(vViewPosition);
          float bear_nv = clamp(dot(normal, bear_V), 0.0, 1.0);
          // luz de preenchimento suave vinda da câmera: rosto legível, com o relevo do pelo
          outgoingLight += diffuseColor.rgb * bear_nv * 0.55 * uClose * bear_front;
          // luz de contorno fria no pelo da cabeça e dos ombros (mais forte nas bordas de cima)
          float bear_rim = pow(1.0 - bear_nv, 3.0) * (0.55 + 0.45 * normal.y);
          outgoingLight += vec3(0.62, 0.72, 0.86) * bear_rim * 0.5 * uClose * bear_front;
          // catchlight: brilho especular pequeno nas partes escuras e lisas da cara (olhos)
          float bear_eye = smoothstep(0.34, 0.4, vBearP.z) * (1.0 - smoothstep(0.02, 0.05, bear_lum));
          float bear_spec = pow(clamp(dot(normal, normalize(bear_V + vec3(0.3, 0.4, 0.0))), 0.0, 1.0), 90.0);
          outgoingLight += vec3(0.9, 0.95, 1.0) * bear_spec * bear_eye * 0.7 * uClose;
          #include <opaque_fragment>`,
        );
    };
    m.needsUpdate = true;
    this.mats.push(m);
    return m;
  }

  update(camera: PerspectiveCamera, gl: WebGLRenderer, dpr: number, progress: number, pointer: { x: number; y: number }, dt: number, still: boolean) {
    if (!still) this.time += dt;
    this.uniforms.uTime.value = this.time;

    // câmera na curva, com amortecimento (scrub suave) e um leve parallax do mouse
    const p = Math.min(Math.max(progress, 0), 1);
    const e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
    this.camPath.getPoint(e, this.camT);
    this.lookPath.getPoint(e, this.lookT);
    // close: a partir de CLOSE_AT, mistura a descida com o arco em volta do urso
    const t = Math.min(Math.max((p - CLOSE_AT) / (1 - CLOSE_AT), 0), 1);
    const w = easeInOut(t);
    if (w > 0) this.closeTarget(camera, t, w);
    if (still || this.cam.lengthSq() === 0) {
      this.cam.copy(this.camT);
      this.look.copy(this.lookT);
    } else {
      const k = 1 - Math.exp(-dt * 3.5);
      this.cam.lerp(this.camT, k);
      this.look.lerp(this.lookT, k);
    }
    // parallax do mouse: some no close (a câmera está a ~2,5 m do urso)
    const par = (1 - e * 0.6) * (1 - w * 0.9);
    camera.position.copy(this.cam);
    camera.position.x += pointer.x * 0.8 * par;
    camera.position.y += -pointer.y * 0.5 * par;
    camera.lookAt(this.look);

    // no close: luz do urso, olhar para a câmera e profundidade de campo
    this.bearU.uClose.value = w;
    this.lookAtCamera(camera, w, dt, still);
    this.dof.amount = this.light ? 0 : smooth(0.55, 1, t);
    if (this.dof.amount > 0) {
      // foco: cabeça e ombros na tela (uv)
      tmpP.copy(this.frameHead).addScaledVector(UP, -0.25).project(camera);
      this.dof.focus.set(tmpP.x * 0.5 + 0.5, tmpP.y * 0.5 + 0.5);
    }

    // névoa de altitude: a câmera atravessa uma camada fina no meio da descida;
    // no close do celular (sem profundidade de campo), um pouco mais densa ao fundo
    const layer = Math.exp(-Math.pow((this.cam.y - 52) / 9, 2));
    const density = 0.0025 + layer * 0.018 + (this.light ? w * 0.003 : 0);
    this.fog.density = density;
    this.uniforms.uFogDensity.value = density;

    if (this.mistMat) this.mistMat.uniforms.uDpr.value = dpr;
    if (this.pollenMat) this.pollenMat.uniforms.uDpr.value = dpr;

    // LOD por chunk: árvores 3D perto da câmera, impostores longe (com folga
    // para não piscar na fronteira)
    const r3d = this.light ? 50 : 85;
    let shadowChanged = false;
    for (const c of this.chunks) {
      const d = c.center.distanceTo(this.cam);
      const near = c.near ? d < r3d + 10 : d < r3d;
      if (near === c.near) continue;
      c.near = near;
      c.impostor.visible = !near;
      for (const m of c.meshes) m.visible = near;
      if (c.shadow) shadowChanged = true;
    }
    // sombras: o mapa é estático; refaz só quando árvores 3D perto do urso
    // entram/saem ou quando o urso chega
    if (shadowChanged) this.shadowFrames = Math.max(this.shadowFrames, 1);
    if (this.shadowFrames > 0) {
      gl.shadowMap.needsUpdate = true;
      this.shadowFrames--;
    }
  }

  /**
   * Alvo da câmera no close (mistura com a descida pelo peso w): arco de 90° a
   * ~40° do focinho, do lado de baixo do rio, aproximando-se até CLOSE_DIST e
   * descendo até um pouco abaixo dos olhos. Em telas largas o urso fica à
   * esquerda (lado do retrato; o texto ocupa a direita); em telas em pé, no centro.
   */
  private closeTarget(camera: PerspectiveCamera, t: number, w: number) {
    const a = easeInOut(t);
    const angle = Math.PI / 2 + (CLOSE_ANGLE - Math.PI / 2) * a;
    // em pé (celular) a tela é estreita: um pouco mais longe, para a cabeça caber parada e virada
    const dist = 13 + ((camera.aspect < 1 ? 3 : CLOSE_DIST) - 13) * a;
    const { dir, arc, right, look } = this.closeV;
    const head = this.updateFrameHead();
    dir.copy(TO_FALL).multiplyScalar(Math.cos(angle)).addScaledVector(SIDE, Math.sin(angle));
    arc.copy(head).addScaledVector(dir, dist);
    arc.y = head.y + 13 * (1 - a) - 0.18 * a;
    this.camT.lerp(arc, w);
    // olhar: cabeça e ombros, deslocado para pôr o urso à esquerda em telas largas
    const half = Math.tan((camera.fov * Math.PI) / 360) * dist;
    const side = camera.aspect > 1.2 ? 0.42 * half * camera.aspect : 0;
    right.crossVectors(UP, dir).normalize(); // direita de quem olha da câmera para o urso
    look.copy(head).addScaledVector(UP, -0.22).addScaledVector(right, side);
    // longe do close, o olhar segue a descida; perto, a cabeça
    this.lookT.lerp(look, w);
  }

  /**
   * Cabeça para o enquadramento: o giro do olhar (shader) desloca a cabeça para
   * o lado; o close mira o meio do caminho, para ela caber parada e virada.
   */
  private updateFrameHead() {
    if (!this.bear) return this.frameHead.copy(this.head);
    const pivot = tmpS.set(0, 0.08, 0.04);
    const yaw = this.bearU.uLookYaw.value * 0.5;
    const pitch = this.bearU.uLookPitch.value * 0.5;
    this.rotM.makeRotationY(yaw).multiply(tmpM.makeRotationX(pitch));
    return this.frameHead.copy(this.headLocal).sub(pivot).applyMatrix4(this.rotM).add(pivot).applyMatrix4(this.bear.matrixWorld);
  }

  /** Ciclo do olhar: com o enquadramento final na tela, vira a cabeça para a câmera a cada ~10 s. */
  private lookAtCamera(camera: PerspectiveCamera, w: number, dt: number, still: boolean) {
    if (!this.bear || still) {
      this.bearU.uLookAmt.value = 0;
      return;
    }
    if (w > 0.97) {
      if (this.lookClock < 0) this.lookClock = LOOK_EVERY - 1; // 1ª vez ~1 s depois de chegar
      this.lookClock += dt;
      const c = this.lookClock % LOOK_EVERY;
      this.lookAmt =
        c < LOOK_TURN
          ? easeInOut(c / LOOK_TURN)
          : c < LOOK_TURN + LOOK_HOLD
            ? 1
            : c < LOOK_TURN + LOOK_HOLD + LOOK_BACK
              ? 1 - easeInOut((c - LOOK_TURN - LOOK_HOLD) / LOOK_BACK)
              : 0;
    } else {
      // saiu do enquadramento: volta devagar a observar a água
      this.lookClock = -1;
      this.lookAmt = Math.max(0, this.lookAmt - dt / LOOK_BACK);
    }
    // direção da câmera no espaço do modelo, a partir da base do pescoço (pivô do olhar no shader)
    const local = tmpP.copy(camera.position).applyMatrix4(tmpM.copy(this.bear.matrixWorld).invert());
    local.sub(tmpS.set(0, 0.08, 0.04));
    const yaw = Math.atan2(local.x, local.z);
    const pitch = -Math.atan2(local.y, Math.hypot(local.x, local.z));
    this.bearU.uLookYaw.value = Math.min(Math.max(yaw, -LOOK_YAW_MAX), LOOK_YAW_MAX);
    this.bearU.uLookPitch.value = Math.min(Math.max(pitch, -LOOK_PITCH_MAX), LOOK_PITCH_MAX);
    // sombra estática: refeita só enquanto a cabeça gira para a câmera e volta
    if (this.lookAmt > 0 || this.bearU.uLookAmt.value > 0) this.shadowFrames = Math.max(this.shadowFrames, 1);
    this.bearU.uLookAmt.value = this.lookAmt;
  }

  dispose() {
    this.disposed = true;
    this.geos.forEach((g) => g.dispose());
    this.mats.forEach((m) => m.dispose());
    this.atlas?.dispose();
    this.bear?.traverse((o) => {
      if (o instanceof Mesh) {
        o.geometry.dispose();
        (Array.isArray(o.material) ? o.material : [o.material]).forEach((m: MeshStandardMaterial) => {
          [m.map, m.normalMap, m.roughnessMap, m.metalnessMap, m.aoMap].forEach((tex) => tex?.dispose());
          m.dispose();
        });
      }
    });
  }
}

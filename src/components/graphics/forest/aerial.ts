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
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  PCFShadowMap,
  PerspectiveCamera,
  PlaneGeometry,
  Points,
  Quaternion,
  ShaderMaterial,
  Vector2,
  Vector3,
  type Scene,
  type WebGLRenderer,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

/*
 * Descida aérea do Sobre (monocromática: neve branca/gelo, pinheiros grafite,
 * água cinza-escura com brilhos frios, luz fria de inverno).
 * - Terreno: planalto nevado cortado por um rio que serpenteia até um penhasco;
 *   a cachoeira cai num poço e o rio segue abaixo. Altura em JS (height()),
 *   a mesma usada para pôr árvores, pedras e o urso.
 * - Rio e poço: água escura reflexiva (normais por ruído animado correndo para
 *   a queda), brilho frio do sol, bordas congeladas.
 * - Cachoeira: folha curva com fluxo vertical (UV animado com ruído, faixas de
 *   espuma); névoa subindo na base e respingos (partículas).
 * - Pinheiros nevados instanciados (3 variações, neve nas camadas de galhos),
 *   distribuídos por ruído; pedras nevadas na margem; a pedra do urso.
 * - Neve caindo na direção da câmera (mais densa no alto) e névoa de altitude
 *   que a câmera atravessa no meio da descida.
 * - Câmera numa curva: do alto (~85° para baixo) seguindo o rio até a
 *   cachoeira (~45°), com o urso em pé numa pedra no alto da queda, de lado,
 *   olhando a água caindo.
 * - Urso: public/modelos/urso/urso.glb ("Realistic Grizzly Bear" por 3Dima,
 *   CC BY 4.0; Meshopt + WebP). Modelo ESTÁTICO (sem esqueleto/animação): a
 *   vida vem do vertex shader (respiração no tronco, cabeça girando devagar,
 *   pelo das costas ondulando), com máscaras suaves no espaço do modelo
 *   (cabeça para +Z, Y para cima, comprimento 1; medido no arquivo).
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
/** Pé da cachoeira (impacto no poço): espuma e névoa. */
const FALL_FOOT = new Vector2(FALL_X, 7.6);

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
    vec3 col = vec3(0.06, 0.065, 0.072);
    col = mix(col, uSky, 0.12 + 0.55 * fres);
    // brilhos frios do sol
    vec3 R = reflect(-V, nrm);
    col += vec3(0.85, 0.9, 0.95) * pow(max(dot(R, uSun), 0.0), 140.0) * 1.4;
    // bordas congeladas (rio) / espuma perto da queda (poço)
    float edge = uPool > 0.5 ? 0.0 : smoothstep(0.3, 0.48, abs(vUv.x - 0.5));
    float ice = edge * smoothstep(0.35, 0.65, a_noise(vW.xz * 0.35));
    float foam = 0.0;
    if (uPool > 0.5) {
      float d = length(vW.xz - uFall);
      foam = (1.0 - smoothstep(1.5, 9.0, d)) * smoothstep(0.35, 0.8, a_noise(vW.xz * 0.9 + t * vec2(0.3, 0.6)));
      ice = smoothstep(${(POOL_R - 2.5).toFixed(1)}, ${POOL_R.toFixed(1)}, d) * smoothstep(0.4, 0.7, a_noise(vW.xz * 0.4));
    }
    col = mix(col, vec3(0.78, 0.81, 0.85), ice * 0.85);
    col = mix(col, vec3(0.86, 0.88, 0.9), foam * 0.8);
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
    vec3 col = mix(vec3(0.16, 0.17, 0.185), vec3(0.88, 0.9, 0.92), clamp(foam, 0.0, 1.0));
    float side = smoothstep(0.0, 0.12, vUv.x) * smoothstep(1.0, 0.88, vUv.x);
    float a = (0.55 + 0.45 * foam) * side * smoothstep(0.0, 0.04, vUv.y);
    float fd = length(cameraPosition - vW) * uFogDensity;
    col = mix(col, uFogColor, 1.0 - exp(-fd * fd));
    gl_FragColor = vec4(col, a);
  }
`;

const PARTICLE_VERT = /* glsl */ `
  attribute float aSize;
  attribute float aSeed;
  uniform float uTime;
  uniform float uDpr;
  uniform vec3 uCam;
  uniform vec3 uFwd;
  uniform float uMode;   // 0: neve caindo (em volta da câmera); 1: névoa/respingos da queda
  uniform vec3 uOrigin;
  varying float vA;
  void main() {
    vec3 p;
    if (uMode < 0.5) {
      // neve: cai e vem na direção da câmera; caixa de 70 m que acompanha a câmera
      vec3 box = vec3(70.0);
      p = position + vec3(sin(uTime * 0.6 + aSeed * 6.28) * 0.8, -uTime * (1.6 + aSeed * 1.4), 0.0) - uFwd * uTime * 3.0;
      p = mod(p - uCam + box * 0.5, box) - box * 0.5 + uCam;
      vA = mix(0.35, 0.9, smoothstep(10.0, 120.0, uCam.y));
    } else {
      // névoa: sobe e se abre a partir do pé da queda, em ciclos
      float life = fract(uTime * (0.07 + aSeed * 0.05) + aSeed);
      p = uOrigin + position * (0.6 + life * 1.4) + vec3(0.0, life * 7.0, life * 2.5);
      vA = sin(3.14159 * life) * 0.5;
    }
    vec4 mv = viewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = clamp(aSize * uDpr * 40.0 / -mv.z, 1.0, 180.0);
  }
`;
const PARTICLE_FRAG = /* glsl */ `
  uniform float uSoft;
  varying float vA;
  void main() {
    float d = length(gl_PointCoord - 0.5) * 2.0;
    float a = mix(smoothstep(1.0, 0.3, d), exp(-d * d * 3.0), uSoft) * vA;
    if (a < 0.004) discard;
    gl_FragColor = vec4(vec3(0.9, 0.92, 0.95) * a, a);
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

/** Pinheiro nevado: camadas de cones (neve no alto de cada camada) + tronco. */
function pineGeometry(variant: number, light: boolean) {
  const rand = seeded(100 + variant);
  const layers = [5, 4, 6][variant];
  const H = [9, 7, 11.5][variant];
  const R = [3.2, 2.7, 3.4][variant];
  const seg = light ? 8 : 12;
  const parts: BufferGeometry[] = [];
  const foliage = new Color(0.07, 0.08, 0.085);
  const snow = new Color(0.82, 0.85, 0.88);
  for (let i = 0; i < layers; i++) {
    const f = i / layers;
    const r = R * (1 - f * 0.78) * (0.92 + rand() * 0.16);
    const h = (H * 0.42) * (1 - f * 0.35);
    const g = new ConeGeometry(r, h, seg, 2, true);
    // borda dos galhos irregular (sem cone perfeito)
    const gp = g.getAttribute("position");
    for (let v = 0; v < gp.count; v++) {
      if (gp.getY(v) > -h / 2 + 0.01) continue;
      const k = 0.8 + rand() * 0.4;
      gp.setXYZ(v, gp.getX(v) * k, gp.getY(v) - rand() * 0.35, gp.getZ(v) * k);
    }
    g.translate(0, H * 0.22 + f * H * 0.62 + h / 2, 0);
    // cor: ponta da camada nevada, base grafite; um pouco de neve aleatória na borda
    const pos = g.getAttribute("position");
    const col = new Float32Array(pos.count * 3);
    const top = H * 0.22 + f * H * 0.62 + h;
    const amount = 0.5 + rand() * 0.3;
    for (let v = 0; v < pos.count; v++) {
      const y = pos.getY(v);
      // neve acumulada no alto de cada camada; galhos de baixo quase sem neve
      const k = y > top - 0.01 ? amount : y > top - h * 0.55 ? 0.22 + rand() * 0.12 : 0.03;
      const c = foliage.clone().lerp(snow, k);
      col.set([c.r, c.g, c.b], v * 3);
    }
    g.setAttribute("color", new BufferAttribute(col, 3));
    parts.push(g);
  }
  const trunk = new CylinderGeometry(0.22, 0.34, H * 0.3, 6, 1, true);
  trunk.translate(0, H * 0.15, 0);
  const tc = new Float32Array(trunk.getAttribute("position").count * 3).fill(0.08);
  trunk.setAttribute("color", new BufferAttribute(tc, 3));
  parts.push(trunk);
  parts.forEach((p) => p.deleteAttribute("uv"));
  const merged = mergeGeometries(parts)!; // indexadas: normais suaves
  merged.computeVertexNormals();
  parts.forEach((p) => p.dispose());
  return merged;
}

/** Pedra irregular com neve por cima. */
function rockGeometry(seed: number, detail: number) {
  const rand = seeded(seed);
  const g = new IcosahedronGeometry(1, detail); // já vem sem índice
  const pos = g.getAttribute("position");
  const map = new Map<string, number>();
  for (let v = 0; v < pos.count; v++) {
    const key = `${pos.getX(v).toFixed(3)},${pos.getY(v).toFixed(3)},${pos.getZ(v).toFixed(3)}`;
    if (!map.has(key)) map.set(key, 0.78 + rand() * 0.42);
    const s = map.get(key)!;
    pos.setXYZ(v, pos.getX(v) * s, pos.getY(v) * s * 0.75, pos.getZ(v) * s);
  }
  g.computeVertexNormals();
  const nrm = g.getAttribute("normal");
  const col = new Float32Array(pos.count * 3);
  for (let v = 0; v < pos.count; v++) {
    const k = smooth(0.35, 0.7, nrm.getY(v));
    col.set([0.2 + k * 0.66, 0.21 + k * 0.67, 0.225 + k * 0.67], v * 3);
  }
  g.setAttribute("color", new BufferAttribute(col, 3));
  return g;
}

// ------------------------------------------------------------------ mundo
const tmpM = new Matrix4();
const tmpQ = new Quaternion();
const tmpP = new Vector3();
const tmpS = new Vector3();
const UP = new Vector3(0, 1, 0);

export class AerialWorld {
  readonly root = new Group();
  private uniforms = {
    uTime: { value: 0 },
    uSun: { value: new Vector3(-0.62, 0.42, -0.66).normalize() },
    uSky: { value: new Vector3(0.64, 0.68, 0.73) },
    uFogColor: { value: new Vector3(0.58, 0.61, 0.65) },
    uFogDensity: { value: 0.0025 },
  };
  private fog = new FogExp2(0x949ca6, 0.0025);
  private sun!: DirectionalLight;
  private mats: (ShaderMaterial | MeshStandardMaterial)[] = [];
  private geos: BufferGeometry[] = [];
  private snowMat!: ShaderMaterial;
  private mistMat: ShaderMaterial | null = null;
  private camPath!: CatmullRomCurve3;
  private lookPath!: CatmullRomCurve3;
  private cam = new Vector3();
  private look = new Vector3();
  private time = 0;
  private bear: Group | null = null;
  private shadowFrames = 0;
  private disposed = false;

  private building: Promise<void> | null = null;

  constructor(private light: boolean) {}

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

    // luz fria de inverno: céu + sol baixo com sombras suaves (só no desktop)
    this.root.add(new HemisphereLight(0xdfe6ef, 0x3a3e44, 1.05));
    this.sun = new DirectionalLight(0xeef2f7, 1.7);
    this.sun.position.copy(ROCK).addScaledVector(this.uniforms.uSun.value, 80);
    this.sun.target.position.copy(ROCK);
    this.root.add(this.sun, this.sun.target);
    if (!light) {
      this.sun.castShadow = true;
      this.sun.shadow.mapSize.set(2048, 2048);
      const c = this.sun.shadow.camera;
      c.left = -40;
      c.right = 40;
      c.top = 40;
      c.bottom = -40;
      c.near = 10;
      c.far = 180;
      this.sun.shadow.bias = -0.0005;
      this.sun.shadow.normalBias = 0.04;
      this.sun.shadow.radius = 4;
    }

    // --- terreno ---
    const seg = light ? 120 : 220;
    const grid = new Float32Array((seg + 1) * (seg + 1));
    /** Altura pela grade já calculada (bilinear). */
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
        // a PlaneGeometry vai de -Z a +Z depois do rotateX: linha = posição em Z
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
        // neve nas áreas planas; rocha escura exposta nas encostas íngremes
        const flat = smooth(0.62, 0.86, nrm.getY(i) + (vnoise(x * 0.25, z * 0.25) - 0.5) * 0.12);
        const dx = Math.abs(x - riverX(z));
        const wet = 1 - smooth(4, 7, dx); // margem úmida, mais escura
        const s = 0.86 + vnoise(x * 0.6, z * 0.6) * 0.06;
        const r = 0.17 + vnoise(x * 0.9, z * 0.9) * 0.06;
        const k = flat * (1 - wet * 0.6);
        col.set([r + (s - r) * k, r + 0.01 + (s + 0.02 - r - 0.01) * k, r + 0.02 + (s + 0.05 - r - 0.02) * k], i * 3);
      }
      g.setAttribute("color", new BufferAttribute(col, 3));
      const m = new MeshStandardMaterial({ vertexColors: true, roughness: 0.92, metalness: 0 });
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

    // --- névoa e respingos no pé da queda ---
    {
      const n = light ? 70 : 200;
      const pos = new Float32Array(n * 3);
      const size = new Float32Array(n);
      const seed = new Float32Array(n);
      for (let i = 0; i < n; i++) {
        pos.set([(rand() - 0.5) * 9, rand() * 1.5, (rand() - 0.2) * 5], i * 3);
        size[i] = 12 + rand() * 26;
        seed[i] = rand();
      }
      const g = new BufferGeometry();
      g.setAttribute("position", new BufferAttribute(pos, 3));
      g.setAttribute("aSize", new BufferAttribute(size, 1));
      g.setAttribute("aSeed", new BufferAttribute(seed, 1));
      this.mistMat = new ShaderMaterial({
        vertexShader: PARTICLE_VERT,
        fragmentShader: PARTICLE_FRAG,
        uniforms: {
          uTime: this.uniforms.uTime,
          uDpr: { value: 1 },
          uCam: { value: new Vector3() },
          uFwd: { value: new Vector3() },
          uMode: { value: 1 },
          uOrigin: { value: new Vector3(FALL_FOOT.x, WATER_LOW, FALL_FOOT.y - 1.5) },
          uSoft: { value: 1 },
        },
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
      });
      const pts = new Points(g, this.mistMat);
      pts.frustumCulled = false;
      this.geos.push(g);
      this.mats.push(this.mistMat);
      this.root.add(pts);
    }

    // --- pinheiros (3 variações instanciadas, distribuídos por ruído) ---
    {
      const total = light ? 900 : 2600;
      const variants = [0, 1, 2].map((v) => pineGeometry(v, light));
      const m = new MeshStandardMaterial({ vertexColors: true, roughness: 0.95 });
      this.mats.push(m);
      const buckets: Matrix4[][] = [[], [], []];
      let tries = 0;
      while (buckets[0].length + buckets[1].length + buckets[2].length < total && tries < total * 30) {
        tries++;
        if ((tries & 1023) === 0) await breathe();
        const x = X0 + rand() * (X1 - X0);
        const z = Z0 + rand() * (Z1 - Z0 - 10);
        if (vnoise(x * 0.03 + 3, z * 0.03) * 0.65 + vnoise(x * 0.09, z * 0.09) * 0.35 < 0.4 + rand() * 0.12) continue; // bosques e clareiras
        if (Math.abs(x - riverX(z)) < 10) continue; // margem do rio livre
        if (Math.hypot(x - FALL_X, z - POOL_Z) < POOL_R + 6) continue; // poço
        if (z > -4 && z < 9 && Math.abs(x - FALL_X) < 30) continue; // face do penhasco
        if (Math.hypot(x - ROCK.x, z - ROCK.z) < 9) continue; // clareira do urso
        if (Math.hypot(x - END_CAM.x, z - END_CAM.z) < 26) continue; // nada colado na câmera final
        const y = hAt(x, z);
        const slope = Math.hypot(hAt(x + 1, z) - y, hAt(x, z + 1) - y);
        if (slope > 0.9) continue;
        const v = Math.floor(rand() * 3);
        const s = 0.7 + rand() * 0.7;
        tmpQ.setFromAxisAngle(UP, rand() * Math.PI * 2);
        buckets[v].push(new Matrix4().compose(tmpP.set(x, y - 0.3, z), tmpQ, tmpS.set(s, s * (0.85 + rand() * 0.3), s)));
      }
      buckets.forEach((list, v) => {
        const mesh = new InstancedMesh(variants[v], m, Math.max(list.length, 1));
        list.forEach((mat, i) => mesh.setMatrixAt(i, mat));
        mesh.count = list.length;
        mesh.castShadow = !light;
        mesh.receiveShadow = !light;
        mesh.frustumCulled = false;
        this.root.add(mesh);
        this.geos.push(variants[v]);
      });
    }

    // --- pedras nevadas na margem + a pedra do urso ---
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
      // pedra do urso: larga e com topo plano o bastante para ele sentar
      tmpQ.setFromAxisAngle(UP, 0.6);
      tmpM.compose(tmpP.set(ROCK_BASE.x, ROCK_BASE.y + 0.15, ROCK_BASE.z), tmpQ, tmpS.set(2.4, 1.45, 2.1));
      mesh.setMatrixAt(n, tmpM);
      mesh.castShadow = !light;
      mesh.receiveShadow = !light;
      this.root.add(mesh);
    }

    // --- neve caindo (em volta da câmera) ---
    {
      const n = light ? 800 : 2400;
      const pos = new Float32Array(n * 3);
      const size = new Float32Array(n);
      const seed = new Float32Array(n);
      for (let i = 0; i < n; i++) {
        pos.set([(rand() - 0.5) * 70, (rand() - 0.5) * 70, (rand() - 0.5) * 70], i * 3);
        size[i] = 0.5 + rand() * 1.1;
        seed[i] = rand();
      }
      const g = new BufferGeometry();
      g.setAttribute("position", new BufferAttribute(pos, 3));
      g.setAttribute("aSize", new BufferAttribute(size, 1));
      g.setAttribute("aSeed", new BufferAttribute(seed, 1));
      this.snowMat = new ShaderMaterial({
        vertexShader: PARTICLE_VERT,
        fragmentShader: PARTICLE_FRAG,
        uniforms: {
          uTime: this.uniforms.uTime,
          uDpr: { value: 1 },
          uCam: { value: new Vector3() },
          uFwd: { value: new Vector3() },
          uMode: { value: 0 },
          uOrigin: { value: new Vector3() },
          uSoft: { value: 0 },
        },
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
      });
      const pts = new Points(g, this.snowMat);
      pts.frustumCulled = false;
      this.geos.push(g);
      this.mats.push(this.snowMat);
      this.root.add(pts);
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
  }

  attach(scene: Scene, gl: WebGLRenderer) {
    scene.fog = this.fog;
    scene.background = new Color(0x949ca6);
    gl.shadowMap.enabled = !this.light;
    gl.shadowMap.type = PCFShadowMap; // PCF (o PCFSoft saiu do three); raio suaviza
    gl.shadowMap.autoUpdate = false; // cena estática: refaz só quando o urso mexe (perto do fim)
    gl.shadowMap.needsUpdate = true;
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
    const feet = (box.min.y - c.y) / len; // patas (≈ -0,31)
    bear.scale.setScalar(BEAR_LENGTH);
    bear.position.set(ROCK.x, ROCK.y - feet * BEAR_LENGTH, ROCK.z);
    // de lado para a câmera, olhando a água caindo (cabeça em +Z)
    const dir = new Vector3().subVectors(FALL_FOCUS, ROCK);
    bear.rotation.y = Math.atan2(dir.x, dir.z);
    this.bear = bear;
    this.root.add(bear);
    this.shadowFrames = 2; // a sombra do urso entra no mapa (estático)
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
      shader.vertexShader = shader.vertexShader
        .replace(
          "#include <common>",
          `#include <common>
          uniform float uTime;
          mat3 bear_rotY(float a) { float c = cos(a), s = sin(a); return mat3(c, 0.0, -s, 0.0, 1.0, 0.0, s, 0.0, c); }
          mat3 bear_rotX(float a) { float c = cos(a), s = sin(a); return mat3(1.0, 0.0, 0.0, 0.0, c, s, 0.0, -s, c); }
          // cabeça e pescoço: à frente das patas dianteiras e acima delas
          float bear_headMask(vec3 p) { return smoothstep(0.13, 0.26, p.z) * smoothstep(-0.05, 0.06, p.y); }
          mat3 bear_headRot() {
            float yaw = (sin(uTime * 0.23) * 0.6 + sin(uTime * 0.097 + 1.7) * 0.4) * 0.105;
            float pitch = (sin(uTime * 0.17 + 0.4) * 0.55 + sin(uTime * 0.061 + 2.0) * 0.45) * 0.052;
            return bear_rotY(yaw) * bear_rotX(pitch);
          }`,
        )
        .replace(
          "#include <beginnormal_vertex>",
          `#include <beginnormal_vertex>
          float bear_hm = bear_headMask(position);
          mat3 bear_R = bear_headRot();
          objectNormal = normalize(mix(objectNormal, bear_R * objectNormal, bear_hm));`,
        )
        .replace(
          "#include <begin_vertex>",
          `#include <begin_vertex>
          // cabeça: gira em torno do pescoço
          vec3 bear_pivot = vec3(0.0, 0.1, 0.16);
          transformed = mix(transformed, bear_R * (transformed - bear_pivot) + bear_pivot, bear_hm);
          // respiração: tórax e barriga (sem as pernas), ~0,6% do tamanho, ciclo de 3,5 s
          float bear_torso = smoothstep(-0.34, -0.22, position.z) * (1.0 - smoothstep(0.1, 0.2, position.z))
            * smoothstep(-0.14, -0.02, position.y);
          transformed += normalize(objectNormal) * (0.5 + 0.5 * sin(uTime * 6.2832 / 3.5)) * 0.006 * bear_torso;
          // vento: ondulação mínima do pelo das costas
          float bear_back = smoothstep(0.16, 0.26, position.y) * smoothstep(-0.42, -0.25, position.z)
            * (1.0 - smoothstep(0.12, 0.22, position.z));
          transformed += normalize(objectNormal) * sin(position.z * 45.0 + uTime * 2.3) * sin(position.x * 31.0 - uTime * 1.4) * 0.0015 * bear_back;`,
        );
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <map_fragment>",
        `#include <map_fragment>
        // pelo: dessatura ~35% e escurece um pouco, mantendo os detalhes da textura
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114))), 0.35) * 0.85;`,
      );
    };
    m.needsUpdate = true;
    this.mats.push(m);
    return m;
  }

  update(camera: PerspectiveCamera, gl: WebGLRenderer, dpr: number, progress: number, pointer: { x: number; y: number }, dt: number, still: boolean) {
    if (!still) this.time += dt;
    const t = this.time;
    this.uniforms.uTime.value = t;

    // câmera na curva, com amortecimento (scrub suave) e um leve parallax do mouse
    const p = Math.min(Math.max(progress, 0), 1);
    const e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
    const target = this.camPath.getPoint(e);
    const lookT = this.lookPath.getPoint(e);
    if (still || this.cam.lengthSq() === 0) {
      this.cam.copy(target);
      this.look.copy(lookT);
    } else {
      const k = 1 - Math.exp(-dt * 3.5);
      this.cam.lerp(target, k);
      this.look.lerp(lookT, k);
    }
    camera.position.copy(this.cam);
    camera.position.x += pointer.x * 0.8 * (1 - e * 0.6);
    camera.position.y += -pointer.y * 0.5 * (1 - e * 0.6);
    camera.lookAt(this.look);

    // névoa de altitude: a câmera atravessa uma camada fina no meio da descida
    const y = this.cam.y;
    const layer = Math.exp(-Math.pow((y - 52) / 9, 2));
    const density = 0.0025 + layer * 0.02;
    this.fog.density = density;
    this.uniforms.uFogDensity.value = density;

    const fwd = tmpP.set(0, 0, -1).applyQuaternion(camera.quaternion);
    this.snowMat.uniforms.uCam.value.copy(this.cam);
    this.snowMat.uniforms.uFwd.value.copy(fwd);
    this.snowMat.uniforms.uDpr.value = dpr;
    if (this.mistMat) this.mistMat.uniforms.uDpr.value = dpr;

    // sombras: tudo é estático (o urso mexe só no shader); refaz o mapa só quando algo entra
    if (this.shadowFrames > 0) {
      gl.shadowMap.needsUpdate = true;
      this.shadowFrames--;
    }
  }

  dispose() {
    this.disposed = true;
    this.geos.forEach((g) => g.dispose());
    this.mats.forEach((m) => m.dispose());
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

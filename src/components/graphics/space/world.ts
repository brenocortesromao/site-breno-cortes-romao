import {
  AdditiveBlending,
  BackSide,
  BufferAttribute,
  BufferGeometry,
  Color,
  DirectionalLight,
  DoubleSide,
  Group,
  IcosahedronGeometry,
  LineSegments,
  Mesh,
  MeshStandardMaterial,
  PMREMGenerator,
  PerspectiveCamera,
  PlaneGeometry,
  Points,
  Quaternion,
  RingGeometry,
  Scene,
  ShaderMaterial,
  SphereGeometry,
  Vector3,
  type Texture,
  type WebGLRenderer,
} from "three";

/*
 * Espaço do Contato (monocromático: preto, cinzas, prata, branco).
 * - 3 camadas de estrelas (Points, shader próprio) com parallax do mouse e
 *   cintilação em parte delas; um LineSegments gêmeo por camada desenha os
 *   rastros do "warp" (só visível com uWarp > 0).
 * - Planeta de metal líquido à direita, parcialmente cortado pela borda:
 *   prata acetinado com ambiente ESCURO próprio e ondulação por noise
 *   (normais por diferenças finitas), girando devagar. Diferente da bola da
 *   hero (cromo espelhado em estúdio claro), que não é tocada.
 * - Anéis estilo Saturno: disco largo e fino (RingGeometry + shader) com faixas
 *   claras e escuras e a divisão de Cassini (sp_ring; a mesma função existe em
 *   JS para distribuir as partículas), brilho de poeira de gelo com luz
 *   lateral e milhares de partículas em órbita kepleriana (mais rápidas perto
 *   do planeta). Sombra do planeta nos anéis e dos anéis no planeta, calculadas
 *   no shader (sem shadow map). Inclinação ~22° com oscilação lenta.
 * - 1 ou 2 luas metálicas em órbitas inclinadas (1 no modo leve).
 * - Estrelas cadentes ocasionais (a cada 4 a 8 s), só na metade direita.
 * - Galáxia espiral cinza, fraca, no alto à esquerda, girando devagar.
 * - Poeira desfocada atravessando a cena em várias profundidades (não no modo leve).
 * - Câmera: avanço pelo scroll + deriva orbital lenta em volta do planeta.
 */

const STAR_VERT = /* glsl */ `
  attribute float aSize;
  attribute float aBright;
  attribute float aTw;
  attribute float aPhase;
  uniform float uTime;
  uniform float uDpr;
  varying float vB;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    float tw = aTw > 0.0 ? 0.55 + 0.45 * sin(uTime * aTw + aPhase) : 1.0;
    vB = aBright * tw;
    gl_PointSize = aSize * uDpr;
  }
`;
const STAR_FRAG = /* glsl */ `
  uniform float uSoft;
  uniform float uOpacity;
  varying float vB;
  void main() {
    float d = length(gl_PointCoord - 0.5) * 2.0;
    // estrela: núcleo nítido + halo curto; poeira (uSoft = 1): gaussiana larga
    float sharp = smoothstep(1.0, 0.0, d) * 0.55 + smoothstep(0.35, 0.0, d);
    float soft = exp(-d * d * 3.5);
    float a = mix(sharp, soft, uSoft) * vB * uOpacity;
    if (a < 0.003) discard;
    gl_FragColor = vec4(vec3(0.86, 0.88, 0.91) * a, a);
  }
`;
const WARP_VERT = /* glsl */ `
  attribute float aEnd;
  attribute float aBright;
  uniform float uWarp;
  varying float vA;
  void main() {
    vec4 clip = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    // a ponta "aEnd = 1" corre em direção ao centro da tela
    vec2 ndc = clip.xy / clip.w;
    float len = 0.45 * uWarp * smoothstep(0.0, 0.9, length(ndc));
    ndc *= 1.0 - len * aEnd;
    clip.xy = ndc * clip.w;
    gl_Position = clip;
    vA = aBright * uWarp * (1.0 - aEnd * 0.9);
  }
`;
const WARP_FRAG = /* glsl */ `
  varying float vA;
  void main() {
    gl_FragColor = vec4(vec3(0.86, 0.88, 0.91) * vA, vA);
  }
`;

/** Simplex 3D (Ashima/Stefan Gustavson, domínio público). */
const SIMPLEX = /* glsl */ `
  vec3 sp_mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
  vec4 sp_mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
  vec4 sp_perm(vec4 x){return sp_mod289(((x*34.0)+1.0)*x);}
  vec4 sp_tis(vec4 r){return 1.79284291400159-0.85373472095314*r;}
  float sp_snoise(vec3 v){
    const vec2 C=vec2(1.0/6.0,1.0/3.0);const vec4 D=vec4(0.0,0.5,1.0,2.0);
    vec3 i=floor(v+dot(v,C.yyy));vec3 x0=v-i+dot(i,C.xxx);
    vec3 g=step(x0.yzx,x0.xyz);vec3 l=1.0-g;vec3 i1=min(g.xyz,l.zxy);vec3 i2=max(g.xyz,l.zxy);
    vec3 x1=x0-i1+C.xxx;vec3 x2=x0-i2+C.yyy;vec3 x3=x0-D.yyy;
    i=sp_mod289(i);
    vec4 p=sp_perm(sp_perm(sp_perm(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
    float n_=0.142857142857;vec3 ns=n_*D.wyz-D.xzx;
    vec4 j=p-49.0*floor(p*ns.z*ns.z);vec4 x_=floor(j*ns.z);vec4 y_=floor(j-7.0*x_);
    vec4 x=x_*ns.x+ns.yyyy;vec4 y=y_*ns.x+ns.yyyy;vec4 h=1.0-abs(x)-abs(y);
    vec4 b0=vec4(x.xy,y.xy);vec4 b1=vec4(x.zw,y.zw);
    vec4 s0=floor(b0)*2.0+1.0;vec4 s1=floor(b1)*2.0+1.0;vec4 sh=-step(h,vec4(0.0));
    vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
    vec3 p0=vec3(a0.xy,h.x);vec3 p1=vec3(a0.zw,h.y);vec3 p2=vec3(a1.xy,h.z);vec3 p3=vec3(a1.zw,h.w);
    vec4 norm=sp_tis(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
    p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
    vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0);m=m*m;
    return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
  }
`;

/** Raios do disco dos anéis (em raios do planeta). */
const RING_IN = 1.3;
const RING_OUT = 2.34;

/** Densidade dos anéis pelo raio: faixas + divisão de Cassini; e a sombra do planeta. */
const RING_GLSL = /* glsl */ `
  float sp_ring(float r) {
    float base = smoothstep(1.30, 1.40, r) * (1.0 - smoothstep(2.20, 2.34, r));
    float b = 0.55 + 0.30 * sin(r * 38.0 + sin(r * 11.0) * 1.6) + 0.15 * sin(r * 91.0 + 1.3);
    float gap = 1.0 - (smoothstep(1.80, 1.83, r) - smoothstep(1.87, 1.90, r));
    float inner = mix(0.4, 1.0, smoothstep(1.50, 1.58, r));
    return clamp(base * b * gap * inner, 0.0, 1.0);
  }
  float sp_planetShadow(vec3 p, vec3 c, float rad, vec3 l) {
    vec3 toC = c - p;
    float t = dot(toC, l);
    float d = sqrt(max(dot(toC, toC) - t * t, 0.0));
    return t > 0.0 ? smoothstep(rad * 0.94, rad * 1.04, d) : 1.0;
  }
`;
/** sp_ring em JS (distribuição das partículas pelas faixas). */
function ringDensity(r: number) {
  const sm = (a: number, b: number, x: number) => {
    const t = Math.min(Math.max((x - a) / (b - a), 0), 1);
    return t * t * (3 - 2 * t);
  };
  const base = sm(1.3, 1.4, r) * (1 - sm(2.2, 2.34, r));
  const b = 0.55 + 0.3 * Math.sin(r * 38 + Math.sin(r * 11) * 1.6) + 0.15 * Math.sin(r * 91 + 1.3);
  const gap = 1 - (sm(1.8, 1.83, r) - sm(1.87, 1.9, r));
  const inner = 0.4 + 0.6 * sm(1.5, 1.58, r);
  return Math.min(Math.max(base * b * gap * inner, 0), 1);
}

const RING_VERT = /* glsl */ `
  varying vec2 vL;
  varying vec3 vW;
  void main() {
    vL = position.xy;
    vec4 w = modelMatrix * vec4(position, 1.0);
    vW = w.xyz;
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`;
const RING_FRAG = /* glsl */ `
  uniform vec3 uLight;
  uniform vec3 uCenter;
  uniform float uRadius;
  uniform vec3 uRingN;
  varying vec2 vL;
  varying vec3 vW;
  ${RING_GLSL}
  void main() {
    float r = length(vL); // geometria local: já em raios do planeta
    float d = sp_ring(r);
    if (d < 0.004) discard;
    float g = fract(sin(dot(floor(vL * 700.0), vec2(12.9898, 78.233))) * 43758.5453); // grão de poeira
    float sh = sp_planetShadow(vW, uCenter, uRadius, uLight);
    vec3 V = normalize(cameraPosition - vW);
    float side = 1.0 - abs(dot(uRingN, uLight));    // luz rasante: faixas mais claras
    float fwd = pow(max(dot(-V, uLight), 0.0), 6.0); // gelo contra a luz: brilho especular sutil
    vec3 col = vec3(0.74, 0.76, 0.8) * (0.5 + 0.5 * side) + vec3(0.92) * fwd * 0.5;
    col *= 0.85 + 0.25 * g;
    gl_FragColor = vec4(col * mix(0.22, 1.0, sh), d * 0.6 * mix(0.45, 1.0, sh));
  }
`;
const RING_PTS_VERT = /* glsl */ `
  attribute float aR;
  attribute float aA;
  attribute float aZ;
  attribute float aSize;
  attribute float aBright;
  attribute float aTw;
  attribute float aPhase;
  uniform float uTime;
  uniform float uDpr;
  uniform float uK;
  uniform vec3 uLight;
  uniform vec3 uCenter;
  uniform float uRadius;
  varying float vB;
  ${RING_GLSL}
  void main() {
    float a = aA + uTime * uK / pow(aR, 1.5); // órbita kepleriana: mais rápida perto do planeta
    vec4 w = modelMatrix * vec4(cos(a) * aR, sin(a) * aR, aZ, 1.0);
    gl_Position = projectionMatrix * viewMatrix * w;
    float tw = aTw > 0.0 ? 0.55 + 0.45 * sin(uTime * aTw + aPhase) : 1.0;
    vB = aBright * tw * mix(0.12, 1.0, sp_planetShadow(w.xyz, uCenter, uRadius, uLight));
    gl_PointSize = aSize * uDpr;
  }
`;
const METEOR_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const METEOR_FRAG = /* glsl */ `
  uniform float uFade;
  varying vec2 vUv;
  void main() {
    float tail = pow(vUv.x, 3.0); // cabeça na ponta, cauda sumindo
    float across = 1.0 - abs(vUv.y - 0.5) * 2.0;
    float a = tail * across * uFade;
    gl_FragColor = vec4(vec3(0.9, 0.92, 0.95) * a, a);
  }
`;

type Rand = () => number;
/** PRNG determinístico (mesma cena a cada carga). */
function mulberry(seed: number): Rand {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function starMaterial(soft = 0, opacity = 1) {
  return new ShaderMaterial({
    vertexShader: STAR_VERT,
    fragmentShader: STAR_FRAG,
    uniforms: { uTime: { value: 0 }, uDpr: { value: 1 }, uSoft: { value: soft }, uOpacity: { value: opacity } },
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
  });
}

function pointsGeometry(pos: Float32Array, size: Float32Array, bright: Float32Array, tw: Float32Array, phase: Float32Array) {
  const g = new BufferGeometry();
  g.setAttribute("position", new BufferAttribute(pos, 3));
  g.setAttribute("aSize", new BufferAttribute(size, 1));
  g.setAttribute("aBright", new BufferAttribute(bright, 1));
  g.setAttribute("aTw", new BufferAttribute(tw, 1));
  g.setAttribute("aPhase", new BufferAttribute(phase, 1));
  return g;
}

/** Ambiente escuro do planeta e das luas: cúpula em degradê quase preto + 2 faixas frias fracas. */
function darkEnvironment(gl: WebGLRenderer): Texture {
  const scene = new Scene();
  const dome = new Mesh(
    new SphereGeometry(20, 32, 16),
    new ShaderMaterial({
      side: BackSide,
      vertexShader: `varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `varying vec3 vP; void main(){
        float y = vP.y;
        vec3 c = mix(vec3(0.03), vec3(0.16,0.165,0.175), smoothstep(-0.2, 0.9, y));
        c = mix(c, vec3(0.012), smoothstep(-0.05, -0.6, y));
        gl_FragColor = vec4(c, 1.0);
      }`,
    }),
  );
  scene.add(dome);
  const strip = (x: number, z: number, w: number, h: number, v: number) => {
    const m = new Mesh(new PlaneGeometry(w, h), new MeshStandardMaterial({ color: 0x000000, emissive: new Color(v, v, v * 1.04) }));
    m.position.set(x, 2, z);
    m.lookAt(0, 0, 0);
    scene.add(m);
  };
  strip(-12, 6, 1.2, 14, 0.45); // faixa fria à esquerda (contorno)
  strip(9, -10, 0.6, 10, 0.22);
  const pmrem = new PMREMGenerator(gl);
  const tex = pmrem.fromScene(scene, 0.04).texture;
  pmrem.dispose();
  scene.traverse((o) => {
    if (o instanceof Mesh) {
      o.geometry.dispose();
      (o.material as ShaderMaterial).dispose();
    }
  });
  return tex;
}

type Layer = { group: Group; parallax: number; mats: ShaderMaterial[] };

export class SpaceWorld {
  readonly root = new Group();
  private layers: Layer[] = [];
  private warpMats: ShaderMaterial[] = [];
  private planetGroup = new Group();
  private planet: Mesh;
  private planetMat: MeshStandardMaterial;
  /** Uniforms do planeta (luz, centro, normal dos anéis e escala servem também às sombras). */
  private planetUniforms = {
    uTime: { value: 0 },
    uAmp: { value: 0.01 },
    uFreq: { value: 1.5 },
    uLight: { value: new Vector3(-7, 3.5, 1.5).normalize() },
    uCenter: { value: new Vector3() },
    uRingN: { value: new Vector3(0, 0, 1) },
    uScale: { value: 1 },
  };
  private ringTilt = new Group();
  private ringMat: ShaderMaterial;
  private ringPtsMat: ShaderMaterial;
  private moons: { pivot: Group; speed: number }[] = [];
  private moonMat: MeshStandardMaterial;
  private meteor: Mesh;
  private meteorMat: ShaderMaterial;
  private meteorState = { next: 3, life: 0, dur: 1, dx: 0, dy: 0 };
  private galaxy: Points;
  private galaxyMat: ShaderMaterial;
  private dust: Points | null = null;
  private dustMat: ShaderMaterial | null = null;
  private dustVel: Float32Array | null = null;
  private dustBound: Float32Array | null = null;
  private env: Texture | null = null;
  private rand = mulberry(11);
  private time = 0;
  private cam = new Vector3(0, 0, 16);
  private look = new Vector3();
  private tmp = new Vector3();
  private tmpQ = new Quaternion();
  private axisX = new Vector3(1, 0, 0);
  private axisY = new Vector3(0, 1, 0);
  private par = { x: 0, y: 0 };
  private aspect = 0;
  private halfW = 1;
  private halfH = 1;

  constructor(private light: boolean) {
    const rand = mulberry(7);

    // --- estrelas: 3 camadas (fundo, meio, perto) ---
    const total = light ? 1500 : 4000;
    const split = [0.6, 0.28, 0.12];
    const ranges: [number, number][] = [
      [-70, -40],
      [-38, -18],
      [-16, -4],
    ];
    const parallax = [0.16, 0.5, 1.2]; // ~2x o anterior
    split.forEach((f, li) => {
      const n = Math.round(total * f);
      const pos = new Float32Array(n * 3);
      const size = new Float32Array(n);
      const bright = new Float32Array(n);
      const tw = new Float32Array(n);
      const phase = new Float32Array(n);
      const [z0, z1] = ranges[li];
      for (let i = 0; i < n; i++) {
        const z = z0 + rand() * (z1 - z0);
        const spread = Math.abs(z) * 0.95 + 4; // cobre o campo de visão em qualquer formato de tela
        pos[i * 3] = (rand() * 2 - 1) * spread * 1.9;
        pos[i * 3 + 1] = (rand() * 2 - 1) * spread;
        pos[i * 3 + 2] = z;
        const big = rand() < 0.04;
        size[i] = (li === 0 ? 1 : li === 1 ? 1.4 : 1.9) * (big ? 2.2 : 0.8 + rand() * 0.9);
        bright[i] = (0.25 + Math.pow(rand(), 2.2) * 0.75) * (big ? 1.2 : 1);
        tw[i] = rand() < 0.18 ? 0.6 + rand() * 1.4 : 0;
        phase[i] = rand() * Math.PI * 2;
      }
      const group = new Group();
      const mat = starMaterial();
      group.add(new Points(pointsGeometry(pos, size, bright, tw, phase), mat));
      // rastros do warp: 2 vértices por estrela (mais brilhantes)
      const lp = new Float32Array(n * 6);
      const le = new Float32Array(n * 2);
      const lb = new Float32Array(n * 2);
      for (let i = 0; i < n; i++) {
        for (let k = 0; k < 2; k++) {
          lp.set(pos.subarray(i * 3, i * 3 + 3), (i * 2 + k) * 3);
          le[i * 2 + k] = k;
          lb[i * 2 + k] = bright[i] * 0.8;
        }
      }
      const lg = new BufferGeometry();
      lg.setAttribute("position", new BufferAttribute(lp, 3));
      lg.setAttribute("aEnd", new BufferAttribute(le, 1));
      lg.setAttribute("aBright", new BufferAttribute(lb, 1));
      const wm = new ShaderMaterial({
        vertexShader: WARP_VERT,
        fragmentShader: WARP_FRAG,
        uniforms: { uWarp: { value: 0 } },
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
      });
      const lines = new LineSegments(lg, wm);
      lines.visible = false;
      lines.frustumCulled = false;
      group.add(lines);
      this.warpMats.push(wm);
      this.layers.push({ group, parallax: parallax[li], mats: [mat] });
      this.root.add(group);
    });

    // --- galáxia espiral (fundo, alto à esquerda) ---
    {
      const n = light ? 900 : 2600;
      const pos = new Float32Array(n * 3);
      const size = new Float32Array(n);
      const bright = new Float32Array(n);
      const tw = new Float32Array(n);
      const phase = new Float32Array(n);
      for (let i = 0; i < n; i++) {
        const arm = i % 2;
        const r = Math.pow(rand(), 0.7);
        const a = arm * Math.PI + r * 4.6 + (rand() - 0.5) * 0.55 * (1.2 - r);
        const scatter = (rand() - 0.5) * 0.12 * (1.3 - r);
        pos[i * 3] = Math.cos(a) * r + scatter;
        pos[i * 3 + 1] = Math.sin(a) * r + scatter;
        pos[i * 3 + 2] = (rand() - 0.5) * 0.06;
        size[i] = 0.8 + rand() * 1.3;
        bright[i] = 0.12 + (1 - r) * 0.22 + rand() * 0.08; // núcleo fraco (atrás do título)
        phase[i] = 0;
      }
      this.galaxyMat = starMaterial(0, 0.55);
      this.galaxy = new Points(pointsGeometry(pos, size, bright, tw, phase), this.galaxyMat);
      this.galaxy.scale.setScalar(9);
      this.galaxy.rotation.x = -1.05;
      this.galaxy.rotation.y = 0.35;
      this.root.add(this.galaxy);
    }

    // --- planeta ---
    const detail = light ? 24 : 64;
    this.planetMat = new MeshStandardMaterial({ color: 0xaeb1b6, metalness: 1, roughness: 0.36, envMapIntensity: 1 });
    this.planetMat.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, this.planetUniforms);
      shader.vertexShader = shader.vertexShader
        .replace(
          "#include <common>",
          `#include <common>
          uniform float uTime; uniform float uAmp; uniform float uFreq;
          varying vec3 vSpWorld;
          ${SIMPLEX}
          float sp_disp(vec3 n) {
            vec3 q = n * uFreq + vec3(0.0, uTime * 0.08, uTime * 0.04);
            return uAmp * (sp_snoise(q) + 0.35 * sp_snoise(q * 2.3 + 7.1));
          }`,
        )
        .replace(
          "#include <beginnormal_vertex>",
          `vec3 sp_n0 = normalize(position);
          vec3 sp_t = normalize(cross(sp_n0, abs(sp_n0.y) < 0.99 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0)));
          vec3 sp_b = cross(sp_n0, sp_t);
          vec3 sp_p0 = sp_n0 * (1.0 + sp_disp(sp_n0));
          vec3 sp_q1 = normalize(sp_n0 + sp_t * 0.012); vec3 sp_p1 = sp_q1 * (1.0 + sp_disp(sp_q1));
          vec3 sp_q2 = normalize(sp_n0 + sp_b * 0.012); vec3 sp_p2 = sp_q2 * (1.0 + sp_disp(sp_q2));
          vec3 objectNormal = normalize(cross(sp_p1 - sp_p0, sp_p2 - sp_p0));
          if (dot(objectNormal, sp_n0) < 0.0) objectNormal = -objectNormal;`,
        )
        .replace("#include <begin_vertex>", "vec3 transformed = sp_p0;")
        .replace("#include <project_vertex>", "#include <project_vertex>\nvSpWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;");
      shader.fragmentShader = shader.fragmentShader
        .replace(
          "#include <common>",
          `#include <common>
          uniform vec3 uLight; uniform vec3 uCenter; uniform vec3 uRingN; uniform float uScale;
          varying vec3 vSpWorld;
          ${RING_GLSL}`,
        )
        .replace(
          "#include <opaque_fragment>",
          `{
            // sombra fina dos anéis sobre o planeta: o raio de luz cruza o plano do anel
            float sp_dn = dot(uLight, uRingN);
            if (abs(sp_dn) > 1e-4) {
              float sp_s = dot(uCenter - vSpWorld, uRingN) / sp_dn;
              if (sp_s > 0.0) {
                vec3 sp_q = vSpWorld + uLight * sp_s;
                outgoingLight *= 1.0 - 0.7 * sp_ring(length(sp_q - uCenter) / uScale);
              }
            }
          }
          #include <opaque_fragment>`,
        );
    };
    this.planet = new Mesh(new IcosahedronGeometry(1, detail), this.planetMat);
    this.planetGroup.add(this.planet);

    // --- anéis: disco com faixas (shader) + partículas em órbita ---
    this.ringMat = new ShaderMaterial({
      vertexShader: RING_VERT,
      fragmentShader: RING_FRAG,
      uniforms: {
        uLight: this.planetUniforms.uLight,
        uCenter: this.planetUniforms.uCenter,
        uRingN: this.planetUniforms.uRingN,
        uRadius: this.planetUniforms.uScale,
      },
      transparent: true,
      depthWrite: false,
      side: DoubleSide,
    });
    this.ringTilt.add(new Mesh(new RingGeometry(RING_IN, RING_OUT, light ? 128 : 256, 1), this.ringMat));
    {
      const n = light ? 1800 : 7000;
      const rr = new Float32Array(n);
      const aa = new Float32Array(n);
      const zz = new Float32Array(n);
      const size = new Float32Array(n);
      const bright = new Float32Array(n);
      const tw = new Float32Array(n);
      const phase = new Float32Array(n);
      for (let i = 0; i < n; i++) {
        // raio sorteado pela densidade das faixas (rejeição): as partículas seguem as bandas
        let r = RING_IN;
        for (let k = 0; k < 24; k++) {
          r = RING_IN + rand() * (RING_OUT - RING_IN);
          if (rand() < ringDensity(r)) break;
        }
        rr[i] = r;
        aa[i] = rand() * Math.PI * 2;
        zz[i] = (rand() - 0.5) * 0.015;
        size[i] = 0.6 + rand() * 1.1;
        bright[i] = 0.25 + rand() * 0.55;
        tw[i] = rand() < 0.08 ? 1 + rand() * 2 : 0;
        phase[i] = rand() * Math.PI * 2;
      }
      const g = new BufferGeometry();
      g.setAttribute("position", new BufferAttribute(new Float32Array(n * 3), 3)); // a posição vem do shader
      g.setAttribute("aR", new BufferAttribute(rr, 1));
      g.setAttribute("aA", new BufferAttribute(aa, 1));
      g.setAttribute("aZ", new BufferAttribute(zz, 1));
      g.setAttribute("aSize", new BufferAttribute(size, 1));
      g.setAttribute("aBright", new BufferAttribute(bright, 1));
      g.setAttribute("aTw", new BufferAttribute(tw, 1));
      g.setAttribute("aPhase", new BufferAttribute(phase, 1));
      this.ringPtsMat = new ShaderMaterial({
        vertexShader: RING_PTS_VERT,
        fragmentShader: STAR_FRAG,
        uniforms: {
          uTime: { value: 0 },
          uDpr: { value: 1 },
          uK: { value: 0.22 },
          uSoft: { value: 0 },
          uOpacity: { value: 0.75 },
          uLight: this.planetUniforms.uLight,
          uCenter: this.planetUniforms.uCenter,
          uRadius: this.planetUniforms.uScale,
        },
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
      });
      const pts = new Points(g, this.ringPtsMat);
      pts.frustumCulled = false;
      this.ringTilt.add(pts);
    }
    this.ringTilt.rotation.set(1.2, 0, 0.4); // ~21° de abertura, ~22° de inclinação lateral
    this.planetGroup.add(this.ringTilt);

    // --- luas metálicas em órbitas inclinadas (1 no modo leve) ---
    this.moonMat = new MeshStandardMaterial({ color: 0x9fa3a8, metalness: 1, roughness: 0.32, envMapIntensity: 1 });
    const moonDefs = [
      // órbitas bem inclinadas (quase verticais na tela): as luas ficam ao lado do
      // planeta, longe do título e dos botões
      { r: 2.6, size: 0.05, incl: [0.25, 1.3], speed: 0.16, a0: 0.8 },
      { r: 3.0, size: 0.034, incl: [-0.2, -1.4], speed: -0.1, a0: 3.6 },
    ].slice(0, light ? 1 : 2);
    moonDefs.forEach((d) => {
      const tilt = new Group();
      tilt.rotation.set(d.incl[0], d.incl[1], 0); // em Y: plano da órbita quase de perfil
      const pivot = new Group();
      pivot.rotation.z = d.a0;
      const mesh = new Mesh(new IcosahedronGeometry(1, light ? 4 : 10), this.moonMat);
      mesh.scale.setScalar(d.size);
      mesh.position.set(d.r, 0, 0);
      pivot.add(mesh);
      tilt.add(pivot);
      this.planetGroup.add(tilt);
      this.moons.push({ pivot, speed: d.speed });
    });
    this.root.add(this.planetGroup);

    // --- estrela cadente (uma só, reaproveitada) ---
    this.meteorMat = new ShaderMaterial({
      vertexShader: METEOR_VERT,
      fragmentShader: METEOR_FRAG,
      uniforms: { uFade: { value: 0 } },
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
    });
    this.meteor = new Mesh(new PlaneGeometry(1, 1), this.meteorMat);
    this.meteor.visible = false;
    this.root.add(this.meteor);

    // luz fria vinda da esquerda, mais lateral: contorno, faixas dos anéis e sombras
    const key = new DirectionalLight(0xe4eaf2, 1.15);
    key.position.copy(this.planetUniforms.uLight.value).multiplyScalar(10);
    this.root.add(key);
    const rim = new DirectionalLight(0xcfd6e0, 0.9);
    rim.position.set(4, 2, -6);
    this.root.add(rim);

    // --- poeira desfocada atravessando a cena em várias profundidades ---
    if (!light) {
      const n = 44;
      const pos = new Float32Array(n * 3);
      const size = new Float32Array(n);
      const bright = new Float32Array(n);
      const tw = new Float32Array(n);
      const phase = new Float32Array(n);
      this.dustVel = new Float32Array(n * 2);
      this.dustBound = new Float32Array(n * 2);
      for (let i = 0; i < n; i++) {
        const z = -14 + rand() * 25; // do fundo até perto da câmera
        const depth = 16 - z;
        this.dustBound[i * 2] = depth * 0.8;
        this.dustBound[i * 2 + 1] = depth * 0.45;
        pos[i * 3] = (rand() * 2 - 1) * this.dustBound[i * 2];
        pos[i * 3 + 1] = (rand() * 2 - 1) * this.dustBound[i * 2 + 1];
        pos[i * 3 + 2] = z;
        const near = 1 - depth / 30; // perto: maior, mais desfocada e mais rápida
        size[i] = 14 + near * 110 + rand() * 20;
        bright[i] = 0.035 + rand() * 0.06;
        this.dustVel[i * 2] = (rand() < 0.5 ? -1 : 1) * (0.15 + rand() * 0.35) * (0.5 + near);
        this.dustVel[i * 2 + 1] = (rand() - 0.5) * 0.08;
      }
      this.dustMat = starMaterial(1);
      this.dust = new Points(pointsGeometry(pos, size, bright, tw, phase), this.dustMat);
      this.dust.frustumCulled = false;
      this.root.add(this.dust);
    }
  }

  /** Reenquadra planeta e galáxia conforme o formato da tela (câmera inicial z = 16). */
  private frame(camera: PerspectiveCamera) {
    if (camera.aspect === this.aspect) return;
    this.aspect = camera.aspect;
    this.halfH = Math.tan((camera.fov * Math.PI) / 360) * 16;
    this.halfW = this.halfH * camera.aspect;
    const wide = camera.aspect >= 1;
    // desktop: embaixo à direita, no vazio ao lado do texto e dos botões,
    // cortado pela borda; retrato: embaixo à direita
    const r = wide ? Math.min(this.halfH * 0.45, this.halfW * 0.3) : this.halfW * 0.62;
    this.planetGroup.scale.setScalar(r);
    this.planetGroup.position.set(this.halfW * (wide ? 0.85 : 0.98), wide ? -this.halfH * 0.3 : -this.halfH * 0.5, 0);
    this.galaxy.position.set(-this.halfW * 0.95 * 3.2, this.halfH * 0.62 * 3.2, -35);
  }

  setEnvironment(gl: WebGLRenderer) {
    if (this.env) return;
    this.env = darkEnvironment(gl);
    this.planetMat.envMap = this.env;
    this.planetMat.needsUpdate = true;
    this.moonMat.envMap = this.env;
    this.moonMat.needsUpdate = true;
  }

  update(
    camera: PerspectiveCamera,
    dpr: number,
    progress: number,
    pointer: { x: number; y: number },
    warp: number,
    dt: number,
    still: boolean,
  ) {
    this.frame(camera);
    if (!still) this.time += dt;
    const t = this.time;
    const k = 1 - Math.exp(-dt * 3);

    // estrelas: parallax por camada (lerp suave) + warp
    this.par.x += (pointer.x - this.par.x) * k;
    this.par.y += (pointer.y - this.par.y) * k;
    this.layers.forEach((l) => {
      l.group.position.x = -this.par.x * l.parallax;
      l.group.position.y = this.par.y * l.parallax;
      l.mats.forEach((m) => {
        m.uniforms.uTime.value = t;
        m.uniforms.uDpr.value = dpr;
      });
    });
    this.warpMats.forEach((m, i) => {
      m.uniforms.uWarp.value = warp;
      (this.layers[i].group.children[1] as LineSegments).visible = warp > 0.002;
    });
    this.galaxyMat.uniforms.uDpr.value = dpr;

    // planeta: rotação e ondulação um pouco mais visíveis
    this.planetUniforms.uTime.value = t;
    this.planet.rotation.y = t * 0.06;
    // anéis: oscilação lenta, quase imperceptível; dados das sombras em coordenadas do mundo
    this.ringTilt.rotation.z = 0.4 + Math.sin(t * 0.06) * 0.015;
    this.ringTilt.rotation.x = 1.2 + Math.sin(t * 0.045 + 1.3) * 0.01;
    this.planetGroup.updateMatrixWorld();
    this.planetGroup.getWorldPosition(this.planetUniforms.uCenter.value);
    this.planetUniforms.uScale.value = this.planetGroup.scale.x;
    this.planetUniforms.uRingN.value.set(0, 0, 1).applyQuaternion(this.ringTilt.getWorldQuaternion(this.tmpQ));
    this.ringPtsMat.uniforms.uTime.value = t;
    this.ringPtsMat.uniforms.uDpr.value = dpr;
    if (!still) this.moons.forEach((m) => (m.pivot.rotation.z += m.speed * dt));
    this.galaxy.rotation.z = t * 0.03; // perceptível, mas lenta
    this.updateMeteor(dt, still);

    // poeira: atravessa a cena e dá a volta pelas bordas (limites por profundidade)
    if (this.dust && this.dustVel && this.dustBound && this.dustMat) {
      this.dustMat.uniforms.uDpr.value = dpr;
      const p = this.dust.geometry.getAttribute("position") as BufferAttribute;
      const a = p.array as Float32Array;
      if (!still) {
        for (let i = 0; i < a.length / 3; i++) {
          const bx = this.dustBound[i * 2];
          const by = this.dustBound[i * 2 + 1];
          a[i * 3] += this.dustVel[i * 2] * dt;
          a[i * 3 + 1] += this.dustVel[i * 2 + 1] * dt;
          if (a[i * 3] > bx) a[i * 3] = -bx;
          else if (a[i * 3] < -bx) a[i * 3] = bx;
          if (a[i * 3 + 1] > by) a[i * 3 + 1] = -by;
          else if (a[i * 3 + 1] < -by) a[i * 3 + 1] = by;
        }
        p.needsUpdate = true;
      }
    }

    // câmera: avança em direção ao planeta com o scroll ("fechar a distância").
    // Só em frente (e um nada para o lado dele): o planeta cresce e vai para a
    // borda, nunca para trás do título.
    const e = progress * progress * (3 - 2 * progress);
    const px = this.planetGroup.position.x;
    const py = this.planetGroup.position.y;
    const target = new Vector3(px * 0.06 * e, py * 0.04 * e, 16 - 1.6 * e);
    if (still) this.cam.copy(target);
    else this.cam.lerp(target, 1 - Math.exp(-dt * 4));
    // deriva orbital lenta em volta do planeta: câmera e alvo giram juntos em
    // torno do centro dele (o planeta fica no lugar na tela; o fundo desliza)
    const yaw = Math.sin(t * 0.05) * 0.1;
    const pitch = Math.sin(t * 0.037 + 0.7) * 0.04;
    const c = this.planetUniforms.uCenter.value;
    const orbit = (v: Vector3) => v.sub(c).applyAxisAngle(this.axisY, yaw).applyAxisAngle(this.axisX, pitch).add(c);
    camera.position.copy(orbit(this.tmp.copy(this.cam)));
    this.look.set(this.cam.x, this.cam.y, 0);
    camera.lookAt(orbit(this.look));
  }

  /** Estrela cadente ocasional (a cada 4 a 8 s), fina e rápida, na metade direita do fundo. */
  private updateMeteor(dt: number, still: boolean) {
    const m = this.meteorState;
    if (still) {
      this.meteor.visible = false;
      return;
    }
    if (m.life <= 0) {
      m.next -= dt;
      if (m.next > 0) return;
      const r = this.rand;
      const z = -28;
      const s = (16 - z) / 16; // escala da tela na profundidade do fundo
      // nasce no alto, à direita do título, e cai em diagonal (para um dos lados)
      const toLeft = r() < 0.5;
      const ang = toLeft ? Math.PI + 0.35 + r() * 0.4 : -(0.35 + r() * 0.4);
      const speed = 38 + r() * 20;
      m.dx = Math.cos(ang) * speed;
      m.dy = Math.sin(ang) * speed;
      m.dur = 0.55 + r() * 0.35;
      m.life = m.dur;
      m.next = 4 + r() * 4;
      this.meteor.position.set(this.halfW * s * (0.1 + r() * 0.8), this.halfH * s * (0.25 + r() * 0.6), z);
      this.meteor.rotation.z = ang;
      this.meteor.scale.set(4 + r() * 3, 0.035, 1);
      this.meteor.visible = true;
    }
    m.life -= dt;
    this.meteor.position.x += m.dx * dt;
    this.meteor.position.y += m.dy * dt;
    const p = Math.min(Math.max(1 - m.life / m.dur, 0), 1);
    this.meteorMat.uniforms.uFade.value = Math.sin(Math.PI * p) * 0.8;
    if (m.life <= 0) this.meteor.visible = false;
  }

  dispose() {
    this.root.traverse((o) => {
      if (o instanceof Mesh || o instanceof Points || o instanceof LineSegments) {
        o.geometry.dispose();
        const m = o.material;
        (Array.isArray(m) ? m : [m]).forEach((mm) => mm.dispose());
      }
    });
    this.env?.dispose();
  }
}

import {
  AdditiveBlending,
  BackSide,
  BufferAttribute,
  BufferGeometry,
  Color,
  DirectionalLight,
  Group,
  IcosahedronGeometry,
  LineBasicMaterial,
  LineLoop,
  LineSegments,
  Mesh,
  MeshStandardMaterial,
  PMREMGenerator,
  PerspectiveCamera,
  PlaneGeometry,
  Points,
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
 * - Anéis finos de partículas (e uma linha) inclinados, velocidades diferentes.
 * - Galáxia espiral cinza, bem fraca, no alto à esquerda, atrás do título.
 * - Poeira desfocada em primeiro plano (não no modo leve).
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

/** Ambiente escuro do planeta: cúpula em degradê quase preto + 2 faixas frias fracas. */
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
  private planetUniforms = { uTime: { value: 0 }, uAmp: { value: 0.0065 }, uFreq: { value: 1.5 } };
  private rings: { group: Group; speed: number }[] = [];
  private ringMats: ShaderMaterial[] = [];
  private galaxy: Points;
  private galaxyMat: ShaderMaterial;
  private dust: Points | null = null;
  private dustMat: ShaderMaterial | null = null;
  private dustVel: Float32Array | null = null;
  private env: Texture | null = null;
  private time = 0;
  private cam = new Vector3(0, 0, 16);
  private look = new Vector3();
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
    const parallax = [0.08, 0.25, 0.6];
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

    // --- planeta + anéis ---
    const detail = light ? 24 : 64;
    this.planetMat = new MeshStandardMaterial({ color: 0xaeb1b6, metalness: 1, roughness: 0.36, envMapIntensity: 1 });
    this.planetMat.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, this.planetUniforms);
      shader.vertexShader = shader.vertexShader
        .replace(
          "#include <common>",
          `#include <common>
          uniform float uTime; uniform float uAmp; uniform float uFreq;
          ${SIMPLEX}
          float sp_disp(vec3 n) {
            vec3 q = n * uFreq + vec3(0.0, uTime * 0.06, uTime * 0.03);
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
        .replace("#include <begin_vertex>", "vec3 transformed = sp_p0;");
    };
    this.planet = new Mesh(new IcosahedronGeometry(1, detail), this.planetMat);
    this.planetGroup.add(this.planet);

    const ringDefs = [
      { r0: 1.34, r1: 1.47, n: light ? 700 : 2200, tilt: [1.22, 0.18], speed: 0.05, b: 0.6 },
      { r0: 1.58, r1: 1.62, n: light ? 300 : 900, tilt: [1.3, -0.12], speed: -0.03, b: 0.75 },
      { r0: 1.82, r1: 1.98, n: light ? 400 : 1300, tilt: [1.12, 0.32], speed: 0.018, b: 0.4 },
    ];
    ringDefs.forEach((d, ri) => {
      const pos = new Float32Array(d.n * 3);
      const size = new Float32Array(d.n);
      const bright = new Float32Array(d.n);
      const tw = new Float32Array(d.n);
      const phase = new Float32Array(d.n);
      for (let i = 0; i < d.n; i++) {
        const a = rand() * Math.PI * 2;
        const r = d.r0 + rand() * (d.r1 - d.r0);
        pos[i * 3] = Math.cos(a) * r;
        pos[i * 3 + 1] = Math.sin(a) * r;
        pos[i * 3 + 2] = (rand() - 0.5) * 0.02;
        size[i] = 0.7 + rand() * 1.1;
        bright[i] = d.b * (0.4 + rand() * 0.6);
        tw[i] = rand() < 0.1 ? 1 + rand() : 0;
        phase[i] = rand() * 6.28;
      }
      const tilt = new Group();
      tilt.rotation.set(d.tilt[0], 0, d.tilt[1]);
      const spin = new Group();
      const mat = starMaterial();
      this.ringMats.push(mat);
      spin.add(new Points(pointsGeometry(pos, size, bright, tw, phase), mat));
      if (ri === 1) {
        // um fio contínuo junto do anel do meio
        const seg = 256;
        const lp = new Float32Array(seg * 3);
        for (let i = 0; i < seg; i++) {
          const a = (i / seg) * Math.PI * 2;
          lp[i * 3] = Math.cos(a) * 1.7;
          lp[i * 3 + 1] = Math.sin(a) * 1.7;
        }
        const lg = new BufferGeometry();
        lg.setAttribute("position", new BufferAttribute(lp, 3));
        spin.add(new LineLoop(lg, new LineBasicMaterial({ color: 0xc9cdd3, transparent: true, opacity: 0.18, depthWrite: false })));
      }
      tilt.add(spin);
      this.planetGroup.add(tilt);
      this.rings.push({ group: spin, speed: d.speed });
    });
    this.root.add(this.planetGroup);

    // luz fria de contorno, vinda do alto à esquerda (o lado do texto fica escuro)
    const key = new DirectionalLight(0xe4eaf2, 1.1);
    key.position.set(-6, 5, 3);
    this.root.add(key);
    const rim = new DirectionalLight(0xcfd6e0, 0.9);
    rim.position.set(4, 2, -6);
    this.root.add(rim);

    // --- poeira desfocada em primeiro plano ---
    if (!light) {
      const n = 22;
      const pos = new Float32Array(n * 3);
      const size = new Float32Array(n);
      const bright = new Float32Array(n);
      const tw = new Float32Array(n);
      const phase = new Float32Array(n);
      this.dustVel = new Float32Array(n * 2);
      for (let i = 0; i < n; i++) {
        pos[i * 3] = (rand() * 2 - 1) * 6;
        pos[i * 3 + 1] = (rand() * 2 - 1) * 3.4;
        pos[i * 3 + 2] = 4 + rand() * 7;
        size[i] = 40 + rand() * 80;
        bright[i] = 0.05 + rand() * 0.07;
        this.dustVel[i * 2] = (rand() - 0.5) * 0.12;
        this.dustVel[i * 2 + 1] = 0.02 + rand() * 0.05;
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
    this.ringMats.forEach((m) => {
      m.uniforms.uTime.value = t;
      m.uniforms.uDpr.value = dpr;
    });
    this.galaxyMat.uniforms.uDpr.value = dpr;

    // planeta: ondulação e rotação lentas; anéis em velocidades diferentes
    this.planetUniforms.uTime.value = t;
    this.planet.rotation.y = t * 0.035;
    this.rings.forEach((r) => (r.group.rotation.z = t * r.speed));
    this.galaxy.rotation.z = t * 0.006;

    // poeira: deriva lenta, dá a volta pelas bordas
    if (this.dust && this.dustVel && this.dustMat) {
      this.dustMat.uniforms.uDpr.value = dpr;
      const p = this.dust.geometry.getAttribute("position") as BufferAttribute;
      const a = p.array as Float32Array;
      if (!still) {
        for (let i = 0; i < a.length / 3; i++) {
          a[i * 3] += this.dustVel[i * 2] * dt;
          a[i * 3 + 1] += this.dustVel[i * 2 + 1] * dt;
          if (a[i * 3 + 1] > 4) a[i * 3 + 1] = -4;
          if (a[i * 3] > 7) a[i * 3] = -7;
          if (a[i * 3] < -7) a[i * 3] = 7;
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
    camera.position.copy(this.cam);
    this.look.set(this.cam.x, this.cam.y, 0);
    camera.lookAt(this.look);
  }

  dispose() {
    this.root.traverse((o) => {
      if (o instanceof Mesh || o instanceof Points || o instanceof LineSegments || o instanceof LineLoop) {
        o.geometry.dispose();
        const m = o.material;
        (Array.isArray(m) ? m : [m]).forEach((mm) => mm.dispose());
      }
    });
    this.env?.dispose();
  }
}

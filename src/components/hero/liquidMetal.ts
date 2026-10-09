import { Color, MeshPhysicalMaterial, Vector3 } from "three";

/**
 * Material de metal líquido: MeshPhysicalMaterial (PBR, reflexos do ambiente)
 * com uma deformação orgânica injetada no vertex shader.
 *
 * A forma é uma bola (icosfera densa, centrada na origem) cuja superfície é
 * deslocada ao longo da normal por três camadas, somadas em `lm_liquid`:
 *  1. FORMA (SDF / metaballs) — base para o urso da Etapa 4: a bola é fundida
 *     por união suave (smooth-min) com até FEATURE_SLOTS esferas extras
 *     (orelhas, focinho). Para cada vértice, o raio da superfície na direção
 *     dele é encontrado por sphere tracing de fora para dentro. Com
 *     `uMorph = 0` a camada é pulada (custo zero) e a bola fica perfeita;
 *     animar `uMorph` 0→1 faz as formas "brotarem" e 1→0 voltarem à bola.
 *  2. LÍQUIDO — ruído simplex lento (a "respiração" contínua).
 *  3. PONTEIRO — o lado voltado para o cursor estica levemente.
 * A normal é recalculada por diferenças finitas sobre a soma, então os
 * reflexos acompanham a superfície. Não há modelo GLB: o urso nasce da bola.
 */

export const SILVER = new Color("#eef0f3");
export const GRAPHITE = new Color("#24262a");

/** Quantidade máxima de esferas extras fundidas à bola (orelhas, focinho...). */
export const FEATURE_SLOTS = 4;

export type LiquidUniforms = {
  uTime: { value: number };
  uAmp: { value: number };
  uFreq: { value: number };
  uPointerDir: { value: Vector3 };
  uPointerStrength: { value: number };
  /** 0 = bola perfeita; 1 = formas extras totalmente brotadas. */
  uMorph: { value: number };
  /** Raio da união suave (quanto maior, mais "derretida" a junção). */
  uBlend: { value: number };
  /** Centros das esferas extras, em unidades da cena (relativos ao centro da bola). */
  uFeatureCenters: { value: Vector3[] };
  /** Raios das esferas extras quando uMorph = 1 (0 = slot desligado). */
  uFeatureRadii: { value: number[] };
};

// Simplex noise 3D (Ashima Arts / Stefan Gustavson, licença MIT).
const SIMPLEX = /* glsl */ `
vec3 lm_mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 lm_mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 lm_permute(vec4 x){return lm_mod289(((x*34.0)+10.0)*x);}
vec4 lm_taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float lm_snoise(vec3 v){
  const vec2 C=vec2(1.0/6.0,1.0/3.0);
  const vec4 D=vec4(0.0,0.5,1.0,2.0);
  vec3 i=floor(v+dot(v,C.yyy));
  vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz);
  vec3 l=1.0-g;
  vec3 i1=min(g.xyz,l.zxy);
  vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx;
  vec3 x2=x0-i2+C.yyy;
  vec3 x3=x0-D.yyy;
  i=lm_mod289(i);
  vec4 p=lm_permute(lm_permute(lm_permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
  float n_=0.142857142857;
  vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.0*floor(p*ns.z*ns.z);
  vec4 x_=floor(j*ns.z);
  vec4 y_=floor(j-7.0*x_);
  vec4 x=x_*ns.x+ns.yyyy;
  vec4 y=y_*ns.x+ns.yyyy;
  vec4 h=1.0-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy);
  vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.0+1.0;
  vec4 s1=floor(b1)*2.0+1.0;
  vec4 sh=-step(h,vec4(0.0));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;
  vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x);
  vec3 p1=vec3(a0.zw,h.y);
  vec3 p2=vec3(a1.xy,h.z);
  vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=lm_taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
  vec4 m=max(0.5-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0);
  m=m*m;
  return 105.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}
`;

const DISPLACE = /* glsl */ `
uniform float uTime;
uniform float uAmp;
uniform float uFreq;
uniform vec3 uPointerDir;
uniform float uPointerStrength;
uniform float uMorph;
uniform float uBlend;
uniform vec3 uFeatureCenters[${FEATURE_SLOTS}];
uniform float uFeatureRadii[${FEATURE_SLOTS}];
${SIMPLEX}
// união suave polinomial (Inigo Quilez)
float lm_smin(float a, float b, float k){
  float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
  return mix(b, a, h) - k * h * (1.0 - h);
}
// campo de distância: bola de raio R fundida às esferas extras
float lm_field(vec3 q, float R){
  float d = length(q) - R;
  for (int i = 0; i < ${FEATURE_SLOTS}; i++) {
    float r = uFeatureRadii[i] * uMorph;
    if (r > 0.0) d = lm_smin(d, length(q - uFeatureCenters[i]) - r, uBlend);
  }
  return d;
}
// quanto a superfície da FORMA se afasta da bola na direção de p
float lm_shape(vec3 p){
  if (uMorph <= 0.0001) return 0.0;
  float R = length(p);
  vec3 dir = p / R;
  float t = R * 1.9; // começa fora e caminha para dentro até a superfície
  for (int i = 0; i < 10; i++) t -= lm_field(dir * t, R);
  return t - R;
}
float lm_liquid(vec3 p){
  // ondulação lenta e larga: lê como líquido denso, não como "gelatina"
  float n = lm_snoise(p * uFreq + vec3(0.0, uTime * 0.22, uTime * 0.12));
  #ifndef LIQUID_LIGHT
  n = n * 0.85 + lm_snoise(p * uFreq * 1.9 - vec3(uTime * 0.15)) * 0.15;
  #endif
  // o lado voltado para o cursor "estica" levemente em direção a ele
  float pull = pow(max(dot(normalize(p), uPointerDir), 0.0), 5.0) * uPointerStrength;
  return lm_shape(p) + n * uAmp + pull;
}
`;

export function createLiquidMetalMaterial({ light }: { light: boolean }) {
  const uniforms: LiquidUniforms = {
    uTime: { value: 0 },
    // amplitude/frequência baixas = superfície contínua de líquido denso (valores
    // altos viram "rocha amassada")
    // ondulação contida: continua lendo como BOLA que respira, não como gota amassada
    uAmp: { value: light ? 0.045 : 0.05 },
    uFreq: { value: 0.5 },
    uPointerDir: { value: new Vector3(0, 0, 1) },
    uPointerStrength: { value: 0 },
    uMorph: { value: 0 },
    uBlend: { value: 0.35 },
    uFeatureCenters: { value: Array.from({ length: FEATURE_SLOTS }, () => new Vector3()) },
    uFeatureRadii: { value: new Array(FEATURE_SLOTS).fill(0) },
  };

  // Cromo brilhante: rugosidade baixa + verniz; a "cara" vem dos reflexos do estúdio.
  const material = new MeshPhysicalMaterial({
    color: SILVER.clone(),
    metalness: 1,
    roughness: 0.02,
    clearcoat: 0.35,
    clearcoatRoughness: 0.02,
  });

  material.defines = light ? { LIQUID_LIGHT: "" } : {};
  material.userData.uniforms = uniforms;
  material.customProgramCacheKey = () => (light ? "liquid-light" : "liquid");

  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);

    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", `#include <common>\n${DISPLACE}`)
      .replace(
        "#include <beginnormal_vertex>",
        /* glsl */ `
        vec3 lmN = normalize(normal);
        vec3 lmT = normalize(cross(lmN, abs(lmN.y) < 0.99 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0)));
        vec3 lmB = cross(lmN, lmT);
        const float lmE = 0.015;
        vec3 lmDisplaced = position + lmN * lm_liquid(position);
        vec3 lmPa = position + lmT * lmE; lmPa += lmN * lm_liquid(lmPa);
        vec3 lmPb = position + lmB * lmE; lmPb += lmN * lm_liquid(lmPb);
        vec3 objectNormal = normalize(cross(lmPa - lmDisplaced, lmPb - lmDisplaced));
        if (dot(objectNormal, lmN) < 0.0) objectNormal = -objectNormal;
        #ifdef USE_TANGENT
          vec3 objectTangent = vec3(tangent.xyz);
        #endif
        `,
      )
      .replace("#include <begin_vertex>", "vec3 transformed = lmDisplaced;");
  };

  return material;
}

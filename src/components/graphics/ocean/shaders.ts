/**
 * GLSL do oceano (ver OceanScene). Tudo é calculado de forma analítica, sem
 * raymarch: o fundo é UM quadro em tela cheia que, para cada pixel, decide se
 * o ponto logo à frente da câmera está acima ou abaixo da água (é isso que
 * desenha a "linha d'água" ondulando na tela ao atravessar a superfície) e:
 * - acima: céu escuro com halo prata baixo, mar de ondas (soma de senoides
 *   direcionais com dispersão real) refletindo esse céu, faixa de brilho
 *   prata e névoa no horizonte;
 * - abaixo: água grafite levemente azulada, mais clara para cima, raios de
 *   luz (god rays) irradiando da direção do sol, a superfície vista de baixo
 *   (janela clara + reflexão total escura) e o fundo de areia com cáusticas.
 * Os objetos (corais, cardume, tubarões, partículas) são malhas comuns que
 * usam as MESMAS funções de névoa/cor da água, então somem na distância
 * exatamente na cor do fundo.
 */

/** Altura média da superfície e do fundo (unidades do mundo). */
export const BED_LEVEL = -17;

const COMMON = /* glsl */ `
uniform float uTime;
uniform vec3 uCamPos;

#define FOG_D 0.05
// distância do "ponto logo à frente da câmera" usado no teste acima/abaixo
#define SPLIT 0.55
#define BED ${BED_LEVEL.toFixed(1)}

const vec3 MOON = vec3(0.0, 0.158, -0.987);
const vec3 SUN = vec3(0.222, 0.889, -0.4);

float hash1(float x) { return fract(sin(x * 127.1) * 43758.5453); }
float noise1(float x) {
  float i = floor(x), f = fract(x);
  return mix(hash1(i), hash1(i + 1.0), f * f * (3.0 - 2.0 * f));
}
float hash2(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise2(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash2(i), hash2(i + vec2(1, 0)), u.x), mix(hash2(i + vec2(0, 1)), hash2(i + vec2(1, 1)), u.x), u.y);
}

// ---- ondas: soma de senoides direcionais (k, amplitude), velocidade pela
// dispersão de águas profundas (w = sqrt(g k)), em câmera lenta
#ifdef LIGHT
#define NW 3
#else
#define NW 5
#endif
const vec4 WAVES[5] = vec4[5](
  vec4(0.800, 0.600, 0.30, 0.20),
  vec4(-0.447, 0.894, 0.52, 0.12),
  vec4(0.970, -0.243, 0.95, 0.07),
  vec4(-0.707, -0.707, 1.70, 0.04),
  vec4(0.287, 0.958, 2.90, 0.022)
);
float waveH(vec2 p) {
  float h = 0.0;
  for (int i = 0; i < NW; i++) {
    vec4 w = WAVES[i];
    h += w.w * sin(dot(p, w.xy) * w.z + uTime * sqrt(9.8 * w.z) * 0.55 + float(i) * 1.7);
  }
  return h;
}
vec2 waveGrad(vec2 p) {
  vec2 g = vec2(0.0);
  for (int i = 0; i < NW; i++) {
    vec4 w = WAVES[i];
    g += w.xy * (w.w * w.z * cos(dot(p, w.xy) * w.z + uTime * sqrt(9.8 * w.z) * 0.55 + float(i) * 1.7));
  }
  return g;
}

// ---- debaixo d'água: cor da água vista na direção rd (fundo e névoa)
float depthLight(float y) { return exp(min(y, 0.0) * 0.04); }
vec3 waterCol(vec3 rd) {
  float k = depthLight(uCamPos.y);
  float up = smoothstep(-0.7, 1.0, rd.y);
  vec3 deep = vec3(0.016, 0.022, 0.027);
  vec3 shallow = vec3(0.24, 0.27, 0.29);
  vec3 c = mix(deep, shallow * k, up);
  c += vec3(0.21, 0.23, 0.24) * pow(max(dot(rd, SUN), 0.0), 6.0) * k * 0.7;
  return c;
}
float fogF(float d) { return 1.0 - exp(-d * FOG_D); }

// cáusticas: linhas finas onde dois campos de ruído deformado cruzam o meio
// (rede orgânica que se move); duas camadas em velocidades diferentes
float caustic(vec2 p) {
  float t = uTime * 0.45;
  vec2 q = p + 0.7 * vec2(noise2(p * 0.5 + t * 0.3), noise2(p * 0.5 - t * 0.25 + 5.0));
  float a = 1.0 - abs(noise2(q * 1.4 + vec2(t * 0.4, 0.0)) * 2.0 - 1.0);
  float b = 1.0 - abs(noise2(q * 2.3 - vec2(0.0, t * 0.5) + 9.0) * 2.0 - 1.0);
  return pow(a, 9.0) + 0.6 * pow(b, 11.0);
}

// teste da linha d'água: > 0 = este pixel está acima da superfície
float splitSide(vec3 rd) {
  vec3 np = uCamPos + rd * SPLIT;
  return np.y - waveH(np.xz);
}
`;

// ------------------------------------------------------------------ fundo
export const BACKDROP_VERT = /* glsl */ `
void main() { gl_Position = vec4(position.xy, 0.0, 1.0); }`;

export const BACKDROP_FRAG = /* glsl */ `
uniform vec2 uRes;
uniform mat3 uCamRot;
uniform float uTan;
${COMMON}

vec3 sky(vec3 rd) {
  float y = max(rd.y, 0.0);
  vec3 hor = vec3(0.27, 0.28, 0.29);
  vec3 zen = vec3(0.028, 0.03, 0.034);
  vec3 c = mix(hor, zen, pow(y, 0.42));
  float m = max(dot(rd, MOON), 0.0);
  // halo largo e suave (sem disco: lua desenhada lê como ilustração)
  c += vec3(0.42, 0.43, 0.44) * pow(m, 18.0) * 0.5 + vec3(0.6) * pow(m, 260.0) * 0.5;
  return c;
}

vec3 aboveWater(vec3 ro, vec3 rd) {
  if (rd.y >= -0.002) return sky(rd);
  float t = -ro.y / rd.y;
  for (int i = 0; i < 2; i++) {
    vec3 p = ro + rd * t;
    t = max((waveH(p.xz) - ro.y) / rd.y, 0.0);
  }
  vec3 p = ro + rd * t;
  // longe, as ondas viram textura fina: achata a normal (sem serrilhado)
  float fade = exp(-t * 0.035);
  vec2 g = waveGrad(p.xz) * mix(0.35, 1.0, fade);
#ifndef LIGHT
  // ondulação fina (brilho da faixa prata)
  vec2 d = p.xz * 2.2 + vec2(uTime * 0.6, uTime * 0.4);
  float n0 = noise2(d), nx = noise2(d + vec2(0.05, 0.0)), nz = noise2(d + vec2(0.0, 0.05));
  g += vec2(nx - n0, nz - n0) * 2.2 * fade * fade;
#endif
  vec3 n = normalize(vec3(-g.x, 1.0, -g.y));
  vec3 r = reflect(rd, n);
  r.y = abs(r.y);
  float fr = 0.02 + 0.98 * pow(1.0 - max(dot(-rd, n), 0.0), 5.0);
  float crest = clamp(waveH(p.xz) * 2.2, 0.0, 1.0);
  vec3 body = vec3(0.008, 0.01, 0.012) + vec3(0.02, 0.023, 0.025) * crest;
  vec3 c = mix(body, sky(r), fr);
  // cintilação prata no caminho da luz
  c += vec3(0.95, 0.97, 1.0) * pow(max(dot(r, MOON), 0.0), 900.0) * 3.2;
  // névoa no horizonte
  float haze = 1.0 - exp(-t * 0.016);
  c = mix(c, sky(normalize(vec3(rd.x, 0.0, rd.z))), haze);
  return c;
}

float godRays(vec3 rd) {
  vec3 a = normalize(cross(SUN, vec3(0.0, 0.0, 1.0)));
  vec3 b = cross(SUN, a);
  float ang = atan(dot(rd, b), dot(rd, a));
  float s = noise1(ang * 11.0 + uTime * 0.07) * noise1(ang * 27.0 - uTime * 0.12 + 4.0);
  s = smoothstep(0.12, 0.75, s);
  float facing = max(dot(rd, SUN), 0.0);
  // mais forte perto da superfície; some ao descer
  return s * pow(facing, 1.6) * depthLight(uCamPos.y * 0.6);
}

vec3 underWater(vec3 ro, vec3 rd) {
  vec3 base = waterCol(rd);
  vec3 c = base;
  if (rd.y > 0.0) {
    // superfície vista de baixo
    float t = max(-ro.y, 0.0) / rd.y;
    vec3 p = ro + rd * t;
    vec2 g = waveGrad(p.xz);
    vec3 nd = normalize(vec3(g.x, -1.0, g.y)); // normal virada para a água
    // janela de Snell (suavizada): só a luz que entra quase de cima atravessa
    float cosI = dot(rd, -nd);
    float win = smoothstep(0.38, 0.8, cosI);
    vec3 sky = vec3(0.6, 0.63, 0.65) * (0.7 + 0.6 * pow(max(dot(rd, SUN), 0.0), 4.0));
    vec3 tir = waterCol(reflect(rd, nd)) * 0.9;
    vec3 s = mix(tir, sky, win);
    // ondulação clara (luz focada pelas cristas)
    s += vec3(0.25) * caustic(p.xz * 0.6) * win;
    c = mix(s * depthLight(ro.y), base, fogF(t));
  } else {
    // fundo de areia com cáusticas
    float t = (BED - ro.y) / rd.y;
    if (t < 160.0) {
      for (int i = 0; i < 2; i++) {
        vec3 p = ro + rd * t;
        float h = BED + 1.3 * sin(p.x * 0.08 + 1.0) * sin(p.z * 0.06) + 0.5 * sin(p.x * 0.21 + p.z * 0.17);
        t = (h - ro.y) / rd.y;
      }
      vec3 p = ro + rd * t;
      float kb = depthLight(p.y);
      float sand = 0.85 + 0.3 * noise2(p.xz * 0.7);
      vec3 bed = vec3(0.06, 0.065, 0.068) * sand * kb * 2.4;
      bed += vec3(0.42, 0.44, 0.45) * caustic(p.xz * 0.45) * kb;
      c = mix(bed, base, fogF(t));
    }
  }
  c += vec3(0.42, 0.45, 0.47) * godRays(rd);
  return c;
}

void main() {
  vec2 uv = gl_FragCoord.xy / uRes * 2.0 - 1.0;
  vec3 rd = normalize(uCamRot * vec3(uv.x * uTan * uRes.x / uRes.y, uv.y * uTan, -1.0));
  vec3 ro = uCamPos;
  float side = ro.y > 2.0 ? 1.0 : ro.y < -2.0 ? -1.0 : splitSide(rd);
  vec3 c = side > 0.0 ? aboveWater(ro, rd) : underWater(ro, rd);
  // menisco: fio claro onde a água corta a tela
  c += vec3(0.32, 0.34, 0.35) * exp(-abs(side) * 28.0) * step(abs(ro.y), 2.0);
  gl_FragColor = vec4(c, 1.0);
}`;

// ------------------------------------------------------------------ silhuetas
export const SILHOUETTE_VERT = /* glsl */ `
uniform float uTime;
#ifdef SWIM
attribute float aPhase;
uniform vec3 uSwim; // amplitude, frequência, número de onda ao longo do corpo
#endif
varying vec3 vWorld;
varying vec3 vNormal;
void main() {
  vec3 p = position;
#ifdef SWIM
  // nado: onda lateral que cresce da cabeça (+Z) para a cauda (-Z)
  float tail = clamp(0.45 - p.z, 0.0, 1.0);
  p.x += sin(uTime * uSwim.y + aPhase - p.z * uSwim.z) * uSwim.x * tail * tail;
#endif
  mat4 m = modelMatrix;
#ifdef USE_INSTANCING
  m = m * instanceMatrix;
#endif
  vec4 wp = m * vec4(p, 1.0);
  vWorld = wp.xyz;
  vNormal = normalize(mat3(m) * normal);
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;

export const SILHOUETTE_FRAG = /* glsl */ `
uniform vec3 uTint;
${COMMON}
varying vec3 vWorld;
varying vec3 vNormal;
void main() {
  vec3 v = vWorld - uCamPos;
  float d = length(v);
  vec3 rd = v / d;
  if (splitSide(rd) > 0.0) discard; // acima da linha d'água: não aparece
  vec3 n = normalize(vNormal);
  float k = depthLight(vWorld.y);
  float top = max(n.y, 0.0);
  // silhueta escura; só o dorso pega um pouco da luz de cima e das cáusticas
  vec3 c = uTint * (0.35 + 0.65 * top) * k;
  c += vec3(0.16, 0.17, 0.18) * caustic(vWorld.xz * 0.45) * top * k;
  gl_FragColor = vec4(mix(c, waterCol(rd), fogF(d)), 1.0);
}`;

// ------------------------------------------------------------------ partículas
export const SNOW_VERT = /* glsl */ `
uniform float uBox;
uniform float uPx;
${COMMON}
attribute float aSize;
varying float vA;
void main() {
  vec3 p = position * uBox;
  p += vec3(0.05, -0.07, 0.03) * uTime + 0.25 * sin(uTime * 0.35 + position * 31.0);
  vec3 rel = mod(p - uCamPos + uBox * 0.5, uBox) - uBox * 0.5;
  vec3 wp = uCamPos + rel;
  vec4 mv = viewMatrix * vec4(wp, 1.0);
  gl_Position = projectionMatrix * mv;
  float z = max(-mv.z, 0.1);
  gl_PointSize = aSize * uPx / z;
  // some perto da borda da caixa, perto da câmera e fora d'água
  float edge = 1.0 - smoothstep(uBox * 0.3, uBox * 0.5, length(rel));
  vA = edge * smoothstep(0.4, 1.6, z) * step(wp.y, -0.05) * step(splitSide(normalize(rel)), 0.0) * (1.0 - fogF(z)) * depthLight(wp.y);
}`;

export const SNOW_FRAG = /* glsl */ `
varying float vA;
void main() {
  vec2 q = gl_PointCoord * 2.0 - 1.0;
  float a = smoothstep(1.0, 0.0, dot(q, q)) * vA;
  gl_FragColor = vec4(0.62, 0.66, 0.68, a); // mistura aditiva (cor × alfa)
}`;

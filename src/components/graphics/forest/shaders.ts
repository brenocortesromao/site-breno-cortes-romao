/**
 * GLSL da floresta do Sobre (ver ForestScene / forest/world.ts). Tudo analítico
 * e leve, sem raymarch:
 * - fundo: UM quadro em tela cheia com o céu frio de fim de tarde (sol baixo
 *   À FRENTE, atrás das árvores: contraluz, sem disco) e três camadas de
 *   abetos ao longe, cada uma um plano a uma distância fixa no mundo, então
 *   elas se deslocam entre si (parallax) quando a câmera avança;
 * - malhas (chão, abetos instanciados, urso) usam as MESMAS funções de névoa:
 *   névoa de distância (as camadas mais longe ficam mais claras) e névoa baixa
 *   entre os troncos, que se move devagar;
 * - neve: pontos caindo numa caixa que acompanha a câmera.
 * Paleta quase monocromática: grafite, prata e um verde-acinzentado muito
 * escuro nas árvores.
 */

const COMMON = /* glsl */ `
uniform float uTime;
uniform vec3 uCamPos;

#define FOG_D 0.026
// sol baixo à frente, um pouco à esquerda (contraluz frio)
const vec3 SUN = vec3(-0.338, 0.087, -0.937);
const vec3 TREE = vec3(0.034, 0.043, 0.04);

float hash1(float x) { return fract(sin(x * 127.1) * 43758.5453); }
float hash2(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise2(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash2(i), hash2(i + vec2(1, 0)), u.x), mix(hash2(i + vec2(0, 1)), hash2(i + vec2(1, 1)), u.x), u.y);
}

vec3 skyCol(vec3 rd) {
  float y = rd.y;
  vec3 hor = vec3(0.235, 0.245, 0.252);
  vec3 zen = vec3(0.03, 0.034, 0.038);
  vec3 c = mix(hor, zen, pow(clamp(y, 0.0, 1.0), 0.45));
  c = y < 0.0 ? hor * 0.86 : c;
  float s = max(dot(rd, SUN), 0.0);
  // brilho frio largo + núcleo suave (sem disco: lê como ilustração)
  c += vec3(0.4, 0.42, 0.44) * pow(s, 7.0) * 0.55 + vec3(0.55) * pow(s, 70.0) * 0.4;
  return c;
}

// cor da névoa na direção do olhar (o céu perto do horizonte)
vec3 fogCol(vec3 rd) { return skyCol(normalize(vec3(rd.x, max(rd.y, 0.0) * 0.25 + 0.01, rd.z))); }
float fogF(float d) { return 1.0 - exp(-d * FOG_D); }

// névoa baixa: densa até ~1,5 m do chão, rala acima, em faixas que derivam
float mistAt(vec3 p) {
  vec2 q = p.xz * 0.07 + vec2(uTime * 0.035, uTime * 0.012);
  float n = noise2(q);
#ifndef LIGHT
  n = 0.65 * n + 0.35 * noise2(q * 2.7 - uTime * 0.02);
#endif
  return exp(-max(p.y, 0.0) * 0.9) * (0.25 + 0.75 * n);
}
const vec3 MIST = vec3(0.17, 0.178, 0.184);

// aplica névoa de distância + névoa baixa a uma cor no ponto p (fator k < 1
// = menos névoa, para o urso se destacar um pouco)
vec3 atmos(vec3 c, vec3 p, float k) {
  vec3 v = p - uCamPos;
  float d = length(v);
  vec3 rd = v / d;
  c = mix(c, MIST, mistAt(p) * (1.0 - exp(-d * 0.07)) * 0.85);
  return mix(c, fogCol(rd), fogF(d * k));
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

// linha de copas de uma camada: abetos estreitos (triângulos de alturas
// aleatórias em duas grades sobrepostas, para não parecer serrilhado regular)
float ridge(float x, float cw, float h0, float h1, float seed) {
  float best = 0.0;
  for (int k = 0; k < 2; k++) {
    float w = cw * (k == 0 ? 1.0 : 0.63);
    float c = floor(x / w);
    for (int j = -1; j <= 1; j++) {
      float id = c + float(j);
      float cx = (id + 0.25 + 0.5 * hash1(id * 1.7 + seed + float(k) * 9.1)) * w;
      float h = mix(h0, h1, hash1(id * 3.1 + seed * 2.3 + float(k) * 5.7));
      float half_ = h * 0.2;
      // galhos em degraus (o contorno do abeto não é um triângulo liso)
      float t = clamp(1.0 - abs(x - cx) / half_, 0.0, 1.0);
      float y = h * t;
      y -= 0.12 * h * (1.0 - t) * abs(sin(y * 2.4 + id));
      best = max(best, y);
    }
  }
  return best;
}

void main() {
  vec2 uv = gl_FragCoord.xy / uRes * 2.0 - 1.0;
  vec3 rd = normalize(uCamRot * vec3(uv.x * uTan * uRes.x / uRes.y, uv.y * uTan, -1.0));
  vec3 ro = uCamPos;
  vec3 c = skyCol(rd);
  // camadas ao longe (z fixo no mundo), da mais distante para a mais perto
  if (rd.z < -0.05) {
    for (int i = 0; i < 3; i++) {
      float z = i == 0 ? -230.0 : i == 1 ? -170.0 : -120.0;
      float t = (z - ro.z) / rd.z;
      vec3 p = ro + rd * t;
      float cw = i == 0 ? 3.4 : i == 1 ? 2.8 : 2.3;
      float top = ridge(p.x, cw, 9.0, 20.0, float(i) * 13.0) + 0.9 * sin(p.x * 0.031 + float(i));
      if (p.y < top) {
        vec3 col = TREE;
        // fio de luz na borda das copas (contraluz)
        float edge = exp(-(top - p.y) * 2.2);
        col += vec3(0.26, 0.27, 0.28) * edge * (0.35 + 0.65 * pow(max(dot(rd, SUN), 0.0), 3.0));
        c = mix(col, fogCol(rd), fogF(t));
        c = mix(c, MIST, mistAt(p) * 0.9);
      }
    }
  }
  gl_FragColor = vec4(c, 1.0);
}`;

// ------------------------------------------------------------------ chão
export const GROUND_VERT = /* glsl */ `
varying vec3 vWorld;
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorld = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;

export const GROUND_FRAG = /* glsl */ `
${COMMON}
varying vec3 vWorld;
void main() {
  vec2 q = vWorld.xz;
  // manchas de neve irregulares sobre a terra escura
  float n = noise2(q * 0.11) + 0.45 * noise2(q * 0.47 + 3.0) + 0.2 * noise2(q * 1.9);
  float snow = smoothstep(0.78, 1.05, n);
  vec3 c = mix(vec3(0.03, 0.034, 0.033), vec3(0.17, 0.178, 0.185), snow);
  // a luz rasante do sol risca a neve de leve
  c += vec3(0.05) * snow * pow(max(dot(normalize(vWorld - uCamPos), SUN), 0.0), 4.0);
  // perto da câmera o chão fica mais escuro (a base da tela não vira um plano cinza)
  c *= mix(0.45, 1.0, smoothstep(3.0, 26.0, length(vWorld.xz - uCamPos.xz)));
  gl_FragColor = vec4(atmos(c, vWorld, 1.0), 1.0);
}`;

// ------------------------------------------------------------------ abetos
export const TREE_VERT = /* glsl */ `
uniform float uTime;
varying vec3 vWorld;
varying vec3 vNormal;
varying float vH;
void main() {
  vec3 p = position;
  // balanço suave: cresce com a altura, fase pela posição da árvore
  vec3 base = instanceMatrix[3].xyz;
  float ph = base.x * 0.37 + base.z * 0.21;
  float h = p.y * p.y;
  p.x += (0.6 * sin(uTime * 0.55 + ph) + 0.25 * sin(uTime * 1.4 + ph * 1.7)) * 0.045 * h;
  p.z += 0.35 * sin(uTime * 0.43 + ph * 0.8) * 0.03 * h;
  vH = position.y;
  vec4 wp = modelMatrix * instanceMatrix * vec4(p, 1.0);
  vWorld = wp.xyz;
  // escala não uniforme (raio, altura, raio): normal pela inversa transposta
  mat3 im = mat3(instanceMatrix);
  vec3 sc = vec3(dot(im[0], im[0]), dot(im[1], im[1]), dot(im[2], im[2]));
  vNormal = normalize(mat3(modelMatrix) * (im * (normal / sc)));
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;

export const TREE_FRAG = /* glsl */ `
${COMMON}
varying vec3 vWorld;
varying vec3 vNormal;
varying float vH;
void main() {
  vec3 n = normalize(vNormal);
  vec3 v = vWorld - uCamPos;
  vec3 rd = normalize(v);
  if (!gl_FrontFacing) n = -n;
  vec3 c = TREE * (0.75 + 0.5 * vH);
  // neve leve pousada nos galhos (faces viradas para cima)
  float snow = smoothstep(0.62, 0.92, n.y) * smoothstep(0.35, 0.75, noise2(vWorld.xz * 1.3 + vWorld.y * 0.7));
  c = mix(c, vec3(0.15, 0.158, 0.165), snow * 0.5);
  // contorno prateado no contraluz
  float fres = pow(1.0 - abs(dot(n, -rd)), 3.0);
  c += vec3(0.22, 0.23, 0.24) * fres * (0.15 + 0.85 * pow(max(dot(rd, SUN), 0.0), 2.0));
  gl_FragColor = vec4(atmos(c, vWorld, 1.0), 1.0);
}`;

// ------------------------------------------------------------------ urso
export const BEAR_VERT = /* glsl */ `
uniform float uTime;
uniform float uWalk;   // fase da passada (rad)
uniform float uStride; // 0 parado → 1 andando
uniform float uHead;   // giro da cabeça (rad, em torno de Y)
attribute float aPart; // 0 corpo, 1 cabeça, 2..5 patas (DE, DD, TE, TD)
attribute vec3 aPivot;
varying vec3 vWorld;
varying vec3 vNormal;

vec2 rot(vec2 v, float a) { float c = cos(a), s = sin(a); return vec2(c * v.x - s * v.y, s * v.x + c * v.y); }

void main() {
  vec3 p = position;
  vec3 nrm = normal;
  if (aPart >= 1.5) {
    // marcha: trás-esq., diant.-esq., trás-dir., diant.-dir. a 1/4 de ciclo
    float off = aPart < 2.5 ? 1.5708 : aPart < 3.5 ? 4.7124 : aPart < 4.5 ? 0.0 : 3.1416;
    float a = sin(uWalk + off) * 0.38 * uStride;
    vec3 q = p - aPivot;
    q.zy = rot(q.zy, a);
    p = q + aPivot;
    nrm.zy = rot(nrm.zy, a);
    // a pata que avança sobe um pouco
    p.y += max(cos(uWalk + off), 0.0) * 0.07 * uStride * smoothstep(aPivot.y - 0.3, aPivot.y - 0.75, position.y);
  } else if (aPart > 0.5) {
    // cabeça: gira em torno do pescoço e balança com o passo
    vec3 q = p - aPivot;
    q.zy = rot(q.zy, 0.05 * sin(uWalk * 2.0) * uStride - 0.04);
    q.xz = rot(q.xz, uHead);
    p = q + aPivot;
    nrm.xz = rot(nrm.xz, uHead);
  }
  // corpo sobe e desce com a passada; respira parado
  p.y += 0.022 * sin(uWalk * 2.0) * uStride + 0.006 * sin(uTime * 1.6) * (1.0 - uStride);
  vec4 wp = modelMatrix * vec4(p, 1.0);
  vWorld = wp.xyz;
  vNormal = normalize(mat3(modelMatrix) * nrm);
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;

export const BEAR_FRAG = /* glsl */ `
${COMMON}
varying vec3 vWorld;
varying vec3 vNormal;
void main() {
  vec3 n = normalize(vNormal);
  vec3 rd = normalize(vWorld - uCamPos);
  // silhueta quase preta com luz de contorno prateada (contraluz do sol)
  vec3 c = vec3(0.022, 0.024, 0.026) * (0.6 + 0.4 * max(n.y, 0.0));
  float fres = pow(1.0 - abs(dot(n, -rd)), 3.0);
  // mais forte no dorso e no lado do sol (contraluz)
  float side = 0.55 + 0.45 * max(dot(n, normalize(vec3(SUN.x, 0.0, SUN.z))), 0.0);
  c += vec3(0.68, 0.71, 0.74) * fres * smoothstep(-0.4, 0.5, n.y) * side * 2.0;
  gl_FragColor = vec4(atmos(c, vWorld, 0.42), 1.0);
}`;

// ------------------------------------------------------------------ neve
export const SNOW_VERT = /* glsl */ `
uniform float uBox;
uniform float uPx;
${COMMON}
attribute float aSize;
varying float vA;
void main() {
  vec3 p = position * uBox;
  // cai devagar, com deriva lateral e um leve rodopio
  p += vec3(0.25, -0.75, 0.1) * uTime + 0.35 * sin(uTime * 0.6 + position.zxy * 37.0);
  vec3 rel = mod(p - uCamPos + uBox * 0.5, uBox) - uBox * 0.5;
  vec3 wp = uCamPos + rel;
  vec4 mv = viewMatrix * vec4(wp, 1.0);
  gl_Position = projectionMatrix * mv;
  float z = max(-mv.z, 0.1);
  gl_PointSize = aSize * uPx / z;
  float edge = 1.0 - smoothstep(uBox * 0.3, uBox * 0.5, length(rel));
  vA = edge * smoothstep(0.6, 2.0, z) * (1.0 - fogF(z));
}`;

export const SNOW_FRAG = /* glsl */ `
varying float vA;
void main() {
  vec2 q = gl_PointCoord * 2.0 - 1.0;
  float a = smoothstep(1.0, 0.0, dot(q, q)) * vA;
  gl_FragColor = vec4(0.7, 0.72, 0.74, a); // mistura aditiva (cor × alfa)
}`;

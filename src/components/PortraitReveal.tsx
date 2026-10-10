"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import ResilientBoundary from "@/components/ResilientBoundary";
import { webglSupport } from "@/lib/webgl";
import { useNearViewport } from "@/lib/useNearViewport";

gsap.registerPlugin(useGSAP, ScrollTrigger);

/**
 * Retrato da Mensagem com entrada "metal líquido vira você" (WebGL2, sem
 * bibliotecas), por GATILHO (não scrub), ~2,5 s, uma vez:
 *  1. dentro da moldura escura, uma gota de cromo cai e, ao tocar o fundo, se
 *     espalha como mercúrio com ondas até preencher a moldura (frente orgânica
 *     com ruído; as paredes seguem os raios reais de cada canto da moldura,
 *     lidos do CSS, com menisco);
 *  2. a superfície é cromo: reflexo do mesmo "estúdio" da bola da hero
 *     (domo em degradê + os mesmos softboxes, em versão analítica), normais
 *     vindas do campo de ondas;
 *  3. conforme as ondas amortecem, a refletividade cai e a foto aparece por
 *     baixo, primeiro refratada pelas ondas, assentando até distorção zero.
 * O ESTADO FINAL É A IMAGEM REAL: ao terminar, o canvas é desmontado e fica o
 * next/image (quality 90, srcset do original de 2400 px). `onRevealed` avisa o
 * fim (a assinatura começa a ser desenhada depois disso).
 * Um único contexto WebGL, só durante a animação. Sem WebGL2 (ou se falhar):
 * fade simples da foto. Sem JS / prefers-reduced-motion: foto já visível.
 */

/** Textura do canvas: versão de 1600 px (nítida até DPR 2 no tamanho do retrato). */
const textureSrc = (src: string) => src.replace(/(\.\w+)$/, "-1600$1");
/** Duração total (s): queda 0,55 · espalha até ~1,5 · foto assentada em 2,45. */
const DURATION = 2.5;

const VERT = /* glsl */ `#version 300 es
in vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }`;

const FRAG = /* glsl */ `#version 300 es
precision highp float;
uniform sampler2D uTex;
uniform vec2 uRes;       // px do buffer
uniform float uImgAspect;
uniform float uT;        // s desde o início
uniform vec4 uRadii;     // raios dos cantos (em larguras): sup. esq., sup. dir., inf. dir., inf. esq.
out vec4 outColor;

const float T_FALL = 0.55;
const float DROP_R = 0.085;
// impacto um pouco fora do centro: anéis simétricos sob o fio de luz liam como
// um "rosto" (mesmo cuidado da bola da hero)
const vec2 HIT = vec2(0.45, 0.0);

float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vnoise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1,0)), u.x), mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), u.x), u.y);
}

// moldura: retângulo arredondado com raio por canto (y para cima, em larguras)
float frameSdf(vec2 p, vec2 size){
  vec2 c = p - size * 0.5;
  float r = c.x < 0.0 ? (c.y > 0.0 ? uRadii.x : uRadii.w) : (c.y > 0.0 ? uRadii.y : uRadii.z);
  vec2 q = abs(c) - size * 0.5 + r;
  return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - r;
}

// raio da poça (frente orgânica) a partir do ponto de impacto
float poolR(float tau, float ang){
  float R = 1.65 * (1.0 - exp(-tau * 2.7));
  return R + 0.07 * (vnoise(vec2(ang * 2.2, tau * 1.5)) - 0.5) * (1.0 - R / 1.65) * 2.0;
}

// altura da superfície do mercúrio
float height(vec2 p, vec2 size, float tau){
  vec2 v = p - HIT;
  float d = length(v);
  float f = poolR(tau, atan(v.y, v.x)) - d;            // > 0 dentro da poça
  // anéis levemente irregulares (mercúrio de verdade não faz alvo perfeito)
  d += 0.035 * (vnoise(p * 4.5 + 3.0) - 0.5);
  float h = 0.028 * smoothstep(0.0, 0.07, f);          // borda grossa e arredondada
  // ondas em anel do impacto, amortecendo
  h += 0.011 * exp(-1.6 * tau) * sin(34.0 * d - 19.0 * tau) * exp(-1.8 * d);
  // respingo central logo após o impacto
  h += 0.05 * exp(-d * d / 0.003) * sin(tau * 11.0) * exp(-tau * 6.0);
  // ondulação residual orgânica (ruído), amortecendo
  h += 0.008 * exp(-1.3 * tau) * (vnoise(p * 5.3 + vec2(tau * 0.9, -tau * 0.6)) - 0.5);
  // menisco convexo (mercúrio): a superfície cai junto às paredes
  h -= 0.018 * (1.0 - smoothstep(0.0, 0.05, -frameSdf(p, size)));
  return h;
}

// mesmo estúdio da bola da hero (HeroScene/buildStudioEnvironment), analítico
float softbox(vec3 r, vec3 pos, vec2 sz, float k, float tilt){
  vec3 d = normalize(pos);                              // o painel olha para a origem
  vec3 right = normalize(cross(vec3(0.0, 1.0, 0.0), -d));
  vec3 up = cross(-d, right);
  float ct = cos(tilt), st = sin(tilt);
  vec3 rr = right * ct + up * st, uu = -right * st + up * ct;
  float s = dot(pos, d) / dot(r, d);
  if (s <= 0.0) return 0.0;
  vec3 l = r * s - pos;
  float u = abs(dot(l, rr)) / (sz.x * 0.5), w = abs(dot(l, uu)) / (sz.y * 0.5);
  return k * smoothstep(1.0, 0.05, u) * smoothstep(1.0, 0.05, w);
}
vec3 studio(vec3 r){
  float t = r.y;
  float v = t > 0.0 ? 0.07 + 0.2 * pow(t, 1.4) : 0.07 - 0.05 * min(-t / 0.4, 1.0);
  v += softbox(r, vec3(-12.0, 9.0, 3.0), vec2(20.0, 9.0), 3.6, -0.3);
  v += softbox(r, vec3(13.0, 1.0, -4.0), vec2(14.0, 10.0), 2.6, 0.5);
  v += softbox(r, vec3(0.0, -1.0, -12.0), vec2(40.0, 1.4), 2.4, 0.0);
  v += softbox(r, vec3(0.0, 14.0, 0.0), vec2(16.0, 6.0), 1.0, 0.0);
  return vec3(v, v, v * 1.04);
}
// ACES (aprox.) + sRGB, como o renderer da hero
vec3 tone(vec3 c){
  c = clamp((c * (2.51 * c + 0.03)) / (c * (2.43 * c + 0.59) + 0.14), 0.0, 1.0);
  return pow(c, vec3(1.0 / 2.2));
}
vec3 chrome(vec3 n, vec2 p, vec2 size){
  // câmera levemente em perspectiva: o reflexo corre pela superfície
  vec3 view = normalize(vec3((p - size * 0.5) * 0.9, -1.0));
  // uma superfície quase plana de frente reflete o que está atrás da câmera,
  // que no estúdio é só preenchimento difuso (fosco); espelhado em z, ela
  // reflete o lado iluminado (fio de horizonte, softboxes), como as bordas da bola
  vec3 r = reflect(view, n);
  r.z = -r.z;
  r.xy = mat2(0.993, 0.119, -0.119, 0.993) * r.xy;     // horizonte levemente inclinado
  return tone(studio(r) * 0.98);
}
// object-cover em coordenadas de textura (y para baixo na imagem)
vec2 coverUv(vec2 uv){
  float ca = uRes.x / uRes.y;
  vec2 s = ca > uImgAspect ? vec2(1.0, uImgAspect / ca) : vec2(ca / uImgAspect, 1.0);
  return (uv - 0.5) * s + 0.5;
}

void main(){
  float W = uRes.x;
  vec2 size = vec2(1.0, uRes.y / W);
  vec2 p = gl_FragCoord.xy / W;                         // em larguras, y para cima
  float px = 1.0 / W;
  float inFrame = 1.0 - smoothstep(-px, px, frameSdf(p, size));

  // 1. gota caindo (antes do impacto): esfera cromada, um pouco alongada
  if (uT < T_FALL) {
    float k = uT / T_FALL;
    vec2 c = vec2(HIT.x, mix(size.y + DROP_R * 1.6, DROP_R, k * k));
    float stretch = 1.0 + 0.35 * k * k;
    vec2 q = (p - c) / vec2(DROP_R / sqrt(stretch), DROP_R * stretch);
    float d2 = dot(q, q);
    float a = (1.0 - smoothstep(1.0 - 2.5 * px / DROP_R, 1.0, d2)) * inFrame;
    vec3 n = normalize(vec3(q, sqrt(max(1.0 - d2, 0.0))));
    outColor = vec4(chrome(n, p, size) * a, a);
    return;
  }

  // 2. poça se espalhando, com ondas
  float tau = uT - T_FALL;
  vec2 v = p - HIT;
  float fill = poolR(tau, atan(v.y, v.x)) - length(v);
  float a = smoothstep(0.0, 2.0 * px, fill) * inFrame;
  if (a <= 0.0) { outColor = vec4(0.0); return; }
  float e = 1.5 * px;
  float h0 = height(p, size, tau);
  vec2 g = vec2(height(p + vec2(e, 0.0), size, tau) - h0, height(p + vec2(0.0, e), size, tau) - h0) / e;
  vec3 n = normalize(vec3(-g * 2.4, 1.0));
  vec3 metal = chrome(n, p, size);

  // 3. metal fica transparente: refletividade cai; a foto aparece refratada
  //    pelas ondas e assenta até distorção zero (igual à <img> no fim)
  float refl = 1.0 - smoothstep(1.3, 2.3, uT);
  float bend = 0.6 * (1.0 - smoothstep(1.9, 2.42, uT));
  // UNPACK_FLIP_Y: v = 0 é a base da foto, como p.y
  vec2 uv = vec2(p.x, p.y / size.y) + g * bend * 0.05;
  vec3 photo = texture(uTex, coverUv(uv)).rgb;
  vec3 col = mix(photo, metal, refl);
  outColor = vec4(col * a, a);                          // alfa pré-multiplicado
}`;

function compile(gl: WebGL2RenderingContext, type: number, src: string) {
  const s = gl.createShader(type)!;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? "shader");
  return s;
}

/** Raios dos cantos da moldura (px, do CSS) em larguras: sup. esq., sup. dir., inf. dir., inf. esq. */
function readRadii(el: HTMLElement) {
  const cs = getComputedStyle(el);
  const w = el.clientWidth || 1;
  const r = (v: string) => (parseFloat(v) || 0) / w;
  return [r(cs.borderTopLeftRadius), r(cs.borderTopRightRadius), r(cs.borderBottomRightRadius), r(cs.borderBottomLeftRadius)];
}

/** Canvas do metal líquido: anima por tempo uma vez e chama `onDone` no fim. */
function MetalCanvas({
  texture,
  onDone,
  onLost,
}: {
  texture: HTMLImageElement;
  onDone: () => void;
  onLost: () => void;
}) {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const box = host.current;
    // a moldura (raios dos cantos) é o contêiner do retrato
    const frame = box?.parentElement;
    if (!box || !frame) return;
    // canvas novo a cada montagem (Strict Mode: o contexto anterior já foi perdido)
    const el = document.createElement("canvas");
    el.className = "absolute inset-0 h-full w-full";
    box.appendChild(el);
    const gl = el.getContext("webgl2", { premultipliedAlpha: true, alpha: true, antialias: false });
    if (!gl) {
      el.remove();
      onLost();
      return;
    }
    let program: WebGLProgram;
    try {
      program = gl.createProgram()!;
      gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VERT));
      gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, FRAG));
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error("link");
    } catch (err) {
      console.warn("[retrato] shader do metal falhou:", err);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
      el.remove();
      onLost();
      return;
    }
    gl.useProgram(program);
    const handleLost = (e: Event) => {
      e.preventDefault();
      onLost();
    };
    el.addEventListener("webglcontextlost", handleLost);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(program, "aPos");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const u = (n: string) => gl.getUniformLocation(program, n);
    const U = { res: u("uRes"), aspect: u("uImgAspect"), t: u("uT"), radii: u("uRadii") };

    // textura em resolução cheia (a foto refratada precisa ser nítida no fim)
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, texture);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const imgAspect = texture.naturalWidth / texture.naturalHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    let raf = 0;
    const start = performance.now();
    const frameLoop = (now: number) => {
      const t = (now - start) / 1000;
      const r = el.getBoundingClientRect();
      const w = Math.max(1, Math.round(r.width * dpr));
      const h = Math.max(1, Math.round(r.height * dpr));
      if (el.width !== w || el.height !== h) {
        el.width = w;
        el.height = h;
        gl.viewport(0, 0, w, h);
      }
      gl.uniform2f(U.res, w, h);
      gl.uniform1f(U.aspect, imgAspect);
      gl.uniform1f(U.t, Math.min(t, DURATION));
      gl.uniform4fv(U.radii, readRadii(frame));
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      if (t < DURATION) raf = requestAnimationFrame(frameLoop);
      else onDone();
    };
    raf = requestAnimationFrame(frameLoop);

    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener("webglcontextlost", handleLost);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
      el.remove();
    };
  }, [texture, onDone, onLost]);

  return <div ref={host} aria-hidden="true" className="absolute inset-0 overflow-hidden rounded-[inherit]" />;
}

type Mode = "static" | "metal" | "fade";

export default function PortraitReveal({
  src,
  alt,
  sizes,
  className = "",
  onRevealed,
}: {
  src: string;
  alt: string;
  sizes?: string;
  className?: string;
  /** Chamado quando a foto real está no lugar (fim da entrada ou sem animação). */
  onRevealed?: () => void;
}) {
  const root = useRef<HTMLDivElement>(null);
  const img = useRef<HTMLImageElement>(null);
  const near = useNearViewport(root);
  /** static: foto visível (reduced motion); metal: WebGL2; fade: sem WebGL2.
   * null até detectar (a foto do HTML fica como está). */
  const [mode, setMode] = useState<Mode | null>(null);
  /** Imagem da textura (1600 px), carregada uma vez. */
  const [texture, setTexture] = useState<HTMLImageElement | null>(null);
  /** O retrato entrou na tela (gatilho, uma vez). */
  const [entered, setEntered] = useState(false);
  /** A foto real está no lugar: canvas desmontado. */
  const [done, setDone] = useState(false);
  const reported = useRef(false);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const webgl2 = webglSupport().webgl2;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- leitura única de capacidades do navegador
    setMode(reduced ? "static" : webgl2 ? "metal" : "fade");
    if (reduced) return;
    if (!webgl2) return;
    const t = new window.Image();
    t.decoding = "async";
    t.src = textureSrc(src);
    t.decode().then(
      () => setTexture(t),
      () => setMode("fade"), // sem textura: fade simples da foto
    );
  }, [src]);

  // gatilho único quando o retrato entra na tela
  useGSAP(
    () => {
      if (!mode || mode === "static") return;
      ScrollTrigger.create({ trigger: root.current, start: "top 78%", once: true, onEnter: () => setEntered(true) });
    },
    { scope: root, dependencies: [mode], revertOnUpdate: true },
  );

  const finish = useCallback(() => setDone(true), []);
  const handleGiveUp = useCallback(() => setMode("fade"), []);

  // longe da tela no meio da animação: pula para a foto pronta
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- o canvas foi desmontado, a foto assume
    if (entered && !near && mode === "metal") setDone(true);
  }, [entered, near, mode]);

  // foto real: escondida até a entrada terminar; fade simples sem WebGL
  useEffect(() => {
    const el = img.current;
    if (!el || !mode) return;
    if (mode === "static" || done) {
      gsap.killTweensOf(el);
      gsap.set(el, { opacity: 1 });
    } else if (mode === "fade" && entered) {
      gsap.to(el, { opacity: 1, duration: 0.9, ease: "power2.out", onComplete: finish });
    } else {
      gsap.set(el, { opacity: 0 });
    }
  }, [mode, entered, done, finish]);

  // avisa uma vez que a foto está no lugar (a assinatura vem depois)
  useEffect(() => {
    if ((mode === "static" || done) && !reported.current) {
      reported.current = true;
      onRevealed?.();
    }
  }, [mode, done, onRevealed]);

  const showCanvas = mode === "metal" && entered && texture && near && !done;

  return (
    // cantos: herda o raio do cartão; isolate + rounded nas camadas garantem o
    // recorte também do canvas (camada composta) durante a animação
    <div
      ref={root}
      className={`relative isolate aspect-[4/5] overflow-hidden rounded-[inherit] border border-line bg-surface ${className}`}
    >
      <Image
        ref={img}
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        quality={90}
        className="rounded-[inherit] object-cover"
      />
      {mode === "metal" && (
        <ResilientBoundary name="retrato" maxRetries={1} onGiveUp={handleGiveUp}>
          {(onLost) =>
            showCanvas && <MetalCanvas texture={texture} onDone={finish} onLost={onLost} />
          }
        </ResilientBoundary>
      )}
    </div>
  );
}

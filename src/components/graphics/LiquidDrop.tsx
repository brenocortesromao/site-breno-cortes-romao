"use client";

import { useEffect, useRef, type RefObject } from "react";

/**
 * Gota de metal líquido cromado (WebGL2, sem bibliotecas), para "Como funciona".
 * Um único fragment shader faz raymarching de um SDF que muda de forma por
 * etapa (stageRef, escrito pela seção conforme o scroll):
 *   0 Conversa — duas gotas se aproximam e se fundem (união suave/metaballs);
 *   1 Diagnóstico — gota única com uma ondulação percorrendo a superfície;
 *   2 Plano — forma calma e regular;
 *   3 Direção contínua — fluxo constante, girando devagar;
 *   4 Revisão — a gota se fecha num anel líquido (toro).
 * Os parâmetros da forma são interpolados suavemente para os alvos de cada
 * etapa (sem cortes). Cromo: reflexo de um "estúdio" procedural com áreas
 * escuras contrastadas (lê bem sobre o off-white). Fundo transparente.
 * Entrada profunda (uEmerge 0→1, ~2,8 s quando a gota aparece na tela): ela
 * sobe do fundo no eixo Z (e um pouco de baixo), escura, desfocada (blur CSS)
 * e pequena, e ganha nitidez, brilho e tamanho, como algo subindo de um líquido
 * escuro. Recomeça a cada nova entrada na tela.
 * Animação constante: respira (escala), ondula sempre um pouco e os reflexos
 * do estúdio giram devagar, mesmo com o scroll parado. Reage levemente ao
 * mouse (inclinação + reflexo), só com ponteiro fino.
 * Desempenho: renderiza só com a seção visível; mobile com menos passos e DPR 1.
 * reduceMotion: desenha uma vez o anel estático, já emerso.
 */

const VERT = /* glsl */ `#version 300 es
in vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }`;

const FRAG = (steps: number) => /* glsl */ `#version 300 es
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform float uAngle;
uniform float uSep;
uniform float uRipple;
uniform float uNoise;
uniform float uTorus;
uniform float uEmerge;
uniform vec2 uTilt;
out vec4 outColor;

mat3 rotY(float a){ float c=cos(a), s=sin(a); return mat3(c,0.,-s, 0.,1.,0., s,0.,c); }
mat3 rotX(float a){ float c=cos(a), s=sin(a); return mat3(1.,0.,0., 0.,c,s, 0.,-s,c); }
float smin(float a, float b, float k){ float h = clamp(0.5 + 0.5*(b-a)/k, 0., 1.); return mix(b, a, h) - k*h*(1.-h); }

float shape(vec3 p){
  p = rotY(uAngle + uTilt.x) * rotX(0.25 + uTilt.y) * p;
  float t = uTime;
  // gotas (duas que se fundem quando uSep -> 0)
  float k = clamp(uSep / 1.1, 0., 1.);
  float r = mix(0.62, 0.42, k);
  vec3 c = vec3(uSep * 0.55, 0.0, 0.0);
  float d1 = smin(length(p - c) - r, length(p + c) - r, 0.32);
  // ondulação que percorre a superfície (diagnóstico)
  d1 -= uRipple * 0.045 * sin(11.0 * p.y - t * 3.2) * smoothstep(0.7, 0.0, abs(p.y));
  // fluxo orgânico
  d1 += uNoise * sin(p.x * 3.1 + t * 0.9) * sin(p.y * 3.7 - t * 0.7) * sin(p.z * 2.9 + t * 1.1);
  // anel líquido (revisão), inclinado para ser visto
  vec3 q = rotX(1.05) * p;
  float dT = length(vec2(length(q.xz) - 0.52, q.y)) - 0.19;
  dT += uNoise * 0.6 * sin(atan(q.z, q.x) * 3.0 + t * 1.2) * 0.5;
  return mix(d1, dT, uTorus);
}

// posição (entrada profunda: vem de longe no eixo Z e um pouco de baixo) e
// respiração constante na escala
float map(vec3 p){
  float e = 1.0 - uEmerge;
  p -= vec3(0.0, -0.55 * e * e, -7.0 * e);
  float b = 1.0 + 0.035 * sin(uTime * 1.25) + 0.012 * sin(uTime * 2.9 + 1.3);
  return shape(p / b) * b;
}

vec3 normalAt(vec3 p){
  const vec2 e = vec2(0.0015, -0.0015);
  return normalize(e.xyy*map(p+e.xyy) + e.yyx*map(p+e.yyx) + e.yxy*map(p+e.yxy) + e.xxx*map(p+e.xxx));
}

// estúdio procedural: chão escuro, topo claro, faixa escura vertical, softbox
float env(vec3 r){
  float base = mix(0.06, 0.92, smoothstep(-0.25, 0.65, r.y));
  base *= 1.0 - 0.75 * smoothstep(0.22, 0.0, abs(r.x + 0.35));        // faixa escura
  base *= 1.0 - 0.55 * (1.0 - smoothstep(0.0, 0.09, abs(r.y - 0.06))); // linha do horizonte
  base += 1.6 * pow(max(dot(r, normalize(vec3(-0.55, 0.65, 0.55))), 0.0), 36.0); // softbox
  base += 0.5 * pow(max(dot(r, normalize(vec3(0.8, 0.1, 0.4))), 0.0), 18.0);     // recorte
  return base;
}

void main(){
  vec2 uv = (gl_FragCoord.xy - 0.5 * uRes) / min(uRes.x, uRes.y);
  vec3 ro = vec3(0.0, 0.0, 2.7);
  vec3 rd = normalize(vec3(uv * 0.95, -1.6));
  float t = 0.0;
  float hit = 0.0;
  for (int i = 0; i < ${steps}; i++) {
    vec3 p = ro + rd * t;
    float d = map(p);
    if (d < 0.0012) { hit = 1.0; break; }
    t += d * 0.8;
    if (t > 12.0) break;
  }
  if (hit < 0.5) { outColor = vec4(0.0); return; }
  vec3 p = ro + rd * t;
  vec3 n = normalAt(p);
  // reflexos se movendo na superfície: o estúdio gira devagar o tempo todo
  vec3 r = rotY(uTime * 0.16 + uTilt.x * 1.4) * reflect(rd, n);
  float fres = pow(1.0 - max(dot(n, -rd), 0.0), 3.0);
  float c = env(r) * (0.82 + 0.18 * fres);
  vec3 col = vec3(c) * vec3(0.92, 0.935, 0.96);
  col = col / (col + 0.35) * 1.25;   // tone map suave
  // emergindo: escura e sem brilho no fundo, ganha luz ao subir
  float lit = smoothstep(0.0, 1.0, uEmerge);
  col *= mix(0.04, 1.0, lit * lit);
  outColor = vec4(col, 1.0);
}`;

type Target = { sep: number; ripple: number; noise: number; spin: number; torus: number };
/** Subida rápida que desacelera ao chegar (ease-out cúbico). */
const easeOut = (x: number) => 1 - (1 - x) ** 3;

const TARGETS: Target[] = [
  { sep: 0, ripple: 0, noise: 0.03, spin: 0.15, torus: 0 }, // conversa
  { sep: 0, ripple: 1, noise: 0.035, spin: 0.2, torus: 0 }, // diagnóstico
  { sep: 0, ripple: 0, noise: 0.022, spin: 0.1, torus: 0 }, // plano
  { sep: 0, ripple: 0, noise: 0.07, spin: 0.55, torus: 0 }, // direção contínua
  { sep: 0, ripple: 0, noise: 0.02, spin: 0.22, torus: 1 }, // revisão
];

function compile(gl: WebGL2RenderingContext, type: number, src: string) {
  const s = gl.createShader(type)!;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? "shader");
  return s;
}

export default function LiquidDrop({
  stageRef,
  light = false,
  reduceMotion = false,
  className = "",
}: {
  /** Etapa atual (0–4), escrita pela seção. */
  stageRef: RefObject<number>;
  light?: boolean;
  reduceMotion?: boolean;
  className?: string;
}) {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const box = host.current;
    if (!box) return;
    // canvas novo a cada montagem (Strict Mode: contexto anterior já foi perdido)
    const el = document.createElement("canvas");
    el.className = "h-full w-full";
    box.appendChild(el);
    const gl = el.getContext("webgl2", { premultipliedAlpha: true, alpha: true, antialias: false });
    if (!gl) {
      el.remove();
      return;
    }
    let program: WebGLProgram;
    try {
      program = gl.createProgram()!;
      gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VERT));
      gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, FRAG(light ? 48 : 80)));
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error("link");
    } catch {
      gl.getExtension("WEBGL_lose_context")?.loseContext();
      el.remove();
      return;
    }
    gl.useProgram(program);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(program, "aPos");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const u = (n: string) => gl.getUniformLocation(program, n);
    const U = { res: u("uRes"), time: u("uTime"), angle: u("uAngle"), sep: u("uSep"), ripple: u("uRipple"), noise: u("uNoise"), torus: u("uTorus"), emerge: u("uEmerge"), tilt: u("uTilt") };

    const dpr = Math.min(window.devicePixelRatio || 1, light ? 1 : 1.5);
    const resize = () => {
      const r = el.getBoundingClientRect();
      el.width = Math.max(1, Math.round(r.width * dpr));
      el.height = Math.max(1, Math.round(r.height * dpr));
      gl.viewport(0, 0, el.width, el.height);
    };
    resize();

    // estado atual (interpolado) — começa com as duas gotas afastadas
    const s = { sep: 1.1, ripple: 0, noise: 0.03, spin: 0.15, torus: 0 };
    let angle = 0;
    let time = 0;
    let lastStage = -1;
    /** Entrada profunda: 0 = no fundo, 1 = no lugar. */
    let emerge = 0;
    let emerging = false;
    const tilt = { x: 0, y: 0 };
    const pointer = { x: 0, y: 0 };
    /** Desfoque + opacidade do canvas acompanham a subida. */
    const styleEmerge = (e: number) => {
      el.style.filter = e >= 1 ? "" : `blur(${((1 - e) * 16).toFixed(2)}px)`;
      el.style.opacity = String(Math.min(1, e * 2.2));
    };

    const draw = () => {
      gl.uniform2f(U.res, el.width, el.height);
      gl.uniform1f(U.time, time);
      gl.uniform1f(U.angle, angle);
      gl.uniform1f(U.sep, s.sep);
      gl.uniform1f(U.ripple, s.ripple);
      gl.uniform1f(U.noise, s.noise);
      gl.uniform1f(U.torus, s.torus);
      gl.uniform1f(U.emerge, easeOut(emerge));
      gl.uniform2f(U.tilt, tilt.x, tilt.y);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    const ro = new ResizeObserver(() => {
      resize();
      if (reduceMotion) draw();
    });
    ro.observe(el);

    if (reduceMotion) {
      // forma estática do anel
      Object.assign(s, { sep: 0, ripple: 0, noise: 0, torus: 1 });
      angle = 0.4;
      emerge = 1;
      draw();
      return () => {
        ro.disconnect();
        gl.getExtension("WEBGL_lose_context")?.loseContext();
        el.remove();
      };
    }

    let raf = 0;
    let last = performance.now();
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const stage = Math.min(Math.max(stageRef.current ?? 0, 0), TARGETS.length - 1);
      if (stage !== lastStage) {
        // ao (re)entrar na Conversa, as duas gotas recomeçam afastadas
        if (stage === 0 && lastStage !== -1) s.sep = 1.1;
        lastStage = stage;
      }
      const tgt = TARGETS[stage];
      const k = 1 - Math.exp(-dt * 2.2);
      const kSep = 1 - Math.exp(-dt * 0.9); // aproximação lenta das gotas
      s.sep += (tgt.sep - s.sep) * kSep;
      s.ripple += (tgt.ripple - s.ripple) * k;
      s.noise += (tgt.noise - s.noise) * k;
      s.spin += (tgt.spin - s.spin) * k;
      s.torus += (tgt.torus - s.torus) * (1 - Math.exp(-dt * 1.6));
      angle += s.spin * dt;
      time += dt;
      if (emerging && emerge < 1) {
        emerge = Math.min(1, emerge + dt / 2.8);
        // ease-out na subida (o shader recebe o valor já suavizado)
        styleEmerge(easeOut(emerge));
      }
      const kt = 1 - Math.exp(-dt * 2.5);
      tilt.x += (pointer.x * 0.35 - tilt.x) * kt;
      tilt.y += (pointer.y * 0.25 - tilt.y) * kt;
      draw();
    };

    // mouse: inclinação leve na direção do cursor (só ponteiro fino)
    const onPointer = (ev: PointerEvent) => {
      const r = el.getBoundingClientRect();
      pointer.x = Math.max(-1, Math.min(1, (ev.clientX - (r.left + r.width / 2)) / (window.innerWidth / 2)));
      pointer.y = Math.max(-1, Math.min(1, (ev.clientY - (r.top + r.height / 2)) / (window.innerHeight / 2)));
    };
    if (!light) window.addEventListener("pointermove", onPointer, { passive: true });
    styleEmerge(0);

    const io = new IntersectionObserver(
      ([entry]) => {
        cancelAnimationFrame(raf);
        if (!entry.isIntersecting) {
          // saiu da tela: a próxima entrada emerge do fundo de novo
          emerging = false;
          emerge = 0;
          styleEmerge(0);
          return;
        }
        // emerge quando boa parte da gota está visível
        if (entry.intersectionRatio >= 0.4) emerging = true;
        last = performance.now();
        raf = requestAnimationFrame(frame);
      },
      { threshold: [0, 0.4] },
    );
    io.observe(el);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onPointer);
      io.disconnect();
      ro.disconnect();
      gl.getExtension("WEBGL_lose_context")?.loseContext();
      el.remove();
    };
  }, [stageRef, light, reduceMotion]);

  return <div ref={host} aria-hidden="true" className={className} />;
}

"use client";

import { useEffect, useRef, type RefObject } from "react";
import { enableParallelCompile, programReady } from "@/lib/warmup";
import { isMobileUI, isTouchScrolling, stableResizeObserver } from "@/lib/mobile";

/**
 * Gota de metal líquido cromado (WebGL2, sem bibliotecas), para "Como funciona".
 * Um único fragment shader faz raymarching de um SDF que muda de forma por
 * etapa (stageRef, escrito pela seção conforme o scroll):
 *   0 Conversa — duas gotas se aproximam e se fundem (união suave/metaballs);
 *   1 Diagnóstico — gota única com uma ondulação percorrendo a superfície;
 *   2 Plano — forma calma e regular;
 *   3 Direção contínua — fluxo constante, girando devagar;
 *   4 Evolução — amadurece: pulsa com uma ondulação mais forte;
 *   5 Parceria — a gota se fecha num anel líquido (toro) girando.
 * Os parâmetros da forma são interpolados suavemente para os alvos de cada
 * etapa (sem cortes). Cromo prata brilhante: reflexo de um "estúdio"
 * procedural no estilo do da bola da hero, ajustado para o fundo preto da
 * seção. Fundo transparente.
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
uniform float uPad;     // folga do canvas: ele tem uPad vezes o diâmetro da gota
uniform float uTime;
uniform float uAngle;
uniform float uSep;
uniform float uRipple;
uniform float uNoise;
uniform float uTorus;
uniform float uEmerge;
uniform vec2 uTilt;
uniform vec2 uPull;     // atração do cursor (direção * intensidade, espaço da tela)
uniform float uStretch; // squash and stretch da rolagem (>0 estica na vertical)
uniform vec4 uWave;     // onda do clique: xy do ponto, tempo de início, amplitude
out vec4 outColor;

mat3 rotY(float a){ float c=cos(a), s=sin(a); return mat3(c,0.,-s, 0.,1.,0., s,0.,c); }
mat3 rotX(float a){ float c=cos(a), s=sin(a); return mat3(1.,0.,0., 0.,c,s, 0.,-s,c); }
float smin(float a, float b, float k){ float h = clamp(0.5 + 0.5*(b-a)/k, 0., 1.); return mix(b, a, h) - k*h*(1.-h); }

float shape(vec3 p0){
  vec3 p = rotY(uAngle + uTilt.x) * rotX(0.25 + uTilt.y) * p0;
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
  // anel líquido (parceria): sempre quase de frente, só balança um pouco (de
  // perfil viraria uma pílula); gira no próprio plano (uAngle), visível pelos
  // três volumes que correm ao longo do anel
  vec3 q = rotX(1.05) * rotY(0.45 * sin(t * 0.35) + uTilt.x) * rotX(0.25 + uTilt.y) * p0;
  float a = atan(q.z, q.x) + uAngle;
  float dT = length(vec2(length(q.xz) - 0.52, q.y)) - 0.19;
  dT -= 0.03 * sin(a * 3.0);
  dT += uNoise * 0.6 * sin(a * 3.0 + t * 1.2) * 0.5;
  return mix(d1, dT, uTorus);
}

// posição (entrada profunda: vem de longe no eixo Z e um pouco de baixo) e
// respiração constante na escala
float map(vec3 p){
  float e = 1.0 - uEmerge;
  p -= vec3(0.0, -0.55 * e * e, -7.0 * e);
  float b = 1.0 + 0.035 * sin(uTime * 1.25) + 0.012 * sin(uTime * 2.9 + 1.3);
  // interações (tudo zerado em repouso): tremor, atração, esticar, onda
  float age = uTime - uWave.z;
  p.xy += uWave.w * 0.018 * sin(age * 55.0) * exp(-age * 7.0) * vec2(1.0, 0.8);
  float pl = length(uPull);
  if (pl > 0.001) { vec2 dn = uPull / pl; p.xy -= uPull * 0.5 * smoothstep(-0.15, 0.65, dot(p.xy, dn)); }
  float st = clamp(uStretch, -0.5, 1.0);
  p.y /= 1.0 + 0.4 * st;
  p.xz *= 1.0 + 0.18 * st;
  float d = shape(p / b) * b;
  float rr = length(p.xy - uWave.xy);
  float front = age * 1.6;
  d -= uWave.w * 0.05 * sin(26.0 * (rr - front)) * exp(-(rr - front) * (rr - front) * 6.0) * exp(-age * 1.2);
  return d * (1.0 - 0.3 * clamp(pl + abs(st) + uWave.w, 0.0, 1.0));
}

vec3 normalAt(vec3 p){
  const vec2 e = vec2(0.0015, -0.0015);
  return normalize(e.xyy*map(p+e.xyy) + e.yyx*map(p+e.yyx) + e.yxy*map(p+e.yxy) + e.xxx*map(p+e.xxx));
}

// estúdio procedural para fundo PRETO (mesma ideia do estúdio da bola da
// hero): cúpula com céu claro, horizonte cinza e chão escuro mas não preto
// (o contorno não some no fundo), tiras verticais finas e intensas em
// posições assimétricas (sem "rosto" no reflexo) e softbox alto
float strip(float az, float at, float w){
  float d = abs(mod(az - at + 3.14159, 6.28318) - 3.14159);
  return exp(-d * d / (w * w));
}
float env(vec3 r){
  float base = r.y > 0.0 ? mix(0.3, 1.05, smoothstep(0.0, 0.8, r.y)) : mix(0.24, 0.04, smoothstep(0.0, 0.35, -r.y));
  base += 0.55 * exp(-(r.y - 0.02) * (r.y - 0.02) / 0.0008); // linha do horizonte nítida
  float az = atan(r.z, r.x);
  float up = smoothstep(-0.25, 0.35, r.y);
  base *= 1.0 - 0.65 * strip(az, -0.4, 0.3) * up; // painel escuro: o céu não fica chapado
  base += (1.5 * strip(az, 0.9, 0.06) + 1.1 * strip(az, 2.6, 0.04) + 0.8 * strip(az, -1.9, 0.05)) * up;
  base += 1.8 * pow(max(dot(r, normalize(vec3(-0.35, 0.9, 0.3))), 0.0), 24.0); // softbox alto
  base += 0.5 * pow(max(dot(r, normalize(vec3(0.8, 0.1, 0.4))), 0.0), 18.0);   // recorte
  return base;
}

void main(){
  // a gota mantém o tamanho: o canvas é uPad vezes maior, o uv se compensa
  vec2 uv = (gl_FragCoord.xy - 0.5 * uRes) / (min(uRes.x, uRes.y) / uPad);
  vec3 ro = vec3(0.0, 0.0, 2.7);
  vec3 rd = normalize(vec3(uv * 0.95, -1.6));
  // esfera envolvente (acompanha a entrada profunda): raios que não a cruzam
  // saem logo, então a folga do canvas quase não custa
  float eo = 1.0 - uEmerge;
  vec3 bc = vec3(0.0, -0.55 * eo * eo, -7.0 * eo);
  vec3 oc = ro - bc;
  float bb = dot(oc, rd);
  float disc = bb * bb - (dot(oc, oc) - 1.5 * 1.5);
  if (disc < 0.0) { outColor = vec4(0.0); return; }
  float sq = sqrt(disc);
  float t = max(-bb - sq, 0.0);
  float tFar = -bb + sq;
  float hit = 0.0;
  for (int i = 0; i < ${steps}; i++) {
    vec3 p = ro + rd * t;
    float d = map(p);
    if (d < 0.0012) { hit = 1.0; break; }
    t += d * 0.8;
    if (t > tFar) break;
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
/** Folga do canvas (diâmetro da área de render / diâmetro da gota). */
const PAD = 1.6;
/** Teto suave: sobe linear e satura em max (sem parar de forma brusca). */
const softCap = (v: number, max: number) => max * Math.tanh(v / max);
const easeOut = (x: number) => 1 - (1 - x) ** 3;

const TARGETS: Target[] = [
  { sep: 0, ripple: 0, noise: 0.03, spin: 0.15, torus: 0 }, // conversa
  { sep: 0, ripple: 1, noise: 0.035, spin: 0.2, torus: 0 }, // diagnóstico
  { sep: 0, ripple: 0, noise: 0.022, spin: 0.1, torus: 0 }, // plano
  { sep: 0, ripple: 0, noise: 0.07, spin: 0.55, torus: 0 }, // direção contínua
  { sep: 0, ripple: 0.5, noise: 0.05, spin: 0.35, torus: 0 }, // evolução: amadurece, pulsando
  { sep: 0, ripple: 0, noise: 0.02, spin: 0.45, torus: 1 }, // parceria: anel girando
];

function compile(gl: WebGL2RenderingContext, type: number, src: string) {
  const s = gl.createShader(type)!;
  gl.shaderSource(s, src);
  gl.compileShader(s); // sem consultar o status aqui: ver programReady + LINK_STATUS
  return s;
}

export default function LiquidDrop({
  stageRef,
  light = false,
  maxDpr = 2,
  reduceMotion = false,
  onLost,
  className = "",
}: {
  /** Etapa atual (0–5), escrita pela seção. */
  stageRef: RefObject<number>;
  light?: boolean;
  /** Teto de DPR do nível de qualidade (lib/quality). */
  maxDpr?: number;
  reduceMotion?: boolean;
  /** Perda do contexto WebGL pelo navegador (o pai remonta). */
  onLost?: () => void;
  className?: string;
}) {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const box = host.current;
    if (!box) return;
    // canvas novo a cada montagem (Strict Mode: contexto anterior já foi perdido)
    const el = document.createElement("canvas");
    // canvas PAD vezes maior que a gota, centralizado, transparente e sem receber
    // eventos (a gota continua do mesmo tamanho; a folga deixa a deformação passar)
    el.style.cssText = `position:absolute;left:${(-(PAD - 1) / 2) * 100}%;top:${(-(PAD - 1) / 2) * 100}%;width:${PAD * 100}%;height:${PAD * 100}%;pointer-events:none`;
    box.appendChild(el);
    const gl = el.getContext("webgl2", { premultipliedAlpha: true, alpha: true, antialias: false });
    if (!gl) {
      el.remove();
      return;
    }
    // link em segundo plano: as consultas de status não esperam o compilador (lib/warmup)
    enableParallelCompile(gl);
    let program: WebGLProgram;
    try {
      program = gl.createProgram()!;
      gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VERT));
      gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, FRAG(light ? 48 : 80)));
      gl.linkProgram(program);
    } catch {
      gl.getExtension("WEBGL_lose_context")?.loseContext();
      el.remove();
      return;
    }
    // consultar o status agora travaria a thread principal pela compilação
    // inteira: espera o link em segundo plano (programReady, lib/warmup) e só
    // então confere o resultado e monta o resto.
    const abandon = () => {
      gl.getExtension("WEBGL_lose_context")?.loseContext();
      el.remove();
    };
    const start = (): (() => void) => {
      gl.useProgram(program);
      const handleLost = (e: Event) => {
        e.preventDefault();
        onLost?.();
      };
      el.addEventListener("webglcontextlost", handleLost);
      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      const loc = gl.getAttribLocation(program, "aPos");
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      const u = (n: string) => gl.getUniformLocation(program, n);
      const U = { pad: u("uPad"), res: u("uRes"), time: u("uTime"), angle: u("uAngle"), sep: u("uSep"), ripple: u("uRipple"), noise: u("uNoise"), torus: u("uTorus"), emerge: u("uEmerge"), tilt: u("uTilt"), pull: u("uPull"), stretch: u("uStretch"), wave: u("uWave") };

      const dpr = Math.min(window.devicePixelRatio || 1, light ? 1 : 1.5, maxDpr);
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
      // interações: molas amortecidas (atração, esticar) e onda do clique
      const mobileUI = isMobileUI();
      const pull = { x: 0, y: 0, vx: 0, vy: 0, tx: 0, ty: 0 };
      const stretch = { v: 0, vel: 0 };
      const wave = { x: 0, y: 0, t0: -100, amp: 0 };
      let lastY = window.scrollY;
      let vScroll = 0;
      let frozen = false;
      /** Desfoque + opacidade do canvas acompanham a subida. */
      const styleEmerge = (e: number) => {
        el.style.filter = e >= 1 ? "" : `blur(${((1 - e) * 16).toFixed(2)}px)`;
        el.style.opacity = String(Math.min(1, e * 2.2));
      };

      const draw = () => {
        gl.uniform2f(U.res, el.width, el.height);
        gl.uniform1f(U.pad, PAD);
        gl.uniform1f(U.time, time);
        gl.uniform1f(U.angle, angle);
        gl.uniform1f(U.sep, s.sep);
        gl.uniform1f(U.ripple, s.ripple);
        gl.uniform1f(U.noise, s.noise);
        gl.uniform1f(U.torus, s.torus);
        gl.uniform1f(U.emerge, easeOut(emerge));
        gl.uniform2f(U.tilt, tilt.x, tilt.y);
        // teto suave de cada efeito: somados ficam dentro da folga do canvas
        const pm = Math.hypot(pull.x, pull.y);
        const pk = pm > 1e-4 ? softCap(pm, 0.45) / pm : 0;
        gl.uniform2f(U.pull, pull.x * pk, pull.y * pk);
        gl.uniform1f(U.stretch, stretch.v > 0 ? softCap(stretch.v, 0.85) : stretch.v);
        gl.uniform4f(U.wave, wave.x, wave.y, wave.t0, Math.min(wave.amp, 1));
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      };

      const ro = stableResizeObserver(() => {
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
          el.removeEventListener("webglcontextlost", handleLost);
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
        // celular: congela o quadro enquanto o dedo rola a página (lib/mobile)
        if (isTouchScrolling()) {
          frozen = true;
          return;
        }
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
        // rolagem: no desktop a gota estica com a velocidade; no celular só depois
        // que a rolagem para (impulso pelo deslocamento + balanço de gelatina)
        const y = window.scrollY;
        const dy = y - lastY;
        lastY = y;
        if (mobileUI) {
          if (frozen) stretch.vel += Math.min(Math.abs(dy) / 900, 1) * 9;
          vScroll = 0;
        } else {
          vScroll += (dy / Math.max(dt, 0.001) - vScroll) * (1 - Math.exp(-dt * 12));
        }
        frozen = false;
        const sTarget = mobileUI ? 0 : Math.min(Math.abs(vScroll) / 2500, 1) * 0.8;
        stretch.vel += (-70 * (stretch.v - sTarget) - 7 * stretch.vel) * dt;
        stretch.v += stretch.vel * dt;
        stretch.v = Math.max(-0.5, Math.min(1, stretch.v));
        // atração do cursor: mola amortecida (balança ao voltar)
        pull.vx += (-60 * (pull.x - pull.tx) - 6 * pull.vx) * dt;
        pull.vy += (-60 * (pull.y - pull.ty) - 6 * pull.vy) * dt;
        pull.x += pull.vx * dt;
        pull.y += pull.vy * dt;
        if (wave.amp > 0 && time - wave.t0 > 3.2) wave.amp = 0;
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
      // atração: cursor a até ~250 px do centro puxa a superfície (ponteiro fino)
      const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
      const onPull = (ev: PointerEvent) => {
        if (ev.pointerType !== "mouse") return;
        const r = el.getBoundingClientRect();
        const dx = ev.clientX - (r.left + r.width / 2);
        const dy = ev.clientY - (r.top + r.height / 2);
        const dist = Math.hypot(dx, dy);
        const k = Math.max(0, 1 - dist / 250);
        // intensidade proporcional à proximidade; some no centro (direção instável)
        const m = dist > 1 ? (0.45 * k * Math.min(1, dist / 100)) / dist : 0;
        pull.tx = dx * m;
        pull.ty = -dy * m;
      };
      const onLeave = () => {
        pull.tx = 0;
        pull.ty = 0;
      };
      if (finePointer && !light) {
        window.addEventListener("pointermove", onPull, { passive: true });
        document.documentElement.addEventListener("pointerleave", onLeave);
      }
      // onda: clique (mouse) ou toque na gota, a partir do ponto tocado
      const onClick = (ev: MouseEvent) => {
        const r = el.getBoundingClientRect();
        // uv no espaço do shader (o canvas é PAD vezes maior que a gota)
        const ux = ((ev.clientX - (r.left + r.width / 2)) / Math.min(r.width, r.height)) * PAD;
        const uy = (-(ev.clientY - (r.top + r.height / 2)) / Math.min(r.width, r.height)) * PAD;
        if (Math.hypot(ux, uy) > 0.5) return;
        Object.assign(wave, { x: ux * 1.6, y: uy * 1.6, t0: time, amp: 1 });
      };
      window.addEventListener("click", onClick, { passive: true });
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
        window.removeEventListener("pointermove", onPull);
        window.removeEventListener("click", onClick);
        document.documentElement.removeEventListener("pointerleave", onLeave);
        el.removeEventListener("webglcontextlost", handleLost);
        io.disconnect();
        ro.disconnect();
        gl.getExtension("WEBGL_lose_context")?.loseContext();
        el.remove();
      };
    };
    let alive = true;
    let stop: (() => void) | null = null;
    programReady(gl, program).then(() => {
      if (!alive) return;
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        abandon();
        return;
      }
      stop = start();
    });
    return () => {
      alive = false;
      if (stop) stop();
      else {
        // desmontou antes de ficar pronto (ex.: Strict Mode em dev): o canvas
        // sai já, e o contexto só é liberado com o link pronto; liberar agora
        // esperaria a compilação pendente na thread principal (~170 ms)
        el.remove();
        programReady(gl, program).then(() => gl.getExtension("WEBGL_lose_context")?.loseContext());
      }
    };
  }, [stageRef, light, maxDpr, reduceMotion, onLost]);

  return <div ref={host} aria-hidden="true" className={`relative ${className}`} />;
}

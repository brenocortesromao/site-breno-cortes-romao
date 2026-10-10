"use client";

import { useEffect, useRef } from "react";

/**
 * Curvas de nível LÍQUIDAS em tempo real (WebGL2, sem bibliotecas).
 * As linhas são isolinhas de um campo de ruído simplex 3D com domain warping
 * lento: mudam de forma o tempo todo — ondulam, esticam, se fundem e se
 * separam —, coerentes com a bola de metal líquido da hero.
 * - Linhas finas antialiasadas com fwidth; cor = token --graphic (lida do
 *   <html>, então acompanha a transição de tema).
 * - Cursor: deixa ondulações locais (anel senoidal que se dissipa devagar).
 * - Desempenho: só renderiza com a seção visível (IntersectionObserver), a
 *   ~30 fps; mobile com menos linhas, 2 oitavas e resolução menor.
 * Quem decide se este componente é usado (WebGL2 + sem reduced motion) é o
 * GraphicLayer; o fallback é o SVG estático.
 */

const MAX_RIPPLES = 8;

const VERT = /* glsl */ `#version 300 es
in vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }`;

const FRAG = /* glsl */ `#version 300 es
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform float uLevels;
uniform float uScale;
uniform float uSeed;
uniform float uLineW;
uniform vec4 uColor;
uniform vec3 uRipples[${MAX_RIPPLES}];
out vec4 outColor;

// Simplex noise 3D (Ashima Arts / Stefan Gustavson, MIT)
vec3 m289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 m289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 perm(vec4 x){return m289(((x*34.0)+10.0)*x);}
vec4 tis(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1.0/6.0,1.0/3.0); const vec4 D=vec4(0.0,0.5,1.0,2.0);
  vec3 i=floor(v+dot(v,C.yyy)); vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz); vec3 l=1.0-g; vec3 i1=min(g.xyz,l.zxy); vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx; vec3 x2=x0-i2+C.yyy; vec3 x3=x0-D.yyy; i=m289(i);
  vec4 p=perm(perm(perm(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
  float n_=0.142857142857; vec3 ns=n_*D.wyz-D.xzx; vec4 j=p-49.0*floor(p*ns.z*ns.z);
  vec4 x_=floor(j*ns.z); vec4 y_=floor(j-7.0*x_); vec4 x=x_*ns.x+ns.yyyy; vec4 y=y_*ns.x+ns.yyyy;
  vec4 h=1.0-abs(x)-abs(y); vec4 b0=vec4(x.xy,y.xy); vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.0+1.0; vec4 s1=floor(b1)*2.0+1.0; vec4 sh=-step(h,vec4(0.0));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy; vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x); vec3 p1=vec3(a0.zw,h.y); vec3 p2=vec3(a1.xy,h.z); vec3 p3=vec3(a1.zw,h.w);
  vec4 nr=tis(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3))); p0*=nr.x; p1*=nr.y; p2*=nr.z; p3*=nr.w;
  vec4 m=max(0.5-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0); m=m*m;
  return 105.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}

float field(vec2 p){
  float t = uTime;
  // domain warping lento: é o que faz as linhas esticarem, fundirem e separarem
  vec2 w = vec2(
    snoise(vec3(p * 0.55, t * 0.045 + uSeed)),
    snoise(vec3(p * 0.55 + 7.31, t * 0.045 - uSeed))
  );
  p += w * 0.6;
  float f = snoise(vec3(p, t * 0.06 + uSeed)) * 0.7;
  f += snoise(vec3(p * 2.1, t * 0.08 - uSeed)) * 0.22;
  #ifndef LIGHT
  f += snoise(vec3(p * 4.3, t * 0.1)) * 0.08;
  #endif
  return f;
}

void main(){
  vec2 frag = gl_FragCoord.xy;
  vec2 p = frag / uScale;

  // ondulações do cursor: anel senoidal que se expande e se dissipa devagar
  float rip = 0.0;
  for (int i = 0; i < ${MAX_RIPPLES}; i++) {
    vec3 r = uRipples[i];
    if (r.z < 0.0) continue;
    float d = distance(frag, r.xy) / uScale;
    float age = r.z;
    float env = exp(-age * 0.75) * exp(-d * d / (0.02 + age * 0.06));
    rip += env * 0.09 * sin(d * 26.0 - age * 4.0);
  }

  float v = (field(p) + rip) * uLevels;
  float dist = abs(fract(v - 0.5) - 0.5) / max(fwidth(v), 1e-4); // distância à isolinha, em px
  float a = 1.0 - smoothstep(uLineW - 0.6, uLineW + 0.6, dist);
  outColor = vec4(uColor.rgb * uColor.a * a, uColor.a * a); // alpha pré-multiplicado
}`;

/** Lê --graphic (rgba(...) ou #hex) do <html> como [r,g,b,a] 0–1. */
function readGraphicColor(): [number, number, number, number] {
  const raw = getComputedStyle(document.documentElement).getPropertyValue("--graphic").trim();
  const m = raw.match(/rgba?\(([^)]+)\)/);
  if (m) {
    const [r, g, b, a = "1"] = m[1].split(",").map((s) => s.trim());
    return [+r / 255, +g / 255, +b / 255, +a];
  }
  // hex: #RRGGBB ou #RRGGBBAA (o GSAP grava a cor interpolada como hex de 8 dígitos)
  if (raw.startsWith("#") && raw.length >= 7) {
    const h = (i: number) => parseInt(raw.slice(i, i + 2), 16) / 255;
    return [h(1), h(3), h(5), raw.length >= 9 ? h(7) : 1];
  }
  return [0.08, 0.08, 0.09, 0.11];
}

function compile(gl: WebGL2RenderingContext, type: number, src: string) {
  const s = gl.createShader(type)!;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? "shader");
  return s;
}

export default function LiquidContours({
  seed = 0,
  light = false,
  onReady,
  onFail,
}: {
  seed?: number;
  /** Versão leve (mobile): menos linhas, 2 oitavas, resolução menor. */
  light?: boolean;
  onReady?: () => void;
  onFail?: () => void;
}) {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const box = host.current;
    if (!box) return;
    // Canvas novo a cada montagem: no Strict Mode (dev) o efeito roda 2x e um
    // canvas reaproveitado devolveria o contexto já perdido pela limpeza.
    const el = document.createElement("canvas");
    el.className = "absolute inset-0 h-full w-full";
    box.appendChild(el);
    const gl = el.getContext("webgl2", { premultipliedAlpha: true, antialias: false, alpha: true });
    if (!gl) {
      el.remove();
      onFail?.();
      return;
    }

    let program: WebGLProgram;
    try {
      program = gl.createProgram()!;
      gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VERT));
      gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, light ? FRAG.replace("precision highp float;", "precision highp float;\n#define LIGHT") : FRAG));
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) ?? "link");
    } catch {
      gl.getExtension("WEBGL_lose_context")?.loseContext();
      el.remove();
      onFail?.();
      return;
    }
    gl.useProgram(program);
    // perda do contexto pelo navegador (limite de contextos, GPU): avisa o pai,
    // que remonta a camada
    const onLost = (e: Event) => {
      e.preventDefault();
      onFail?.();
    };
    el.addEventListener("webglcontextlost", onLost);

    // triângulo que cobre a tela
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(program, "aPos");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const u = (n: string) => gl.getUniformLocation(program, n);
    const uRes = u("uRes"), uTime = u("uTime"), uLevels = u("uLevels"), uScale = u("uScale");
    const uSeed = u("uSeed"), uLineW = u("uLineW"), uColor = u("uColor"), uRipples = u("uRipples");

    const dpr = Math.min(window.devicePixelRatio || 1, light ? 1 : 1.5);
    const resize = () => {
      const r = el.getBoundingClientRect();
      el.width = Math.max(1, Math.round(r.width * dpr));
      el.height = Math.max(1, Math.round(r.height * dpr));
      gl.viewport(0, 0, el.width, el.height);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(el);

    gl.uniform1f(uLevels, light ? 5 : 7.5); // poucas linhas, bem espaçadas
    gl.uniform1f(uScale, (light ? 300 : 460) * dpr);
    gl.uniform1f(uSeed, seed * 13.7);
    gl.uniform1f(uLineW, 0.55 * dpr);

    // ondulações do cursor (x, y em px do canvas; z = idade em s; -1 = livre)
    const ripples = new Float32Array(MAX_RIPPLES * 3).fill(-1);
    let next = 0;
    let lastX = -1e4, lastY = -1e4;
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const r = el.getBoundingClientRect();
      if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) return;
      if (Math.hypot(e.clientX - lastX, e.clientY - lastY) < 70) return;
      lastX = e.clientX;
      lastY = e.clientY;
      ripples[next * 3] = (e.clientX - r.left) * dpr;
      ripples[next * 3 + 1] = (r.bottom - e.clientY) * dpr; // origem do GL é embaixo
      ripples[next * 3 + 2] = 0;
      next = (next + 1) % MAX_RIPPLES;
    };
    if (!light) window.addEventListener("pointermove", onMove, { passive: true });

    let visible = false;
    let raf = 0;
    let last = performance.now();
    let acc = 0;
    let time = Math.random() * 100;
    let colorTick = 0;
    let color = readGraphicColor();
    let ready = false;

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      acc += dt;
      if (acc < 1 / 30) return; // ~30 fps: movimento lento não precisa de 60
      time += acc / 3; // ~3x mais lento que o tempo real: calmo, quase hipnótico
      for (let i = 0; i < MAX_RIPPLES; i++) {
        if (ripples[i * 3 + 2] >= 0) {
          ripples[i * 3 + 2] += acc;
          if (ripples[i * 3 + 2] > 6) ripples[i * 3 + 2] = -1;
        }
      }
      acc = 0;
      if (++colorTick % 6 === 0) color = readGraphicColor(); // acompanha a transição de tema

      gl.uniform2f(uRes, el.width, el.height);
      gl.uniform1f(uTime, time);
      gl.uniform4f(uColor, color[0], color[1], color[2], color[3] * 0.8); // mais suave que o token
      gl.uniform3fv(uRipples, ripples);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      if (!ready) {
        ready = true;
        onReady?.();
      }
    };

    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      cancelAnimationFrame(raf);
      if (visible) {
        last = performance.now();
        raf = requestAnimationFrame(frame);
      }
    });
    io.observe(el);

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      window.removeEventListener("pointermove", onMove);
      el.removeEventListener("webglcontextlost", onLost);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
      el.remove();
    };
  }, [seed, light, onReady, onFail]);

  return <div ref={host} aria-hidden="true" className="absolute inset-0" />;
}

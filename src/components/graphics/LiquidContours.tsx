"use client";

import { useEffect, useRef } from "react";
import { enableParallelCompile, programReady } from "@/lib/warmup";
import { liveTheme } from "@/components/theme/themes";

/**
 * Curvas de nível LÍQUIDAS em tempo real (WebGL2, sem bibliotecas).
 * As linhas são isolinhas de um campo de ruído simplex 3D com domain warping
 * lento: mudam de forma o tempo todo — ondulam, esticam, se fundem e se
 * separam —, coerentes com a bola de metal líquido da hero.
 * - Linhas finas antialiasadas com fwidth; cor = token --graphic (lida do
 *   <html>, então acompanha a transição de tema).
 * - Cursor: deixa ondulações locais (anel senoidal que se dissipa devagar).
 * - Desempenho: só renderiza com a seção visível (IntersectionObserver), a
 *   ~30 fps; mobile com menos linhas, 2 oitavas e resolução menor. Resolução
 *   interna em RES_SCALE do DPR (o canvas reescala), com a escala do desenho e
 *   a espessura das linhas compensadas (mesmo visual em px de CSS). Só UMA
 *   instância desenha por vez (a mais visível). A cor vem do valor vivo do
 *   ThemeScroll em memória (liveTheme: sem recálculo de estilo).
 * Quem decide se este componente é usado (WebGL2 + sem reduced motion) é o
 * GraphicLayer; o fallback é o SVG estático.
 */

const MAX_RIPPLES = 8;
/** Resolução interna em relação ao DPR (0,75: ~44% menos pixels no shader). */
const RES_SCALE = 0.75;

/** Instâncias visíveis (e quanto de cada uma está na tela): só a mais visível desenha. */
const visibleShare = new Map<symbol, number>();
function isOwner(id: symbol) {
  let best: symbol | null = null;
  let bestShare = -1;
  visibleShare.forEach((share, key) => {
    if (share > bestShare) {
      bestShare = share;
      best = key;
    }
  });
  return best === id;
}

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
uniform vec4 uRipples[${MAX_RIPPLES}]; // x, y (px), idade (s; < 0 = livre), tipo (1 mouse, 2 toque, 3 rastro do dedo)
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

  // ondulações do cursor: anel senoidal que se expande e se dissipa devagar.
  // Toque: ~1,8x mais forte e mais larga, some em ~2,5 s (pedra caindo na
  // água); rastro do dedo: ondas menores
  float rip = 0.0;
  for (int i = 0; i < ${MAX_RIPPLES}; i++) {
    vec4 r = uRipples[i];
    if (r.z < 0.0) continue;
    float age = r.z;
    float tap = step(1.5, r.w) * (1.0 - step(2.5, r.w));
    float trail = step(2.5, r.w);
    float d = distance(frag, r.xy) / uScale / mix(1.0, 1.8, tap);
    float env = exp(-age * mix(0.75, 1.2, tap)) * exp(-d * d / (0.02 + age * 0.06));
    rip += env * 0.09 * mix(1.0, 1.8, tap) * mix(1.0, 0.55, trail) * sin(d * 26.0 - age * 4.0);
  }

  float v = (field(p) + rip) * uLevels;
  float dist = abs(fract(v - 0.5) - 0.5) / max(fwidth(v), 1e-4); // distância à isolinha, em px
  float a = 1.0 - smoothstep(uLineW - 0.6, uLineW + 0.6, dist);
  outColor = vec4(uColor.rgb * uColor.a * a, uColor.a * a); // alpha pré-multiplicado
}`;

/**
 * Lê --graphic (rgba(...) ou #hex) como [r,g,b,a] 0–1. Primeiro o valor vivo
 * que o ThemeScroll mantém em memória (liveTheme: sem ler estilo, e certo
 * também no meio de uma troca de tema); só sem ele, o computado do <html>.
 */
function readGraphicRaw() {
  return (liveTheme.get("graphic") || getComputedStyle(document.documentElement).getPropertyValue("--graphic")).trim();
}
function parseGraphicColor(raw: string): [number, number, number, number] {
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
  gl.compileShader(s); // sem consultar o status aqui: ver programReady + LINK_STATUS
  return s;
}

export default function LiquidContours({
  seed = 0,
  light = false,
  maxDpr = 2,
  onReady,
  onFail,
}: {
  seed?: number;
  /** Versão leve (mobile): menos linhas, 2 oitavas, resolução menor. */
  light?: boolean;
  /** Teto de DPR do nível de qualidade (lib/quality). */
  maxDpr?: number;
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
    // link em segundo plano: as consultas de status não esperam o compilador (lib/warmup)
    enableParallelCompile(gl);

    let program: WebGLProgram;
    try {
      program = gl.createProgram()!;
      gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VERT));
      gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, light ? FRAG.replace("precision highp float;", "precision highp float;\n#define LIGHT") : FRAG));
      gl.linkProgram(program);
    } catch {
      gl.getExtension("WEBGL_lose_context")?.loseContext();
      el.remove();
      onFail?.();
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

      const dpr = Math.min(window.devicePixelRatio || 1, light ? 1 : 1.5, maxDpr) * RES_SCALE;
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
      gl.uniform1f(uLineW, 0.55 * dpr); // em px do canvas: a mesma espessura em px de CSS

      // ondulações (x, y em px do canvas; z = idade em s, -1 = livre; w = tipo)
      const ripples = new Float32Array(MAX_RIPPLES * 4).fill(-1);
      let next = 0;
      let lastX = -1e4, lastY = -1e4;
      const addRipple = (x: number, y: number, kind = 1, gap = 70) => {
        // distância primeiro: a posição do canvas só é lida quando uma onda pode nascer
        if (Math.hypot(x - lastX, y - lastY) < gap) return false;
        const r = el.getBoundingClientRect();
        if (x < r.left || x > r.right || y < r.top || y > r.bottom) return false;
        lastX = x;
        lastY = y;
        ripples[next * 4] = (x - r.left) * dpr;
        ripples[next * 4 + 1] = (r.bottom - y) * dpr; // origem do GL é embaixo
        ripples[next * 4 + 2] = 0;
        ripples[next * 4 + 3] = kind;
        next = (next + 1) % MAX_RIPPLES;
        return true;
      };
      const onMove = (e: PointerEvent) => {
        if (e.pointerType === "mouse") addRipple(e.clientX, e.clientY);
      };
      // toque (sem preventDefault, ouvintes passivos: nunca atrapalha a rolagem):
      // - tap (dedo parado): onda forte onde tocou, com vibração leve no Android;
      // - dedo andando (também enquanto a página rola): rastro de ondas menores a
      //   cada ~60 px percorridos, como o mouse no desktop.
      let touch: { x: number; y: number; px: number; py: number; moved: boolean } | null = null;
      const onTouchStart = (e: TouchEvent) => {
        const t = e.touches[0];
        if (!t || e.touches.length > 1) {
          touch = null;
          return;
        }
        touch = { x: t.clientX, y: t.clientY, px: t.clientX, py: t.clientY, moved: false };
      };
      const onTouchMove = (e: TouchEvent) => {
        const t = e.touches[0];
        if (!touch || !t) return;
        if (Math.hypot(t.clientX - touch.x, t.clientY - touch.y) > 10) touch.moved = true;
        if (touch.moved && Math.hypot(t.clientX - touch.px, t.clientY - touch.py) >= 60) {
          touch.px = t.clientX;
          touch.py = t.clientY;
          addRipple(t.clientX, t.clientY, 3, 0);
        }
      };
      const onTouchEnd = () => {
        if (touch && !touch.moved && addRipple(touch.x, touch.y, 2, 0)) {
          try {
            navigator.vibrate?.(8);
          } catch {
            /* sem suporte (iPhone): ignora */
          }
        }
        touch = null;
      };
      // ondulações sempre que houver mouse ou toque (também no modo leve: são só
      // uniforms); nada com prefers-reduced-motion
      const hasMouse = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduced) {
        /* sem ondulações nem vibração */
      } else if (hasMouse) window.addEventListener("pointermove", onMove, { passive: true });
      else {
        window.addEventListener("touchstart", onTouchStart, { passive: true });
        window.addEventListener("touchmove", onTouchMove, { passive: true });
        window.addEventListener("touchend", onTouchEnd, { passive: true });
        window.addEventListener("touchcancel", onTouchEnd, { passive: true });
      }

      let visible = false;
      let raf = 0;
      let last = performance.now();
      let acc = 0;
      let time = Math.random() * 100;
      let colorTick = 0;
      let colorRaw = readGraphicRaw();
      let color = parseGraphicColor(colorRaw);
      let ready = false;
      const id = Symbol("contours");

      const frame = (now: number) => {
        raf = requestAnimationFrame(frame);
        const dt = Math.min((now - last) / 1000, 0.1);
        last = now;
        acc += dt;
        if (acc < 1 / 30) return; // ~30 fps: movimento lento não precisa de 60
        if (!isOwner(id)) return; // outra instância mais visível está desenhando
        time += acc / 3; // ~3x mais lento que o tempo real: calmo, quase hipnótico
        for (let i = 0; i < MAX_RIPPLES; i++) {
          if (ripples[i * 4 + 2] >= 0) {
            ripples[i * 4 + 2] += acc;
            if (ripples[i * 4 + 2] > 6) ripples[i * 4 + 2] = -1;
          }
        }
        acc = 0;
        if (++colorTick % 6 === 0) {
          // acompanha a transição de tema (só interpreta quando o valor muda)
          const raw = readGraphicRaw();
          if (raw !== colorRaw) {
            colorRaw = raw;
            color = parseGraphicColor(raw);
          }
        }

        gl.uniform2f(uRes, el.width, el.height);
        gl.uniform1f(uTime, time);
        gl.uniform4f(uColor, color[0], color[1], color[2], color[3] * 0.8); // mais suave que o token
        gl.uniform4fv(uRipples, ripples);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        if (!ready) {
          ready = true;
          onReady?.();
        }
      };

      const io = new IntersectionObserver(
        ([entry]) => {
          const was = visible;
          visible = entry.isIntersecting;
          if (visible) visibleShare.set(id, entry.intersectionRatio);
          else visibleShare.delete(id);
          if (visible === was) return;
          cancelAnimationFrame(raf);
          if (visible) {
            last = performance.now();
            raf = requestAnimationFrame(frame);
          }
        },
        { threshold: [0, 0.25, 0.5, 0.75, 1] },
      );
      io.observe(el);

      return () => {
        cancelAnimationFrame(raf);
        io.disconnect();
        visibleShare.delete(id);
        ro.disconnect();
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("touchstart", onTouchStart);
        window.removeEventListener("touchmove", onTouchMove);
        window.removeEventListener("touchend", onTouchEnd);
        window.removeEventListener("touchcancel", onTouchEnd);
        el.removeEventListener("webglcontextlost", onLost);
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
        onFail?.();
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
  }, [seed, light, maxDpr, onReady, onFail]);

  return <div ref={host} aria-hidden="true" className="absolute inset-0" />;
}

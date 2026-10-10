"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import Image from "next/image";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import ResilientBoundary from "@/components/ResilientBoundary";
import { webglSupport } from "@/lib/webgl";
import { useNearViewport } from "@/lib/useNearViewport";

gsap.registerPlugin(useGSAP, ScrollTrigger);

/**
 * Retrato revelado "como pintura", ligado ao scroll (WebGL2, sem bibliotecas):
 *  1. traços largos e soltos em preto e branco, como esboço a carvão
 *     (luminância com contraste alto + contornos);
 *  2. pinceladas menores, em várias direções, que preenchem e dão detalhe;
 *  3. a cor entra suave por último, como a camada final de tinta.
 * Cada camada é revelada por uma máscara de pinceladas (ruído alongado na
 * direção do traço + textura de cerdas) cujo limiar avança com o scroll; o
 * rosto (centro) vem antes das bordas. No fim o canvas some e fica a <img>
 * real (next/image), que também é o conteúdo sem JS / com reduced motion.
 * A revelação termina com o topo do retrato a 45% da tela (menos de meia tela
 * de scroll), antes de a assinatura começar a ser desenhada por cima.
 */

const VERT = /* glsl */ `#version 300 es
in vec2 aPos;
out vec2 vUv;
void main() { vUv = aPos * 0.5 + 0.5; gl_Position = vec4(aPos, 0.0, 1.0); }`;

const FRAG = /* glsl */ `#version 300 es
precision highp float;
uniform sampler2D uTex;
uniform vec2 uRes;
uniform float uImgAspect;
uniform float uP;
in vec2 vUv;
out vec4 outColor;

float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vnoise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
}
float fbm(vec2 p){ float a = 0.5, s = 0.0; for (int i = 0; i < 4; i++) { s += a * vnoise(p); p = p * 2.03 + 7.1; a *= 0.5; } return s; }
mat2 rot(float a){ float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }
float lum(vec3 c){ return dot(c, vec3(0.299, 0.587, 0.114)); }

// object-cover: recorta a imagem para preencher o quadro
vec2 coverUv(vec2 uv){
  float ca = uRes.x / uRes.y;
  vec2 s = ca > uImgAspect ? vec2(1.0, uImgAspect / ca) : vec2(ca / uImgAspect, 1.0);
  return (uv - 0.5) * s + 0.5;
}

// Ordem de revelação de uma camada de pinceladas (0 = primeiro, ~1 = último).
// Cada faixa (band) ao longo da direção do traço é uma pincelada com início
// próprio; as cerdas (bristles) riscam a borda no sentido do traço.
float strokeOrder(vec2 uv, float scale, float angle, float seed, out float bristle){
  vec2 q = rot(angle) * (uv - 0.5) * scale;
  float band = floor(q.y);
  float j = hash(vec2(band, seed));
  float body = fbm(vec2(q.x * 0.45 + j * 9.0, band * 1.7 + seed));
  bristle = vnoise(vec2(q.x * 1.2, q.y * 26.0 + seed * 3.0));
  return clamp(body * 0.7 + j * 0.3, 0.0, 1.0);
}

// limiar que avança com p: 0 = nada, 1 = tudo (ordem até ~1.5 com o viés do centro)
float reveal(float order, float p, float soft){
  float th = p * 1.6 - 0.05;
  return 1.0 - smoothstep(th - soft, th, order);
}

void main(){
  vec2 uv = vUv;
  vec2 t = coverUv(uv);
  vec3 col = texture(uTex, t).rgb;
  float L = lum(col);

  // contornos (Sobel na luminância) para o esboço
  vec2 px = 1.5 / uRes;
  float tl = lum(texture(uTex, coverUv(uv + vec2(-px.x,  px.y))).rgb);
  float tr = lum(texture(uTex, coverUv(uv + vec2( px.x,  px.y))).rgb);
  float bl = lum(texture(uTex, coverUv(uv + vec2(-px.x, -px.y))).rgb);
  float br = lum(texture(uTex, coverUv(uv + vec2( px.x, -px.y))).rgb);
  float edge = clamp(length(vec2(tr + br - tl - bl, tl + tr - bl - br)) * 3.0, 0.0, 1.0);

  // o rosto (centro, um pouco acima) aparece antes das bordas
  float centre = length((uv - vec2(0.5, 0.6)) * vec2(1.0, 0.8));

  float p1 = smoothstep(0.0, 0.45, uP);  // esboço a carvão
  float p2 = smoothstep(0.25, 0.8, uP);  // pinceladas de detalhe
  float p3 = smoothstep(0.62, 1.0, uP);  // cor

  float b1, b2a, b2b;
  float o1 = strokeOrder(uv, 5.0, -0.62, 1.0, b1) + centre * 0.55;
  float o2 = min(strokeOrder(uv, 11.0, 0.35, 5.0, b2a), strokeOrder(uv, 13.0, -1.2, 9.0, b2b) + 0.08) + centre * 0.45;
  float o3 = fbm(uv * 2.2 + 3.0) * 0.8 + centre * 0.4;

  // esboço: cinza de alto contraste, posterizado, com contornos e grão das cerdas
  float sk = smoothstep(0.08, 0.7, L);
  sk = floor(sk * 4.0 + 0.5) / 4.0;
  sk = clamp(sk * 0.85 + edge * 0.55, 0.0, 1.0) * (0.72 + 0.28 * b1);
  float a1 = reveal(o1, p1, 0.035 + 0.05 * b1);

  // detalhe: tons de cinza reais da foto
  float gray = clamp((L - 0.5) * 1.12 + 0.5, 0.0, 1.0);
  float a2 = reveal(o2, p2, 0.03 + 0.04 * b2a);

  // cor: camada final, macia
  float a3 = reveal(o3, p3, 0.18);

  vec3 c = vec3(sk);
  c = mix(c, vec3(gray), a2);
  c = mix(c, col, a3);
  float alpha = max(a1, max(a2, a3));
  outColor = vec4(c * alpha, alpha); // alfa pré-multiplicado
}`;

function compile(gl: WebGL2RenderingContext, type: number, src: string) {
  const s = gl.createShader(type)!;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? "shader");
  return s;
}

/** Canvas da pintura: desenha só quando o progresso muda. */
function PaintCanvas({
  imgRef,
  progressRef,
  onReady,
  onLost,
}: {
  imgRef: RefObject<HTMLImageElement | null>;
  progressRef: RefObject<{ value: number; draw?: () => void }>;
  onReady: () => void;
  onLost: () => void;
}) {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const box = host.current;
    const img = imgRef.current;
    if (!box || !img) return;
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
    } catch {
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
    const U = { res: u("uRes"), aspect: u("uImgAspect"), p: u("uP") };

    const tex = gl.createTexture();
    let imgAspect = 0.8;
    let ready = false;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);

    const draw = () => {
      if (!ready) return;
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
      gl.uniform1f(U.p, progressRef.current.value);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    // textura a partir da mesma imagem otimizada que a <img> carregou
    let cancelled = false;
    const upload = () => {
      if (cancelled || !img.naturalWidth) return;
      imgAspect = img.naturalWidth / img.naturalHeight;
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      ready = true;
      draw();
      onReady();
    };
    if (img.complete && img.naturalWidth) upload();
    else img.addEventListener("load", upload, { once: true });

    const shared = progressRef.current;
    shared.draw = draw;
    const ro = new ResizeObserver(draw);
    ro.observe(el);

    return () => {
      cancelled = true;
      img.removeEventListener("load", upload);
      shared.draw = undefined;
      ro.disconnect();
      el.removeEventListener("webglcontextlost", handleLost);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
      el.remove();
    };
  }, [imgRef, progressRef, onReady, onLost]);

  return <div ref={host} aria-hidden="true" className="absolute inset-0" />;
}

export default function PaintedPortrait({
  src,
  alt,
  sizes,
  className = "",
}: {
  src: string;
  alt: string;
  sizes?: string;
  className?: string;
}) {
  const root = useRef<HTMLDivElement>(null);
  const img = useRef<HTMLImageElement>(null);
  const canvasLayer = useRef<HTMLDivElement>(null);
  const progress = useRef<{ value: number; draw?: () => void }>({ value: 0 });
  const near = useNearViewport(root);
  const [paint, setPaint] = useState(false);
  const [ready, setReady] = useState(false);
  const handleReady = useCallback(() => setReady(true), []);
  const handleGiveUp = useCallback(() => setPaint(false), []);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- leitura única de capacidades do navegador
    setPaint(!reduced && webglSupport().webgl2);
  }, []);

  // Enquanto pinta, a <img> fica oculta e o canvas mostra a pintura; completa
  // (p = 1), a <img> real volta e o canvas some.
  const sync = () => {
    const p = progress.current.value;
    if (img.current) img.current.style.opacity = !paint || p >= 1 ? "1" : "0";
    if (canvasLayer.current) canvasLayer.current.style.opacity = ready && p < 1 ? "1" : "0";
    progress.current.draw?.();
  };

  useGSAP(
    () => {
      if (!paint) return;
      const st = ScrollTrigger.create({
        trigger: root.current,
        start: "top 98%",
        end: "top 45%",
        scrub: 0.4,
        onUpdate: (self) => {
          progress.current.value = self.progress;
          sync();
        },
      });
      progress.current.value = st.progress;
      sync();
    },
    { scope: root, dependencies: [paint, ready], revertOnUpdate: true },
  );

  return (
    <div ref={root} className={`relative aspect-[4/5] overflow-hidden border border-line bg-surface ${className}`}>
      <Image
        ref={img}
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        className="object-cover"
        // com JS e WebGL a pintura controla a visibilidade (ver sync)
        style={paint ? { opacity: 0 } : undefined}
      />
      {paint && (
        <div ref={canvasLayer} className="absolute inset-0" style={{ opacity: 0 }}>
          <ResilientBoundary name="retrato" onGiveUp={handleGiveUp}>
            {(onLost) =>
              near && <PaintCanvas imgRef={img} progressRef={progress} onReady={handleReady} onLost={onLost} />
            }
          </ResilientBoundary>
        </div>
      )}
    </div>
  );
}

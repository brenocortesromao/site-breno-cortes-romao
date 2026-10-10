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
 * Retrato da Mensagem com entrada de "construção digital", ligada ao scroll
 * (WebGL2, sem bibliotecas):
 *  1. a foto surge como blocos grandes de pixels em tons de grafite, e os
 *     blocos diminuem até a resolução total (64 px → 1 px);
 *  2. no caminho, 3 glitches rápidos (< 120 ms cada, por tempo e não por
 *     scroll): faixas horizontais deslocadas e leve separação RGB;
 *  3. por fim, uma linha de luz prata desce de cima a baixo revelando a foto
 *     colorida e nítida.
 * O ESTADO FINAL É A IMAGEM REAL: ao completar, o canvas é desmontado e fica o
 * next/image (quality 90, srcset do original de 2400 px, então serve retina e
 * 4K). Ele também é o conteúdo sem JS e com prefers-reduced-motion.
 * O canvas usa devicePixelRatio (até 2) e textura de 1600 px (arquivo próprio,
 * não a versão reduzida que a <img> carregou).
 * Completa com o topo do retrato a 45% da tela (menos de meia tela de scroll),
 * antes de a assinatura começar a ser desenhada.
 */

/** Textura do canvas: versão de 1600 px (nítida até DPR 2 no tamanho do retrato). */
const textureSrc = (src: string) => src.replace(/(\.\w+)$/, "-1600$1");
/** Progresso em que cada glitch dispara (ao cruzar, em qualquer sentido). */
const GLITCHES = [0.24, 0.4, 0.54];
const GLITCH_MS = 100;

const VERT = /* glsl */ `#version 300 es
in vec2 aPos;
out vec2 vUv;
void main() { vUv = aPos * 0.5 + 0.5; gl_Position = vec4(aPos, 0.0, 1.0); }`;

const FRAG = /* glsl */ `#version 300 es
precision highp float;
uniform sampler2D uTex;
uniform vec2 uRes;
uniform float uDpr;
uniform float uImgAspect;
uniform float uP;
uniform float uGlitch;
uniform float uSeed;
in vec2 vUv;
out vec4 outColor;

float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float lum(vec3 c){ return dot(c, vec3(0.299, 0.587, 0.114)); }
// tons de grafite (escuro) a prata (claro)
vec3 graphite(float l){ return mix(vec3(0.07, 0.075, 0.085), vec3(0.8, 0.82, 0.85), smoothstep(0.02, 0.95, l)); }
// object-cover: recorta a imagem para preencher o quadro
vec2 coverUv(vec2 uv){
  float ca = uRes.x / uRes.y;
  vec2 s = ca > uImgAspect ? vec2(1.0, uImgAspect / ca) : vec2(ca / uImgAspect, 1.0);
  return (uv - 0.5) * s + 0.5;
}

void main(){
  vec2 uv = vUv;
  // glitch: algumas faixas horizontais deslocadas
  if (uGlitch > 0.0) {
    float band = floor(uv.y * 22.0 + uSeed * 13.0);
    if (hash(vec2(band, uSeed)) > 0.55) uv.x += (hash(vec2(band, uSeed + 3.0)) - 0.5) * 0.12 * uGlitch;
  }

  // 1. pixelização: bloco de 64 px até 1 px (em px de CSS), exponencial
  float pBuild = clamp(uP / 0.62, 0.0, 1.0);
  float block = exp2(6.0 * (1.0 - pBuild)) * uDpr;
  vec2 px = uv * uRes;
  vec2 cell = (floor(px / block) + 0.5) * block / uRes;
  // os blocos grandes "surgem" um a um no começo
  float appear = step(hash(floor(px / (64.0 * uDpr))), uP / 0.12);

  vec3 c = texture(uTex, coverUv(cell)).rgb;
  vec3 g = graphite(lum(c));
  if (uGlitch > 0.0) {
    // separação RGB leve
    float o = 0.008 * uGlitch;
    g.r = graphite(lum(texture(uTex, coverUv(cell + vec2(o, 0.0))).rgb)).r;
    g.b = graphite(lum(texture(uTex, coverUv(cell - vec2(o, 0.0))).rgb)).b;
  }

  // 3. linha de luz prata descendo: acima dela, a foto colorida e nítida
  float pScan = clamp((uP - 0.62) / 0.38, 0.0, 1.0);
  float yTop = 1.0 - vUv.y;
  float line = pScan * 1.06 - 0.03;
  vec3 photo = texture(uTex, coverUv(vUv)).rgb;
  vec3 col = mix(g, photo, step(yTop, line));
  float d = (yTop - line) * uRes.y / uDpr; // distância em px de CSS
  float glow = exp(-d * d / 2.0) + 0.3 * exp(-d * d / 160.0);
  col += vec3(0.86, 0.88, 0.92) * glow * step(0.0001, pScan) * (1.0 - step(0.9999, pScan));

  float alpha = max(appear, step(0.12, uP));
  outColor = vec4(col * alpha, alpha); // alfa pré-multiplicado
}`;

function compile(gl: WebGL2RenderingContext, type: number, src: string) {
  const s = gl.createShader(type)!;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? "shader");
  return s;
}

type Shared = { value: number; draw?: () => void; glitch?: () => void };

/** Canvas da construção: desenha quando o progresso muda e durante os glitches. */
function RevealCanvas({
  texture,
  progressRef,
  onReady,
  onLost,
}: {
  texture: HTMLImageElement;
  progressRef: RefObject<Shared>;
  onReady: () => void;
  onLost: () => void;
}) {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const box = host.current;
    if (!box) return;
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
    const U = {
      res: u("uRes"),
      dpr: u("uDpr"),
      aspect: u("uImgAspect"),
      p: u("uP"),
      glitch: u("uGlitch"),
      seed: u("uSeed"),
    };

    // textura em resolução cheia, com mipmaps (blocos grandes sem cintilar)
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

    let glitchUntil = 0;
    let seed = 0;
    let raf = 0;
    const draw = () => {
      const r = el.getBoundingClientRect();
      const w = Math.max(1, Math.round(r.width * dpr));
      const h = Math.max(1, Math.round(r.height * dpr));
      if (el.width !== w || el.height !== h) {
        el.width = w;
        el.height = h;
        gl.viewport(0, 0, w, h);
      }
      const left = glitchUntil - performance.now();
      gl.uniform2f(U.res, w, h);
      gl.uniform1f(U.dpr, dpr);
      gl.uniform1f(U.aspect, imgAspect);
      gl.uniform1f(U.p, progressRef.current.value);
      gl.uniform1f(U.glitch, left > 0 ? Math.min(1, left / (GLITCH_MS * 0.6)) : 0);
      gl.uniform1f(U.seed, seed);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };
    // glitch: animado por tempo (~100 ms), independente da velocidade do scroll
    const glitch = () => {
      seed = Math.random() * 100;
      glitchUntil = performance.now() + GLITCH_MS;
      cancelAnimationFrame(raf);
      const loop = () => {
        draw();
        if (performance.now() < glitchUntil) raf = requestAnimationFrame(loop);
        else draw();
      };
      raf = requestAnimationFrame(loop);
    };

    const shared = progressRef.current;
    shared.draw = draw;
    shared.glitch = glitch;
    const ro = new ResizeObserver(draw);
    ro.observe(el);
    draw();
    onReady();

    return () => {
      cancelAnimationFrame(raf);
      shared.draw = undefined;
      shared.glitch = undefined;
      ro.disconnect();
      el.removeEventListener("webglcontextlost", handleLost);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
      el.remove();
    };
  }, [texture, progressRef, onReady, onLost]);

  return <div ref={host} aria-hidden="true" className="absolute inset-0" />;
}

export default function PortraitReveal({
  src,
  alt,
  sizes,
  onDoneChange,
  className = "",
}: {
  src: string;
  alt: string;
  sizes?: string;
  /** Avisa quando a entrada termina (ou não existe: reduced motion / sem WebGL). */
  onDoneChange?: (done: boolean) => void;
  className?: string;
}) {
  const root = useRef<HTMLDivElement>(null);
  const img = useRef<HTMLImageElement>(null);
  const canvasLayer = useRef<HTMLDivElement>(null);
  const progress = useRef<Shared>({ value: 0 });
  const near = useNearViewport(root);
  /** Construção ativa (JS + WebGL2 + sem reduced motion). */
  const [build, setBuild] = useState(false);
  /** Imagem da textura (1600 px), carregada uma vez. */
  const [texture, setTexture] = useState<HTMLImageElement | null>(null);
  /** p = 1: canvas desmontado, fica só a <img> real. */
  const [done, setDone] = useState(false);
  const [ready, setReady] = useState(false);
  const handleReady = useCallback(() => setReady(true), []);
  const handleGiveUp = useCallback(() => setBuild(false), []);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced || !webglSupport().webgl2) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- leitura única de capacidades do navegador
    setBuild(true);
    const t = new window.Image();
    t.decoding = "async";
    t.src = textureSrc(src);
    t.decode().then(
      () => setTexture(t),
      () => setBuild(false), // sem textura: fica a foto real, sem animação
    );
  }, [src]);

  // <img> real escondida enquanto a construção não termina; canvas por cima
  const sync = () => {
    const p = progress.current.value;
    if (img.current) img.current.style.opacity = !build || p >= 1 ? "1" : "0";
    if (canvasLayer.current) canvasLayer.current.style.opacity = ready && p < 1 ? "1" : "0";
    progress.current.draw?.();
  };

  useGSAP(
    () => {
      if (!build) return;
      let prev = 0;
      const st = ScrollTrigger.create({
        trigger: root.current,
        start: "top 98%",
        end: "top 45%",
        scrub: 0.3,
        onUpdate: (self) => {
          const p = self.progress;
          if (GLITCHES.some((g) => (prev - g) * (p - g) < 0)) progress.current.glitch?.();
          prev = p;
          progress.current.value = p;
          setDone(p >= 1);
          sync();
        },
      });
      progress.current.value = prev = st.progress;
      setDone(st.progress >= 1);
      sync();
    },
    { scope: root, dependencies: [build, ready], revertOnUpdate: true },
  );

  const showCanvas = build && texture && near && !done;
  const complete = !build || done;
  useEffect(() => onDoneChange?.(complete), [complete, onDoneChange]);

  return (
    <div ref={root} className={`relative aspect-[4/5] overflow-hidden border border-line bg-surface ${className}`}>
      <Image
        ref={img}
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        quality={90}
        className="object-cover"
        // com a construção ativa, o sync controla a visibilidade
        style={build ? { opacity: 0 } : undefined}
      />
      {build && (
        <div ref={canvasLayer} className="absolute inset-0" style={{ opacity: 0 }}>
          <ResilientBoundary name="retrato" onGiveUp={handleGiveUp}>
            {(onLost) =>
              showCanvas && (
                <RevealCanvas texture={texture} progressRef={progress} onReady={handleReady} onLost={onLost} />
              )
            }
          </ResilientBoundary>
        </div>
      )}
    </div>
  );
}

import {
  FramebufferTexture,
  Group,
  LinearFilter,
  Mesh,
  PlaneGeometry,
  ShaderMaterial,
  Vector2,
  WebGLRenderTarget,
  type Camera,
  type Texture,
  type WebGLRenderer,
} from "three";
import { FullScreenQuad } from "three/examples/jsm/postprocessing/Pass.js";
import { warmup } from "@/lib/warmup";

/*
 * Profundidade de campo barata do close do urso (só desktop): o quadro já
 * renderizado na tela é copiado, desfocado em meia resolução (gaussiano
 * separável, 2 passadas) e misturado de volta fora da região da cabeça e dos
 * ombros (elipse em volta do foco). Trabalha sobre as cores finais da tela,
 * então a cena não muda de cor (sem EffectComposer, que reaplicaria o tone
 * mapping e a conversão de cor nos shaders próprios da água e da cachoeira).
 */

const QUAD_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

const BLUR_FRAG = /* glsl */ `
  uniform sampler2D tSrc;
  uniform vec2 uStep;
  varying vec2 vUv;
  void main() {
    vec3 c = texture2D(tSrc, vUv).rgb * 0.227027;
    c += texture2D(tSrc, vUv + uStep * 1.3846).rgb * 0.316216;
    c += texture2D(tSrc, vUv - uStep * 1.3846).rgb * 0.316216;
    c += texture2D(tSrc, vUv + uStep * 3.2308).rgb * 0.070270;
    c += texture2D(tSrc, vUv - uStep * 3.2308).rgb * 0.070270;
    gl_FragColor = vec4(c, 1.0);
  }
`;

const MIX_FRAG = /* glsl */ `
  uniform sampler2D tSharp;
  uniform sampler2D tBlur;
  uniform vec2 uFocus;
  uniform float uAspect;
  uniform float uAmount;
  varying vec2 vUv;
  void main() {
    vec3 sharp = texture2D(tSharp, vUv).rgb;
    vec3 blur = texture2D(tBlur, vUv).rgb;
    // elipse de foco (um pouco mais alta que larga): cabeça e ombros nítidos
    vec2 d = (vUv - uFocus) * vec2(uAspect, 1.0) / vec2(0.3, 0.36);
    float w = smoothstep(0.75, 1.6, length(d)) * uAmount;
    gl_FragColor = vec4(mix(sharp, blur, w), 1.0);
  }
`;

export class CloseDof {
  private size = new Vector2();
  private frame: FramebufferTexture | null = null;
  private a: WebGLRenderTarget | null = null;
  private b: WebGLRenderTarget | null = null;
  private blur = new ShaderMaterial({
    uniforms: { tSrc: { value: null as Texture | null }, uStep: { value: new Vector2() } },
    vertexShader: QUAD_VERT,
    fragmentShader: BLUR_FRAG,
    depthTest: false,
    depthWrite: false,
  });
  private mix = new ShaderMaterial({
    uniforms: {
      tSharp: { value: null as Texture | null },
      tBlur: { value: null as Texture | null },
      uFocus: { value: new Vector2() },
      uAspect: { value: 1 },
      uAmount: { value: 0 },
    },
    vertexShader: QUAD_VERT,
    fragmentShader: MIX_FRAG,
    depthTest: false,
    depthWrite: false,
  });
  private quad = new FullScreenQuad();

  private resize(gl: WebGLRenderer) {
    gl.getDrawingBufferSize(this.size);
    const { x: w, y: h } = this.size;
    if (this.frame && this.frame.image.width === w && this.frame.image.height === h) return;
    this.frame?.dispose();
    this.a?.dispose();
    this.b?.dispose();
    this.frame = new FramebufferTexture(w, h);
    const opts = { minFilter: LinearFilter, magFilter: LinearFilter, depthBuffer: false };
    this.a = new WebGLRenderTarget(Math.max(1, w >> 1), Math.max(1, h >> 1), opts);
    this.b = new WebGLRenderTarget(Math.max(1, w >> 1), Math.max(1, h >> 1), opts);
  }

  /** Compila os 2 shaders antes do close (sem compilar no meio da rolagem). */
  warm(gl: WebGLRenderer, camera: Camera) {
    const geo = new PlaneGeometry(2, 2);
    const proxy = new Group().add(new Mesh(geo, this.blur), new Mesh(geo, this.mix));
    return warmup(gl, proxy, camera).finally(() => geo.dispose());
  }

  /** Depois do render normal na tela: desfoca o fundo fora do foco. */
  apply(gl: WebGLRenderer, amount: number, focus: Vector2) {
    this.resize(gl);
    const frame = this.frame!;
    const a = this.a!;
    const b = this.b!;
    gl.copyFramebufferToTexture(frame);
    const prevTarget = gl.getRenderTarget();
    const prevAuto = gl.autoClear;
    gl.autoClear = false;
    // passada horizontal e vertical em meia resolução (raio ~ 1,5 px na meia = ~3 px na tela)
    this.quad.material = this.blur;
    this.blur.uniforms.tSrc.value = frame;
    this.blur.uniforms.uStep.value.set(1.5 / a.width, 0);
    gl.setRenderTarget(a);
    this.quad.render(gl);
    this.blur.uniforms.tSrc.value = a.texture;
    this.blur.uniforms.uStep.value.set(0, 1.5 / a.height);
    gl.setRenderTarget(b);
    this.quad.render(gl);
    // mistura na tela
    this.quad.material = this.mix;
    const u = this.mix.uniforms;
    u.tSharp.value = frame;
    u.tBlur.value = b.texture;
    u.uFocus.value.copy(focus);
    u.uAspect.value = this.size.x / this.size.y;
    u.uAmount.value = amount;
    gl.setRenderTarget(null);
    this.quad.render(gl);
    gl.setRenderTarget(prevTarget);
    gl.autoClear = prevAuto;
  }

  dispose() {
    this.frame?.dispose();
    this.a?.dispose();
    this.b?.dispose();
    this.blur.dispose();
    this.mix.dispose();
    this.quad.dispose();
  }
}

import type { Camera, Material, Object3D, Scene, Texture, WebGLRenderer } from "three";

const nextFrame = () => new Promise<void>((r) => requestAnimationFrame(() => r()));
const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * Compilação de shaders sem travar a thread principal (canvases WebGL próprios:
 * curvas líquidas, gota). No Chrome (ANGLE), sem a extensão
 * KHR_parallel_shader_compile ATIVADA ANTES de compilar, a primeira consulta
 * (getShaderParameter/getProgramParameter) e até o loseContext esperam o link
 * inteiro (medido: ~300 ms e ~130 ms num shader pesado). Com ela, o link roda em
 * segundo plano e COMPLETION_STATUS_KHR responde na hora (~0,1 ms).
 * Uso: `enableParallelCompile(gl)` logo depois do getContext; depois de
 * linkProgram, `await programReady(gl, program)` e só então LINK_STATUS.
 * (O three já ativa a extensão antes do 1º programa; ver warmup abaixo.)
 */
export function enableParallelCompile(gl: WebGL2RenderingContext) {
  return gl.getExtension("KHR_parallel_shader_compile") as { COMPLETION_STATUS_KHR: number } | null;
}

export async function programReady(gl: WebGL2RenderingContext, program: WebGLProgram) {
  const ext = enableParallelCompile(gl);
  if (!ext) return; // sem a extensão: a consulta seguinte espera, como antes
  for (let i = 0; i < 1000 && !gl.isContextLost(); i++) {
    if (gl.getProgramParameter(program, ext.COMPLETION_STATUS_KHR)) return;
    await wait(16);
  }
}

function texturesOf(material: Material, out: Set<Texture>) {
  const scan = (v: unknown) => {
    const t = v as Texture | null;
    if (t && t.isTexture && !(t as Texture & { isRenderTargetTexture?: boolean }).isRenderTargetTexture) out.add(t);
  };
  Object.values(material).forEach(scan);
  const uniforms = (material as Material & { uniforms?: Record<string, { value: unknown }> }).uniforms;
  if (uniforms) Object.values(uniforms).forEach((u) => scan(u?.value));
}

/**
 * Prepara `object` na GPU ANTES do 1º quadro em que ele aparece, para nada
 * compilar nem subir durante a rolagem:
 * - shaders compilados em segundo plano (`compileAsync`: o three ativa a
 *   KHR_parallel_shader_compile antes do 1º programa, e a espera é por consultas
 *   que não bloqueiam). Com `scene`, o objeto pode estar fora da cena (ou
 *   invisível): luzes e névoa vêm de `scene`;
 * - texturas enviadas à GPU (`initTexture`), uma por quadro (sem tarefa longa).
 * Não muda nada no visual: é o mesmo trabalho que o 1º render faria, adiantado.
 */
export async function warmup(gl: WebGLRenderer, object: Object3D, camera: Camera, scene?: Scene) {
  await gl.compileAsync(object, camera, scene ?? null).catch(() => undefined);
  const textures = new Set<Texture>();
  object.traverse((o) => {
    const m = (o as Object3D & { material?: Material | Material[] }).material;
    if (!m) return;
    (Array.isArray(m) ? m : [m]).forEach((mm) => texturesOf(mm, textures));
  });
  for (const t of textures) {
    try {
      gl.initTexture(t);
    } catch {
      /* textura ainda sem imagem: sobe no 1º uso, como antes */
    }
    await nextFrame();
  }
}

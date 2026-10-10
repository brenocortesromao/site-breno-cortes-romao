/**
 * Detecção de WebGL feita UMA vez por página. Cada sonda cria um contexto, e o
 * Chrome perde o mais antigo quando passam de 16 ativos ("Too many active
 * WebGL contexts"); por isso a sonda libera o contexto (WEBGL_lose_context) e
 * o resultado fica em cache para todos os componentes.
 * Renderizador por SOFTWARE (SwiftShader, llvmpipe, "Microsoft Basic Render"…:
 * máquinas virtuais, GPU desativada, ferramentas de laboratório) conta como sem
 * WebGL2: ali gerar o ambiente da bola levava ~0,5 s travando a página, e as
 * cenas usam os fallbacks estáticos (pôster, foto, SVG).
 */
type Support = { webgl2: boolean; webgl: boolean; renderer: string; software: boolean };
let cache: Support | null = null;

const SOFTWARE = /swiftshader|llvmpipe|softpipe|lavapipe|software|basic render|mesa offscreen/i;

function probe(type: "webgl2" | "webgl") {
  try {
    const gl = document.createElement("canvas").getContext(type) as WebGLRenderingContext | null;
    if (!gl) return null;
    const dbg = gl.getExtension("WEBGL_debug_renderer_info");
    const renderer = String(gl.getParameter(dbg ? dbg.UNMASKED_RENDERER_WEBGL : gl.RENDERER) ?? "");
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return renderer;
  } catch {
    return null;
  }
}

export function webglSupport(): Support {
  if (!cache) {
    const r2 = probe("webgl2");
    const r1 = r2 ?? probe("webgl");
    const renderer = r1 ?? "";
    const software = SOFTWARE.test(renderer);
    cache = { webgl2: r2 !== null && !software, webgl: r1 !== null && !software, renderer, software };
  }
  return cache;
}

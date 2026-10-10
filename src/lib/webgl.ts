/**
 * Detecção de WebGL feita UMA vez por página. Cada sonda cria um contexto, e o
 * Chrome perde o mais antigo quando passam de 16 ativos ("Too many active
 * WebGL contexts"); por isso a sonda libera o contexto (WEBGL_lose_context) e
 * o resultado fica em cache para todos os componentes.
 */
let cache: { webgl2: boolean; webgl: boolean } | null = null;

function probe(type: "webgl2" | "webgl") {
  try {
    const gl = document.createElement("canvas").getContext(type) as WebGLRenderingContext | null;
    if (!gl) return false;
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return true;
  } catch {
    return false;
  }
}

export function webglSupport() {
  if (!cache) {
    const webgl2 = probe("webgl2");
    cache = { webgl2, webgl: webgl2 || probe("webgl") };
  }
  return cache;
}

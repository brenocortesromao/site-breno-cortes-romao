import manifest from "@/content/posters.json";

/**
 * Pôsteres das cenas 3D de fundo no celular: o PRIMEIRO QUADRO que cada cena
 * desenha (mesma câmera, enquadramento, luz, cor e corte), gerado por
 * scripts/build-posters.mjs (Playwright, 412 × 915, DPR 1,25) em
 * public/posters/. Enquanto a cena carrega, o pôster fica no lugar; a troca
 * pelo 3D ao vivo é um fade (components/graphics/SceneSwap.tsx).
 * - "inicio": a cena vista de cima da seção (progresso 0, chegando rolando
 *   para baixo); "fim": vista de baixo (progresso 1, voltando para cima).
 * - Curvas líquidas: uma máscara (só a cobertura das linhas), pintada com a
 *   cor viva do tema (--graphic), ancorada no canto inferior esquerdo, como o
 *   shader (o desenho é em px de CSS a partir de baixo).
 */
export type ScenePoster = { inicio: string; fim: string };
export type MaskPoster = { mask: string; w: number; h: number };
type Manifest = Record<string, ScenePoster | MaskPoster>;

const posters = manifest as Manifest;

export function scenePoster(name: string): ScenePoster | null {
  const p = posters[name];
  return p && "inicio" in p ? p : null;
}

export function maskPoster(name: string): MaskPoster | null {
  const p = posters[name];
  return p && "mask" in p ? p : null;
}

// ---------------------------------------------------------------- captura
/**
 * Modo de captura (só para o script): `?poster=<cena>` na URL. Só essa cena
 * concorre à vaga de contexto WebGL (lib/quality), o canvas guarda o quadro
 * (preserveDrawingBuffer) e, depois do 1º quadro, a cena para e publica a
 * imagem em `window.__poster` (data URL). Curvas: `&pw=<largura>&ph=<altura>`
 * (px de CSS) fixam o tamanho do canvas.
 */
export type PosterCapture = { name: string; w: number; h: number };
let capture: PosterCapture | null | undefined;

export function posterCapture(): PosterCapture | null {
  if (capture !== undefined) return capture;
  if (typeof window === "undefined") return null;
  const q = new URLSearchParams(window.location.search);
  const name = q.get("poster");
  capture = name ? { name, w: Number(q.get("pw")) || 0, h: Number(q.get("ph")) || 0 } : null;
  return capture;
}

/** Captura: publica o quadro para o script. */
export function publishPoster(canvas: HTMLCanvasElement, type = "image/png") {
  (window as Window & { __poster?: string }).__poster = canvas.toDataURL(type);
}

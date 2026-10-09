// Só no servidor (usa node:fs): importe apenas de Server Components.
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Gráficos conceituais de "A distância", desenhados pelo dono em
 * public/graficos/ (SVGs com ids nomeados). São lidos no build e inseridos
 * INLINE para que os elementos internos possam ser animados.
 * - Cada SVG recebe um prefixo nos ids (ga-, gb-, gc-) porque os arquivos
 *   repetem ids (gradientes "silver", "white", "hatch"...).
 * - Gráfico C: renderiza o estado FINAL (consistencia-fim) e calcula, a partir
 *   de consistencia-inicio, a pose de partida (deslocamento + ângulo) de cada
 *   #ponto-N para o GSAP animar do início ao fim.
 * Para trocar um gráfico, basta substituir o arquivo (mantendo os ids).
 */

export type PointStart = { id: string; dx: number; dy: number; angle: number; cx: number; cy: number };
export type DistanceCharts = { a: string; b: string; c: string; cStart: PointStart[] };

const dir = join(process.cwd(), "public", "graficos");
const read = (file: string) => readFileSync(join(dir, file), "utf8");

/** Remove metadados/declarações e prefixa ids e referências (url(#), aria-labelledby). */
function inline(svg: string, prefix: string): string {
  let s = svg
    .replace(/<\?xml[\s\S]*?\?>/g, "")
    .replace(/<metadata>[\s\S]*?<\/metadata>/g, "")
    .replace(/\s+xmlns:c2pa="[^"]*"/g, "");
  s = s.replace(/\sid="([^"]+)"/g, ` id="${prefix}$1"`);
  s = s.replace(/url\(#([^)]+)\)/g, `url(#${prefix}$1)`);
  s = s.replace(/aria-labelledby="([^"]+)"/g, (_, ids: string) =>
    `aria-labelledby="${ids.split(/\s+/).map((i) => prefix + i).join(" ")}"`,
  );
  // ocupa a largura do contêiner (o viewBox mantém a proporção)
  return s.replace("<svg ", '<svg width="100%" height="auto" style="display:block;overflow:visible" ');
}

/** Centro (círculo) e ângulo (linha) de cada #ponto-N num SVG do gráfico C. */
function poses(svg: string) {
  const out = new Map<string, { cx: number; cy: number; angle: number }>();
  for (const m of svg.matchAll(/<g id="(ponto-\d+)"[\s\S]*?<\/g>/g)) {
    const block = m[0];
    const c = block.match(/<circle[^>]*cx="([\d.]+)"[^>]*cy="([\d.]+)"/);
    const l = block.match(/<line[^>]*x1="([\d.]+)"[^>]*y1="([\d.]+)"[^>]*x2="([\d.]+)"[^>]*y2="([\d.]+)"/);
    if (!c || !l) continue;
    const [x1, y1, x2, y2] = l.slice(1).map(Number);
    out.set(m[1], { cx: Number(c[1]), cy: Number(c[2]), angle: (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI });
  }
  return out;
}

export function loadDistanceCharts(): DistanceCharts {
  const start = poses(read("grafico-c-consistencia-inicio.svg"));
  const endSvg = read("grafico-c-consistencia-fim.svg");
  const end = poses(endSvg);
  const cStart: PointStart[] = [...end.entries()].map(([id, e]) => {
    const s = start.get(id) ?? e;
    return { id: `gc-${id}`, dx: s.cx - e.cx, dy: s.cy - e.cy, angle: s.angle - e.angle, cx: e.cx, cy: e.cy };
  });
  return {
    a: inline(read("grafico-a-distancia.svg"), "ga-"),
    b: inline(read("grafico-b-fechando.svg"), "gb-"),
    c: inline(endSvg, "gc-"),
    cStart,
  };
}

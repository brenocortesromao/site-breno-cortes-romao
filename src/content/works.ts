// Só no servidor (usa node:fs): importe apenas de Server Components.
import { readdirSync } from "node:fs";
import { join } from "node:path";

export type Trabalho = { src: string; project: string; year?: string };

const IMAGE = /\.(jpe?g|png|webp|avif)$/i;

/**
 * Legenda a partir do nome do arquivo:
 * "nome-do-projeto_2024.jpg" → { project: "Nome do projeto", year: "2024" }.
 * Sem "_AAAA" no fim, fica só o projeto.
 */
export function captionFromFile(file: string): { project: string; year?: string } {
  const base = file.replace(/\.[^.]+$/, "");
  const m = base.match(/^(.*)_(\d{4})$/);
  const raw = (m ? m[1] : base).replace(/[-_]+/g, " ").trim();
  return { project: raw.charAt(0).toUpperCase() + raw.slice(1), year: m?.[2] };
}

/**
 * Imagens de trabalhos, lidas de public/trabalhos/ no build: basta copiar o
 * arquivo para a pasta (jpg, png, webp ou avif), com o nome no formato
 * "nome-do-projeto_2024.jpg". Ordem: mais recentes primeiro, depois por nome.
 * Pasta vazia: lista vazia (o mural mostra placeholders).
 */
export function loadTrabalhos(): Trabalho[] {
  let files: string[];
  try {
    files = readdirSync(join(process.cwd(), "public", "trabalhos"));
  } catch {
    return [];
  }
  return files
    .filter((f) => IMAGE.test(f))
    .map((f) => ({ src: `/trabalhos/${encodeURIComponent(f)}`, ...captionFromFile(f) }))
    .sort((a, b) => (b.year ?? "").localeCompare(a.year ?? "") || a.project.localeCompare(b.project, "pt"));
}

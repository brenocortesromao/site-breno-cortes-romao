// Só no servidor (usa node:fs): importe apenas de Server Components.
import { readFileSync } from "node:fs";
import { join } from "node:path";

export type Trabalho = { src: string; width: number; height: number; brand: string };

type Entrada = { arquivo: string; largura: number; altura: number; marca: string };

/**
 * Artes do mural, lidas no build de public/trabalhos/trabalhos.json (lista,
 * ordem e dimensões; o dono mantém o arquivo). Sem o JSON: lista vazia (o
 * mural mostra placeholders).
 */
export function loadTrabalhos(): Trabalho[] {
  let list: Entrada[];
  try {
    list = JSON.parse(readFileSync(join(process.cwd(), "public", "trabalhos", "trabalhos.json"), "utf8"));
  } catch {
    return [];
  }
  return list
    .filter((e) => e.arquivo && e.largura > 0 && e.altura > 0)
    .map((e) => ({ src: e.arquivo, width: e.largura, height: e.altura, brand: e.marca }));
}

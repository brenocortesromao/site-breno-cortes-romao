// Só no servidor (usa node:fs): importe apenas de Server Components.
import { readFileSync } from "node:fs";
import { join } from "node:path";

export type SignatureData = { viewBox: string; paths: string[] };

/**
 * Assinatura de Breno Côrtes Romão, lida de public/assinatura.svg no build.
 * O arquivo é um SVG de TRAÇO (stroke, sem preenchimento) com os paths na
 * ordem em que a caneta escreve (≈ da esquerda para a direita). Para trocar a
 * assinatura, basta substituir o arquivo: viewBox e paths são extraídos daqui.
 */
export function loadSignature(): SignatureData {
  const svg = readFileSync(join(process.cwd(), "public", "assinatura.svg"), "utf8");
  const viewBox = svg.match(/viewBox="([^"]+)"/)?.[1] ?? "0 0 100 100";
  const paths = [...svg.matchAll(/<path\b[^>]*?\sd="([^"]+)"/g)].map((m) => m[1]);
  return { viewBox, paths };
}

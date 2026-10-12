// Só no servidor (usa node:fs): importe apenas de Server Components.
import { existsSync } from "node:fs";
import { join } from "node:path";

/**
 * Urso da cena do Sobre: public/modelos/urso/urso.glb ("Realistic Grizzly
 * Bear - Game Ready Asset" por 3Dima, CC BY 4.0; ver LICENSE.txt na mesma
 * pasta e o crédito no rodapé). Sem o arquivo, a cena roda sem o urso e nada
 * é pedido ao servidor.
 */
export function bearModel(): string | undefined {
  return existsSync(join(process.cwd(), "public", "modelos", "urso", "urso.glb")) ? "/modelos/urso/urso.glb" : undefined;
}

/** Links do crédito (CC BY 4.0 exige atribuição). */
export const bearCredit = {
  model: "https://sketchfab.com/3d-models/realistic-grizzly-bear-game-ready-asset-4657008bf6004ede9ff8e1f66e0df91f",
  license: "https://creativecommons.org/licenses/by/4.0/",
};

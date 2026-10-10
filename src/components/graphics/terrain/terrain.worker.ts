/**
 * Gera o terreno das montanhas fora da thread principal (mesma função de
 * heightmap.ts, mesmo resultado). Recebe a densidade `n` e devolve os
 * arrays transferidos (sem cópia).
 */
import { buildTerrain } from "./heightmap";

const ctx = self as unknown as Worker;
ctx.onmessage = (e: MessageEvent<number>) => {
  const n = e.data;
  const d = buildTerrain(n);
  ctx.postMessage({ n, d }, [d.positions.buffer, d.shadows.buffer, d.indices.buffer]);
};

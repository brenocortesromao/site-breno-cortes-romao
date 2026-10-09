import { IcosahedronGeometry, type BufferGeometry } from "three";

/**
 * Fonte da geometria do protagonista da hero.
 *
 * HOJE: forma provisória (icosfera densa) — a deformação de metal líquido do
 * material dá a ela o aspecto orgânico.
 *
 * ETAPA 3: trocar por `loadBearGeometry()` lendo o GLB do urso (GLTFLoader do
 * próprio three, com meshopt). Requisitos da malha para encaixar sem mexer na
 * cena: normais suaves, centralizada na origem e raio aproximado de
 * SHAPE_RADIUS (unidades da cena). O resto (material, luz, mouse, scroll)
 * permanece igual.
 */
export const SHAPE_RADIUS = 1.6;

export function createPlaceholderGeometry({ light }: { light: boolean }): BufferGeometry {
  // detail 40 ≈ 100 mil vértices (desktop); 16 ≈ 17 mil (mobile)
  return new IcosahedronGeometry(SHAPE_RADIUS, light ? 16 : 40);
}

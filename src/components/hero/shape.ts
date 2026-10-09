import { IcosahedronGeometry, type BufferGeometry } from "three";

/**
 * Geometria do protagonista da hero: uma icosfera densa, centrada na origem.
 *
 * DECISÃO (Etapa 4 — urso): não haverá modelo GLB. O urso nasce da própria
 * bola: orelhas e focinho são esferas extras fundidas por união suave (SDF /
 * metaballs) no vertex shader do material (ver liquidMetal.ts: uMorph,
 * uFeatureCenters, uFeatureRadii, uBlend). Por isso a malha precisa ser uma
 * esfera bem subdividida — a densidade define a nitidez das orelhas.
 */
export const SHAPE_RADIUS = 1.6;

export function createPlaceholderGeometry({ light }: { light: boolean }): BufferGeometry {
  // detail 48 ≈ 140 mil vértices (desktop); 20 ≈ 26 mil (mobile)
  return new IcosahedronGeometry(SHAPE_RADIUS, light ? 20 : 48);
}

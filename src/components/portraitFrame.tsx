/**
 * Formato "curva líquida" da moldura do retrato (Mensagem): três cantos com
 * raio pequeno (~4% da largura) e o canto inferior direito numa curva grande e
 * fluida. Coordenadas relativas (objectBoundingBox): o mesmo path recorta a
 * foto, a animação de entrada e o reflexo do cartão de vidro, e desenha a borda
 * fina. O shader do metal líquido (PortraitReveal) usa a mesma forma.
 */
export const PORTRAIT_FRAME_PATH =
  "M0.04,0 H0.96 Q1,0 1,0.032 V0.62 C1,0.86 0.86,1 0.62,1 H0.04 Q0,1 0,0.968 V0.032 Q0,0 0.04,0 Z";

const CLIP_ID = "portrait-liquid-frame";
/** Valor de `clip-path` para os elementos recortados pela moldura. */
export const PORTRAIT_FRAME_CLIP = `url(#${CLIP_ID})`;

/** <clipPath> da moldura; renderizar uma vez na página. */
export function PortraitFrameDefs() {
  return (
    <svg aria-hidden="true" width="0" height="0" className="absolute">
      <defs>
        <clipPath id={CLIP_ID} clipPathUnits="objectBoundingBox">
          <path d={PORTRAIT_FRAME_PATH} />
        </clipPath>
      </defs>
    </svg>
  );
}

/** Borda fina da moldura (por cima da foto, abaixo da assinatura). */
export function PortraitFrameOutline() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 1 1"
      preserveAspectRatio="none"
      className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
    >
      <path
        d={PORTRAIT_FRAME_PATH}
        fill="none"
        stroke="rgba(255,255,255,0.35)"
        strokeWidth="1"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

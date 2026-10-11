import type { CSSProperties } from "react";

/**
 * Formato "curva líquida" da moldura do retrato (Mensagem): três cantos com
 * raio pequeno (~4% da largura) e o canto inferior direito numa curva grande e
 * fluida. Coordenadas relativas (0 a 1): o mesmo path recorta a foto, a
 * entrada "luz de estúdio" e o reflexo do cartão de vidro, e desenha a borda
 * fina.
 */
export const PORTRAIT_FRAME_PATH =
  "M0.04,0 H0.96 Q1,0 1,0.032 V0.62 C1,0.86 0.86,1 0.62,1 H0.04 Q0,1 0,0.968 V0.032 Q0,0 0.04,0 Z";

const maskUrl = `url("data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1" preserveAspectRatio="none"><path d="${PORTRAIT_FRAME_PATH}"/></svg>`,
)}")`;

/**
 * Recorte da moldura como MÁSCARA CSS (SVG embutido, esticado ao tamanho do
 * elemento). Antes era `clip-path: url(#…)` apontando para um <clipPath> da
 * página, mas dentro do cartão com `preserve-3d` (TiltCard) o Chrome ignorava
 * a referência e a foto ficava retangular por fora da curva. A máscara
 * funciona com transformações 3D e não depende de nenhum elemento na página.
 */
export const PORTRAIT_FRAME_MASK: CSSProperties = {
  maskImage: maskUrl,
  WebkitMaskImage: maskUrl,
  maskSize: "100% 100%",
  WebkitMaskSize: "100% 100%",
  maskRepeat: "no-repeat",
  WebkitMaskRepeat: "no-repeat",
};

/** Borda fina da moldura (por cima da foto, abaixo da assinatura). */
export function PortraitFrameOutline({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      data-portrait-outline
      viewBox="0 0 1 1"
      preserveAspectRatio="none"
      className={`pointer-events-none absolute inset-0 h-full w-full overflow-visible ${className}`}
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

import { useId } from "react";
import type { SignatureData } from "@/content/signature";

/**
 * Assinatura em traço de cromo polido.
 * - Camada base: gradiente de cromo polido (grafite claro → branco → cinzas, em
 *   faixas repetidas inclinadas), SEM glow/blur. Paths com `data-signature-path`: quem anima (Manifesto) controla
 *   o stroke-dashoffset para "escrever" a assinatura.
 * - Camada de reflexo: os mesmos traços com uma faixa de luz estreita
 *   (`data-signature-shine` no gradiente); o Manifesto desloca a faixa da
 *   esquerda para a direita depois que o desenho termina.
 * A espessura está em unidades do viewBox, então escala com o tamanho na tela.
 */
/** Faixas do cromo: cores fixas (prata sobre o escuro) ou derivadas do tema. */
const METAL_FIXED = ["#6f747b", "#c4c8cd", "#ffffff", "#e6e8eb", "#8d9299", "#d9dce0", "#5f646b"];
// "theme": mesmas faixas, misturando --fg com --bg. Lê como prata no escuro e
// grafite metálico sobre o off-white (o cabeçalho passa pelas duas).
const METAL_THEME = [55, 80, 100, 90, 60, 85, 50].map(
  (pct) => `color-mix(in srgb, var(--fg) ${pct}%, var(--bg))`,
);
const METAL_OFFSETS = [0, 0.22, 0.42, 0.55, 0.72, 0.88, 1];

export default function Signature({
  data,
  label,
  tone = "fixed",
  strokeWidth = 4.6,
  className = "",
}: {
  data: SignatureData;
  label: string;
  tone?: "fixed" | "theme";
  /** Espessura em unidades do viewBox (maior em tamanhos pequenos, como no cabeçalho). */
  strokeWidth?: number;
  className?: string;
}) {
  const metal = tone === "theme" ? METAL_THEME : METAL_FIXED;
  const id = useId().replace(/:/g, "");
  const [, , vbW, vbH] = data.viewBox.split(/\s+/).map(Number);
  const width = vbW || 1000;
  const height = vbH || 300;

  return (
    <svg viewBox={data.viewBox} fill="none" role="img" aria-label={label} className={className}>
      <defs>
        {/* Cromo polido: faixas escuras e claras repetidas, inclinadas (como reflexo
            num metal curvo), de grafite claro a branco passando por cinzas.
            spreadMethod="reflect" repete as faixas ao longo de toda a assinatura. */}
        <linearGradient
          id={`sig-metal-${id}`}
          gradientUnits="userSpaceOnUse"
          x1="0"
          y1="0"
          x2={width * 0.16}
          y2={height * 0.22}
          spreadMethod="reflect"
        >
          {METAL_OFFSETS.map((offset, i) => (
            <stop key={offset} offset={offset} style={{ stopColor: metal[i] }} />
          ))}
        </linearGradient>
        {/* faixa de luz: começa fora, à esquerda; o Manifesto anima x1/x2 */}
        <linearGradient
          id={`sig-shine-${id}`}
          data-signature-shine
          gradientUnits="userSpaceOnUse"
          x1={-width * 0.3}
          y1="0"
          x2="0"
          y2="0"
        >
          <stop offset="0" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="0.5" stopColor="#ffffff" stopOpacity="0.95" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>

      <g strokeLinecap="round" strokeLinejoin="round">
        {data.paths.map((d, i) => (
          <path key={i} d={d} data-signature-path stroke={`url(#sig-metal-${id})`} strokeWidth={strokeWidth} />
        ))}
      </g>
      <g data-signature-shine-layer strokeLinecap="round" strokeLinejoin="round" opacity={0}>
        {data.paths.map((d, i) => (
          <path key={i} d={d} stroke={`url(#sig-shine-${id})`} strokeWidth={strokeWidth + 0.2} />
        ))}
      </g>
    </svg>
  );
}

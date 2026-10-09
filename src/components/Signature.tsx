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
export default function Signature({
  data,
  label,
  className = "",
}: {
  data: SignatureData;
  label: string;
  className?: string;
}) {
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
          <stop offset="0" stopColor="#6f747b" />
          <stop offset="0.22" stopColor="#c4c8cd" />
          <stop offset="0.42" stopColor="#ffffff" />
          <stop offset="0.55" stopColor="#e6e8eb" />
          <stop offset="0.72" stopColor="#8d9299" />
          <stop offset="0.88" stopColor="#d9dce0" />
          <stop offset="1" stopColor="#5f646b" />
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
          <path key={i} d={d} data-signature-path stroke={`url(#sig-metal-${id})`} strokeWidth={4.6} />
        ))}
      </g>
      <g data-signature-shine-layer strokeLinecap="round" strokeLinejoin="round" opacity={0}>
        {data.paths.map((d, i) => (
          <path key={i} d={d} stroke={`url(#sig-shine-${id})`} strokeWidth={4.8} />
        ))}
      </g>
    </svg>
  );
}

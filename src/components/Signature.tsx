import { useId } from "react";
import type { SignatureData } from "@/content/signature";

/**
 * Assinatura em traço de cromo polido.
 * - Camada base: gradiente prata (grafite claro → cinzas → branco) com brilho
 *   discreto. Paths com `data-signature-path`: quem anima (Manifesto) controla
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
  const width = Number(data.viewBox.split(/\s+/)[2]) || 1000;

  return (
    <svg viewBox={data.viewBox} fill="none" role="img" aria-label={label} className={className}>
      <defs>
        <linearGradient id={`sig-metal-${id}`} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2={width} y2="0">
          <stop offset="0" stopColor="#8e9298" />
          <stop offset="0.14" stopColor="#d6d9dd" />
          <stop offset="0.26" stopColor="#ffffff" />
          <stop offset="0.4" stopColor="#a9adb3" />
          <stop offset="0.55" stopColor="#f2f3f5" />
          <stop offset="0.7" stopColor="#9a9ea4" />
          <stop offset="0.84" stopColor="#ffffff" />
          <stop offset="1" stopColor="#b8bcc2" />
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
        <filter id={`sig-glow-${id}`} x="-5%" y="-20%" width="110%" height="140%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feColorMatrix in="blur" type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.45 0" result="soft" />
          <feMerge>
            <feMergeNode in="soft" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <g filter={`url(#sig-glow-${id})`} strokeLinecap="round" strokeLinejoin="round">
        {data.paths.map((d, i) => (
          <path key={i} d={d} data-signature-path stroke={`url(#sig-metal-${id})`} strokeWidth={3.4} />
        ))}
      </g>
      <g data-signature-shine-layer strokeLinecap="round" strokeLinejoin="round" opacity={0}>
        {data.paths.map((d, i) => (
          <path key={i} d={d} stroke={`url(#sig-shine-${id})`} strokeWidth={3.6} />
        ))}
      </g>
    </svg>
  );
}

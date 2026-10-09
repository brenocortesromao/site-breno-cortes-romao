import { useId } from "react";
import { signature } from "@/content/signature";

/**
 * Assinatura em traço prateado com leve brilho metálico. Os paths têm
 * `data-signature-path`; quem anima (Manifesto) controla o stroke-dashoffset.
 */
export default function Signature({ label, className = "" }: { label: string; className?: string }) {
  const id = useId().replace(/:/g, "");

  return (
    <svg
      viewBox={signature.viewBox}
      fill="none"
      role="img"
      aria-label={label}
      className={className}
    >
      <defs>
        <linearGradient id={`sig-metal-${id}`} x1="0" y1="0" x2="1" y2="0.4">
          <stop offset="0" stopColor="#f6f7f9" />
          <stop offset="0.35" stopColor="#c9cdd3" />
          <stop offset="0.55" stopColor="#ffffff" />
          <stop offset="0.8" stopColor="#a9adb3" />
          <stop offset="1" stopColor="#eceef1" />
        </linearGradient>
        {/* brilho discreto: o próprio traço desfocado por baixo, em baixa opacidade */}
        <filter id={`sig-glow-${id}`} x="-10%" y="-30%" width="120%" height="160%">
          <feGaussianBlur stdDeviation="1.6" result="blur" />
          <feColorMatrix in="blur" type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.55 0" result="soft" />
          <feMerge>
            <feMergeNode in="soft" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <g filter={`url(#sig-glow-${id})`}>
        {signature.paths.map((d, i) => (
          <path
            key={i}
            d={d}
            data-signature-path
            stroke={`url(#sig-metal-${id})`}
            strokeWidth={2.6}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
      </g>
    </svg>
  );
}

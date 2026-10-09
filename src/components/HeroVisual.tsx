/**
 * Poster estático da hero: uma forma orgânica de prata fosca. O viewBox é
 * recortado rente à forma, para que o tamanho do SVG = tamanho aparente da
 * forma 3D (o Hero posiciona os dois no mesmo lugar).
 * Aparece antes do WebGL carregar e é a alternativa quando ele não existe.
 */
export default function HeroVisual({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="180 205 400 400" fill="none" aria-hidden="true" className={className}>
      <defs>
        <radialGradient id="lm-body" cx="36%" cy="30%" r="78%">
          <stop offset="0" stopColor="#f4f5f7" />
          <stop offset="0.28" stopColor="#bfc2c7" />
          <stop offset="0.62" stopColor="#4a4c51" />
          <stop offset="1" stopColor="#111214" />
        </radialGradient>
        <linearGradient id="lm-rim" x1="1" y1="0.2" x2="0.2" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.55" />
          <stop offset="0.45" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>

      <path
        d="M402 236c78-3 150 44 163 122 12 74-20 150-92 179-70 28-160 22-210-36-46-53-50-139-4-197 34-43 87-66 143-68Z"
        fill="url(#lm-body)"
      />
      <path
        d="M402 236c78-3 150 44 163 122 12 74-20 150-92 179-70 28-160 22-210-36-46-53-50-139-4-197 34-43 87-66 143-68Z"
        stroke="url(#lm-rim)"
        strokeWidth="2"
      />
      {/* reflexo do softbox */}
      <ellipse
        cx="352"
        cy="318"
        rx="46"
        ry="26"
        transform="rotate(-28 352 318)"
        fill="#ffffff"
        fillOpacity="0.55"
      />
    </svg>
  );
}

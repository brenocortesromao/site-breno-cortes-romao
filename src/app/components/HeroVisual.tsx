/**
 * Elemento visual abstrato da hero: uma esfera de prata fosca cercada por
 * órbitas finas e uma elipse deslocada. Totalmente estático (SVG puro).
 */
export default function HeroVisual({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 800 800"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <defs>
        <radialGradient id="orb" cx="35%" cy="30%" r="75%">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.35" stopColor="#b9bcc1" />
          <stop offset="0.75" stopColor="#2a2b2e" />
          <stop offset="1" stopColor="#050505" />
        </radialGradient>
        <radialGradient id="glow" cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.14" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="ring" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.7" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0.03" />
        </linearGradient>
      </defs>

      <circle cx="400" cy="400" r="390" fill="url(#glow)" />

      {/* órbitas */}
      <circle cx="400" cy="400" r="330" stroke="url(#ring)" strokeWidth="1" />
      <circle cx="400" cy="400" r="270" stroke="#fff" strokeOpacity="0.08" />
      <ellipse
        cx="400"
        cy="400"
        rx="370"
        ry="120"
        transform="rotate(-24 400 400)"
        stroke="url(#ring)"
        strokeWidth="1"
      />
      <ellipse
        cx="400"
        cy="400"
        rx="370"
        ry="120"
        transform="rotate(38 400 400)"
        stroke="#fff"
        strokeOpacity="0.1"
      />

      {/* esfera */}
      <circle cx="400" cy="400" r="190" fill="url(#orb)" />
      <circle cx="400" cy="400" r="190" stroke="#fff" strokeOpacity="0.18" />

      {/* pontos de referência */}
      <circle cx="700" cy="296" r="4" fill="#fff" />
      <circle cx="118" cy="520" r="2.5" fill="#fff" fillOpacity="0.6" />
      <circle cx="400" cy="70" r="2" fill="#fff" fillOpacity="0.5" />
    </svg>
  );
}

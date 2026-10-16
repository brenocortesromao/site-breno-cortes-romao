/** Ícones de contato em contorno fino (24×24, traço 1.4, cor = currentColor). */
const base = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.4,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
} as const;

export function WhatsAppIcon({ className = "" }: { className?: string }) {
  return (
    <svg {...base} className={className}>
      {/* balão de conversa com rabicho */}
      <path d="M20.2 11.7a8.3 8.3 0 0 1-12.3 7.3L3.6 20.4l1.4-4.1a8.3 8.3 0 1 1 15.2-4.6z" />
      {/* telefone */}
      <path d="M9.1 8.2c.2-.4.5-.5.8-.5h.5c.2 0 .4.1.5.4l.7 1.6c.1.2 0 .4-.1.6l-.6.7c-.1.1-.2.3-.1.5.5.9 1.4 1.8 2.5 2.4.2.1.4.1.5-.1l.7-.8c.2-.2.4-.2.6-.1l1.6.8c.2.1.3.3.3.5v.4c0 .5-.3 1-.8 1.2-.6.3-1.6.4-3-.2-1.6-.7-3.1-2.2-3.8-3.6-.5-1-.6-1.9-.3-2.6z" />
    </svg>
  );
}

export function MailIcon({ className = "" }: { className?: string }) {
  return (
    <svg {...base} className={className}>
      <rect x="3.2" y="5.6" width="17.6" height="12.8" rx="2" />
      <path d="M3.8 7.2 12 13l8.2-5.8" />
    </svg>
  );
}

/** Controle de videogame em contorno (desenho próprio, genérico). */
export function GamepadIcon({ className = "" }: { className?: string }) {
  return (
    <svg {...base} className={className}>
      <path d="M7.4 7.4h9.2a4.6 4.6 0 0 1 4.5 3.7l.8 4.6a2.7 2.7 0 0 1-4.6 2.3l-2.2-2.6H8.9l-2.2 2.6a2.7 2.7 0 0 1-4.6-2.3l.8-4.6a4.6 4.6 0 0 1 4.5-3.7z" />
      <path d="M8 10v3.6M6.2 11.8h3.6" />
      <circle cx="15.3" cy="10.9" r=".55" />
      <circle cx="17.5" cy="12.9" r=".55" />
    </svg>
  );
}

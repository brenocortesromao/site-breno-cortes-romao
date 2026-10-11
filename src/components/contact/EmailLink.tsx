"use client";

import { useEffect, useState, type ReactNode } from "react";

// O endereço NÃO vai para o HTML nem para o payload do servidor: fica só
// neste módulo do cliente, em pedaços, e é montado depois da hidratação.
const PARTS = [["breno", "romao"], ["gmail", "com"]] as const;
const address = () => `${PARTS[0].join(".")}${String.fromCharCode(64)}${PARTS[1].join(".")}`;

/**
 * Link de e-mail protegido contra coleta automática. No HTML do servidor o
 * href aponta para a seção de contato (#contato), que é o fallback acessível
 * sem JavaScript; no cliente vira `mailto:` com o assunto pré-preenchido.
 */
export default function EmailLink({
  subject,
  label,
  className,
  children,
}: {
  subject: string;
  /** aria-label (ex.: "Enviar e-mail"). */
  label: string;
  className?: string;
  children: ReactNode;
}) {
  const [href, setHref] = useState("#contato");
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- montado só no cliente, de propósito (anti-spam)
    setHref(`mailto:${address()}?subject=${encodeURIComponent(subject)}`);
  }, [subject]);
  return (
    <a href={href} aria-label={label} className={className}>
      {children}
    </a>
  );
}

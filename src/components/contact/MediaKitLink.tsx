"use client";

import { useEffect, useState, type ReactNode } from "react";
import { contactConfig } from "@/content/contact";

/**
 * Link de download do mídia kit. No servidor o href é o da versão desktop; no cliente, telas até 767 px ou
 * dispositivos de toque (pointer: coarse) recebem a versão mobile (reavaliado quando a janela muda).
 */
export default function MediaKitLink({ className, children }: { className?: string; children: ReactNode }) {
  const { mediaKit } = contactConfig;
  const [href, setHref] = useState(mediaKit.desktop);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px), (pointer: coarse)");
    const update = () => setHref(mq.matches ? mediaKit.mobile : mediaKit.desktop);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [mediaKit]);

  return (
    <a href={href} download="Midia-Kit-Breno-Cortes-Romao.pdf" target="_blank" rel="noopener" className={className}>
      {children}
    </a>
  );
}

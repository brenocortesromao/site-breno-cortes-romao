"use client";

import { useEffect, useState } from "react";
import { WhatsAppIcon } from "./icons";

/**
 * Botão flutuante de WhatsApp, SÓ no mobile (abaixo de md): circular,
 * contorno prata, fundo escuro translúcido, no canto inferior direito.
 * Aparece depois da hero (~80% da primeira tela, o mesmo ponto em que o
 * cabeçalho enxuga) e some enquanto a seção de Contato está na tela (lá já
 * há o botão do WhatsApp), para não cobrir conteúdo importante.
 */
export default function WhatsAppFloat({ href, label }: { href: string; label: string }) {
  const [past, setPast] = useState(false);
  const [atContact, setAtContact] = useState(false);

  useEffect(() => {
    // "passou de ~80% da primeira tela": marcador invisível do topo da página
    // até 80svh, observado (ler scrollY/innerHeight a cada evento de scroll
    // forçava layout no meio da rolagem)
    const mark = document.createElement("div");
    mark.setAttribute("aria-hidden", "true");
    mark.style.cssText = "position:absolute;top:0;left:0;width:1px;height:80svh;pointer-events:none;visibility:hidden";
    document.body.prepend(mark);
    const pastIo = new IntersectionObserver(([e]) => setPast(!e.isIntersecting && e.boundingClientRect.bottom <= 0));
    pastIo.observe(mark);
    const contact = document.getElementById("contato");
    const io = contact ? new IntersectionObserver(([e]) => setAtContact(e.isIntersecting)) : null;
    if (contact) io!.observe(contact);
    return () => {
      pastIo.disconnect();
      mark.remove();
      io?.disconnect();
    };
  }, []);

  const show = past && !atContact;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      tabIndex={show ? 0 : -1}
      aria-hidden={!show}
      className={`fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] right-4 z-40 grid h-12 w-12 place-items-center rounded-full border border-silver/60 bg-background/70 text-silver backdrop-blur-md mobile:bg-background/90 mobile:backdrop-blur-none transition-[opacity,transform] duration-500 md:hidden ${
        show ? "opacity-100" : "pointer-events-none translate-y-3 opacity-0"
      }`}
    >
      <WhatsAppIcon className="h-5 w-5" />
    </a>
  );
}

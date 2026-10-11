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
    const onScroll = () => setPast(window.scrollY > window.innerHeight * 0.8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    const contact = document.getElementById("contato");
    const io = contact ? new IntersectionObserver(([e]) => setAtContact(e.isIntersecting)) : null;
    if (contact) io!.observe(contact);
    return () => {
      window.removeEventListener("scroll", onScroll);
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
      className={`fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] right-4 z-40 grid h-12 w-12 place-items-center rounded-full border border-silver/60 bg-background/70 text-silver backdrop-blur-md transition-[opacity,transform] duration-500 md:hidden ${
        show ? "opacity-100" : "pointer-events-none translate-y-3 opacity-0"
      }`}
    >
      <WhatsAppIcon className="h-5 w-5" />
    </a>
  );
}

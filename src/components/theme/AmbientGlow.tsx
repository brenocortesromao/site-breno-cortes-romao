"use client";

import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP, ScrollTrigger);

/**
 * Brilho ambiente do tema "gradiente escuro": camada fixa atrás do conteúdo
 * com dois focos grafite/prata MUITO suaves. A intensidade é a variável viva
 * --glow (0 no preto e no off-white, 1 no gradiente), interpolada pelo
 * ThemeScroll — então o brilho entra e sai junto com a transição de cor.
 * Movimento: os focos derivam devagar conforme o scroll da página (só
 * transform: barato, sem repintar o gradiente). Reduced motion: parado.
 */
export default function AmbientGlow() {
  const a = useRef<HTMLDivElement>(null);
  const b = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      ScrollTrigger.create({
        start: 0,
        end: "max",
        onUpdate: (self) => {
          const p = self.progress * Math.PI * 2;
          gsap.set(a.current, { xPercent: Math.sin(p * 1.5) * 22, yPercent: Math.cos(p) * 14 });
          gsap.set(b.current, { xPercent: Math.cos(p * 1.2) * -18, yPercent: Math.sin(p * 0.8) * 12 });
        },
      });
    });
  });

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 overflow-hidden"
      style={{ opacity: "var(--glow)" }}
    >
      <div
        ref={a}
        className="absolute left-[-25vw] top-[-30lvh] h-[110lvh] w-[90vw] rounded-full will-change-transform"
        style={{ background: "radial-gradient(closest-side, rgba(205, 209, 216, 0.11), transparent)" }}
      />
      <div
        ref={b}
        className="absolute bottom-[-35lvh] right-[-20vw] h-[100lvh] w-[80vw] rounded-full will-change-transform"
        style={{ background: "radial-gradient(closest-side, rgba(150, 155, 163, 0.09), transparent)" }}
      />
    </div>
  );
}

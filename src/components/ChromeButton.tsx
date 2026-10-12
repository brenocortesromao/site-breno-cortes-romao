"use client";

import { useRef, type ReactNode } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

/**
 * Link-botão com brilho cromado: uma faixa diagonal de luz atravessa o botão a
 * cada ~4 s; no hover o brilho passa na hora e a seta (filho com
 * data-arrow) desliza 3px para cima e para a direita. Pausa fora da tela.
 * prefers-reduced-motion: sem brilho.
 */
export default function ChromeButton({
  href,
  label,
  className = "",
  children,
}: {
  href: string;
  /** aria-label do link. */
  label: string;
  className?: string;
  children: ReactNode;
}) {
  const root = useRef<HTMLAnchorElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const a = root.current!;
        const band = a.querySelector<HTMLElement>("[data-shine]");
        if (!band) return;
        const pass = () => gsap.fromTo(band, { xPercent: -160 }, { xPercent: 260, duration: 0.85, ease: "power2.inOut", overwrite: true });
        const tl = gsap.timeline({ repeat: -1, repeatDelay: 3.15, paused: true });
        tl.add(pass());
        const onEnter = () => pass();
        a.addEventListener("mouseenter", onEnter);
        const io = new IntersectionObserver(([e]) => (e.isIntersecting ? tl.resume() : tl.pause()));
        io.observe(a);
        return () => {
          io.disconnect();
          a.removeEventListener("mouseenter", onEnter);
          tl.kill();
        };
      });
    },
    { scope: root },
  );

  return (
    <a ref={root} href={href} target="_blank" rel="noopener noreferrer" aria-label={label} className={`group relative overflow-hidden ${className}`}>
      {/* faixa de luz cromada (decorativa) */}
      <span aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <span
          data-shine
          className="absolute inset-y-[-40%] left-0 w-[34%] -translate-x-[160%] skew-x-[-20deg] bg-[linear-gradient(90deg,transparent,rgba(154,157,162,0.35)_30%,rgba(255,255,255,0.95)_50%,rgba(154,157,162,0.35)_70%,transparent)] motion-reduce:hidden"
        />
      </span>
      <span className="relative inline-flex items-center gap-6">{children}</span>
    </a>
  );
}

"use client";

import { useRef, type ReactNode } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { Link } from "@/i18n/navigation";
import Signature from "@/components/Signature";
import type { SignatureData } from "@/content/signature";

gsap.registerPlugin(useGSAP, ScrollTrigger);

/**
 * Identidade no cabeçalho (link para a home):
 * - assinatura pequena em cromo (tom do tema), escrita sozinha em ~1 s no
 *   carregamento, traço a traço (mesma técnica de stroke da Mensagem);
 * - ao lado, o nome em Archivo Expanded (exceção tipográfica permitida só
 *   aqui e em assinaturas de marca) e a função em Geist Mono.
 * Depois da hero, o cabeçalho enxuga: nome e função somem em fade e fica só a
 * assinatura; voltando ao topo, eles reaparecem. No mobile, só a assinatura.
 * prefers-reduced-motion: assinatura já desenhada, sem animação.
 */
export default function HeaderBrand({
  signature,
  name,
  role,
  homeLabel,
  signatureLabel,
}: {
  signature: SignatureData;
  name: string;
  role: ReactNode;
  homeLabel: string;
  signatureLabel: string;
}) {
  const root = useRef<HTMLAnchorElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        // escrita em ~1 s: cada traço com duração proporcional ao comprimento;
        // invisível até começar (a ponta redonda deixaria um ponto solto)
        const paths = gsap.utils.toArray<SVGPathElement>("[data-signature-path]");
        const lengths = paths.map((p) => p.getTotalLength());
        const total = lengths.reduce((a, b) => a + b, 0) || 1;
        const tl = gsap.timeline({ delay: 0.35 });
        paths.forEach((path, i) => {
          gsap.set(path, { strokeDasharray: lengths[i], strokeDashoffset: lengths[i], opacity: 0 });
          tl.set(path, { opacity: 1 }).to(path, { strokeDashoffset: 0, ease: "none", duration: (lengths[i] / total) * 1 });
        });

        // enxuga depois da hero (~80% da primeira tela) e volta no topo
        const text = root.current?.querySelector("[data-brand-text]");
        ScrollTrigger.create({
          start: () => window.innerHeight * 0.8,
          onEnter: () => gsap.to(text ?? {}, { autoAlpha: 0, x: -8, duration: 0.45, ease: "power2.out" }),
          onLeaveBack: () => gsap.to(text ?? {}, { autoAlpha: 1, x: 0, duration: 0.5, ease: "power2.out" }),
        });
      });
      // com reduced motion o cabeçalho também enxuga, só que sem transição
      mm.add("(prefers-reduced-motion: reduce)", () => {
        const text = root.current?.querySelector("[data-brand-text]");
        ScrollTrigger.create({
          start: () => window.innerHeight * 0.8,
          onEnter: () => gsap.set(text ?? {}, { autoAlpha: 0 }),
          onLeaveBack: () => gsap.set(text ?? {}, { autoAlpha: 1 }),
        });
      });
    },
    { scope: root },
  );

  return (
    <Link
      ref={root}
      href="/"
      aria-label={homeLabel}
      className="flex min-w-0 items-center gap-4 leading-tight lg:max-xl:flex-col lg:max-xl:items-start lg:max-xl:gap-2"
    >
      <Signature
        data={signature}
        label={signatureLabel}
        tone="theme"
        strokeWidth={7}
        className="h-auto w-[112px] shrink-0 md:w-[136px]"
      />
      {/* nome + função em todo o desktop e no tablet (no mobile, só a
          assinatura). Larguras com o menu de 7 links:
          - a partir de 1440: ao lado da assinatura, função numa linha;
          - 1280 a 1439: ao lado, função em 2 linhas (quebra depois do "&");
          - 1024 a 1279: não há espaço ao lado; nome e função ficam ABAIXO da
            assinatura, um pouco menores.
          Não use "lg:hidden" + "min-[…]:block" aqui: no Tailwind 4 a ordem das
          variantes fazia o lg:hidden vencer e o nome sumia em todo desktop. */}
      <span data-brand-text className="hidden min-w-0 md:block">
        <span
          translate="no"
          className="block font-brand text-[11px] font-semibold uppercase tracking-[0.18em] text-[#e6e7e9] [font-stretch:125%] lg:max-xl:text-[10px]"
        >
          {name}
        </span>
        <span className="mt-1.5 block font-mono text-[10px] uppercase tracking-[0.22em] text-silver lg:max-[1439px]:max-w-[12rem] lg:max-xl:text-[9px]">
          {role}
        </span>
      </span>
    </Link>
  );
}

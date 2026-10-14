"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";

/**
 * Formação: fileira discreta com os logos das escolas, logo abaixo do retrato do Sobre. Entrada suave (fade e leve
 * subida) uma vez, ao aparecer; com prefers-reduced-motion, já visível.
 */
export default function AboutEducation({ label, schools }: { label: string; schools: { arquivo: string; nome: string }[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- leitura única de capacidades do navegador
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.2 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`mt-8 transition-[opacity,transform] duration-[900ms] ease-out motion-reduce:transition-none max-md:text-center ${
        shown ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
      }`}
    >
      <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-silver">{label}</p>
      <ul className="mt-4 flex flex-wrap items-center gap-x-1 gap-y-1 max-md:justify-center">
        {schools.map((s) => (
          <li key={s.arquivo}>
            <Image src={s.arquivo} alt={s.nome} width={480} height={200} className="h-9 w-auto opacity-70 md:h-11" />
          </li>
        ))}
      </ul>
    </div>
  );
}

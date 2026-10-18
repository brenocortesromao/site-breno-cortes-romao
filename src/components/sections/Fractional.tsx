"use client";

import GraphicLayer from "@/components/graphics/GraphicLayer";
import { protectTerms } from "@/components/Term";
import FractionalModel, { type FractionalModelCopy } from "./FractionalModel";

export type FractionalCopy = {
  badge: string;
  title: string;
  /** Final do título, em cinza prata. */
  titleMuted: string;
  /** Parte escura logo abaixo ("O modelo fractional"). */
  model: FractionalModelCopy;
  note: string;
};

/**
 * "O que é fractional", em duas partes:
 * - CLARA (off-white, curvas de nível): selo com ponto que pisca e título leve
 *   com final em prata; depois dele, só o respiro (160px no desktop, 96px no
 *   celular) até a troca suave para a parte escura;
 * - ESCURA logo abaixo (FractionalModel): esfera de partículas e 6 caixas.
 */
export default function Fractional({ copy }: { copy: FractionalCopy }) {
  return (
    <>
      <section id="fractional" data-theme="light" aria-labelledby="fractional-title" className="relative z-10 overflow-hidden">
        {/* as curvas somem embaixo e as da parte escura surgem em cima: sem emenda reta */}
        <GraphicLayer variant="contours-a" className="fx-fade-b" />
        <div className="m-sec-t relative mx-auto w-full max-w-[1600px] px-6 pb-24 pt-[clamp(6rem,16lvh,12rem)] md:px-12 md:pb-40">
          <p className="m-center flex w-fit max-w-full items-start gap-2.5 rounded-3xl border border-line bg-white/60 px-4 py-2 font-mono text-[11px] uppercase leading-snug tracking-[0.14em] text-foreground sm:items-center sm:rounded-full">
            <span aria-hidden="true" className="fractional-dot css-loop mt-[0.35em] h-1.5 w-1.5 shrink-0 rounded-full bg-foreground sm:mt-0" />
            <span className="min-w-0 break-words">{protectTerms(copy.badge)}</span>
          </p>

          <h2
            id="fractional-title"
            className="m-center mt-8 max-w-[22ch] text-[clamp(2.3rem,5vw,5.5rem)] font-light leading-[1.02] tracking-[-0.055em] md:mt-10"
          >
            {protectTerms(copy.title)} <span className="text-silver">{copy.titleMuted}</span>
          </h2>
        </div>
      </section>

      <FractionalModel copy={copy.model} note={copy.note} />
    </>
  );
}

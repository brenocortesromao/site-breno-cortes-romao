"use client";

import { Fragment, useRef, type ReactNode } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { shine } from "@/components/decode";
import { protectTerms } from "@/components/Term";

gsap.registerPlugin(useGSAP, ScrollTrigger);

export type AboutStoryCopy = {
  eyebrow: string;
  title: string;
  subtitle: string;
  opening: string;
  paragraphs: string[];
  closing: string;
  timelineTitle: string;
  trajectory: string[];
  reference: string;
};

/**
 * Bio do Sobre (§11): frase de abertura em destaque, 3 parágrafos, fecho com
 * reflexo prata (uma vez, ao entrar na tela) e a trajetória em Geist Mono, que
 * acende em sequência com o scroll (último item em prata). As marcas aparecem
 * só em texto, na linha de referência.
 * Sem JS / prefers-reduced-motion: tudo estático e aceso.
 */
export default function AboutStory({
  copy,
  page,
  children,
}: {
  copy: AboutStoryCopy;
  /** /sobre: título como h1 (e a trajetória como h2). */
  page: boolean;
  /** Link no fim (/sobre: de volta ao início). Sem ele, a seção termina na referência. */
  children?: ReactNode;
}) {
  const root = useRef<HTMLDivElement>(null);
  const closing = useRef<HTMLParagraphElement>(null);
  const Title = page ? "h1" : "h2";
  const Heading = page ? "h2" : "h3";
  const last = copy.trajectory.length - 1;

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        ScrollTrigger.create({
          trigger: closing.current,
          start: "top 70%",
          once: true,
          onEnter: () => closing.current && shine(closing.current),
        });

        // trajetória: cada etapa acende (grafite → aceso) em sequência, por scrub,
        // e o traço até a próxima se desenha
        const tl = gsap.timeline({
          scrollTrigger: { trigger: "[data-trajectory]", start: "top 85%", end: "bottom 45%", scrub: 0.6 },
        });
        gsap.utils.toArray<HTMLElement>("[data-step]").forEach((step, i) => {
          tl.fromTo(step, { opacity: 0.16 }, { opacity: 1, duration: 1, ease: "none" }, i * 0.8);
          const line = step.querySelector("[data-step-line]");
          if (line) tl.fromTo(line, { scale: 0 }, { scale: 1, duration: 0.8, ease: "none" }, i * 0.8 + 0.4);
        });
      });
    },
    { scope: root },
  );

  return (
    // "contents": os dois blocos entram direto na grade do Sobre
    <div ref={root} className="contents">
      <div className="md:col-span-6 md:col-start-7">
        <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-silver">{copy.eyebrow}</p>
        <Title
          id="sobre-title"
          className="mt-6 text-[clamp(2.3rem,5vw,5.5rem)] font-semibold leading-[0.98] tracking-[-0.055em] lg:whitespace-nowrap lg:text-[length:clamp(2.75rem,4.6vw,5rem)]"
        >
          {copy.title}
        </Title>
        <p className="mt-4 text-[clamp(1.25rem,2vw,1.9rem)] font-light leading-[1.15] tracking-[-0.03em] text-silver">
          {copy.subtitle}
        </p>

        <p className="mt-12 text-[clamp(1.6rem,2.6vw,2.5rem)] font-semibold leading-[1.1] tracking-[-0.04em]">
          {copy.opening}
        </p>

        <div className="mt-8 grid max-w-xl gap-5 text-base leading-relaxed text-silver md:text-lg">
          {copy.paragraphs.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>

        <p
          ref={closing}
          className="mt-12 max-w-2xl text-[clamp(1.6rem,2.6vw,2.5rem)] font-semibold leading-[1.1] tracking-[-0.04em]"
        >
          {copy.closing.split(" ").map((word, k) => (
            <Fragment key={k}>
              {k > 0 && " "}
              <span className="inline-block whitespace-nowrap">
                {Array.from(word).map((ch, j) => (
                  <span key={j} data-key className="text-shine-fixed inline-block">
                    {ch}
                  </span>
                ))}
              </span>
            </Fragment>
          ))}
        </p>
      </div>

      <div className="md:col-span-12">
        <div data-trajectory className="md:mt-8">
          <Heading className="font-mono text-[11px] font-normal uppercase tracking-[0.28em] text-silver">
            {copy.timelineTitle}
          </Heading>
          {/* mobile: vertical; md+: horizontal, as etapas ligadas por um traço */}
          <ol className="mt-8 grid gap-5 md:grid-cols-5 md:gap-0">
            {copy.trajectory.map((step, i) => (
              <li key={i} data-step className="relative flex items-start gap-4 md:block md:pr-6">
                <span
                  aria-hidden="true"
                  className={`relative z-10 mt-[0.3rem] block h-2 w-2 shrink-0 rounded-full md:mt-0 ${
                    i === last ? "bg-foreground shadow-[0_0_12px_rgba(230,231,233,0.7)]" : "bg-silver"
                  }`}
                />
                {i < last && (
                  <span
                    aria-hidden="true"
                    data-step-line
                    className="absolute left-[3.5px] top-[1.1rem] h-[calc(100%+0.2rem)] w-px origin-top bg-line md:left-5 md:right-3 md:top-[3.5px] md:h-px md:w-auto md:origin-left"
                  />
                )}
                <span
                  className={`block font-mono text-[11px] uppercase leading-relaxed tracking-[0.2em] md:mt-5 md:text-xs ${
                    i === last
                      ? "bg-[linear-gradient(180deg,#f4f5f6_0%,#c9cbcf_45%,#9a9da2_62%,#e6e7e9_100%)] bg-clip-text font-medium text-transparent"
                      : "text-foreground"
                  }`}
                >
                  {protectTerms(step)}
                </span>
              </li>
            ))}
          </ol>
        </div>

        <p className="mt-14 max-w-2xl font-mono text-[11px] uppercase leading-relaxed tracking-[0.2em] text-silver">
          {copy.reference}
        </p>
        {children ? <div className="mt-14">{children}</div> : null}
      </div>
    </div>
  );
}

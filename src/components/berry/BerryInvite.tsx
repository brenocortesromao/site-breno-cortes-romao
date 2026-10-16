"use client";

import { useEffect, useRef } from "react";
import { useBerry } from "./BerryProvider";
import "./BerryInvite.css";

/**
 * Convite do Berry acima da linha do rodapé: miniatura flutuando com estrelinhas
 * piscando, frase e botão em pílula. Hover (mouse): pulinho com faísca da
 * mochila. Toque: pulinho sozinho a cada 6 s enquanto a faixa está na tela.
 * prefers-reduced-motion: tudo parado (CSS e JS). A faixa e o botão abrem o jogo.
 */
const STARS = [
  { left: -10, top: 4, delay: "0s" },
  { left: 50, top: 0, delay: "0.7s" },
  { left: 58, top: 30, delay: "1.4s" },
  { left: -8, top: 38, delay: "2s" },
];

export default function BerryInvite({ text, cta, ctaLabel }: { text: string; cta: string; ctaLabel: string }) {
  const { open, warm } = useBerry();
  const strip = useRef<HTMLDivElement>(null);
  const img = useRef<HTMLImageElement>(null);
  const spark = useRef<HTMLSpanElement>(null);
  const reduced = useRef(false);

  const hop = () => {
    const i = img.current;
    const s = spark.current;
    if (!i || reduced.current) return;
    for (const el of [i, s]) {
      if (!el) continue;
      el.style.animation = "none";
      void el.offsetWidth;
    }
    i.style.animation = "";
    i.classList.add("bi-hopping");
    if (s) {
      s.style.animation = "";
      s.dataset.on = "true";
    }
  };

  useEffect(() => {
    reduced.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const el = strip.current;
    if (!el || reduced.current || !window.matchMedia("(hover: none)").matches) return;
    let id = 0;
    const io = new IntersectionObserver(([e]) => {
      window.clearInterval(id);
      if (e.isIntersecting) id = window.setInterval(hop, 6000);
    });
    io.observe(el);
    return () => {
      io.disconnect();
      window.clearInterval(id);
    };
  }, []);

  return (
    <div
      ref={strip}
      data-cursor="link"
      onClick={(e) => open(e.currentTarget.querySelector("button"))}
      onPointerEnter={(e) => {
        warm();
        if (e.pointerType === "mouse") hop();
      }}
      className="relative z-10 flex cursor-pointer flex-col items-center justify-center gap-4 px-6 py-8 text-center md:flex-row md:gap-6"
    >
      <span className={"bi-float"} aria-hidden="true">
        {STARS.map((s, i) => (
          <span key={i} className={"bi-star"} style={{ left: s.left, top: s.top, animationDelay: s.delay }} />
        ))}
        {/* eslint-disable-next-line @next/next/no-img-element -- miniatura de 48 px, carregada só perto do rodapé */}
        <img
          ref={img}
          src="/berry/berry-teaser.png"
          alt=""
          width={44}
          height={48}
          loading="lazy"
          decoding="async"
          className={"bi-hop"}
          onAnimationEnd={(e) => e.currentTarget.classList.remove("bi-hopping")}
        />
        <span ref={spark} className={"bi-spark"} onAnimationEnd={(e) => delete e.currentTarget.dataset.on} />
      </span>
      <p className="m-0 text-balance text-[15px] text-foreground/85 md:text-base">{text}</p>
      <button
        type="button"
        aria-label={ctaLabel}
        onClick={(e) => {
          e.stopPropagation();
          open(e.currentTarget);
        }}
        onFocus={warm}
        className="rounded-full border border-silver/60 px-5 py-2.5 font-mono text-[11px] uppercase tracking-[0.22em] text-foreground transition-[border-color,box-shadow] duration-300 hover:border-foreground hover:shadow-[0_0_14px_color-mix(in_srgb,var(--fg)_25%,transparent)] focus-visible:border-foreground"
      >
        {cta}
      </button>
    </div>
  );
}

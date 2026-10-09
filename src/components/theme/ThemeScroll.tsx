"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { THEME_ROLES, TEXT_ROLES, type ThemeName } from "./themes";

gsap.registerPlugin(ScrollTrigger);

/** Texto troca numa janela de ~16% no meio da transição: nunca fica cinza sobre cinza por muito tempo. */
const textEase = (t: number) => Math.min(Math.max((t - 0.42) / 0.16, 0), 1);

function palette(theme: ThemeName) {
  const cs = getComputedStyle(document.documentElement);
  return Object.fromEntries(
    THEME_ROLES.map((role) => [role, cs.getPropertyValue(`--${theme}-${role}`).trim()]),
  ) as Record<(typeof THEME_ROLES)[number], string>;
}

/**
 * Controlador único das cores por seção. Para cada seção com `data-theme`
 * diferente do tema da seção anterior, cria uma transição presa ao scroll:
 * as variáveis vivas do <html> (--bg, --fg, ...) vão da paleta anterior para
 * a nova enquanto a seção entra (top 70% → top 20%); a volta acontece quando a
 * seção seguinte (de outro tema) entra do mesmo jeito.
 * Funciona igual com prefers-reduced-motion: é mudança de cor, não movimento.
 */
export default function ThemeScroll() {
  // O layout persiste entre páginas: refaz as transições a cada navegação.
  const pathname = usePathname();

  useEffect(() => {
    const root = document.documentElement;
    const sections = [...document.querySelectorAll<HTMLElement>("[data-theme]")];
    if (!sections.length) return;

    root.classList.add("theme-js");
    const ctx = gsap.context(() => {
      let previous: ThemeName = "dark";
      sections.forEach((section) => {
        const theme = section.dataset.theme as ThemeName;
        if (theme === previous) return;
        const from = palette(previous);
        const to = palette(theme);

        const fromVars = Object.fromEntries(THEME_ROLES.map((r) => [`--${r}`, from[r]]));
        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: section,
            // a cor só começa a mudar com a nova seção já bem visível (30% da tela)
            // e termina quando ela ocupa 80% — a seção anterior fica estável mais tempo
            start: "top 70%",
            end: "top 20%",
            scrub: true,
            // recalculado depois dos pins das seções (que mudam as posições)
            refreshPriority: -1,
          },
        });
        THEME_ROLES.forEach((role) => {
          tl.fromTo(
            root,
            { [`--${role}`]: fromVars[`--${role}`] },
            {
              [`--${role}`]: to[role],
              ease: TEXT_ROLES.has(role) ? textEase : "none",
              duration: 1,
              immediateRender: false,
            },
            0,
          );
        });
        previous = theme;
      });
    });

    return () => {
      ctx.revert();
      root.classList.remove("theme-js");
      THEME_ROLES.forEach((r) => root.style.removeProperty(`--${r}`));
    };
  }, [pathname]);

  return null;
}

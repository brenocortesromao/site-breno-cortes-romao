"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { THEME_ROLES, TEXT_ROLES, type ThemeName } from "./themes";

gsap.registerPlugin(ScrollTrigger);

type Role = (typeof THEME_ROLES)[number];
type Palette = Record<Role, string>;

/** Celular (mesmo corte do Tailwind max-md e do .m-center). */
const MOBILE = "(max-width: 767.98px)";

/** Texto troca numa janela de ~16% no meio da transição: nunca fica cinza sobre cinza por muito tempo. */
const textEase = (t: number) => Math.min(Math.max((t - 0.42) / 0.16, 0), 1);

function palette(theme: ThemeName): Palette {
  const cs = getComputedStyle(document.documentElement);
  return Object.fromEntries(THEME_ROLES.map((role) => [role, cs.getPropertyValue(`--${theme}-${role}`).trim()])) as Palette;
}

/**
 * Controlador único das cores por seção. Para cada seção com `data-theme`
 * diferente do tema da seção anterior, há uma transição presa ao scroll: as
 * variáveis vivas do <html> (--bg, --fg, ...) vão da paleta anterior para a
 * nova enquanto a seção entra (top 70% → top 20%); a volta acontece quando a
 * seção seguinte (de outro tema) entra do mesmo jeito.
 * Desempenho: NÃO usa um tween por variável (cada tween lia getComputedStyle
 * do <html> logo depois de outro gravar uma variável, forçando o recálculo de
 * estilo da página inteira dezenas de vezes na carga). Cada transição é só um
 * ScrollTrigger que guarda o progresso; uma função aplica a transição ativa (a
 * última já iniciada) interpolando paletas lidas uma vez. Também fica certo em
 * saltos e ao recarregar no meio da página.
 * Funciona igual com prefers-reduced-motion: é mudança de cor, não movimento.
 * Refaz tudo quando o conjunto de seções com `data-theme` muda (remontagem por
 * HMR, conteúdo que chega depois): gatilhos presos a seções que saíram da
 * página recalculavam posições erradas e as seções claras ficavam pretas.
 */
export default function ThemeScroll() {
  // O layout persiste entre páginas: refaz as transições a cada navegação.
  const pathname = usePathname();

  useEffect(() => {
    const root = document.documentElement;
    let ctx: gsap.Context | null = null;
    let current: HTMLElement[] = [];

    const teardown = () => {
      ctx?.revert();
      ctx = null;
      root.classList.remove("theme-js");
      THEME_ROLES.forEach((r) => root.style.removeProperty(`--${r}`));
    };

    const setup = () => {
      current = [...document.querySelectorAll<HTMLElement>("[data-theme]")];
      if (!current.length) return;
      root.classList.add("theme-js");
      ctx = gsap.context(() => buildTransitions(root, current));
    };

    setup();

    // celular ↔ desktop: as janelas claro/escuro são outras (ver buildTransitions)
    const mq = window.matchMedia(MOBILE);
    const onMq = () => {
      teardown();
      setup();
    };
    mq.addEventListener("change", onMq);

    // só refaz se as seções realmente mudaram (mesmos nós = nada a fazer)
    let raf = 0;
    const mo = new MutationObserver(() => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const now = [...document.querySelectorAll<HTMLElement>("[data-theme]")];
        if (now.length === current.length && now.every((el, i) => el === current[i])) return;
        teardown();
        setup();
      });
    });
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      mq.removeEventListener("change", onMq);
      mo.disconnect();
      cancelAnimationFrame(raf);
      teardown();
    };
  }, [pathname]);

  return null;
}

/** Um ScrollTrigger por troca de tema entre seções vizinhas; `apply` escreve as cores. */
function buildTransitions(root: HTMLElement, sections: HTMLElement[]) {
  const palettes = new Map<ThemeName, Palette>();
  const pal = (t: ThemeName) => {
    if (!palettes.has(t)) palettes.set(t, palette(t));
    return palettes.get(t)!;
  };

  type Transition = { p: number; mix: Record<Role, (p: number) => string> };
  const transitions: Transition[] = [];
  const base = pal("dark");
  let written = "";

  // a transição ativa é a última que já começou (progresso > 0)
  const apply = () => {
    let i = transitions.length - 1;
    while (i >= 0 && transitions[i].p <= 0) i--;
    const values = THEME_ROLES.map((role) => {
      if (i < 0) return base[role];
      const t = transitions[i];
      return t.mix[role](TEXT_ROLES.has(role) ? textEase(t.p) : t.p);
    });
    const key = values.join("|");
    if (key === written) return;
    written = key;
    THEME_ROLES.forEach((role, k) => root.style.setProperty(`--${role}`, values[k]));
  };

  const mobile = window.matchMedia(MOBILE).matches;
  let previous: ThemeName = "dark";
  sections.forEach((section, i) => {
    const theme = section.dataset.theme as ThemeName;
    if (theme === previous) return;
    const prevSection = sections[i - 1];
    const lightSwap = (theme === "light") !== (previous === "light");
    const from = pal(previous);
    const to = pal(theme);
    const mix = Object.fromEntries(
      THEME_ROLES.map((role) => {
        if (role === "glow") {
          const a = parseFloat(from[role]) || 0;
          const b = parseFloat(to[role]) || 0;
          return [role, (p: number) => String(a + (b - a) * p)];
        }
        return [role, gsap.utils.interpolate(from[role], to[role]) as (p: number) => string];
      }),
    ) as Transition["mix"];
    const t: Transition = { p: 0, mix };
    transitions.push(t);
    const sync = (self: ScrollTrigger) => {
      t.p = self.progress;
      apply();
    };
    const firstText = section.querySelector("h1, h2, h3, p, li, a, button");
    if (mobile && lightSwap && prevSection && firstText) {
      // celular, claro ↔ escuro: a troca acontece no vão entre as seções
      // (espaçador .m-theme-gap): começa com o fim da seção anterior a 70% da
      // tela e termina antes do primeiro texto da nova entrar; nenhum texto
      // novo aparece sobre o cinza do meio da transição
      ScrollTrigger.create({
        trigger: prevSection,
        start: "bottom 70%",
        endTrigger: firstText,
        end: "top bottom",
        refreshPriority: -1,
        onUpdate: sync,
        onRefresh: sync,
      });
    } else {
      ScrollTrigger.create({
        trigger: section,
        // a cor só começa a mudar com a nova seção já bem visível (30% da tela)
        // e termina quando ela ocupa 80%: a seção anterior fica estável mais tempo
        start: "top 70%",
        end: "top 20%",
        // recalculado depois dos pins das seções (que mudam as posições)
        refreshPriority: -1,
        onUpdate: sync,
        onRefresh: sync,
      });
    }
    previous = theme;
  });
  apply();
}

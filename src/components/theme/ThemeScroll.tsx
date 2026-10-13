"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { liveTheme, THEME_ROLES, TEXT_ROLES, type ThemeName } from "./themes";

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
    let disposeLive: (() => void) | null = null;
    let current: HTMLElement[] = [];

    const teardown = () => {
      ctx?.revert();
      ctx = null;
      disposeLive?.();
      disposeLive = null;
      root.classList.remove("theme-js");
      THEME_ROLES.forEach((r) => root.style.removeProperty(`--${r}`));
    };

    const setup = () => {
      current = [...document.querySelectorAll<HTMLElement>("[data-theme]")];
      if (!current.length) return;
      root.classList.add("theme-js");
      ctx = gsap.context(() => {
        disposeLive = buildTransitions(root, current);
      });
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

/** Topo na página pelo layout (soma de offsetTop): ignora os transforms das animações de entrada. */
function layoutTop(el: HTMLElement) {
  let y = 0;
  for (let e: HTMLElement | null = el; e; e = e.offsetParent as HTMLElement | null) y += e.offsetTop;
  return y;
}

/** Primeiro (mais alto) ou último (mais baixo) elemento de texto visível da seção. */
function textEdge(section: HTMLElement, edge: "first" | "last") {
  let best: HTMLElement | null = null;
  let bestY = 0;
  section.querySelectorAll<HTMLElement>("h1, h2, h3, p, li, a, button").forEach((el) => {
    if (!el.offsetHeight || el.closest("[aria-hidden='true'], .sr-only")) return;
    const y = edge === "first" ? layoutTop(el) : layoutTop(el) + el.offsetHeight;
    if (!best || (edge === "first" ? y < bestY : y > bestY)) {
      best = el;
      bestY = y;
    }
  });
  return best as HTMLElement | null;
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
  const live = liveWriter(root);

  // a transição ativa é a última que já começou (progresso > 0)
  const apply = () => {
    let i = transitions.length - 1;
    while (i >= 0 && transitions[i].p <= 0) i--;
    const values = THEME_ROLES.map((role) => {
      if (i < 0) return base[role];
      const t = transitions[i];
      return t.mix[role](TEXT_ROLES.has(role) ? textEase(t.p) : t.p);
    });
    live.write(values);
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
    const swapOnMobile = mobile && lightSwap && prevSection;
    const firstText = swapOnMobile ? textEdge(section, "first") : null;
    const lastText = swapOnMobile ? textEdge(prevSection, "last") : null;
    if (firstText && lastText) {
      // celular, claro ↔ escuro: troca curta (~10vh de scroll) no respiro entre
      // as seções, enquanto o meio do vão (entre o último texto da anterior e o
      // primeiro da nova) passa pelo meio da tela (55% → 45%)
      const mid = () => {
        const m = Math.round((layoutTop(lastText) + lastText.offsetHeight + layoutTop(firstText)) / 2 - layoutTop(section));
        return `top${m < 0 ? "-=" : "+="}${Math.abs(m)}`;
      };
      ScrollTrigger.create({
        trigger: section,
        start: () => `${mid()} 55%`,
        end: () => `${mid()} 45%`,
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
  live.commit(); // estado inicial direto no <html>
  return live.dispose;
}

/** Normaliza a cor (canais inteiros, alfa com 3 casas): variações menores que isso são imperceptíveis. */
function normalize(v: string) {
  const m = v.match(/^rgba?\(([^)]+)\)$/);
  if (!m) return /^-?[\d.]+$/.test(v) ? String(Math.round(parseFloat(v) * 1000) / 1000) : v;
  const [r, g, b, a = "1"] = m[1].split(",").map((x) => x.trim());
  return `rgba(${Math.round(+r)},${Math.round(+g)},${Math.round(+b)},${Math.round(+a * 1000) / 1000})`;
}

/** Quanto tempo sem mudança de cor até gravar no <html> (a rolagem parou). */
const COMMIT_MS = 250;

/**
 * Onde as cores "vivas" são gravadas. Gravar variáveis no <html> recalcula o
 * estilo da página INTEIRA (variável CSS é herdada: ~25-30 ms por quadro, os
 * trancos das transições de tema). Então, enquanto as cores mudam:
 * - as variáveis vão para contêineres menores: os blocos da página perto da
 *   tela (filhos do <main>, rodapé) e os elementos fixos do <body> (cabeçalho,
 *   cursor, brilho, botões flutuantes, menus em portal);
 * - o fundo do <html> e do <body> recebe a cor direto (background-color não é
 *   herdado: escrita barata);
 * - quem herda a cor do texto do <body> recebe `color: var(--fg)` no próprio
 *   contêiner (mesmo valor; o <body> só é atualizado no fim).
 * Quando as cores param de mudar por COMMIT_MS, tudo vai para o <html> (uma vez)
 * e os contêineres voltam a herdar. Os valores são exatamente os mesmos em
 * todos os quadros: só muda ONDE eles ficam. Só grava o que mudou (normalize).
 */
function liveWriter(root: HTMLElement) {
  const body = document.body;
  const main = document.querySelector("main");
  const wrapper = main?.parentElement && main.parentElement !== body ? main.parentElement : null;
  /** Blocos grandes da página (só os perto da tela recebem as cores). */
  const blocks = [
    ...(main ? [...main.children] : []),
    ...(wrapper ? [...wrapper.children].filter((c) => c !== main) : []),
  ].filter((e): e is HTMLElement => e instanceof HTMLElement);
  /** Elementos do <body> fora da página (pequenos; inclui portais abertos depois). */
  const fixed = () =>
    [...body.children].filter(
      (e): e is HTMLElement =>
        e instanceof HTMLElement && e !== wrapper && e !== main && !(e instanceof HTMLScriptElement) && e.tagName !== "NEXT-ROUTE-ANNOUNCER",
    );

  const committed = new Map<Role, string>();
  let current: string[] | null = null;
  let dirty = false;
  const painted = new Map<HTMLElement, string>(); // contêiner → valores gravados nele
  /** Contêiner herda a cor do texto do <body>? (então precisa de color: var(--fg)) */
  const inherits = new Map<HTMLElement, boolean>();
  const near = new Set<HTMLElement>();

  const inheritsColor = (el: HTMLElement) => {
    let v = inherits.get(el);
    if (v === undefined) {
      // lido ANTES da 1ª escrita no contêiner: se ele herda, a cor dele é a do
      // <body> (mesmo no meio de uma troca, os dois ainda têm o valor antigo)
      v = getComputedStyle(el).color === getComputedStyle(body).color && !/(^|\s)text-(foreground|silver|background|line|graphic|surface|\[#|white|black)/.test(el.className);
      inherits.set(el, v);
    }
    return v;
  };
  const paint = (el: HTMLElement) => {
    if (!current) return;
    const key = current.join("|");
    if (painted.get(el) === key) return;
    const inheritsFg = inheritsColor(el);
    painted.set(el, key);
    THEME_ROLES.forEach((role, k) => el.style.setProperty(`--${role}`, current![k]));
    if (inheritsFg) el.style.setProperty("color", "var(--fg)");
  };
  const unpaint = (el: HTMLElement) => {
    THEME_ROLES.forEach((role) => el.style.removeProperty(`--${role}`));
    if (inherits.get(el)) el.style.removeProperty("color");
  };

  // blocos perto da tela (meia tela de margem): só eles recebem as cores ao vivo
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        const el = e.target as HTMLElement;
        if (e.isIntersecting) {
          near.add(el);
          if (dirty) paint(el); // entrou com a página no meio de uma troca
        } else near.delete(el);
      });
    },
    { rootMargin: "50% 0px" },
  );
  blocks.forEach((b) => io.observe(b));
  // decide quem herda a cor com tudo ainda sincronizado
  [...blocks, ...fixed()].forEach(inheritsColor);

  let timer = 0;
  const commit = () => {
    window.clearTimeout(timer);
    timer = 0;
    if (!current) return;
    THEME_ROLES.forEach((role, k) => {
      if (committed.get(role) === current![k]) return;
      committed.set(role, current![k]);
      root.style.setProperty(`--${role}`, current![k]);
    });
    root.style.removeProperty("background-color");
    body.style.removeProperty("background-color");
    painted.forEach((_, el) => unpaint(el));
    painted.clear();
    dirty = false;
  };

  const write = (raw: string[]) => {
    const values = raw.map(normalize);
    if (current && values.every((v, k) => v === current![k])) return; // nada perceptível mudou
    current = values;
    liveTheme.clear();
    THEME_ROLES.forEach((role, k) => liveTheme.set(role, values[k]));
    if (!committed.size) return; // 1ª chamada: vai direto para o <html> (commit)
    dirty = true;
    const bg = values[THEME_ROLES.indexOf("bg")];
    root.style.setProperty("background-color", bg);
    body.style.setProperty("background-color", bg);
    near.forEach(paint);
    fixed().forEach(paint);
    window.clearTimeout(timer);
    timer = window.setTimeout(commit, COMMIT_MS);
  };

  const dispose = () => {
    window.clearTimeout(timer);
    io.disconnect();
    painted.forEach((_, el) => unpaint(el));
    painted.clear();
    root.style.removeProperty("background-color");
    body.style.removeProperty("background-color");
    liveTheme.clear();
  };

  return { write, commit, dispose };
}

/**
 * Temas de seção. Os valores ficam em globals.css (--{tema}-{papel}); aqui só
 * os nomes e os papéis que o ThemeScroll interpola.
 * Para escolher o tema de uma seção: data-theme="dark" | "light" | "gradient"
 * (ou <Section theme="...">).
 * - dark: preto (padrão do site);
 * - light: off-white #ECEAE5 (só 3 seções: Fractional, Como funciona, Parcerias);
 * - gradient: "gradiente escuro" — preto com brilho grafite/prata muito suave
 *   que se move com o scroll (AmbientGlow); nunca claro.
 */
export const THEMES = ["dark", "light", "gradient"] as const;
export type ThemeName = (typeof THEMES)[number];

export const THEME_ROLES = [
  "bg",
  "fg",
  "muted",
  "line",
  "graphic",
  "surface",
  "grad-from",
  "grad-to",
  // intensidade (0–1) do brilho ambiente do tema "gradient"
  "glow",
] as const;

/** Papéis de texto: trocam numa janela curta no meio da transição (contraste). */
export const TEXT_ROLES = new Set(["fg", "muted", "grad-from", "grad-to"]);

/**
 * Cores vivas atuais (papel → valor), mantidas pelo ThemeScroll. Para quem
 * precisa da cor em JS (canvas, WebGL) sem ler estilo computado: durante uma
 * troca de tema elas ficam nos contêineres, não no <html> (ver ThemeScroll).
 */
export const liveTheme = new Map<string, string>();

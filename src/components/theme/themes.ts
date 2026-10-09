/**
 * Temas de seção. Os valores ficam em globals.css (--{tema}-{papel}); aqui só
 * os nomes e os papéis que o ThemeScroll interpola.
 * Para escolher o tema de uma seção: <Section theme="light"> (ou "dark").
 */
export const THEMES = ["dark", "light", "light-warm"] as const;
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
] as const;

/** Papéis de texto: trocam numa janela curta no meio da transição (contraste). */
export const TEXT_ROLES = new Set(["fg", "muted", "grad-from", "grad-to"]);

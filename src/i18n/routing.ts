import { defineRouting } from "next-intl/routing";

/**
 * Idiomas do site. URLs sempre com prefixo (/pt, /en).
 * Na raiz "/", o proxy detecta o idioma do navegador: inglês vai para /en e
 * todo o resto para /pt. Depois de uma troca manual (seletor PT/EN), o cookie
 * do next-intl passa a ter prioridade sobre a detecção.
 */
export const routing = defineRouting({
  locales: ["pt", "en"],
  defaultLocale: "pt",
  localePrefix: "always",
  localeDetection: true,
});

export type AppLocale = (typeof routing.locales)[number];

/** Valor do atributo <html lang> e de hreflang para cada idioma. */
export const htmlLang: Record<AppLocale, string> = { pt: "pt-BR", en: "en" };

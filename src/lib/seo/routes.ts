import { htmlLang, routing } from "@/i18n/routing";

/**
 * Rotas indexáveis do site (sem o prefixo de idioma). Fonte única para o
 * sitemap.xml e para os alternates/hreflang.
 *
 * Usada por src/app/sitemap.ts (e o robots.txt aponta para ele), com o domínio
 * final em NEXT_PUBLIC_SITE_URL.
 */
export function indexablePaths(): string[] {
  return ["", "/sobre"];
}

/** Entradas por idioma, com as alternativas de cada rota (para o sitemap). */
export function sitemapEntries(baseUrl: string) {
  return indexablePaths().flatMap((path) =>
    routing.locales.map((locale) => ({
      url: `${baseUrl}/${locale}${path}`,
      alternates: {
        // mesmos códigos do hreflang das páginas (pt-BR, en, x-default)
        languages: {
          ...Object.fromEntries(routing.locales.map((l) => [htmlLang[l], `${baseUrl}/${l}${path}`])),
          "x-default": `${baseUrl}/${routing.defaultLocale}${path}`,
        },
      },
    })),
  );
}

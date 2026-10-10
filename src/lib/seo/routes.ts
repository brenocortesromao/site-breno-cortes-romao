import { routing } from "@/i18n/routing";

/**
 * Rotas indexáveis do site (sem o prefixo de idioma). Fonte única para o
 * sitemap.xml e para os alternates/hreflang.
 *
 * PREPARADO para o lançamento: criar então `src/app/sitemap.ts` (convenção de
 * metadata do Next) usando `sitemapEntries()` e `src/app/robots.ts` apontando
 * para o sitemap — com o domínio final em NEXT_PUBLIC_SITE_URL.
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
        languages: Object.fromEntries(routing.locales.map((l) => [l, `${baseUrl}/${l}${path}`])),
      },
    })),
  );
}

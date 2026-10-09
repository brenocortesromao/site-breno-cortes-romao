import type { Metadata } from "next";
import { htmlLang, routing, type AppLocale } from "@/i18n/routing";

/**
 * Metadados de uma página num idioma: título, descrição, canonical e
 * alternates/hreflang entre /pt e /en (+ x-default → /pt).
 * Use em todo `generateMetadata` (home, /sobre, /cases/[slug], ...).
 * `path` é a rota SEM o prefixo de idioma ("" para a home, "/sobre", ...).
 */
export function pageMetadata({
  locale,
  path,
  title,
  description,
}: {
  locale: AppLocale;
  path: string;
  title: string;
  description: string;
}): Metadata {
  const languages: Record<string, string> = Object.fromEntries(
    routing.locales.map((l) => [htmlLang[l], `/${l}${path}`]),
  );
  languages["x-default"] = `/${routing.defaultLocale}${path}`;

  return {
    // Definir NEXT_PUBLIC_SITE_URL no lançamento (domínio final).
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
    // home: título completo (já tem o nome); demais: "Página — Breno Côrtes Romão" (template do layout)
    title: path === "" ? { absolute: title } : title,
    description,
    alternates: { canonical: `/${locale}${path}`, languages },
    openGraph: { title, description, locale: htmlLang[locale].replace("-", "_"), type: "website" },
  };
}

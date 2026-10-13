import type { Metadata } from "next";
import { htmlLang, routing, type AppLocale } from "@/i18n/routing";

/**
 * Metadados de uma página num idioma: título, descrição, canonical e
 * alternates/hreflang entre /pt e /en (+ x-default → /pt).
 * Use em todo `generateMetadata` (home, /sobre, ...).
 * `path` é a rota SEM o prefixo de idioma ("" para a home, "/sobre", ...).
 */
export function pageMetadata({
  locale,
  path,
  title,
  description,
  siteName,
  imageAlt,
}: {
  locale: AppLocale;
  path: string;
  title: string;
  description: string;
  /** Nome do site no Open Graph (o nome completo do dono). */
  siteName?: string;
  /** Texto alternativo da imagem de compartilhamento. */
  imageAlt?: string;
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
    // imagem de compartilhamento 1200 × 630 (public/og.png, gerada por scripts/build-og.mjs)
    openGraph: {
      title,
      description,
      url: `/${locale}${path}`,
      siteName,
      locale: htmlLang[locale].replace("-", "_"),
      alternateLocale: routing.locales.filter((l) => l !== locale).map((l) => htmlLang[l].replace("-", "_")),
      type: "website",
      images: [{ url: "/og.png", width: 1200, height: 630, alt: imageAlt ?? title }],
    },
    twitter: { card: "summary_large_image", title, description, images: [{ url: "/og.png", alt: imageAlt ?? title }] },
  };
}

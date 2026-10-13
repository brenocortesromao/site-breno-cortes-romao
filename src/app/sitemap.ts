import type { MetadataRoute } from "next";
import { sitemapEntries } from "@/lib/seo/routes";
import { siteUrl } from "@/lib/seo/structured-data";

/** sitemap.xml: as rotas indexáveis nos dois idiomas, com hreflang (domínio em NEXT_PUBLIC_SITE_URL). */
export default function sitemap(): MetadataRoute.Sitemap {
  return sitemapEntries(siteUrl()).map((entry) => ({
    ...entry,
    changeFrequency: "monthly",
    priority: entry.url.endsWith("/pt") || entry.url.endsWith("/en") ? 1 : 0.7,
  }));
}

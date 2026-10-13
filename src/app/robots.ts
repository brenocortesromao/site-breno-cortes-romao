import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/seo/structured-data";

/** robots.txt: tudo indexável, com o sitemap no domínio final (NEXT_PUBLIC_SITE_URL). */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: `${siteUrl()}/sitemap.xml`,
    host: siteUrl(),
  };
}

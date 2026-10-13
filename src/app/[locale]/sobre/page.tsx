import type { Metadata } from "next";
import * as rootParams from "next/root-params";
import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { pageMetadata } from "@/lib/seo/metadata";
import About from "@/components/sections/About";
import Contact from "@/components/sections/Contact";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await rootParams.locale();
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: "about" });
  const site = await getTranslations({ locale, namespace: "site" });
  const meta = await getTranslations({ locale, namespace: "meta" });
  return pageMetadata({ locale, path: "/sobre", title: t("metaTitle"), description: t("metaDescription"), siteName: site("name"), imageAlt: meta("ogAlt") });
}

/** /sobre — trajetória completa (h1 no título do Sobre) + contato. */
export default function AboutPage() {
  return (
    <main>
      <About variant="page" />
      <Contact />
    </main>
  );
}

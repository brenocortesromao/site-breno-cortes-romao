import type { Metadata } from "next";
import * as rootParams from "next/root-params";
import { Archivo, Geist, Geist_Mono } from "next/font/google";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import "lenis/dist/lenis.css";
import "../globals.css";
import InlineScript from "@/components/InlineScript";
import SmoothScroll from "@/components/SmoothScroll";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import JsonLdScript from "@/components/seo/JsonLdScript";
import { personJsonLd, professionalServiceJsonLd, websiteJsonLd } from "@/lib/seo/structured-data";
import ThemeScroll from "@/components/theme/ThemeScroll";
import AmbientGlow from "@/components/theme/AmbientGlow";
import CustomCursor from "@/components/CustomCursor";
import QualityDebug from "@/components/QualityDebug";
import { htmlLang, routing } from "@/i18n/routing";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Exceção tipográfica: só o nome no cabeçalho (e assinaturas de marca), em
// Archivo com o eixo de largura no máximo ("Archivo Expanded"). Ver CLAUDE.md.
const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin", "latin-ext"],
  axes: ["wdth"],
});

// Os dois idiomas são gerados no build (páginas estáticas).
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await rootParams.locale();
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: "meta" });
  const name = await getTranslations({ locale, namespace: "site" });

  // Só padrões herdáveis. Canonical/hreflang ficam no generateMetadata de CADA
  // página (via pageMetadata), senão subpáginas herdariam o canonical da home.
  return {
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
    title: { default: t("title"), template: `%s | ${name("name")}` },
    description: t("description"),
  };
}

export default async function LocaleLayout({ children }: LayoutProps<"/[locale]">) {
  const locale = await rootParams.locale();
  if (!hasLocale(routing.locales, locale)) notFound();
  const site = await getTranslations({ locale, namespace: "site" });
  const meta = await getTranslations({ locale, namespace: "meta" });
  const oneOff = await getTranslations({ locale, namespace: "oneOff" });

  return (
    <html
      lang={htmlLang[locale]}
      className={`${geistSans.variable} ${geistMono.variable} ${archivo.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        {/* Rede de segurança: se a animação não assumir em 6s (JS lento ou com falha),
            o CSS que esconde o texto é removido e o título fica visível. */}
        <InlineScript html="try{history.scrollRestoration='manual'}catch(e){}var d=document.documentElement;d.classList.add('js-motion');setTimeout(function(){d.classList.remove('js-motion')},6000)" />
      </head>
      <body className="min-h-full flex flex-col">
        {/* Só o idioma vai para o cliente; os textos chegam como props, não o arquivo inteiro. */}
        {/* Dados estruturados (ver lib/seo/structured-data.ts); o FAQPage fica na seção de perguntas */}
        <JsonLdScript data={personJsonLd({ locale, name: site("name"), role: site("role"), description: meta("description") })} />
        <JsonLdScript
          data={professionalServiceJsonLd({
            locale,
            name: site("name"),
            role: site("role"),
            description: meta("description"),
            partnership: meta("partnership"),
            catalogName: meta("catalogName"),
            remote: meta("remote"),
            columns: oneOff.raw("columns") as { title: string; items: string[] }[],
          })}
        />
        <JsonLdScript data={websiteJsonLd({ locale, name: site("name"), description: meta("description") })} />
        <NextIntlClientProvider messages={null}>
          <SmoothScroll />
          <ThemeScroll />
          <AmbientGlow />
          <CustomCursor />
          {/* só com ?debug=quality na URL */}
          <QualityDebug />
          <Header />
          {/* Proteção contra scroll horizontal: overflow-x CLIP (não hidden) não
              cria contêiner de rolagem, então sticky e pins continuam valendo, e
              nada que passe da borda consegue deslocar a página para o lado. */}
          <div className="flex flex-1 flex-col overflow-x-clip">
            {children}
            <Footer />
          </div>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

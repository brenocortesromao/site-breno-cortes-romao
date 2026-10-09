import type { Metadata } from "next";
import * as rootParams from "next/root-params";
import { Geist, Geist_Mono } from "next/font/google";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import "lenis/dist/lenis.css";
import "../globals.css";
import InlineScript from "@/components/InlineScript";
import SmoothScroll from "@/components/SmoothScroll";
import Header from "@/components/layout/Header";
import ThemeScroll from "@/components/theme/ThemeScroll";
import { htmlLang, routing } from "@/i18n/routing";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Os dois idiomas são gerados no build (páginas estáticas).
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await rootParams.locale();
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: "meta" });

  return {
    // Definir NEXT_PUBLIC_SITE_URL no lançamento (domínio final).
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
    title: t("title"),
    description: t("description"),
    alternates: {
      canonical: `/${locale}`,
      languages: {
        [htmlLang.pt]: "/pt",
        [htmlLang.en]: "/en",
        "x-default": "/pt",
      },
    },
  };
}

export default async function LocaleLayout({ children }: LayoutProps<"/[locale]">) {
  const locale = await rootParams.locale();
  if (!hasLocale(routing.locales, locale)) notFound();

  return (
    <html
      lang={htmlLang[locale]}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        {/* Rede de segurança: se a animação não assumir em 6s (JS lento ou com falha),
            o CSS que esconde o texto é removido e o título fica visível. */}
        <InlineScript html="var d=document.documentElement;d.classList.add('js-motion');setTimeout(function(){d.classList.remove('js-motion')},6000)" />
      </head>
      <body className="min-h-full flex flex-col">
        {/* Só o idioma vai para o cliente; os textos chegam como props, não o arquivo inteiro. */}
        <NextIntlClientProvider messages={null}>
          <SmoothScroll />
          <ThemeScroll />
          <Header />
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

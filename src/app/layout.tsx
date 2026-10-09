import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Direção Criativa — Branding, Estratégia e Experiências Digitais",
  description:
    "Diretor criativo especializado em branding, estratégia e experiências digitais. Marcas com ponto de vista, construídas para durar.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            // Rede de segurança: se a animação não assumir em 6s (JS lento ou com falha),
            // o CSS que esconde o texto é removido e o título fica visível.
            __html:
              "var d=document.documentElement;d.classList.add('js-motion');setTimeout(function(){d.classList.remove('js-motion')},6000)",
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}

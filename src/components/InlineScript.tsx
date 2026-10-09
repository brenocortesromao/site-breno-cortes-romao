"use client";

/**
 * Script inline que roda antes da primeira pintura (padrão do guia
 * "preventing-flash-before-hydration" do Next 16).
 * PRECISA ser Client Component: no HTML do servidor o `type` é
 * text/javascript (o navegador executa durante o parse); no render do cliente
 * vira text/plain, então o React não avisa "Encountered a script tag".
 * `suppressHydrationWarning` aceita essa diferença de `type`.
 * (next/script beforeInteractive não serve aqui: não roda antes da 1ª pintura.)
 */
export default function InlineScript({ html }: { html: string }) {
  return (
    <script
      type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

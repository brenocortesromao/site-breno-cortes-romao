/**
 * Script inline que roda antes da primeira pintura (padrão do guia
 * "preventing-flash-before-hydration" do Next 16). No cliente o `type` vira
 * text/plain para o React não avisar sobre <script> renderizado.
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

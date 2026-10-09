import type { JsonLd } from "@/lib/seo/structured-data";

/**
 * Renderiza dados estruturados como <script type="application/ld+json"> no
 * HTML do servidor (lido por buscadores e assistentes de IA). Sem dados, não
 * renderiza nada. Escapa "<" para não fechar a tag por engano.
 */
export default function JsonLdScript({ data }: { data: JsonLd | null }) {
  if (!data) return null;
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}

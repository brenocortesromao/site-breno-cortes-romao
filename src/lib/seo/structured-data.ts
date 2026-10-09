/**
 * Dados estruturados (JSON-LD) — PREPARADOS, NÃO PREENCHIDOS.
 * Serão completados na etapa de lançamento (domínio final, redes, e-mail,
 * área atendida etc.). Enquanto retornarem `null`, nada é renderizado.
 *
 * Regras: só fatos reais e confirmados pelo dono; nada de avaliações,
 * números ou clientes inventados. O nome é sempre "Breno Côrtes Romão".
 *
 * Referências: https://schema.org/Person · https://schema.org/ProfessionalService
 */

export type JsonLd = Record<string, unknown>;

/** Person: Breno Côrtes Romão (nome, função, sameAs com perfis, imagem, url). */
export function personJsonLd(_input: { locale: string; name: string; role: string }): JsonLd | null {
  void _input;
  // Lançamento: { "@context": "https://schema.org", "@type": "Person", name, jobTitle: role,
  //   url, image, sameAs: [LinkedIn, Instagram, ...], knowsLanguage: ["pt-BR", "en"] }
  return null;
}

/** ProfessionalService: o serviço de Fractional Brand & Creative Director. */
export function professionalServiceJsonLd(_input: { locale: string; name: string }): JsonLd | null {
  void _input;
  // Lançamento: { "@context": "https://schema.org", "@type": "ProfessionalService", name, url,
  //   founder: { "@type": "Person", name }, areaServed, serviceType: [...pilares], email }
  return null;
}

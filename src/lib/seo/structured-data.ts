/**
 * Dados estruturados (JSON-LD) do site, por idioma. Só fatos reais e
 * confirmados pelo dono: nada de avaliações, números, preços ou clientes
 * inventados. O nome é sempre "Breno Côrtes Romão".
 * Os blocos se ligam por "@id": WebSite → publisher (Person);
 * ProfessionalService → founder (Person).
 *
 * Referências: https://schema.org/Person · https://schema.org/ProfessionalService
 * https://schema.org/WebSite · https://schema.org/FAQPage
 */

export type JsonLd = Record<string, unknown>;

/** Domínio final (NEXT_PUBLIC_SITE_URL, sem barra no fim). */
export function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

const ids = () => {
  const base = siteUrl();
  return { person: `${base}/#person`, service: `${base}/#service`, website: `${base}/#website` };
};

/** Perfis do dono (sameAs). Preencha e descomente; vazio, o campo não é publicado. */
const SAME_AS: string[] = [
  // "https://www.linkedin.com/in/SEU-PERFIL",
  // "https://www.instagram.com/SEU-PERFIL",
  // "https://www.behance.net/SEU-PERFIL",
];

/** Telefone/WhatsApp público do site (ver src/content/contact.ts). */
const PHONE = "+55 11 97541-5501";

/** Person: Breno Côrtes Romão. */
export function personJsonLd(input: { locale: string; name: string; role: string; description: string }): JsonLd {
  const base = siteUrl();
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    "@id": ids().person,
    name: input.name,
    jobTitle: input.role,
    description: input.description,
    url: `${base}/${input.locale}`,
    image: `${base}/retrato/breno-retrato.webp`,
    knowsLanguage: ["pt-BR", "en"],
    ...(SAME_AS.length ? { sameAs: SAME_AS } : {}),
  };
}

/**
 * ProfessionalService: o serviço de Fractional Brand & Creative Director, com o
 * catálogo de ofertas (a parceria e TODOS os serviços das 3 colunas de
 * Projetos pontuais). Atendimento remoto; área: Brasil (pt) ou o mundo (en).
 * É um subtipo de LocalBusiness: o Google exige "address" (só o país, que é fato).
 */
export function professionalServiceJsonLd(input: {
  locale: string;
  name: string;
  role: string;
  description: string;
  partnership: string;
  catalogName: string;
  remote: string;
  columns: { title: string; items: string[] }[];
}): JsonLd {
  const base = siteUrl();
  const en = input.locale === "en";
  const service = (name: string) => ({ "@type": "Offer", itemOffered: { "@type": "Service", name } });
  return {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    "@id": ids().service,
    name: `${input.name}, ${input.role}`,
    description: input.description,
    url: `${base}/${input.locale}`,
    image: `${base}/og.png`,
    telephone: PHONE,
    address: { "@type": "PostalAddress", addressCountry: "BR" },
    areaServed: en ? "Worldwide" : { "@type": "Country", name: "Brasil" },
    founder: { "@id": ids().person },
    knowsLanguage: ["pt-BR", "en"],
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: input.catalogName,
      itemListElement: [
        {
          "@type": "Offer",
          itemOffered: {
            "@type": "Service",
            name: input.partnership,
            serviceType: input.role,
            // atendimento remoto (reuniões online; presencial quando fizer sentido)
            availableChannel: { "@type": "ServiceChannel", name: input.remote, serviceUrl: `${base}/${input.locale}` },
          },
        },
        ...input.columns.map((col) => ({
          "@type": "OfferCatalog",
          name: col.title,
          itemListElement: col.items.map(service),
        })),
      ],
    },
  };
}

/** WebSite: o site no idioma da página, publicado pela Person. */
export function websiteJsonLd(input: { locale: string; name: string; description: string }): JsonLd {
  const base = siteUrl();
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": ids().website,
    url: `${base}/${input.locale}`,
    name: input.name,
    description: input.description,
    inLanguage: input.locale === "en" ? "en" : "pt-BR",
    publisher: { "@id": ids().person },
  };
}

/**
 * FAQPage com as perguntas frequentes (mesmo texto visível na página).
 * Respostas ainda não definidas ([CONFIRMAR]/[PENDENTE]) ficam de fora, para
 * não publicar placeholders nos dados estruturados.
 */
export function faqJsonLd(items: { q: string; a: string }[]): JsonLd | null {
  const ready = items.filter((it) => !/\[(CONFIRMAR|PENDENTE)/.test(it.q + it.a));
  if (!ready.length) return null;
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: ready.map((it) => ({
      "@type": "Question",
      name: it.q,
      acceptedAnswer: { "@type": "Answer", text: it.a },
    })),
  };
}

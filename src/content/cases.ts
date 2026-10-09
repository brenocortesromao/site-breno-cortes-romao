/**
 * Cases curtos em texto, cada um com página própria em /[locale]/cases/[slug].
 * O slug é o mesmo nos dois idiomas; os textos ficam em messages (works.cases).
 * A ordem aqui define a ordem na home e o "próximo case" no fim de cada página.
 */
export const caseSlugs = ["case-01", "case-02", "case-03"] as const;
export type CaseSlug = (typeof caseSlugs)[number];

export const isCaseSlug = (s: string): s is CaseSlug => (caseSlugs as readonly string[]).includes(s);

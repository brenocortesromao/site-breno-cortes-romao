import * as rootParams from "next/root-params";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";

/**
 * Configuração por requisição do next-intl. O idioma vem do segmento [locale]
 * via `next/root-params` (dispensa setRequestLocale e mantém as páginas
 * estáticas). Um `locale` explícito (ex.: generateMetadata) tem prioridade.
 */
export default getRequestConfig(async ({ locale: explicit }) => {
  const candidate = explicit ?? (await rootParams.locale());
  if (!hasLocale(routing.locales, candidate)) notFound();

  return {
    locale: candidate,
    messages: (await import(`../messages/${candidate}.json`)).default,
  };
});

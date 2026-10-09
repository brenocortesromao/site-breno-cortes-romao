import { Fragment, type ReactNode } from "react";

/**
 * Termos que NUNCA são traduzidos (regra do projeto): o título
 * "Fractional Brand & Creative Director" e a palavra "fractional".
 * Eles saem envolvidos em <span translate="no" lang="en">, para o tradutor
 * automático do navegador não transformá-los em "marca fracionária…" e para
 * leitores de tela pronunciarem em inglês.
 * Use ao renderizar textos de mensagens que possam conter esses termos.
 */
const TERMS = /(Fractional Brand & Creative Director|\bfractional\b)/gi;

export function protectTerms(text: string): ReactNode {
  const parts = text.split(TERMS);
  if (parts.length === 1) return text;
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <span key={i} translate="no" lang="en">
        {part}
      </span>
    ) : (
      <Fragment key={i}>{part}</Fragment>
    ),
  );
}

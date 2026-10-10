"use client";

import { useLocale } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { routing, type AppLocale } from "@/i18n/routing";

/**
 * Seletor PT/EN. Mantém a página atual ao trocar de idioma
 * (/pt/sobre → /en/sobre); o next-intl grava a escolha em cookie.
 */
export default function LocaleSwitcher({
  label,
  names,
  switchTo,
}: {
  label: string;
  names: Record<AppLocale, string>;
  switchTo: Record<AppLocale, string>;
}) {
  const current = useLocale();
  const pathname = usePathname();

  return (
    <nav aria-label={label}>
      <ul className="flex items-center gap-1 font-mono text-[11px] uppercase tracking-[0.2em]">
        {routing.locales.map((locale, i) => (
          <li key={locale} className="flex items-center gap-1">
            {i > 0 && <span aria-hidden="true" className="text-silver/50">/</span>}
            {locale === current ? (
              <span aria-current="true" title={names[locale]} className="px-1 text-foreground">
                {locale}
              </span>
            ) : (
              <Link
                href={pathname}
                locale={locale}
                hrefLang={locale}
                aria-label={switchTo[locale]}
                className="px-1 text-silver transition-colors hover:text-foreground"
              >
                {locale}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </nav>
  );
}

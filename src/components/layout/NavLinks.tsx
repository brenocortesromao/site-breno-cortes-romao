"use client";

import { Link, usePathname } from "@/i18n/navigation";

/**
 * Links do menu para seções da home. Na home: âncora "#secao" (o Lenis
 * desliza até ela). Em outras páginas (/sobre): "/#secao" no
 * idioma atual, para os links não ficarem "mortos".
 */
export default function NavLinks({ items }: { items: { label: string; hash: string }[] }) {
  const pathname = usePathname();
  const onHome = pathname === "/";
  const cls =
    "font-mono text-[11px] uppercase tracking-[0.28em] text-silver transition-colors hover:text-foreground";

  return (
    <ul className="flex gap-8 xl:gap-10">
      {items.map((item) => (
        <li key={item.hash}>
          {onHome ? (
            <a href={`#${item.hash}`} className={cls}>
              {item.label}
            </a>
          ) : (
            <Link href={`/#${item.hash}`} className={cls}>
              {item.label}
            </Link>
          )}
        </li>
      ))}
    </ul>
  );
}

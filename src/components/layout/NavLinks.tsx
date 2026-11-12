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
    "font-mono text-[11px] uppercase tracking-[0.28em] text-silver transition-colors hover:text-foreground max-xl:text-[10px] max-xl:tracking-[0.08em] xl:max-[1439px]:tracking-[0.2em]";

  // abaixo de 1440 o espaçamento diminui, para os 9 links (e os ícones de
  // contato) caberem ao lado do nome e da função do cabeçalho (HeaderBrand);
  // de 1024 a 1279, letra de 10px e espaçamento menor (com "Tecnologia", o
  // menu passava por cima da assinatura)
  return (
    <ul className="flex gap-2.5 xl:gap-5 min-[1440px]:gap-10">
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

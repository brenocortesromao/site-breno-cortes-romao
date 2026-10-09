import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import LocaleSwitcher from "./LocaleSwitcher";

const nav = [
  { key: "manifesto", href: "#manifesto" },
  { key: "services", href: "#servicos" },
  { key: "projects", href: "#projetos" },
  { key: "contact", href: "#contato" },
] as const;

/** Cabeçalho: nome completo + função, navegação e seletor PT/EN. */
export default async function Header() {
  const t = await getTranslations();

  return (
    <header className="absolute inset-x-0 top-0 z-20">
      <div className="mx-auto flex max-w-[1600px] items-start justify-between gap-6 px-6 py-7 md:px-12">
        <Link href="/" aria-label={t("nav.home")} className="leading-tight">
          <span className="block text-sm font-semibold tracking-[-0.01em]">{t("site.name")}</span>
          <span className="mt-1 block font-mono text-[10px] uppercase tracking-[0.22em] text-silver">
            {t("site.role")}
          </span>
        </Link>
        <div className="flex items-center gap-10">
          <nav aria-label={t("nav.label")} className="hidden lg:block">
            <ul className="flex gap-10">
              {nav.map((item) => (
                <li key={item.href}>
                  <a
                    href={item.href}
                    className="font-mono text-[11px] uppercase tracking-[0.28em] text-silver transition-colors hover:text-foreground"
                  >
                    {t(`nav.${item.key}`)}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          <LocaleSwitcher
            label={t("nav.language")}
            names={{ pt: t("languages.pt"), en: t("languages.en") }}
            switchTo={{
              pt: t("nav.switchTo", { language: t("languages.pt") }),
              en: t("nav.switchTo", { language: t("languages.en") }),
            }}
          />
        </div>
      </div>
    </header>
  );
}

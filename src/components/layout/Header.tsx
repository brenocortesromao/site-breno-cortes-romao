import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import LocaleSwitcher from "./LocaleSwitcher";
import NavLinks from "./NavLinks";

const nav = [
  { key: "manifesto", hash: "manifesto" },
  { key: "fractional", hash: "fractional" },
  { key: "services", hash: "o-que-faco" },
  { key: "projects", hash: "trabalhos" },
  { key: "about", hash: "sobre" },
  { key: "contact", hash: "contato" },
] as const;

/**
 * Cabeçalho fixo: nome completo + função, navegação e seletor PT/EN.
 * Usa as variáveis de tema, então acompanha a troca claro/escuro do scroll;
 * o degradê do fundo garante leitura sobre qualquer conteúdo.
 */
export default async function Header() {
  const t = await getTranslations();

  return (
    <header className="fixed inset-x-0 top-0 z-40">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-background/90 via-background/50 to-transparent"
      />
      <div className="relative mx-auto flex max-w-[1600px] items-start justify-between gap-4 px-6 py-5 md:px-12 md:py-7">
        <Link href="/" aria-label={t("nav.home")} className="min-w-0 leading-tight">
          <span className="block text-[13px] font-semibold tracking-[-0.01em] md:text-sm">
            {t("site.name")}
          </span>
          <span className="mt-1 block font-mono text-[9px] uppercase tracking-[0.12em] text-silver md:text-[10px] md:tracking-[0.22em]">
            {t("site.role")}
          </span>
        </Link>
        <div className="flex shrink-0 items-center gap-10">
          <nav aria-label={t("nav.label")} className="hidden lg:block">
            <NavLinks items={nav.map((item) => ({ hash: item.hash, label: t(`nav.${item.key}`) }))} />
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

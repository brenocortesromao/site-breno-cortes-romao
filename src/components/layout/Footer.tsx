import { getTranslations } from "next-intl/server";

/** Rodapé de todas as páginas (montado no layout do idioma). */
export default async function Footer() {
  const t = await getTranslations();
  const name = t("site.name");

  return (
    <footer className="relative z-10 border-t border-line">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-2 px-6 py-6 font-mono text-[10px] uppercase tracking-[0.25em] text-silver md:flex-row md:justify-between md:px-12">
        <span>{t("footer.rights", { year: 2026, name })}</span>
        <span>{t("footer.tagline")}</span>
      </div>
    </footer>
  );
}

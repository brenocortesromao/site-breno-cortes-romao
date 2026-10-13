import { getTranslations } from "next-intl/server";
import { bearCredit } from "@/content/bear";
import { sharkCredit, turtleCredit } from "@/content/oceanCredits";

/** Rodapé de todas as páginas (montado no layout do idioma). */
export default async function Footer() {
  const t = await getTranslations();
  const name = t("site.name");
  // créditos dos modelos 3D (CC BY 4.0 exige atribuição): urso, tubarão, tartaruga
  const credits = [
    ["footer.bearCredit", bearCredit],
    ["footer.sharkCredit", sharkCredit],
    ["footer.turtleCredit", turtleCredit],
  ] as const;

  return (
    <footer className="relative z-10 border-t border-line">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-2 px-6 py-6 font-mono text-[10px] uppercase tracking-[0.25em] text-silver md:flex-row md:justify-between md:px-12">
        <span>{t("footer.rights", { year: 2026, name })}</span>
        <span>{t("footer.tagline")}</span>
      </div>
      {/* créditos dos modelos 3D (CC BY 4.0 exige atribuição) */}
      <p className="mx-auto max-w-[1600px] px-6 pb-6 font-mono text-[10px] tracking-[0.12em] text-silver opacity-70 md:px-12">
        {credits.map(([key, links], i) => (
          <span key={key}>
            {i > 0 && " · "}
            {t.rich(key, {
              model: (chunks) => (
                <a href={links.model} target="_blank" rel="noopener noreferrer" className="underline-offset-2 hover:underline">
                  {chunks}
                </a>
              ),
              license: (chunks) => (
                <a href={links.license} target="_blank" rel="noopener noreferrer" className="underline-offset-2 hover:underline">
                  {chunks}
                </a>
              ),
            })}
          </span>
        ))}
      </p>
    </footer>
  );
}

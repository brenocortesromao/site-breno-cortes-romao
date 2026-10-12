import { getTranslations } from "next-intl/server";
import { whatsappUrl } from "@/content/contact";
import ServiceStrips from "./ServiceStrips";

/**
 * Projetos pontuais (§12b) — preta e compacta (padding vertical ~60% do
 * padrão), entre "Poucas parcerias" e "Perguntas frequentes", para não
 * competir com a parceria. Faixas de serviços em loop (ServiceStrips,
 * decorativas) + a mesma lista numa <ul> sr-only; botão no estilo do
 * "Quero conversar" para o WhatsApp (mensagem pré-preenchida própria).
 */
export default async function OneOffProjects() {
  const t = await getTranslations("oneOff");
  const strips = t.raw("strips") as string[][];

  return (
    <section id="projetos-pontuais" data-theme="dark" aria-labelledby="projetos-pontuais-title" className="relative z-10">
      <div className="mx-auto w-full max-w-[1600px] px-6 pt-[clamp(3.6rem,9.6vh,7.2rem)] md:px-12">
        <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-silver">{t("eyebrow")}</p>
        <h2
          id="projetos-pontuais-title"
          className="mt-6 max-w-4xl text-[clamp(1.9rem,3.8vw,4.25rem)] font-semibold leading-[1] tracking-[-0.05em]"
        >
          {t("title")}
        </h2>
        <p className="mt-6 max-w-xl text-base leading-relaxed text-silver md:text-lg">{t("text")}</p>
        <ul aria-label={t("listLabel")} className="sr-only">
          {strips.flat().map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>

      <div className="mt-12 md:mt-16">
        <ServiceStrips strips={strips} />
      </div>

      <div className="mx-auto w-full max-w-[1600px] px-6 pb-[clamp(3.6rem,9.6vh,7.2rem)] pt-12 md:px-12 md:pt-16">
        <a
          href={whatsappUrl(t("whatsappMessage"))}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={t("buttonLabel")}
          className="inline-flex min-h-[4rem] items-center gap-6 border border-foreground bg-foreground px-6 py-4 font-mono text-[11px] uppercase tracking-[0.24em] text-background transition-colors hover:bg-transparent hover:text-foreground"
        >
          {t("button")} <span aria-hidden="true">↗</span>
        </a>
      </div>
    </section>
  );
}

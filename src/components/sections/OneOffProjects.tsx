import { getTranslations } from "next-intl/server";
import { whatsappUrl } from "@/content/contact";
import BlurRevealTitle from "@/components/BlurRevealTitle";
import ChromeButton from "@/components/ChromeButton";
import ServiceColumns, { type ServiceColumn } from "./ServiceColumns";

/**
 * Projetos pontuais (§12b) — preta e compacta (padding vertical ~60% do
 * padrão), entre "Poucas parcerias" e "Perguntas frequentes", para não
 * competir com a parceria.
 * Desktop (≥ 1024px): à esquerda (~40%) rótulo, título, texto e botão; à
 * direita (~60%) as 3 colunas de serviços (ServiceColumns). Abaixo disso: uma
 * coluna, com as listas (lado a lado no tablet, empilhadas no celular) antes do
 * botão. Botão no estilo do "Quero conversar", para o WhatsApp
 * (mensagem pré-preenchida própria).
 */
export default async function OneOffProjects() {
  const t = await getTranslations("oneOff");
  const columns = t.raw("columns") as ServiceColumn[];

  return (
    <section id="projetos-pontuais" data-theme="dark" aria-labelledby="projetos-pontuais-title" className="m-theme-gap relative z-10">
      <div className="m-sec m-rg40 mx-auto grid w-full max-w-[1600px] gap-y-12 px-6 py-[clamp(3.6rem,9.6vh,7.2rem)] md:px-12 lg:grid-cols-[2fr_3fr] lg:gap-x-16">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-silver m-center">{t("eyebrow")}</p>
          <BlurRevealTitle
            id="projetos-pontuais-title"
            className="m-center m-g16 mt-6 text-[clamp(32px,3.2vw,48px)] font-semibold leading-[1] tracking-[-0.05em]"
            text={t("title")}
            stagger={0.035}
          />
          <p className="m-center-p m-g20 mt-6 max-w-md text-base leading-relaxed text-silver md:text-lg">{t("text")}</p>
        </div>

        <ServiceColumns columns={columns} className="lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:pt-10" />

        <div className="max-md:text-center lg:col-start-1 lg:row-start-2">
          <ChromeButton
            href={whatsappUrl(t("whatsappMessage"))}
            label={t("buttonLabel")}
            className="inline-flex min-h-[4rem] items-center border border-foreground bg-foreground px-6 py-4 font-mono text-[11px] uppercase tracking-[0.24em] text-background transition-colors hover:bg-transparent hover:text-foreground"
          >
            {t("button")}{" "}
            <span aria-hidden="true" className="transition-transform duration-300 group-hover:-translate-y-[3px] group-hover:translate-x-[3px]">
              ↗
            </span>
          </ChromeButton>
        </div>
      </div>
    </section>
  );
}

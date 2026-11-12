import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { whatsappUrl } from "@/content/contact";
import { protectTerms } from "@/components/Term";
import GlassPointer from "@/components/contact/GlassPointer";
import CodeShape from "./CodeShape";
import TechFx from "./TechFx";
import CodeCamo from "./CodeCamo";

/** Ícones de traço fino (24 × 24, traço 1,2), um por card, na ordem das mensagens. */
const ICONS: ReactNode[] = [
  // sites e landing pages: janela de navegador
  <>
    <rect x="3" y="4.5" width="18" height="15" rx="2" />
    <path d="M3 8.5h18" />
    <path d="M6 6.5h.01M8.2 6.5h.01" />
    <path d="M6.5 12.5h6M6.5 15.5h4" />
  </>,
  // plataformas sob medida: painel com gráfico
  <>
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <path d="M9 4v16" />
    <path d="M12 16.5l2.5-3 2 1.8 2.5-4" />
    <path d="M5 8h2M5 11h2" />
  </>,
  // automações e agentes de IA: nós ligados e brilho
  <>
    <circle cx="6" cy="17" r="2" />
    <circle cx="18" cy="17" r="2" />
    <circle cx="12" cy="8" r="2" />
    <path d="M7.1 15.3 10.9 9.7M13.1 9.7l3.8 5.6M8 17h8" />
    <path d="M19 3.5v3M17.5 5h3" />
  </>,
  // experiências 3D e interativas: cubo
  <>
    <path d="M12 3 20 7.5v9L12 21l-8-4.5v-9L12 3Z" />
    <path d="M4 7.5 12 12l8-4.5M12 12v9" />
  </>,
];

/**
 * Tecnologia (escura), entre a Mensagem e A distância; no menu, logo depois
 * de "Mensagem".
 * Texto à esquerda e animação à direita no desktop (CodeShape: "código que
 * vira forma", canvas 2D, sem WebGL); empilhados no celular. Depois, 4
 * cards em vidro escuro (o mesmo .fm-card das caixas da seção Fractional), a
 * linha mono e o botão para o WhatsApp com mensagem própria.
 */
export default async function Technology() {
  const t = await getTranslations("technology");
  const items = t.raw("items") as { title: string; text: string }[];

  return (
    <section id="tecnologia" data-theme="dark" aria-labelledby="tecnologia-title" className="tech relative z-10">
      <CodeCamo />
      <div className="m-sec relative z-[1] mx-auto w-full max-w-[1600px] px-6 py-[clamp(6rem,16lvh,12rem)] md:px-12">
        <div className="grid items-center gap-14 lg:grid-cols-[5fr_6fr] lg:gap-16 xl:gap-24">
          <div className="min-w-0">
            <p className="m-center font-mono text-[11px] uppercase tracking-[0.28em] text-silver">{protectTerms(t("eyebrow"))}</p>
            <h2
              id="tecnologia-title"
              className="m-center m-g16 mt-6 max-w-[18ch] text-[clamp(2.3rem,4.2vw,4.75rem)] font-light leading-[1.02] tracking-[-0.055em]"
            >
              {t("title")} <span className="text-silver">{t("titleMuted")}</span>
            </h2>
            <p className="m-center-p m-g20 mt-8 max-w-xl text-base leading-relaxed text-silver md:text-lg">{t("text")}</p>
          </div>
          <div className="m-g40 min-w-0 self-stretch">
            <CodeShape label={t("demoLabel")} />
          </div>
        </div>

        <ul id="tecnologia-cards" className="m-g40 mt-20 grid gap-4 md:grid-cols-2 lg:mt-24 lg:grid-cols-4">
          {items.map((item, i) => (
            <li key={item.title} className="flex min-w-0">
              <article className="fm-card tech-card flex w-full flex-col gap-4 !p-6">
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="h-7 w-7 text-[#D6D6DC]"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  {ICONS[i]}
                </svg>
                <div>
                  <h3 className="mb-1.5 text-[17px] font-normal leading-[1.3] tracking-[-0.01em] text-[#EDEDEF]">{item.title}</h3>
                  <p className="text-[14px] font-light leading-[1.55] text-[#B4B4BC]">{item.text}</p>
                </div>
              </article>
            </li>
          ))}
        </ul>

        <div
          id="tecnologia-cta"
          className="mt-12 flex flex-col gap-8 max-md:items-center max-md:text-center md:flex-row md:items-center md:justify-between"
        >
          <p className="font-mono text-[11px] uppercase leading-relaxed tracking-[0.2em] text-silver">{t("note")}</p>
          <a
            href={whatsappUrl(t("whatsappMessage"))}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t("buttonLabel")}
            className="lg-btn lg-btn--primary inline-flex min-h-[4.5rem] items-center justify-between gap-6 px-6 py-4 font-mono text-[11px] uppercase tracking-[0.24em] text-[#0b0b0c] transition-colors max-md:w-full max-md:justify-center"
          >
            {t("button")} <span aria-hidden="true">↗</span>
          </a>
        </div>
        <GlassPointer rootId="tecnologia-cta" />
      </div>
      <TechFx sectionId="tecnologia" cardsId="tecnologia-cards" />
    </section>
  );
}

import { getTranslations } from "next-intl/server";
import { whatsappUrl } from "@/content/contact";
import EmailMenu from "@/components/contact/EmailMenu";
import MediaKitLink from "@/components/contact/MediaKitLink";
import SpaceBackdrop from "@/components/graphics/SpaceBackdrop";
import { protectTerms } from "@/components/Term";
import GlassPointer from "@/components/contact/GlassPointer";

const button =
  "inline-flex h-full min-h-[4.5rem] lg-btn items-center justify-between gap-6 max-md:justify-center max-md:text-center px-6 py-4 font-mono text-[11px] uppercase tracking-[0.24em] transition-colors";

/**
 * Contato (§14). Botões: WhatsApp (principal, mensagem pré-preenchida), E-mail (menu com Gmail, app de e-mail e
 * copiar; endereço montado só no cliente, ver EmailMenu) e Mídia kit (PDF). Itens sem dado aparecem desativados com
 * "[PENDENTE]" (configuração em src/content/contact.ts).
 */
export default async function Contact() {
  const t = await getTranslations("contact");

  return (
    <section id="contato" data-theme="gradient" aria-labelledby="contato-title" className="relative z-10 overflow-clip border-t border-line">
      <SpaceBackdrop />
      <div className="m-sec relative z-10 mx-auto flex min-h-svh w-full max-md:min-h-0 max-w-[1600px] flex-col justify-center px-6 py-[clamp(6rem,16lvh,12rem)] md:px-12">
        <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-silver m-center">{t("eyebrow")}</p>
        <h2 id="contato-title" className="m-center m-g16 mt-10 text-[clamp(2.75rem,10vw,10.5rem)] leading-[0.9] tracking-[-0.06em]">
          <span className="block font-light">{t("titleLight")}</span>
          <span className="block font-semibold text-silver-gradient md:pl-[12vw]">{t("titleStrong")}</span>
        </h2>
        <p className="m-center-p m-g20 mt-12 max-w-xl text-base leading-relaxed text-silver md:text-lg">{protectTerms(t("text"))}</p>

        {/* WhatsApp (principal) na linha inteira; E-mail e Mídia kit lado a lado */}
        <ul id="contato-botoes" className="m-g40 mt-14 grid gap-4 md:max-w-4xl md:auto-rows-fr md:grid-cols-2">
          <li className="md:col-span-2">
            <a
              href={whatsappUrl(t("whatsappMessage"))}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={t("whatsappLabel")}
              data-warp
              className={`${button} w-full lg-btn--primary text-[#0b0b0c]`}
            >
              {t("whatsapp")} <span aria-hidden="true">↗</span>
            </a>
          </li>
          <li>
            <EmailMenu
              copy={{
                label: t("emailLabel"),
                subject: t("emailSubject"),
                gmail: t("emailGmail"),
                app: t("emailApp"),
                copy: t("emailCopy"),
                copied: t("emailCopied"),
              }}
              align="left"
              wrapClassName="h-full w-full"
              className={`${button} w-full lg-btn--dark`}
            >
              {t("email")} <span aria-hidden="true">→</span>
            </EmailMenu>
          </li>
          <li>
            <MediaKitLink className={`${button} w-full lg-btn--dark`}>
              {t("mediaKit")}
              <svg aria-hidden="true" viewBox="0 0 16 16" className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.4">
                <path d="M8 2v8m0 0L4.5 6.5M8 10l3.5-3.5M2.5 13.5h11" />
              </svg>
            </MediaKitLink>
          </li>
        </ul>
        <GlassPointer rootId="contato-botoes" />
      </div>
    </section>
  );
}

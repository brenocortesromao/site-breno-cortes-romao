import { getTranslations } from "next-intl/server";
import { contactConfig } from "@/content/contact";
import DraftBadge from "@/components/theme/DraftBadge";
import { protectTerms } from "@/components/Term";

const button =
  "inline-flex h-full min-h-[4.5rem] items-center justify-between gap-6 border px-6 py-4 font-mono text-[11px] uppercase tracking-[0.24em] transition-colors";

/**
 * Contato (§14). Botões: Agendar conversa (Cal.com — link provisório),
 * E-mail e Mídia kit (PDF). Itens sem dado aparecem desativados com
 * "[PENDENTE]" (configuração em src/content/contact.ts).
 */
export default async function Contact() {
  const t = await getTranslations("contact");
  const { calUrl, calProvisional, email, mediaKit } = contactConfig;

  return (
    <section id="contato" data-theme="gradient" aria-labelledby="contato-title" className="relative z-10 border-t border-line">
      <div className="mx-auto flex min-h-svh w-full max-w-[1600px] flex-col justify-center px-6 py-[clamp(6rem,16vh,12rem)] md:px-12">
        <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-silver">{t("eyebrow")}</p>
        <h2 id="contato-title" className="mt-10 text-[clamp(2.75rem,10vw,10.5rem)] leading-[0.9] tracking-[-0.06em]">
          <span className="block font-light">{t("titleLight")}</span>
          <span className="block font-semibold text-silver-gradient md:pl-[12vw]">{t("titleStrong")}</span>
        </h2>
        <p className="mt-12 max-w-xl text-base leading-relaxed text-silver md:text-lg">{protectTerms(t("text"))}</p>

        <ul className="mt-14 grid gap-4 md:max-w-4xl md:grid-cols-3">
          <li>
            <a
              href={calUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`${button} w-full border-foreground bg-foreground text-background hover:bg-transparent hover:text-foreground`}
            >
              {t("schedule")} <span aria-hidden="true">↗</span>
            </a>
            {calProvisional && <DraftBadge label={t("scheduleNote")} className="mt-3" />}
          </li>
          <li>
            {email ? (
              <a href={`mailto:${email}`} className={`${button} w-full border-line hover:border-foreground`}>
                {t("email")} <span aria-hidden="true">→</span>
              </a>
            ) : (
              <span aria-disabled="true" className={`${button} w-full cursor-not-allowed border-dashed border-line text-silver`}>
                {t("email")} <span>{t("pending")}</span>
              </span>
            )}
          </li>
          <li>
            {mediaKit ? (
              <a href={mediaKit} download className={`${button} w-full border-line hover:border-foreground`}>
                {t("mediaKit")} <span aria-hidden="true">↓</span>
              </a>
            ) : (
              <span aria-disabled="true" className={`${button} w-full cursor-not-allowed border-dashed border-line text-silver`}>
                {t("mediaKit")} <span>{t("pending")}</span>
              </span>
            )}
          </li>
        </ul>
      </div>
    </section>
  );
}

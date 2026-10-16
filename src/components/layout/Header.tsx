import { getTranslations } from "next-intl/server";
import { loadSignature } from "@/content/signature";
import HeaderBrand from "./HeaderBrand";
import LocaleSwitcher from "./LocaleSwitcher";
import NavLinks from "./NavLinks";
import { protectTerms } from "@/components/Term";
import HeaderContact from "@/components/contact/HeaderContact";
import WhatsAppFloat from "@/components/contact/WhatsAppFloat";
import { whatsappUrl } from "@/content/contact";

const nav = [
  { key: "manifesto", hash: "manifesto" },
  { key: "fractional", hash: "fractional" },
  { key: "services", hash: "o-que-faco" },
  { key: "projects", hash: "trabalhos" },
  { key: "about", hash: "sobre" },
  { key: "ai", hash: "ia" },
  { key: "contact", hash: "contato" },
] as const;

/**
 * Cabeçalho fixo: assinatura + nome completo + função (HeaderBrand), navegação,
 * seletor PT/EN e ícones de contato (WhatsApp, e-mail). No mobile, também o
 * botão flutuante de WhatsApp (WhatsAppFloat).
 * Usa as variáveis de tema, então acompanha a troca claro/escuro do scroll;
 * o degradê do fundo garante leitura sobre qualquer conteúdo.
 */
export default async function Header() {
  const t = await getTranslations();
  const whatsapp = whatsappUrl(t("contact.whatsappMessage"));

  return (
    <header className="fixed inset-x-0 top-0 z-40">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-background/90 via-background/50 to-transparent"
      />
      <div className="relative mx-auto flex max-w-[1600px] items-start justify-between gap-4 px-6 py-5 md:px-12 md:py-7">
        <HeaderBrand
          signature={loadSignature()}
          name={t("site.name")}
          role={protectTerms(t("site.role"))}
          homeLabel={t("nav.home")}
          signatureLabel={t("manifesto.signatureLabel", { name: t("site.name") })}
        />
        {/* abaixo de 1440 os espaços diminuem para o menu, o seletor e os
            ícones caberem ao lado do nome (ver HeaderBrand) */}
        <div className="flex shrink-0 items-center gap-4 md:gap-6 lg:gap-4 min-[1440px]:gap-10">
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
          <HeaderContact
            whatsappHref={whatsapp}
            whatsappLabel={t("contact.whatsappLabel")}
            berryLabel={t("berry.play")}
            email={{
              label: t("contact.emailLabel"),
              subject: t("contact.emailSubject"),
              gmail: t("contact.emailGmail"),
              app: t("contact.emailApp"),
              copy: t("contact.emailCopy"),
              copied: t("contact.emailCopied"),
            }}
          />
        </div>
      </div>
      <WhatsAppFloat href={whatsapp} label={t("contact.whatsappLabel")} />
    </header>
  );
}

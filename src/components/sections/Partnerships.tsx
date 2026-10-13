import { getTranslations } from "next-intl/server";
import GraphicLayer from "@/components/graphics/GraphicLayer";
import { whatsappUrl } from "@/content/contact";

/**
 * Poucas parcerias por vez (§12) — seção curta, de impacto, em OFF-WHITE com
 * curvas de nível líquidas (ritmo de cores do CONTEUDO-SITE.md). Texto
 * [CONFIRMAR]: fica exatamente como está no CONTEUDO-SITE.md até o dono
 * confirmar (decisão de negócio). CTA: status com ponto pulsante (pulso
 * desligado com prefers-reduced-motion), frase e botão "Quero conversar" para
 * o WhatsApp (mensagem pré-preenchida própria desta seção).
 */
export default async function Partnerships() {
  const t = await getTranslations("partnerships");

  return (
    <section
      id="parcerias"
      data-theme="light"
      aria-labelledby="parcerias-title"
      className="m-theme-gap relative z-10 overflow-hidden"
    >
      <GraphicLayer variant="contours-b" />
      <div className="m-sec relative mx-auto flex min-h-[80svh] w-full max-w-[1600px] flex-col justify-center px-6 py-[clamp(6rem,16vh,12rem)] md:px-12">
        <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-silver m-center">{t("eyebrow")}</p>
        <h2
          id="parcerias-title"
          className="m-center m-g16 mt-8 max-w-5xl text-[clamp(2.6rem,7vw,7.5rem)] font-semibold leading-[0.95] tracking-[-0.06em] text-silver-gradient"
        >
          {t("title")}
        </h2>
        <p className="m-center-p m-g20 mt-10 max-w-xl text-base leading-relaxed text-silver md:ml-[33%] md:text-lg">{t("text")}</p>
        <div className="m-g40 mt-10 max-md:text-center md:ml-[33%]">
          <p className="inline-flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.22em]">
            <span aria-hidden="true" className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-foreground opacity-40 motion-reduce:animate-none" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-foreground" />
            </span>
            {t("indicator")}
          </p>
          <p className="m-center-p mt-6 max-w-xl text-base leading-relaxed md:text-lg">{t("cta")}</p>
          <a
            href={whatsappUrl(t("whatsappMessage"))}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t("buttonLabel")}
            className="mt-8 inline-flex min-h-[4rem] items-center gap-6 border border-foreground bg-foreground px-6 py-4 font-mono text-[11px] uppercase tracking-[0.24em] text-background transition-colors hover:bg-transparent hover:text-foreground"
          >
            {t("button")} <span aria-hidden="true">↗</span>
          </a>
        </div>
      </div>
    </section>
  );
}

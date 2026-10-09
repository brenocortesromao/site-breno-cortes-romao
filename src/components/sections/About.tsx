import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import MediaSlot from "@/components/MediaSlot";

/** Retrato do Sobre (monocromático pelo MediaSlot). Ex.: "/media/retrato-sobre.jpg". */
export const aboutPortraitSrc: string | undefined = undefined;

/**
 * Sobre (§11) — tema GRADIENTE ESCURO (ritmo de cores do CONTEUDO-SITE.md).
 * - variant "summary" (home): retrato, título (h2), bio, método e link para /sobre.
 * - variant "page" (/sobre): título como h1, bio, trajetória em linha do tempo e
 *   método. Bio e trajetória são [PENDENTE] até o dono enviar.
 */
export default async function About({ variant }: { variant: "summary" | "page" }) {
  const t = await getTranslations("about");
  const name = (await getTranslations("site"))("name");
  const timeline = t.raw("timeline") as { period: string; text: string }[];
  const isPage = variant === "page";
  const Title = isPage ? "h1" : "h2";

  return (
    <section
      id="sobre"
      data-theme="gradient"
      aria-labelledby="sobre-title"
      className="relative z-10 min-h-svh overflow-hidden"
    >
      <div
        className={`relative mx-auto grid w-full max-w-[1600px] gap-12 px-6 md:grid-cols-12 md:gap-8 md:px-12 ${
          isPage ? "pb-[clamp(6rem,16vh,12rem)] pt-40" : "py-[clamp(6rem,16vh,12rem)]"
        }`}
      >
        <div className="md:col-span-5">
          <MediaSlot
            src={aboutPortraitSrc}
            alt={name}
            label={t("portrait")}
            ratio="aspect-[4/5]"
            tone="mono"
            sizes="(min-width: 768px) 38vw, 90vw"
            priority={isPage}
          />
        </div>

        <div className="md:col-span-6 md:col-start-7">
          <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-silver">{t("eyebrow")}</p>
          <Title
            id="sobre-title"
            className="mt-6 text-[clamp(2.3rem,5vw,5.5rem)] font-semibold leading-[0.98] tracking-[-0.055em]"
          >
            {t("title")}
          </Title>
          <p className="mt-10 max-w-xl text-base leading-relaxed text-silver md:text-lg">{t("bio")}</p>

          {isPage && (
            <div className="mt-16">
              <h2 className="font-mono text-[11px] font-normal uppercase tracking-[0.28em] text-silver">
                {t("timelineTitle")}
              </h2>
              <ol className="mt-6 border-t border-line">
                {timeline.map((item, i) => (
                  <li key={i} className="grid grid-cols-[7rem_1fr] gap-6 border-b border-line py-5">
                    <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-silver">{item.period}</span>
                    <span className="text-base">{item.text}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          <div className="mt-14">
            {isPage ? (
              <h2 className="font-mono text-[11px] font-normal uppercase tracking-[0.28em] text-silver">{t("methodTitle")}</h2>
            ) : (
              <h3 className="font-mono text-[11px] font-normal uppercase tracking-[0.28em] text-silver">{t("methodTitle")}</h3>
            )}
            <p className="mt-4 max-w-xl text-[clamp(1.2rem,1.8vw,1.6rem)] leading-snug tracking-[-0.02em]">{t("method")}</p>
          </div>

          <div className="mt-14">
            {isPage ? (
              <Link href="/" className="font-mono text-[11px] uppercase tracking-[0.28em] text-silver hover:text-foreground">
                <span aria-hidden="true">← </span>
                {t("back")}
              </Link>
            ) : (
              <Link
                href="/sobre"
                className="inline-flex items-center gap-3 border-b border-foreground/60 pb-1 font-mono text-[11px] uppercase tracking-[0.24em] transition-colors hover:border-foreground"
              >
                {t("more")} <span aria-hidden="true">→</span>
              </Link>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

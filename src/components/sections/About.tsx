import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import MediaSlot from "@/components/MediaSlot";
import AboutStory from "@/components/sections/AboutStory";
import ForestBackdrop from "@/components/graphics/ForestBackdrop";

/** Retrato do Sobre (monocromático pelo MediaSlot). Ex.: "/media/retrato-sobre.jpg". */
export const aboutPortraitSrc: string | undefined = undefined;

/**
 * Sobre (§11) — tema GRADIENTE ESCURO (ritmo de cores do CONTEUDO-SITE.md).
 * - variant "summary" (home): retrato, título (h2), bio, trajetória e link para /sobre.
 * - variant "page" (/sobre): o mesmo conteúdo, com o título como h1.
 * Bio, fecho e trajetória: AboutStory (client, animações de scroll).
 * Fundo: floresta 3D com urso (ForestBackdrop, sticky; seção em overflow-clip,
 * pois overflow-hidden anularia o sticky).
 */
export default async function About({ variant }: { variant: "summary" | "page" }) {
  const t = await getTranslations("about");
  const name = (await getTranslations("site"))("name");
  const isPage = variant === "page";

  return (
    <section
      id="sobre"
      data-theme="gradient"
      aria-labelledby="sobre-title"
      className="relative z-10 min-h-svh overflow-clip"
    >
      <ForestBackdrop />
      <div
        className={`relative z-10 mx-auto grid w-full max-w-[1600px] gap-12 px-6 md:grid-cols-12 md:gap-8 md:px-12 ${
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

        <AboutStory
          page={isPage}
          copy={{
            eyebrow: t("eyebrow"),
            title: name,
            subtitle: t("subtitle"),
            opening: t("opening"),
            paragraphs: t.raw("paragraphs") as string[],
            closing: t("closing"),
            timelineTitle: t("timelineTitle"),
            trajectory: t.raw("trajectory") as string[],
            reference: t("reference"),
          }}
        >
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
        </AboutStory>
      </div>
    </section>
  );
}

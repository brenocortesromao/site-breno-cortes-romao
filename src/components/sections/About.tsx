import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import AboutPortrait from "@/components/AboutPortrait";
import AboutStory from "@/components/sections/AboutStory";
import ForestBackdrop from "@/components/graphics/ForestBackdrop";
import { bearModel } from "@/content/bear";

/**
 * Sobre (§11) — tema GRADIENTE ESCURO (ritmo de cores do CONTEUDO-SITE.md).
 * - variant "summary" (home): retrato, título (h2), bio e trajetória.
 * - variant "page" (/sobre): o mesmo conteúdo, com o título como h1.
 * Bio, fecho e trajetória: AboutStory (client, animações de scroll).
 * Fundo: descida aérea até a cachoeira com o urso (ForestBackdrop, sticky;
 * seção em overflow-clip, pois overflow-hidden anularia o sticky).
 */
export default async function About({ variant }: { variant: "summary" | "page" }) {
  const t = await getTranslations("about");
  const site = await getTranslations("site");
  const name = site("name");
  const isPage = variant === "page";

  return (
    <section
      id="sobre"
      data-theme="gradient"
      aria-labelledby="sobre-title"
      className="relative z-10 min-h-svh overflow-clip"
    >
      <ForestBackdrop bearSrc={bearModel()} />
      <div
        className={`m-sec relative z-10 mx-auto grid w-full max-w-[1600px] gap-12 px-6 md:grid-cols-12 md:gap-8 md:px-12 ${
          isPage ? "pb-[clamp(6rem,16vh,12rem)] pt-40" : "m-sec-t-forest py-[clamp(6rem,16vh,12rem)]"
        }`}
      >
        {/* celular: retrato acima do rótulo e do nome, centralizado, com ~70% da largura */}
        <div className="max-md:mx-auto max-md:w-[70%] md:col-span-5">
          {/* foto com entrada (linha de luz + cor florescendo), vidro e parallax */}
          <AboutPortrait alt={`${name}, ${site("role")}`} priority={isPage} />
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
          ) : null}
        </AboutStory>
      </div>
    </section>
  );
}

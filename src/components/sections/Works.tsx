import { getTranslations } from "next-intl/server";
import { logos } from "@/content/media";
import { loadTrabalhos } from "@/content/works";
import LogoMarquee from "./LogoMarquee";
import WorkWall from "./WorkWall";

/** Placeholders enquanto public/trabalhos/ estiver vazia. */
const PLACEHOLDERS = 8;

/**
 * Trabalhos (escura, pouco visual): faixa de logos e mural inclinado de projetos.
 * Sem lista de cases nem páginas /cases (decisão do dono).
 * Imagens: public/trabalhos/ (lidas no build, ver content/works.ts); logos:
 * public/logos (ver content/media.ts).
 */
export default async function Works() {
  const t = await getTranslations("works");
  const found = loadTrabalhos();
  const works =
    found.length > 0
      ? found
      : Array.from({ length: PLACEHOLDERS }, (_, i) => ({
          src: undefined,
          project: t("gallery.placeholderProject", { n: String(i + 1).padStart(2, "0") }),
          year: undefined,
        }));
  const total = works.length;

  return (
    <section id="trabalhos" data-theme="dark" aria-labelledby="trabalhos-title" className="relative z-10">
      <div className="mx-auto w-full max-w-[1600px] px-6 pt-[clamp(6rem,16vh,12rem)] md:px-12">
        <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-silver m-center">{t("eyebrow")}</p>
        <h2
          id="trabalhos-title"
          className="m-center mt-6 max-w-4xl text-[clamp(2.3rem,5vw,5.5rem)] font-semibold leading-[0.98] tracking-[-0.055em]"
        >
          {t("title")}
        </h2>
        <p className="m-center mt-6 max-w-xl text-sm leading-relaxed text-silver max-md:mx-auto md:text-[15px]">{t("subtitle")}</p>
      </div>

      <div className="mx-auto mt-16 w-full max-w-[1600px] md:mt-24">
        <LogoMarquee logos={logos} title={t("logos.title")} />
      </div>

      <div className="mt-16 pb-[clamp(6rem,16vh,12rem)] md:mt-24">
        <WorkWall
          items={works.map((w) => {
            const caption = w.year ? `${w.project} · ${w.year}` : w.project;
            return {
              src: w.src,
              caption,
              alt: w.year
                ? t("gallery.imageAlt", { project: w.project, year: w.year })
                : t("gallery.imageAltNoYear", { project: w.project }),
              open: t("gallery.open", { caption }),
            };
          })}
          labels={{
            title: t("gallery.title"),
            label: t("gallery.label"),
            prev: t("gallery.prev"),
            next: t("gallery.next"),
            close: t("gallery.close"),
            lightbox: t("gallery.lightbox"),
            counters: works.map((_, i) => t("gallery.counter", { current: i + 1, total })),
            placeholder: t("gallery.placeholder"),
          }}
        />
      </div>
    </section>
  );
}

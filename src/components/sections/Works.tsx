import { getTranslations } from "next-intl/server";
import { logos, trabalhos } from "@/content/media";
import LogoMarquee from "./LogoMarquee";
import WorkCarousel from "./WorkCarousel";

/**
 * Trabalhos (escura, pouco visual): faixa de logos e carrossel de projetos.
 * Sem lista de cases nem páginas /cases (decisão do dono).
 * Dados de imagens/logos: public/trabalhos e public/logos (ver content/media.ts).
 */
export default async function Works() {
  const t = await getTranslations("works");
  const total = trabalhos.length;

  return (
    <section id="trabalhos" data-theme="dark" aria-labelledby="trabalhos-title" className="relative z-10">
      <div className="mx-auto w-full max-w-[1600px] px-6 pt-[clamp(6rem,16vh,12rem)] md:px-12">
        <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-silver">{t("eyebrow")}</p>
        <h2
          id="trabalhos-title"
          className="mt-6 max-w-4xl text-[clamp(2.3rem,5vw,5.5rem)] font-semibold leading-[0.98] tracking-[-0.055em]"
        >
          {t("title")}
        </h2>
        <p className="mt-6 max-w-xl text-sm leading-relaxed text-silver md:text-[15px]">{t("subtitle")}</p>
      </div>

      <div className="mx-auto mt-16 w-full max-w-[1600px] md:mt-24">
        <LogoMarquee logos={logos} title={t("logos.title")} />
      </div>

      <div className="mt-16 pb-[clamp(6rem,16vh,12rem)] md:mt-24">
        <WorkCarousel
          items={trabalhos.map((w) => ({
            ...w,
            alt: t("gallery.imageAlt", { project: w.project, year: w.year }),
          }))}
          labels={{
            title: t("gallery.title"),
            label: t("gallery.label"),
            prev: t("gallery.prev"),
            next: t("gallery.next"),
            counters: trabalhos.map((_, i) => t("gallery.counter", { current: i + 1, total })),
            dragHint: t("gallery.dragHint"),
            placeholder: t("gallery.placeholder"),
          }}
        />
      </div>

    </section>
  );
}

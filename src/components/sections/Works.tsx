import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { logos, trabalhos } from "@/content/media";
import LogoMarquee from "./LogoMarquee";
import WorkCarousel from "./WorkCarousel";

/**
 * Trabalhos (escura, pouco visual): faixa de logos, carrossel de projetos e até
 * 3 cases curtos em texto, cada um com página própria (/[locale]/cases/[slug]).
 * Dados de imagens/logos: public/trabalhos e public/logos (ver content/media.ts).
 */
export default async function Works() {
  const t = await getTranslations("works");
  const cases = t.raw("cases.items") as { slug: string; title: string; summary: string }[];
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
      </div>

      <div className="mx-auto mt-16 w-full max-w-[1600px] md:mt-24">
        <LogoMarquee logos={logos} title={t("logos.title")} />
      </div>

      <div className="mt-16 md:mt-24">
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

      <div className="mx-auto w-full max-w-[1600px] px-6 pb-[clamp(6rem,16vh,12rem)] pt-16 md:px-12">
        <h3 className="font-mono text-[11px] uppercase tracking-[0.28em] text-silver">{t("cases.title")}</h3>
        <ul className="mt-8 border-t border-line">
          {cases.map((c, i) => (
            <li key={c.slug} className="border-b border-line">
              <Link
                href={`/cases/${c.slug}`}
                aria-label={t("cases.readMore", { title: c.title })}
                className="group grid gap-3 py-8 md:grid-cols-12 md:items-baseline md:gap-8 md:py-10"
              >
                <span className="font-mono text-xs text-silver md:col-span-1">{String(i + 1).padStart(2, "0")}</span>
                <span className="text-[clamp(1.8rem,3.6vw,3.5rem)] font-semibold tracking-[-0.045em] transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-2 md:col-span-6">
                  {c.title}
                </span>
                <span className="text-sm leading-relaxed text-silver md:col-span-4">{c.summary}</span>
                <span aria-hidden="true" className="hidden text-xl md:col-span-1 md:block md:text-right">
                  →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

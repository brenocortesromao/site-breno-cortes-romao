import { getTranslations } from "next-intl/server";
import { logos } from "@/content/media";
import { loadTrabalhos } from "@/content/works";
import LogoMarquee from "./LogoMarquee";
import WorkWall from "./WorkWall";

/** Peças placeholder do mural enquanto public/trabalhos/ estiver vazia. */
const PLACEHOLDERS = 8;

/**
 * Trabalhos (escura, pouco visual): faixa de logos e mural inclinado de projetos.
 * Sem lista de cases nem páginas /cases (decisão do dono).
 * Artes: public/trabalhos/trabalhos.json (lido no build, ver content/works.ts);
 * sem o JSON o mural mostra placeholders. Logos: public/logos (ver
 * content/media.ts).
 */
export default async function Works() {
  const t = await getTranslations("works");
  const found = loadTrabalhos();

  return (
    <section id="trabalhos" data-theme="dark" aria-labelledby="trabalhos-title" className="relative z-10">
      <div className="m-sec-t mx-auto w-full max-w-[1600px] px-6 pt-[clamp(6rem,16lvh,12rem)] md:px-12">
        <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-silver m-center">{t("eyebrow")}</p>
        <h2
          id="trabalhos-title"
          className="m-center m-g16 mt-6 max-w-4xl text-[clamp(2.3rem,5vw,5.5rem)] font-semibold leading-[0.98] tracking-[-0.055em]"
        >
          {t("title")}
        </h2>
        <p className="m-center-p m-g20 mt-6 max-w-xl text-sm leading-relaxed text-silver md:text-[15px]">{t("subtitle")}</p>
      </div>

      <div className="m-g40 mx-auto mt-16 w-full max-w-[1600px] md:mt-24">
        <LogoMarquee logos={logos} title={t("logos.title")} note={t("logos.more")} />
      </div>

      <div className="m-sec-b mt-16 pb-[clamp(6rem,16lvh,12rem)] md:mt-24">
        <WorkWall
          items={
            found.length > 0
              ? found.map((w) => ({
                  src: w.src,
                  alt: t("gallery.imageAlt", { brand: w.brand }),
                  aspect: w.width / w.height,
                  brand: w.brand,
                }))
              : // sem artes ainda: peças placeholder ("Imagem pendente")
                Array.from({ length: PLACEHOLDERS }, () => ({ src: undefined, alt: "" }))
          }
          labels={{
            title: t("gallery.title"),
            label: t("gallery.label"),
            placeholder: t("gallery.placeholder"),
            experience: { label: t("gallery.experience.label"), full: t("gallery.experience.full") },
          }}
        />
      </div>
    </section>
  );
}

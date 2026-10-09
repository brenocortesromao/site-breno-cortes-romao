import { getTranslations } from "next-intl/server";
import Hero from "@/components/Hero";
import Manifesto from "@/components/Manifesto";
import MediaSlot from "@/components/MediaSlot";

/* ------------------------------------------------------------------ *
 * Textos: src/messages/{pt,en}.json. Aqui fica só o que não se traduz:
 * layout dos cards, proporções e caminhos de imagem/logo. Para integrar
 * material real, preencha `image` / `src` com um caminho em /public.
 * ------------------------------------------------------------------ */

/** Logos de clientes: use `src` (SVG/PNG branco ou transparente) quando tiver. */
const clientLogos: { src?: string }[] = [{}, {}, {}, {}, {}, {}];

const projectLayout: { image?: string; span: string; ratio: string }[] = [
  { span: "md:col-span-7", ratio: "aspect-[4/5]" },
  { span: "md:col-span-4 md:col-start-9 md:mt-40", ratio: "aspect-[3/4]" },
  { span: "md:col-span-5 md:col-start-2", ratio: "aspect-square" },
  { span: "md:col-span-6 md:col-start-7 md:mt-28", ratio: "aspect-[16/11]" },
];

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-silver">
      {children}
    </p>
  );
}

const pad = (n: number) => String(n + 1).padStart(2, "0");

export default async function Home() {
  const t = await getTranslations();
  const services = t.raw("services.items") as {
    title: string;
    text: string;
    deliverables: string[];
  }[];
  const projects = t.raw("projects.items") as { name: string; kind: string }[];
  const statement = t.raw("manifesto.statement") as { text: string; soft?: boolean }[];

  return (
    <>
      <main>
        {/* Hero */}
        <Hero
          copy={{
            eyebrow: t("hero.eyebrow"),
            titleLight: t("hero.titleLight"),
            titleStrong: t("hero.titleStrong"),
            intro: t("hero.intro"),
            cta: t("hero.cta"),
          }}
        />

        {/* Clientes */}
        <section
          aria-label={t("clients.label")}
          className="relative z-10 mx-auto max-w-[1600px] px-6 md:px-12"
        >
          <div className="grid items-center gap-8 border-y border-line py-10 md:grid-cols-12 md:py-12">
            <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-silver md:col-span-3">
              {t("clients.label")}
            </p>
            <ul className="grid grid-cols-3 gap-x-6 gap-y-8 md:col-span-9 md:grid-cols-6">
              {clientLogos.map((c, i) => (
                <li
                  key={i}
                  className="flex h-10 items-center justify-center border border-dashed border-white/15 font-mono text-[9px] uppercase tracking-[0.2em] text-silver/60"
                >
                  {/* Quando houver logo: <Image src={c.src} alt="…" width={120} height={40} className="h-8 w-auto opacity-70" /> */}
                  {c.src ? null : t("clients.placeholder")}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Manifesto (entra por cima da hero fixa; ver Hero.tsx) */}
        <Manifesto
          copy={{
            eyebrow: t("manifesto.eyebrow"),
            statement,
            body: t("manifesto.body"),
            portrait: t("manifesto.portrait"),
          }}
        />

        {/* Serviços */}
        <section
          id="servicos"
          className="mx-auto max-w-[1600px] px-6 pb-28 md:px-12 md:pb-48"
        >
          <div className="mb-14 flex items-end justify-between md:mb-24">
            <Eyebrow>{t("services.eyebrow")}</Eyebrow>
            <h2 className="hidden text-[clamp(3rem,7vw,7rem)] font-semibold leading-none tracking-[-0.06em] text-silver md:block">
              {t("services.title")}
            </h2>
          </div>

          <ul className="border-t border-line">
            {services.map((s, i) => (
              <li
                key={s.title}
                className="group grid gap-6 border-b border-line py-10 transition-colors duration-500 hover:bg-white/[0.02] md:grid-cols-12 md:gap-8 md:py-16"
              >
                <span className="font-mono text-xs text-silver md:col-span-1">{pad(i)}</span>
                <h3 className="text-[clamp(2.25rem,5.6vw,5.5rem)] font-semibold leading-[0.95] tracking-[-0.055em] transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-2 md:col-span-7">
                  {s.title}
                </h3>
                <div className="md:col-span-4">
                  <p className="text-sm leading-relaxed text-silver">{s.text}</p>
                  <ul className="mt-6 space-y-2 font-mono text-[11px] uppercase tracking-[0.2em]">
                    {s.deliverables.map((d) => (
                      <li key={d}>— {d}</li>
                    ))}
                  </ul>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* Projetos */}
        <section
          id="projetos"
          className="mx-auto max-w-[1600px] px-6 pb-28 md:px-12 md:pb-48"
        >
          <div className="mb-14 flex items-end justify-between md:mb-24">
            <Eyebrow>{t("projects.eyebrow")}</Eyebrow>
            <span className="font-mono text-[11px] uppercase tracking-[0.28em] text-silver">
              {t("projects.period")}
            </span>
          </div>

          <div className="grid gap-x-8 gap-y-16 md:grid-cols-12">
            {projects.map((p, i) => {
              const layout = projectLayout[i % projectLayout.length];
              return (
                <article key={p.name} className={`group ${layout.span}`}>
                  <MediaSlot
                    src={layout.image}
                    alt={t("projects.imageAlt", { name: p.name })}
                    label={t("projects.label", { name: p.name })}
                    ratio={layout.ratio}
                    sizes="(min-width: 768px) 55vw, 100vw"
                  />
                  <div className="mt-5 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                    <h3 className="text-3xl font-semibold tracking-[-0.045em] md:text-4xl lg:text-5xl">
                      <span className="mr-3 font-mono text-[11px] font-normal tracking-[0.2em] text-silver align-middle">
                        {pad(i)}
                      </span>
                      {p.name}
                    </h3>
                    <p className="text-right font-mono text-[11px] uppercase tracking-[0.2em] text-silver">
                      {p.kind}
                    </p>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        {/* Contato */}
        <section id="contato" className="relative overflow-hidden border-t border-line">
          <div className="mx-auto max-w-[1600px] px-6 py-28 md:px-12 md:py-48">
            <Eyebrow>{t("contact.eyebrow")}</Eyebrow>
            <h2 className="mt-10 text-[clamp(2.75rem,11vw,11.5rem)] leading-[0.9] tracking-[-0.06em]">
              <span className="block font-light">{t("contact.titleLight")}</span>
              <span className="block font-semibold text-silver-gradient md:pl-[12vw]">
                {t("contact.titleStrong")}
              </span>
            </h2>
            <div className="mt-16 flex flex-col gap-10 md:mt-24 md:flex-row md:items-end md:justify-between">
              <a
                href={`mailto:${t("contact.email")}`}
                className="w-fit border-b border-foreground/60 pb-2 text-xl tracking-[-0.02em] transition-colors hover:border-foreground md:text-3xl"
              >
                {t("contact.email")}
              </a>
              <ul className="flex gap-8 font-mono text-[11px] uppercase tracking-[0.28em] text-silver">
                <li>
                  <a href="#" className="hover:text-foreground">
                    Instagram
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-foreground">
                    LinkedIn
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-foreground">
                    Behance
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-[1600px] flex-col gap-2 px-6 py-6 font-mono text-[10px] uppercase tracking-[0.25em] text-silver md:flex-row md:justify-between md:px-12">
          <span>{t("footer.rights", { year: 2026, name: t("site.name") })}</span>
          <span>{t("footer.tagline")}</span>
        </div>
      </footer>
    </>
  );
}

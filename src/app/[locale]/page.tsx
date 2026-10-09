import type { Metadata } from "next";
import * as rootParams from "next/root-params";
import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { pageMetadata } from "@/lib/seo/metadata";
import Hero from "@/components/Hero";
import Manifesto from "@/components/Manifesto";
import Section from "@/components/theme/Section";
import Distance, { type DistanceCopy } from "@/components/sections/Distance";
import Diagnostic from "@/components/sections/Diagnostic";
import Fractional, { type FractionalCopy } from "@/components/sections/Fractional";
import Pillars, { type PillarsCopy } from "@/components/sections/Pillars";
import Changes, { type ChangesCopy } from "@/components/sections/Changes";
import Process, { type ProcessCopy } from "@/components/sections/Process";
import Works from "@/components/sections/Works";
import { loadSignature } from "@/content/signature";

/* ------------------------------------------------------------------ *
 * Home. Ordem narrativa (CONTEUDO-SITE.md, com "A distância" logo depois
 * da Mensagem): Hero → Mensagem → A distância → Diagnóstico → Fractional →
 * O que eu faço → O que muda → Como funciona → Trabalhos → Contato.
 * Textos: src/messages/{pt,en}.json. Imagens/logos: public/ (content/media.ts).
 * ------------------------------------------------------------------ */

/** Retrato da Mensagem (monocromático pelo MediaSlot). Ex.: "/media/retrato.jpg". */
const portraitSrc: string | undefined = undefined;

export async function generateMetadata(): Promise<Metadata> {
  const locale = await rootParams.locale();
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: "meta" });
  return pageMetadata({ locale, path: "", title: t("title"), description: t("description") });
}

export default async function Home() {
  const t = await getTranslations();
  const name = t("site.name");
  const diagnosticItems = t.raw("diagnostic.items") as string[];

  return (
    <>
      <main>
        <Hero
          copy={{
            left: t("hero.left"),
            right: t("hero.right"),
            support: t("hero.support"),
            label: `${name} — ${t("site.role")}`,
            scrollHint: t("hero.scrollHint"),
            draft: "",
          }}
        />

        {/* Mensagem (entra por cima da hero fixa; ver Hero.tsx) */}
        <Manifesto
          portraitSrc={portraitSrc}
          signature={loadSignature()}
          copy={{
            eyebrow: t("manifesto.eyebrow", { name }),
            statement: t.raw("manifesto.statement") as { text: string; soft?: boolean }[],
            body: t("manifesto.body"),
            portrait: t("manifesto.portrait"),
            name,
            role: t("site.role"),
            signatureLabel: t("manifesto.signatureLabel", { name }),
            draft: "",
          }}
        />

        <Distance
          copy={{
            eyebrow: t("distance.eyebrow"),
            note: t("distance.note"),
            labels: {
              business: t("distance.labels.business"),
              brand: t("distance.labels.brand"),
              gap: t("distance.labels.gap"),
              direction: t("distance.labels.direction"),
              touchpoints: t.raw("distance.labels.touchpoints") as string[],
            },
            charts: t.raw("distance.charts") as DistanceCopy["charts"],
          }}
        />

        <Diagnostic
          ctaHref="#contato"
          copy={{
            eyebrow: t("diagnostic.eyebrow"),
            title: t("diagnostic.title"),
            hint: t("diagnostic.hint"),
            counters: Array.from({ length: diagnosticItems.length + 1 }, (_, count) =>
              t("diagnostic.counter", { count, total: diagnosticItems.length }),
            ),
            items: diagnosticItems,
            closing: t("diagnostic.closing"),
            closingMatched: t("diagnostic.closingMatched"),
            cta: t("diagnostic.cta"),
          }}
        />

        <Fractional
          copy={{
            eyebrow: t("fractional.eyebrow"),
            title: t("fractional.title"),
            text: t("fractional.text"),
            chart: {
              title: t("fractional.chart.title"),
              bars: t.raw("fractional.chart.bars") as FractionalCopy["chart"]["bars"],
              caption: t("fractional.chart.caption"),
              source: t("fractional.chart.source"),
            },
            compare: {
              caption: t("fractional.compare.caption"),
              columns: t.raw("fractional.compare.columns") as string[],
              rows: t.raw("fractional.compare.rows") as FractionalCopy["compare"]["rows"],
            },
            note: t("fractional.note"),
          }}
        />

        <Pillars
          copy={{
            eyebrow: t("pillars.eyebrow"),
            title: t("pillars.title"),
            subtitle: t("pillars.subtitle"),
            items: t.raw("pillars.items") as PillarsCopy["items"],
          }}
        />

        <Changes
          copy={{
            eyebrow: t("changes.eyebrow"),
            title: t("changes.title"),
            before: t("changes.before"),
            after: t("changes.after"),
            rows: t.raw("changes.rows") as ChangesCopy["rows"],
          }}
        />

        <Process
          copy={{
            eyebrow: t("process.eyebrow"),
            title: t("process.title"),
            steps: t.raw("process.steps") as ProcessCopy["steps"],
            note: t("process.note"),
          }}
        />

        <Works />

        {/* Contato (versão completa com Cal.com e mídia kit na Parte 6) */}
        <Section
          id="contato"
          labelledBy="contato-title"
          className="border-t border-line"
          innerClassName="flex min-h-svh flex-col justify-center"
        >
          <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-silver">{t("contact.eyebrow")}</p>
          <h2 id="contato-title" className="mt-10 text-[clamp(2.75rem,10vw,10.5rem)] leading-[0.9] tracking-[-0.06em]">
            <span className="block font-light">{t("contact.titleLight")}</span>
            <span className="block font-semibold text-silver-gradient md:pl-[12vw]">{t("contact.titleStrong")}</span>
          </h2>
          <p className="mt-12 max-w-xl text-base leading-relaxed text-silver md:text-lg">{t("contact.text")}</p>
          <a
            href={`mailto:${t("contact.email")}`}
            className="mt-12 w-fit border-b border-foreground/60 pb-2 text-xl tracking-[-0.02em] transition-colors hover:border-foreground md:text-3xl"
          >
            {t("contact.email")}
          </a>
        </Section>
      </main>

      <footer className="relative z-10 border-t border-line">
        <div className="mx-auto flex max-w-[1600px] flex-col gap-2 px-6 py-6 font-mono text-[10px] uppercase tracking-[0.25em] text-silver md:flex-row md:justify-between md:px-12">
          <span>{t("footer.rights", { year: 2026, name })}</span>
          <span>{t("footer.tagline")}</span>
        </div>
      </footer>
    </>
  );
}

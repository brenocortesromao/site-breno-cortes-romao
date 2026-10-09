import type { Metadata } from "next";
import * as rootParams from "next/root-params";
import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { pageMetadata } from "@/lib/seo/metadata";
import Hero from "@/components/Hero";
import Manifesto from "@/components/Manifesto";
import Distance, { type DistanceCopy } from "@/components/sections/Distance";
import Diagnostic from "@/components/sections/Diagnostic";
import Fractional, { type FractionalCopy } from "@/components/sections/Fractional";
import Pillars, { type PillarsCopy } from "@/components/sections/Pillars";
import Changes, { type ChangesCopy } from "@/components/sections/Changes";
import Process, { type ProcessCopy } from "@/components/sections/Process";
import Works from "@/components/sections/Works";
import Touchpoints from "@/components/sections/Touchpoints";
import About from "@/components/sections/About";
import Partnerships from "@/components/sections/Partnerships";
import Contact from "@/components/sections/Contact";
import Faq from "@/components/sections/Faq";
import { loadSignature } from "@/content/signature";
import { loadDistanceCharts } from "@/content/charts";

/* ------------------------------------------------------------------ *
 * Home. Ordem narrativa (CONTEUDO-SITE.md, com "A distância" logo depois
 * da Mensagem): Hero → Mensagem → A distância → Diagnóstico → Fractional →
 * O que eu faço → O que muda → Como funciona → Onde o trabalho aparece →
 * Trabalhos → Sobre (resumo) → Poucas parcerias → Perguntas frequentes → Contato.
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
            label: `${name}, ${t("site.role")}`,
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
          charts={loadDistanceCharts()}
          copy={{
            eyebrow: t("distance.eyebrow"),
            charts: t.raw("distance.charts") as DistanceCopy["charts"],
          }}
        />

        <Diagnostic
          ctaHref="#contato"
          copy={{
            eyebrow: t("diagnostic.eyebrow"),
            title: t("diagnostic.title"),
            hintTouch: t("diagnostic.hintTouch"),
            hintClick: t("diagnostic.hintClick"),
            cursorMark: t("diagnostic.cursorMark"),
            cursorUnmark: t("diagnostic.cursorUnmark"),
            counters: Array.from({ length: diagnosticItems.length + 1 }, (_, count) =>
              t("diagnostic.counter", { count, total: diagnosticItems.length }),
            ),
            items: diagnosticItems,
            closing: t("diagnostic.closing"),
            closingOne: t("diagnostic.closingOne"),
            closingMatched: t("diagnostic.closingMatched"),
            cta: t("diagnostic.cta"),
          }}
        />

        <Fractional
          copy={{
            eyebrow: t("fractional.eyebrow"),
            title: t("fractional.title"),
            text: t("fractional.text"),
            stats: {
              title: t("fractional.stats.title"),
              items: t.raw("fractional.stats.items") as FractionalCopy["stats"]["items"],
              support: t("fractional.stats.support"),
              source: t("fractional.stats.source"),
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

        <Touchpoints
          copy={{
            eyebrow: t("touchpoints.eyebrow"),
            title: t("touchpoints.title"),
            items: t.raw("touchpoints.items") as string[],
          }}
        />

        <Works />


        <About variant="summary" />

        <Partnerships />

        <Faq />

        <Contact />
      </main>

    </>
  );
}

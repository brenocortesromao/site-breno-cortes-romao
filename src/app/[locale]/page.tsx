import { Suspense } from "react";
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
import MountainBackdrop from "@/components/graphics/MountainBackdrop";
import Touchpoints from "@/components/sections/Touchpoints";
import About from "@/components/sections/About";
import Partnerships from "@/components/sections/Partnerships";
import OneOffProjects from "@/components/sections/OneOffProjects";
import Ai, { type AiCopy } from "@/components/sections/Ai";
import Contact from "@/components/sections/Contact";
import Faq from "@/components/sections/Faq";
import { loadSignature } from "@/content/signature";
import { loadDistanceCharts } from "@/content/charts";

/* ------------------------------------------------------------------ *
 * Home. Ordem narrativa (CONTEUDO-SITE.md, com "A distância" logo depois
 * da Mensagem): Hero → Mensagem → A distância → Diagnóstico → Fractional →
 * O que eu faço → O que muda → Como funciona → Onde o trabalho aparece →
 * Trabalhos → Sobre (resumo) → Poucas parcerias → Projetos pontuais → Perguntas frequentes → Contato.
 * Textos: src/messages/{pt,en}.json. Imagens/logos: public/ (content/media.ts).
 * ------------------------------------------------------------------ */

/** Retrato da Mensagem (colorido; entrada "luz de estúdio" em PortraitReveal).
 * Original de 2400 px: o next/image gera o srcset (mobile, retina e 4K) a partir
 * dele. */
const portraitSrc: string | undefined = "/retrato/breno-retrato.webp";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await rootParams.locale();
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: "meta" });
  const site = await getTranslations({ locale, namespace: "site" });
  return pageMetadata({ locale, path: "", title: t("title"), description: t("description"), siteName: site("name"), imageAlt: t("ogAlt") });
}

export default async function Home() {
  const t = await getTranslations();
  const name = t("site.name");
  const diagnosticItems = t.raw("diagnostic.items") as string[];

  return (
    <>
      {/* Cada seção depois da hero fica no próprio <Suspense>: o HTML já vem
          pronto (sem fallback), e o React 19 hidrata seção por seção, cedendo a
          vez ao navegador entre elas, em vez de uma tarefa longa única. */}
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
        <Suspense>
          <Manifesto
            portraitSrc={portraitSrc}
            signature={loadSignature()}
            copy={{
              eyebrow: t("manifesto.eyebrow", { name }),
              statement: t.raw("manifesto.statement") as { text: string; soft?: boolean }[],
              body: t.raw("manifesto.body") as string[],
              portrait: t("manifesto.portrait"),
              portraitAlt: t("manifesto.portraitAlt", { name }),
              name,
              role: t("site.role"),
              signatureLabel: t("manifesto.signatureLabel", { name }),
              draft: "",
            }}
          />
        </Suspense>

        <Suspense>
          <Distance
            charts={loadDistanceCharts(t.raw("distance.svg") as Record<string, string>)}
            copy={{
              eyebrow: t("distance.eyebrow"),
              charts: t.raw("distance.charts") as DistanceCopy["charts"],
            }}
          />
        </Suspense>

        <Suspense>
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
        </Suspense>

        <Suspense>
          <Fractional
            copy={{
              eyebrow: t("fractional.eyebrow"),
              title: t("fractional.title"),
              text: t("fractional.text"),
              stats: {
                title: t("fractional.stats.title"),
                lead: t("fractional.stats.lead"),
                items: t.raw("fractional.stats.items") as FractionalCopy["stats"]["items"],
                support: t("fractional.stats.support"),
                source: t("fractional.stats.source"),
              },
              compare: {
                caption: t("fractional.compare.caption"),
                highlightLabel: t("fractional.compare.highlightLabel"),
                columns: t.raw("fractional.compare.columns") as string[],
                rows: t.raw("fractional.compare.rows") as FractionalCopy["compare"]["rows"],
              },
              note: t("fractional.note"),
            }}
          />
        </Suspense>

        {/* Trecho com fundo de montanhas (vista de cima → detalhe): O que eu faço + O que muda */}
        <Suspense>
          <div className="relative">
            <MountainBackdrop alt={t("backdrop.mountainsAlt")} />
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
          </div>
        </Suspense>

        <Suspense>
          <Process
            copy={{
              eyebrow: t("process.eyebrow"),
              title: t("process.title"),
              steps: t.raw("process.steps") as ProcessCopy["steps"],
              note: t("process.note"),
            }}
          />
        </Suspense>

        <Suspense>
          <Touchpoints
            copy={{
              eyebrow: t("touchpoints.eyebrow"),
              title: t("touchpoints.title"),
              items: t.raw("touchpoints.items") as string[],
            }}
          />
        </Suspense>

        <Suspense>
          <Works />
        </Suspense>

        <Suspense>
          <About variant="summary" />
        </Suspense>

        <Suspense>
          <Ai
            copy={{
              eyebrow: t("ai.eyebrow"),
              prompt: t("ai.prompt"),
              title: t("ai.title"),
              lines: t.raw("ai.lines") as AiCopy["lines"],
              body: t("ai.body"),
              differentiation: {
                line1: t("ai.differentiation.line1"),
                line2: t("ai.differentiation.line2"),
                text: t("ai.differentiation.text"),
              },
              closing: t("ai.closing"),
              closingHighlight: t("ai.closingHighlight"),
              footnote: t("ai.footnote"),
            }}
          />
        </Suspense>

        <Suspense>
          <Partnerships />
        </Suspense>

        <Suspense>
          <OneOffProjects />
        </Suspense>

        <Suspense>
          <Faq />
        </Suspense>

        <Suspense>
          <Contact />
        </Suspense>
      </main>

    </>
  );
}

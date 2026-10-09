import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { caseSlugs, isCaseSlug } from "@/content/cases";
import { pageMetadata } from "@/lib/seo/metadata";

type CaseItem = {
  slug: string;
  title: string;
  summary: string;
  challenge: string;
  role: string;
  decision: string;
  application: string;
  result: string;
};

const BLOCKS = ["challenge", "role", "decision", "application", "result"] as const;

// Todos os cases nos dois idiomas, gerados no build (o idioma vem do layout).
export function generateStaticParams() {
  return caseSlugs.map((slug) => ({ slug }));
}

async function loadCase(locale: string, slug: string) {
  if (!hasLocale(routing.locales, locale) || !isCaseSlug(slug)) return null;
  const t = await getTranslations({ locale, namespace: "works" });
  const items = t.raw("cases.items") as CaseItem[];
  const index = items.findIndex((c) => c.slug === slug);
  if (index < 0) return null;
  return { t, item: items[index], next: items[(index + 1) % items.length], locale };
}

export async function generateMetadata({ params }: PageProps<"/[locale]/cases/[slug]">): Promise<Metadata> {
  const { locale, slug } = await params;
  const data = await loadCase(locale, slug);
  if (!data) return {};
  return pageMetadata({
    locale: data.locale as (typeof routing.locales)[number],
    path: `/cases/${slug}`,
    title: data.item.title,
    description: data.item.summary,
  });
}

/**
 * Página de case: Desafio → Meu papel → Decisão → Aplicação → Resultado.
 * Com cacheComponents, os params são lidos DENTRO de um <Suspense> (a rota
 * precisa ter um shell para slugs desconhecidos). Os cases de
 * generateStaticParams continuam pré-renderizados por completo no build.
 */
export default function CasePage({ params }: PageProps<"/[locale]/cases/[slug]">) {
  return (
    <Suspense fallback={null}>
      <CaseContent params={params} />
    </Suspense>
  );
}

async function CaseContent({ params }: { params: PageProps<"/[locale]/cases/[slug]">["params"] }) {
  const { locale, slug } = await params;
  const data = await loadCase(locale, slug);
  if (!data) notFound();
  const { t, item, next } = data;

  return (
    <main>
      <section data-theme="dark" aria-labelledby="case-title" className="relative z-10 flex min-h-svh flex-col justify-end">
        <div className="mx-auto w-full max-w-[1600px] px-6 pb-[clamp(4rem,12vh,9rem)] pt-40 md:px-12">
          <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-silver">{t("casePage.eyebrow")}</p>
          <h1
            id="case-title"
            className="mt-6 max-w-5xl text-[clamp(3rem,9vw,9rem)] font-semibold leading-[0.92] tracking-[-0.06em]"
          >
            {item.title}
          </h1>
          <p className="mt-10 max-w-xl text-base leading-relaxed text-silver md:text-lg">{item.summary}</p>
        </div>
      </section>

      {BLOCKS.map((block, i) => (
        <section
          key={block}
          data-theme="dark"
          aria-labelledby={`case-${block}`}
          className="relative z-10 border-t border-line"
        >
          <div className="mx-auto grid w-full max-w-[1600px] gap-6 px-6 py-[clamp(5rem,14vh,10rem)] md:grid-cols-12 md:gap-8 md:px-12">
            <p className="font-mono text-xs text-silver md:col-span-1">{String(i + 1).padStart(2, "0")}</p>
            <h2
              id={`case-${block}`}
              className="text-[clamp(2rem,4vw,4rem)] font-semibold leading-none tracking-[-0.05em] md:col-span-4"
            >
              {t(`casePage.blocks.${block}`)}
            </h2>
            <p className="max-w-2xl text-lg leading-relaxed text-silver md:col-span-6 md:col-start-7 md:text-xl">
              {item[block]}
            </p>
          </div>
        </section>
      ))}

      <nav aria-label={t("casePage.eyebrow")} className="relative z-10 border-t border-line">
        <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-8 px-6 py-16 md:flex-row md:items-center md:justify-between md:px-12">
          <Link href="/#trabalhos" className="font-mono text-[11px] uppercase tracking-[0.28em] text-silver hover:text-foreground">
            <span aria-hidden="true">← </span>
            {t("casePage.back")}
          </Link>
          <Link
            href={`/cases/${next.slug}`}
            className="text-[clamp(1.5rem,3vw,2.75rem)] font-semibold tracking-[-0.04em] hover:text-silver"
          >
            {t("casePage.next", { title: next.title })} <span aria-hidden="true">→</span>
          </Link>
        </div>
      </nav>
    </main>
  );
}

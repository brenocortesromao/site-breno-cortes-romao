import { getTranslations } from "next-intl/server";
import { protectTerms } from "@/components/Term";
import JsonLdScript from "@/components/seo/JsonLdScript";
import { faqJsonLd } from "@/lib/seo/structured-data";
import FaqAscii from "@/components/sections/FaqAscii";

/**
 * Perguntas frequentes (§13). Acordeão com <details>/<summary> NATIVOS:
 * funciona sem JS, é acessível por teclado e as respostas ficam no HTML
 * (indexáveis por buscadores e assistentes de IA). A abertura suave usa
 * ::details-content + interpolate-size (globals.css) onde o navegador suporta;
 * nos demais, abre instantaneamente. Itens [CONFIRMAR] aparecem como estão.
 * Uma aberta por vez: todos os <details> compartilham o mesmo `name`
 * (acordeão exclusivo nativo; navegadores antigos só deixam abrir várias).
 * SEO: dados estruturados FAQPage (JSON-LD) com as mesmas perguntas.
 * Coluna esquerda: abaixo do título, o "?" em ASCII (FaqAscii), que vira "!"
 * com uma pergunta aberta; título + "?" ficam juntos no sticky (desktop).
 * Fundo: grão sutil que troca de posição a cada ~120 ms (.faq-grain).
 */
export default async function Faq() {
  const t = await getTranslations("faq");
  const items = t.raw("items") as { q: string; a: string }[];

  return (
    <>
    <JsonLdScript data={faqJsonLd(items)} />
    <section id="perguntas" data-theme="dark" aria-labelledby="perguntas-title" className="relative z-10 min-h-svh">
      <div aria-hidden="true" className="faq-grain pointer-events-none absolute inset-0 overflow-hidden" />
      <div className="relative mx-auto grid w-full max-w-[1600px] gap-12 px-6 py-[clamp(6rem,16vh,12rem)] md:grid-cols-12 md:gap-8 md:px-12">
        <div className="md:col-span-4">
          <div className="md:sticky md:top-32">
            <h2
              id="perguntas-title"
              className="m-center text-[clamp(2.3rem,4.4vw,4.75rem)] font-semibold leading-[0.98] tracking-[-0.055em]"
            >
              {t("title")}
            </h2>
            <FaqAscii text={items.map((item) => `${item.q} ${item.a}`).join(" ")} />
          </div>
        </div>

        <div className="border-t border-line md:col-span-7 md:col-start-6">
          {items.map((item) => (
            <details key={item.q} name="faq" className="faq-item group border-b border-line">
              <summary className="flex cursor-pointer list-none items-start justify-between gap-6 py-7 text-[clamp(1.15rem,1.8vw,1.7rem)] font-medium leading-snug tracking-[-0.025em] outline-none focus-visible:ring-1 focus-visible:ring-foreground md:py-9 [&::-webkit-details-marker]:hidden">
                <span>{protectTerms(item.q)}</span>
                {/* + que vira × ao abrir */}
                <span
                  aria-hidden="true"
                  className="mt-1 grid h-7 w-7 shrink-0 place-items-center rounded-full border border-line transition-transform duration-500 group-open:rotate-45"
                >
                  <svg viewBox="0 0 12 12" className="h-3 w-3" stroke="currentColor" strokeWidth="1.4">
                    <path d="M6 1v10M1 6h10" />
                  </svg>
                </span>
              </summary>
              <p className="max-w-2xl pb-8 text-base leading-relaxed text-silver md:pb-10 md:text-lg">{protectTerms(item.a)}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
    </>
  );
}

"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { freezeSite, unfreezeSite } from "@/lib/siteFreeze";
import BerryGame from "./BerryGame";
import "./BerryOverlay.css";
import type { BerryConfig } from "./copy";

/**
 * Caixa (modal) por cima do site: o site continua visível atrás, escurecido (preto
 * a 70%) e com blur leve. X, Esc ou clique fora fecham. Enquanto aberto, o site fica congelado (lib/siteFreeze) e volta como
 * estava, na mesma posição de rolagem. Foco preso dentro do diálogo.
 */
export default function BerryOverlay({ config, onClose }: { config: BerryConfig; onClose: () => void }) {
  const root = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });

  useLayoutEffect(() => {
    freezeSite();
    const html = document.documentElement;
    const prev = html.style.overscrollBehavior;
    html.style.overscrollBehavior = "none";
    html.classList.add("berry-open"); // cursor nativo de volta (ver o <style> abaixo)
    return () => {
      html.style.overscrollBehavior = prev;
      html.classList.remove("berry-open");
      unfreezeSite();
    };
  }, []);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeRef.current();
        return;
      }
      if (e.key !== "Tab") return;
      const items = [...el.querySelectorAll<HTMLElement>("button, a[href], [tabindex='0']")].filter((n) => !n.hasAttribute("disabled"));
      if (!items.length) {
        e.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const a = document.activeElement;
      if (!el.contains(a) || (e.shiftKey && (a === first || a === el.firstElementChild || !items.includes(a as HTMLElement)))) {
        e.preventDefault();
        (e.shiftKey ? last : first).focus();
      } else if (!e.shiftKey && a === last) {
        e.preventDefault();
        first.focus();
      }
    };
    // a rolagem do site fica travada (o Lenis para; no toque/nativo, bloqueia aqui)
    const block = (e: Event) => e.preventDefault();
    window.addEventListener("keydown", onKey, true);
    el.addEventListener("wheel", block, { passive: false });
    el.addEventListener("touchmove", block, { passive: false });
    return () => {
      window.removeEventListener("keydown", onKey, true);
      el.removeEventListener("wheel", block);
      el.removeEventListener("touchmove", block);
    };
  }, []);

  return (
    <div
      ref={root}
      data-berry-overlay
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose(); // clique fora da caixa
      }}
      className={`bo-backdrop fixed inset-0 z-[400] grid place-items-center bg-black/70 px-[max(0px,env(safe-area-inset-left))] backdrop-blur-[6px]`}
    >
      {/* enquanto aberto: cursor personalizado escondido e nativo na página toda (seta; mão no X, botões e links) */}
      <style>{`html.berry-open [data-custom-cursor]{display:none!important}html.berry-open,html.berry-open *,html.custom-cursor.berry-open,html.custom-cursor.berry-open *{cursor:default!important}html.custom-cursor.berry-open [data-berry-overlay] :is(button,a,[role=button]),html.custom-cursor.berry-open [data-berry-overlay] :is(button,a,[role=button]) *,html.berry-open [data-berry-overlay] :is(button,a,[role=button]){cursor:pointer!important}`}</style>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={config.copy.title}
        className={`bo-box relative h-[min(560px,86vh)] w-[min(960px,92vw)] overflow-hidden rounded-2xl border border-[#8d8d8a]/50 bg-[#070707] text-[#f2f2f0] shadow-[0_24px_80px_rgba(0,0,0,0.6)] max-sm:h-[calc(100dvh-24px-env(safe-area-inset-top)-env(safe-area-inset-bottom))] max-sm:w-[calc(100vw-24px-env(safe-area-inset-left)-env(safe-area-inset-right))]`}
      >
        <BerryGame {...config} />
        <button
          type="button"
          onClick={onClose}
          aria-label={config.copy.close}
          className="absolute right-3 top-3 z-20 grid h-11 w-11 place-items-center rounded-full border border-[#8d8d8a] bg-[rgba(7,7,7,0.75)] text-[#f2f2f0] transition-colors hover:border-[#f2f2f0] focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-[3px] focus-visible:outline-[#f2f2f0]"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
            <path d="M5 5l14 14M19 5L5 19" />
          </svg>
        </button>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { freezeSite, unfreezeSite } from "@/lib/siteFreeze";
import BerryGame from "./BerryGame";
import type { BerryConfig } from "./copy";

/**
 * Tela cheia por cima do site: diálogo modal escuro com botão X. Esc ou X
 * fecham. Enquanto aberto, o site fica congelado (lib/siteFreeze) e volta como
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
    return () => {
      html.style.overscrollBehavior = prev;
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
      role="dialog"
      aria-modal="true"
      aria-label={config.copy.title}
      data-berry-overlay
      className="fixed inset-0 z-[400] bg-[#070707] text-[#f2f2f0]"
    >
      {/* o cursor do site some por trás; aqui vale o nativo */}
      <style>{`[data-berry-overlay],[data-berry-overlay] *{cursor:auto!important}[data-berry-overlay] button,[data-berry-overlay] a{cursor:pointer!important}`}</style>
      <BerryGame {...config} />
      <button
        type="button"
        onClick={onClose}
        aria-label={config.copy.close}
        className="absolute right-[max(16px,env(safe-area-inset-right))] top-[max(12px,env(safe-area-inset-top))] z-20 grid h-11 w-11 place-items-center rounded-full border border-[#3a3a38] bg-[rgba(7,7,7,0.6)] text-[#f2f2f0] transition-colors hover:border-[#8d8d8a] focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-[3px] focus-visible:outline-[#f2f2f0]"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
          <path d="M5 5l14 14M19 5L5 19" />
        </svg>
      </button>
    </div>
  );
}

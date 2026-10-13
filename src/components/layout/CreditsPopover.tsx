"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";

/** Distância mínima do popover às bordas da tela. */
const EDGE = 16;

/**
 * Link discreto "Créditos 3D" do rodapé: abre, acima dele, um popover pequeno
 * com os créditos completos dos modelos 3D (CC BY 4.0). O conteúdo fica sempre
 * no HTML (só escondido com `hidden`), então a atribuição existe mesmo sem JS.
 * Fecha com clique fora, Esc (o foco volta ao botão) ou tocando de novo no
 * link. No celular, o popover é deslocado para não vazar da tela.
 */
export default function CreditsPopover({ label, children }: { label: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLSpanElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const id = useId();

  const close = useCallback((focusTrigger = false) => {
    setOpen(false);
    if (focusTrigger) trigger.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!wrap.current?.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close(true);
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close]);

  // mantém o popover dentro da tela (desloca na horizontal)
  useLayoutEffect(() => {
    const el = panel.current;
    if (!open || !el) return;
    el.style.translate = "";
    const r = el.getBoundingClientRect();
    const vw = document.documentElement.clientWidth;
    const dx = r.right > vw - EDGE ? vw - EDGE - r.right : r.left < EDGE ? EDGE - r.left : 0;
    if (dx) el.style.translate = `${Math.round(dx)}px 0`;
  }, [open]);

  return (
    <span ref={wrap} className="relative inline-block">
      <button
        ref={trigger}
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
        className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#6B6B6B] underline-offset-2 transition-colors hover:underline focus-visible:underline focus-visible:outline-none"
      >
        {label}
      </button>
      <div
        ref={panel}
        id={id}
        role="dialog"
        aria-label={label}
        hidden={!open}
        className="absolute bottom-full left-0 z-50 mb-2 w-max max-w-[min(320px,calc(100vw-32px))] border border-[#222] bg-[#111] p-3 font-mono text-[11px] normal-case leading-relaxed tracking-normal text-[#C8C8C8] [&_a]:whitespace-nowrap [&_a]:underline [&_a]:underline-offset-2 [&_a:hover]:text-white"
      >
        {children}
      </div>
    </span>
  );
}

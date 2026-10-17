"use client";

import { useEffect } from "react";

/** Repassa a posição do mouse aos botões .lg-btn (variáveis --mx/--my do reflexo).
 *  Só mouse; o CSS esconde o reflexo no toque e com reduced motion. */
export default function GlassPointer({ rootId }: { rootId: string }) {
  useEffect(() => {
    const root = document.getElementById(rootId);
    if (!root || !window.matchMedia("(hover: hover) and (pointer: fine) and (min-width: 768px)").matches) return;
    const onMove = (e: PointerEvent) => {
      const el = (e.target as Element).closest<HTMLElement>(".lg-btn");
      if (!el) return;
      const r = el.getBoundingClientRect();
      el.style.setProperty("--mx", `${e.clientX - r.left}px`);
      el.style.setProperty("--my", `${e.clientY - r.top}px`);
    };
    root.addEventListener("pointermove", onMove, { passive: true });
    return () => root.removeEventListener("pointermove", onMove);
  }, [rootId]);
  return null;
}

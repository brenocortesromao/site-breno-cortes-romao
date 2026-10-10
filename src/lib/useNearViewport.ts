"use client";

import { useEffect, useState, type RefObject } from "react";

/**
 * true enquanto o elemento está na tela ou a até `margin` dela. Usado para
 * MONTAR canvases WebGL só perto da seção e desmontá-los (liberando o
 * contexto) quando ela fica longe, para nunca haver muitos contextos ativos.
 */
export function useNearViewport(ref: RefObject<Element | null>, margin = "100% 0px") {
  const [near, setNear] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setNear(e.isIntersecting), { rootMargin: margin });
    io.observe(el);
    return () => io.disconnect();
  }, [ref, margin]);
  return near;
}

"use client";

import { useEffect, useRef, type RefObject } from "react";

/**
 * Pré-carga de uma cena 3D: chama `load` UMA vez, quando a seção ANTERIOR à
 * seção de `ref` entra na tela (ex.: o urso do Sobre começa a baixar quando
 * "Trabalhos" aparece). Se a página já abriu mais abaixo (a anterior nunca
 * entra), chama quando a própria seção aparece.
 */
export function usePreloadBeforeSection(ref: RefObject<Element | null>, load: () => void) {
  const fn = useRef(load);
  useEffect(() => {
    fn.current = load;
  });
  useEffect(() => {
    const section = ref.current?.closest("section");
    if (!section) return;
    // seção anterior no documento (as seções podem estar dentro de wrappers)
    let prev: Element | null = section.previousElementSibling;
    let target: Element | null = null;
    while (prev && !target) {
      if (prev.matches("section")) target = prev;
      else {
        const inner = prev.querySelectorAll("section");
        if (inner.length) target = inner[inner.length - 1];
      }
      prev = prev.previousElementSibling;
    }
    let done = false;
    const io = new IntersectionObserver((entries) => {
      if (done || !entries.some((e) => e.isIntersecting)) return;
      done = true;
      io.disconnect();
      fn.current();
    });
    if (target) io.observe(target);
    io.observe(section);
    return () => io.disconnect();
  }, [ref]);
}

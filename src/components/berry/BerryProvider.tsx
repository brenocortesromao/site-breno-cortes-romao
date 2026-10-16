"use client";

import dynamic from "next/dynamic";
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import type { BerryConfig } from "./copy";

/**
 * Easter egg do Berry: contexto para abrir o jogo a partir do rodapé e do
 * cabeçalho. O jogo (overlay + canvas) só é baixado no primeiro clique
 * (next/dynamic, sem SSR): custo zero no carregamento do site. Ao fechar, o
 * foco volta para quem abriu.
 */
const loadOverlay = () => import("./BerryOverlay");
const BerryOverlay = dynamic(loadOverlay, { ssr: false });

type Ctx = {
  open: (trigger: HTMLElement | null) => void;
  /** Começa a baixar o jogo (hover/foco no gatilho). */
  warm: () => void;
};
const BerryContext = createContext<Ctx>({ open: () => {}, warm: () => {} });
export const useBerry = () => useContext(BerryContext);

export default function BerryProvider({ config, children }: { config: BerryConfig; children: ReactNode }) {
  const [isOpen, setOpen] = useState(false);
  const trigger = useRef<HTMLElement | null>(null);

  const open = useCallback((el: HTMLElement | null) => {
    trigger.current = el;
    setOpen(true);
  }, []);
  const warm = useCallback(() => void loadOverlay(), []);
  const close = useCallback(() => {
    setOpen(false);
    const el = trigger.current;
    trigger.current = null;
    // depois de o overlay sair do DOM
    requestAnimationFrame(() => el?.focus({ preventScroll: true }));
  }, []);
  const value = useMemo(() => ({ open, warm }), [open, warm]);

  return (
    <BerryContext.Provider value={value}>
      {children}
      {isOpen && <BerryOverlay config={config} onClose={close} />}
    </BerryContext.Provider>
  );
}

"use client";

import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";

// O endereço NÃO vai para o HTML nem para o payload do servidor: fica só
// neste módulo do cliente, em pedaços, e é montado na hora de usar.
const PARTS = [["breno", "romao"], ["gmail", "com"]] as const;
const address = () => `${PARTS[0].join(".")}${String.fromCharCode(64)}${PARTS[1].join(".")}`;

export type EmailMenuCopy = {
  /** aria-label do gatilho (ex.: "Enviar e-mail"). */
  label: string;
  subject: string;
  gmail: string;
  app: string;
  copy: string;
  copied: string;
};

/**
 * E-mail com menu de opções (popover), porque no Windows muita gente não tem
 * app de e-mail padrão e o `mailto:` sozinho não faz nada:
 *  - Abrir no Gmail (composição do Gmail na web, nova aba);
 *  - Abrir no app de e-mail (`mailto:` com assunto);
 *  - Copiar e-mail ("Copiado ✓" por 2 s).
 * Proteção contra spam: o endereço só é montado no cliente. Sem JavaScript, o
 * gatilho é um link para #contato (fallback acessível).
 * Teclado: Enter/Espaço abre e foca a 1ª opção; setas ↑/↓ navegam; Esc fecha
 * e devolve o foco ao gatilho; clicar fora ou sair com Tab fecha.
 * `align`: lado em que o menu se alinha ao gatilho.
 */
export default function EmailMenu({
  copy,
  className,
  wrapClassName = "",
  align = "right",
  children,
}: {
  copy: EmailMenuCopy;
  className?: string;
  /** Classes do contêiner do gatilho + menu (ex.: "h-full w-full"). */
  wrapClassName?: string;
  align?: "left" | "right";
  children: ReactNode;
}) {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLUListElement>(null);
  const id = useId();

  // eslint-disable-next-line react-hooks/set-state-in-effect -- troca o link de fallback pelo botão só no cliente
  useEffect(() => setMounted(true), []);

  const close = useCallback((focusTrigger = false) => {
    setOpen(false);
    if (focusTrigger) trigger.current?.focus();
  }, []);

  // fecha com clique fora e com Esc
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!wrap.current?.contains(e.target as Node)) close();
    };
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") close(true);
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    menu.current?.querySelector<HTMLElement>("[role=menuitem]")?.focus();
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close]);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(t);
  }, [copied]);

  const onMenuKey = (e: KeyboardEvent<HTMLUListElement>) => {
    const items = [...(menu.current?.querySelectorAll<HTMLElement>("[role=menuitem]") ?? [])];
    const i = items.indexOf(document.activeElement as HTMLElement);
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const n = items.length;
      items[(i + (e.key === "ArrowDown" ? 1 : n - 1)) % n]?.focus();
    } else if (e.key === "Tab") close();
  };

  const doCopy = async () => {
    const value = address();
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // sem a API (contexto não seguro etc.): cópia pelo método antigo
      const ta = document.createElement("textarea");
      ta.value = value;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    setCopied(true);
  };

  if (!mounted)
    return (
      <a href="#contato" aria-label={copy.label} className={className}>
        {children}
      </a>
    );

  const subject = encodeURIComponent(copy.subject);
  const item =
    "flex w-full items-center rounded-lg px-3 py-2.5 text-left text-sm text-foreground transition-colors hover:bg-foreground/10 focus-visible:bg-foreground/10 focus-visible:outline-none";

  return (
    <div ref={wrap} className={`relative ${wrapClassName}`}>
      <button
        ref={trigger}
        type="button"
        aria-label={copy.label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        onClick={() => setOpen((o) => !o)}
        className={className}
      >
        {children}
      </button>
      {open && (
        <ul
          ref={menu}
          id={id}
          role="menu"
          aria-label={copy.label}
          onKeyDown={onMenuKey}
          className={`absolute top-full z-50 mt-3 w-60 rounded-xl border border-silver/40 bg-surface/95 p-1.5 font-sans normal-case tracking-normal shadow-[0_18px_50px_rgba(0,0,0,0.55)] backdrop-blur-md mobile:backdrop-blur-none ${
            align === "right" ? "right-0" : "left-0"
          }`}
        >
          <li role="none">
            <a
              role="menuitem"
              href={`https://mail.google.com/mail/?view=cm&fs=1&to=${address()}&su=${subject}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => close()}
              className={item}
            >
              {copy.gmail}
            </a>
          </li>
          <li role="none">
            <a role="menuitem" href={`mailto:${address()}?subject=${subject}`} onClick={() => close()} className={item}>
              {copy.app}
            </a>
          </li>
          <li role="none">
            <button role="menuitem" type="button" onClick={doCopy} className={item}>
              <span aria-live="polite">{copied ? copy.copied : copy.copy}</span>
            </button>
          </li>
        </ul>
      )}
    </div>
  );
}

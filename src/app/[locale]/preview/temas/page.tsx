import type { CSSProperties } from "react";
import { notFound } from "next/navigation";
import MediaSlot from "@/components/MediaSlot";
import DraftBadge from "@/components/theme/DraftBadge";
import Section from "@/components/theme/Section";
import { THEME_ROLES, type ThemeName } from "@/components/theme/themes";

/*
 * Página TEMPORÁRIA de desenvolvimento (404 em produção) para escolher o
 * off-white: #ECEAE5 x variação mais quente. Remover após a decisão.
 * Textos fixos de propósito: não faz parte do site.
 */

function scoped(theme: ThemeName): CSSProperties {
  const vars = Object.fromEntries(THEME_ROLES.map((r) => [`--${r}`, `var(--${theme}-${r})`]));
  return { ...vars, background: "var(--bg)", color: "var(--fg)" } as CSSProperties;
}

function Sample({ theme, title, hex }: { theme: ThemeName; title: string; hex: string }) {
  return (
    <div style={scoped(theme)} className="flex min-h-svh flex-col justify-between px-6 py-28 md:px-10">
      <div className="flex items-center justify-between font-mono text-[11px] uppercase tracking-[0.28em] text-silver">
        <span>{title}</span>
        <span>{hex}</span>
      </div>
      <div>
        <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-silver">(02) O que é fractional</p>
        <h2 className="mt-6 text-[clamp(2.5rem,5.5vw,6rem)] leading-[0.95] tracking-[-0.055em]">
          <span className="block font-light">Liderança criativa</span>
          <span className="block font-semibold text-silver-gradient">sem contratação fixa.</span>
        </h2>
        <p className="mt-8 max-w-md text-sm leading-relaxed text-silver md:text-[15px]">
          Texto de apoio em grafite secundário, para conferir contraste e leitura em parágrafos
          longos sobre o off-white.
        </p>
        <div className="mt-8 flex items-center gap-4">
          <DraftBadge label="Provisório" />
          <span className="border-b border-foreground/60 pb-1 font-mono text-[11px] uppercase tracking-[0.28em]">
            Link de exemplo
          </span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 border-t border-line pt-6">
        <MediaSlot label="Foto" ratio="aspect-[4/3]" />
        <MediaSlot label="Foto" ratio="aspect-[4/3]" />
      </div>
    </div>
  );
}

function Demo({ theme, label }: { theme: ThemeName; label: string }) {
  return (
    <Section theme={theme} innerClassName="flex min-h-svh flex-col justify-center">
      <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-silver">{label}</p>
      <h2 className="mt-6 text-[clamp(2.5rem,7vw,7.5rem)] font-semibold leading-[0.95] tracking-[-0.055em]">
        Role para ver a cor mudar.
      </h2>
    </Section>
  );
}

export default function ThemePreview() {
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <main>
      <div className="grid md:grid-cols-2">
        <Sample theme="light" title="A — off-white" hex="#ECEAE5" />
        <Sample theme="light-warm" title="B — mais quente" hex="#EDE6DA" />
      </div>
      <Demo theme="dark" label="Escuro" />
      <Demo theme="light" label="Claro A · #ECEAE5" />
      <Demo theme="dark" label="Escuro" />
      <Demo theme="light-warm" label="Claro B · #EDE6DA" />
      <Demo theme="dark" label="Escuro" />
    </main>
  );
}

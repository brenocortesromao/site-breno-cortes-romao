import type { ReactNode } from "react";
import type { ThemeName } from "./themes";

/**
 * Seção padrão do site: ocupa no mínimo uma tela, com respiro proporcional à
 * viewport, e declara o próprio tema (o ThemeScroll faz a transição de cor).
 */
export default function Section({
  id,
  theme = "dark",
  label,
  fullScreen = true,
  className = "",
  innerClassName = "",
  children,
}: {
  id?: string;
  theme?: ThemeName;
  /** aria-label quando a seção não tem um título visível. */
  label?: string;
  /** false para faixas que não precisam ocupar uma tela inteira. */
  fullScreen?: boolean;
  className?: string;
  innerClassName?: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      data-theme={theme}
      aria-label={label}
      className={`relative z-10 ${fullScreen ? "min-h-svh" : ""} ${className}`}
    >
      <div
        className={`mx-auto w-full max-w-[1600px] px-6 py-[clamp(6rem,16vh,12rem)] md:px-12 ${innerClassName}`}
      >
        {children}
      </div>
    </section>
  );
}

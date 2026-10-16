"use client";

import { GamepadIcon } from "@/components/contact/icons";
import { useBerry } from "./BerryProvider";
import styles from "./BerryHeaderButton.module.css";

/** Ícone de controle no cabeçalho: abre o jogo do Berry (mesmo overlay do rodapé). */
export default function BerryHeaderButton({
  label,
  className,
  tipClassName,
}: {
  label: string;
  className: string;
  tipClassName: string;
}) {
  const { open, warm } = useBerry();
  return (
    <button
      type="button"
      aria-label={label}
      className={`${className} ${styles.btn}`}
      onClick={(e) => open(e.currentTarget)}
      onPointerEnter={warm}
      onFocus={warm}
    >
      <GamepadIcon className={`h-[18px] w-[18px] ${styles.icon}`} />
      <span aria-hidden="true" className={tipClassName}>
        {label}
      </span>
    </button>
  );
}

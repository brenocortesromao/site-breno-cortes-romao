import EmailLink from "./EmailLink";
import { MailIcon, WhatsAppIcon } from "./icons";

const link =
  "group relative grid h-8 w-8 place-items-center text-silver transition-[color,filter] duration-300 hover:text-foreground hover:[filter:drop-shadow(0_0_6px_color-mix(in_srgb,var(--fg)_45%,transparent))] focus-visible:text-foreground";
/** Dica discreta sob o ícone (hover / foco pelo teclado). */
const tip =
  "pointer-events-none absolute left-1/2 top-full mt-2 -translate-x-1/2 whitespace-nowrap font-mono text-[9px] uppercase tracking-[0.22em] text-silver opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100";

/**
 * Ícones de contato do cabeçalho (depois do seletor PT/EN), em todas as
 * larguras: WhatsApp (mensagem pré-preenchida, nova aba) e e-mail (montado no
 * cliente, ver EmailLink). Contorno fino ~18px, prata como o menu, brilho
 * suave e dica no hover.
 */
export default function HeaderContact({
  whatsappHref,
  whatsappLabel,
  emailLabel,
  emailSubject,
}: {
  whatsappHref: string;
  whatsappLabel: string;
  emailLabel: string;
  emailSubject: string;
}) {
  return (
    <ul className="flex items-center gap-1">
      <li>
        <a href={whatsappHref} target="_blank" rel="noopener noreferrer" aria-label={whatsappLabel} className={link}>
          <WhatsAppIcon className="h-[18px] w-[18px]" />
          <span aria-hidden="true" className={tip}>
            WhatsApp
          </span>
        </a>
      </li>
      <li>
        <EmailLink subject={emailSubject} label={emailLabel} className={link}>
          <MailIcon className="h-[18px] w-[18px]" />
          <span aria-hidden="true" className={tip}>
            E-mail
          </span>
        </EmailLink>
      </li>
    </ul>
  );
}

import EmailMenu, { type EmailMenuCopy } from "./EmailMenu";
import BerryHeaderButton from "@/components/berry/BerryHeaderButton";
import { MailIcon, WhatsAppIcon } from "./icons";

const link =
  "group relative grid h-8 w-8 place-items-center text-silver transition-[color,filter] duration-300 hover:text-foreground hover:[filter:drop-shadow(0_0_6px_color-mix(in_srgb,var(--fg)_45%,transparent))] focus-visible:text-foreground";
/** Dica discreta sob o ícone (hover / foco pelo teclado). */
const tip =
  "pointer-events-none absolute left-1/2 top-full mt-2 -translate-x-1/2 whitespace-nowrap font-mono text-[9px] uppercase tracking-[0.22em] text-silver opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100 group-aria-expanded:hidden";

/**
 * Ícones de contato do cabeçalho (depois do seletor PT/EN), em todas as
 * larguras: WhatsApp (mensagem pré-preenchida, nova aba) e e-mail (menu com
 * Gmail, app de e-mail e copiar; endereço montado no cliente, ver EmailMenu) e o
 * controle de videogame, que abre o jogo do Berry (easter egg).
 * Contorno fino ~18px, prata como o menu, brilho suave e dica no hover.
 */
export default function HeaderContact({
  whatsappHref,
  whatsappLabel,
  email,
  berryLabel,
}: {
  whatsappHref: string;
  whatsappLabel: string;
  email: EmailMenuCopy;
  berryLabel: string;
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
        <EmailMenu copy={email} className={link}>
          <MailIcon className="h-[18px] w-[18px]" />
          <span aria-hidden="true" className={tip}>
            E-mail
          </span>
        </EmailMenu>
      </li>
      <li>
        <BerryHeaderButton label={berryLabel} className={link} tipClassName={tip} />
      </li>
    </ul>
  );
}

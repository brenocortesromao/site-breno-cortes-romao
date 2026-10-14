/**
 * Canais de contato — um só lugar para trocar quando os dados definitivos
 * chegarem. Vazio = item [PENDENTE] (aparece desativado, com selo discreto).
 */
export const contactConfig = {
  /** E-mail: NÃO fica aqui (iria para o HTML). É montado no cliente por
   *  components/contact/EmailMenu.tsx (proteção contra spam). */
  /** WhatsApp (DDI + DDD + número, só dígitos). */
  whatsapp: "5511975415501",
  /** Mídia kit em /public/midia-kit: versão wide (desktop) e 4:5 (celular e toque). */
  mediaKit: {
    desktop: "/midia-kit/midia-kit-breno-cortes-romao.pdf",
    mobile: "/midia-kit/midia-kit-breno-cortes-romao-mobile.pdf",
  },
};

/** Link do WhatsApp com a mensagem pré-preenchida. */
export const whatsappUrl = (text: string) => `https://wa.me/${contactConfig.whatsapp}?text=${encodeURIComponent(text)}`;

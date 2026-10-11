/**
 * Canais de contato — um só lugar para trocar quando os dados definitivos
 * chegarem. Vazio = item [PENDENTE] (aparece desativado, com selo discreto).
 */
export const contactConfig = {
  /** Link de agendamento no Cal.com. PROVISÓRIO até o dono enviar o link dele. */
  calUrl: "https://cal.com",
  calProvisional: true,
  /** E-mail: NÃO fica aqui (iria para o HTML). É montado no cliente por
   *  components/contact/EmailLink.tsx (proteção contra spam). */
  /** WhatsApp (DDI + DDD + número, só dígitos). */
  whatsapp: "5511975415501",
  /** Mídia kit em /public (ex.: "/midia-kit.pdf"). [PENDENTE] */
  mediaKit: "",
};

/** Link do WhatsApp com a mensagem pré-preenchida. */
export const whatsappUrl = (text: string) => `https://wa.me/${contactConfig.whatsapp}?text=${encodeURIComponent(text)}`;

/** Textos do jogo do Berry (namespace "berry" das mensagens), enviados do servidor como props. */
export const berryKeys = [
  "title",
  "close",
  "gameLabel",
  "teaser",
  "help",
  "helpLabel",
  "play",
  "o1Title",
  "o1Text",
  "o2Title",
  "o2Text",
  "o3Title",
  "o3Text",
  "skip",
  "next",
  "start",
  "resume",
  "bar",
  "km",
  "overLabel",
  "overText",
  "winLabel",
  "winText",
  "again",
  "talk",
  "best",
  "score",
] as const;

export type BerryCopy = Record<(typeof berryKeys)[number], string>;

export type BerryConfig = {
  copy: BerryCopy;
  /** Código do idioma (para o separador de milhar dos km). */
  locale: string;
  /** Link do WhatsApp com a mensagem do jogo. */
  whatsappHref: string;
};

import type messages from "./messages/pt.json";
import type { routing } from "./i18n/routing";

// Chaves de tradução e idiomas tipados: o português é a referência; o en.json
// precisa ter exatamente a mesma estrutura.
declare module "next-intl" {
  interface AppConfig {
    Locale: (typeof routing.locales)[number];
    Messages: typeof messages;
  }
}

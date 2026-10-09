import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

// Next 16: o antigo middleware.ts agora se chama proxy.ts.
export default createMiddleware(routing);

export const config = {
  // Tudo, exceto API, internos do Next/Vercel e arquivos com extensão (imagens, PDF, favicon...).
  matcher: "/((?!api|trpc|_next|_vercel|.*\\..*).*)",
};

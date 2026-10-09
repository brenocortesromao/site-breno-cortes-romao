import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

/** Link/rotas cientes do idioma: use estes em vez de next/link para páginas internas. */
export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing);

import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export default async function NotFound() {
  const t = await getTranslations("notFound");

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-[1600px] flex-col justify-end px-6 pb-16 md:px-12">
      <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-silver">404</p>
      <h1 className="mt-6 text-[clamp(2.5rem,9vw,8rem)] font-semibold leading-[0.95] tracking-[-0.055em]">
        {t("title")}
      </h1>
      <Link
        href="/"
        className="mt-12 w-fit border-b border-foreground/60 pb-1 font-mono text-[11px] uppercase tracking-[0.28em]"
      >
        {t("back")}
      </Link>
    </main>
  );
}

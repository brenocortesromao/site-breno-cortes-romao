import Hero from "./components/Hero";
import MediaSlot from "./components/MediaSlot";

/* ------------------------------------------------------------------ *
 * CONTEÚDO
 * Para integrar material real, basta preencher `image` / `src` com um
 * caminho dentro de /public (ex.: "/images/cases/aurora.jpg"). Enquanto
 * estiver vazio, o layout mostra um espaço reservado com a mesma proporção.
 * ------------------------------------------------------------------ */

const nav = [
  { label: "Manifesto", href: "#manifesto" },
  { label: "Serviços", href: "#servicos" },
  { label: "Projetos", href: "#projetos" },
  { label: "Contato", href: "#contato" },
];

/** Logos de clientes: use `src` (SVG/PNG branco ou transparente) quando tiver. */
const clients: { name: string; src?: string }[] = [
  { name: "Cliente 01" },
  { name: "Cliente 02" },
  { name: "Cliente 03" },
  { name: "Cliente 04" },
  { name: "Cliente 05" },
  { name: "Cliente 06" },
];

const services = [
  {
    n: "01",
    title: "Branding",
    text: "Identidade, verbal e visual, construída a partir de um ponto de vista claro. Marcas que se reconhecem sem precisar de logotipo.",
    items: ["Plataforma de marca", "Identidade visual", "Voz e linguagem"],
  },
  {
    n: "02",
    title: "Estratégia",
    text: "Posicionamento, narrativa e direção criativa. Decidimos o que dizer antes de decidir como mostrar.",
    items: ["Posicionamento", "Arquitetura de marca", "Direção criativa"],
  },
  {
    n: "03",
    title: "Experiências digitais",
    text: "Sites, produtos e sistemas desenhados com o mesmo rigor de uma peça editorial, do primeiro pixel à última interação.",
    items: ["Design de sites", "Design systems", "Campanhas digitais"],
  },
];

const projects: {
  n: string;
  name: string;
  kind: string;
  image?: string;
  span: string;
  ratio: string;
}[] = [
  {
    n: "01",
    name: "Aurora",
    kind: "Branding · 2025",
    span: "md:col-span-7",
    ratio: "aspect-[4/5]",
  },
  {
    n: "02",
    name: "Meridiano",
    kind: "Estratégia · 2025",
    span: "md:col-span-4 md:col-start-9 md:mt-40",
    ratio: "aspect-[3/4]",
  },
  {
    n: "03",
    name: "Nocturne",
    kind: "Experiência digital · 2024",
    span: "md:col-span-5 md:col-start-2",
    ratio: "aspect-square",
  },
  {
    n: "04",
    name: "Atlas Studio",
    kind: "Branding · 2024",
    span: "md:col-span-6 md:col-start-7 md:mt-28",
    ratio: "aspect-[16/11]",
  },
];

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-silver">
      {children}
    </p>
  );
}

export default function Home() {
  return (
    <>
      {/* Cabeçalho */}
      <header className="absolute inset-x-0 top-0 z-20">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between px-6 py-7 md:px-12">
          <a
            href="#"
            className="font-mono text-xs uppercase tracking-[0.3em]"
            aria-label="Início"
          >
            Estúdio<span className="text-silver"> / Criativo</span>
          </a>
          <nav aria-label="Principal" className="hidden md:block">
            <ul className="flex gap-10">
              {nav.map((item) => (
                <li key={item.href}>
                  <a
                    href={item.href}
                    className="font-mono text-[11px] uppercase tracking-[0.28em] text-silver transition-colors hover:text-foreground"
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          <a
            href="#contato"
            className="font-mono text-[11px] uppercase tracking-[0.28em] border-b border-foreground/60 pb-1 md:hidden"
          >
            Contato
          </a>
        </div>
      </header>

      <main>
        {/* Hero */}
        <Hero />

        {/* Clientes */}
        <section
          aria-label="Clientes"
          className="mx-auto max-w-[1600px] px-6 md:px-12"
        >
          <div className="grid items-center gap-8 border-y border-line py-10 md:grid-cols-12 md:py-12">
            <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-silver md:col-span-3">
              Marcas com as quais trabalhei
            </p>
            <ul className="grid grid-cols-3 gap-x-6 gap-y-8 md:col-span-9 md:grid-cols-6">
              {clients.map((c) => (
                <li
                  key={c.name}
                  className="flex h-10 items-center justify-center border border-dashed border-white/15 font-mono text-[9px] uppercase tracking-[0.2em] text-silver/60"
                >
                  {/* Quando houver logo: <Image src={c.src} alt={c.name} width={120} height={40} className="h-8 w-auto opacity-70" /> */}
                  {c.src ? c.name : "Logo"}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Manifesto */}
        <section
          id="manifesto"
          className="mx-auto max-w-[1600px] px-6 py-28 md:px-12 md:py-48"
        >
          <div className="grid gap-12 md:grid-cols-12 md:gap-8">
            <div className="md:col-span-3">
              <Eyebrow>(01) Manifesto</Eyebrow>
              {/* Retrato do diretor: proporção vertical, alinhado à coluna esquerda */}
              <MediaSlot
                label="Retrato"
                ratio="aspect-[3/4]"
                sizes="(min-width: 768px) 22vw, 60vw"
                className="mt-10 hidden w-full max-w-[18rem] md:block"
              />
            </div>
            <div className="md:col-span-8 md:col-start-5">
              <p className="text-[clamp(1.9rem,4.4vw,4.4rem)] font-medium leading-[1.06] tracking-[-0.045em]">
                Design não é decoração.{" "}
                <span className="font-light text-silver">
                  É a forma mais precisa de dizer quem você é
                </span>{" "}
                — e de decidir o que fica de fora.
              </p>
              <div className="mt-12 grid gap-10 md:mt-20 md:grid-cols-8">
                <p className="max-w-md text-sm leading-relaxed text-silver md:col-span-4 md:col-start-5">
                  Acredito em menos ruído e mais intenção. Cada linha, silêncio
                  e espaço em branco é uma decisão. O resultado: marcas calmas,
                  confiantes e impossíveis de confundir.
                </p>
                <MediaSlot
                  label="Retrato"
                  ratio="aspect-[4/5]"
                  sizes="60vw"
                  className="w-3/5 md:hidden"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Serviços */}
        <section
          id="servicos"
          className="mx-auto max-w-[1600px] px-6 pb-28 md:px-12 md:pb-48"
        >
          <div className="mb-14 flex items-end justify-between md:mb-24">
            <Eyebrow>(02) Serviços</Eyebrow>
            <h2 className="hidden text-[clamp(3rem,7vw,7rem)] font-semibold leading-none tracking-[-0.06em] text-silver md:block">
              O que faço
            </h2>
          </div>

          <ul className="border-t border-line">
            {services.map((s) => (
              <li
                key={s.n}
                className="group grid gap-6 border-b border-line py-10 transition-colors duration-500 hover:bg-white/[0.02] md:grid-cols-12 md:gap-8 md:py-16"
              >
                <span className="font-mono text-xs text-silver md:col-span-1">
                  {s.n}
                </span>
                <h3 className="text-[clamp(2.25rem,5.6vw,5.5rem)] font-semibold leading-[0.95] tracking-[-0.055em] transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-2 md:col-span-7">
                  {s.title}
                </h3>
                <div className="md:col-span-4">
                  <p className="text-sm leading-relaxed text-silver">
                    {s.text}
                  </p>
                  <ul className="mt-6 space-y-2 font-mono text-[11px] uppercase tracking-[0.2em]">
                    {s.items.map((i) => (
                      <li key={i}>— {i}</li>
                    ))}
                  </ul>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* Projetos */}
        <section
          id="projetos"
          className="mx-auto max-w-[1600px] px-6 pb-28 md:px-12 md:pb-48"
        >
          <div className="mb-14 flex items-end justify-between md:mb-24">
            <Eyebrow>(03) Projetos selecionados</Eyebrow>
            <span className="font-mono text-[11px] uppercase tracking-[0.28em] text-silver">
              2024 — 2025
            </span>
          </div>

          <div className="grid gap-x-8 gap-y-16 md:grid-cols-12">
            {projects.map((p) => (
              <article key={p.name} className={`group ${p.span}`}>
                <MediaSlot
                  src={p.image}
                  alt={`Imagem do projeto ${p.name}`}
                  label={`Case · ${p.name}`}
                  ratio={p.ratio}
                  sizes="(min-width: 768px) 55vw, 100vw"
                />
                <div className="mt-5 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <h3 className="text-3xl font-semibold tracking-[-0.045em] md:text-4xl lg:text-5xl">
                    <span className="mr-3 font-mono text-[11px] font-normal tracking-[0.2em] text-silver align-middle">
                      {p.n}
                    </span>
                    {p.name}
                  </h3>
                  <p className="text-right font-mono text-[11px] uppercase tracking-[0.2em] text-silver">
                    {p.kind}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* Contato */}
        <section
          id="contato"
          className="relative overflow-hidden border-t border-line"
        >
          <div className="mx-auto max-w-[1600px] px-6 py-28 md:px-12 md:py-48">
            <Eyebrow>(04) Contato</Eyebrow>
            <h2 className="mt-10 text-[clamp(2.75rem,11vw,11.5rem)] leading-[0.9] tracking-[-0.06em]">
              <span className="block font-light">Vamos criar</span>
              <span className="block font-semibold text-silver-gradient md:pl-[12vw]">
                algo raro?
              </span>
            </h2>
            <div className="mt-16 flex flex-col gap-10 md:mt-24 md:flex-row md:items-end md:justify-between">
              <a
                href="mailto:ola@seudominio.com"
                className="w-fit border-b border-foreground/60 pb-2 text-xl tracking-[-0.02em] transition-colors hover:border-foreground md:text-3xl"
              >
                ola@seudominio.com
              </a>
              <ul className="flex gap-8 font-mono text-[11px] uppercase tracking-[0.28em] text-silver">
                <li>
                  <a href="#" className="hover:text-foreground">
                    Instagram
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-foreground">
                    LinkedIn
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-foreground">
                    Behance
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-[1600px] flex-col gap-2 px-6 py-6 font-mono text-[10px] uppercase tracking-[0.25em] text-silver md:flex-row md:justify-between md:px-12">
          <span>© 2026 Todos os direitos reservados</span>
          <span>Branding · Estratégia · Digital</span>
        </div>
      </footer>
    </>
  );
}

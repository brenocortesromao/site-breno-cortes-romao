import Image from "next/image";

type MediaSlotProps = {
  /** Caminho em /public (ex.: "/images/retrato.jpg"). Sem `src`, mostra o espaço reservado. */
  src?: string;
  alt?: string;
  /** Classe de proporção do Tailwind, ex.: "aspect-[4/5]". */
  ratio?: string;
  /** Rótulo do espaço reservado, ex.: "Retrato". */
  label: string;
  /** Atributo `sizes` do next/image, para carregar o tamanho certo em cada tela. */
  sizes?: string;
  priority?: boolean;
  /** "mono": tratamento monocromático grafite/prata (retratos). */
  tone?: "natural" | "mono";
  className?: string;
};

/**
 * Moldura única para fotografias e imagens de trabalhos. Hoje renderiza um espaço
 * reservado; ao passar `src`, a mesma moldura exibe a imagem real (com zoom
 * lento no hover quando o ancestral tem a classe `group`). Cores pelas
 * variáveis de tema, então funciona em seções claras e escuras.
 */
export default function MediaSlot({
  src,
  alt = "",
  ratio = "aspect-[4/5]",
  label,
  sizes = "(min-width: 768px) 50vw, 100vw",
  priority,
  tone = "natural",
  className = "",
}: MediaSlotProps) {
  return (
    <div className={`${ratio} relative overflow-hidden border border-line bg-surface ${className}`}>
      {src ? (
        <>
          <Image
            src={src}
            alt={alt}
            fill
            sizes={sizes}
            priority={priority}
            className={`object-cover transition-transform duration-[1200ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.04] ${
              tone === "mono" ? "media-mono" : ""
            }`}
          />
          {tone === "mono" && (
            // véu grafite→prata: puxa a foto para a paleta do site
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#c9cdd3]/10 via-transparent to-[#141518]/45 mix-blend-soft-light"
            />
          )}
        </>
      ) : (
        <div aria-hidden="true" className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-foreground/[0.07] via-transparent to-transparent" />
          {/* marcas de corte nos cantos, como num contact sheet */}
          <span className="absolute left-3 top-3 h-3 w-3 border-l border-t border-foreground/30" />
          <span className="absolute right-3 top-3 h-3 w-3 border-r border-t border-foreground/30" />
          <span className="absolute bottom-3 left-3 h-3 w-3 border-b border-l border-foreground/30" />
          <span className="absolute bottom-3 right-3 h-3 w-3 border-b border-r border-foreground/30" />
          <span className="absolute bottom-4 left-6 font-mono text-[10px] uppercase tracking-[0.25em] text-silver">
            {label}
          </span>
        </div>
      )}
    </div>
  );
}

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
  className?: string;
};

/**
 * Moldura única para fotografias e imagens de cases. Hoje renderiza um espaço
 * reservado; ao passar `src`, a mesma moldura exibe a imagem real (com zoom
 * lento no hover quando o ancestral tem a classe `group`).
 */
export default function MediaSlot({
  src,
  alt = "",
  ratio = "aspect-[4/5]",
  label,
  sizes = "(min-width: 768px) 50vw, 100vw",
  priority,
  className = "",
}: MediaSlotProps) {
  return (
    <div
      className={`${ratio} relative overflow-hidden border border-line bg-[#0b0b0c] ${className}`}
    >
      {src ? (
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          priority={priority}
          className="object-cover transition-transform duration-[1200ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.04]"
        />
      ) : (
        <div aria-hidden="true" className="absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(120%_90%_at_20%_10%,rgb(255_255_255/0.09),transparent_60%)]" />
          {/* marcas de corte nos cantos, como num contact sheet */}
          <span className="absolute left-3 top-3 h-3 w-3 border-l border-t border-white/30" />
          <span className="absolute right-3 top-3 h-3 w-3 border-r border-t border-white/30" />
          <span className="absolute bottom-3 left-3 h-3 w-3 border-b border-l border-white/30" />
          <span className="absolute bottom-3 right-3 h-3 w-3 border-b border-r border-white/30" />
          <span className="absolute bottom-4 left-6 font-mono text-[10px] uppercase tracking-[0.25em] text-silver/70">
            {label}
          </span>
        </div>
      )}
    </div>
  );
}

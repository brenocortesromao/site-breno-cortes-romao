/** Selo discreto para conteúdo provisório (texto, número ou imagem ainda não definitivos). */
export default function DraftBadge({ label, className = "" }: { label: string; className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-2 border border-dashed border-line px-2 py-1 font-mono text-[9px] uppercase tracking-[0.22em] text-silver ${className}`}
    >
      <span aria-hidden="true" className="h-1 w-1 rounded-full bg-silver" />
      {label}
    </span>
  );
}

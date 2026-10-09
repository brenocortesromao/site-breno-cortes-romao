/**
 * Número gigante estilo odômetro (renderizado no servidor, estado FINAL no HTML).
 * - Leitura/SEO: o valor completo ("+313%") fica em texto real (sr-only); a
 *   parte visual é aria-hidden.
 * - Cada dígito é uma coluna com a faixa 0–9 duas vezes, já posicionada no
 *   dígito final (índice 10 + d) — sem JS, mostra o número certo. O GSAP
 *   (Fractional) rola as faixas a partir do 0 com stagger.
 * - Dígitos em grafite polido (gradiente vertical repetido por linha, via
 *   background-clip:text); "+" e "%" menores, como expoente, em grafite médio.
 * - Camada de reflexo (data-odo-shine): as mesmas cifras com uma faixa de
 *   luz que atravessa uma vez depois da rolagem.
 */
const STRIP = [...Array(20)].map((_, i) => i % 10);

export default function OdometerNumber({
  prefix,
  value,
  suffix,
}: {
  prefix: string;
  value: number;
  suffix: string;
}) {
  const digits = String(value).split("").map(Number);
  const exp = "relative -top-[0.08em] align-top text-[0.34em] font-light tracking-normal text-silver";

  return (
    <p className="text-[clamp(5rem,12.5vw,11.5rem)] font-light leading-none tracking-[-0.04em]">
      <span className="sr-only">{`${prefix}${value}${suffix}`}</span>
      <span aria-hidden="true" className="flex items-start">
        {prefix && <span className={`${exp} mr-[0.04em]`}>{prefix}</span>}
        <span className="relative inline-flex tabular-nums">
          {digits.map((d, i) => (
            <span key={i} className="inline-block h-[1em] overflow-hidden">
              <span
                data-odo-strip
                data-final={10 + d}
                className="odo-metal block"
                style={{ transform: `translateY(-${10 + d}em)` }}
              >
                {STRIP.map((n, k) => (
                  <span key={k} className="block h-[1em]">
                    {n}
                  </span>
                ))}
              </span>
            </span>
          ))}
          {/* reflexo: mesmas cifras, só a faixa de luz aparece (opacidade 0 até animar) */}
          <span data-odo-shine className="odo-shine pointer-events-none absolute inset-0 opacity-0">
            {digits.join("")}
          </span>
        </span>
        {suffix && <span className={`${exp} ml-[0.04em]`}>{suffix}</span>}
      </span>
    </p>
  );
}

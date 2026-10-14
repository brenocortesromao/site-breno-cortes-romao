"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode, type Ref } from "react";

/**
 * "Cartão de vidro" (CSS 3D, sem WebGL): com o mouse sobre o cartão, ele
 * inclina na direção do cursor (perspective 1000px, até MAX_DEG, com lerp
 * suave) e volta ao centro quando o mouse sai. Um reflexo prata translúcido
 * (gradiente, opacidade baixa, mix-blend-mode: screen) atravessa a superfície
 * acompanhando a inclinação, sem esconder o conteúdo.
 * Profundidade: `front` fica numa camada à frente (translateZ), então se move
 * diferente da foto quando o cartão inclina.
 * Mobile (toque): inclinação leve com o scroll ou com o giroscópio (só onde
 * não exige permissão), reflexo fraco. prefers-reduced-motion: nada se move.
 * `ref` vai no contêiner externo, que NÃO gira (medidas estáveis para o
 * ScrollTrigger de quem usa o cartão como gatilho).
 * Formato: o cartão em si não é recortado (overflow/clip achatariam o 3D e
 * cortariam `front`); o filho se recorta sozinho e o reflexo usa `shape` (a
 * mesma máscara do filho). `overlay` fica por cima do reflexo e abaixo de
 * `front` (ex.: a borda fina da moldura).
 * `active={false}` desliga o efeito (ex.: durante a entrada da foto).
 * `touchMode="glare"`: no toque, sem inclinação; o reflexo atravessa a foto
 * acompanhando o scroll (retrato do Sobre).
 */

const MAX_DEG = 7;
const FRONT_Z = 60; // px à frente da foto

export default function TiltCard({
  ref,
  children,
  front,
  className = "",
  shape,
  overlay,
  active = true,
  touchMode = "tilt",
}: {
  ref?: Ref<HTMLDivElement>;
  children: ReactNode;
  /** Camada à frente da foto (ex.: a assinatura), em posição absoluta. */
  front?: ReactNode;
  className?: string;
  /** Recorte do reflexo (a mesma máscara CSS do conteúdo). */
  shape?: CSSProperties;
  /** Camada sobre a foto e o reflexo, abaixo de `front`. */
  overlay?: ReactNode;
  /** false: sem inclinação nem reflexo (até a entrada terminar). */
  active?: boolean;
  /** Toque: "tilt" (inclina com scroll/giroscópio) ou "glare" (só o reflexo passa com o scroll). */
  touchMode?: "tilt" | "glare";
}) {
  const card = useRef<HTMLDivElement>(null);
  const glare = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = card.current;
    const shine = glare.current;
    if (!el || !shine || !active) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const touch = window.matchMedia("(pointer: coarse)").matches;
    const glareOnly = touch && touchMode === "glare";

    const target = { x: 0, y: 0 }; // -1..1 (x: direita, y: baixo)
    const cur = { x: 0, y: 0 };
    let raf = 0;
    let last = performance.now();

    const render = () => {
      if (glareOnly) {
        // faixa de luz atravessando na diagonal: fora à esquerda (quadro embaixo
        // da tela) até fora à direita (quadro no alto)
        const p = 50 + cur.y * 60;
        shine.style.backgroundPosition = `${p}% ${p}%`;
        shine.style.opacity = "0.7";
        return;
      }
      el.style.transform = `rotateX(${(-cur.y * MAX_DEG).toFixed(3)}deg) rotateY(${(cur.x * MAX_DEG).toFixed(3)}deg)`;
      // o reflexo corre na direção oposta à inclinação, como luz fixa num vidro
      shine.style.backgroundPosition = `${50 - cur.x * 40}% ${50 - cur.y * 40}%`;
      const strength = Math.min(1, Math.hypot(cur.x, cur.y));
      shine.style.opacity = String((touch ? 0.25 : 1) * (0.25 + 0.75 * strength));
    };
    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const k = 1 - Math.exp(-dt * 7);
      cur.x += (target.x - cur.x) * k;
      cur.y += (target.y - cur.y) * k;
      render();
      if (Math.abs(target.x - cur.x) + Math.abs(target.y - cur.y) > 0.001) raf = requestAnimationFrame(tick);
      else raf = 0;
    };
    const kick = () => {
      if (!raf) {
        last = performance.now();
        raf = requestAnimationFrame(tick);
      }
    };

    const off: (() => void)[] = [];
    /**
     * Toque: o scroll só é lido com o cartão perto da tela e no máximo uma vez
     * por quadro (ler a posição a cada evento de scroll forçava layout no meio
     * da rolagem). Devolve a limpeza.
     */
    const onScrollNear = (fn: () => void) => {
      let pending = 0;
      let near = false;
      const run = () => {
        pending = 0;
        fn();
      };
      const onScroll = () => {
        if (near && !pending) pending = requestAnimationFrame(run);
      };
      const io = new IntersectionObserver(
        ([e]) => {
          near = e.isIntersecting;
          if (near) onScroll();
        },
        { rootMargin: "50% 0px" },
      );
      io.observe(el);
      window.addEventListener("scroll", onScroll, { passive: true });
      return () => {
        io.disconnect();
        cancelAnimationFrame(pending);
        window.removeEventListener("scroll", onScroll);
      };
    };
    if (!touch) {
      const onMove = (e: PointerEvent) => {
        const r = el.getBoundingClientRect();
        target.x = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width) * 2 - 1));
        target.y = Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height) * 2 - 1));
        kick();
      };
      const onLeave = () => {
        target.x = 0;
        target.y = 0;
        kick();
      };
      el.addEventListener("pointermove", onMove);
      el.addEventListener("pointerleave", onLeave);
      off.push(() => {
        el.removeEventListener("pointermove", onMove);
        el.removeEventListener("pointerleave", onLeave);
      });
    } else if (glareOnly) {
      const onScroll = () => {
        const r = el.getBoundingClientRect();
        const mid = (r.top + r.height / 2) / window.innerHeight - 0.5; // -0.5..0.5
        target.y = Math.max(-1, Math.min(1, mid * 2));
        kick();
      };
      off.push(onScrollNear(onScroll));
      onScroll();
      cur.y = target.y; // começa já na posição do scroll, sem deslizar do centro
    } else {
      // toque: giroscópio se vier sem pedir permissão; senão, o scroll inclina
      let gyro = false;
      let base: { b: number; g: number } | null = null;
      const onOrient = (e: DeviceOrientationEvent) => {
        if (e.beta == null || e.gamma == null) return;
        gyro = true;
        base ??= { b: e.beta, g: e.gamma };
        target.x = Math.max(-1, Math.min(1, (e.gamma - base.g) / 25)) * 0.6;
        target.y = Math.max(-1, Math.min(1, (e.beta - base.b) / 25)) * 0.6;
        kick();
      };
      const onScroll = () => {
        if (gyro) return;
        const r = el.getBoundingClientRect();
        const mid = (r.top + r.height / 2) / window.innerHeight - 0.5; // -0.5..0.5
        target.x = 0;
        target.y = Math.max(-1, Math.min(1, mid)) * 0.6;
        kick();
      };
      window.addEventListener("deviceorientation", onOrient);
      off.push(onScrollNear(onScroll));
      onScroll();
      off.push(() => window.removeEventListener("deviceorientation", onOrient));
    }

    return () => {
      cancelAnimationFrame(raf);
      off.forEach((fn) => fn());
    };
  }, [active, touchMode]);

  return (
    <div ref={ref} className={`[perspective:1000px] ${className}`}>
      <div ref={card} className="relative will-change-transform [transform-style:preserve-3d]">
        {children}
        {/* reflexo prata translúcido sobre a foto (screen: só clareia, nunca esconde) */}
        <div
          ref={glare}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-0 mix-blend-screen motion-reduce:hidden"
          style={{
            ...shape,
            backgroundImage:
              "linear-gradient(115deg, transparent 30%, rgba(225,229,235,0.16) 46%, rgba(255,255,255,0.22) 50%, rgba(225,229,235,0.16) 54%, transparent 70%)",
            backgroundSize: "250% 250%",
            backgroundPosition: "50% 50%",
          }}
        />
        {overlay}
        {front && (
          <div className="pointer-events-none absolute inset-0" style={{ transform: `translateZ(${FRONT_Z}px)` }}>
            {front}
          </div>
        )}
      </div>
    </div>
  );
}

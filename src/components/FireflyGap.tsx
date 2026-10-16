"use client";

import { useEffect, useRef } from "react";
import "./FireflyGap.css";

/**
 * Vaga-lumes na faixa entre a foto e o texto do Sobre (só no desktop): 4 pontos
 * de luz âmbar bem claro, discretos, que flutuam devagar e acendem/apagam em
 * tempos diferentes. CSS puro (transform e opacity); pausam fora da tela e
 * ficam parados com prefers-reduced-motion. Decorativo (aria-hidden).
 * Deve ficar dentro da grade do Sobre (posição relative).
 */
const FLIES = [
  { x: 0.28, y: "16%", d: "17s", b: "5.5s", o: "-2s" },
  { x: 0.68, y: "27%", d: "21s", b: "4.2s", o: "-9s" },
  { x: 0.4, y: "39%", d: "19s", b: "6.4s", o: "-5s" },
  { x: 0.74, y: "50%", d: "23s", b: "5s", o: "-12s" },
];

export default function FireflyGap() {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => el.classList.toggle("ff-paused", !e.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div
      ref={root}
      aria-hidden="true"
      className={`ff-layer ff-paused pointer-events-none absolute inset-y-0 left-12 right-12 hidden lg:block`}
    >
      {FLIES.map((f, i) => (
        <span key={i} className={"ff-fly"} style={{ "--x": f.x, "--y": f.y, "--d": f.d, "--b": f.b, "--o": f.o } as React.CSSProperties} />
      ))}
    </div>
  );
}

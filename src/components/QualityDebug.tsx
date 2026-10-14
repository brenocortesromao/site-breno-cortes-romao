"use client";

import { useEffect, useState } from "react";
import { qualityDebugInfo } from "@/lib/quality";

type Info = ReturnType<typeof qualityDebugInfo> & { live: number };

/**
 * Diagnóstico da qualidade adaptativa (lib/quality.ts): só com ?debug=quality
 * na URL. Painel pequeno no canto com a taxa da tela, o nível de cada cena e o
 * fps (ao vivo e o da última janela do monitor). Sem o parâmetro, não renderiza
 * nada nem mede nada.
 */
export default function QualityDebug() {
  const [on, setOn] = useState(false);
  const [info, setInfo] = useState<Info | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- leitura única da URL no cliente
    setOn(new URLSearchParams(window.location.search).get("debug") === "quality");
  }, []);

  useEffect(() => {
    if (!on) return;
    let raf = 0;
    let frames = 0;
    let start = performance.now();
    let live = 0;
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      frames++;
      if (now - start >= 500) {
        live = (frames * 1000) / (now - start);
        frames = 0;
        start = now;
        setInfo({ ...qualityDebugInfo(), live });
      }
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [on]);

  if (!on || !info) return null;
  return (
    <div
      aria-hidden="true"
      translate="no"
      className="pointer-events-none fixed bottom-2 left-2 z-[9999] max-w-[calc(100vw-1rem)] rounded-md bg-black/80 px-2.5 py-2 font-mono text-[10px] leading-[1.45] text-white/90 shadow-lg ring-1 ring-white/15"
    >
      <div>
        tela {info.hz} Hz · {info.mobile ? "celular" : "desktop"} · aparelho {info.device}
        {info.reduced ? " · reduced motion" : ""}
      </div>
      <div>
        fps {Math.round(info.live)} ao vivo · {info.fps === null ? "monitor parado" : `${Math.round(info.fps)} (${info.window})`}
      </div>
      <div className="text-white/60">
        lento &lt; {Math.round(info.slow)} · estável &gt; {Math.round(info.good)}
        {info.mobile ? " · pôster < 30 (4×)" : ""}
      </div>
      {info.scenes.length === 0 ? (
        <div className="text-white/60">nenhuma cena montada</div>
      ) : (
        info.scenes.map((s) => (
          <div key={s.name} className={s.mounted ? "" : "text-white/45"}>
            {s.name === info.foreground ? "▸ " : "  "}
            {s.name}: {s.tier}
            {s.mounted ? "" : " (desmontada)"}
          </div>
        ))
      )}
    </div>
  );
}

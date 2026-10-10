"use client";

import { useEffect } from "react";
import { useThree } from "@react-three/fiber";

/**
 * Dentro de um <Canvas> do R3F: avisa `onLost` quando o navegador derruba o
 * contexto WebGL (ex.: limite de contextos, GPU reiniciada). O listener sai na
 * desmontagem, ANTES de o R3F liberar o contexto, então o descarte normal não
 * conta como perda.
 */
export default function ContextLossWatcher({ onLost }: { onLost?: () => void }) {
  const canvas = useThree((s) => s.gl.domElement);
  useEffect(() => {
    if (!onLost) return;
    const handle = (e: Event) => {
      e.preventDefault();
      onLost();
    };
    canvas.addEventListener("webglcontextlost", handle);
    return () => canvas.removeEventListener("webglcontextlost", handle);
  }, [canvas, onLost]);
  return null;
}

import gsap from "gsap";
import { lockScroll } from "@/components/SmoothScroll";

/**
 * Congela o site enquanto o jogo do Berry está aberto: nada renderiza por trás
 * (cenas 3D, GSAP, Lenis, laços próprios) e a rolagem fica travada.
 *
 * Como: `requestAnimationFrame` global passa a enfileirar os pedidos dos
 * outros códigos (R3F, three, laços de canvas) em vez de rodar; o jogo usa o
 * `rawRaf`, capturado antes de qualquer troca. Ao descongelar, a fila é
 * devolvida ao navegador e tudo retoma do mesmo ponto. O ticker do GSAP (que
 * move o Lenis e o ScrollTrigger) dorme e o Lenis para; a posição de rolagem
 * não muda.
 */
export const rawRaf: typeof requestAnimationFrame | null =
  typeof window !== "undefined" ? window.requestAnimationFrame.bind(window) : null;
const rawCancel = typeof window !== "undefined" ? window.cancelAnimationFrame.bind(window) : null;

let frozen = false;
let fake = 1_000_000_000;
const queue = new Map<number, FrameRequestCallback>();
/** Pedidos enfileirados que já voltaram ao navegador: id falso → id real. */
const resolved = new Map<number, number>();
let cancelPatched = false;

export function freezeSite() {
  if (frozen || !rawRaf || !rawCancel) return;
  frozen = true;
  if (!cancelPatched) {
    cancelPatched = true;
    window.cancelAnimationFrame = (id: number) => {
      if (queue.delete(id)) return;
      const real = resolved.get(id);
      if (real !== undefined) {
        resolved.delete(id);
        rawCancel(real);
      } else rawCancel(id);
    };
  }
  window.requestAnimationFrame = (cb: FrameRequestCallback) => {
    const id = ++fake;
    queue.set(id, cb);
    return id;
  };
  gsap.ticker.sleep();
  lockScroll(true);
}

export function unfreezeSite() {
  if (!frozen || !rawRaf) return;
  frozen = false;
  window.requestAnimationFrame = rawRaf;
  const pending = [...queue];
  queue.clear();
  for (const [id, cb] of pending) resolved.set(id, rawRaf(cb));
  gsap.ticker.wake();
  lockScroll(false);
}

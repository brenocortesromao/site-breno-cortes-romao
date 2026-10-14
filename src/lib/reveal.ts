import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { isMobileUI } from "./mobile";

gsap.registerPlugin(ScrollTrigger);

let watching = false;

/**
 * Recalcula as posições do ScrollTrigger quando o layout estabiliza: depois das
 * fontes (document.fonts.ready), depois do load da página e sempre que a altura
 * do <body> muda (cenas 3D montando/desmontando, imagens, acordeões...), com
 * debounce. Instalado uma vez, na primeira entrada registrada.
 */
function watchLayout() {
  if (watching || typeof window === "undefined") return;
  watching = true;
  let timer: number | undefined;
  const refresh = () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => ScrollTrigger.refresh(), 200);
  };
  document.fonts?.ready.then(refresh);
  if (document.readyState === "complete") refresh();
  else window.addEventListener("load", refresh, { once: true });
  let height = document.body.getBoundingClientRect().height;
  new ResizeObserver(() => {
    const h = document.body.getBoundingClientRect().height;
    if (Math.abs(h - height) < 1) return;
    height = h;
    refresh();
  }).observe(document.body);
}

/** "top 75%" → a mesma faixa da tela para o IntersectionObserver. */
function marginFor(start: string) {
  const m = /^top (\d+(?:\.\d+)?)%$/.exec(start);
  return m ? `0px 0px -${100 - Number(m[1])}% 0px` : "0px";
}

/**
 * Entrada que roda uma vez, sem nunca deixar o conteúdo preso invisível.
 * - Dispara pelo ScrollTrigger (`start`, refreshPriority -1: depois dos pins).
 * - Rede de segurança: se o gatilho está na faixa visível da tela há ~600 ms e a
 *   entrada ainda não rodou (posições calculadas antes do layout estabilizar),
 *   roda na hora.
 * - Se a página já está abaixo do gatilho (recarregou mais para baixo, rolagem
 *   rápida), chama `finish`: estado final direto, sem animação.
 * O estado inicial invisível deve ser aplicado (gsap.set) logo antes desta
 * chamada, no mesmo efeito. Retorna a limpeza.
 * Celular (modo curado), com início "top X%": só o IntersectionObserver, que
 * dispara na hora (sem ScrollTrigger: nada calculado a cada quadro da rolagem).
 */
export function revealOnce({
  trigger,
  start = "top 75%",
  play,
  finish,
  delay = 600,
}: {
  trigger: Element;
  start?: string;
  play: () => void;
  finish: () => void;
  delay?: number;
}) {
  watchLayout();
  let done = false;
  // o onEnter pode disparar dentro do próprio create (página já abaixo do início)
  const ref: { st?: ScrollTrigger } = {};
  let timer: number | undefined;
  const stop = () => {
    done = true;
    ref.st?.kill();
    io.disconnect();
    window.clearTimeout(timer);
  };
  const run = () => {
    if (done) return;
    stop();
    if (trigger.getBoundingClientRect().bottom <= 0) finish();
    else play();
  };
  const ioOnly = isMobileUI() && /^top \d/.test(start);
  const io = new IntersectionObserver(
    ([e]) => {
      window.clearTimeout(timer);
      if (!e.isIntersecting) return;
      if (ioOnly) run();
      else timer = window.setTimeout(run, delay);
    },
    { rootMargin: marginFor(start) },
  );
  io.observe(trigger);
  if (!ioOnly) {
    ref.st = ScrollTrigger.create({ trigger, start, once: true, refreshPriority: -1, onEnter: run });
    if (done) ref.st.kill();
  }
  if (!done && trigger.getBoundingClientRect().bottom <= 0) run();
  return stop;
}

/**
 * Celular (modo curado): a coreografia que no desktop é presa ao scroll
 * (scrub) vira uma entrada única ao aparecer, com a MESMA animação: a
 * timeline/tween (criada sem scrollTrigger) toca do início ao fim uma vez.
 * Retorna a limpeza.
 */
export function playOnce(
  anim: gsap.core.Animation,
  trigger: Element,
  { start = "top 80%", duration = 0.9, ease = "power2.out" }: { start?: string; duration?: number; ease?: string } = {},
) {
  anim.pause(0);
  return revealOnce({
    trigger,
    start,
    play: () => {
      gsap.to(anim, { progress: 1, duration, ease });
    },
    finish: () => {
      anim.progress(1);
    },
  });
}

/**
 * Celular (modo curado): camada de fundo que no desktop entra e sai em fade
 * preso ao scroll; aqui ela aparece/some com uma transição curta (0,5 s)
 * enquanto a seção está entre `start` e `end` (os meios dos fades do desktop).
 */
export function fadeWhileActive(layer: Element, trigger: Element, start: string, end: string) {
  gsap.set(layer, { opacity: 0 });
  return ScrollTrigger.create({
    trigger,
    start,
    end,
    refreshPriority: -1,
    onToggle: (self) => {
      gsap.to(layer, { opacity: self.isActive ? 1 : 0, duration: 0.5, ease: "power1.out", overwrite: true });
    },
  });
}

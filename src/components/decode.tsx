import { Fragment } from "react";
import gsap from "gsap";

/**
 * Efeito de DECODIFICAÇÃO letra por letra (A distância, E a IA?): cada letra
 * mostra caracteres aleatórios de "código" (Geist Mono, prata) numa camada
 * absoluta por cima da letra real, que fica no lugar como reserva invisível
 * (sem layout shift; quebras de linha iguais às da frase final), e trava na
 * letra certa da esquerda para a direita; ao travar, a letra aparece em
 * grafite e acende para branco. Depois, a palavra-chave (`highlight`) pode
 * receber um reflexo prata uma vez (`shine`, ver .text-shine-fixed).
 * Uso: o título recebe `data-decode`, `aria-label` com a frase inteira e
 * `translate="no"`; os filhos vêm de <DecodeLetters>. Estado inicial escondido
 * antes da hidratação: `.js-motion [data-decode] [data-ch]` (globals.css).
 */

/** Caracteres de "código" que passam por cada letra antes de ela travar. */
const GLYPHS = "#%&/<>=+*01ABCDEFGHIJKLMNOPQRSTUVWXYZ";
/** Letras surgem embaralhadas em APPEAR, a 1ª trava em LEAD e a última em
 * LEAD + SPREAD (s); cada uma acende de grafite a branco em FADE. */
const APPEAR = 0.2;
const LEAD = 0.3;
const SPREAD = 0.85;
const FADE = 0.45;
/** Intervalo entre trocas de caractere aleatório (s). */
const SWAP = 0.05;

type Char = { ch: string; key: boolean };

/** Divide a frase em palavras de letras e marca as letras da palavra-chave. */
function splitPhrase(text: string, highlight?: string): Char[][] {
  const start = highlight ? text.indexOf(highlight) : -1;
  const end = start + (highlight?.length ?? 0);
  let pos = 0;
  return text.split(" ").map((word) => {
    const chars = Array.from(word).map((ch) => {
      const c = { ch, key: start >= 0 && pos >= start && pos < end };
      pos += ch.length;
      return c;
    });
    pos += 1; // espaço
    return chars;
  });
}

/** Letras da frase: reserva real + camada do caractere aleatório (vazia no HTML). */
export function DecodeLetters({ text, highlight }: { text: string; highlight?: string }) {
  return splitPhrase(text, highlight).map((word, k) => (
    <Fragment key={k}>
      <span aria-hidden="true" className="inline-block whitespace-nowrap">
        {word.map((c, j) => (
          <span key={j} className="relative inline-block">
            <span data-ch data-key={c.key || undefined} className={`inline-block ${c.key ? "text-shine-fixed" : ""}`}>
              {c.ch}
            </span>
            <span className="pointer-events-none absolute inset-y-0 left-1/2 flex -translate-x-1/2 items-center font-mono text-[0.78em] font-normal tracking-normal text-silver" />
          </span>
        ))}
      </span>{" "}
    </Fragment>
  ));
}

const randomGlyph = () => GLYPHS[Math.floor(Math.random() * GLYPHS.length)];

/** Esconde as letras até a decodificação (chamar ao montar, sem reduced motion). */
export function hideLetters(phrase: HTMLElement) {
  gsap.set(phrase.querySelectorAll("[data-ch]"), { opacity: 0 });
}

/** Mostra as letras prontas, sem decodificação (página já abaixo da frase). */
export function showLetters(phrase: HTMLElement) {
  gsap.set(phrase.querySelectorAll("[data-ch]"), { opacity: 1 });
}

/**
 * Decodifica uma frase (~1,6 s). Chama `onDone` quando a última letra termina
 * de acender. Retorna a limpeza (para o ticker e esvazia as camadas).
 */
export function decode(phrase: HTMLElement, onDone?: () => void) {
  const chars = gsap.utils.toArray<HTMLElement>(phrase.querySelectorAll("[data-ch]"));
  const glyphs = chars.map((c) => c.nextElementSibling as HTMLElement);
  const n = chars.length;
  const state = new Uint8Array(n); // 0 esperando, 1 embaralhando, 2 travada
  let t0 = -1;
  let lastSwap = -1;
  let locked = 0;
  const finish = () => onDone?.();

  const tick = (time: number) => {
    if (t0 < 0) t0 = time;
    const t = time - t0;
    const swap = t - lastSwap >= SWAP;
    if (swap) lastSwap = t;
    for (let i = 0; i < n; i++) {
      if (state[i] === 2) continue;
      const f = n > 1 ? i / (n - 1) : 1;
      if (t >= LEAD + f * SPREAD) {
        state[i] = 2;
        locked++;
        glyphs[i].textContent = "";
        gsap.fromTo(chars[i], { opacity: 0.16 }, { opacity: 1, duration: FADE, ease: "power1.out" });
      } else if (t >= f * APPEAR && (state[i] === 0 || swap)) {
        state[i] = 1;
        glyphs[i].textContent = randomGlyph();
      }
    }
    if (locked === n) {
      gsap.ticker.remove(tick);
      gsap.delayedCall(FADE, finish);
    }
  };
  gsap.ticker.add(tick);

  return () => {
    gsap.ticker.remove(tick);
    gsap.killTweensOf(finish);
    glyphs.forEach((g) => (g.textContent = ""));
  };
}

/** Reflexo prata uma vez sobre as letras marcadas com `data-key` (ver .text-shine-fixed). */
export function shine(scope: HTMLElement) {
  const keys = [...scope.querySelectorAll<HTMLElement>("[data-key]")];
  if (!keys.length) return;
  // da letra mais à esquerda à mais à direita (o trecho pode quebrar de linha)
  const rects = keys.map((k) => k.getBoundingClientRect());
  const left = Math.min(...rects.map((r) => r.left));
  const right = Math.max(...rects.map((r) => r.right));
  const vw = window.innerWidth;
  // gradiente em coordenadas da tela (background-attachment: fixed, 300vw com
  // a faixa no meio): a faixa atravessa as letras e para fora delas
  gsap.fromTo(
    keys,
    { backgroundPositionX: left - 120 - vw * 1.5 },
    { backgroundPositionX: right + 120 - vw * 1.5, duration: 1.1, ease: "power2.inOut" },
  );
}

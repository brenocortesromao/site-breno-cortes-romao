/**
 * Entrada do título da parte escura do Fractional ("O mercado mudou."), num
 * canvas 2D temporário por cima do título real (FractionalModelTitle.tsx).
 * - Amostra os pixels de cada palavra desenhada com a mesma fonte, tamanho,
 *   espaçamento e posição da palavra real (linha de base pela sonda: um
 *   inline-block vazio no início de cada palavra). Refaz no resize.
 * - Partículas (o mesmo ponto da esfera, modelScene.ts) começam espalhadas
 *   como poeira em volta e se juntam nas letras, palavra por palavra, da
 *   esquerda para a direita (~1,6 s no total). Quando a palavra se completa,
 *   `onWord(k)` (o texto real aparece) e as partículas dela somem em fade.
 * - Poeira extra flutua em volta; `drip()` faz parte dela escorrer para baixo
 *   em direção à esfera (some antes de chegar) e o resto apagar; ao terminar,
 *   `onDone()`.
 */

const B = 5;
/** Montagem de cada palavra (s), duração total buscada (s) e espalhamento dentro da palavra (s). */
const WORD_S = 0.9;
const TOTAL_S = 1.6;
const SPREAD_S = 0.12;
/** Fade das partículas da palavra pronta (s) e duração do escorrer (s). */
const FADE_S = 0.45;
const DRIP_S = 1.1;
/** Teto de partículas nas letras (o passo da amostra cresce até caber). */
const MAX_LETTER = 1800;

type Opts = {
  canvas: HTMLCanvasElement;
  /** Palavras reais (cada uma com a sonda de linha de base como 1º filho). */
  words: HTMLElement[];
  /** Centro da esfera, em coordenadas da página (getBoundingClientRect). */
  sphere: () => { x: number; y: number };
  onWord: (k: number) => void;
  /** Todas as palavras prontas e as partículas delas apagadas. */
  onAssembled: () => void;
  onDone: () => void;
};

const easeInOut = (q: number) => (q < 0.5 ? 4 * q * q * q : 1 - Math.pow(-2 * q + 2, 3) / 2);
const gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;

export function playTitleParticles(o: Opts) {
  const { canvas, words } = o;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    words.forEach((_, k) => o.onWord(k));
    o.onAssembled();
    return { drip: () => o.onDone(), cancel: () => {} };
  }

  let W = 0, H = 0, dpr = 1;
  let cr = canvas.getBoundingClientRect();
  const size = () => {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    cr = canvas.getBoundingClientRect();
    W = cr.width;
    H = cr.height;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
  };

  /* ---------- amostra das letras ---------- */
  type Target = { x: number; y: number; word: number; delay: number };
  const off = document.createElement("canvas");
  const octx = off.getContext("2d", { willReadFrequently: true })!;
  const sample = (step: number): Target[] => {
    const out: Target[] = [];
    words.forEach((el, k) => {
      const r = el.getBoundingClientRect();
      const probe = el.firstElementChild as HTMLElement | null;
      const base = probe ? probe.getBoundingClientRect().top : r.bottom;
      const cs = getComputedStyle(el);
      const pad = 12;
      off.width = Math.ceil(r.width + pad * 2);
      off.height = Math.ceil(r.height + pad * 2);
      octx.clearRect(0, 0, off.width, off.height);
      octx.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
      if ("letterSpacing" in octx) (octx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = cs.letterSpacing;
      octx.textBaseline = "alphabetic";
      octx.fillStyle = "#fff";
      octx.fillText((el.textContent ?? "").trim(), pad, pad + (base - r.top));
      const data = octx.getImageData(0, 0, off.width, off.height).data;
      for (let y = 0; y < off.height; y += step)
        for (let x = 0; x < off.width; x += step) {
          if (data[(y * off.width + x) * 4 + 3] < 128) continue;
          out.push({
            x: r.left - cr.left - pad + x + (Math.random() - 0.5) * 0.8,
            y: r.top - cr.top - pad + y + (Math.random() - 0.5) * 0.8,
            word: k,
            delay: (x / off.width) * SPREAD_S,
          });
        }
    });
    return out;
  };
  const build = () => {
    const fs = parseFloat(getComputedStyle(words[0]).fontSize) || 48;
    let step = Math.max(2, Math.round(fs / 24));
    let t = sample(step);
    while (t.length > MAX_LETTER) t = sample(++step);
    return t;
  };

  /* ---------- partículas ---------- */
  size();
  let targets = build();
  type P = { x0: number; y0: number; br: number; ph: number };
  const makeStart = (t: Target): P => {
    const a = Math.random() * Math.PI * 2;
    const rad = 60 + Math.abs(gauss()) * 240;
    return { x0: t.x + Math.cos(a) * rad, y0: t.y + Math.sin(a) * rad * 0.6, br: 0.55 + Math.random() * 0.45, ph: Math.random() * 6.28 };
  };
  let starts = targets.map(makeStart);
  // poeira extra em volta do título
  const tb = targets.reduce(
    (b, t) => ({ l: Math.min(b.l, t.x), r: Math.max(b.r, t.x), t: Math.min(b.t, t.y), b: Math.max(b.b, t.y) }),
    { l: Infinity, r: -Infinity, t: Infinity, b: -Infinity },
  );
  const dustN = Math.round(targets.length * 0.4);
  const dust = Array.from({ length: dustN }, () => ({
    x: (tb.l + tb.r) / 2 + gauss() * (tb.r - tb.l) * 0.75,
    y: (tb.t + tb.b) / 2 + gauss() * 160,
    br: 0.15 + Math.random() * 0.3,
    ph: Math.random() * 6.28,
    drips: Math.random() < 0.5,
    vx: 0,
    vy: 0,
  }));

  const W_N = words.length;
  const stepW = W_N > 1 ? (TOTAL_S - WORD_S) / (W_N - 1) : 0;
  const doneAt = (k: number) => k * stepW + WORD_S + SPREAD_S;
  const wordDone = new Array(W_N).fill(false);
  let assembled = false;
  let dripT = -1;
  let t = 0;

  const buf: Float32Array[] = [];
  const cnt = new Int32Array(B);
  const ensure = (n: number) => {
    if (buf[0]?.length >= n * 2) return;
    buf.length = 0;
    for (let b = 0; b < B; b++) buf.push(new Float32Array(n * 2));
  };
  const put = (x: number, y: number, a: number) => {
    if (a <= 0.01) return;
    let b = (a * B) | 0;
    if (b >= B) b = B - 1;
    const k = cnt[b] * 2;
    buf[b][k] = x;
    buf[b][k + 1] = y;
    cnt[b]++;
  };

  const frame = (dt: number) => {
    t += dt;
    ensure(targets.length + dust.length);
    cnt.fill(0);
    // esfera em coordenadas do canvas (a página pode ter rolado)
    const sp = o.sphere();
    const c = canvas.getBoundingClientRect();
    const sx = sp.x - c.left, sy = sp.y - c.top;

    for (let i = 0; i < targets.length; i++) {
      const tg = targets[i], s = starts[i];
      const t0 = tg.word * stepW + tg.delay;
      const q = Math.min(1, Math.max(0, (t - t0) / WORD_S));
      const e = easeInOut(q);
      const drift = (1 - e) * 6;
      const x = s.x0 + (tg.x - s.x0) * e + Math.sin(t * 0.8 + s.ph) * drift;
      const y = s.y0 + (tg.y - s.y0) * e + Math.cos(t * 0.7 + s.ph) * drift;
      let a = s.br * (0.3 + 0.55 * e);
      const fadeStart = doneAt(tg.word);
      if (t > fadeStart) a *= Math.max(0, 1 - (t - fadeStart) / FADE_S);
      put(x, y, a);
    }

    let dripAlive = false;
    for (const d of dust) {
      let a = d.br;
      if (dripT >= 0) {
        const k = (t - dripT) / DRIP_S;
        if (d.drips) {
          d.vy += 520 * dt;
          d.vx += ((sx - d.x) * 0.9 - d.vx) * dt;
          d.x += d.vx * dt;
          d.y += d.vy * dt;
          // some antes de chegar à esfera
          const toSphere = Math.max(0, Math.min(1, (sy - d.y) / 260));
          a *= Math.max(0, 1 - k) * toSphere;
        } else a *= Math.max(0, 1 - k * 1.8);
        if (a > 0.01) dripAlive = true;
      } else {
        d.x += Math.sin(t * 0.6 + d.ph) * 4 * dt;
        d.y += Math.cos(t * 0.5 + d.ph) * 3 * dt;
      }
      put(d.x, d.y, a);
    }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    for (let b = 0; b < B; b++) {
      ctx.fillStyle = `rgba(228,232,242,${(((b + 1) / B) * 0.85).toFixed(3)})`;
      const arr = buf[b], n = cnt[b] * 2;
      for (let k = 0; k < n; k += 2) ctx.fillRect(arr[k], arr[k + 1], 1.15, 1.15);
    }

    for (let k = 0; k < W_N; k++)
      if (!wordDone[k] && t >= doneAt(k)) {
        wordDone[k] = true;
        o.onWord(k);
      }
    if (!assembled && t >= doneAt(W_N - 1) + FADE_S) {
      assembled = true;
      o.onAssembled();
    }
    if (dripT >= 0 && t - dripT > 0.2 && !dripAlive) return false;
    return true;
  };

  let raf = 0, last = performance.now(), running = true;
  const loop = (now: number) => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (!frame(dt)) {
      running = false;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      o.onDone();
      return;
    }
    raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);

  // resize: refaz a amostra (mesma linha do tempo)
  let rs = 0;
  const ro = new ResizeObserver(() => {
    window.clearTimeout(rs);
    rs = window.setTimeout(() => {
      if (!running) return;
      size();
      targets = build();
      starts = targets.map(makeStart);
    }, 120);
  });
  ro.observe(canvas);

  return {
    drip: () => {
      if (dripT < 0) dripT = t;
    },
    cancel: () => {
      running = false;
      cancelAnimationFrame(raf);
      window.clearTimeout(rs);
      ro.disconnect();
    },
  };
}

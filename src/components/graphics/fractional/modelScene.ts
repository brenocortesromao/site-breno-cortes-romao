/**
 * Parte escura do "O que é fractional" (porte do protótipo
 * _privado/fractional-escuro-prototipo.html), em canvas 2D: não usa WebGL para
 * não disputar contexto com as cenas 3D do site.
 * - Esfera: partículas espalhadas se juntam com o scroll e formam a esfera
 *   (superfície por espiral de Fibonacci + 9% de núcleo). Fogem do mouse; com
 *   o mouse sobre a esfera ela abre em gomos e o núcleo acende; no toque, abre
 *   e fecha. Anel de órbita com 6 frações, uma por caixa: acende quando a caixa
 *   aparece e brilha mais no hover dela.
 * - Caixas: no desktop chegam uma por vez (ordem de data-i) quando a esfera
 *   termina de se formar e somem se o usuário volta para cima; empilhadas
 *   (até 980px), cada uma aparece ao entrar na tela. O estado é o atributo
 *   data-show (a transição fica no CSS, .fm-card em globals.css).
 * - Fundo: curvas de nível (marching squares sobre ruído) se movendo devagar,
 *   uma linha mais marcada.
 * - Pausa fora da tela (IntersectionObserver, sem requestAnimationFrame).
 * - reduced motion: um quadro parado (esfera formada, anel aceso, caixas
 *   visíveis), redesenhado só quando o tamanho muda.
 */

const SL = 10;
const SEG = 6;
const B = 5;
/** Coluna única (caixas empilhadas abaixo da esfera). */
export const STACKED_QUERY = "(max-width: 980px)";

export type ModelSceneOptions = {
  section: HTMLElement;
  row: HTMLElement;
  fx: HTMLCanvasElement;
  bg: HTMLCanvasElement;
  /** Caixas na ordem de chegada (data-i 0..5). */
  cards: HTMLElement[];
  particles: number;
  maxDpr: number;
  /** Fundo redesenhado a cada N quadros. */
  bgEvery: number;
  reduce: boolean;
  /** Progresso da formação, guardado entre remontagens (troca de nível). */
  memo: { p: number };
};

export function startModelScene(o: ModelSceneOptions): () => void {
  const { section, row, fx, bg, cards, reduce, memo } = o;
  const ctx = fx.getContext("2d");
  const bx = bg.getContext("2d");
  if (!ctx || !bx) {
    cards.forEach((c) => c.setAttribute("data-show", ""));
    return () => {};
  }
  const stackedMq = window.matchMedia(STACKED_QUERY);
  const stacked = () => stackedMq.matches;

  /* ---------- partículas ---------- */
  const N = o.particles;
  const tx = new Float32Array(N), ty = new Float32Array(N), tz = new Float32Array(N);
  const sx = new Float32Array(N), sy = new Float32Array(N), sz = new Float32Array(N);
  const dl = new Float32Array(N), dx = new Float32Array(N), dz = new Float32Array(N);
  const br = new Float32Array(N), core = new Uint8Array(N), ph = new Float32Array(N);
  const GA = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < N; i++) {
    const y = 1 - (2 * (i + 0.5)) / N, r = Math.sqrt(1 - y * y), th = i * GA;
    let x = Math.cos(th) * r, z = Math.sin(th) * r, yy = y;
    const isCore = Math.random() < 0.09;
    const rf = isCore ? Math.cbrt(Math.random()) * 0.5 : 0.965 + Math.random() * 0.035;
    if (isCore) {
      const u = Math.random() * 2 - 1, a = Math.random() * Math.PI * 2, q = Math.sqrt(1 - u * u);
      x = q * Math.cos(a);
      yy = u;
      z = q * Math.sin(a);
    }
    tx[i] = x * rf;
    ty[i] = yy * rf;
    tz[i] = z * rf;
    core[i] = isCore ? 1 : 0;
    // gomo (fatia vertical) da partícula: direção para onde ela abre
    const s = Math.floor(((Math.atan2(z, x) + Math.PI) / (Math.PI * 2)) * SL) % SL;
    const mid = ((s + 0.5) / SL) * Math.PI * 2 - Math.PI;
    dx[i] = Math.cos(mid);
    dz[i] = Math.sin(mid);
    sx[i] = (Math.random() * 2 - 1) * 3.2;
    sy[i] = (Math.random() * 2 - 1) * 1.8;
    sz[i] = (Math.random() * 2 - 1) * 2;
    dl[i] = Math.random();
    br[i] = 0.55 + Math.random() * 0.45;
    ph[i] = Math.random() * 6.28;
  }
  // 5 faixas de brilho: um fillStyle por faixa (não por partícula)
  const buf: Float32Array[] = [];
  const cnt = new Int32Array(B);
  for (let b = 0; b < B; b++) buf.push(new Float32Array(N * 3));

  let W = 0, H = 0, dpr = 1;
  const sizeFx = () => {
    dpr = Math.min(window.devicePixelRatio || 1, o.maxDpr);
    W = fx.clientWidth;
    H = fx.clientHeight;
    fx.width = Math.round(W * dpr);
    fx.height = Math.round(H * dpr);
  };
  const center = (): [number, number, number] => {
    if (stacked()) return [W * 0.5, 250, Math.min(W * 0.3, 150)];
    return [W * 0.5, H * 0.47, Math.max(40, Math.min(H * 0.25, (W - 750) * 0.3, 175))];
  };

  /* ---------- ponteiro ---------- */
  let mx = -1e4, my = -1e4, hover = false, lock = false, hoverCard = -1;
  const local = (e: PointerEvent) => {
    const r = row.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top];
  };
  const onRowMove = (e: PointerEvent) => {
    if (e.pointerType === "touch") return;
    [mx, my] = local(e);
    const [cx, cy, R] = center();
    hover = Math.hypot(mx - cx, my - cy) < R * 1.4;
  };
  const onRowLeave = () => {
    mx = my = -1e4;
    hover = false;
  };
  const onFxDown = (e: PointerEvent) => {
    if (e.pointerType !== "touch") return;
    const [x, y] = local(e);
    const [cx, cy, R] = center();
    if (Math.hypot(x - cx, y - cy) < R * 1.5) lock = !lock;
  };

  /* ---------- caixas ---------- */
  const lit = new Float32Array(SEG);
  const flags = cards.map((c) => c.hasAttribute("data-show"));
  const setShow = (k: number, on: boolean) => {
    if (flags[k] === on) return;
    flags[k] = on;
    cards[k].toggleAttribute("data-show", on);
  };
  const shownCount = () => flags.filter(Boolean).length;
  let timer = 0;
  const step = () => {
    const k = flags.indexOf(false);
    if (k < 0) {
      timer = 0;
      return;
    }
    setShow(k, true);
    timer = window.setTimeout(step, 320);
  };
  const syncCards = (prog: number) => {
    if (stacked()) return; // empilhadas: o observador abaixo cuida
    if (prog > 0.82 && !timer && shownCount() === 0) step();
    if (prog < 0.3 && shownCount()) {
      window.clearTimeout(timer);
      timer = 0;
      cards.forEach((_, k) => setShow(k, false));
    }
  };
  const cardIo = new IntersectionObserver(
    (entries) => {
      if (!stacked() || reduce) return;
      entries.forEach((e) => {
        const k = cards.indexOf(e.target as HTMLElement);
        if (e.isIntersecting) setShow(k, true);
        else if (e.boundingClientRect.top > window.innerHeight) setShow(k, false);
      });
    },
    { rootMargin: "0px 0px -8% 0px" },
  );
  const cardMove: ((e: PointerEvent) => void)[] = [];
  const cardEnter: (() => void)[] = [];
  const cardLeave: (() => void)[] = [];
  cards.forEach((el, k) => {
    cardMove[k] = (e) => {
      const r = el.getBoundingClientRect();
      el.style.setProperty("--mx", `${e.clientX - r.left}px`);
      el.style.setProperty("--my", `${e.clientY - r.top}px`);
    };
    cardEnter[k] = () => (hoverCard = k);
    cardLeave[k] = () => {
      if (hoverCard === k) hoverCard = -1;
    };
    el.addEventListener("pointermove", cardMove[k]);
    el.addEventListener("pointerenter", cardEnter[k]);
    el.addEventListener("pointerleave", cardLeave[k]);
    cardIo.observe(el);
  });

  /* ---------- esfera ---------- */
  let p = reduce ? 1 : memo.p, open = 0, rot = 0, tilt = 0.32, t = 0;
  const target = () => {
    if (reduce) return 1;
    const r = row.getBoundingClientRect(), vh = window.innerHeight;
    return Math.max(0, Math.min(1, (vh - r.top) / (vh * 0.75)));
  };
  const ease = (q: number) => (q < 0.5 ? 4 * q * q * q : 1 - Math.pow(-2 * q + 2, 3) / 2);

  const drawFx = () => {
    const [cx, cy, R] = center();
    if (!reduce) {
      p += (target() - p) * 0.06;
      memo.p = p;
      syncCards(p);
      open += ((hover || lock ? 1 : 0) - open) * 0.05;
      rot += 0.0028;
      const tiltT = 0.32 + (my > -1e3 ? ((my - cy) / H) * 0.25 : 0);
      tilt += (tiltT - tilt) * 0.04;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    // halo e núcleo de luz
    ctx.globalCompositeOperation = "lighter";
    const gA = 0.1 * p + 0.22 * open;
    let g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 1.7);
    g.addColorStop(0, `rgba(200,212,236,${gA})`);
    g.addColorStop(1, "rgba(200,212,236,0)");
    ctx.fillStyle = g;
    ctx.fillRect(cx - R * 2, cy - R * 2, R * 4, R * 4);
    const cA = 0.08 * p + 0.55 * open;
    g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 0.55);
    g.addColorStop(0, `rgba(240,244,255,${cA})`);
    g.addColorStop(1, "rgba(240,244,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(cx - R, cy - R, R * 2, R * 2);

    const c = Math.cos(rot), s = Math.sin(rot), ct = Math.cos(tilt), st = Math.sin(tilt);
    const rr = 110, rr2 = rr * rr;
    cnt.fill(0);
    for (let i = 0; i < N; i++) {
      let q = p * 1.4 - dl[i] * 0.4;
      q = q < 0 ? 0 : q > 1 ? 1 : q;
      const e = ease(q);
      const op = core[i] ? 0 : open * 0.42;
      const gx = tx[i] + dx[i] * op, gy = ty[i], gz = tz[i] + dz[i] * op;
      const drift = (1 - e) * 0.05;
      const x = sx[i] + (gx - sx[i]) * e + Math.sin(t * 0.6 + ph[i]) * drift;
      const y = sy[i] + (gy - sy[i]) * e + Math.cos(t * 0.5 + ph[i]) * drift;
      const z = sz[i] + (gz - sz[i]) * e;
      const X = x * c - z * s, Z = x * s + z * c;
      const Y = y * ct - Z * st, Z2 = y * st + Z * ct;
      const f = 3.4 / (3.4 + Z2);
      let px = cx + X * R * f, py = cy + Y * R * f;
      // partículas fogem do mouse
      const ddx = px - mx, ddy = py - my, d2 = ddx * ddx + ddy * ddy;
      if (d2 < rr2 && d2 > 0.01) {
        const d = Math.sqrt(d2), k = 1 - d / rr;
        const push = k * k * 34;
        px += (ddx / d) * push;
        py += (ddy / d) * push;
      }
      let a = br[i] * (0.3 + 0.7 * Math.min(1, Math.max(0, (1.6 - Z2) / 2.6)));
      a *= 0.3 + 0.7 * e;
      if (core[i]) a *= 0.25 + 0.75 * open;
      let b = (a * B) | 0;
      if (b >= B) b = B - 1;
      const k3 = cnt[b] * 3, arr = buf[b];
      arr[k3] = px;
      arr[k3 + 1] = py;
      arr[k3 + 2] = (core[i] ? 1.5 : 1.15) * f;
      cnt[b]++;
    }
    for (let b = 0; b < B; b++) {
      ctx.fillStyle = `rgba(228,232,242,${(((b + 1) / B) * 0.85).toFixed(3)})`;
      const arr = buf[b], n = cnt[b] * 3;
      for (let k = 0; k < n; k += 3) {
        const z = arr[k + 2];
        ctx.fillRect(arr[k], arr[k + 1], z, z);
      }
    }

    // anel: uma fração por caixa, acesa quando ela chega, mais forte no hover
    ctx.globalCompositeOperation = "source-over";
    const ra = p * p;
    if (ra > 0.01) {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(-0.2);
      const rx = R * (1.62 + open * 0.08), ry = R * 0.4, gap = 0.08, off = t * 0.06;
      for (let k = 0; k < SEG; k++) {
        const on = flags[k] ? (hoverCard === k ? 1.6 : 1) : 0;
        lit[k] = reduce ? on : lit[k] + (on - lit[k]) * 0.08;
        const a0 = off + (k * Math.PI * 2) / SEG + gap / 2, a1 = a0 + (Math.PI * 2) / SEG - gap;
        ctx.beginPath();
        ctx.ellipse(0, 0, rx, ry, 0, a0, a1);
        ctx.strokeStyle = `rgba(235,238,246,${Math.min(0.95, (0.16 + 0.5 * lit[k]) * ra)})`;
        ctx.lineWidth = 1 + 0.5 * Math.min(1, lit[k]);
        ctx.stroke();
        if (lit[k] > 0.05) {
          ctx.fillStyle = `rgba(245,247,252,${Math.min(1, 0.7 * lit[k] * ra)})`;
          ctx.beginPath();
          ctx.arc(Math.cos(a0) * rx, Math.sin(a0) * ry, 1.6 + lit[k], 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();
    }
  };

  /* ---------- fundo: curvas de nível em movimento ---------- */
  let BW = 0, BH = 0, bdpr = 1;
  const sizeBg = () => {
    bdpr = Math.min(window.devicePixelRatio || 1, 1.5, o.maxDpr);
    BW = section.clientWidth;
    BH = section.clientHeight;
    bg.width = Math.round(BW * bdpr);
    bg.height = Math.round(BH * bdpr);
  };
  const hs = (x: number, y: number, z: number) => {
    let n = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(z, 1274126177);
    n = Math.imul(n ^ (n >>> 13), 1274126177);
    return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
  };
  const L = (a: number, b: number, k: number) => a + (b - a) * k;
  const vn = (x: number, y: number, z: number) => {
    const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
    const xf = x - xi, yf = y - yi, zf = z - zi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), w = zf * zf * (3 - 2 * zf);
    return L(
      L(L(hs(xi, yi, zi), hs(xi + 1, yi, zi), u), L(hs(xi, yi + 1, zi), hs(xi + 1, yi + 1, zi), u), v),
      L(L(hs(xi, yi, zi + 1), hs(xi + 1, yi, zi + 1), u), L(hs(xi, yi + 1, zi + 1), hs(xi + 1, yi + 1, zi + 1), u), v),
      w,
    );
  };
  const fbm = (x: number, y: number, z: number) => vn(x, y, z) * 0.68 + vn(x * 2.1 + 5.2, y * 2.1 + 1.3, z * 1.7) * 0.32;
  const CELL = 26;
  const LV: number[] = [];
  for (let l = 0.24; l < 0.78; l += 0.055) LV.push(l);
  let grid = new Float32Array(0);
  const drawBg = (time: number) => {
    const cols = Math.ceil(BW / CELL) + 1, rows = Math.ceil(BH / CELL) + 1;
    if (grid.length !== cols * rows) grid = new Float32Array(cols * rows);
    const sc = 0.0026 * CELL, z = time * 0.035;
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) grid[j * cols + i] = fbm(i * sc, j * sc, z);
    bx.setTransform(bdpr, 0, 0, bdpr, 0, 0);
    bx.clearRect(0, 0, BW, BH);
    for (let li = 0; li < LV.length; li++) {
      const l = LV[li];
      bx.beginPath();
      for (let j = 0; j < rows - 1; j++)
        for (let i = 0; i < cols - 1; i++) {
          const a = grid[j * cols + i], b = grid[j * cols + i + 1], c = grid[(j + 1) * cols + i + 1], d = grid[(j + 1) * cols + i];
          const idx = (a > l ? 8 : 0) | (b > l ? 4 : 0) | (c > l ? 2 : 0) | (d > l ? 1 : 0);
          if (idx === 0 || idx === 15) continue;
          const x0 = i * CELL, y0 = j * CELL, x1 = x0 + CELL, y1 = y0 + CELL;
          const T = (): [number, number] => [x0 + (CELL * (l - a)) / (b - a), y0];
          const Rr = (): [number, number] => [x1, y0 + (CELL * (l - b)) / (c - b)];
          const Bt = (): [number, number] => [x0 + (CELL * (l - d)) / (c - d), y1];
          const Lf = (): [number, number] => [x0, y0 + (CELL * (l - a)) / (d - a)];
          const seg = (P: () => [number, number], Q: () => [number, number]) => {
            const u = P(), v = Q();
            bx.moveTo(u[0], u[1]);
            bx.lineTo(v[0], v[1]);
          };
          switch (idx) {
            case 1: case 14: seg(Lf, Bt); break;
            case 2: case 13: seg(Bt, Rr); break;
            case 3: case 12: seg(Lf, Rr); break;
            case 4: case 11: seg(T, Rr); break;
            case 5: seg(T, Rr); seg(Lf, Bt); break;
            case 6: case 9: seg(T, Bt); break;
            case 7: case 8: seg(Lf, T); break;
            case 10: seg(Lf, T); seg(Bt, Rr); break;
          }
        }
      bx.strokeStyle = li === 4 ? "rgba(255,255,255,.12)" : "rgba(255,255,255,.05)";
      bx.lineWidth = 1;
      bx.stroke();
    }
  };

  /* ---------- laço ---------- */
  let raf = 0, frame = 0, last = performance.now(), visible = false;
  const loop = (now: number) => {
    raf = visible ? requestAnimationFrame(loop) : 0;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    t += dt;
    drawFx();
    if (frame % o.bgEvery === 0) drawBg(t);
    frame++;
  };
  const still = () => {
    drawFx();
    drawBg(0);
  };
  const resize = () => {
    sizeFx();
    sizeBg();
    if (reduce) still();
    else drawBg(t);
  };
  let rs = 0;
  const ro = new ResizeObserver(() => {
    window.clearTimeout(rs);
    rs = window.setTimeout(resize, 120);
  });
  ro.observe(row);
  ro.observe(section);
  sizeFx();
  sizeBg();

  let io: IntersectionObserver | null = null;
  if (reduce) {
    cards.forEach((_, k) => setShow(k, true));
    still();
  } else {
    row.addEventListener("pointermove", onRowMove);
    row.addEventListener("pointerleave", onRowLeave);
    fx.addEventListener("pointerdown", onFxDown);
    drawBg(0);
    drawFx();
    io = new IntersectionObserver(
      ([e]) => {
        visible = e.isIntersecting;
        if (visible && !raf) {
          last = performance.now();
          raf = requestAnimationFrame(loop);
        }
      },
      { rootMargin: "200px 0px" },
    );
    io.observe(section);
  }

  return () => {
    cancelAnimationFrame(raf);
    window.clearTimeout(timer);
    window.clearTimeout(rs);
    io?.disconnect();
    ro.disconnect();
    cardIo.disconnect();
    row.removeEventListener("pointermove", onRowMove);
    row.removeEventListener("pointerleave", onRowLeave);
    fx.removeEventListener("pointerdown", onFxDown);
    cards.forEach((el, k) => {
      el.removeEventListener("pointermove", cardMove[k]);
      el.removeEventListener("pointerenter", cardEnter[k]);
      el.removeEventListener("pointerleave", cardLeave[k]);
    });
  };
}

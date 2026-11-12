/**
 * Formas da animação "código que vira forma" (CodeShape.tsx). Cada função
 * devolve n pontos 3D normalizados (Float32Array x,y,z; a forma cabe em
 * [-1, 1], y para cima), na mesma quantidade para todas: o caractere i vai do
 * ponto i de uma forma ao ponto i da seguinte.
 * - "spin": forma 3D procedural, gira 360° devagar (esfera, montanhas,
 *   Coliseu, Chichén Itzá);
 * - "sway": silhueta 2D com leve espessura em Z, oscila entre -25° e +25°
 *   (Machu Picchu, Grande Muralha, Petra, Taj Mahal, Cristo Redentor, elmo,
 *   "</>"). As silhuetas são desenhadas aqui (desenho original, simplificado)
 *   num canvas fora da tela e amostradas: pontos uniformes dentro e mais
 *   densos no contorno (a forma fica nítida).
 */

export type ShapeId =
  | "sphere"
  | "mountains"
  | "machuPicchu"
  | "greatWall"
  | "petra"
  | "colosseum"
  | "chichenItza"
  | "tajMahal"
  | "cristo"
  | "helmet"
  | "code";

export type ShapeDef = { motion: "spin" | "sway"; build: (n: number, family: string) => Float32Array };

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const TAU = Math.PI * 2;

function shuffle(a: Float32Array, n: number) {
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    for (let k = 0; k < 3; k++) {
      const t = a[i * 3 + k];
      a[i * 3 + k] = a[j * 3 + k];
      a[j * 3 + k] = t;
    }
  }
  return a;
}

/** Junta grupos de pontos (cada um com sua fração do total) num só array embaralhado. */
function compose(n: number, parts: [number, (out: number[]) => void][]) {
  const pts: number[] = [];
  const total = parts.reduce((s, [w]) => s + w, 0);
  let made = 0;
  parts.forEach(([w, gen], idx) => {
    const want = idx === parts.length - 1 ? n - made : Math.round((n * w) / total);
    for (let i = 0; i < want; i++) gen(pts);
    made += want;
  });
  return shuffle(Float32Array.from(pts.slice(0, n * 3)), n);
}

// ---------------------------------------------------------------- esfera e "</>"
function sphere(n: number) {
  const out = new Float32Array(n * 3);
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n; i++) {
    const y = 1 - (2 * (i + 0.5)) / n;
    const r = Math.sqrt(1 - y * y);
    const a = i * golden;
    out[i * 3] = Math.cos(a) * r;
    out[i * 3 + 1] = y;
    out[i * 3 + 2] = Math.sin(a) * r;
  }
  return shuffle(out, n);
}

/** "</>" amostrado da própria fonte, com leve profundidade. */
function code(n: number, family: string) {
  const W = 420;
  const H = 200;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d", { willReadFrequently: true })!;
  g.fillStyle = "#fff";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.font = `600 150px ${family}`;
  g.fillText("</>", W / 2, H / 2);
  const data = g.getImageData(0, 0, W, H).data;
  const px: number[] = [];
  for (let y = 0; y < H; y += 2) for (let x = 0; x < W; x += 2) if (data[(y * W + x) * 4 + 3] > 140) px.push(x, y);
  const count = px.length / 2;
  if (!count) return sphere(n);
  const out = new Float32Array(n * 3);
  const scale = 3.2 / W;
  for (let i = 0; i < n; i++) {
    const j = Math.floor(Math.random() * count);
    out[i * 3] = (px[j * 2] - W / 2 + rand(-1, 1)) * scale;
    out[i * 3 + 1] = -(px[j * 2 + 1] - H / 2 + rand(-1, 1)) * scale;
    out[i * 3 + 2] = rand(-0.16, 0.16);
  }
  return out;
}

// ---------------------------------------------------------------- montanhas
function hash(x: number, y: number) {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
}
function noise(x: number, y: number) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi);
  const b = hash(xi + 1, yi);
  const c = hash(xi, yi + 1);
  const d = hash(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbm(x: number, y: number) {
  let s = 0;
  let amp = 0.5;
  for (let o = 0; o < 4; o++) {
    s += amp * noise(x, y);
    x *= 2.03;
    y *= 2.03;
    amp *= 0.5;
  }
  return s;
}
const peak = (x: number, z: number, cx: number, cz: number, w: number) => Math.exp(-((x - cx) ** 2 + (z - cz) ** 2) / (w * w));

/** Relevo por ruído com 3 picos e vales, num disco (gira sem cantos). */
function mountains(n: number) {
  const height = (x: number, z: number) => {
    const ridge = 1 - Math.abs(noise(x * 2.2 + 7, z * 2.2 + 3) * 2 - 1); // cristas
    const h =
      1.05 * peak(x, z, -0.42, 0.12, 0.36) +
      1.3 * peak(x, z, 0.18, -0.18, 0.34) +
      0.8 * peak(x, z, 0.55, 0.42, 0.3) +
      0.22 * fbm(x * 2.6 + 11, z * 2.6) +
      0.12 * ridge;
    const r = Math.hypot(x, z);
    return h * (1 - Math.pow(r, 6)); // borda baixa
  };
  return compose(n, [
    [
      1,
      (o) => {
        const a = rand(0, TAU);
        const r = Math.sqrt(Math.random());
        const x = Math.cos(a) * r;
        const z = Math.sin(a) * r;
        o.push(x * 1.05, height(x, z) * 0.95 - 0.5, z * 1.05);
      },
    ],
  ]);
}

// ---------------------------------------------------------------- Coliseu
/** Anel elíptico com 3 andares de arcos e o ático; um lado mais baixo (ruína). */
function colosseum(n: number) {
  const A = 1;
  const B = 0.8;
  const y0 = -0.42;
  const tierH = 0.24;
  const arches = 32;
  const full = y0 + tierH * 3 + 0.14; // com o ático
  // lado arruinado (frente-direita): cai para ~1 andar e meio, em degraus
  const top = (t: number) => {
    const d = Math.cos(t - 0.6); // 1 no meio do lado baixo
    if (d < 0.15) return full;
    const k = Math.min((d - 0.15) / 0.5, 1);
    const stepped = Math.round(k * 4) / 4; // degraus irregulares da ruína
    return full - stepped * (full - (y0 + tierH * 1.4));
  };
  const bayW = (TAU * 0.9) / arches;
  const rw = bayW * 0.28;
  const opening = (t: number, y: number) => {
    const tier = Math.floor((y - y0) / tierH);
    if (tier > 2) return false; // ático: parede cheia
    const local = y - y0 - tier * tierH;
    const fb = ((t / TAU) * arches) % 1;
    const dx = (fb - 0.5) * bayW;
    if (Math.abs(dx) >= rw) return false;
    const spring = 0.04 + tierH * 0.5;
    return local > 0.04 && (local < spring || (local - spring) ** 2 + dx * dx < rw * rw);
  };
  const ell = (t: number, s: number) => [A * s * Math.cos(t), B * s * Math.sin(t)];
  return compose(n, [
    [
      0.62,
      (o) => {
        for (;;) {
          const t = rand(0, TAU);
          const y = rand(y0, top(t));
          if (opening(t, y)) continue;
          const [x, z] = ell(t, 1);
          o.push(x, y, z);
          return;
        }
      },
    ],
    // cornijas entre os andares e a borda de cima (linhas nítidas)
    [
      0.16,
      (o) => {
        const t = rand(0, TAU);
        const h = top(t);
        const k = Math.floor(rand(1, 5));
        const y = k === 4 ? h : Math.min(y0 + k * tierH, h);
        const [x, z] = ell(t, 1.01);
        o.push(x, y, z);
      },
    ],
    // anel interno (arquibancadas) e arena
    [
      0.22,
      (o) => {
        const t = rand(0, TAU);
        if (Math.random() < 0.7) {
          const s = rand(0.55, 0.95);
          const y = y0 + (s - 0.55) * 1.1 * Math.min(1, (top(t) - y0) / (full - y0));
          const [x, z] = ell(t, s);
          o.push(x, y, z);
        } else {
          const [x, z] = ell(t, 0.5);
          o.push(x, y0 + 0.02, z);
        }
      },
    ],
  ]);
}

// ---------------------------------------------------------------- Chichén Itzá
/** Pirâmide de 9 degraus, escadaria central em cada face e o templo no topo. */
function chichenItza(n: number) {
  const levels = 9;
  const hs = 0.1;
  const s0 = 0.86;
  const sTop = 0.32;
  const y0 = -0.64;
  const size = (k: number) => s0 - (k * (s0 - sTop)) / levels;
  const stairW = 0.15;
  const H = levels * hs;
  // gira um ponto (x, z) para uma das 4 faces
  const face = (side: number, u: number, d: number): [number, number] => {
    const c = [
      [u, d],
      [d, -u],
      [-u, -d],
      [-d, u],
    ][side];
    return [c[0], c[1]];
  };
  return compose(n, [
    // faces verticais de cada degrau (sem a faixa da escadaria)
    [
      0.28,
      (o) => {
        for (;;) {
          const k = Math.floor(rand(0, levels));
          const s = size(k);
          const u = rand(-s, s);
          if (Math.abs(u) < stairW + 0.02) continue;
          const [x, z] = face(Math.floor(rand(0, 4)), u, s);
          o.push(x, y0 + (k + Math.random()) * hs, z);
          return;
        }
      },
    ],
    // quinas de cima de cada degrau (linhas que desenham os 9 níveis)
    [
      0.32,
      (o) => {
        for (;;) {
          const k = Math.floor(rand(0, levels));
          const s = size(k);
          const u = rand(-s, s);
          if (Math.abs(u) < stairW) continue;
          const [x, z] = face(Math.floor(rand(0, 4)), u, s);
          o.push(x, y0 + (k + 1) * hs, z);
          return;
        }
      },
    ],
    // escadarias (degraus finos do chão ao topo) e balaustradas
    [
      0.22,
      (o) => {
        const t = Math.random();
        const steps = 36;
        const ts = Math.floor(t * steps) / steps; // degrau
        const d = s0 + 0.06 - ts * (s0 + 0.06 - sTop);
        const edge = Math.random() < 0.3;
        const u = edge ? (Math.random() < 0.5 ? -1 : 1) * stairW : rand(-stairW, stairW);
        const [x, z] = face(Math.floor(rand(0, 4)), u, d);
        o.push(x, y0 + ts * H + (edge ? 0.03 : 0), z);
      },
    ],
    // templo no topo (portas na frente)
    [
      0.2,
      (o) => {
        const tw = 0.26;
        const td = 0.22;
        const th = 0.3;
        const yb = y0 + H;
        for (;;) {
          const side = Math.floor(rand(0, 4));
          const half = side % 2 === 0 ? tw : td;
          const depth = side % 2 === 0 ? td : tw;
          const u = rand(-half, half);
          const y = rand(0, th + 0.05);
          // 3 portas em cada face
          if (y < th * 0.62 && [-0.15, 0, 0.15].some((c) => Math.abs(u - c) < 0.04)) continue;
          const [x, z] = face(side, u, y > th ? depth + 0.02 : depth);
          o.push(x, yb + y, z);
          return;
        }
      },
    ],
  ]);
}

// ---------------------------------------------------------------- silhuetas
const S = 400;

/** Desenha (draw), amostra pontos dentro e no contorno e dá espessura em Z. */
function silhouette(n: number, draw: (g: CanvasRenderingContext2D) => void, depth = 0.09) {
  const c = document.createElement("canvas");
  c.width = S;
  c.height = S;
  const g = c.getContext("2d", { willReadFrequently: true })!;
  g.fillStyle = "#fff";
  g.strokeStyle = "#fff";
  g.lineJoin = "round";
  g.lineCap = "round";
  draw(g);
  const data = g.getImageData(0, 0, S, S).data;
  const inside = new Uint8Array(S * S);
  for (let i = 0; i < S * S; i++) inside[i] = data[i * 4 + 3] > 127 ? 1 : 0;
  const edge: number[] = [];
  const fill: number[] = [];
  for (let y = 1; y < S - 1; y++)
    for (let x = 1; x < S - 1; x++) {
      const i = y * S + x;
      if (!inside[i]) continue;
      if (!inside[i - 1] || !inside[i + 1] || !inside[i - S] || !inside[i + S]) edge.push(i);
      else fill.push(i);
    }
  const out = new Float32Array(n * 3);
  if (!edge.length) return sphere(n);
  for (let k = 0; k < n; k++) {
    const onEdge = Math.random() < 0.46 || !fill.length;
    const list = onEdge ? edge : fill;
    const i = list[Math.floor(Math.random() * list.length)];
    const px = (i % S) + rand(-0.5, 0.5);
    const py = Math.floor(i / S) + rand(-0.5, 0.5);
    out[k * 3] = (px - S / 2) / (S / 2);
    out[k * 3 + 1] = (S / 2 - py) / (S / 2);
    out[k * 3 + 2] = onEdge ? (Math.random() < 0.5 ? -1 : 1) * depth * rand(0.5, 1) : rand(-depth, depth);
  }
  return out;
}

const poly = (g: CanvasRenderingContext2D, pts: number[]) => {
  g.beginPath();
  g.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]);
  g.closePath();
  g.fill();
};
/** Recorta (apaga) com a função dada; volta a pintar depois. */
const cut = (g: CanvasRenderingContext2D, fn: () => void) => {
  g.globalCompositeOperation = "destination-out";
  fn();
  g.globalCompositeOperation = "source-over";
};

/** Machu Picchu: terraços em degraus, ruínas na esplanada e o Huayna Picchu ao fundo. */
function machuPicchu(n: number) {
  return silhouette(n, (g) => {
    // Huayna Picchu (pico em "pão de açúcar") e o morro menor ao lado
    g.beginPath();
    g.moveTo(140, 300);
    g.bezierCurveTo(205, 255, 212, 130, 250, 62);
    g.quadraticCurveTo(262, 50, 274, 64);
    g.bezierCurveTo(300, 140, 318, 230, 376, 282);
    g.lineTo(376, 310);
    g.lineTo(140, 310);
    g.fill();
    g.beginPath();
    g.moveTo(318, 250);
    g.quadraticCurveTo(350, 188, 390, 236);
    g.lineTo(390, 300);
    g.lineTo(318, 300);
    g.fill();
    // terraços em degraus subindo da esquerda até a esplanada
    // (vãos de ~11px: detalhe menor que um caractere some na animação)
    const terraces = 5;
    const th = 24;
    for (let k = 0; k < terraces; k++) g.fillRect(14 + k * 24, 372 - k * th, 330 - k * 24, 14 + k * th);
    g.fillRect(14, 372, 372, 14);
    // ruínas: casas com empenas sobre a esplanada
    const top = 372 - (terraces - 1) * th;
    for (const [hx, hw, hh] of [
      [160, 26, 22],
      [194, 20, 16],
      [222, 30, 26],
      [260, 22, 18],
      [290, 18, 14],
    ]) {
      g.fillRect(hx, top - hh, hw, hh);
      poly(g, [hx - 2, top - hh, hx + hw / 2, top - hh - 12, hx + hw + 2, top - hh]);
    }
    // muros de pedra de cada terraço (linhas horizontais) e portas das ruínas
    cut(g, () => {
      g.lineWidth = 11;
      g.lineCap = "butt";
      for (let k = 1; k <= terraces; k++) {
        const yy = 372 - (k - 1) * th + 6;
        g.beginPath();
        g.moveTo(14 + (k - 1) * 24 + 10, yy);
        g.lineTo(330, yy);
        g.stroke();
      }
      g.lineCap = "round";
      for (const wx of [168, 230, 266]) g.fillRect(wx, top - 13, 8, 13);
    });
  });
}

/** Grande Muralha: muralha serpenteando sobre a crista, com ameias e 3 torres. */
function greatWall(n: number) {
  return silhouette(n, (g) => {
    const crest = (x: number) => 280 - 70 * Math.sin((x / 400) * Math.PI * 1.25 + 0.35) - 26 * Math.sin((x / 400) * Math.PI * 3.6);
    const wall = (x: number) => crest(x) - 10;
    // crista do morro (só o contorno, fino)
    g.lineWidth = 2;
    g.beginPath();
    for (let x = 0; x <= 400; x += 4) (x ? g.lineTo : g.moveTo).call(g, x, crest(x) + 16);
    g.stroke();
    // corpo da muralha
    g.lineWidth = 17;
    g.beginPath();
    for (let x = 6; x <= 394; x += 3) (x > 6 ? g.lineTo : g.moveTo).call(g, x, wall(x));
    g.stroke();
    // ameias
    for (let x = 10; x < 392; x += 10) g.fillRect(x - 2.5, wall(x) - 16, 5, 8);
    // 3 torres de vigia
    for (const tx of [62, 205, 338]) {
      const ty = wall(tx);
      g.fillRect(tx - 23, ty - 66, 46, 68);
      for (let k = -2; k <= 2; k++) g.fillRect(tx + k * 10 - 3.5, ty - 76, 7, 11);
      cut(g, () => {
        g.fillRect(tx - 12, ty - 50, 8, 16);
        g.fillRect(tx + 4, ty - 50, 8, 16);
      });
    }
  });
}

/** Petra: fachada do Tesouro (colunas, frontão e a tholos no andar de cima), entalhada na rocha. */
function petra(n: number) {
  return silhouette(n, (g) => {
    // andar de baixo: base, 6 colunas com capitéis, entablamento e frontão
    g.fillRect(52, 366, 296, 14);
    for (const cx of [72, 114, 156, 244, 286, 328]) {
      g.fillRect(cx - 9, 222, 18, 144);
      g.fillRect(cx - 13, 214, 26, 10);
      g.fillRect(cx - 12, 360, 24, 6);
    }
    g.fillRect(56, 196, 288, 20);
    poly(g, [104, 196, 200, 160, 296, 196]);
    // porta no vão central
    g.lineWidth = 3;
    g.strokeRect(184, 286, 32, 80);
    // andar de cima: entablamento, tholos (cilindro, telhado cônico, urna) e pavilhões
    g.fillRect(64, 150, 272, 10);
    g.fillRect(166, 70, 68, 82);
    poly(g, [160, 72, 200, 42, 240, 72]);
    g.beginPath();
    g.ellipse(200, 32, 7, 10, 0, 0, TAU);
    g.fill();
    for (const side of [-1, 1]) {
      const x0 = side < 0 ? 72 : 254;
      g.fillRect(x0, 88, 74, 64);
      // frontão partido (meio triângulo virado para fora)
      poly(g, side < 0 ? [x0 - 4, 88, x0 + 40, 66, x0 + 40, 88] : [x0 + 34, 88, x0 + 34, 66, x0 + 78, 88]);
    }
    cut(g, () => {
      // vãos entre as colunas de cima
      for (const vx of [182, 198, 214]) g.fillRect(vx, 84, 4, 64);
      for (const vx of [94, 120, 278, 304]) g.fillRect(vx, 98, 5, 54);
      // vão da porta
      g.fillRect(187, 289, 26, 77);
    });
    // rocha em volta (contorno irregular)
    g.lineWidth = 2.5;
    for (const side of [-1, 1]) {
      g.beginPath();
      for (let y = 8; y <= 392; y += 8) {
        const x = 200 + side * (176 + 10 * Math.sin(y / 23) + 6 * Math.sin(y / 7.3));
        (y > 8 ? g.lineTo : g.moveTo).call(g, x, y);
      }
      g.stroke();
    }
  });
}

/** Taj Mahal: base, edifício com iwan, cúpula em gota com pináculo e 4 minaretes. */
function tajMahal(n: number) {
  return silhouette(n, (g) => {
    g.fillRect(16, 352, 368, 20);
    // edifício com cantos chanfrados
    poly(g, [118, 352, 118, 232, 132, 216, 268, 216, 282, 232, 282, 352]);
    // tambor e cúpula em gota
    g.fillRect(160, 190, 80, 30);
    g.beginPath();
    g.moveTo(156, 194);
    g.bezierCurveTo(124, 150, 160, 96, 200, 82);
    g.bezierCurveTo(240, 96, 276, 150, 244, 194);
    g.closePath();
    g.fill();
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(200, 84);
    g.lineTo(200, 50);
    g.stroke();
    g.beginPath();
    g.arc(200, 62, 4, 0, TAU);
    g.fill();
    // chhatris (cúpulas menores)
    for (const cx of [138, 262]) {
      g.fillRect(cx - 11, 198, 22, 20);
      g.beginPath();
      g.moveTo(cx - 13, 200);
      g.bezierCurveTo(cx - 16, 186, cx - 4, 176, cx, 172);
      g.bezierCurveTo(cx + 4, 176, cx + 16, 186, cx + 13, 200);
      g.fill();
    }
    // 4 minaretes (os de trás um pouco menores), com sacadas e cúpula
    for (const [mx, top] of [
      [34, 150],
      [84, 176],
      [316, 176],
      [366, 150],
    ]) {
      poly(g, [mx - 7, 352, mx - 5, top, mx + 5, top, mx + 7, 352]);
      for (const f of [0.25, 0.55, 0.85]) g.fillRect(mx - 10, top + (352 - top) * (1 - f), 20, 4);
      g.beginPath();
      g.arc(mx, top - 2, 8, Math.PI, 0);
      g.fill();
      g.fillRect(mx - 1, top - 18, 2, 10);
    }
    // iwan central (arco ogival) e arcos menores
    const arch = (x: number, y: number, w: number, h: number) => {
      g.beginPath();
      g.moveTo(x - w / 2, y);
      g.lineTo(x - w / 2, y - h * 0.62);
      g.quadraticCurveTo(x - w / 2, y - h * 0.9, x, y - h);
      g.quadraticCurveTo(x + w / 2, y - h * 0.9, x + w / 2, y - h * 0.62);
      g.lineTo(x + w / 2, y);
      g.closePath();
      g.fill();
    };
    cut(g, () => {
      arch(200, 352, 46, 112);
      for (const ax of [140, 260]) {
        arch(ax, 352, 18, 46);
        arch(ax, 290, 18, 46);
      }
    });
    // moldura do iwan
    g.lineWidth = 2;
    g.strokeRect(170, 230, 60, 122);
  });
}

/** Cristo Redentor: estátua de braços abertos sobre o morro (Corcovado). */
function cristo(n: number) {
  return silhouette(n, (g) => {
    // morro
    poly(g, [0, 396, 50, 352, 110, 334, 150, 284, 176, 258, 190, 250, 212, 250, 232, 266, 262, 300, 300, 336, 352, 356, 400, 396]);
    // pedestal
    g.fillRect(184, 222, 32, 30);
    g.fillRect(180, 218, 40, 6);
    // túnica (estreita, abrindo um pouco embaixo)
    poly(g, [181, 110, 219, 110, 222, 218, 178, 218]);
    // braços abertos (mais finos nas mãos) e mangas caídas perto do corpo
    poly(g, [36, 104, 184, 98, 216, 98, 364, 104, 364, 113, 216, 122, 184, 122, 36, 113]);
    poly(g, [146, 116, 182, 116, 182, 146]);
    poly(g, [254, 116, 218, 116, 218, 146]);
    // cabeça e pescoço
    g.fillRect(195, 90, 10, 12);
    g.beginPath();
    g.arc(200, 82, 12, 0, TAU);
    g.fill();
    // dobras da túnica
    cut(g, () => {
      g.lineWidth = 1.6;
      for (const x of [193, 207]) {
        g.beginPath();
        g.moveTo(x, 128);
        g.lineTo(x + (x < 200 ? -3 : 3), 214);
        g.stroke();
      }
    });
  });
}

/** Elmo espartano (coríntio genérico, 3/4): crista de crina, abertura em T, protetores de bochecha. */
function helmet(n: number) {
  return silhouette(n, (g) => {
    // crista de crina em meia-lua, separada da calota (só o suporte no meio)
    g.beginPath();
    g.moveTo(92, 182);
    g.bezierCurveTo(96, 40, 318, 6, 356, 196);
    g.lineTo(334, 200);
    g.bezierCurveTo(300, 70, 140, 80, 118, 182);
    g.closePath();
    g.fill();
    g.fillRect(210, 96, 22, 40); // suporte da crista
    // calota
    g.beginPath();
    g.ellipse(220, 216, 96, 86, 0, Math.PI, TAU);
    g.fill();
    // corpo: protetores de bochecha em ponta na frente, nuca abrindo atrás
    poly(g, [124, 212, 118, 292, 134, 380, 170, 374, 186, 322, 214, 306, 252, 316, 288, 356, 338, 362, 326, 300, 316, 212]);
    cut(g, () => {
      // abertura em T: faixa dos olhos e fenda até embaixo entre as bochechas
      g.beginPath();
      g.moveTo(112, 236);
      g.quadraticCurveTo(172, 222, 232, 238);
      g.quadraticCurveTo(228, 264, 210, 272);
      g.quadraticCurveTo(160, 264, 112, 274);
      g.closePath();
      g.fill();
      poly(g, [142, 262, 186, 262, 176, 390, 150, 390]);
      // pelos da crina (traços finos atravessando a meia-lua)
      g.lineWidth = 1.6;
      for (let k = 1; k < 24; k++) {
        const t = k / 24;
        const a = Math.PI * (1 - t);
        const cx = 225;
        const cy = 182;
        g.beginPath();
        g.moveTo(cx + Math.cos(a) * 100, cy - Math.sin(a) * 92);
        g.lineTo(cx + Math.cos(a) * 140, cy - Math.sin(a) * 150);
        g.stroke();
      }
      // sobrancelha gravada
      g.lineWidth = 2.4;
      g.beginPath();
      g.moveTo(122, 226);
      g.quadraticCurveTo(210, 206, 314, 224);
      g.stroke();
    });
    // protetor do nariz (entre os olhos)
    g.fillRect(156, 232, 11, 50);
  });
}

export const SHAPES: Record<ShapeId, ShapeDef> = {
  sphere: { motion: "spin", build: sphere },
  mountains: { motion: "spin", build: mountains },
  machuPicchu: { motion: "sway", build: machuPicchu },
  greatWall: { motion: "sway", build: greatWall },
  petra: { motion: "sway", build: petra },
  colosseum: { motion: "spin", build: colosseum },
  chichenItza: { motion: "spin", build: chichenItza },
  tajMahal: { motion: "sway", build: tajMahal },
  cristo: { motion: "sway", build: cristo },
  helmet: { motion: "sway", build: helmet },
  code: { motion: "sway", build: code },
};

/** Sequência completa (desktop) e reduzida (celular e nível baixo). */
export const SEQUENCE_FULL: ShapeId[] = [
  "sphere",
  "mountains",
  "machuPicchu",
  "greatWall",
  "petra",
  "colosseum",
  "chichenItza",
  "tajMahal",
  "cristo",
  "helmet",
  "code",
];
export const SEQUENCE_LIGHT: ShapeId[] = ["sphere", "mountains", "colosseum", "cristo", "helmet"];

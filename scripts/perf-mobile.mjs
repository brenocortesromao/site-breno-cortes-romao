// Perfil de rolagem no celular: Chromium emulando um Android médio (390 × 844, toque, CPU 4x mais lenta, GPU real),
// rolando do topo ao fim com arrastos de dedo (Input.dispatchTouchEvent). Mede os quadros (rAF) por seção e conta,
// DURANTE a rolagem, os refresh do ScrollTrigger (mudanças nos pin-spacers) e os contextos WebGL criados.
// ADDRBAR=1 simula a barra de endereço do Chrome aparecendo e sumindo (innerHeight 844 ↔ 788) a cada 3 arrastos.
// TRACE=1 grava um trace do Chrome e mede o thread principal SÓ enquanto o dedo arrasta: tempo ocupado e
// tarefas acima de 8,3 ms (um quadro a 120 Hz) e de 16,7 ms, por seção (meta: só o compositor trabalha).
// Uso: npx next start -p 3100 e depois  node scripts/perf-mobile.mjs [url] [rótulo]
import { chromium } from "playwright";

const url = process.argv[2] ?? "http://localhost:3100/pt";
const label = process.argv[3] ?? "medida";
const cpu = Number(process.env.CPU ?? 4);
const addrBar = !!process.env.ADDRBAR;
const W = 390;
const H = 844;

const browser = await chromium.launch({ args: ["--enable-gpu", "--ignore-gpu-blocklist", "--use-angle=d3d11"] });
const ctx = await browser.newContext({
  viewport: { width: W, height: H },
  deviceScaleFactor: 2.625,
  hasTouch: true,
  isMobile: true,
  userAgent:
    "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36",
});
await ctx.addInitScript(() => {
  window.__gl = [];
  const orig = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (type, ...rest) {
    const c = orig.call(this, type, ...rest);
    if (/webgl/.test(type) && c && !this.__counted) {
      this.__counted = true;
      window.__gl.push(performance.now());
    }
    return c;
  };
});
const page = await ctx.newPage();
const cdp = await ctx.newCDPSession(page);
// decisões do monitor de qualidade (ex.: cena que caiu para o pôster)
const quality = [];
page.on("console", (m) => m.text().startsWith("[qualidade]") && quality.push(m.text()));
await page.goto(url, { waitUntil: "load" });
await page.waitForTimeout(3000);
const info = await page.evaluate(() => {
  const gl = document.createElement("canvas").getContext("webgl2");
  const d = gl?.getExtension("WEBGL_debug_renderer_info");
  return gl ? String(gl.getParameter(d ? d.UNMASKED_RENDERER_WEBGL : gl.RENDERER)) : "sem webgl2";
});
console.log(`[${label}] GPU: ${info.slice(0, 60)} | CPU ${cpu}x | barra de endereço: ${addrBar ? "sim" : "não"}`);
await cdp.send("Emulation.setCPUThrottlingRate", { rate: cpu });
await page.waitForTimeout(1500);

await page.evaluate(() => {
  window.__frames = [];
  window.__refresh = [];
  window.__maxCtx = 0;
  window.__t0 = performance.now();
  // seção no centro da tela, por IntersectionObserver (sem ler scrollY a cada
  // quadro: isso forçaria layout e distorceria a própria medida)
  window.__sec = "(topo)";
  const secIo = new IntersectionObserver(
    (es) => es.forEach((e) => e.isIntersecting && (window.__sec = e.target.id || e.target.tagName.toLowerCase())),
    { rootMargin: "-50% 0px -50% 0px" },
  );
  document.querySelectorAll("section[id], footer").forEach((el) => secIo.observe(el));
  setInterval(() => {
    let live = 0;
    document.querySelectorAll("canvas").forEach((c) => c.__counted && c.isConnected && live++);
    window.__maxCtx = Math.max(window.__maxCtx, live);
  }, 250);
  const mo = new MutationObserver((ms) => {
    if (ms.some((m) => m.target.classList?.contains("pin-spacer"))) window.__refresh.push([performance.now(), window.__sec]);
  });
  mo.observe(document.body, { attributes: true, attributeFilter: ["style"], subtree: true });
  window.__loaf = [];
  new PerformanceObserver((l) => {
    for (const e of l.getEntries()) {
      const scripts = e.scripts.map((x) => [
        (x.sourceURL.split("/").pop() || x.invoker || "?") + (x.sourceFunctionName ? ":" + x.sourceFunctionName : "") + " <" + x.invokerType + ">",
        x.duration,
      ]);
      window.__loaf.push({ sec: window.__sec, dur: e.duration, layout: e.styleAndLayoutStart ? e.startTime + e.duration - e.styleAndLayoutStart : 0, block: e.blockingDuration, scripts });
    }
  }).observe({ type: "long-animation-frame", buffered: false });
  let last = performance.now();
  const loop = (t) => {
    window.__frames.push([t, t - last, window.__sec]);
    last = t;
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
});

if (process.env.PROFILE) {
  await cdp.send("Profiler.enable");
  await cdp.send("Profiler.setSamplingInterval", { interval: 200 });
  await cdp.send("Profiler.start");
}
const trace = [];
if (process.env.TRACE) {
  cdp.on("Tracing.dataCollected", (e) => trace.push(...e.value));
  await cdp.send("Tracing.start", { categories: "toplevel,blink.user_timing,devtools.timeline,cc,benchmark", transferMode: "ReportEvents" });
}
const drag = async (dist) => {
  const x = 30;
  const y0 = H - 120;
  const steps = Math.round(dist / 28);
  if (process.env.TRACE) await page.evaluate(() => performance.mark("arrasto-ini:" + window.__sec));
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y: y0 }] });
  for (let i = 1; i <= steps; i++) {
    await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x, y: y0 - i * 28 }] });
    await page.waitForTimeout(16);
  }
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  if (process.env.TRACE) await page.evaluate(() => performance.mark("arrasto-fim"));
};

let y = 0;
let prev = -1;
let stuck = 0;
let n = 0;
let short = false;
for (;;) {
  const total = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
  if (y >= total - 4 || stuck > 4) break;
  await drag(560);
  await page.waitForTimeout(250);
  n++;
  if (addrBar && n % 3 === 0) {
    short = !short;
    // como a barra do Chrome no Android: muda só window.innerHeight e dispara resize;
    // svh/lvh e o layout não mudam (a emulação de viewport mudaria também o svh)
    await page.evaluate((h) => {
      Object.defineProperty(window, "innerHeight", { configurable: true, get: () => h });
      window.dispatchEvent(new Event("resize"));
    }, short ? H - 56 : H);
  }
  y = await page.evaluate(() => window.scrollY);
  stuck = y === prev ? stuck + 1 : 0;
  prev = y;
}
await page.waitForTimeout(800);
if (process.env.TRACE) {
  const done = new Promise((r) => cdp.once("Tracing.tracingComplete", r));
  await cdp.send("Tracing.end");
  await done;
  // marcas de início/fim de cada arrasto (no thread principal do renderizador)
  const marks = trace.filter((e) => e.cat?.includes("blink.user_timing") && /^arrasto-/.test(e.name)).sort((a, b) => a.ts - b.ts);
  const main = marks[0] && { pid: marks[0].pid, tid: marks[0].tid };
  const windows = [];
  for (let i = 0; i < marks.length; i++) {
    if (!marks[i].name.startsWith("arrasto-ini:")) continue;
    const end = marks.slice(i + 1).find((m) => m.name === "arrasto-fim");
    if (end) windows.push({ sec: marks[i].name.split(":")[1], a: marks[i].ts, b: end.ts });
  }
  const tasks = trace.filter((e) => main && e.pid === main.pid && e.tid === main.tid && e.ph === "X" && (e.name === "RunTask" || e.name === "ThreadControllerImpl::RunTask") && e.dur);
  const per = new Map();
  for (const w of windows) {
    const r = per.get(w.sec) ?? { ms: 0, busy: 0, over8: 0, over16: 0, n: 0 };
    r.ms += (w.b - w.a) / 1000;
    for (const t of tasks) {
      const a = Math.max(t.ts, w.a);
      const b = Math.min(t.ts + t.dur, w.b);
      if (b <= a) continue;
      r.busy += (b - a) / 1000;
      r.n++;
      if (t.dur > 8333) r.over8++;
      if (t.dur > 16667) r.over16++;
    }
    per.set(w.sec, r);
  }
  console.log(`
Thread principal DURANTE o arrasto (CPU ${cpu}x; meta 120 Hz = 8,3 ms por quadro):`);
  console.log("seção".padEnd(20), "arrasto ms".padStart(10), "ocupado".padStart(8), ">8,3ms".padStart(7), ">16,7ms".padStart(8));
  let T = { ms: 0, busy: 0, over8: 0, over16: 0 };
  for (const [sec, r] of per) {
    T = { ms: T.ms + r.ms, busy: T.busy + r.busy, over8: T.over8 + r.over8, over16: T.over16 + r.over16 };
    console.log(sec.padEnd(20), r.ms.toFixed(0).padStart(10), `${((100 * r.busy) / r.ms).toFixed(0)}%`.padStart(8), String(r.over8).padStart(7), String(r.over16).padStart(8));
  }
  // quadros do COMPOSITOR durante o arrasto (o que o dedo sente): PipelineReporter
  // apresentado (inteiro ou só a parte do compositor, que já move a rolagem) ou descartado
  const frames = new Map();
  for (const e of trace) {
    if (e.name !== "PipelineReporter" || e.ph !== "b") continue;
    const fr = e.args?.frame_reporter ?? e.args?.chrome_frame_reporter;
    const state = fr?.state;
    if (!state || /NO_UPDATE/.test(state)) continue;
    const w = windows.find((w) => e.ts >= w.a && e.ts <= w.b);
    if (!w) continue;
    const r = frames.get(w.sec) ?? { all: 0, partial: 0, dropped: 0 };
    if (/DROPPED/.test(state)) r.dropped++;
    else if (/PARTIAL/.test(state)) r.partial++;
    else r.all++;
    frames.set(w.sec, r);
  }
  if (frames.size) {
    console.log("\nQuadros do compositor durante o arrasto (apresentados inteiros / só compositor / descartados):");
    let F = { all: 0, partial: 0, dropped: 0 };
    for (const [sec, r] of frames) {
      F = { all: F.all + r.all, partial: F.partial + r.partial, dropped: F.dropped + r.dropped };
      const n = r.all + r.partial + r.dropped;
      console.log(`  ${sec.padEnd(20)} ${String(r.all).padStart(5)} ${String(r.partial).padStart(5)} ${String(r.dropped).padStart(5)}  descartados ${((100 * r.dropped) / n).toFixed(1)}%`);
    }
    const n = F.all + F.partial + F.dropped;
    console.log(`  ${"TOTAL".padEnd(20)} ${String(F.all).padStart(5)} ${String(F.partial).padStart(5)} ${String(F.dropped).padStart(5)}  descartados ${((100 * F.dropped) / n).toFixed(1)}%`);
  }
  // o que o thread principal fez durante os arrastos (eventos aninhados, tempo total por tipo)
  const kinds = new Map();
  const inDrag = (t) => windows.some((w) => t.ts < w.b && t.ts + t.dur > w.a);
  for (const e of trace) {
    if (!main || e.pid !== main.pid || e.tid !== main.tid || e.ph !== "X" || !e.dur || e.name === "RunTask" || e.name === "ThreadControllerImpl::RunTask") continue;
    if (!inDrag(e)) continue;
    const k = e.name === "FunctionCall" || e.name === "EvaluateScript" ? `${e.name} ${(e.args?.data?.url || "").split("/").pop()}:${e.args?.data?.functionName || ""}` : e.name;
    kinds.set(k, (kinds.get(k) ?? 0) + e.dur / 1000);
  }
  // pinturas durante o arrasto por elemento (backendNodeId do trace)
  const paints = new Map();
  for (const e of trace) {
    if (!main || e.pid !== main.pid || e.tid !== main.tid || e.name !== "Paint" || !e.dur || !inDrag(e)) continue;
    const id = e.args?.data?.nodeId;
    const r = paints.get(id) ?? { ms: 0, n: 0 };
    r.ms += e.dur / 1000;
    r.n++;
    paints.set(id, r);
  }
  const topPaints = [...paints].sort((x, y) => y[1].ms - x[1].ms).slice(0, 8);
  console.log("  pinturas durante o arrasto (ms, vezes, elemento):");
  for (const [id, r] of topPaints) {
    let desc = String(id);
    try {
      const { node } = await cdp.send("DOM.describeNode", { backendNodeId: id });
      const attrs = Object.fromEntries((node.attributes ?? []).reduce((acc, v, i, arr) => (i % 2 ? acc : [...acc, [v, arr[i + 1]]]), []));
      desc = `<${node.nodeName.toLowerCase()}${attrs.id ? "#" + attrs.id : ""} class="${(attrs.class ?? "").slice(0, 90)}">`;
    } catch {
      /* nó já removido */
    }
    console.log(`    ${r.ms.toFixed(0).padStart(6)} ms ${String(r.n).padStart(5)}x  ${desc}`);
  }
  const top = [...kinds].sort((x, y) => y[1] - x[1]).slice(0, 14);
  console.log("  tipos de trabalho (ms, aninhados): " + top.map(([k, v]) => `${k} ${v.toFixed(0)}`).join(" | "));
  console.log("TOTAL".padEnd(20), T.ms.toFixed(0).padStart(10), `${((100 * T.busy) / T.ms).toFixed(0)}%`.padStart(8), String(T.over8).padStart(7), String(T.over16).padStart(8));
}
if (process.env.PROFILE) {
  // PROFILE=1: funções com mais tempo próprio durante a rolagem (amostragem da CPU)
  const { profile } = await cdp.send("Profiler.stop");
  const self = new Map();
  const byId = new Map(profile.nodes.map((n) => [n.id, n]));
  const dts = profile.timeDeltas;
  profile.samples.forEach((id, i) => {
    const n = byId.get(id);
    const f = n.callFrame;
    const k = `${f.functionName || "(anônima)"} ${f.url.split("/").pop()}:${f.lineNumber}:${f.columnNumber}`;
    self.set(k, (self.get(k) ?? 0) + (dts[i] ?? 0) / 1000);
  });
  const total = [...self.values()].reduce((a, b) => a + b, 0);
  console.log(`
CPU (tempo próprio, total ${total.toFixed(0)} ms):`);
  [...self].sort((a, b) => b[1] - a[1]).slice(0, 30).forEach(([k, v]) => console.log(`  ${v.toFixed(0).padStart(6)} ms  ${k}`));
}
const data = await page.evaluate(() => {
  const secs = [...document.querySelectorAll("section[id], footer")].map((s) => {
    const r = s.getBoundingClientRect();
    return { id: s.id || s.tagName.toLowerCase(), top: r.top + scrollY, bottom: r.bottom + scrollY };
  });
  return { loaf: window.__loaf, frames: window.__frames, secs, refresh: window.__refresh, gl: window.__gl.filter((t) => t > window.__t0), maxCtx: window.__maxCtx };
});
const rows = new Map();
let all = 0;
let allSlow = 0;
for (const [, dt, id] of data.frames) {
  if (dt > 1000) continue;
  const r = rows.get(id) ?? { n: 0, slow: 0, worst: 0, sum: 0, ts: [] };
  r.n++;
  r.sum += dt;
  r.ts.push(dt);
  all++;
  if (dt > 33.4) {
    r.slow++;
    allSlow++;
  }
  r.worst = Math.max(r.worst, dt);
  rows.set(id, r);
}
console.log("seção".padEnd(20), "quadros".padStart(7), ">33ms".padStart(6), "%".padStart(4), "p95ms".padStart(6), "pior".padStart(6), "fps".padStart(4));
for (const id of ["(topo)", ...data.secs.map((s) => s.id)]) {
  const r = rows.get(id);
  if (!r) continue;
  r.ts.sort((a, b) => a - b);
  const p95 = r.ts[Math.floor(r.ts.length * 0.95)] ?? 0;
  console.log(
    id.padEnd(20),
    String(r.n).padStart(7),
    String(r.slow).padStart(6),
    ((100 * r.slow) / r.n).toFixed(0).padStart(4),
    p95.toFixed(0).padStart(6),
    r.worst.toFixed(0).padStart(6),
    ((1000 * r.n) / r.sum).toFixed(0).padStart(4),
  );
}
if (process.env.WHY) {
  const by = new Map();
  for (const f of data.loaf) {
    const id = f.sec;
    const b = by.get(id) ?? { n: 0, layout: 0, scripts: new Map(), dur: 0 };
    b.n++;
    b.dur += f.dur;
    b.layout += f.layout;
    for (const [k, d] of f.scripts) b.scripts.set(k, (b.scripts.get(k) ?? 0) + d);
    by.set(id, b);
  }
  console.log("\nQuadros longos (LoAF > 50 ms) por seção: total, estilo+layout+pintura, scripts que mais pesaram");
  for (const [id, b] of by) {
    const top = [...b.scripts].sort((a, c) => c[1] - a[1]).slice(0, 4).map(([k, d]) => `${k} ${d.toFixed(0)}`).join(" | ");
    console.log(`  ${id}: ${b.n} quadros, ${b.dur.toFixed(0)} ms; render ${b.layout.toFixed(0)} ms; ${top}`);
  }
}
console.log(`TOTAL: ${all} quadros, ${allSlow} acima de 33 ms (${((100 * allSlow) / all).toFixed(1)}%)`);
console.log(`Refresh do ScrollTrigger durante a rolagem (mudanças em pin-spacer): ${data.refresh.length}${data.refresh.length ? " em " + [...new Set(data.refresh.map(([, sec]) => sec))].join(", ") : ""}`);
if (quality.length) console.log("Monitor de qualidade:\n  " + quality.join("\n  "));
console.log(`Contextos WebGL criados durante a rolagem: ${data.gl.length}; máximo vivo ao mesmo tempo: ${data.maxCtx}`);
await browser.close();

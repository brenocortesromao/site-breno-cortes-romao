// Pôsteres das cenas 3D de fundo no celular (lib/posters.ts): o PRIMEIRO QUADRO que cada cena desenha, com a
// mesma câmera, enquadramento, luz, cor e corte. Chromium com GPU real emulando um celular (412 × 915, DPR 1,25,
// toque), uma página por cena no modo de captura (?poster=<cena>): só essa cena pede a vaga de contexto WebGL, o
// canvas guarda o quadro (preserveDrawingBuffer) e o 1º quadro é publicado em window.__poster.
// Nuvens, montanhas, oceano e floresta têm campo de visão VERTICAL fixo em pé: numa tela mais estreita o quadro é
// o mesmo, só cortado nas laterais. Por isso são gerados mais largos (WIDE × 915) e o site recorta pelo centro
// (object-cover): bate com qualquer celular em pé, com ou sem a barra de endereço. O espaço reenquadra o planeta
// pela largura da tela: é gerado em 412 de largura.
// - Cenas 3D: "inicio" (seção logo abaixo da tela, progresso 0) e "fim" (logo acima, progresso 1), em WebP.
// - Curvas líquidas: uma máscara (cobertura das linhas) do tamanho da camada na tela mais estreita (360 px), WebP
//   sem perdas; o site pinta com --graphic e ancora embaixo à esquerda, como o shader.
// Saída: public/posters/*.webp e src/content/posters.json (caminhos e tamanhos).
// Uso: npm run build e depois  node scripts/build-posters.mjs [url]   (sobe o `next start` na porta 3100 se preciso)
// ONLY=montanhas,curvas-a refaz só essas cenas (o resto do manifesto é mantido). Depois, npm run build de novo.
import { spawn } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";
import sharp from "sharp";

const url = process.argv[2] ?? "http://localhost:3100/pt";
const root = path.resolve(import.meta.dirname, "..");
const outDir = path.join(root, "public", "posters");
const manifestPath = path.join(root, "src", "content", "posters.json");

const W = 412;
const H = 915;
/** Largura da captura das cenas de campo de visão vertical (proporção até 0,66: todos os celulares em pé). */
const WIDE = 600;
const WIDTH = { espaco: W };
const DPR = 1.25;
const only = process.env.ONLY?.split(",").map((s) => s.trim());
const pick = (names) => (only ? names.filter((n) => only.includes(n)) : names);
const SCENES = pick(["nuvens", "montanhas", "oceano", "floresta", "espaco"]);
const CURVES = pick(["curvas-a", "curvas-b"]);
/** Largura da máscara das curvas (px de CSS): cobre celulares de até 480 px. */
const MASK_W = 480;

const device = (width, height) => ({
  viewport: { width, height },
  deviceScaleFactor: DPR,
  hasTouch: true,
  isMobile: true,
  userAgent:
    "Mozilla/5.0 (Linux; Android 14; moto edge 50 neo) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36",
});

// ---------------------------------------------------------------- servidor
async function reachable() {
  try {
    const r = await fetch(url, { method: "HEAD" });
    return r.ok;
  } catch {
    return false;
  }
}
let server = null;
if (!(await reachable())) {
  const port = new URL(url).port || "3100";
  console.log(`subindo next start -p ${port}...`);
  server = spawn("npx", ["next", "start", "-p", port], { cwd: root, shell: true, stdio: "ignore" });
  for (let i = 0; i < 60 && !(await reachable()); i++) await new Promise((r) => setTimeout(r, 1000));
  if (!(await reachable())) throw new Error("o servidor não respondeu em " + url);
}

const browser = await chromium.launch({ args: ["--enable-gpu", "--ignore-gpu-blocklist", "--use-angle=d3d11"] });

async function withPage(width, height, fn) {
  const ctx = await browser.newContext(device(width, height));
  const page = await ctx.newPage();
  page.on("pageerror", (e) => console.warn("  [página]", e.message));
  try {
    return await fn(page);
  } finally {
    await ctx.close();
  }
}

/** Abre a página no modo de captura, rola até a posição e espera o 1º quadro publicado. */
async function capture(page, name, query, place) {
  await page.goto(`${url}?poster=${name}${query}`, { waitUntil: "load" });
  const gpu = await page.evaluate(() => {
    const gl = document.createElement("canvas").getContext("webgl2");
    const d = gl?.getExtension("WEBGL_debug_renderer_info");
    return gl ? String(gl.getParameter(d ? d.UNMASKED_RENDERER_WEBGL : gl.RENDERER)) : "";
  });
  if (!gpu || /swiftshader|llvmpipe|software|basic render/i.test(gpu)) throw new Error(`sem GPU real no Chromium (${gpu || "sem WebGL2"})`);
  await page.waitForTimeout(1200);
  await page.evaluate(
    ({ name, place }) => {
      const el = document.querySelector(`[data-scene="${name}"]`);
      if (!el) throw new Error(`[data-scene="${name}"] não encontrado`);
      const r = el.getBoundingClientRect();
      const top = r.top + window.scrollY;
      const vh = window.innerHeight;
      // início: a seção começa 1,2 tela abaixo (progresso 0); fim: termina 0,2 tela acima (progresso 1);
      // máscara: a seção na tela
      const y = place === "inicio" ? top - 1.2 * vh : place === "fim" ? top + r.height + 0.2 * vh : top - 0.3 * vh;
      window.scrollTo(0, Math.max(0, y));
    },
    { name, place },
  );
  await page.waitForFunction(() => typeof window.__poster === "string", null, { timeout: 120000, polling: 250 });
  const data = await page.evaluate(() => window.__poster);
  return Buffer.from(data.split(",")[1], "base64");
}

await mkdir(outDir, { recursive: true });
const manifest = only ? JSON.parse(await readFile(manifestPath, "utf8")) : {};

for (const name of SCENES) {
  const entry = {};
  for (const place of ["inicio", "fim"]) {
    const png = await withPage(WIDTH[name] ?? WIDE, H, (page) => capture(page, name, "", place));
    const meta = await sharp(png).metadata();
    const file = `${name}-${place}.webp`;
    const webp = await sharp(png).webp({ quality: 82, alphaQuality: 90, effort: 6 }).toBuffer();
    await writeFile(path.join(outDir, file), webp);
    entry[place] = `/posters/${file}`;
    console.log(`${file}: ${meta.width} × ${meta.height} px, ${(webp.length / 1024).toFixed(1)} KB`);
  }
  manifest[name] = entry;
}

for (const name of CURVES) {
  // altura da camada das curvas na tela mais estreita (a seção fica mais alta), com folga
  const layerH = await withPage(360, 800, async (page) => {
    await page.goto(url, { waitUntil: "load" });
    await page.waitForTimeout(1500);
    return page.evaluate((name) => {
      const el = document.querySelector(`[data-scene="${name}"]`);
      return el?.firstElementChild?.getBoundingClientRect().height ?? 0;
    }, name);
  });
  if (!layerH) throw new Error(`camada de ${name} não encontrada`);
  const maskH = Math.ceil((layerH * 1.08) / 10) * 10;
  const png = await withPage(W, H, (page) => capture(page, name, `&pw=${MASK_W}&ph=${maskH}`, "mascara"));
  const meta = await sharp(png).metadata();
  const file = `${name}.webp`;
  const webp = await sharp(png).webp({ lossless: true, effort: 6 }).toBuffer();
  await writeFile(path.join(outDir, file), webp);
  manifest[name] = { mask: `/posters/${file}`, w: MASK_W, h: maskH };
  console.log(`${file}: ${meta.width} × ${meta.height} px (${MASK_W} × ${maskH} px de CSS), ${(webp.length / 1024).toFixed(1)} KB`);
}

await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
console.log(`manifesto: ${path.relative(root, manifestPath)}`);
await browser.close();
if (server) {
  if (process.platform === "win32") spawn("taskkill", ["/pid", String(server.pid), "/T", "/F"], { stdio: "ignore" });
  else server.kill();
}

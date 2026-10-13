// Gera as imagens de compartilhamento e os ícones do site (rodar de novo só se
// o nome, o título ou a assinatura mudarem):
//   node scripts/build-og.mjs
// - public/og.png (1200 × 630): fundo preto, nome em Archivo Expanded,
//   "Fractional Brand & Creative Director" em Geist Mono e um brilho sutil de
//   metal líquido (gradientes, sem assets externos);
// - src/app/icon.png (512) e src/app/apple-icon.png (180): a assinatura
//   (public/assinatura.svg) em prata sobre preto.
// Usa o Playwright (já instalado) e as fontes do Google Fonts.
import { readFileSync } from "node:fs";
import { chromium } from "playwright";

const NAME = "Breno Côrtes Romão";
const ROLE = "Fractional Brand & Creative Director";
const FONTS =
  "https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@125,500;125,600&family=Geist+Mono:wght@400&display=block";

const og = `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="${FONTS}">
<style>
  html, body { margin: 0; width: 1200px; height: 630px; background: #050506; overflow: hidden; }
  .wrap { position: relative; width: 1200px; height: 630px; }
  /* metal líquido: uma gota cromada difusa à direita, com reflexos */
  .metal { position: absolute; right: -140px; top: 50%; width: 620px; height: 620px; transform: translateY(-50%); border-radius: 50%;
    background:
      radial-gradient(circle at 34% 28%, rgba(255,255,255,0.55) 0 6%, rgba(255,255,255,0) 18%),
      radial-gradient(circle at 62% 70%, rgba(200,203,208,0.28) 0 10%, rgba(200,203,208,0) 34%),
      radial-gradient(circle at 50% 50%, #3a3c40 0%, #1a1b1d 46%, #08080a 72%);
    filter: blur(1.2px); opacity: 0.9; }
  .metal::after { content: ""; position: absolute; inset: -60px; border-radius: 50%;
    background: radial-gradient(circle, rgba(220,222,226,0.10) 0%, rgba(220,222,226,0) 62%); }
  .shine { position: absolute; inset: 0; background: linear-gradient(115deg, rgba(255,255,255,0) 40%, rgba(255,255,255,0.05) 52%, rgba(255,255,255,0) 64%); }
  .text { position: absolute; left: 88px; top: 50%; transform: translateY(-50%); }
  .name { font-family: "Archivo", sans-serif; font-stretch: 125%; font-weight: 600; font-size: 64px; letter-spacing: -0.02em; line-height: 1.02;
    color: #f2f3f4; background: linear-gradient(180deg, #f6f7f8 0%, #cfd1d5 55%, #9fa2a7 100%); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
  .role { margin-top: 28px; font-family: "Geist Mono", monospace; font-size: 22px; letter-spacing: 0.22em; text-transform: uppercase; color: #a7aaaf; }
  .line { margin-top: 36px; width: 96px; height: 1px; background: linear-gradient(90deg, #d9dbde, rgba(217,219,222,0)); }
</style></head><body><div class="wrap"><div class="metal"></div><div class="shine"></div>
<div class="text"><div class="name">Breno Côrtes<br>Romão</div><div class="line"></div><div class="role">${ROLE}</div></div></div></body></html>`;

const sig = readFileSync("public/assinatura.svg", "utf8")
  .replace(/stroke="[^"]*"/g, 'stroke="#d9dbde"')
  .replace(/stroke-width="[^"]*"/, 'stroke-width="13"')
  .replace("<svg", '<svg style="width:78%;height:auto;overflow:visible"');
const icon = (size) => `<!doctype html><html><head><meta charset="utf-8"><style>
  html, body { margin: 0; width: ${size}px; height: ${size}px; background: #050506; }
  .c { width: ${size}px; height: ${size}px; display: grid; place-items: center;
    background: radial-gradient(circle at 50% 42%, #1c1d20 0%, #050506 70%); }
  path { stroke: #d9dbde !important; }
</style></head><body><div class="c">${sig}</div></body></html>`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await page.setContent(og, { waitUntil: "networkidle" });
await page.evaluate(() => document.fonts.ready);
await page.screenshot({ path: "public/og.png" });
for (const [size, out] of [[512, "src/app/icon.png"], [180, "src/app/apple-icon.png"]]) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(icon(size));
  await page.screenshot({ path: out });
}
await browser.close();
console.log(`ok: public/og.png, src/app/icon.png, src/app/apple-icon.png (${NAME})`);

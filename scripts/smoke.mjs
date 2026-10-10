// Teste de fumaça entre navegadores (Playwright): Chromium, Edge, Firefox e WebKit
// em 1920, 1440, 1280, 1024 e 390 px. Rola a página inteira e registra erros
// de console, exceções e scroll horizontal; confere prefers-reduced-motion.
// Uso: npx next start -p 3100 (build de produção) e depois
//      node scripts/smoke.mjs [url]   (padrão http://localhost:3100/pt)
import { chromium, firefox, webkit } from "playwright";

const url = process.argv[2] ?? "http://localhost:3100/pt";
const browsers = [
  ["Chromium", chromium, {}],
  ["Edge", chromium, { channel: "msedge" }],
  ["Firefox", firefox, {}],
  ["WebKit", webkit, {}],
];
const widths = [
  [1920, 1080, false],
  [1440, 900, false],
  [1280, 800, false],
  [1024, 768, false],
  [390, 844, true],
];
// ruído conhecido e inofensivo (aviso interno do R3F; avisos do compilador HLSL do driver)
const IGNORE = /THREE\.Clock|X4122|was detected as the Largest Contentful Paint/;

let failures = 0;
for (const [name, type, opts] of browsers) {
  let browser;
  try {
    browser = await type.launch(opts);
  } catch (e) {
    console.log(`${name}: não abriu (${String(e.message).split("\n")[0]})`);
    continue;
  }
  for (const [w, h, mobile] of widths) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: mobile, isMobile: mobile && name !== "Firefox" });
    const page = await ctx.newPage();
    const errors = [];
    page.on("console", (m) => m.type() === "error" && !IGNORE.test(m.text()) && errors.push(m.text().slice(0, 160)));
    page.on("pageerror", (e) => errors.push(`exceção: ${String(e.message).slice(0, 160)}`));
    await page.goto(url, { waitUntil: "load" });
    await page.waitForTimeout(1500);
    let overflow = 0;
    const total = await page.evaluate(() => document.documentElement.scrollHeight);
    for (let y = 0; y < total; y += h * 0.8) {
      await page.evaluate((yy) => window.scrollTo(0, yy), y);
      await page.waitForTimeout(90);
      overflow = Math.max(
        overflow,
        await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth),
      );
    }
    const ok = errors.length === 0 && overflow <= 0;
    if (!ok) failures++;
    console.log(
      `${ok ? "ok " : "ERRO"} ${name} ${w}px: erros ${errors.length}, scroll horizontal ${overflow}px${errors.length ? "\n      " + errors.slice(0, 3).join("\n      ") : ""}`,
    );
    await ctx.close();
  }
  // prefers-reduced-motion: título da hero visível de imediato, sem animação
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(300);
  const rm = await page.evaluate(() =>
    [...document.querySelectorAll("[data-reveal]")].map((e) => getComputedStyle(e).animationName + "|" + getComputedStyle(e).transform),
  );
  const rmOk = rm.every((v) => v.startsWith("none|") && (v.endsWith("|none") || v.endsWith("matrix(1, 0, 0, 1, 0, 0)")));
  if (!rmOk) failures++;
  console.log(`${rmOk ? "ok " : "ERRO"} ${name} reduced motion: ${rm.join(", ")}`);
  await ctx.close();
  await browser.close();
}
console.log(failures ? `\n${failures} falha(s)` : "\ntudo ok");
process.exit(failures ? 1 : 0);

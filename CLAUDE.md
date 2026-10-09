# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Bilingual (PT default / EN) personal business site for a Fractional Brand & Creative Director, statically generated per locale. Next.js 16 (App Router, Turbopack) + React 19 + Tailwind CSS 4 + TypeScript, with Lenis smooth scroll, GSAP/ScrollTrigger, and Three.js via React Three Fiber in the hero.

## Direção do projeto

Site do negócio do dono como **Fractional Brand & Creative Director**: proposta de valor, portfólio, currículo, serviços, clientes e cases.

- **Nome (regra fixa):** sempre **"Breno Côrtes Romão"**, completo e com acento, em todo lugar: cabeçalho, manifesto, assinatura, Sobre, rodapé, `<title>`, metadados de SEO e textos nos dois idiomas. Nunca abreviar ("Breno", "Breno Côrtes"). O nome vive numa única chave das mensagens (`site.name`) e é reutilizado a partir dela.

- **Visual:** fundo preto, grafite e prata líquida; estética startup tech premium e corporativa; tipografia exclusivamente sans-serif.
- **Elemento central:** um urso 3D escultórico de metal líquido (cromado), sem aparência infantil ou cartoon. **Sem órbitas nem partículas decorativas.** Hoje a hero usa uma gota de metal líquido provisória no lugar do urso.
- **Referência de movimento:** landonorris.com — apenas o comportamento de scroll, o uso de 3D e o ritmo. Não copiar o visual, a identidade nem os assets.
- **Assets:** não usar assets externos (modelos, imagens, fontes, logos) sem aprovação explícita do dono. Fotos, logos de clientes e cases reais serão fornecidos por ele.

**Etapas** (uma por vez; informar o que foi concluído ao final de cada uma):
1. Hero e responsividade — **concluída**.
2. Metal líquido + scroll cinematográfico — **concluída** (Lenis, gota de metal líquido provisória, hero fixa com transição para o manifesto).
3. Estrutura bilíngue — **em andamento**, em 6 partes; commit ao fim de cada parte validada; **parar após a parte 2 para revisão do dono**:
   1. Base de idiomas (next-intl, /pt e /en, seletor, mensagens) — **concluída**.
   2. Escala (seções ≥ 1 tela), cabeçalho fixo, hero com 3D em tela cheia, sistema de temas claro/escuro, manifesto "mensagem de Breno Côrtes Romão" (retrato monocromático + assinatura desenhada pelo scroll).
   3. O que é fractional (claro, curvas de nível), O que faço (pilares em pin), O que muda (antes/depois).
   4. Números, Como funciona (claro, grade técnica), FAQ.
   5. Bastidores e Cases (galerias horizontais) + páginas `/[locale]/cases/[slug]`.
   6. Marcas (faixa de logos), Sobre (claro; resumo na home + `/sobre`), Contato (Cal.com provisório, mídia kit PDF), rodapé.
4. Urso 3D (modelo GLB definitivo com morph target + shader sutil).
5. Conteúdo real PT/EN (fotos, logos, cases, textos, tradução).
6. Lançamento.

**Conteúdo provisório:** nunca inventar clientes, números, dados de mercado ou cases que pareçam reais ("Case 01", "Marca 01", "XX", "[dado + fonte a confirmar]"). Textos provisórios ficam claramente marcados. `en.json` é, por enquanto, cópia do português.

**Validação ao final de cada etapa:** desktop, tablet/mobile e `npm run build` (além de lint e `tsc`), testando no navegador, inclusive após recarregar a página.

## Commands

On Windows PowerShell use `npm.cmd` / `npx.cmd` (script-execution policy blocks the `.ps1` shims).

- `npm run dev` — dev server on http://localhost:3000
- `npm run build` — production build (also type-checks)
- `npm run lint` — ESLint (flat config, `eslint-config-next` core-web-vitals + typescript)
- `npx tsc --noEmit` — type check only. After adding/moving routes, run `npx next typegen` first (stale `.next/types` otherwise fail with "Cannot find module ../../src/app/page.js").
- Changes to `next.config.ts` (e.g. the next-intl plugin) need a **dev-server restart**; a running `next dev` keeps the old config and fails with "Couldn't find next-intl config file".
- There is no test suite. Verify UI changes in a real browser (the 3D/GSAP behaviour cannot be validated from lint/build alone).

## Read this first

`AGENTS.md` says this Next.js version has breaking changes versus common knowledge; consult `node_modules/next/dist/docs/` before writing Next-specific code. `next.config.ts` enables `cacheComponents` and `partialPrefetching`, and wires Tailwind through a Turbopack loader rule.

## Architecture

Routes live under `src/app/[locale]/` (`layout.tsx` is the root layout, `page.tsx` the home, `not-found.tsx`); `src/app/globals.css` and `favicon.ico` stay at `src/app/`. Components live in `src/components/` (import with `@/components/...`). The client components are `SmoothScroll`, `Hero` (+ its scene), `Manifesto` and `layout/LocaleSwitcher`.

**i18n (next-intl 4)** — chosen because it supports Next 16 `proxy.ts` and `next/root-params` with `cacheComponents` (both `/pt` and `/en` prerender as static):
- `src/i18n/routing.ts`: locales `pt` (default) / `en`, `localePrefix: "always"`, `htmlLang` map (`pt-BR`, `en`).
- `src/proxy.ts` (Next 16's renamed middleware): on `/` it detects the browser language — English → `/en`, everything else → `/pt`. A manual switch sets the `NEXT_LOCALE` cookie, which then wins over detection.
- `src/i18n/request.ts`: reads the locale with `next/root-params` (no `setRequestLocale` needed) and loads `src/messages/{locale}.json`.
- `src/i18n/navigation.ts`: locale-aware `Link`/`usePathname`/`useRouter`. Use these for internal pages instead of `next/link`.
- `src/global.d.ts` types the message keys from `pt.json`; `en.json` must keep the identical structure.
- **All visible text** comes from the messages. Server components use `getTranslations()`. Client components (`Hero`, `Manifesto`, `LocaleSwitcher`) receive their strings as props from the server parent. `NextIntlClientProvider` is mounted with `messages={null}`, so the message files never ship to the browser.
- Metadata (`generateMetadata` in the locale layout): title/description from `meta.*`, canonical, `hreflang` alternates (`pt-BR`, `en`, `x-default`). `metadataBase` comes from `NEXT_PUBLIC_SITE_URL`, which must be set at launch.
- Non-translatable data (layout, aspect ratios, image/logo paths) stays in code (arrays in `page.tsx`, later `src/content/`).

**Pre-hydration scripts:** use `components/InlineScript.tsx` (pattern from the Next 16 guide `preventing-flash-before-hydration`). It avoids React 19's "script tag while rendering" warning.

**Smooth scroll** (`components/SmoothScroll.tsx`, mounted in `[locale]/layout.tsx`): Lenis driven by `gsap.ticker` (`autoRaf: false`), with `lenis.on("scroll", ScrollTrigger.update)`, so Lenis and ScrollTrigger read the same position each frame. `anchors: true` makes `#section` links glide. It does not start under reduced motion. On touch it keeps native scroll (Lenis default `syncTouch: false`). Do not reintroduce CSS `scroll-behavior: smooth`, which fights Lenis.

**Hero pipeline** (`components/Hero.tsx` → `HeroScene.tsx`, `HeroVisual.tsx`, `hero/*`):
- `Hero.tsx` (`"use client"`) owns:
  - the GSAP intro;
  - capability detection (WebGL, reduced motion, coarse pointer);
  - an IntersectionObserver that pauses rendering off-screen;
  - the **hero → manifesto transition**.
- The transition: the hero section is pinned for one viewport with `pinSpacing: false`, so the following sections scroll *over* it.
  - A scrubbed timeline fades the title out in the first 30%.
  - It writes 0→1 into a `progress` ref that the 3D scene reads every frame: the shape shrinks, pushes back and darkens from silver to graphite.
  - It fades the visual out at the end, so the un-pin "jump" is invisible.
  - Sections that must appear above the pinned hero need `relative z-10`; the clients strip and `Manifesto` have it.
- `HeroScene.tsx` (R3F canvas) is loaded with `next/dynamic({ ssr: false })` so Three.js never blocks first paint. It contains:
  - `buildStudioEnvironment`: a graphite studio built in code (PMREM from emissive planes, no external HDRI). Its frontal fill is what makes the chrome read silver instead of black glass.
  - `Rig`: frame-rate-independent lerp of the mouse; it offsets/tilts the group and sweeps `scene.environmentRotation`.
  - `LiquidShape`: the protagonist mesh. It applies the scroll `progress` and feeds the pointer into the shader uniforms.
- **Geometry vs. material are decoupled so the bear GLB can replace the placeholder without touching the scene:**
  - `hero/shape.ts`: the geometry source. Today `createPlaceholderGeometry` returns a dense icosphere of `SHAPE_RADIUS` (detail 40 desktop / 16 on coarse pointers). In stage 3, swap it for a GLB loader returning a mesh with smooth normals, centred at the origin and roughly the same radius.
  - `hero/liquidMetal.ts`: `MeshPhysicalMaterial` (metalness 1, clearcoat) with an `onBeforeCompile` injection.
    - Simplex-noise displacement along the normal, plus a pull toward the pointer; normals are recomputed by finite differences.
    - Uniforms live in `material.userData.uniforms`. The `LIQUID_LIGHT` define drops the second noise octave on mobile.
    - Keep amplitude/frequency low (currently `uAmp` 0.085, `uFreq` 0.55): higher values read as crumpled rock, not liquid.
    - The injection uses base `position`/`normal`; with morph targets, move it after `<morphtarget_vertex>`.
- `HeroVisual.tsx` is the static SVG poster (an organic silver shape, no orbits).
  - It renders immediately, is the fallback when WebGL is missing or the canvas throws (`SceneBoundary`), and cross-fades out once the scene reports ready.
  - Keep its composition in sync with the 3D framing (scene units: half the frame width = 4).
- Reduced motion: GSAP is wrapped in `gsap.matchMedia("(prefers-reduced-motion: no-preference)")`, so there is no pin and no scrub. The canvas uses `frameloop="demand"` and the shader time stays frozen.
- Mobile (coarse pointer): lighter geometry, one noise octave, DPR capped at 1.5, no mouse tracking.

**Manifesto** (`components/Manifesto.tsx`, client): it has a transparent background so the darkened shape stays visible behind it.
- Each word of the large statement is an `inline-block` `[data-word]` span, revealed by a scrubbed ScrollTrigger (opacity 0.12→1 and a small rise).
- The supporting text and portrait (`[data-follow]`) fade in afterwards. Their trigger is the phrase, because the desktop portrait is `hidden` on mobile.

**Intro-animation gotchas**
- Initial hidden state is pure CSS (`.js-motion [data-reveal|data-fade]` in `globals.css`, only under `prefers-reduced-motion: no-preference`). The `js-motion` class is added by an inline script in `layout.tsx` before first paint, and removed after 6s as a safety net so text can never stay hidden.
- GSAP reads the CSS `translateY(120%)` as **pixels**. Any tween on `[data-reveal]` must set `y: 0` alongside `yPercent`, otherwise a pixel offset remains and the headline stays hidden behind its mask.
- The hero text and visual have separate wrapper elements for the intro and the scroll transition, so GSAP transforms don't collide with Tailwind's `-translate-*` positioning.

**Images / logos / cases**: `components/MediaSlot.tsx` is the single frame for photos and case images. Without `src` it renders a labelled placeholder with the same aspect ratio; fill `image` / `src` in the arrays in `page.tsx` (paths under `public/`) to swap in real assets. Placeholder content (email, social `#` links, "Case 01…", logo slots) is still to be replaced.

## Conventions and lint traps

- Typography is **sans-serif only** (Geist via `next/font`; `--font-display` aliases Geist). No serif fonts, no italics for display text; hierarchy comes from weight contrast (light vs. semibold) and tight tracking.
- Palette tokens are CSS variables in `globals.css` (`--background`, `--foreground`, `--silver`, `--line`), exposed to Tailwind through `@theme inline`.
- The React Compiler lint rules reject mutating values returned from hooks. In R3F code, get the scene via `useFrame(({ scene }) => …)` or `useThree((s) => s.get)()` instead of `const scene = useThree(...)`, and keep `onReady`-style callbacks stable (`useCallback`) since they sit in effect dependency arrays. Ref objects passed as props are only treated as mutable if the prop name ends in `Ref` (e.g. `pointerRef`). Mutate materials through a mesh ref (`mesh.current.material`), not through a `useMemo` result.
- Windows PowerShell 5.1 `Get-Content`/`Set-Content` re-encode files (ANSI read, BOM on write) and corrupt the Portuguese accents. Edit files with the editor tools, not PowerShell text pipelines.
- The `THREE.Clock deprecated` console warning comes from inside R3F 9.8.1. It is harmless.
- Git: branch `main`. Commit at the end of each validated stage, and during stage 3 at the end of each validated part, only after lint, `tsc`, build and the desktop/mobile check pass.

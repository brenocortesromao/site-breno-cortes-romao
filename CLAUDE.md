# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Personal site for a creative director (branding / strategy / digital experiences). Single static landing page, copy in pt-BR. Next.js 16 (App Router, Turbopack) + React 19 + Tailwind CSS 4 + TypeScript, with GSAP/ScrollTrigger and Three.js via React Three Fiber in the hero.

## Direção do projeto

Site do negócio do dono como **Fractional Brand & Creative Director**: proposta de valor, portfólio, currículo, serviços, clientes e cases.

- **Visual:** fundo preto, grafite e prata líquida; estética startup tech premium e corporativa; tipografia exclusivamente sans-serif.
- **Elemento central:** um urso 3D escultórico de metal líquido (cromado), sem aparência infantil ou cartoon. **Sem órbitas nem partículas decorativas** — a esfera com órbitas atual é provisória e deve sair.
- **Referência de movimento:** landonorris.com — apenas o comportamento de scroll, o uso de 3D e o ritmo. Não copiar o visual, a identidade nem os assets.
- **Assets:** não usar assets externos (modelos, imagens, fontes, logos) sem aprovação explícita do dono. Fotos, logos de clientes e cases reais serão fornecidos por ele.

**Etapas** (uma por vez; informar o que foi concluído ao final de cada uma):
1. Hero e responsividade — **concluída**.
2. Metal líquido + scroll cinematográfico (protótipo com geometria provisória, estruturado para trocar a geometria depois sem reescrever a cena).
3. Urso 3D (modelo GLB definitivo com morph target + shader sutil).
4. Conteúdo real (fotos, logos, cases, textos).

**Validação ao final de cada etapa:** desktop, tablet/mobile e `npm run build` (além de lint e `tsc`), testando no navegador, inclusive após recarregar a página.

## Commands

On Windows PowerShell use `npm.cmd` / `npx.cmd` (script-execution policy blocks the `.ps1` shims).

- `npm run dev` — dev server on http://localhost:3000
- `npm run build` — production build (also type-checks)
- `npm run lint` — ESLint (flat config, `eslint-config-next` core-web-vitals + typescript)
- `npx tsc --noEmit` — type check only
- There is no test suite. Verify UI changes in a real browser (the 3D/GSAP behaviour cannot be validated from lint/build alone).

## Read this first

`AGENTS.md` says this Next.js version has breaking changes versus common knowledge; consult `node_modules/next/dist/docs/` before writing Next-specific code. `next.config.ts` enables `cacheComponents` and `partialPrefetching`, and wires Tailwind through a Turbopack loader rule.

## Architecture

Everything lives in `src/app`. `page.tsx` is a server component holding the content arrays (`nav`, `clients`, `services`, `projects`) and the non-hero sections. Only the hero is client-side.

**Hero pipeline** (`components/Hero.tsx` → `HeroScene.tsx`, `HeroVisual.tsx`):
- `Hero.tsx` (`"use client"`) owns the GSAP intro, the ScrollTrigger parallax, capability detection (WebGL, reduced motion, coarse pointer) and an IntersectionObserver that pauses rendering off-screen.
- `HeroScene.tsx` (R3F canvas) is loaded with `next/dynamic({ ssr: false })` so Three.js never blocks first paint. It builds its own studio environment map in code (`buildStudioEnvironment`, PMREM from emissive planes — no external HDRI) and contains the mouse `Rig` and the orbit lines.
- `HeroVisual.tsx` is the static SVG poster. It renders immediately, is the fallback when WebGL is missing or the canvas throws (`SceneBoundary`), and cross-fades out once the scene reports ready. Keep its composition in sync with the 3D scene's framing (scene units: half the frame width = 4).
- Reduced motion: GSAP is wrapped in `gsap.matchMedia("(prefers-reduced-motion: no-preference)")` and the canvas uses `frameloop="demand"`.

**Intro-animation gotchas**
- Initial hidden state is pure CSS (`.js-motion [data-reveal|data-fade]` in `globals.css`, only under `prefers-reduced-motion: no-preference`). The `js-motion` class is added by an inline script in `layout.tsx` before first paint, and removed after 6s as a safety net so text can never stay hidden.
- GSAP reads the CSS `translateY(120%)` as **pixels**. Any tween on `[data-reveal]` must set `y: 0` alongside `yPercent`, otherwise a pixel offset remains and the headline stays hidden behind its mask.
- Hero text/visual wrappers are separate elements for intro vs. parallax so GSAP transforms don't collide with Tailwind's `-translate-*` positioning.

**Images / logos / cases**: `components/MediaSlot.tsx` is the single frame for photos and case images. Without `src` it renders a labelled placeholder with the same aspect ratio; fill `image` / `src` in the arrays in `page.tsx` (paths under `public/`) to swap in real assets. Placeholder content (email, social `#` links, project names, studio name) is still to be replaced.

## Conventions and lint traps

- Typography is **sans-serif only** (Geist via `next/font`; `--font-display` aliases Geist). No serif fonts, no italics for display text; hierarchy comes from weight contrast (light vs. semibold) and tight tracking.
- Palette tokens are CSS variables in `globals.css` (`--background`, `--foreground`, `--silver`, `--line`), exposed to Tailwind through `@theme inline`.
- The React Compiler lint rules reject mutating values returned from hooks. In R3F code, get the scene via `useFrame(({ scene }) => …)` or `useThree((s) => s.get)()` instead of `const scene = useThree(...)`, and keep `onReady`-style callbacks stable (`useCallback`) since they sit in effect dependency arrays.
- Git: branch `main`. Commit at the end of each validated stage (see "Etapas"), only after lint, `tsc`, build and the desktop/mobile check pass.

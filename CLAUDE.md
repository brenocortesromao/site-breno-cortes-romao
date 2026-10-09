# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Bilingual (PT default / EN) personal business site for a Fractional Brand & Creative Director, statically generated per locale. Next.js 16 (App Router, Turbopack) + React 19 + Tailwind CSS 4 + TypeScript, with Lenis smooth scroll, GSAP/ScrollTrigger, and Three.js via React Three Fiber in the hero.

## Direção do projeto

Site do negócio do dono como **Fractional Brand & Creative Director**: proposta de valor, portfólio, currículo, serviços, clientes e cases.

- **Nome (regra fixa):** sempre **"Breno Côrtes Romão"**, completo e com acento, em todo lugar: cabeçalho, manifesto, assinatura, Sobre, rodapé, `<title>`, metadados de SEO e textos nos dois idiomas. Nunca abreviar ("Breno", "Breno Côrtes"). O nome vive numa única chave das mensagens (`site.name`) e é reutilizado a partir dela.

- **Visual:** fundo preto, grafite e prata líquida; estética startup tech premium e corporativa; tipografia exclusivamente sans-serif.
- **Elemento central:** uma bola de metal líquido cromado e brilhante, centralizada, com cerca de 60% da altura da tela. Ela "respira" o tempo todo e reage ao mouse com atraso suave. Futuramente vira um urso escultórico, sem aparência infantil ou cartoon. **Sem órbitas nem partículas decorativas.**
- **Decisão — urso (Etapa 4):** **sem modelo GLB.** Orelhas e focinho **brotam da própria bola** com o mouse e voltam a ser bola quando ele sai. São esferas extras fundidas por união suave (SDF/metaballs) no vertex shader. A arquitetura já existe e está desligada (`uMorph = 0`): ver `hero/liquidMetal.ts`.
- **Hero (composição):** uma frase grande à esquerda da bola e outra à direita, com a bola levemente por cima das palavras. O texto de apoio curto fica no canto inferior esquerdo. No mobile, a ordem é frase, bola, frase e texto de apoio.
- **Referência de movimento:** landonorris.com — apenas o comportamento de scroll, o uso de 3D e o ritmo. Não copiar o visual, a identidade nem os assets.
- **Assets:** não usar assets externos (modelos, imagens, fontes, logos) sem aprovação explícita do dono. Fotos, logos de clientes e cases reais serão fornecidos por ele.

**Etapas** (uma por vez; informar o que foi concluído ao final de cada uma):
1. Hero e responsividade — **concluída**.
2. Metal líquido + scroll cinematográfico — **concluída** (Lenis, gota de metal líquido provisória, hero fixa com transição para o manifesto).
3. Estrutura bilíngue — **em andamento**, em 6 partes; commit ao fim de cada parte validada; **parar após a parte 2 para revisão do dono**:
   1. Base de idiomas (next-intl, /pt e /en, seletor, mensagens) — **concluída**.
   2. Escala (seções ≥ 1 tela), cabeçalho fixo, hero com a bola cromada no centro, sistema de temas claro/escuro, manifesto "mensagem de Breno Côrtes Romão" (retrato monocromático + assinatura desenhada pelo scroll) — **concluída, aguardando revisão do dono** (inclui a escolha do off-white em `/pt/preview/temas`).
   3. O que é fractional (claro, curvas de nível), O que faço (pilares em pin), O que muda (antes/depois).
   4. Números, Como funciona (claro, grade técnica), FAQ.
   5. Bastidores e Cases (galerias horizontais) + páginas `/[locale]/cases/[slug]`.
   6. Marcas (faixa de logos), Sobre (claro; resumo na home + `/sobre`), Contato (Cal.com provisório, mídia kit PDF), rodapé.
4. Urso 3D: orelhas e focinho brotando da bola (SDF/metaballs) com o mouse.
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
- **Reload loop in dev**: after structural changes (moving routes, plugins in `next.config.ts`), the Turbopack dev cache can go stale. The page then reloads endlessly: the HMR socket answers `reloadPage: "HMR hash mismatch"` on every connect. It is not a code bug. Fix: stop `next dev`, delete `.next/dev`, restart.
- There is no test suite. Verify UI changes in a real browser (the 3D/GSAP behaviour cannot be validated from lint/build alone).

## Read this first

`AGENTS.md` says this Next.js version has breaking changes versus common knowledge; consult `node_modules/next/dist/docs/` before writing Next-specific code. `next.config.ts` enables `cacheComponents` and `partialPrefetching`, and wires Tailwind through a Turbopack loader rule.

## Architecture

Routes live under `src/app/[locale]/` (`layout.tsx` is the root layout, `page.tsx` the home, `not-found.tsx`); `src/app/globals.css` and `favicon.ico` stay at `src/app/`. Components live in `src/components/` (import with `@/components/...`). The client components are `SmoothScroll`, `theme/ThemeScroll`, `Hero` (+ its scene), `Manifesto`, `InlineScript` and `layout/LocaleSwitcher`. The header (`layout/Header.tsx`) is fixed and lives in the locale layout.

**i18n (next-intl 4)** — chosen because it supports Next 16 `proxy.ts` and `next/root-params` with `cacheComponents` (both `/pt` and `/en` prerender as static):
- `src/i18n/routing.ts`: locales `pt` (default) / `en`, `localePrefix: "always"`, `htmlLang` map (`pt-BR`, `en`).
- `src/proxy.ts` (Next 16's renamed middleware): on `/` it detects the browser language — English → `/en`, everything else → `/pt`. A manual switch sets the `NEXT_LOCALE` cookie, which then wins over detection.
- `src/i18n/request.ts`: reads the locale with `next/root-params` (no `setRequestLocale` needed) and loads `src/messages/{locale}.json`.
- `src/i18n/navigation.ts`: locale-aware `Link`/`usePathname`/`useRouter`. Use these for internal pages instead of `next/link`.
- `src/global.d.ts` types the message keys from `pt.json`; `en.json` must keep the identical structure.
- **All visible text** comes from the messages. Server components use `getTranslations()`. Client components (`Hero`, `Manifesto`, `LocaleSwitcher`) receive their strings as props from the server parent. `NextIntlClientProvider` is mounted with `messages={null}`, so the message files never ship to the browser.
- Metadata (`generateMetadata` in the locale layout): title/description from `meta.*`, canonical, `hreflang` alternates (`pt-BR`, `en`, `x-default`). `metadataBase` comes from `NEXT_PUBLIC_SITE_URL`, which must be set at launch.
- Non-translatable data (layout, aspect ratios, image/logo paths) stays in code (arrays in `page.tsx`, later `src/content/`).

**Pre-hydration scripts:** use `components/InlineScript.tsx` (pattern from the Next 16 guide `preventing-flash-before-hydration`).
- It **must stay a Client Component**. The server HTML gets `type="text/javascript"`, which runs during HTML parse, before the first paint. The client render gets `text/plain`, so React 19 doesn't warn "Encountered a script tag while rendering React component".
- As a Server Component, `typeof window` never flips on the client, and the warning comes back.
- Don't use `next/script` with `beforeInteractive` for it: that strategy doesn't block hydration and may run after the first paint, which would flash the title.

**Themes** (`globals.css` + `components/theme/*`):
- Fixed palettes per theme (`--dark-*`, `--light-*`, plus the temporary `--light-warm-*` candidate) and "live" variables on `<html>` (`--bg`, `--fg`, `--muted`, `--line`, `--graphic`, `--surface`, `--grad-from`, `--grad-to`).
- Tailwind maps `background`/`foreground`/`silver`/`line`/`graphic`/`surface` to the live variables. **Never hardcode colors** (`white/…`, `#0b0b0c`): use the tokens so components work in light sections.
- Palette colors are written as `rgba(r,g,b,a)` with commas, which is the syntax GSAP interpolates.
- `<Section theme="dark|light">` (`theme/Section.tsx`): `min-h-svh`, viewport-proportional padding, `data-theme`.
  - **Every section needs a `data-theme`** (Hero and Manifesto set it themselves). The controller only transitions where the theme changes from the previous section.
- `ThemeScroll` (mounted in the locale layout, re-run on `pathname` change):
  - For each theme change it scrubs the live variables from the previous palette to the new one (`top 70%` → `top 20%`).
  - Text roles switch in a short mid window, so text is never grey on grey.
  - `refreshPriority: -1`, so it is refreshed after section pins.
  - It works under reduced motion, since a color change is not movement.
  - It adds `html.theme-js`. Without it (no JS), light sections paint their own background via CSS.
- `theme/DraftBadge.tsx`: the "Provisório" badge (`common.draft`).
- `/[locale]/preview/temas` is a **temporary dev-only page** (404 in production) comparing `#ECEAE5` with the warmer `#EDE6DA`. Delete it, and the `light-warm` palette, once the owner chooses.

**Smooth scroll** (`components/SmoothScroll.tsx`, mounted in `[locale]/layout.tsx`): Lenis driven by `gsap.ticker` (`autoRaf: false`), with `lenis.on("scroll", ScrollTrigger.update)`, so Lenis and ScrollTrigger read the same position each frame. `anchors: true` makes `#section` links glide. It does not start under reduced motion. On touch it keeps native scroll (Lenis default `syncTouch: false`). Do not reintroduce CSS `scroll-behavior: smooth`, which fights Lenis.

**Hero pipeline** (`components/Hero.tsx` → `HeroScene.tsx`, `HeroVisual.tsx`, `hero/*`):
- **Composition** (`Hero.tsx`, client).
  - Desktop: a 3-column grid with the left phrase, the **ball anchor** and the right phrase. The anchor is a square `div` (`md:h-[60svh]`, mobile `w-[min(85vw,46svh)]`). The phrases overlap it slightly (`-mr/-ml-[2.5vw]`), and the support text sits bottom-left.
  - Mobile: a column with phrase, anchor, phrase, support.
  - The 3D canvas is a full-section layer at `z-20`, **above** the text, so the ball overlaps the words.
  - A semantic `sr-only` `<h1>` holds the full sentence; the visual phrases are `aria-hidden`.
- `Hero.tsx` also owns the GSAP intro, capability detection (WebGL, reduced motion, coarse pointer), an IntersectionObserver that pauses rendering off-screen, and the **hero → manifesto transition**.
- The transition: the hero is pinned for one viewport with `pinSpacing: false`, and the next sections scroll over it.
  - `[data-hero-text]` elements fade out individually in the first 30%. The anchor must never move.
  - A `progress` ref (0→1) is read by the scene: the ball shrinks, pushes back and darkens to graphite.
  - The visual (and the anchor/poster) fades at the end, so the un-pin is invisible.
  - Sections above the pinned hero need `relative z-10` (`Section` and `Manifesto` have it).
- `HeroScene.tsx` (R3F, `next/dynamic({ ssr: false })`):
  - `Framing`: **layout-driven framing**. It measures the anchor's rect against the canvas (ResizeObserver), sets the camera distance so the ball's diameter equals the anchor's height, and offsets the camera to the anchor's centre. Change size or position of the ball in CSS, not in 3D.
  - `buildStudioEnvironment`: a code-built chrome studio (PMREM, sigma 0.02, no HDRI).
    - It uses a vertex-coloured gradient dome (bright sky, grey horizon, dark floor) plus a few thin, intense vertical strips and a high softbox.
    - Large flat mid-grey panels make the metal look grey and matte. Flat rectangles reflected in the centre read as a cartoon "face". Avoid both.
  - `Rig`: a frame-rate-independent lerp of the mouse; it offsets and tilts the group and sweeps `scene.environmentRotation`.
  - `LiquidShape`: **breathing** (a slow scale sine plus `uAmp` modulation, always on unless reduced motion), the pointer → uniforms, and the scroll `progress`.
- `hero/shape.ts`: a dense icosphere (`SHAPE_RADIUS` 1.6; detail 48 desktop / 20 mobile). The density defines how sharp ears/snout can get.
- `hero/liquidMetal.ts`: `MeshPhysicalMaterial` (chrome: metalness 1, roughness 0.035, clearcoat 1) with an `onBeforeCompile` injection. Radial displacement is the sum, in `lm_liquid`, of:
  1. **Shape (SDF/metaballs, for the bear)**: the ball smooth-unioned (`lm_smin`, radius `uBlend`) with up to `FEATURE_SLOTS` spheres (`uFeatureCenters`, `uFeatureRadii`, scaled by `uMorph`). The surface radius is found per vertex by 10 steps of sphere tracing inward. With `uMorph = 0` it is skipped and costs nothing.
     - **Stage 4:** set ear/snout centres and radii and animate `uMorph` 0→1 on pointer enter and 1→0 on leave. No mesh change is needed.
  2. **Liquid**: simplex noise. Keep it low (`uAmp` 0.05, `uFreq` 0.5): higher values look like a crumpled blob, not a ball.
  3. **Pointer pull** toward the cursor.
  - Normals come from finite differences over the sum. `LIQUID_LIGHT` (mobile) drops the second noise octave.
- `HeroVisual.tsx`: the static SVG poster, rendered **inside the anchor**, so it always matches the 3D ball. Its `viewBox` is cropped to the shape. It is the no-WebGL / `SceneBoundary` fallback and cross-fades out when the scene is ready.
- Reduced motion: no pin, no scrub, `frameloop="demand"`, frozen shader time (no breathing).
- Mobile (coarse pointer): lighter geometry, one noise octave, DPR capped at 1.5, no mouse tracking.

**Manifesto** (`components/Manifesto.tsx`, client) is the "Mensagem de {name}" section. It has a transparent background (the darkened ball stays visible behind it) and `data-theme="dark"`.
- Portrait: `MediaSlot tone="mono"` (grayscale/contrast filter plus a graphite→silver soft-light veil). The photo path is `portraitSrc` in `page.tsx`.
- Signature: `components/Signature.tsx` draws the paths from `src/content/signature.ts` with a metallic gradient stroke and a subtle glow.
  - The current one is a **provisional placeholder**. To use the owner's SVG, paste its `viewBox` and stroke `d` values there and set `provisional: false`.
  - The stroke is drawn by a scrubbed `stroke-dashoffset` timeline, path by path, as the portrait crosses the screen.
  - Under reduced motion it is shown complete.
- The statement's words (`[data-word]`) are revealed by scroll; then the body and the full name + role (`[data-follow]`, triggered by the phrase).

**Intro-animation gotchas**
- Initial hidden state is pure CSS (`.js-motion [data-reveal|data-fade]` in `globals.css`, only under `prefers-reduced-motion: no-preference`). The `js-motion` class is added by an inline script in `layout.tsx` before first paint, and removed after 6s as a safety net so text can never stay hidden.
- GSAP reads the CSS `translateY(120%)` as **pixels**. Any tween on `[data-reveal]` must set `y: 0` alongside `yPercent`, otherwise a pixel offset remains and the headline stays hidden behind its mask.
- The hero animates individual `[data-hero-text]` elements (not a wrapper), so the ball anchor never moves and the 3D framing stays correct.

**Images / logos / cases**: `components/MediaSlot.tsx` is the single frame for photos and case images. Without `src` it renders a labelled placeholder with the same aspect ratio; fill `image` / `src` in the arrays in `page.tsx` (paths under `public/`) to swap in real assets. Placeholder content (email, social `#` links, "Case 01…", logo slots) is still to be replaced.

## Conventions and lint traps

- Typography is **sans-serif only** (Geist via `next/font`; `--font-display` aliases Geist). No serif fonts, no italics for display text; hierarchy comes from weight contrast (light vs. semibold) and tight tracking.
- Colors only through the theme tokens (see Themes); never hardcode white/black alpha utilities.
- The React Compiler lint rules reject mutating values returned from hooks. In R3F code, get the scene via `useFrame(({ scene }) => …)` or `useThree((s) => s.get)()` instead of `const scene = useThree(...)`, and keep `onReady`-style callbacks stable (`useCallback`) since they sit in effect dependency arrays. Ref objects passed as props are only treated as mutable if the prop name ends in `Ref` (e.g. `pointerRef`). Mutate materials through a mesh ref (`mesh.current.material`), not through a `useMemo` result.
- Windows PowerShell 5.1 `Get-Content`/`Set-Content` re-encode files (ANSI read, BOM on write) and corrupt the Portuguese accents. Edit files with the editor tools, not PowerShell text pipelines.
- The `THREE.Clock deprecated` console warning comes from inside R3F 9.8.1. It is harmless.
- Git: branch `main`. Commit at the end of each validated stage, and during stage 3 at the end of each validated part, only after lint, `tsc`, build and the desktop/mobile check pass.

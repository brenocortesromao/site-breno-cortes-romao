# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Bilingual (PT default / EN) personal business site for a Fractional Brand & Creative Director, statically generated per locale. Next.js 16 (App Router, Turbopack) + React 19 + Tailwind CSS 4 + TypeScript, with Lenis smooth scroll, GSAP/ScrollTrigger, and Three.js via React Three Fiber in the hero.

## Estado atual (atualizado em 09/10/2026)

**Etapa:** 3, estrutura completa do site (bilíngue PT/EN). A lista mestra do que falta é o `PENDENCIAS.md` (itens [x] concluídos; itens abertos têm nota com arquivos e próximo passo). Textos: `CONTEUDO-SITE.md`.

**Concluído hoje:**
- i18n (next-intl, /pt e /en, seletor) e as 14 seções do mapa, na ordem narrativa.
- Ritmo de cores com 3 temas: preto, off-white com curvas líquidas e gradiente escuro.
- Hero com bola cromada.
- Assinatura definitiva em cromo, desenhada pelo scroll.
- Gráficos do dono em "A distância".
- Diagnóstico interativo com 8 frases.
- Números Lightcast em black chrome.
- Antes/depois com indicador deslizante.
- Gota líquida em "Como funciona".
- FAQ com 11 perguntas e FAQPage.
- Base de SEO.
- Regras sem travessões e sem traduzir "Fractional Brand & Creative Director".

**Decisões importantes:**
- Urso só na Etapa 4, nascendo da própria bola via SDF/metaballs, sem GLB.
- Dados externos: só os números Lightcast, com fonte.
- Sem páginas de case: o dono decidiu remover a lista de cases e as páginas /cases (ainda presentes no código, ver PENDENCIAS).
- Off-white só em 3 seções.
- "A distância" deve voltar a 3 blocos separados com animação por gatilho, sem a cena fixa.

**Onde retomar:** `PENDENCIAS.md`, Bloco 4: A distância em 3 blocos, depois a entrada profunda e animação constante da gota, depois a limpeza dos cases em Trabalhos. Em seguida, o Bloco 5 (fundo de montanhas, imagens já em `public/fundo/`). Por fim, a validação final e a revisão do dono.

**Armadilha recorrente:** depois de editar `globals.css`, o `next dev` às vezes continua servindo o CSS antigo. Pare o servidor, apague `.next/dev` e reinicie.

## Direção do projeto

Site do negócio do dono como **Fractional Brand & Creative Director**: proposta de valor, portfólio, currículo, serviços, clientes e cases.

- **Nome (regra fixa):** sempre **"Breno Côrtes Romão"**, completo e com acento, em todo lugar: cabeçalho, manifesto, assinatura, Sobre, rodapé, `<title>`, metadados de SEO e textos nos dois idiomas. Nunca abreviar ("Breno", "Breno Côrtes"). O nome vive numa única chave das mensagens (`site.name`) e é reutilizado a partir dela.

- **Termos que nunca se traduzem (regra fixa):** (se o dono relatar textos "estranhos" como "Marca fracionária", "empresas poucas vezes" ou "sobre sim", confira o HTML: costuma ser o tradutor automático do navegador, não o código) o título **"Fractional Brand & Creative Director"** fica em inglês em todos os idiomas, inclusive no /pt: cabeçalho, assinatura, rodapé, Sobre, metadados e textos. A palavra "fractional" no texto corrido também fica assim (nunca "fracionário/fracionária/fracionada"). No código, renderize textos que possam contê-los com `protectTerms()` (`src/components/Term.tsx`). Ele envolve os termos em `<span translate="no" lang="en">`, para o tradutor automático do navegador não transformá-los em "Marca fracionária e diretor criativo".
- **Sem travessões (regra fixa):** nenhum "—" ou "–" em texto visível, em pt e en: mensagens, títulos, rótulos, metadados e strings montadas no código (ex.: rótulo "Nome, Função"; template de título "%s | Nome"). Use vírgula, dois-pontos ou ponto. Em pilares e etapas, título e descrição são elementos separados, sem traço. Verifique com uma busca por "—" e "–" em `src/messages/*.json` e no HTML renderizado.
- **Ritmo de cores (regra fixa, mapa do `CONTEUDO-SITE.md`):** o site é majoritariamente preto. Off-white aparece em **só 3** seções: O que é fractional, Como funciona e Poucas parcerias. O gradiente escuro fica em A distância, O que muda, Sobre e Contato. O resto é preto.
- **Visual:** fundo preto, grafite e prata líquida; estética startup tech premium e corporativa; tipografia exclusivamente sans-serif.
- **Elemento central:** uma bola de metal líquido cromado e brilhante, centralizada, com cerca de 60% da altura da tela. Ela "respira" o tempo todo e reage ao mouse com atraso suave. Futuramente vira um urso escultórico, sem aparência infantil ou cartoon. **Sem órbitas nem partículas decorativas.**
- **Decisão — urso (Etapa 4):** **sem modelo GLB.** Orelhas e focinho **brotam da própria bola** com o mouse e voltam a ser bola quando ele sai. São esferas extras fundidas por união suave (SDF/metaballs) no vertex shader. A arquitetura já existe e está desligada (`uMorph = 0`): ver `hero/liquidMetal.ts`.
- **Hero (composição):** uma frase grande à esquerda da bola e outra à direita, com a bola levemente por cima das palavras. O texto de apoio curto fica no canto inferior esquerdo. No mobile, a ordem é frase, bola, frase e texto de apoio.
- **Referência de movimento:** landonorris.com — apenas o comportamento de scroll, o uso de 3D e o ritmo. Não copiar o visual, a identidade nem os assets.
- **Assets:** não usar assets externos (modelos, imagens, fontes, logos) sem aprovação explícita do dono. Fotos, logos de clientes e cases reais serão fornecidos por ele.

**Etapas** (uma por vez; informar o que foi concluído ao final de cada uma):
1. Hero e responsividade — **concluída**.
2. Metal líquido + scroll cinematográfico — **concluída** (Lenis, gota de metal líquido provisória, hero fixa com transição para o manifesto).
3. Estrutura bilíngue — **concluída (6 partes), aguardando revisão do dono**:
   1. Base de idiomas (next-intl, /pt e /en, seletor, mensagens) — **concluída**.
   2. Escala (seções ≥ 1 tela), cabeçalho fixo, hero com a bola cromada no centro, sistema de temas claro/escuro, "Mensagem de Breno Côrtes Romão" (retrato monocromático + assinatura desenhada pelo scroll) — **concluída**. Off-white escolhido: **A, #ECEAE5**.
   3. Diagnóstico (ex-"Sinais"), O que é fractional (curvas líquidas, gráfico de barras com o dado verificado, comparativo), O que eu faço (pilares em pin); ajustes de cromo e assinatura definitiva — **concluída**.
   4. A distância (3 gráficos conceituais), O que muda (antes/depois), Como funciona (claro, grade); Trabalhos (faixa de logos, carrossel, 3 cases com página própria); textos v2; base de SEO — **concluída**.
   5. Onde o trabalho aparece; Sobre (claro; resumo na home + `/sobre`); Poucas parcerias por vez ([CONFIRMAR]); Contato completo — **concluída**.
   6. Perguntas frequentes (`<details>` nativo); rodapé no layout — **concluída**.
   Pendências de conteúdo do dono: retrato, logos, imagens de trabalhos, cases, bio/trajetória, e-mail, mídia kit, link do Cal.com, itens [CONFIRMAR], 6 frases da "3b Diagnóstico" (o arquivo ainda tem as 5 de "Sinais") e tradução EN.
4. Urso 3D: orelhas e focinho brotando da bola (SDF/metaballs) com o mouse.
5. Conteúdo real PT/EN (fotos, logos, cases, textos, tradução).
6. Lançamento.

**Fonte do conteúdo:** `CONTEUDO-SITE.md` (raiz) é o texto oficial do site, mantido pelo dono. Releia antes de implementar qualquer seção; itens `[PENDENTE]` ficam como placeholder visível e discreto.

**Sem dados externos (regra fixa):** o site é sobre o dono. **Única exceção:** os dois números verificados de "O que é fractional" (+313% e 97%, fonte Lightcast, *The Rise of Fractional Leadership*, 2026), exatamente como no `CONTEUDO-SITE.md` e sempre com a fonte em letra pequena. O dado antigo "9 → 24 a cada 1.000" (Revelio Labs) **não deve mais ser usado**. Fora isso, **nunca** usar dados de mercado, estatísticas externas, pesquisas de terceiros (Gartner, McKinsey etc.) nem números de vagas, em nenhuma seção nem idioma. Gráficos são **conceituais**: SVG animado pelo scroll, sem escalas nem valores numéricos, com a nota discreta "ilustrativo". A seção "Por que agora" usa três gráficos conceituais de crescimento: a distância entre negócio e marca, fechando a distância, e consistência.

**SEO e buscas por IA (regra fixa — vale para todo código novo):**
- HTML semântico: **um único `<h1>` por página**, hierarquia `h2`/`h3` correta, cada seção um `<section aria-labelledby="<id do h2>">` (landmark nomeado). Na home, o `h1` é o título da hero (`#hero-title`, `sr-only` com a frase completa; as frases visuais são decorativas).
- Todo texto é HTML real, renderizado no servidor e indexável. Animações **nunca** removem texto do DOM nem dependem de JS para ele existir. O estado inicial animado pode ser invisível (opacity/transform), mas o conteúdo está no HTML.
- Metadados **por página e por idioma** em `generateMetadata`, sempre via `pageMetadata()` (`src/lib/seo/metadata.ts`): título, descrição, canonical, alternates/hreflang (`pt-BR`, `en`, `x-default`). O layout só define padrões (título com template `"%s — {nome}"`); se uma página não definir canonical, ela herda o errado.
- Imagens com `alt` descritivo (nunca vazio em imagem de conteúdo); textos de botão e link descritivos (nada de "clique aqui"; use `aria-label` quando o texto visível for só um ícone/seta).
- **Preparado, ainda não preenchido (etapa de lançamento):**
  - JSON-LD `Person` e `ProfessionalService` (`src/lib/seo/structured-data.ts`, renderizados pelo `JsonLdScript` no layout, que hoje retornam `null`);
  - sitemap.xml/robots.txt: criar `src/app/sitemap.ts` e `src/app/robots.ts` usando `sitemapEntries()` de `src/lib/seo/routes.ts` (lista única de rotas indexáveis);
  - `NEXT_PUBLIC_SITE_URL` com o domínio final.

**Conteúdo provisório:** nunca inventar clientes, números de carreira, depoimentos, resultados ou cases que pareçam reais ("Case 01", "Marca 01"). Textos provisórios ficam claramente marcados. `en.json` é, por enquanto, cópia do português.

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
- Fixed palettes per theme (`--dark-*`, `--light-*` = off-white `#ECEAE5`, `--gradient-*` = "gradiente escuro") and "live" variables on `<html>` (`--bg`, `--fg`, `--muted`, `--line`, `--graphic`, `--surface`, `--grad-from`, `--grad-to`, `--glow`). `--glow` (0–1) is the intensity of `theme/AmbientGlow` (a fixed layer with two very soft graphite/silver radial lights that drift with page scroll). It is 1 only in the `gradient` theme, so ThemeScroll fades the glow in and out with the color transition. The gradient theme is never light.
- Tailwind maps `background`/`foreground`/`silver`/`line`/`graphic`/`surface` to the live variables. **Never hardcode colors** (`white/…`, `#0b0b0c`): use the tokens so components work in light sections.
- Palette colors are written as `rgba(r,g,b,a)` with commas, which is the syntax GSAP interpolates.
- `<Section theme="dark|light|gradient">` (`theme/Section.tsx`): `min-h-svh`, viewport-proportional padding, `data-theme`.
  - **Every section needs a `data-theme`** (Hero and Manifesto set it themselves). The controller only transitions where the theme changes from the previous section.
- `ThemeScroll` (mounted in the locale layout, re-run on `pathname` change):
  - For each theme change it scrubs the live variables from the previous palette to the new one (`top 70%` → `top 20%`).
  - Text roles switch in a short mid window, so text is never grey on grey.
  - `refreshPriority: -1`, so it is refreshed after section pins.
  - It works under reduced motion, since a color change is not movement.
  - It adds `html.theme-js`. Without it (no JS), light sections paint their own background via CSS.
- `theme/DraftBadge.tsx`: the "Provisório" badge (`common.draft`).

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

**Content sections** (`components/sections/*`, client; texts from `signals.*`, `fractional.*`, `pillars.*`):
- `Signals`: a sticky title (desktop) plus a numbered list. Each `[data-signal]` lights up (opacity 0.14→1) as it crosses the middle of the screen, then the closing line fades in.
- `Fractional`: a **light** section with `GraphicLayer variant="contours-a"`. The comparison is a semantic `<table>` on desktop and three cards on mobile. Columns (`[data-col]`) enter one by one, and the Fractional column (`HIGHLIGHT = 2`) is emphasized.
- `Pillars`: on desktop without reduced motion, `data-mode="pin"` is set on the section. The stage is pinned for `(n-1)` screens, and pillars swap: the title rises through a mask, the text crossfades, the index/progress bar follows. Layout switches through `group-data-[mode=pin]:*` classes.
  - On mobile, under reduced motion or without JS, the pillars are stacked with no pin.
  - The title size is bounded by the longest word ("Acompanhamento") in a 6/12 column.

**Home order (narrativa):** Hero → Mensagem → A distância → Diagnóstico → Fractional → O que eu faço → O que muda → Como funciona → Onde o trabalho aparece → Trabalhos → Sobre (resumo) → Poucas parcerias → Perguntas frequentes → Contato. Other pages: `/sobre` (About `variant="page"` + Contact) and `/cases/[slug]`. Header and Footer live in the locale layout. `CONTEUDO-SITE.md` numbers the sections differently ("A distância" is its §7 and is shown right after the message; "Sinais" became the interactive "Diagnóstico"). Eyebrows have no numbering, so reordering doesn't break labels.

**More sections** (`components/sections/*`):
- `Distance`: the owner's SVGs from `public/graficos/`, inlined by `src/content/charts.ts`. Ids are prefixed `ga-`/`gb-`/`gc-`, because the files repeat ids. Chart C renders the END file, plus start poses computed from the start file.
  - **One pinned scene** (pin `+=100%`, so the section is ~2 screens) with 3 steps:
    1. A: curves + gap;
    2. B: milestone, ghost, brand catching up. It has the same framing as A, so the swap is invisible;
    3. C: consistency.
  - Steps are **triggered timelines** (~2.5 s, play to the end even if scrolling stops; scrolling back reverses), not scrub. The text crossfades, with a 1/3 indicator.
  - `data-mode="scene"` overlays the steps in one grid cell. Without JS or under reduced motion they stack, final and static.
  - The hatch/glow between curves is strengthened in `globals.css` (`[data-chart] pattern[id$=-hatch]`).
- `Diagnostic` (§3b): 6 quoted founder phrases, each a `<button aria-pressed>` (click/touch/keyboard). Marked phrases turn silver; the rest stay graphite. The counter "x de N" uses `aria-live`.
  - Affordance cues:
    - a one-time demo per visit (sessionStorage `diag-demo-shown`) lights the first phrase for ~1 s without counting;
    - rings pulse (`ringPulse` keyframes) until the first interaction;
    - on mouse hover the phrase brightens, the ring shows a faint ✓, and a custom cursor label follows ("Marcar"/"Desmarcar");
    - the hint text switches between "Toque…" and "Clique…" via `@media(pointer:fine)` CSS.
  - No demo or pulse under reduced motion. Phrase spans use `minmax(0,1fr)` + `break-words` so nothing clips at 1024–1440px.
  - The closing has 3 states: `closing` (0 marked or no interaction, which is what the HTML holds), `closingOne` (1 marked) and `closingMatched` (2+, plus the "Vamos conversar" CTA to `#contato`).
- `Changes`: before/after. With `data-mode="flip"` each row flips via scroll inside a grid overlay (`[grid-area:1/1]`). The static mode shows two columns. Both texts are always in the DOM.
- `Process`: a light section with `GraphicLayer variant="grid"`. The vertical line scrubs `scaleY`, and the steps light up.
- `Works` (server) + `LogoMarquee` + `WorkCarousel`. Data lives in `public/trabalhos/trabalhos.json` and `public/logos/logos.json` (read via `src/content/media.ts`; to add one, drop the file in the folder and fill `"arquivo"`).
  - Logos are rendered as a CSS **mask** over `bg-silver`, so they become monochrome silver whatever their colors.
  - Marquee: two rows in opposite directions; each track holds the list twice and moves xPercent 50; it slows on hover (timeScale) and pauses off-screen. Loop mode is `data-mode="loop"`; otherwise it is a static grid.
  - Carousel: desktop uses a pinned ScrollTrigger with snap. The arrows call `scrollToY()` (from `SmoothScroll`, Lenis-aware) to the slide's scroll position. Mobile uses drag + arrows. Neighbors are scaled 0.7 and dimmed 0.45.
- Case pages `src/app/[locale]/cases/[slug]/page.tsx`: `generateStaticParams` over `caseSlugs` (`src/content/cases.ts`), with texts in `works.cases.items`. **With cacheComponents, read `params` inside a `<Suspense>`** (`CaseContent`); otherwise dev throws "encountered URL data during prerendering". Known slugs still prerender fully.
- Signature: `src/content/signature.ts` reads `public/assinatura.svg` at build (49 stroke paths, `viewBox`); replace the file to change it.
  - `Signature` draws a polished-chrome stroke: a repeating, slanted gradient (`spreadMethod="reflect"`) from light graphite to white to greys, with **no glow/blur filter**, plus a "shine" layer.
  - `Manifesto` writes the paths in sequence (duration ∝ `getTotalLength`), then sweeps a light band (gradient `x1/x2`) on completion and every ~5 s while visible. No sweep under reduced motion.

**Remaining sections:**
- `Touchpoints`: a large list. Each line rises from a mask on scroll; the hover shift sits on the parent, because GSAP owns the line's transform.
- `About` (server, light, `contours-b`):
  - `variant="summary"` (home): the h2, with a link to `/sobre`;
  - `variant="page"` (`/sobre`): the h1, the timeline and the method;
  - the portrait goes in `aboutPortraitSrc`.
- `Partnerships`: [CONFIRMAR] text exactly as in the content file.
- `Faq`: native `<details name="faq">`/`<summary>`, an exclusive accordion (one open at a time) that works without JS; answers stay in the HTML. It also emits a `FAQPage` JSON-LD (`faqJsonLd`), skipping [CONFIRMAR]/[PENDENTE] items. The smooth open uses `::details-content` + `interpolate-size` in `globals.css`.
- `Contact`: channels are configured in `src/content/contact.ts` (`calUrl` is provisional; `email`/`mediaKit` empty means a disabled [PENDENTE] button).
- `layout/NavLinks` (client): on the home, links are `#section` (Lenis glides); on other pages they are `/#section` in the current locale.

**Background graphics** (`components/graphics/GraphicLayer.tsx`), used by every light section:
- **Live mode** (WebGL2, no reduced motion): `LiquidContours` renders isolines of animated 3D simplex noise with domain warping in a fragment shader (`fwidth` antialiasing), plus cursor ripples that fade out.
  - Time runs at 1/3 of real time, with 7.5 levels (5 on mobile) at about 30 fps, only while visible.
  - The line color comes from `--graphic`. **GSAP writes interpolated colors as 8-digit hex (`#RRGGBBAA`)**, so the parser must read the alpha byte.
  - The canvas is created per mount, because in React Strict Mode (dev) a reused canvas returns the already-lost context and the shader "fails" with an empty log.
- `contours-a`/`contours-b` are the static fallback/poster: SVGs generated by `scripts/generate-contours.mjs` (simplex noise + marching squares, no deps; regenerate with `node scripts/generate-contours.mjs`, about 14–17 KB gzip each) and applied as a CSS **mask** over `bg-graphic`, so the color follows the theme. `grid` is pure CSS.
- The outer layer keeps a subtle **scroll parallax** (yPercent ±4). It is disabled under reduced motion, and then only the static SVG shows.

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

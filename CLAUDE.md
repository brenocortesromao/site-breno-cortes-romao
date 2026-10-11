# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## REGRA PRINCIPAL

**O estado da tag `site-aprovado-10-10-noite` é o NOVO ESTADO APROVADO pelo Breno (substitui `site-aprovado-10-10`): todas as animações, cenas 3D (bola da hero, montanhas, nuvens, oceano, floresta com urso, gota, curvas líquidas) e textos atuais. Nada deve ser alterado sem pedido explícito. Não altere nada além do que for pedido em cada mensagem. Nada de melhorias, refatorações ou ajustes por conta própria.**

**Bola da hero (decisão de 10/10):** a bola de metal líquido da hero está APROVADA e **NÃO vai virar urso**: a etapa "urso" foi CANCELADA. Não altere a bola. O urso existe apenas como animal 3D na floresta da seção "Sobre".

Bilingual (PT default / EN) personal business site for a Fractional Brand & Creative Director, statically generated per locale. Next.js 16 (App Router, Turbopack) + React 19 + Tailwind CSS 4 + TypeScript, with Lenis smooth scroll, GSAP/ScrollTrigger, and Three.js via React Three Fiber in the hero.

## Estado atual (atualizado no fim de 10/10/2026, tag `fim-10-10`)

**Etapa:** 3, estrutura completa do site (bilíngue PT/EN). A lista mestra é o `PENDENCIAS.md`: itens [x] concluídos, e os abertos têm nota com arquivos e próximo passo. Textos: `CONTEUDO-SITE.md`.

**Concluído até 09/10 (base):** i18n e as 14 seções na ordem narrativa; ritmo de cores (preto, off-white com curvas líquidas, gradiente escuro); hero com bola cromada; Diagnóstico com 8 frases; números Lightcast em black chrome; antes/depois; FAQ com FAQPage; base de SEO; regras de travessões e de termos sem tradução.

**Concluído na noite de 09/10 (Blocos 0, 4 e 6 do PENDENCIAS.md):**
- **Montanhas 3D** (Bloco 6, `graphics/MountainBackdrop.tsx` + `graphics/terrain/*`): terreno procedural em R3F atrás de Pillars + Changes, sticky, com câmera descendo pelo scroll, opacidade 36% e a foto de `public/fundo/` só como fallback sem WebGL. Os gatilhos usam `refreshPriority: -1` (o pin dos pilares muda a altura do trecho). **Versão aprovada na tag git `montanhas-3d-aprovadas`.**
- **Estabilidade WebGL:** sonda única (`lib/webgl.ts`), canvases montados só perto da seção (hoje `useWebglSlot` em `lib/quality.ts`), `ResilientBoundary` + `ContextLossWatcher` com remontagem e `console.warn` do motivo real. Ver "WebGL contexts" na Arquitetura.
- **Hero:** "soquinho" na bola (afundamento elástico + ondas, até 8 impactos), hover com giro e cursor-círculo; reduced motion só brilho.
- **Cabeçalho** (`layout/HeaderBrand.tsx`): assinatura que se desenha em ~1 s (link para a home), nome em Archivo Expanded e cargo em Geist Mono; depois da hero fica só a assinatura; no mobile, só a assinatura.
- **Mensagem:** retrato colorido com entrada de "construção digital" (`PortraitReveal`), assinatura completa com o retrato na tela, frase protegida do tradutor automático ("si." virava "sim") e com `text-balance`, parágrafo novo.
- **Seções:** A distância em 3 blocos com scrub curto; gota de "Como funciona" com entrada profunda e animação constante; Trabalhos sem cases (rota /cases removida), com subtítulo, legenda (projeto, ano, papel) e loop de logos sem buraco.
- **Textos novos** em pt/en: subtítulo de "O que eu faço", fechos do Diagnóstico, título e texto de "Como funciona", parágrafo da Mensagem.

**Concluído em 10/10** (detalhes no PENDENCIAS.md, Blocos 0b a 0h e "Etapa de desempenho"):
- **Retrato:** moldura "curva líquida" (`components/portraitFrame.tsx`); assinatura escrita depois da foto. (A entrada "metal líquido" deste dia foi trocada na noite de 10/10, ver abaixo.)
- **A distância:** as 3 frases com decodificação letra por letra (módulo compartilhado `components/decode.tsx`).
- **Como funciona:** 6 etapas (ESCUTA a PARCERIA), linha sólida até o ponto 06 e pontilhado depois; gota termina em anel; título da 06 com quebra controlada.
- **Diagnóstico:** nuvens 3D (tag `nuvens-3d-aprovadas`), layout sem scroll horizontal, cursor "Marcar" em portal.
- **Nova seção 11b "E a IA?"** (`sections/Ai.tsx`, menu "IA"): prompt digitado, título decodificado, frases acendendo, fecho com reflexo.
- **Fractional:** números de volta ao HTML preto cromado (a versão 3D foi descartada); complemento "No Brasil..." (en com texto próprio).
- **Desempenho** (`DESEMPENHO.md`, tags `antes-desempenho` → `desempenho-ok`): ThemeScroll sem tweens por variável, entrada da hero em CSS, hidratação por seção (`<Suspense>`), `compileAsync` na bola, terreno em Web Worker, qualidade adaptativa + orçamento de 2 contextos (`lib/quality.ts`). FPS 60 em todas as seções 3D, máximo 2 contextos, 0 erros e 0 scroll horizontal em Chromium/Edge/Firefox/WebKit (`node scripts/smoke.mjs`). Lighthouse 76 desktop / 55 mobile (metas 85/70 não atingidas: falta a decisão do dono sobre iniciar a bola 3D mais tarde).

**Concluído na noite de 10/10** (commits de `antes-oceano` a `437b9c8`; detalhes no PENDENCIAS.md, bloco "Pedidos da noite de 10/10"):
- **Oceano 3D** na seção da IA (`graphics/OceanBackdrop.tsx` + `graphics/ocean/*`): alto-mar, linha d'água, mergulho com god rays, cáusticas, partículas, recife procedural, cardume com boids, tubarões (glb Draco de 3,5 KB, Quaternius CC0, `scripts/build-ocean-models.mjs`), um que passa perto, rim light prateado e UMA tartaruga procedural. Tags `oceano-v1`, `oceano-3d-aprovado` (= `site-aprovado-10-10`); a tartaruga única (`a93173b`) aguarda aprovação para a tag `oceano-tartaruga`.
- **Cabeçalho:** nome e cargo de volta em todo o desktop (a classe `lg:hidden` vencia e escondia o nome); ícones de WhatsApp e e-mail; botão flutuante de WhatsApp no mobile; e-mail com menu Gmail / app de e-mail / copiar (`contact/EmailMenu.tsx`, endereço montado só no cliente).
- **Contato:** botões Agendar, WhatsApp, E-mail (menu) e Mídia kit em 2 × 2.
- **Retrato:** entrada "luz de estúdio acendendo" (CSS/máscaras, sem WebGL) e recorte da moldura como máscara CSS (a foto respeita a curva). Tag `retrato-antes-luz` antes da troca.
- **Como funciona:** fundo preto; gota com estúdio de cromo para fundo escuro.
- **Onde o trabalho aparece:** título "pintado com spray" (`components/SprayTitle.tsx`, canvas 2D).
- **O que é fractional:** comparativo versão 2 com a coluna Fractional em cartão de destaque.
- **Poucas parcerias:** CTA (status, frase, botão "Quero conversar" para o WhatsApp).
- **O que eu faço:** subtítulo novo.
- **Lighthouse (A/B na mesma máquina e hora):** o oceano não baixou as notas (desktop 69-70 contra 65 antes do oceano; mobile 51 nos dois). As notas absolutas abaixo do DESEMPENHO.md vêm da carga da máquina no momento.

**Concluído na noite de 10/10, parte 2** (tag `site-aprovado-10-10-noite`, o novo estado aprovado; depois dela só entrou o texto novo do Contato, `213e239`, incluído na tag `fim-10-10`):
- **Sobre, bio completa** (`sections/AboutStory.tsx`): abertura em destaque, 3 parágrafos (3º com o texto novo: "...e liderei estratégias de marketing, marketing digital e growth."), fecho com reflexo prata, trajetória em Geist Mono acendendo com o scroll (DESIGNER → COORDENADOR DE DESIGN → DIRETOR DE MARKETING → MARKETING DIGITAL & GROWTH → FRACTIONAL BRAND & CREATIVE DIRECTOR; en: DIGITAL MARKETING & GROWTH; último em prata), referência às marcas só em texto. Frase de método antiga removida.
- **Floresta 3D com urso no Sobre** (`graphics/ForestBackdrop.tsx` + `graphics/forest/*`; tag `antes-floresta` antes): abetos procedurais instanciados com 2 níveis de LOD, 3 camadas distantes no quadro de fundo (parallax), névoa baixa que deriva, luz fria em contraluz, neve, árvores balançando, câmera avançando pela trilha com o scroll; urso-pardo PROCEDURAL (não existe glTF CC0 de urso com caminhada: Poly Pizza só CC-BY; Quaternius e Gobkit sem urso; OpenGameArt só um .blend sem esqueleto), animado no shader (marcha, parada, cabeça virando para a câmera), silhueta com contorno prateado, atravessa a clareira uma vez a partir de ~30% da seção. Opacidade 38%, vinheta, useWebglSlot, modo leve no toque/nível low, reduced motion = quadro parado. A tag `floresta-3d-aprovada` não foi criada (aprovação geral via `site-aprovado-10-10-noite`).

**Decisões importantes:**
- ~~Urso só na Etapa 4, nascendo da bola (SDF), sem GLB.~~ **CANCELADO (10/10):** a bola da hero está aprovada e não vira urso. O urso existe só como animal 3D na floresta da seção "Sobre".
- Dados externos: só os números Lightcast, com fonte.
- Sem cases nem páginas /cases.
- Ritmo de cores (decisão nova no CONTEUDO-SITE.md): site todo preto, exceto "A distância" em off-white. AINDA NÃO aplicado por completo: hoje "O que é fractional" e "Poucas parcerias" seguem off-white no código e "A distância" segue escura (pendente no PENDENCIAS.md). "Como funciona" já é preta.
- **CONTEUDO-SITE.md é editado também fora da conversa:** antes de qualquer edição, releia o arquivo do disco e altere só o trecho necessário (nunca reescreva o arquivo inteiro).
- **Montanhas (regra fixa):** as montanhas 3D da tag `montanhas-3d-aprovadas` são a versão aprovada; qualquer alteração nelas deve ser testada antes e mostrada com captura. O Bloco 6b (refinamento) está PAUSADO: não mexer nas montanhas sem pedido explícito.

**Onde retomar:** `PENDENCIAS.md`, bloco "Pedidos da noite de 10/10", itens abertos:
1. ~~Bio completa do Sobre~~ e ~~floresta 3D com urso~~: feitas (tag `site-aprovado-10-10-noite`). Lighthouse com a floresta: desktop 77/78, mobile 52/51 (não baixou as notas). Contato com texto novo (`213e239`).
2. Conferir o limite de 2 contextos WebGL com a floresta (o contador achou até 4 `<canvas>`, contando os 2D); só medir.
3. "A distância" em off-white (gráficos invertidos, transição, tooltip nativo "Fechando a distância" removido) + curvas líquidas ao fundo; números +313%/97% em off-white metálico; decidir "O que é fractional" e "Poucas parcerias" em preto.
4. Aprovação da tartaruga (tag `oceano-tartaruga`).
5. Antigos: metas do Lighthouse (opções a/b/c no `DESEMPENHO.md`); texto final da etapa 06; Bloco 7 (animação de textos); validação final.
Bloco 6b (montanhas) PAUSADO: só com pedido explícito.

**Armadilha recorrente:** depois de editar `globals.css` ou `next.config.ts`, o `next dev` pode continuar com a versão antiga. Pare o servidor, apague `.next/dev` e reinicie.

## Direção do projeto

Site do negócio do dono como **Fractional Brand & Creative Director**: proposta de valor, portfólio, currículo, serviços, clientes e cases.

- **Nome (regra fixa):** sempre **"Breno Côrtes Romão"**, completo e com acento, em todo lugar: cabeçalho, manifesto, assinatura, Sobre, rodapé, `<title>`, metadados de SEO e textos nos dois idiomas. Nunca abreviar ("Breno", "Breno Côrtes"). O nome vive numa única chave das mensagens (`site.name`) e é reutilizado a partir dela.

- **Tipografia de marca (exceção):** Archivo Expanded (`next/font/google`, eixo `wdth` em 125%, classe `font-brand` + `[font-stretch:125%]`) é permitida **apenas** para o nome no cabeçalho e em assinaturas de marca. O restante do site continua em Geist e Geist Mono.
- **Termos que nunca se traduzem (regra fixa):** (se o dono relatar textos "estranhos" como "Marca fracionária", "empresas poucas vezes" ou "sobre sim", confira o HTML: costuma ser o tradutor automático do navegador, não o código) o título **"Fractional Brand & Creative Director"** fica em inglês em todos os idiomas, inclusive no /pt: cabeçalho, assinatura, rodapé, Sobre, metadados e textos. A palavra "fractional" no texto corrido também fica assim (nunca "fracionário/fracionária/fracionada"). No código, renderize textos que possam contê-los com `protectTerms()` (`src/components/Term.tsx`). Ele envolve os termos em `<span translate="no" lang="en">`, para o tradutor automático do navegador não transformá-los em "Marca fracionária e diretor criativo".
- **Sem travessões (regra fixa):** nenhum "—" ou "–" em texto visível, em pt e en: mensagens, títulos, rótulos, metadados e strings montadas no código (ex.: rótulo "Nome, Função"; template de título "%s | Nome"). Use vírgula, dois-pontos ou ponto. Em pilares e etapas, título e descrição são elementos separados, sem traço. Verifique com uma busca por "—" e "–" em `src/messages/*.json` e no HTML renderizado.
- **Ritmo de cores (regra fixa, mapa do `CONTEUDO-SITE.md`):** o site é majoritariamente preto. Off-white aparece em **só 3** seções: O que é fractional, Como funciona e Poucas parcerias. O gradiente escuro fica em A distância, O que muda, Sobre e Contato. O resto é preto.
- **Visual:** fundo preto, grafite e prata líquida; estética startup tech premium e corporativa; tipografia exclusivamente sans-serif.
- **Elemento central:** uma bola de metal líquido cromado e brilhante, centralizada, com cerca de 60% da altura da tela. Ela "respira" o tempo todo e reage ao mouse com atraso suave. **Aprovada; não vira urso** (a etapa "urso" foi cancelada em 10/10; não altere a bola). **Sem órbitas nem partículas decorativas.**
- ~~**Decisão — urso (Etapa 4):** sem modelo GLB. Orelhas e focinho brotam da própria bola com o mouse e voltam a ser bola quando ele sai. São esferas extras fundidas por união suave (SDF/metaballs) no vertex shader.~~ **CANCELADO (10/10):** a bola não vira urso. O código continua desligado como está (`uMorph = 0`, ver `hero/liquidMetal.ts`) e não deve ser ativado nem mexido. O urso só aparece como animal 3D na floresta da seção "Sobre".
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
4. ~~Urso 3D: orelhas e focinho brotando da bola (SDF/metaballs) com o mouse.~~ **CANCELADO (10/10):** a bola fica como está; o urso existe só na floresta da seção "Sobre".
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
  - For each theme change there is ONE ScrollTrigger (`top 70%` → `top 20%`) that only stores its progress; `apply()` interpolates the palettes (read once) for the latest started transition and writes the 9 variables. No tween per variable: those read `getComputedStyle(<html>)` right after another wrote a variable, forcing whole-page style recalcs (the main load cost before 10/10).
  - Text roles switch in a short mid window, so text is never grey on grey.
  - `refreshPriority: -1`, so it is refreshed after section pins.
  - It rebuilds itself when `[data-theme]` sections are added or removed (a MutationObserver on `<body>`): after an HMR remount, triggers bound to detached sections recalculated wrong positions on the next refresh and the light sections stayed black.
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
  1. **Shape (SDF/metaballs; was meant for the bear, which was CANCELLED on 10/10: keep `uMorph = 0`)**: the ball smooth-unioned (`lm_smin`, radius `uBlend`) with up to `FEATURE_SLOTS` spheres (`uFeatureCenters`, `uFeatureRadii`, scaled by `uMorph`). The surface radius is found per vertex by 10 steps of sphere tracing inward. With `uMorph = 0` it is skipped and costs nothing.
     - Do not enable it: the ball is approved as is and will not become a bear.
  2. **Impacts ("soquinho")**: `lm_impacts`, up to `IMPACT_SLOTS` (8) simultaneous hits (`uImpactDir`/`uImpactStart`/`uImpactForce`, timed by `uClock`, which never freezes). Each is an elastic dent plus a damped sine wave travelling by geodesic (angular) distance, ~1.5 s. Displacement is radial from the base position, so it also works on the bear (`uMorph > 0`).
     - `HeroScene` raycasts by itself against the ball's world sphere: the canvas is `pointer-events-none` under the phrases, so R3F events never fire.
     - Mouse punches on `pointerdown`; touch punches on `click`, so the start of a scroll doesn't count.
     - Hovering the ball: stronger tilt/turn toward the cursor (`fx.hover`, with inertia), a small circle cursor (a `body` child, because the hero is pinned) that pulses on click, and a short reflection shake (`fx.kick`).
     - Reduced motion: no waves, only a soft glow at the hit point (`uGlow`/`uGlowDir`).
     - **Drag and fling** (`spin` group around the mesh): press on the ball and move > 6 px to drag (rotation 1:1, arc length / on-screen radius); a release without moving is the punch (punch fires on `pointerup`). On release it keeps the angular velocity of the last ~100 ms and slows with friction, then slerps back to identity (the bear needs the original orientation). **Rotation only, never translation**: `fx.lock` freezes the rig's mouse offset while dragging/spinning. `lm_spin` (`uSpin`/`uSpinAxis`) flattens along the spin axis and adds a ripple around it, driven by an underdamped spring (the "sway" when it slows). Touch: the hero anchor has a circular `touch-none` target, so only touches starting on the ball rotate it. Reduced motion: rotates 1:1, no inertia or deformation.
  3. **Liquid**: simplex noise. Keep it low (`uAmp` 0.05, `uFreq` 0.5): higher values look like a crumpled blob, not a ball.
  4. **Pointer pull** toward the cursor.
  - Normals come from finite differences over the sum. `LIQUID_LIGHT` (mobile) drops the second noise octave.
- `HeroVisual.tsx`: the static SVG poster, rendered **inside the anchor**, so it always matches the 3D ball. Its `viewBox` is cropped to the shape. It is the no-WebGL / `SceneBoundary` fallback and cross-fades out when the scene is ready.
- Reduced motion: no pin, no scrub, `frameloop="demand"`, frozen shader time (no breathing).
- Mobile (coarse pointer): lighter geometry, one noise octave, DPR capped at 1.5, no mouse tracking.

**Manifesto** (`components/Manifesto.tsx`, client) is the "Mensagem de {name}" section. It has a transparent background (the darkened ball stays visible behind it) and `data-theme="dark"`.
- Portrait: the owner's **colour** photo (`public/retrato/`, path in `portraitSrc` in `page.tsx`, alt `manifesto.portraitAlt`), no B&W filter. `PortraitReveal` plays "luz de estúdio acendendo" (CSS/masks only, no WebGL; replaced the liquid-metal WebGL entrance on 10/10) **by trigger** (portrait top at 78%, once, ~2.1 s): dark frame with only the thin border at 30%; a light beam enters from the left with two flickers; a soft gradient mask sweeps the photo left to right (lit side of the face first) with a slight brightness/contrast lift; the light settles and the border goes to full.
  - **The final state is the real image:** at the end the mask and filter are removed and only the `next/image` (quality 90, srcset from the 2400 px original) stays. `onRevealed` fires then (the signature is written after it). No JS / reduced motion: photo visible from the start.
  - The portrait is ~80% of its column (approved size), inside `TiltCard` ("glass card", CSS 3D only): on hover it tilts toward the cursor (perspective 1000px, max 7°, lerp) and a faint silver `mix-blend-mode: screen` glare follows the tilt; the signature is the `front` layer at `translateZ(60px)`. The `ref` (ScrollTrigger trigger) sits on the outer, non-rotating wrapper. Touch: light tilt from scroll, or the gyroscope where it needs no permission. Reduced motion: no tilt, no glare. Frame shape "curva líquida" (`components/portraitFrame.tsx`, one path in objectBoundingBox units): three small corners (~4% of the width) and a large fluid curve at the bottom right. It is applied as a CSS **mask** (`PORTRAIT_FRAME_MASK`, an inline SVG data URI stretched to the box) on the photo + light layers (`PortraitReveal` `shape`) and the glare (`TiltCard` `shape`). Never `clip-path: url(#…)` here: inside the `preserve-3d` card Chrome ignored it and the photo stayed rectangular past the curve; the thin border is an SVG over them (`TiltCard` `overlay`, white 35%, non-scaling stroke). The card itself is never clipped (that would flatten the 3D and cut the signature). (The earlier "liquid worm" around the frame was removed at the owner's request.)
- Signature timing: written by time (~1.8 s, `timeScale` over the per-path durations) right after `PortraitReveal` reports `onRevealed`; without a portrait, when the frame reaches 60% of the screen. The SVG has `overflow: visible`. Undrawn paths are `opacity: 0` (a round cap would otherwise leave a loose dot).
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

**Home order (narrativa):** Hero → Mensagem → A distância → Diagnóstico → Fractional → O que eu faço → O que muda → Como funciona → Onde o trabalho aparece → Trabalhos → Sobre (resumo) → E a IA? → Poucas parcerias → Perguntas frequentes → Contato. Other pages: `/sobre` (About `variant="page"` + Contact). There are no case pages. Header and Footer live in the locale layout. The page content + Footer sit in a wrapper with `overflow-x: clip` (guard against horizontal scroll; `clip`, never `hidden`, so sticky and pins keep working). `CONTEUDO-SITE.md` numbers the sections differently ("A distância" is its §7 and is shown right after the message; "Sinais" became the interactive "Diagnóstico"). Eyebrows have no numbering, so reordering doesn't break labels.

**More sections** (`components/sections/*`):
- `Distance`: the owner's SVGs from `public/graficos/`, inlined by `src/content/charts.ts`. Ids are prefixed `ga-`/`gb-`/`gc-`, because the files repeat ids. Chart C renders the END file, plus start poses computed from the start file.
  - **Three stacked blocks, no pin**: text left (always visible), chart right; on mobile the text sits above the chart.
    1. A: curves + gap;
    2. B: milestone, ghost, brand catching up. It starts from A's final state;
    3. C: consistency (points align on the common axis).
  - Each chart has its own **short scrub** timeline: trigger is the `figure[data-chart]`, `start: "top bottom"`, `end: "center center"`. It is complete when the chart reaches the middle of the screen and stays where it is if scrolling stops.
  - Without JS or under reduced motion the SVGs show their final state.
  - The three phrases share ONE effect, by trigger (not scrub): **decoding** letter by letter (shared module `components/decode.tsx`: `DecodeLetters`, `hideLetters`, `decode`, `shine`; also used by the AI section title, `top 85%`, once, ~1.6 s). Every letter shows random "code" glyphs (`#%&/<>=+*01` + A–Z, Geist Mono, silver) in an absolutely positioned layer over the real letter, which stays in place as an invisible width reserve (so no layout shift; line breaks are the final ones). Letters lock left to right, appear graphite (opacity 0.16) and light up to full. Then the `highlight` word of `distance.charts[]` ("distância", "fechá-la", "confiar") gets one silver sweep (`.text-shine-fixed` in `globals.css`, viewport-fixed gradient). Letters are `<span aria-hidden>` under an `<h3 aria-label>` with the full sentence (and `translate="no"`); the random layers are empty in the server HTML. Pre-hydration hidden state: `.js-motion [data-decode] [data-ch]`. Reduced motion: static final phrase.
  - The hatch/glow between curves is strengthened in `globals.css` (`[data-chart] pattern[id$=-hatch]`).
- `Diagnostic` background: `graphics/CloudBackdrop` (first child of the section, `absolute inset-0 z-0`, sticky inner layer, opacity 34%, vignette and fades; content in `relative z-10`; the section is `overflow-clip`, never `overflow-hidden`, which would kill the sticky). `graphics/clouds/CloudScene` (R3F) draws one full-screen quad: the camera ray hits 6 horizontal cloud planes analytically, each sampling animated fbm (no raymarch), composed front to back, at DPR 0.6 (mobile 0.45, 4 layers, 3 octaves). Scroll progress (`top 40%` → `bottom 70%`) moves the camera from above the sea of clouds down through the layers (a mist veil when crossing one) to below them; from p 0.6 the clouds open (`uOpen`). Grazing angles are faded (edge-on planes turn into streaks). No WebGL2: no clouds. Reduced motion: still frame. Approved version: tag `nuvens-3d-aprovadas`; do not change the look without a request.
- `Diagnostic` (§3b): 8 quoted founder phrases, each a `<button aria-pressed>` (click/touch/keyboard). Marked phrases turn silver; the rest stay graphite. The counter "x de N" uses `aria-live`.
  - Affordance cues:
    - a one-time demo per visit (sessionStorage `diag-demo-shown`) lights the first phrase for ~1 s without counting;
    - rings pulse (`ringPulse` keyframes) until the first interaction;
    - on mouse hover the phrase brightens, the ring shows a faint ✓, and a custom cursor label follows ("Marcar"/"Desmarcar"). The label is portaled into `<body>` (so `fixed` is always viewport-relative) and clamped inside the viewport, so it can never widen the page;
    - the hint text switches between "Toque…" and "Clique…" via `@media(pointer:fine)` CSS.
  - No demo or pulse under reduced motion. Phrase spans use `minmax(0,1fr)` + `break-words` so nothing clips at 1024–1440px.
  - The closing has 3 states: `closing` (0 marked or no interaction, which is what the HTML holds), `closingOne` (1 marked) and `closingMatched` (2+, plus the "Vamos conversar" CTA to `#contato`).
- `Changes`: before/after. With `data-mode="flip"` each row flips via scroll inside a grid overlay (`[grid-area:1/1]`). The static mode shows two columns. Both texts are always in the DOM.
- `Process`: a black section (`data-theme="dark"`, since 10/10) with `GraphicLayer variant="grid"`. 6 steps (`process.steps[]`: `phase` label in mono, never a time frame; `title`; `text` story), no "Você sai com". Step 06 (PARCERIA, "Quanto mais tempo juntos, mais forte a sua marca.") is a normal timeline point. The solid line scrubs `scaleY` and ends at the 06 dot (`--tail` measured by a ResizeObserver; the scrub's `endTrigger` is that dot); below it a dotted line fades out downward, with no end point. Steps light up.
  - The sticky `graphics/LiquidDrop` (raw WebGL2 raymarched SDF) changes shape per step via `stageRef` (6 targets). The last is a ring that stays almost face-on (small sway) and turns in its own plane (3 lobes driven by `uAngle`); spinning it around Y would show it edge-on as a pill.
  - Deep entrance: `uEmerge` 0→1 (~2.8 s, ease-out) once 40% of the drop is visible; it comes from far in Z, dark, with a CSS blur on the canvas. It resets when the drop leaves the screen.
  - Always alive: scale breathing, a noise floor in every step and a slowly rotating studio. Fine pointers tilt it (`uTilt`).
- `Works` (server) + `LogoMarquee` + `WorkCarousel`. Data lives in `public/trabalhos/trabalhos.json` and `public/logos/logos.json` (read via `src/content/media.ts`; to add one, drop the file in the folder and fill `"arquivo"`).
  - Logos are rendered as a CSS **mask** over `bg-silver`, so they become monochrome silver whatever their colors.
  - Marquee: two rows in opposite directions; each track holds the list twice and moves xPercent 50; it slows on hover (timeScale) and pauses off-screen. Loop mode is `data-mode="loop"`; otherwise it is a static grid.
  - Carousel: desktop uses a pinned ScrollTrigger with snap. The arrows call `scrollToY()` (from `SmoothScroll`, Lenis-aware) to the slide's scroll position. Mobile uses drag + arrows. Neighbors are scaled 0.7 and dimmed 0.45.
- Dynamic routes (none today; the old `/cases/[slug]` was removed): **with cacheComponents, read `params` inside a `<Suspense>`**, otherwise dev throws "encountered URL data during prerendering".
- Signature: `src/content/signature.ts` reads `public/assinatura.svg` at build (49 stroke paths, `viewBox`); replace the file to change it.
  - `Signature` draws a polished-chrome stroke: a repeating, slanted gradient (`spreadMethod="reflect"`) from light graphite to white to greys, with **no glow/blur filter**, plus a "shine" layer.
  - `Manifesto` writes the paths in sequence (duration ∝ `getTotalLength`), then sweeps a light band (gradient `x1/x2`) on completion and every ~5 s while visible. No sweep under reduced motion.

**Remaining sections:**
- `Touchpoints`: a large list. Each line rises from a mask on scroll; the hover shift sits on the parent, because GSAP owns the line's transform.
- `About` (server, light, `contours-b`):
  - `variant="summary"` (home): the h2, with a link to `/sobre`;
  - `variant="page"` (`/sobre`): the h1, the timeline and the method;
  - the portrait goes in `aboutPortraitSrc`.
- `Ai` (§11b "E a inteligência artificial?", black, between Sobre and Poucas parcerias; menu "IA"): a minimal chat prompt box where the objection is typed letter by letter with a blinking caret (`caretBlink` keyframes) when it enters the screen. The real sentence sits in a transparent layer (accessible, indexable, reserves the box size); the typed layer is `aria-hidden`. Typing is time-based (a precomputed schedule read by the GSAP ticker), so it finishes on time even on a busy main thread. Then the h2 decodes (`components/decode.tsx`). The 4 "A IA nunca..." lines light from graphite to white by scrub; the closing gets one silver sweep on `ai.closingHighlight`. Reduced motion / no JS: everything static and visible, no caret.
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

**WebGL contexts (regra fixa):** Chrome loses the oldest context past 16 active ones ("Too many active WebGL contexts"), and in dev HMR/Strict Mode multiply them.
- Detect support only with `webglSupport()` (`src/lib/webgl.ts`): one cached probe that releases its context. Never call `getContext` just to test.
- Every canvas (hero, portrait, liquid contours, drop, mountains, clouds) asks for a slot with `useWebglSlot` (`src/lib/quality.ts`): it mounts only near its section (~1 screen margin) AND among the `MAX_CONTEXTS` (2) scenes closest to the viewport, and unmounts otherwise (measured: max 2 active while scrolling the whole page).
- Quality tiers (`lib/quality.ts`): `none` (no WebGL2 or a software renderer: static fallbacks), `low`, `medium`, `high` (= the approved look). Presets cap the DPR (2/1.5/1) and use the light geometry on `low`; a live FPS monitor drops one tier after ~3 s below 50 fps. Scenes read `useTier()` and register with `useSceneMonitor()`.
- Hero: shaders are compiled with `renderer.compileAsync` before the first frame (`frameloop="never"` until then; the SVG poster covers the ball). Mountains: the terrain is built in a Web Worker (`terrain/terrain.worker.ts`) and cached via `primeTerrain`.
- Wrap each scene in `ResilientBoundary`: a render error or `webglcontextlost` (R3F: `ContextLossWatcher`; raw canvases: their own listener calling `onLost`/`onFail`) remounts the scene after 0.8 s; the static fallback is used only after repeated failures.

**Intro-animation gotchas**
- The hero intro is pure CSS (`heroReveal`/`heroFade` keyframes on `.js-motion [data-reveal|data-fade]` in `globals.css`, `backwards` fill, `--i` = stagger index), so it runs at first paint without waiting for hydration (LCP). Only under `prefers-reduced-motion: no-preference`. The `js-motion` class is added by an inline script in `layout.tsx` before first paint, and removed after 6s as a safety net so text can never stay hidden.
- Do not tween `[data-reveal]`/`[data-fade]` with GSAP: the CSS animation owns them (a CSS animation overrides inline styles while it runs). The hero exit on scroll animates the parents (`[data-hero-text]`).
- The hero animates individual `[data-hero-text]` elements (not a wrapper), so the ball anchor never moves and the 3D framing stays correct.

**Images / logos / cases**: `components/MediaSlot.tsx` is the single frame for photos and case images. Without `src` it renders a labelled placeholder with the same aspect ratio; fill `image` / `src` in the arrays in `page.tsx` (paths under `public/`) to swap in real assets. Placeholder content (email, social `#` links, "Case 01…", logo slots) is still to be replaced.

## Conventions and lint traps

- Typography is **sans-serif only** (Geist via `next/font`; `--font-display` aliases Geist). Only exception: `--font-brand` (Archivo Expanded) for the header name and brand signatures. No serif fonts, no italics for display text; hierarchy comes from weight contrast (light vs. semibold) and tight tracking.
- Colors only through the theme tokens (see Themes); never hardcode white/black alpha utilities.
- The React Compiler lint rules reject mutating values returned from hooks. In R3F code, get the scene via `useFrame(({ scene }) => …)` or `useThree((s) => s.get)()` instead of `const scene = useThree(...)`, and keep `onReady`-style callbacks stable (`useCallback`) since they sit in effect dependency arrays. Ref objects passed as props are only treated as mutable if the prop name ends in `Ref` (e.g. `pointerRef`). Mutate materials through a mesh ref (`mesh.current.material`), not through a `useMemo` result.
- Windows PowerShell 5.1 `Get-Content`/`Set-Content` re-encode files (ANSI read, BOM on write) and corrupt the Portuguese accents. Edit files with the editor tools, not PowerShell text pipelines.
- The `THREE.Clock deprecated` console warning comes from inside R3F 9.8.1. It is harmless.
- Git: branch `main`. Commit at the end of each validated stage, and during stage 3 at the end of each validated part, only after lint, `tsc`, build and the desktop/mobile check pass.

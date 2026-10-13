# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## REGRA PRINCIPAL

**O estado da tag `site-aprovado-10-10-noite` é o NOVO ESTADO APROVADO pelo Breno (substitui `site-aprovado-10-10`): todas as animações, cenas 3D (bola da hero, montanhas, nuvens, oceano, floresta com urso, gota, curvas líquidas) e textos atuais. Nada deve ser alterado sem pedido explícito. Não altere nada além do que for pedido em cada mensagem. Nada de melhorias, refatorações ou ajustes por conta própria.**

**O CONTEUDO-SITE.md é somente leitura para o Claude Code. Ele é editado fora daqui. Nunca escreva, salve, reformate nem restaure versões desse arquivo, mesmo que pareça desatualizado. Sempre releia do disco antes de usar.**

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
- **Oceano 3D** na seção da IA (`graphics/OceanBackdrop.tsx` + `graphics/ocean/*`): alto-mar, linha d'água, mergulho com god rays, cáusticas, partículas, recife procedural, cardume com boids (glb Draco de 3,5 KB, Quaternius CC0, `scripts/build-ocean-models.mjs`), rim light prateado. Tubarões e tartaruga realistas desde 12/10 (`graphics/ocean/animals.ts`: glTF com esqueleto de `public/modelos/oceano/`, um AnimationMixer por clone, trajetórias CatmullRom, "circling" a cada ~20 s, olhos em esferas presas aos ossos L_Eye/R_Eye; material com a linguagem do oceano; celular: tubarão grande cruzando o terço central a cada 6,5 s; nível low: 1 tubarão sem circling). Tags `oceano-v1`, `oceano-3d-aprovado` (= `site-aprovado-10-10`); a tartaruga única (`a93173b`) aguarda aprovação para a tag `oceano-tartaruga`.
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
  - **Substituída em 12/10** (tag `floresta-antes-aerea` antes): descida aérea controlada pelo scroll (`graphics/forest/aerial.ts` + `AerialScene.tsx`): floresta nevada com rio (água escura reflexiva, bordas congeladas) até uma cachoeira (shader de fluxo, névoa e respingos), pinheiros instanciados (3 variações), pedras nevadas, neve caindo, névoa de altitude; câmera de ~85° no alto até ~45° na cachoeira; urso EM PÉ numa pedra no alto da queda, de lado, olhando a água. Urso: modelo estático (sem esqueleto) `public/modelos/urso/urso.glb`, vida no vertex shader (respiração, cabeça ±6°/±3°, pelo das costas), cabeça em +Z no espaço do modelo. O mundo é montado em pedaços (sem tarefa longa) antes do 1º quadro; sombras estáticas (mapa refeito só quando algo entra).
  - **Floresta densa sem neve (12/10):** paleta grafite-musgo (#1C221D, #2A332B, #3B463C), 4 variações (2 coníferas, 2 de copa larga), ~4.600 árvores em chunks de 60 m: 3D perto da câmera (85 m; 50 m no toque), IMPOSTORES longe (atlas renderizado na montagem: vista lateral e de cima de cada variação, com margem interna; cartões de frente para a câmera misturando as duas vistas pelo ângulo). Chão com samambaias, musgo e folhas (instanciados, só perto da cachoeira), pedras com limo, raios de sol aditivos e pólen (sem raios no toque). Sombras 1024 só no urso, pedras e árvores 3D perto dele. Matrizes congeladas (cena estática). Armadilha: no three, o viewport/scissor de um render target só valem ao chamar `setRenderTarget` de novo.

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
- **Créditos de terceiros (obrigatórios):** modelo 3D do urso "Realistic Grizzly Bear - Game Ready Asset" por 3Dima (https://sketchfab.com/3d-models/realistic-grizzly-bear-game-ready-asset-4657008bf6004ede9ff8e1f66e0df91f), CC BY 4.0 (`public/modelos/urso/LICENSE.txt`). O crédito fica no rodapé (`footer.bearCredit`, links em `src/content/bear.ts`); não remova enquanto o modelo estiver no site. Oceano: tubarão "Realistic Shark" por MotionStreamStudios (https://sketchfab.com/3d-models/realistic-shark-e913e5092d2341749ff66e4359b1e4a3) e tartaruga "Sea Turtle" por Eloi (https://sketchfab.com/3d-models/sea-turtle-23dcb315dea44f5082b020b04710bd31), ambos CC BY 4.0 (`public/modelos/oceano/LICENSE-*.txt`); créditos no rodapé (`footer.sharkCredit`, `footer.turtleCredit`, links em `src/content/oceanCredits.ts`); não remova enquanto os modelos estiverem no site. Peixe do cardume: Quaternius, CC0 (sem crédito obrigatório).

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
   Pendências de conteúdo do dono: retrato, logos, imagens de trabalhos, cases, bio/trajetória, e-mail, mídia kit, itens [CONFIRMAR], 6 frases da "3b Diagnóstico" (o arquivo ainda tem as 5 de "Sinais") e tradução EN.
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
- **Feito (12/10):** JSON-LD `Person`, `ProfessionalService` (catálogo com a parceria e todos os serviços das 3 colunas de Projetos pontuais; `address` só com o país, exigido pelo Google em LocalBusiness), `WebSite` (no layout) e `FAQPage` (na seção), em `src/lib/seo/structured-data.ts`; `sameAs` com placeholders comentados (LinkedIn/Instagram/Behance) para o dono preencher. `src/app/sitemap.ts`, `robots.ts` e `manifest.ts`; ícones `src/app/icon.png` e `apple-icon.png` e a imagem de compartilhamento `public/og.png` (1200 × 630), gerados por `node scripts/build-og.mjs`. Metadados com Open Graph e Twitter Card via `pageMetadata()`.
- **Falta no lançamento:** definir `NEXT_PUBLIC_SITE_URL` com o domínio final (sem ela, canonical, sitemap e JSON-LD apontam para localhost:3000) e preencher o `sameAs`.

# Pendências do site (lista mestra)

Leia este arquivo e o CONTEUDO-SITE.md antes de começar. Confira item por item no código, implemente o que ainda não estiver feito e marque cada item com [x] neste arquivo ao concluir. Fonte dos textos: CONTEUDO-SITE.md. Commit ao final de cada bloco.

## Bloco 1. Textos e regras
- [x] Todos os textos do CONTEUDO-SITE.md aplicados em pt (en repete pt por enquanto).
- [x] Mensagem do Breno: frase grande com "sobre si." (hoje está "sobre sim", sem ponto) e ponto final depois de "sala". Parágrafo novo começando com "É essa impressão que eu construo."
- [x] Nenhum travessão (— ou –) em texto visível, pt e en.
- [x] "Fractional Brand & Creative Director" nunca traduzido; nada de "fracionário/fracionada".
- [x] "Trabalho com poucas empresas por vez." exatamente assim.
- [x] Título dos pilares: "O nível de direção das grandes marcas. Na medida da sua empresa." + subtítulo novo do CONTEUDO-SITE.md.
  > Feito. CONTEUDO-SITE.md já atualizado com os dois títulos (fonte única).
- [x] Título de "O que muda": "O valor que já existe, finalmente visível."
- [x] FAQ com 11 perguntas, acordeão, JSON-LD FAQPage.
- [x] Regras de SEO no CLAUDE.md e aplicadas (h1 único, hierarquia, metadados, hreflang, alt).

## Bloco 2. Ordem e cores
- [x] Ordem: Hero, Mensagem, A distância, Diagnóstico, O que é fractional, O que eu faço, O que muda, Como funciona, Onde aparece, Trabalhos, Sobre, Poucas parcerias, FAQ, Contato.
- [x] Ritmo de cores: preto na maior parte; off-white só em "O que é fractional", "Como funciona" e "Poucas parcerias"; gradiente escuro em "A distância", "O que muda", "Sobre" e "Contato".
- [x] Curvas de nível do off-white: movimento líquido (campo de ruído animado), 3x mais lento, menos linhas e opacidade menor.

## Bloco 3. Hero, assinatura e números
- [x] Bola da hero em prata cromada brilhante (metalness alto, roughness baixíssimo, environment de estúdio), sem reflexos em forma de parêntese, sem topo estourado.
- [x] Assinatura: public/assinatura.svg, desenhada com o scroll, gradiente prata de cromo, sem glow difuso, reflexo de luz percorrendo o traço (restaurar o metálico aprovado; ver histórico do git).
- [x] Números +313% e 97% (Lightcast): bold como antes, "+" e "%" no mesmo tamanho e linha de base, alinhados entre si, contagem animada, acabamento "black chrome" (preto profundo com faixas de reflexo prata) e reflexo de luz uma vez.

## Bloco 0. PRIORIDADE MÁXIMA (pedidos da noite de 09/10, fazer nesta ordem antes do resto)
- [ ] Montanhas 3D: caíram para a foto de fallback. Investigar no console o que disparou o SceneBoundary/handleFail, tratar webglcontextlost/restored, não cair para a foto de forma permanente em falha temporária, desmontar canvases WebGL fora da tela para limitar contextos. Confirmar com captura que o terreno 3D aparece e se aproxima com o scroll, inclusive depois de rolar o site todo e voltar.
- [ ] Cabeçalho (logo): opção D escolhida. Assinatura (public/assinatura.svg) pequena (120 a 150px) em prata metálica, desenhando-se em ~1 s no carregamento, como link para a home; ao lado, "Breno Côrtes Romão" em Archivo Expanded (next/font/google, eixo wdth 125%, peso 600, caixa alta, letter-spacing 0.18em, #e6e7e9) e embaixo "Fractional Brand & Creative Director" em Geist Mono. Ao rolar após a hero, nome e cargo somem e fica só a assinatura; mobile só a assinatura. Registrar no CLAUDE.md que Archivo Expanded é exceção só para o nome.
- [ ] Retrato COLORIDO no Manifesto: public/retrato/breno-retrato(.webp/.jpg 1200px) e breno-retrato-800 (mobile), 4:5, sem filtro P&B, alt "Retrato de Breno Côrtes Romão". Entrada "como pintura": pinceladas em P&B (esboço a carvão) que preenchem e ganham detalhe, cor entra no final; shader com máscara de pinceladas avançando com o scroll, completa em menos de uma tela, antes da assinatura. Corrigir a assinatura que aparece cortada (desenhar os 49 paths por completo).
- [ ] Bola da hero: hover gira e inclina na direção do cursor; clique/toque = "soquinho" com afundamento no ponto (raycast) e ondas de impacto amortecidas se propagando pela superfície, até 8 impactos simultâneos somando-se, normais recalculadas, cursor em círculo que pulsa no clique. Mobile igual; reduced motion só um brilho. Compatível com o urso da Etapa 4.
- [ ] Textos atualizados no CONTEUDO-SITE.md: parágrafo da Mensagem ("É essa impressão que eu construo. Trabalho com empresas que já são grandes no que fazem..."), subtítulo de "O que eu faço" ("Estratégia sem execução vira PDF..."), fechos do Diagnóstico ("Nenhuma dessas frases se resolve com mais peças. Se resolve com direção."), título e texto de "Como funciona" ("Um método próprio. Feito para quem não tem tempo a perder.").
- [ ] Frase grande do Manifesto: text-wrap: balance, coluna um pouco mais larga, sem buraco depois de "na cabeça das".
- [ ] Remover lista de cases, rota /cases/[slug], src/content/cases.ts e mensagens relacionadas, sem links quebrados.

## Bloco 4. Seções
- [x] A distância: TRÊS BLOCOS SEPARADOS, um abaixo do outro (como era antes), SEM pin e SEM cena única. Cada bloco: texto à esquerda sempre legível e seu gráfico à direita (SVGs em public/graficos/: A = distância, B = fechando, C = consistência). A animação de cada gráfico continua ligada ao scroll (scrub), mas curta: começa quando o bloco entra pela parte de baixo da tela e TERMINA quando o gráfico chega ao centro da tela (cerca de meia tela de scroll). Se a pessoa parar, o gráfico fica no ponto em que está; ao chegar no centro, está completo. Textura entre as curvas visível. Cabeçalho não sobrepõe rótulos.
  > Feito em 09/10. Distance.tsx: 3 blocos empilhados, sem pin; cada gráfico tem uma timeline em scrub (trigger: o gráfico, "top bottom" até "center center"). Texto sempre visível. Conferido em desktop e mobile.
- [x] Diagnóstico: 8 frases novas com aspas curvas, contador "x de 8", fundo preto, demonstração automática na primeira frase, hover com ✓ e cursor "Marcar", pulso sutil até a primeira interação, instrução mais visível, nenhuma frase cortada na lateral.
- [x] O que muda: sublinhado único deslizando de ANTES para DEPOIS, DEPOIS acende em prata, frase do depois com mais contraste.
- [x] Como funciona: gota de metal líquido sticky mudando de forma por etapa (duas gotas se fundem, ondulação, estabiliza, flui, anel). ENTRADA PROFUNDA: a gota não pode surgir do nada; ela emerge da profundidade (vem de longe no eixo Z, desfocada e escura, ganhando nitidez, brilho e tamanho, como algo subindo de um líquido escuro) ou nasce de gotículas que convergem. ANIMAÇÃO CONSTANTE: mesmo parada, respira, ondula e gira devagar, com reflexos se movendo na superfície; reage levemente ao mouse.
  > Feito em 09/10 (LiquidDrop.tsx). Entrada: uniform uEmerge (0→1 em ~2,8 s, ease-out) quando 40% da gota fica visível; ela vem de z = -7 e um pouco de baixo, escura, com blur CSS de 16px e opacidade baixa, e ganha nitidez, brilho e tamanho. Como a etapa 0 tem duas gotas afastadas, elas surgem como gotículas que convergem. Recomeça a cada nova entrada na tela. Constante: respiração na escala, ondulação mínima em todas as etapas e estúdio girando devagar (reflexos andando). Mouse: inclinação leve + reflexo (só ponteiro fino).
- [x] Trabalhos: título + subtítulo de trajetória; logos em 2 fileiras contínuas em direções opostas sem buraco; carrossel de imagens estilo landonorris.com com legenda (projeto, ano, papel); SEM lista de cases e SEM páginas /cases.
  > Feito em 09/10. Subtítulo exibido abaixo do título (Works.tsx). Legenda do carrossel: projeto, depois "ano · papel" e o contador (campo "papel" em public/trabalhos/trabalhos.json, lido em src/content/media.ts; hoje [PENDENTE]). Logos: cada cópia da trilha repete a fileira 3x, então o loop não abre buraco em telas de até ~3200px (conferido em 1440 e 1920). Links conferidos.
  - [x] Remoção dos cases (09/10): lista "Case 01/02/03" saiu de Works.tsx; apagados src/app/[locale]/cases/ e src/content/cases.ts; works.cases e works.casePage removidos de pt/en; "/cases" fora de routes.ts. Links internos de /pt, /en, /pt/sobre e /en/sobre conferidos (todos 200, âncoras existem); /pt/cases/case-01 agora dá 404.
- [x] Seções restantes completas: Onde o trabalho aparece, Sobre, Poucas parcerias, FAQ, Contato.

## Bloco 5. Fundo de montanhas (novo, PRIORIDADE: fazer logo depois do Bloco 1)
- [x] Imagem JÁ PRONTA em public/fundo/: montanhas.webp/.jpg (3600px, desktop) e montanhas-mobile.webp/.jpg (1600px). Já está em preto e branco com contraste ajustado; não reprocessar a cor.
- [x] Aparece SÓ no trecho "O que eu faço" + "O que muda" (cerca de 2 a 3 telas de scroll), atrás do conteúdo.
- [x] Tratamento: preto e branco, contraste alto, opacidade baixa (cerca de 15 a 25%), vinheta escura nas bordas e degradê para preto no início e no fim do trecho, para entrar e sair sem corte.
- [x] Movimento: conforme o scroll avança pelo trecho, a imagem se aproxima devagar (escala de 1.0 a no máximo 1.5, com transform-origin no pico nevado principal (cerca de 62% x 70% da imagem) e leve deslocamento vertical, para a qualidade não cair), como uma câmera descendo das montanhas até o detalhe.
- [x] Performance: imagem otimizada com next/image (AVIF/WebP), versão menor no mobile, transform via GPU; prefers-reduced-motion = imagem estática.

## Bloco 6. Montanhas em 3D (substitui a foto do Bloco 5, que ficou em baixa qualidade)
- [x] Trocar a foto por um TERRENO 3D PROCEDURAL em tempo real (React Three Fiber), no mesmo trecho "O que eu faço" + "O que muda". Nítido em qualquer resolução e zoom. Manter a foto só como fallback (sem WebGL).
- [x] Geração: heightmap por ruído (ridged multifractal / fbm com erosão aparente) formando cordilheiras com picos, vales e cristas marcadas, vistas de cima, como foto aérea dos Alpes.
- [x] Visual monocromático na paleta do site: rocha em grafite quase preto, neve/cristas em prata clara nos pontos mais altos e nas faces voltadas para a luz, luz rasante lateral (sol baixo) criando sombras longas, névoa atmosférica escura no horizonte e entre as camadas de montanhas (profundidade), nada de azul.
- [x] Integração: opacidade geral em torno de 30 a 40% (ajustar para o texto continuar perfeitamente legível), vinheta escura e fade para preto na entrada e na saída do trecho.
- [x] Câmera ligada ao scroll: começa alta, vendo várias cordilheiras ao longe, e desce suavemente em direção a um pico principal até ficar próxima das cristas no fim do trecho (como um drone descendo). Leve deriva contínua mesmo parado (a névoa se move devagar). Leve parallax com o mouse.
- [ ] Performance: malha com LOD (densidade alta só perto da câmera), shader de terreno leve, DPR limitado, pausa fora da tela, reaproveitar o renderer existente se possível. Mobile: malha menor e resolução reduzida; se o FPS cair, usar um frame renderizado estático. prefers-reduced-motion: frame estático.
  > Feito em 09/10: graphics/terrain/heightmap.ts (ridged multifractal + domain warp, maciço largo no centro, grade com LOD radial, sombras de sol rasante pré-calculadas na CPU, geração ~220 ms com cache num requestIdleCallback) e terrain/MountainScene.tsx (R3F, shader grafite/prata com neve por altitude e inclinação, detalhe de normal de perto, névoa de distância e de vale com deriva). MountainBackdrop: cena montada só perto do trecho, opacidade 36%, foto como fallback, reduced motion = quadro estático. Não reaproveita o renderer da hero (canvas próprio; a hero já está fora da tela). Ainda não medido FPS em GPU real (headless usa SwiftShader); falta o fallback automático para quadro estático se o FPS cair.
- [ ] Antes de seguir com o resto, me mostre capturas do início, meio e fim do trecho para eu aprovar o visual.

## Bloco 6b. Montanhas 3D mais realistas e com textura (aprovado o conceito; agora refinar)
- [ ] Forma: aplicar erosão no relevo (erosão hidráulica pré-calculada numa textura de altura, ou "erosion noise" no shader) para criar vales em V, ravinas e cristas afiadas como montanhas reais. Opcional, se ficar melhor: usar um heightmap REAL de cordilheira (dados de elevação abertos, ex.: Alpes) como base, com detalhe procedural por cima.
- [ ] Textura: materiais PBR de rocha e neve gratuitos (CC0, ex.: Poly Haven ou ambientCG) em tons de cinza, com mapeamento triplanar (sem esticar nas encostas), normal map de microdetalhe e variação de rugosidade.
- [ ] Neve realista: depende da altitude, da inclinação (encostas íngremes ficam com rocha exposta) e da face voltada para a luz; bordas da neve irregulares, não em faixas.
- [ ] Luz e sombra: sombras reais (shadow map suave) do sol rasante, ambient occlusion nos vales, aerial perspective (montanhas distantes mais claras e com menos contraste, como na foto de referência).
- [ ] Atmosfera: camadas de névoa baixa passando pelos vales e entre as cordilheiras, se movendo devagar.
- [ ] Acabamento: leve grão de filme e vinheta para integrar ao site; paleta continua monocromática (grafite, prata, branco), sem azul.
- [ ] Performance continua prioridade: texturas comprimidas (KTX2/Basis ou webp), LOD, sombras só no desktop, pausa fora da tela. Mobile mais leve ou frame estático.
- [ ] Me mostre capturas do início, meio e fim do trecho antes de seguir.

## Bloco 7. Animação de textos no scroll (sistema único para o site todo)
- [ ] Criar um componente/utilitário reutilizável de revelação de texto e aplicar com consistência:
  - Títulos grandes (h2): revelação por LINHA com máscara (cada linha sobe de trás de uma máscara, stagger ~0.08 s, easing expo-out), ao entrar na tela.
  - Frases de impacto (como "Toda empresa que cresce rápido cria uma distância..." em A distância): palavras começam em grafite e ACENDEM para branco uma a uma conforme o scroll (scrub curto, do bloco entrando até o centro da tela), sincronizadas com o gráfico ao lado.
  - Palavra-chave de cada frase de impacto (ex.: "distância", "parece", "fechá-la", "confiar") ganha um brilho prata/cromado que passa por ela uma vez quando acende.
  - Parágrafos e textos de apoio: fade + leve subida (12 a 20px), discretos.
  - Rótulos em mono (eyebrows): letras aparecem em sequência rápida, estilo terminal.
- [ ] Não animar o que já tem animação própria (mensagem do Breno, diagnóstico, números). Texto sempre no HTML (SEO), sem layout shift, prefers-reduced-motion = texto estático visível.

## Ao final
- [ ] Console sem erros, desktop e mobile validados, build de produção passando.
  > PARCIAL. Build, lint e tsc passando em 09/10 (WIP). Validação completa de desktop, mobile e console fica para depois do Bloco 4.
- [ ] Commit final e resumo do que foi feito, item por item.
- [ ] Parar e me avisar para revisão.

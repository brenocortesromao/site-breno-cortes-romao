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
- [x] Montanhas 3D: caíram para a foto de fallback. Investigar no console o que disparou o SceneBoundary/handleFail, tratar webglcontextlost/restored, não cair para a foto de forma permanente em falha temporária, desmontar canvases WebGL fora da tela para limitar contextos. Confirmar com captura que o terreno 3D aparece e se aproxima com o scroll, inclusive depois de rolar o site todo e voltar.
  > Feito em 09/10 (dd19346, 3574b49): sonda WebGL única, canvases montados só perto da seção, ResilientBoundary com remontagem e console.warn com o motivo. A queda para a foto era módulo velho do HMR no navegador ("terrainSize is not a function"); resolvido reiniciando o dev com .next/dev limpo. Versão aprovada salva na tag git montanhas-3d-aprovadas.
- [x] Cabeçalho (logo): opção D escolhida. Assinatura (public/assinatura.svg) pequena (120 a 150px) em prata metálica, desenhando-se em ~1 s no carregamento, como link para a home; ao lado, "Breno Côrtes Romão" em Archivo Expanded (next/font/google, eixo wdth 125%, peso 600, caixa alta, letter-spacing 0.18em, #e6e7e9) e embaixo "Fractional Brand & Creative Director" em Geist Mono. Ao rolar após a hero, nome e cargo somem e fica só a assinatura; mobile só a assinatura. Registrar no CLAUDE.md que Archivo Expanded é exceção só para o nome.
- [x] Retrato COLORIDO no Manifesto: public/retrato/breno-retrato(.webp/.jpg 1200px) e breno-retrato-800 (mobile), 4:5, sem filtro P&B, alt "Retrato de Breno Côrtes Romão". Entrada "como pintura": pinceladas em P&B (esboço a carvão) que preenchem e ganham detalhe, cor entra no final; shader com máscara de pinceladas avançando com o scroll, completa em menos de uma tela, antes da assinatura. Corrigir a assinatura que aparece cortada (desenhar os 49 paths por completo).
- [x] Bola da hero: hover gira e inclina na direção do cursor; clique/toque = "soquinho" com afundamento no ponto (raycast) e ondas de impacto amortecidas se propagando pela superfície, até 8 impactos simultâneos somando-se, normais recalculadas, cursor em círculo que pulsa no clique. Mobile igual; reduced motion só um brilho. Compatível com o urso da Etapa 4.
- [x] Textos atualizados no CONTEUDO-SITE.md: parágrafo da Mensagem ("É essa impressão que eu construo. Trabalho com empresas que já são grandes no que fazem..."), subtítulo de "O que eu faço" ("Estratégia sem execução vira PDF..."), fechos do Diagnóstico ("Nenhuma dessas frases se resolve com mais peças. Se resolve com direção."), título e texto de "Como funciona" ("Um método próprio. Feito para quem não tem tempo a perder.").
- [x] Frase grande do Manifesto: text-wrap: balance, coluna um pouco mais larga, sem buraco depois de "na cabeça das".
- [x] Remover lista de cases, rota /cases/[slug], src/content/cases.ts e mensagens relacionadas, sem links quebrados.

## Bloco 0b. Pedidos da madrugada de 10/10 (conferir se já foram feitos; fazer o que faltar)
- [x] Bola da hero: arrastar e arremessar faz girar com inércia e deformação líquida, SEM sair do lugar (só rotação). Clique rápido continua sendo o soquinho. Tag git "bola-aprovada" antes de mexer.
  > Já feito: tag bola-aprovada criada antes; arrastar/arremessar no commit b8b21d8.
- [x] Retrato: imagens novas em alta (public/retrato/ 2400, 1600, 900), srcset correto; estado final sempre a foto real nítida (nunca o canvas); entrada "construção digital" (pixels grandes → nítido, 2 ou 3 glitches, linha de luz prata); tamanho atual aprovado; SEM a minhoca líquida; efeito "cartão de vidro" (inclinação 3D com o mouse + reflexo translúcido, assinatura numa camada à frente); BORDAS ARREDONDADAS (20 a 24px desktop, 16px mobile) na foto, moldura, reflexo e animação; assinatura inteira, sem corte.
  > Bordas feitas em 10/10: raio 16px (mobile) / 22px (desktop) no cartão (TiltCard `radiusClass`), herdado pela foto, moldura, reflexo e canvas da construção (rounded-[inherit] + overflow hidden + isolate); o cartão não tem overflow, então a assinatura e o 3D não são cortados. Conferido em captura (construção e final, desktop e mobile).
- [x] "A distância": as 3 frases com efeito de DECODIFICAÇÃO letra por letra (caracteres de código em Geist Mono prata travando na letra certa, ~1 a 1,5 s, por gatilho), sem layout shift; remover o afastamento "o que ela é / o que ela parece"; brilho prata em "distância", "fechá-la" e "confiar".
  > Feito em 10/10 (Distance.tsx `decode`): gatilho "top 85%", uma vez; ~1,6 s por frase; letra real como reserva + camada aleatória absoluta (altura do h3 igual durante e depois); reflexo via .text-shine-fixed nas letras de `highlight` (pt/en). Reduced motion: frase estática. Gráficos inalterados.
- [x] "Como funciona": 6 etapas em storytelling conforme o CONTEUDO-SITE.md (fases ESCUTA, DESCOBERTA, DECISÃO, CONSTRUÇÃO, CICLO, PARCERIA), sem "Você sai com", etapa 06 (PARCERIA, título "Quanto mais tempo juntos, mais forte a sua marca.") na própria linha do tempo, linha seguindo em pontilhado depois dela, gota terminando em anel.
  > Conferido em 10/10: linha sólida completa quando o ponto 06 acende (endTrigger no ponto), pontilhado depois; o anel fica quase de frente (só balança) e gira no próprio plano, para não virar uma pílula de perfil.
- [x] Pilares: "Acompanhamento" sem o "o" cortado; texto novo "A marca continua evoluindo mês após mês, junto com a empresa."
  > Feito em 10/10: o corte vinha de telas ≥ ~1900px (fonte em vw crescia e a coluna não); teto do título 6rem → 5.5rem, medido de 390 a 2560px. Texto novo em pt/en.
- [ ] Montanhas 3D: versão aprovada na tag "montanhas-3d-aprovadas"; não alterar sem pedido.
- [ ] Sempre reler o CONTEUDO-SITE.md do disco antes de editar e nunca sobrescrevê-lo com versão antiga.

## Bloco 0c. Nuvens 3D no Diagnóstico (mesmo estilo das montanhas aprovadas)
- [x] Fundo 3D de NUVENS vistas do céu atrás da seção "Diagnóstico", no mesmo espírito das montanhas: monocromático (branco, prata, grafite), opacidade baixa (~25 a 35%), vinheta e fade de entrada e saída.
- [x] Câmera ligada ao scroll: começa alta, vendo um mar de nuvens; conforme o scroll avança, desce e atravessa as camadas de nuvem, que passam por ela (parallax entre camadas). Deriva lenta contínua mesmo parado.
- [x] Narrativa: as nuvens representam a falta de clareza do Diagnóstico; no fim da seção, elas se abrem (clareia), preparando a transição para as seções seguintes.
- [x] Legibilidade: as frases clicáveis continuam 100% legíveis; nuvens mais escuras/transparentes atrás do texto.
- [x] Técnica e performance: nuvens leves (camadas de sprites/planos com textura de ruído animada no shader, ou raymarch em baixa resolução reescalado), nada de raymarch pesado em resolução cheia. Usar useNearViewport + ResilientBoundary + ContextLossWatcher como as montanhas; montar só perto da seção e desmontar fora dela, para nunca somar contextos WebGL. Mobile: versão mais leve ou quadro estático. prefers-reduced-motion: quadro estático.
- [x] NÃO mexer nas montanhas (tag montanhas-3d-aprovadas). Criar a tag "nuvens-3d-aprovadas" quando eu aprovar.
- [x] Me mostrar capturas do início, meio e fim antes de seguir.
  > Feito em 10/10 e aprovado pelo dono (tag nuvens-3d-aprovadas). graphics/CloudBackdrop.tsx (sticky, opacidade 34%, vinheta, fades) + graphics/clouds/CloudScene.tsx (R3F, um quadro em tela cheia: 6 camadas horizontais intersectadas analiticamente, fbm, sem raymarch; DPR 0,6, mobile 0,45 com 4 camadas e 3 oitavas). Progresso: seção "top 40%" → "bottom 70%"; descida até p 0,7, abertura de 0,6 a 0,95; fade de saída "bottom 70%" → "bottom 30%". Seção com overflow-clip (hidden anularia o sticky) e conteúdo em relative z-10. Conferido: sem scroll horizontal nem frase cortada em 1280/1440/1920/390 e clique real nas frases.

## Bloco 0d. Retrato: "metal líquido vira você" (pedido de 10/10)
- [x] Entrada por gatilho (~2,5 s): gota de cromo cai, espalha como mercúrio com ondas e preenche a moldura; cromo do estúdio da hero; refletividade cai e a foto aparece refratada até distorção zero; canvas desmontado no fim (foto real); assinatura depois; fallback fade sem WebGL; reduced motion com foto pronta. Tag "retrato-antes-metal" criada antes.
  > Feito em 10/10 (PortraitReveal.tsx). Aguardando aprovação do dono pelas capturas (gota caindo, espalhando, metal transparente, foto final a 100%). Observação: a moldura tem hoje o mesmo raio nos 4 cantos; o líquido lê os raios reais de cada canto, então segue qualquer formato que a moldura tiver.

## Bloco 0e. Scroll horizontal no Diagnóstico (relato de 10/10)
- [x] Investigado com barra de rolagem visível (como no Windows) em 1150, 1200, 1280, 1366, 1440, 1920 e 390px, rolando a página inteira e com o mouse na borda direita das frases: scrollWidth = clientWidth em todos, nenhum elemento além da borda. Defeito real achado: o rótulo "MARCAR" saía da tela na borda direita (fixed, então o Chrome não alarga a página, mas dependia de nenhum ancestral ter transform). Correção: cursor em portal no <body> e preso dentro da viewport; guarda extra com overflow-x: clip no wrapper do conteúdo (layout). Hero, pilares e nuvens (sticky/pin) conferidos depois.

## Bloco 0f. Seção 11b "E a inteligência artificial?" (pedido de 10/10)
- [x] Caixa de prompt com a objeção digitada (cursor piscando), título com a decodificação de A distância, 4 frases acendendo com o scroll, texto, fecho com reflexo prata em "o que não produzir" e linha final; link "IA" no menu; pt/en; reduced motion estático.
  > Feito em 10/10 (sections/Ai.tsx; decodificação extraída para components/decode.tsx e reaproveitada). Cabeçalho: com 7 links, o nome + cargo só aparece no tablet e a partir de 1400px (entre 1024 e 1399 colidia com o menu; já colidia com 6 links) e o espaçamento do menu cai para 24px entre 1024 e 1279.

## Bloco 0g. Oceano 3D na seção "E a inteligência artificial?" (mesmo estilo de montanhas e nuvens)
- [ ] Narrativa: superfície = o que a IA alcança; profundidade = experiência humana. Com o scroll, a câmera começa acima do alto-mar (ondas escuras com reflexo prata, horizonte com névoa), desce até a superfície, atravessa a linha d'água e mergulha: raios de luz (god rays) e cáusticas vindo de cima, partículas em suspensão, corais em silhueta no fundo, cardume de peixes passando e um ou dois tubarões em silhueta cruzando devagar ao longe.
- [ ] Estética: elegante e cinematográfica, NÃO game/cartoon. Paleta quase monocromática (preto, grafite, prata, com no máximo um leve tom azul-acinzentado muito escuro debaixo d'água). Opacidade baixa (~30 a 40%), vinheta e fades; texto sempre 100% legível.
- [ ] Técnica: oceano com shader de ondas (Gerstner/FFT simplificado); embaixo d'água, fog exponencial, god rays em planos aditivos, cáusticas por textura animada. Peixes como instanced mesh com boids simples; tubarões como modelos glTF leves e gratuitos (CC0, ex.: Quaternius/Poly Pizza) com animação de nado, ou silhuetas low-poly. Corais como silhuetas low-poly/instanced.
- [ ] Performance: montar só perto da seção e desmontar fora (useNearViewport + ResilientBoundary + ContextLossWatcher), DPR limitado, modelos comprimidos (Draco/meshopt), poucos tubarões, cardume instanced. Mobile: versão bem mais leve ou quadro estático. prefers-reduced-motion: quadro estático.
- [ ] Não mexer em montanhas nem nuvens (tags aprovadas). Criar tag "oceano-3d-aprovado" quando eu aprovar. Capturas do início (alto-mar), meio (linha d'água) e fim (fundo com corais e tubarão) antes de seguir.

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
  > Falta só: fallback automático para um quadro estático se o FPS cair (o resto está feito). Pausado junto com o 6b.
  > Feito em 09/10: graphics/terrain/heightmap.ts (ridged multifractal + domain warp, maciço largo no centro, grade com LOD radial, sombras de sol rasante pré-calculadas na CPU, geração ~220 ms com cache num requestIdleCallback) e terrain/MountainScene.tsx (R3F, shader grafite/prata com neve por altitude e inclinação, detalhe de normal de perto, névoa de distância e de vale com deriva). MountainBackdrop: cena montada só perto do trecho, opacidade 36%, foto como fallback, reduced motion = quadro estático. Não reaproveita o renderer da hero (canvas próprio; a hero já está fora da tela). Ainda não medido FPS em GPU real (headless usa SwiftShader); falta o fallback automático para quadro estático se o FPS cair.
- [x] Antes de seguir com o resto, me mostre capturas do início, meio e fim do trecho para eu aprovar o visual.

## Bloco 6b. Montanhas 3D mais realistas e com textura (aprovado o conceito; agora refinar)
> **PAUSADO (09/10): não mexer nas montanhas sem pedido explícito.** A versão aprovada está na tag git montanhas-3d-aprovadas. O terreno do Bloco 6 (commit 3a2a40a + estabilidade de dd19346) é a versão aprovada. Nada do 6b foi implementado. A queda para a foto foi módulo velho do HMR no navegador ("terrainSize is not a function"), não erro no código; resolve recarregando a página ou reiniciando o dev com .next/dev limpo.
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

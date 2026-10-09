# Pendências do site (lista mestra)

Leia este arquivo e o CONTEUDO-SITE.md antes de começar. Confira item por item no código, implemente o que ainda não estiver feito e marque cada item com [x] neste arquivo ao concluir. Fonte dos textos: CONTEUDO-SITE.md. Commit ao final de cada bloco.

## Bloco 1. Textos e regras
- [x] Todos os textos do CONTEUDO-SITE.md aplicados em pt (en repete pt por enquanto).
- [x] Mensagem do Breno: frase grande com "sobre si." (hoje está "sobre sim", sem ponto) e ponto final depois de "sala". Parágrafo novo começando com "É essa impressão que eu construo."
- [x] Nenhum travessão (— ou –) em texto visível, pt e en.
- [x] "Fractional Brand & Creative Director" nunca traduzido; nada de "fracionário/fracionada".
- [x] "Trabalho com poucas empresas por vez." exatamente assim.
- [x] Título dos pilares: "Vejo a marca de cima. E desço até o último detalhe."
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

## Bloco 4. Seções
- [ ] A distância: TRÊS BLOCOS SEPARADOS (como era antes), não uma cena única fixa. Cada bloco com texto à esquerda sempre legível e gráfico à direita (SVGs em public/graficos/). Cada gráfico toca sua animação sozinho em 2 a 3 s ao entrar na tela (gatilho, não scrub). Textura entre as curvas visível. Cabeçalho não pode sobrepor rótulos.
  > EM ANDAMENTO. Hoje é uma cena única fixa (pin) com 3 etapas por gatilho (src/components/sections/Distance.tsx, commit 5b03841). Falta: voltar a 3 blocos separados sem pin. O componente já tem o modo estático com os 3 blocos empilhados (sem data-mode="scene"); próximo passo: remover o pin/cena e, para cada bloco, criar um ScrollTrigger onEnter que toca a timeline daquele gráfico (~2,5 s, reaproveitar tl1/tl2/tl3, separando os estados iniciais de A, B e C; B deve começar com o estado final de A já visível). Textura entre as curvas já corrigida via CSS em globals.css.
- [x] Diagnóstico: 8 frases novas com aspas curvas, contador "x de 8", fundo preto, demonstração automática na primeira frase, hover com ✓ e cursor "Marcar", pulso sutil até a primeira interação, instrução mais visível, nenhuma frase cortada na lateral.
- [x] O que muda: sublinhado único deslizando de ANTES para DEPOIS, DEPOIS acende em prata, frase do depois com mais contraste.
- [ ] Como funciona: gota de metal líquido sticky mudando de forma por etapa (duas gotas se fundem, ondulação, estabiliza, flui, anel). ENTRADA PROFUNDA: a gota não pode surgir do nada; ela emerge da profundidade (vem de longe no eixo Z, desfocada e escura, ganhando nitidez, brilho e tamanho, como algo subindo de um líquido escuro) ou nasce de gotículas que convergem. ANIMAÇÃO CONSTANTE: mesmo parada, respira, ondula e gira devagar, com reflexos se movendo na superfície; reage levemente ao mouse.
  > EM ANDAMENTO. Feito: gota cromada sticky que muda de forma por etapa (src/components/graphics/LiquidDrop.tsx + sections/Process.tsx), pausa fora da tela, mobile leve, anel estático em reduced motion. Falta: (1) ENTRADA PROFUNDA, a gota vir do fundo no eixo Z, escura e desfocada, ganhando nitidez/brilho/tamanho (ex.: uniforms uEmerge para escala/brilho no shader + filtro blur no canvas animado pelo GSAP ao entrar), ou nascer de gotículas convergindo; (2) ANIMAÇÃO CONSTANTE, respiração e reflexos se movendo mesmo parada (hoje só gira/ondula conforme a etapa; somar respiração na escala e rotação lenta do env); (3) reação leve ao mouse (inclinar a câmera/forma).
- [ ] Trabalhos: título + subtítulo de trajetória; logos em 2 fileiras contínuas em direções opostas sem buraco; carrossel de imagens estilo landonorris.com com legenda (projeto, ano, papel); SEM lista de cases e SEM páginas /cases.
  > EM ANDAMENTO. Feito: logos em 2 fileiras opostas (sections/LogoMarquee.tsx), carrossel (sections/WorkCarousel.tsx), dados em public/trabalhos/trabalhos.json e public/logos/logos.json, subtítulo já nas mensagens (works.subtitle). Falta: (1) remover a lista de cases de sections/Works.tsx, a rota src/app/[locale]/cases/[slug]/, src/content/cases.ts, mensagens works.cases e works.casePage (pt/en) e "/cases/" de src/lib/seo/routes.ts; (2) renderizar o subtítulo abaixo do título; (3) legenda do carrossel com projeto, ano e papel: adicionar "papel" em trabalhos.json e em src/content/media.ts e exibir "Projeto, 2024, Direção criativa" (sem travessão); (4) conferir logos sem buraco no loop; (5) checar links quebrados.
- [x] Seções restantes completas: Onde o trabalho aparece, Sobre, Poucas parcerias, FAQ, Contato.

## Bloco 5. Fundo de montanhas (novo)
- [ ] Imagem de montanhas vistas de cima (foto aérea, em public/fundo/montanhas.jpg; se não existir ainda, use um placeholder escuro e deixe pronto para trocar).
  > PRONTO PARA USAR, ainda não implementado. Arquivos em public/fundo/: montanhas.webp/.jpg (desktop 3600px) e montanhas-mobile.webp/.jpg (1600px), já em P&B. Próximo passo: componente de fundo (ex.: src/components/graphics/MountainBackdrop.tsx) com next/image (sizes por breakpoint, versão mobile via <picture>/media ou dois Image com hidden md:block).
- [ ] Aparece SÓ no trecho "O que eu faço" + "O que muda" (cerca de 2 a 3 telas de scroll), atrás do conteúdo.
  > A FAZER. Envolver Pillars + Changes em src/app/[locale]/page.tsx num wrapper relative com o fundo absolute/sticky atrás (z abaixo do conteúdo). Atenção: Pillars usa pin; o fundo deve ficar fixo durante o trecho (position sticky num contêiner que cobre as duas seções).
- [ ] Tratamento: preto e branco, contraste alto, opacidade baixa (cerca de 15 a 25%), vinheta escura nas bordas e degradê para preto no início e no fim do trecho, para entrar e sair sem corte.
  > A FAZER. Opacidade ~24% (pedido mais recente), vinheta radial escura e degradê para preto no topo e no fim do trecho.
- [ ] Movimento: conforme o scroll avança pelo trecho, a imagem se aproxima devagar (escala de ~1.0 a ~1.6 com leve deslocamento), como uma câmera descendo das montanhas até o detalhe. Combina com o título "Vejo a marca de cima. E desço até o último detalhe."
  > A FAZER. Pedido mais recente: zoom de 1.0 a no máximo 1.5, mirado no pico principal (definir transform-origin no pico), via ScrollTrigger scrub sobre o wrapper do trecho.
- [ ] Performance: imagem otimizada com next/image (AVIF/WebP), versão menor no mobile, transform via GPU; prefers-reduced-motion = imagem estática.
  > A FAZER. next/image com AVIF/WebP, versão mobile, transform via GPU (will-change: transform), reduced motion = estática.

## Ao final
- [ ] Console sem erros, desktop e mobile validados, build de produção passando.
  > PARCIAL. Build de produção, lint e tsc passando em 09/10 (estado WIP). Validação completa de desktop/mobile/console fica para o fim dos blocos 4 e 5.
- [ ] Commit final e resumo do que foi feito, item por item.
- [ ] Parar e me avisar para revisão.

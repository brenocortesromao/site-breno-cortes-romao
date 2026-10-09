# Pendências do site (lista mestra)

Leia este arquivo e o CONTEUDO-SITE.md antes de começar. Confira item por item no código, implemente o que ainda não estiver feito e marque cada item com [x] neste arquivo ao concluir. Fonte dos textos: CONTEUDO-SITE.md. Commit ao final de cada bloco.

## Bloco 1. Textos e regras
- [x] Todos os textos do CONTEUDO-SITE.md aplicados em pt (en repete pt por enquanto).
- [x] Mensagem do Breno: frase grande com "sobre si." (hoje está "sobre sim", sem ponto) e ponto final depois de "sala". Parágrafo novo começando com "É essa impressão que eu construo."
- [x] Nenhum travessão (— ou –) em texto visível, pt e en.
- [x] "Fractional Brand & Creative Director" nunca traduzido; nada de "fracionário/fracionada".
- [x] "Trabalho com poucas empresas por vez." exatamente assim.
- [x] Título dos pilares: "Estratégia e execução, nas mesmas mãos." + subtítulo novo do CONTEUDO-SITE.md.
  > Feito, mas com o título mais recente pedido no chat: "O nível de direção das grandes marcas. Na medida da sua empresa." (O que muda: "O valor que já existe, finalmente visível."). Esses dois títulos ainda NÃO estão no CONTEUDO-SITE.md salvo; atualize o arquivo para ficar como fonte única.
- [ ] Título de "O que muda": "A mesma empresa. Outra percepção."
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
- [ ] A distância: TRÊS BLOCOS SEPARADOS, um abaixo do outro (como era antes), SEM pin e SEM cena única. Cada bloco: texto à esquerda sempre legível e seu gráfico à direita (SVGs em public/graficos/: A = distância, B = fechando, C = consistência). A animação de cada gráfico continua ligada ao scroll (scrub), mas curta: começa quando o bloco entra pela parte de baixo da tela e TERMINA quando o gráfico chega ao centro da tela (cerca de meia tela de scroll). Se a pessoa parar, o gráfico fica no ponto em que está; ao chegar no centro, está completo. Textura entre as curvas visível. Cabeçalho não sobrepõe rótulos.
  > A FAZER (próximo). Hoje: cena única fixa (pin) com 3 etapas por gatilho em src/components/sections/Distance.tsx. Próximo passo: remover pin/cena e usar o modo de 3 blocos empilhados que o componente já tem (sem data-mode="scene"); para cada bloco, uma timeline com scrollTrigger { trigger: bloco, start: "top bottom", end: "center center", scrub } reaproveitando as animações de tl1/tl2/tl3 (B começa com o estado final de A já visível). Textura entre as curvas já corrigida (globals.css).
- [x] Diagnóstico: 8 frases novas com aspas curvas, contador "x de 8", fundo preto, demonstração automática na primeira frase, hover com ✓ e cursor "Marcar", pulso sutil até a primeira interação, instrução mais visível, nenhuma frase cortada na lateral.
- [x] O que muda: sublinhado único deslizando de ANTES para DEPOIS, DEPOIS acende em prata, frase do depois com mais contraste.
- [ ] Como funciona: gota de metal líquido sticky mudando de forma por etapa (duas gotas se fundem, ondulação, estabiliza, flui, anel). ENTRADA PROFUNDA: a gota não pode surgir do nada; ela emerge da profundidade (vem de longe no eixo Z, desfocada e escura, ganhando nitidez, brilho e tamanho, como algo subindo de um líquido escuro) ou nasce de gotículas que convergem. ANIMAÇÃO CONSTANTE: mesmo parada, respira, ondula e gira devagar, com reflexos se movendo na superfície; reage levemente ao mouse.
  > EM ANDAMENTO. Feito: gota cromada sticky que muda de forma por etapa (src/components/graphics/LiquidDrop.tsx + sections/Process.tsx), pausa fora da tela, versão leve no mobile, anel estático com reduced motion. Falta: (1) entrada profunda (vir do fundo no eixo Z, escura e desfocada, ganhando nitidez, brilho e tamanho; ex.: uniform de "emerge" no shader + blur/escala no canvas animados ao entrar); (2) animação constante (respiração na escala e reflexos girando mesmo parada); (3) reação leve ao mouse.
- [ ] Trabalhos: título + subtítulo de trajetória; logos em 2 fileiras contínuas em direções opostas sem buraco; carrossel de imagens estilo landonorris.com com legenda (projeto, ano, papel); SEM lista de cases e SEM páginas /cases.
  > EM ANDAMENTO. Feito: logos em 2 fileiras opostas (sections/LogoMarquee.tsx), carrossel (sections/WorkCarousel.tsx), dados em public/trabalhos/ e public/logos/, subtítulo já nas mensagens (works.subtitle). Falta: (1) remover a lista de cases de sections/Works.tsx, a rota src/app/[locale]/cases/[slug]/, src/content/cases.ts, works.cases e works.casePage (pt/en) e "/cases" de src/lib/seo/routes.ts; (2) exibir o subtítulo; (3) legenda do carrossel com projeto, ano e papel (campo "papel" em trabalhos.json + src/content/media.ts, sem travessão); (4) conferir loop dos logos sem buraco; (5) checar links quebrados.
- [x] Seções restantes completas: Onde o trabalho aparece, Sobre, Poucas parcerias, FAQ, Contato.

## Bloco 5. Fundo de montanhas (novo, PRIORIDADE: fazer logo depois do Bloco 1)
- [x] Imagem JÁ PRONTA em public/fundo/: montanhas.webp/.jpg (3600px, desktop) e montanhas-mobile.webp/.jpg (1600px). Já está em preto e branco com contraste ajustado; não reprocessar a cor.
- [x] Aparece SÓ no trecho "O que eu faço" + "O que muda" (cerca de 2 a 3 telas de scroll), atrás do conteúdo.
- [x] Tratamento: preto e branco, contraste alto, opacidade baixa (cerca de 15 a 25%), vinheta escura nas bordas e degradê para preto no início e no fim do trecho, para entrar e sair sem corte.
- [x] Movimento: conforme o scroll avança pelo trecho, a imagem se aproxima devagar (escala de 1.0 a no máximo 1.5, com transform-origin no pico nevado principal (cerca de 62% x 70% da imagem) e leve deslocamento vertical, para a qualidade não cair), como uma câmera descendo das montanhas até o detalhe.
- [x] Performance: imagem otimizada com next/image (AVIF/WebP), versão menor no mobile, transform via GPU; prefers-reduced-motion = imagem estática.

## Ao final
- [ ] Console sem erros, desktop e mobile validados, build de produção passando.
  > PARCIAL. Build, lint e tsc passando em 09/10 (WIP). Validação completa de desktop, mobile e console fica para depois do Bloco 4.
- [ ] Commit final e resumo do que foi feito, item por item.
- [ ] Parar e me avisar para revisão.

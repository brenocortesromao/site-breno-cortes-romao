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
- [ ] Ordem: Hero, Mensagem, A distância, Diagnóstico, O que é fractional, O que eu faço, O que muda, Como funciona, Onde aparece, Trabalhos, Sobre, Poucas parcerias, FAQ, Contato.
- [ ] Ritmo de cores: preto na maior parte; off-white só em "O que é fractional", "Como funciona" e "Poucas parcerias"; gradiente escuro em "A distância", "O que muda", "Sobre" e "Contato".
- [ ] Curvas de nível do off-white: movimento líquido (campo de ruído animado), 3x mais lento, menos linhas e opacidade menor.

## Bloco 3. Hero, assinatura e números
- [ ] Bola da hero em prata cromada brilhante (metalness alto, roughness baixíssimo, environment de estúdio), sem reflexos em forma de parêntese, sem topo estourado.
- [ ] Assinatura: public/assinatura.svg, desenhada com o scroll, gradiente prata de cromo, sem glow difuso, reflexo de luz percorrendo o traço (restaurar o metálico aprovado; ver histórico do git).
- [ ] Números +313% e 97% (Lightcast): bold como antes, "+" e "%" no mesmo tamanho e linha de base, alinhados entre si, contagem animada, acabamento "black chrome" (preto profundo com faixas de reflexo prata) e reflexo de luz uma vez.

## Bloco 4. Seções
- [ ] A distância: TRÊS BLOCOS SEPARADOS (como era antes), não uma cena única fixa. Cada bloco com texto à esquerda sempre legível e gráfico à direita (SVGs em public/graficos/). Cada gráfico toca sua animação sozinho em 2 a 3 s ao entrar na tela (gatilho, não scrub). Textura entre as curvas visível. Cabeçalho não pode sobrepor rótulos.
- [ ] Diagnóstico: 8 frases novas com aspas curvas, contador "x de 8", fundo preto, demonstração automática na primeira frase, hover com ✓ e cursor "Marcar", pulso sutil até a primeira interação, instrução mais visível, nenhuma frase cortada na lateral.
- [ ] O que muda: sublinhado único deslizando de ANTES para DEPOIS, DEPOIS acende em prata, frase do depois com mais contraste.
- [ ] Como funciona: gota de metal líquido sticky mudando de forma por etapa (duas gotas se fundem, ondulação, estabiliza, flui, anel). ENTRADA PROFUNDA: a gota não pode surgir do nada; ela emerge da profundidade (vem de longe no eixo Z, desfocada e escura, ganhando nitidez, brilho e tamanho, como algo subindo de um líquido escuro) ou nasce de gotículas que convergem. ANIMAÇÃO CONSTANTE: mesmo parada, respira, ondula e gira devagar, com reflexos se movendo na superfície; reage levemente ao mouse.
- [ ] Trabalhos: título + subtítulo de trajetória; logos em 2 fileiras contínuas em direções opostas sem buraco; carrossel de imagens estilo landonorris.com com legenda (projeto, ano, papel); SEM lista de cases e SEM páginas /cases.
- [ ] Seções restantes completas: Onde o trabalho aparece, Sobre, Poucas parcerias, FAQ, Contato.

## Bloco 5. Fundo de montanhas (novo)
- [ ] Imagem de montanhas vistas de cima (foto aérea, em public/fundo/montanhas.jpg; se não existir ainda, use um placeholder escuro e deixe pronto para trocar).
- [ ] Aparece SÓ no trecho "O que eu faço" + "O que muda" (cerca de 2 a 3 telas de scroll), atrás do conteúdo.
- [ ] Tratamento: preto e branco, contraste alto, opacidade baixa (cerca de 15 a 25%), vinheta escura nas bordas e degradê para preto no início e no fim do trecho, para entrar e sair sem corte.
- [ ] Movimento: conforme o scroll avança pelo trecho, a imagem se aproxima devagar (escala de ~1.0 a ~1.6 com leve deslocamento), como uma câmera descendo das montanhas até o detalhe. Combina com o título "Vejo a marca de cima. E desço até o último detalhe."
- [ ] Performance: imagem otimizada com next/image (AVIF/WebP), versão menor no mobile, transform via GPU; prefers-reduced-motion = imagem estática.

## Ao final
- [ ] Console sem erros, desktop e mobile validados, build de produção passando.
- [ ] Commit final e resumo do que foi feito, item por item.
- [ ] Parar e me avisar para revisão.

# Desempenho

Etapa de desempenho e testes, 10/10. "Antes" = tag `antes-desempenho`; "depois" = tag `desempenho-ok`.
Tudo medido no build de produção (`next build` + `next start`), página `/pt`, nesta máquina (Windows 11, NVIDIA RTX 3050).

## Resumo

| | Antes | Depois | Meta |
|---|---|---|---|
| Lighthouse desktop (performance) | 74 | **76** | ≥ 85, não atingida |
| Lighthouse mobile (performance) | 50 | **55 a 56** | ≥ 70, não atingida |
| TBT desktop | 580 ms | **420 ms** | |
| TBT mobile (simulado, CPU 4x) | 4.190 ms | **1.770 ms** | |
| CLS | 0 | **0** | < 0,1, ok |
| FPS nas seções 3D (desktop) | 3 a 46 | **60 em todas** | ≥ 55, ok |
| FPS nas seções 3D (CPU 4x mais lenta) | 1 a 7 | **60 em todas** | |
| Máximo de contextos WebGL ativos (rolagem completa, ida e volta) | 3 | **2** | ≤ 2, ok |
| Cena caindo no fallback por perda de contexto | não medido | **nenhuma** nos testes | ok |
| Erros no console / scroll horizontal (4 navegadores × 5 larguras) | n/d | **0 / 0** | ok |

As metas de FPS, contextos, CLS e testes foram atingidas. As notas do Lighthouse melhoraram, mas não chegaram a 85/70. A causa principal que sobra é a inicialização da bola 3D da hero na thread principal; ver "O que falta".

## Lighthouse (laboratório, Lighthouse 13.5, perfis padrão)

| Execução | Perf | FCP | LCP | TBT | CLS | SI |
|---|---|---|---|---|---|---|
| Antes, desktop | 74 | 0,3 s | 1,0 s | 580 ms | 0 | 1,4 s |
| Antes, mobile | 50 | 1,1 s | 4,7 s | 4.190 ms | 0 | 4,7 s |
| Depois, desktop (2 execuções) | 76 / 76 | 0,3 s | 1,5 s | 430 / 420 ms | 0 | 0,9 s |
| Depois, mobile (2 execuções) | 55 / 56 | 1,1 s | 4,8 / 4,6 s | 1.780 / 1.770 ms | 0 | 3,0 / 2,9 s |
| Referência: depois **sem WebGL**, desktop | 98 | 0,3 s | 1,0 s | 100 ms | 0 | |
| Referência: depois **sem WebGL**, mobile | 69 | 1,1 s | 4,7 s | 570 ms | 0 | |

- A referência "sem WebGL" (Chrome com `--disable-3d-apis`: a hero mostra o pôster SVG da bola) isola o custo da cena 3D da hero: cerca de 330 ms de TBT no desktop e 1,2 s no mobile simulado.
- O Chrome do Lighthouse usa a GPU (o chunk do three.js é carregado nos testes). O custo é JavaScript na thread principal ao montar a cena (criação dos programas e uniforms do material físico, geometria, ambiente), não emulação de GPU.
- LCP: no mobile, o LCP OBSERVADO caiu para 391 ms (frase da hero visível já na primeira pintura). O LCP SIMULADO (4,6 s) é dominado pelo peso de JS baixado antes dele numa rede lenta simulada. No desktop o LCP subiu de 1,0 para 1,5 s porque o candidato passou a ser o texto pequeno "Role para entender" (que entra aos 0,9 s); continua abaixo de 2,5 s.
- Thread principal (mobile simulado): "Style & Layout" 5.843 → 1.536 ms; "Script Evaluation" 8.964 → cerca de 4.200 ms.

## Bundle (produção, gzip)

- HTML de `/pt`: 49 KB (340 KB sem compressão; inclui o payload RSC de 87 KB).
- JS inicial: cerca de 265 KB. Maiores: react-dom 70 KB, runtime/roteador do Next 45 + 38 KB, GSAP + ScrollTrigger + Lenis 48 KB, componentes da página 28 KB, next-intl/intl-messageformat 14 KB.
- three.js (+ R3F): 236 KB, carregado sob demanda (dynamic import) depois da hidratação, só para cenas 3D.
- Analisador: `npx next analyze --output` (grava em `.next/diagnostics/analyze`; `npx next analyze` abre a interface).

## FPS por seção (RTX 3050, Chrome, 1440 × 900, média de 3 s parado na seção)

| Seção | Antes 1x | Antes CPU 4x | Depois 1x | Depois CPU 4x |
|---|---|---|---|---|
| Hero (bola) | 46 | 7 | 60 | 60 |
| Retrato (metal líquido) | 42 | 7 | 60 | 60 |
| Nuvens (Diagnóstico) | 12 | 2 | 60 | 60 |
| Linhas líquidas (Fractional) | 6 | 1 | 60 | 60 |
| Montanhas | 4 | 1 | 60 (57 em outra execução) | 60 |
| Gota (Como funciona) | 3 | 1 | 60 | 60 |

Os dois lados foram medidos com a mesma GPU real (renderer conferido: "ANGLE (NVIDIA, RTX 3050, D3D11)"). A causa exata do FPS tão baixo "antes" não foi isolada. Ela coincide com 3 contextos renderizando ao mesmo tempo e com o recálculo de estilo da página inteira provocado pelas cores dos temas; as duas coisas foram corrigidas.

Script: `scratchpad` da sessão (CDP), injeta um contador de contextos no `getContext` e mede `requestAnimationFrame`. Teste entre navegadores: `node scripts/smoke.mjs` (no repositório).

## O que foi otimizado

1. **Cores dos temas (ThemeScroll)**: eram ~90 tweens de variáveis CSS no `<html>`; cada um lia `getComputedStyle` logo depois de outro gravar uma variável, forçando recálculo de estilo da página inteira dezenas de vezes na carga. Agora há um ScrollTrigger por troca de tema (só guarda o progresso) e uma função que interpola paletas lidas uma vez. O resultado é o mesmo visual e o mesmo comportamento, e funciona certo também em saltos e recarregando no meio. A reconstrução por remontagem só acontece se o conjunto de seções mudou, e sem `ScrollTrigger.refresh()` global.
2. **Entrada da hero em CSS** (`heroReveal`/`heroFade` no globals.css): mesmos valores da versão GSAP, mas roda na primeira pintura, sem esperar a hidratação. O fill é `backwards`, então nada fica preso para a saída por scroll.
3. **Hidratação por seção**: cada seção depois da hero está no próprio `<Suspense>`. O React 19 hidrata em partes e cede a vez ao navegador.
4. **Shaders da bola compilados em paralelo** (`renderer.compileAsync`, `KHR_parallel_shader_compile`). O canvas fica em `frameloop="never"` até lá, e o pôster cobre a bola. Isso tirou a compilação síncrona do primeiro quadro (~420 ms na GPU real agora acontecem fora da thread principal).
5. **Terreno das montanhas num Web Worker** (`terrain.worker.ts`): mesma função e mesmo resultado, fora da thread principal.
6. **Qualidade adaptativa** (`src/lib/quality.ts`):
   - nível detectado (`none`/`low`/`medium`/`high`): `none` = sem WebGL2 ou renderizador por software (SwiftShader, llvmpipe, etc.), que usa os fallbacks estáticos;
   - presets de DPR máximo (2/1,5/1) e geometria leve no `low`; o `high` é exatamente o visual aprovado;
   - monitor de FPS em tempo real: abaixo de ~50 fps por 3 s seguidos, desce um nível (ignora a carga, a aba em segundo plano e picos). **Revisto em 12/10** (ver "Monitor de qualidade por cena").
7. **Orçamento de contextos WebGL**: no máximo 2 ativos (`useWebglSlot`). Ganham as cenas mais perto da tela; as outras desmontam e liberam o contexto. Isso substituiu o `useNearViewport` (removido).
8. **Pausa**: as cenas param fora da tela (IntersectionObserver / `frameloop`) e o `requestAnimationFrame` para sozinho com a aba em segundo plano.
9. **Cena 3D dos números descartada a pedido** (voltou ao HTML): menos um contexto e menos JS.
10. **Imagens**: `next/image` com AVIF/WebP (já configurado), lazy fora da primeira tela; fontes via `next/font` (swap); CLS 0.

## Monitor de qualidade por cena (12/10)

**Problema:** as curvas líquidas pararam de reagir ao mouse. O monitor de FPS media a página inteira e rebaixava o nível GLOBAL sempre que havia qualquer cena montada. Rolando o site de cima a baixo (desktop, RTX 3050), ele disparou "[qualidade] FPS baixo" duas vezes: `high → medium` com "A distância" na tela (sem cena WebGL ali, só o FlowField 2D) e `medium → low` no oceano da IA. Nenhuma das cenas novas (floresta aérea, espaço) disparou. A causa eram os engasgos de ROLAGEM do DOM (medidos antes: iguais com e sem as cenas 3D), que rebaixavam todas as cenas para sempre; no "low" as curvas (modo leve) não registravam o `pointermove`.

**O que mudou:**
- `LiquidContours`: ondulações do cursor sempre que há mouse (`(hover: hover) and (pointer: fine)`), também no modo leve (são só uniforms). No toque, continuam desligadas.
- `lib/quality.ts`: o nível agora é **por cena** (`useSceneTier(nome, ref, montada)`; substitui `useTier` + `useSceneMonitor` nas 8 cenas). Cada janela de 1 s é atribuída à cena com mais área visível; **janelas com rolagem são ignoradas** (engasgo de rolagem não é custo da cena); 3 janelas seguidas abaixo de ~50 fps rebaixam só aquela cena; depois de ~10 s estáveis acima de 55 fps ela volta a subir um nível; se cair de novo depois de subir, fica travada no nível menor (sem oscilar). O console diz qual cena: `[qualidade] FPS baixo em "oceano": nível high → medium`.
- Espaço (Contato): sem alocação por quadro (alvo da câmera e deriva orbital reaproveitam vetores), luzes estáticas com a matriz congelada, partículas dos anéis 7.000 → 5.500 (mistura aditiva: sem diferença visível). DPR já limitado a 1,5.

**Medido depois:** rolagem do site inteiro (desktop, GPU real): **nenhum "[qualidade]" no console**. Parado 12 s em cada cena: hero, nuvens, curvas (Fractional), montanhas, gota, floresta, oceano, curvas (Parcerias) e espaço a **60 fps**, sem rebaixar. Curvas: a imagem muda mais com o mouse passando do que só com o tempo (Fractional 2,96 contra 2,25; Parcerias 1,68 contra 1,03, diferença média de pixels), ou seja, as ondulações respondem.

**Floresta do Sobre (densa, 12/10):** ~4.600 árvores sem pesar: chunks de 60 m com culling por grupo, árvores 3D só perto da câmera e impostores (cartões com textura da árvore) no resto, sombras 1024 só perto do urso, mapa de sombra estático, matrizes congeladas, montagem em pedaços (sem tarefa longa). Medido (desktop, GPU real): 60 fps parado no fim da descida, máximo 2 contextos, nenhum "[qualidade]" na rolagem do site inteiro; com e sem a floresta o fps parado é o mesmo.

**Engasgos de rolagem do DOM (continuam):** nas rolagens de "A distância", do Sobre e na entrada do Contato há quadros longos que já existiam antes das cenas (A/B com cada cena bloqueada: mesmo resultado). Não derrubam mais a qualidade das cenas; a causa (provável: trabalho de ScrollTrigger/estilos nessas seções) ainda não foi investigada.

## Testes

- `node scripts/smoke.mjs` (Playwright): Chromium, Edge, Firefox e WebKit em 1920, 1440, 1280, 1024 e 390 px. Rola a página inteira: **0 erros de console, 0 px de scroll horizontal** em todos; prefers-reduced-motion: título da hero estático e visível nos 4.
- Rolagem completa ida e volta com contador de contextos: máximo 2 ativos (antes 3); 14 contextos criados e liberados ao longo do caminho.
- lint, TypeScript e build de produção passando.

## O que falta (decisões para o dono)

1. **Metas do Lighthouse (85 desktop / 70 mobile)**: o maior custo restante é montar a bola 3D da hero logo na carga (~330 ms de TBT no desktop, ~1,2 s no mobile simulado). Opções, todas com alguma mudança de comportamento visual, por isso não foram feitas sem aprovação:
   - a) iniciar o 3D da bola só na primeira interação (mouse, toque, rolagem) ou após alguns segundos ociosos; até lá fica o pôster SVG, que é a mesma bola parada (a "respiração" começa um pouco depois);
   - b) no mobile, manter o pôster com uma animação CSS leve de respiração e só montar o 3D no toque;
   - c) aceitar as notas atuais: no hardware real a página roda a 60 fps e o LCP observado é < 0,5 s.
2. Inicializar as animações de scroll (GSAP) de cada seção só perto dela, em vez de todas na carga: ~55 ms reais de `getComputedStyle` hoje.
3. Medir vazamento de memória com várias idas e voltas (heap): os contextos são liberados (verificado pelo contador), mas o heap não foi medido formalmente.
4. Medir INP e tarefas longas durante a rolagem (só o TBT da carga foi medido).
5. Conferir dependências não usadas com uma ferramenta (o código morto conhecido já foi removido: `useNearViewport`, cena 3D dos números).

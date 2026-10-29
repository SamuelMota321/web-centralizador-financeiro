---
name: Coinciente
description: Clareza para cuidar do que é seu.
colors:
  background: "#f6f7f7"
  surface: "#ffffff"
  sunken: "#eff1f1"
  line: "#e2e5e5"
  line-strong: "#c9cfce"
  input-border: "#808a87"
  foreground: "#0f1413"
  text-secondary: "#434d4a"
  text-tertiary: "#5f6966"
  signal: "#087a55"
  signal-hover: "#056746"
  on-signal: "#ffffff"
  positive: "#087a55"
  negative: "#b5473f"
  warning: "#9a5d0f"
  info: "#2b6f89"
  brand-confianca: "#10251f"
  dark-background: "#0a0c0c"
  dark-surface: "#101313"
  dark-sunken: "#0d1010"
  dark-raised: "#161a1a"
  dark-line: "#232828"
  dark-line-strong: "#323939"
  dark-input-border: "#5e6865"
  dark-foreground: "#e9edec"
  dark-text-secondary: "#aab3b0"
  dark-text-tertiary: "#87918e"
  dark-signal: "#55d6a4"
  dark-signal-hover: "#7ce8bd"
  dark-on-signal: "#07140f"
  dark-negative: "#ff9188"
  dark-warning: "#f3b866"
  dark-info: "#75c4df"
typography:
  page-title:
    fontFamily: "Manrope, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.015em"
  panel-title:
    fontFamily: "Manrope, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: 1.35
  dialog-title:
    fontFamily: "Manrope, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.3
  body:
    fontFamily: "Manrope, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: 1.5
  body-small:
    fontFamily: "Manrope, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 500
    lineHeight: 1.45
  meta:
    fontFamily: "Manrope, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.4
    fontFeature: "tabular-nums"
  label:
    fontFamily: "Manrope, system-ui, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 650
    lineHeight: 1.3
    letterSpacing: "0.06em"
    textTransform: "uppercase"
  amount:
    fontFamily: "Manrope, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 650
    lineHeight: 1.3
    fontFeature: "tabular-nums"
  figure:
    fontFamily: "Manrope, system-ui, sans-serif"
    fontSize: "1.75rem"
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: "-0.02em"
    fontFeature: "tabular-nums"
  display:
    fontFamily: "Newsreader, Georgia, serif"
    fontSize: "clamp(2.75rem, 5.4vw, 4.25rem)"
    fontWeight: 400
    lineHeight: 1.02
    letterSpacing: "-0.035em"
rounded:
  marker: "1px"
  skeleton: "4px"
  control: "6px"
  panel: "8px"
  overlay: "12px"
  avatar: "999px"
spacing:
  space-1: "4px"
  space-2: "8px"
  space-3: "12px"
  space-4: "16px"
  space-5: "20px"
  space-6: "24px"
  space-8: "32px"
  space-10: "40px"
  space-12: "48px"
components:
  button-primary:
    backgroundColor: "{colors.signal}"
    textColor: "{colors.on-signal}"
    rounded: "{rounded.control}"
    padding: "0 12px"
    height: "32px"
  button-primary-hover:
    backgroundColor: "{colors.signal-hover}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.foreground}"
    borderColor: "{colors.line-strong}"
    rounded: "{rounded.control}"
    padding: "0 12px"
    height: "32px"
  button-danger:
    backgroundColor: "{colors.negative}"
    textColor: "{colors.on-signal}"
    rounded: "{rounded.control}"
    padding: "0 12px"
    height: "32px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.foreground}"
    borderColor: "{colors.input-border}"
    rounded: "{rounded.control}"
    padding: "0 10px"
    height: "32px"
  panel:
    backgroundColor: "{colors.surface}"
    borderColor: "{colors.line}"
    rounded: "{rounded.panel}"
  table-row:
    height: "40px"
    borderColor: "{colors.line}"
  nav:
    backgroundColor: "{colors.sunken}"
    width: "232px"
  nav-item-active:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.foreground}"
    indicator: "2px {colors.signal}"
    rounded: "{rounded.control}"
    height: "32px"
  marker:
    size: "6px"
    rounded: "{rounded.marker}"
    textColor: "{colors.text-secondary}"
---

# Coinciente — sistema visual do app web

> **Versão 2.0 aprovada; o código ainda segue a 1.x até a fase de aplicação.** Enquanto a aplicação não acontecer, `globals.css` e os módulos CSS continuam com a paleta esverdeada, a lateral em Confiança e as etiquetas em pílula. Telas novas devem nascer na 2.0.

Fonte de verdade: Style Guide 2.0 (`documentacao-centralizador-financeiro/docs/design/style-guide.html`). Este arquivo traduz o guia para a interface de produto; quando divergir do guia, o guia vence e este arquivo é corrigido. A divergência anterior (lateral em Confiança) foi encerrada na 2.0: a estrutura é neutra.

## Overview

Direção "Instrumento de precisão". A interface é uma ferramenta de leitura de dados financeiros: neutros frios, grade de 4px, linhas finas de 1px, tabelas alinhadas e números tabulares. A marca aparece no símbolo, no verde usado como **sinal** e na Newsreader da página inicial — nunca competindo com os dados. Densa e legível, nunca apressada. Nada que lembre banco, promessa de rendimento, estética de criptomoeda ou kit de dashboard (grade de cartões de KPI, roscas, pílulas em toda linha).

Referências de princípio, não de layout: Linear (estrutura neutra, densidade, navegação previsível), Mercury (número como dado mais forte, sobriedade) e instrumentos de medição (rótulo técnico, legenda junto da leitura).

## Estrutura e navegação

Três arranjos, pela largura:

| Largura | Estrutura |
| --- | --- |
| ≥ 64rem | Lateral de 232px em `sunken`, separada do conteúdo por uma linha: assinatura, atalho **Registrar movimentação** (botão primário), grupos com rótulo em caixa alta ("Registros", "Organização"), conta no pé. |
| 40–64rem | Trilho de 72px: símbolo, atalho só com ícone, itens só com ícone e rótulo acessível, grupos separados por linha, conta como avatar. |
| < 40rem | Barra superior sólida em `surface` com linha inferior (assinatura, atalho, avatar) e barra de abas inferior com os quatro destinos; a aba atual tem uma linha `signal` de 2px no topo. |

- Item atual: fundo `surface`, linha interna de 1px, texto `foreground` e barra `signal` de 2px à esquerda. Nunca um bloco de cor.
- Cabeçalho da página: caminho curto ("Registros / Movimentações") em `meta`, título em `page-title` e a ação primária à direita.
- Conta: menu único com nome, aviso de dados fictícios e **Sair**.
- O atalho global abre o registro sem refazer a página quando já se está em Movimentações; no celular, some nessa tela porque o cabeçalho já tem a mesma ação.

## Colors

Neutros frios carregam toda a interface; o verde é sinal, não superfície.

- **Sinal (`signal`)** só em: ação primária, foco, item selecionado, marcador de estado positivo e sinal "+" de entradas. Saídas ficam na cor do texto com "−".
- Estados semânticos `positive`, `negative`, `warning`, `info` aparecem como **marcador** (quadrado de 6px) ou ícone, sempre com texto.
- `brand-confianca` fica fora da interface: só em ativos de marca (assinatura em fundo institucional, materiais).
- Tema escuro quase preto e neutro, sem tom esverdeado; a lateral usa `dark-sunken`, um degrau abaixo do fundo do conteúdo.
- Sem gradientes e sem sombras tingidas.
- Contrastes medidos (WCAG 2.2): texto 18,6:1; secundário 8,7:1; terciário ≥ 5,0:1 em fundo, superfície e rebaixado; `signal` ≥ 4,7:1 (claro) e ≥ 9,6:1 (escuro); `negative` ≥ 4,7:1; `warning` ≥ 4,69:1 (ajustado de #A86512, que dava 4,31:1 sobre o fundo); `info` ≥ 4,96:1; borda de campo ≥ 3,14:1 (claro) e ≥ 3,04:1 (escuro); texto sobre `signal` 5,35:1 (claro) e 10,3:1 (escuro).

## Typography

- **Manrope** carrega toda a interface, inclusive os números grandes. Escala em rem: 0,6875 (`label`), 0,75 (`meta`), 0,8125, 0,875 (`body`), 1 (`panel-title`), 1,125 (`dialog-title`), 1,5 (`page-title`), 1,75 (`figure`).
- **Newsreader** só na página inicial (título fluido) e em materiais de marca. Nunca em números, rótulos, botões, listas ou dashboard.
- Todo número usa `tabular-nums`; valores em lista ficam alinhados à direita. O valor da linha usa `amount` (0,875rem/650).
- Rótulos de coluna, de grupo da navegação e de faixa de números usam `label`: 0,6875rem, 650, caixa alta, +0,06em.
- Proveniência e contexto usam `meta`: 0,75rem tabular em `text-tertiary`.

## Layout

- Grade de 4px e ritmo de 8px. Conteúdo com largura máxima de 72rem; respiro de 32px (desktop), 24px (tablet) e 16px (celular).
- **Listas são tabelas:** cabeçalho de colunas em `label`, linhas de 40px (48px no toque), divisórias de 1px, valores à direita. Nunca um cartão por item.
- **Faixa de números** no lugar de cartões de KPI: até 4 valores em `figure`, separados por linhas verticais de 1px, cada um com `label` acima e uma linha de metadados abaixo.
- Histórico de movimentações agrupado por dia, com o cabeçalho do dia em `sunken`, preso ao topo ao rolar ("Hoje · 10/09"). Sem totais por dia: saldos pertencem ao dashboard.
- Formulários de criação abrem em painel na própria página pela ação do cabeçalho (`?nova=1` e `?registrar=1` continuam funcionando). Lista vazia abre o painel sozinha.
- Gráficos (dashboard, Sprint 5): linha de 1,5px em `foreground` com pontos, grade tracejada em `line`, último ponto em `signal`; alocação como barra 100% estática com tabela ao lado. Sem área preenchida, sem rosca.

## Elevation & Depth

- Elevação por linha: painéis e tabelas usam borda `line` de 1px e nenhuma sombra.
- Só o que fica de fato por cima tem sombra: menu, diálogo e toast, com sombra neutra (preta em baixa opacidade, sem tingimento).
- Barra superior do celular: sólida em `surface`, com linha inferior; sem translucidez.

## Shapes

1px no marcador; 4px no esqueleto; 6px em controles e itens de navegação; 8px em painéis, tabelas e menus; 12px em diálogos e sobreposições; círculo só no avatar. Sem pílulas.

## Motion

Critério (emil-design-eng): anima só o que acontece de vez em quando e ganha sentido com o movimento. Nada que se repete dezenas de vezes por dia se move.

| Momento | Movimento | Por quê |
| --- | --- | --- |
| Botões | escala 0,97 ao pressionar, 120ms | resposta imediata |
| Painel de criação e painéis de linha | opacidade + 6px a partir do topo, 240ms; sai em 120ms | de onde veio |
| Página (lateral e abas) | crossfade do conteúdo, 180ms; estrutura parada | o conteúdo trocou, o lugar não |
| Bloco recolhível | altura e opacidade, 240ms (onde há suporte); fecha em 120ms | revela a explicação no lugar |
| Menu de ações | escala 0,96 → 1 a partir do gatilho, 160ms; sai mais rápido | ancorado no gatilho |
| Diálogo | centralizado, escala 0,96, 240ms; no celular, folha inferior com curva de gaveta | foco protegido |
| Toast | entra e sai pela mesma borda (Sonner) | continuidade espacial |
| Controle segmentado | indicador desliza, 240ms ease-in-out | de onde para onde a escolha mudou |
| Linha recém-criada | tinta verde que se dissolve em 1,6s | causa e efeito |
| Passo concluído (primeiros passos) | marca assenta com escala 0,8 → 1 | momento raro |

Não se movem: hover de linhas (só cor), valores. Navegação entre páginas: só crossfade de 180ms, disparado apenas pelos links da lateral e das abas (tipo `nav`), com a estrutura parada (ADR-002 em `documentacao-centralizador-financeiro/docs/arquitetura/`). Curvas: `--ease-out: cubic-bezier(0.23, 1, 0.32, 1)`, `--ease-in-out: cubic-bezier(0.77, 0, 0.175, 1)`, `--ease-drawer: cubic-bezier(0.32, 0.72, 0, 1)`. Hover só com `(hover: hover) and (pointer: fine)`. Com `prefers-reduced-motion`, sai o deslocamento e ficam as mudanças de opacidade e cor; a regra global preserva também `text-decoration-color` e `outline-color`, e o painel `.reveal`, o menu e o bloco recolhível declaram a própria lista para sair só por opacidade.

Tokens de movimento (Style Guide 2.0, seção Movimento), declarados em `globals.css`. `--duration-fast`, `--duration` e `--duration-slow` ficam como apelidos para código de outras branches; código novo usa só os nomes abaixo. Exceções contínuas fora da escala: spinner (700ms) e brilho do esqueleto (1,4s).

| Token | Valor | Uso no web |
| --- | --- | --- |
| `--motion-feedback` | 120ms | escala ao pressionar; saída de painéis e menus |
| `--motion-hover` | 180ms | cor e fundo no hover e em estados alternados; crossfade de página |
| `--motion-popover` | 160ms | entrada do menu de ações; saída do diálogo |
| `--motion-reveal` | 240ms | painéis, diálogo, controle segmentado, bloco recolhível |
| `--motion-settle` | 320ms | passo concluído dos primeiros passos |
| `--motion-intro` | 600ms | entrada da prévia na página inicial |
| `--motion-arrival` | 1600ms | tinta da linha recém-criada |

## Components

- **Botões:** primário (`signal`), secundário (contorno `line-strong`), perigo, fantasma e só ícone. 32px no desktop, 44px no toque; o variante link tem no mínimo 24px (WCAG 2.5.8). Estados: hover, pressionado, foco visível (anel `signal` de 2px com afastamento de 2px), desabilitado (0,55) e enviando (indicador + gerúndio, com `aria-busy`).
- **Campos:** 32px, borda `input-border`, rótulo acima em `body-small`/600, ajuda abaixo em `meta`, erro por `aria-describedby`; valor com prefixo "R$" visual e alinhado à direita; datas em texto DD/MM/AAAA com máscara, nunca o seletor nativo.
- **Marcador** (substitui a etiqueta em pílula): quadrado de 6px com raio de 1px + texto em `body-small`/600 `text-secondary`, sem fundo. Tons: `signal`, `warning`, `negative`, `info`, neutro (`text-tertiary`). A cor nunca aparece sozinha.
- **Linha de metadados:** `meta` logo abaixo do dado que qualifica, no formato `Origem · ref. DD/MM HH:MM · Conta`. É a forma padrão de mostrar proveniência.
- **Faixa de números:** ver Layout. Cada valor tem `label`, `figure` e linha de metadados ou marcador.
- **Tabela:** ver Layout. Coluna de valor sempre à direita e tabular; entradas com "+" em `signal`, saídas com "−" em `foreground`.
- **Controle segmentado:** opções de mesmo peso em 32px, indicador `surface` com linha de 1px que desliza sobre fundo `sunken`.
- **Menu de ações** (Base UI Menu): uma ação comum visível na linha e "Mais ações" com as demais; destrutivas por último, separadas e em `negative`. Teclado completo, com anel de foco próprio no item destacado por teclado (`highlightItemOnHover=false`).
- **Diálogo de confirmação** (Base UI AlertDialog): só para ações definitivas. Foco inicial em "Cancelar"; não fecha durante o envio; erro exibido dentro dele.
- **Toast** (Sonner): confirmação transitória de sucesso, em `surface` com linha e marcador. Erros ficam fixos, perto de onde aconteceram.
- **Carimbo do dado** (planejado, F6; depende do contrato HU-008/HU-009 — hoje só a conta tem origem e data de referência): linha de metadados com origem e referência + marcador de frescor (atualizado, desatualizado, indisponível). O prazo de "desatualizado" vem do contrato de cada história.
- **Estado de sincronização** (planejado, F6; depende do contrato HU-008): marcador + texto para aguardando, sincronizando, concluída e falhou com caminho de recuperação; o último dado válido continua visível. Só opacidade e ícone mudam; nenhum número se anima.
- **Bloco recolhível:** explicações permanentes (como as regras funcionam), com linha de 1px e rótulo em `body-small`/600; aberto quando a lista está vazia.
- **Primeiros passos:** conta → movimentação → categoria, como lista numerada com marcador; o próximo passo leva o botão primário. Some quando os três estão feitos.
- **Paginação:** 20 itens por página; "1–20 de 214" em `meta` à esquerda, Anterior/Próxima e números à direita. No celular, só Anterior, "6 de 12" e Próxima.
- **Estado vazio, aviso e esqueleto:** vazio com ícone de linha, frase e ação; aviso com ícone, texto e borda à esquerda no tom do estado; esqueleto com a forma da tabela final.
- **Ícones:** SVG próprios, traço de 1,5px, 16px em linha e 20px na navegação, significado literal; sempre com rótulo visível ou acessível.

## Do's and Don'ts

- Faça: mostrar período, fonte e data de referência como linha de metadados; comparar valores em tabelas alinhadas; reservar o verde para ação, seleção, foco e "+"; uma ação primária por tela; nomear a ação em cada botão; dizer o problema e a recuperação em cada erro.
- Evite: promessas de rentabilidade; gradientes e fundos verdes; grades de cartões de KPI, roscas e pílulas; sombras em conteúdo; Newsreader em dados; esconder indisponibilidade ou defasagem; cor como único indicador; movimento decorativo em ações frequentes.

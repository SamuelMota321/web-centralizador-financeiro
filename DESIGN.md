---
name: Coinciente
description: Clareza para cuidar do que é seu.
colors:
  confianca: "#10251f"
  consciencia: "#087a55"
  clareza: "#55d6a4"
  respiro: "#f2f6f4"
  background: "#f2f6f4"
  surface: "#ffffff"
  surface-soft: "#f7faf8"
  foreground: "#14231e"
  body-text: "#354a42"
  muted: "#60736b"
  line: "rgba(53, 74, 66, 0.14)"
  input-border: "#7a8f86"
  primary: "#087a55"
  primary-hover: "#056746"
  on-primary: "#ffffff"
  positive: "#087a55"
  negative: "#b5473f"
  warning: "#a86512"
  info: "#2b6f89"
  dark-background: "#0c1714"
  dark-surface: "#13231e"
  dark-surface-soft: "#192c26"
  dark-foreground: "#edf6f2"
  dark-body-text: "#d0dfd8"
  dark-muted: "#a6b9b0"
  dark-line: "rgba(196, 222, 211, 0.14)"
  dark-input-border: "#5f7a70"
  dark-primary: "#55d6a4"
  dark-primary-hover: "#7ce8bd"
  dark-on-primary: "#07140f"
  dark-negative: "#ff9188"
  dark-warning: "#f3b866"
  dark-info: "#75c4df"
typography:
  page-title:
    fontFamily: "Manrope, system-ui, sans-serif"
    fontSize: "1.75rem"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "-0.025em"
  panel-title:
    fontFamily: "Manrope, system-ui, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 700
    lineHeight: 1.3
  dialog-title:
    fontFamily: "Manrope, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 700
    lineHeight: 1.3
  section-title:
    fontFamily: "Manrope, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 700
    lineHeight: 1.3
  body:
    fontFamily: "Manrope, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 500
    lineHeight: 1.55
  body-small:
    fontFamily: "Manrope, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: 1.5
  lead:
    fontFamily: "Manrope, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 500
    lineHeight: 1.6
  nav-rail:
    fontFamily: "Manrope, system-ui, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 650
    lineHeight: 1.3
  micro:
    fontFamily: "Manrope, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 650
    lineHeight: 1.5
  label:
    fontFamily: "Manrope, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 650
    lineHeight: 1.3
  caption:
    fontFamily: "Manrope, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 500
    lineHeight: 1.4
  amount:
    fontFamily: "Manrope, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 750
    lineHeight: 1.3
  display:
    fontFamily: "Newsreader, Georgia, serif"
    fontSize: "clamp(2.75rem, 5.4vw, 4.25rem)"
    fontWeight: 400
    lineHeight: 1.02
    letterSpacing: "-0.035em"
rounded:
  indicator: "3px"
  control: "9px"
  panel: "13px"
  frame: "20px"
  skeleton: "6px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  2xl: "32px"
  3xl: "40px"
  4xl: "48px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.control}"
    padding: "10px 16px"
    height: "40px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.control}"
    padding: "10px 16px"
    height: "40px"
  button-danger:
    backgroundColor: "{colors.negative}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.control}"
    padding: "10px 16px"
    height: "40px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.control}"
    padding: "9px 12px"
    height: "40px"
  panel:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.panel}"
    padding: "20px"
  nav-item-active:
    backgroundColor: "rgba(85, 214, 164, 0.12)"
    textColor: "#edf6f2"
    rounded: "{rounded.control}"
    padding: "9px 12px"
  nav-shortcut:
    backgroundColor: "{colors.clareza}"
    textColor: "#07140f"
    rounded: "{rounded.control}"
    height: "42px"
  status-chip:
    textColor: "{colors.body-text}"
    rounded: "{rounded.pill}"
    padding: "2px 8px"
---

# Coinciente — sistema visual do app web

Fonte de verdade: Style Guide 1.0 (`documentacao-centralizador-financeiro/style-guide.html` e `assets/styles.css`). Este arquivo traduz o guia para a interface de produto; quando divergir do guia, o guia vence e este arquivo é corrigido. Divergência deliberada, aprovada na reformulação da interface: a navegação lateral usa o fundo Confiança (o guia mostra a lateral clara), para dar à estrutura o peso institucional da marca.

## Overview

Interface de produto (modo "Operate"): o usuário está em uma tarefa curta e recorrente. Segura sem ser distante, clara por camadas e tranquila. A marca vive na estrutura e nos detalhes precisos (lateral em Confiança, símbolo, verde de ação, tipografia editorial só na entrada) e nunca compete com os dados. Moderadamente densa, nunca apressada. Nada que lembre banco, promessa de rendimento ou estética de criptomoeda.

Referências de princípio, não de layout: Linear (navegação previsível, ação global sempre à mão), Mercury (sobriedade financeira, valor como dado mais forte) e Stripe Dashboard (listas densas, estados explícitos).

## Estrutura e navegação

Três arranjos, pela largura:

| Largura | Estrutura |
| --- | --- |
| ≥ 64rem | Lateral de 248px em Confiança: assinatura, atalho **Registrar movimentação** (Clareza), grupos "Registros" (Movimentações, Contas) e "Organização" (Categorias, Regras), conta no pé. |
| 40–64rem | Trilho de 112px: símbolo, atalho só com ícone, itens com ícone e rótulo curto, grupos separados por linha, conta como avatar. |
| < 40rem | Barra superior translúcida (assinatura, atalho, avatar) e barra de abas inferior com os quatro destinos; a sombra da barra aparece só quando o conteúdo rola por baixo. |

- Item atual: fundo Clareza a 12%, texto claro, ícone Clareza e barra de 3px à esquerda. Nunca só cor de fundo.
- Conta: menu único com nome, aviso de dados fictícios e **Sair**.
- Sem breadcrumbs: a hierarquia tem um nível só. Cada página responde onde estou (item atual + título), o que faço (uma ação primária no cabeçalho) e o próximo passo (primeiros passos, estados vazios com ação).
- O atalho global abre o registro sem refazer a página quando já se está em Movimentações; no celular, some nessa tela porque o cabeçalho já tem a mesma ação.

## Colors

Restrained: neutros esverdeados carregam o conteúdo; o verde Consciência aparece só em ação primária, seleção atual e indicadores de estado. Confiança sustenta a estrutura; Clareza marca o que está ativo sobre ela.

- Positivo e negativo só significam algo junto de texto, sinal ou ícone. Valores de entrada usam o verde apenas como reforço do sinal "+"; saídas ficam na cor do texto.
- Estados semânticos: `positive`, `negative`, `warning`, `info`. Cada aviso leva ícone e texto.
- Tema escuro não é preto: preserva temperatura e hierarquia; a lateral fica mais funda que o fundo (`#081310`) para a estrutura continuar separada.
- Contrastes medidos: texto secundário 4,63:1 sobre o fundo claro e 7,9:1 no escuro; verde de ação 5,35:1 sobre branco; borda de campo 3,44:1 (claro) e 3,5:1 (escuro). Na lateral Confiança: texto 14,6:1, texto secundário 7,8:1, Clareza 8,8:1, texto do atalho sobre Clareza 10,3:1.

## Typography

- **Manrope** carrega toda a interface. Escala fixa em rem: 0,6875 (rótulo do trilho), 0,75, 0,8125, 0,875, 0,9375 (corpo), 1, 1,0625, 1,125 (título de diálogo), 1,75 (título de página).
- **Newsreader** só na entrada do produto (título fluido da página inicial) e, no futuro, valores de patrimônio no dashboard. Nunca em rótulos, botões ou dados de lista.
- Tracking por tamanho: títulos grandes negativos (-0,025em a -0,035em), corpo em 0.
- Números comparados em coluna usam `tabular-nums`; o valor da linha é o dado mais forte (1rem, 750).

## Layout

- Conteúdo com largura máxima de 70rem, centralizado; respiro de 48px (desktop), 32px (tablet) e 16px (celular).
- Cabeçalho de página: título + contexto à esquerda, ação primária à direita, alinhados pela base.
- Listas em um único painel com divisórias entre linhas e cabeçalho de colunas no desktop; empilhadas no celular. Nunca um cartão por item.
- Histórico de movimentações agrupado por dia, com o dia preso ao topo ao rolar ("Hoje", "Ontem" ou a data por extenso). Sem totais por dia: saldos pertencem ao dashboard.
- Formulários de criação abrem em painel na própria página, sem ida ao servidor, pela ação do cabeçalho (`?nova=1` e `?registrar=1` continuam funcionando como link direto). Lista vazia abre o painel sozinha.

## Elevation & Depth

- Painéis e listas: borda `line` de 1px e sombra mínima `shadow-raised`.
- Sobreposições (menu, diálogo, toast): `shadow-overlay`, tingida com a cor da marca.
- Barra superior do celular: material translúcido com desfoque; `prefers-reduced-transparency` a torna sólida.

## Shapes

3px no indicador do item atual; 9px em controles; 13px em painéis, listas, menus e controle segmentado; 20px em diálogos e molduras grandes; pílula só em etiquetas de status.

## Motion

Critério (emil-design-eng): anima só o que acontece de vez em quando e ganha sentido com o movimento. Nada que se repete dezenas de vezes por dia se move.

| Momento | Movimento | Por quê |
| --- | --- | --- |
| Botões | escala 0,97 ao pressionar, 120ms | resposta imediata |
| Painel de criação e painéis de linha | opacidade + 6px a partir do topo, 240ms; sai em 120ms | de onde veio |
| Menu de ações | escala 0,96 → 1 a partir do gatilho, 160ms; sai mais rápido | ancorado no gatilho |
| Diálogo | centralizado, escala 0,96, 240ms; no celular, folha inferior com curva de gaveta | foco protegido |
| Toast | entra e sai pela mesma borda (Sonner) | continuidade espacial |
| Controle segmentado | indicador desliza, 240ms ease-in-out | de onde para onde a escolha mudou |
| Linha recém-criada | tinta verde que se dissolve em 1,6s | causa e efeito |
| Passo concluído (primeiros passos) | marca assenta com escala 0,8 → 1 | momento raro |

Não se movem: navegação entre páginas, hover de linhas (só cor), valores. Curvas: `--ease-out: cubic-bezier(0.23, 1, 0.32, 1)`, `--ease-in-out: cubic-bezier(0.77, 0, 0.175, 1)`, `--ease-drawer: cubic-bezier(0.32, 0.72, 0, 1)`. Hover só com `(hover: hover) and (pointer: fine)`. Com `prefers-reduced-motion`, sai o deslocamento e ficam as mudanças de opacidade e cor.

## Components

- **Botões:** primário, secundário, perigo, fantasma, link e só ícone (36px; 44px em toque). Estados: hover, pressionado, foco visível (anel de 2px), desabilitado (0,55) e enviando (indicador + gerúndio, com `aria-busy`).
- **Campos:** rótulo acima, ajuda abaixo, erro por `aria-describedby`; valor com prefixo "R$" visual; datas em texto DD/MM/AAAA com máscara, nunca o seletor nativo.
- **Controle segmentado:** opções de mesmo peso com indicador deslizante.
- **Menu de ações** (Base UI Menu): uma ação comum visível na linha e "Mais ações" com as demais; destrutivas por último, separadas e em `negative`. Teclado completo.
- **Diálogo de confirmação** (Base UI AlertDialog): só para ações definitivas (desativar conta, arquivar categoria, remover regra). Foco inicial em "Cancelar"; não fecha durante o envio; erro exibido dentro dele.
- **Toast** (Sonner): confirmação transitória de sucesso (criação, avisos após redirecionamento). Erros ficam fixos, perto de onde aconteceram.
- **Etiqueta de status:** ponto de 7px + texto; tons positivo e atenção levemente tingidos. A cor nunca aparece sozinha.
- **Bloco recolhível:** explicações permanentes (como as regras funcionam), aberto quando a lista está vazia.
- **Primeiros passos:** conta → movimentação → categoria, com o próximo passo destacado; some quando os três estão feitos.
- **Paginação:** 20 itens por página em todas as listas; Anterior, números (primeira, última e vizinhas da atual, com reticências) e Próxima. No celular, só Anterior, "6 de 12" e Próxima.
- **Estado vazio, aviso e esqueleto:** como antes; o esqueleto tem a forma do conteúdo final.
- **Ícones:** SVG próprios, traço de 1,75px, significado literal; sempre com rótulo visível ou acessível.

## Do's and Don'ts

- Faça: mostrar período, fonte e data de referência; revelar detalhes conforme a necessidade; uma ação primária por tela; nomear a ação em cada botão; dizer o problema e a recuperação em cada erro.
- Evite: promessas de rentabilidade; gradientes chamativos; telas feitas só de cartões; esconder indisponibilidade ou defasagem; eyebrows acima de títulos; cor como único indicador; movimento decorativo em ações frequentes.

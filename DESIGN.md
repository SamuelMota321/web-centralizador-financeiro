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
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.02em"
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
    fontSize: "1.0625rem"
    fontWeight: 500
    lineHeight: 1.65
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
    fontSize: "clamp(2.5rem, 5vw, 3.75rem)"
    fontWeight: 400
    lineHeight: 1.08
    letterSpacing: "-0.03em"
rounded:
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
    backgroundColor: "{colors.surface-soft}"
    textColor: "{colors.primary-hover}"
    rounded: "{rounded.control}"
    padding: "10px 12px"
  status-chip:
    textColor: "{colors.body-text}"
    rounded: "{rounded.pill}"
    padding: "2px 8px"
---

# Coinciente — sistema visual do app web

Fonte de verdade: Style Guide 1.0 (`documentacao-centralizador-financeiro/style-guide.html` e `assets/styles.css`). Este arquivo traduz o guia para a interface de produto; quando divergir do guia, o guia vence e este arquivo é corrigido.

## Overview

Interface de produto (modo "Operate"): o usuário está em uma tarefa curta e recorrente. Segura sem ser distante, clara por camadas e tranquila. A marca vive nos detalhes precisos — símbolo, verde de ação, tipografia editorial reservada para momentos institucionais — e nunca compete com os dados. Moderadamente densa, nunca apressada. Nada que lembre banco, promessa de rendimento ou estética de criptomoeda.

Estrutura do app, como nos mockups do guia: barra superior com a assinatura (símbolo + "Coin**ciente**") e o usuário ("dados fictícios"); navegação lateral de ~200px com o item ativo em fundo verde suave; área principal com cabeçalho de página (título, linha de contexto, ação principal) e conteúdo. Em telas estreitas, a navegação vira uma faixa horizontal sob a barra.

## Colors

Restrained: neutros esverdeados carregam a interface; o verde Consciência aparece só em ação primária, seleção atual e indicadores de estado. Verde expressa progresso consciente; o azul-marinho esverdeado (Confiança) sustenta a percepção institucional.

- Positivo e negativo só significam algo junto de texto, sinal ou ícone. Valores de entrada usam o verde apenas como reforço do sinal "+"; saídas ficam na cor do texto.
- Estados semânticos: `positive` (sucesso), `negative` (erro, ação destrutiva), `warning` (atenção), `info` (informação). Cada aviso leva ícone e texto.
- Tema escuro não é preto: preserva temperatura, profundidade e hierarquia do claro (tokens `dark-*`), aplicado por `prefers-color-scheme`.
- Contrastes medidos: texto secundário 4,63:1 sobre o fundo claro e 7,9:1 no escuro; verde de ação 5,35:1 sobre branco; borda de campo 3,44:1 (claro) e 3,5:1 (escuro).

## Typography

- **Manrope** carrega toda a interface: navegação, títulos de página, rótulos, dados, botões. Escala fixa em rem (proporção ~1,2), sem tamanhos fluidos.
- **Newsreader** fica para a voz institucional: a entrada do produto (página inicial, único tamanho fluido, por ser superfície de marca) e, no futuro, valores de patrimônio no dashboard. Nunca em rótulos, botões ou dados de lista.
- Números comparados em coluna usam `font-variant-numeric: tabular-nums`. Caixa alta só em rótulos curtos, e com parcimônia.
- Tracking mínimo -0.03em em títulos; corpo sem tracking negativo.

## Layout

- Grade do app: barra superior de 64px; navegação lateral de 200px; conteúdo com largura máxima de 72rem e respiro de 32px (desktop) / 16px (celular).
- Cabeçalho de página: título + linha de contexto à esquerda, ação principal à direita, alinhados pela base.
- Listas de dados em colunas alinhadas no desktop (descrição, categoria, valor à direita); empilhadas no celular. Uma lista é um único painel com divisórias discretas entre linhas, nunca um cartão por item.
- Formulários de criação abrem em painel na própria página (divulgação progressiva), acima da lista, pela ação principal do cabeçalho. Modal só quando a tarefa exige foco protegido.

## Elevation & Depth

Elevação declarada uma vez: painéis e listas usam borda `line` de 1px, sem sombra. A única sombra é a da barra superior fixa ao rolar e a de menus sobrepostos (`0 12px 32px rgba(25, 54, 44, 0.07)` no claro).

## Shapes

Raios médios e consistentes: 9px em controles (botões, campos, itens de navegação), 13px em painéis e listas, 20px em molduras grandes. Pílula só para etiquetas de status pequenas.

## Components

- **Botões:** primário (verde), secundário (superfície com borda), perigo (negativo) e link. Estados: hover, pressionado (escala 0,98), foco visível (anel de 2px no verde), desabilitado (opacidade 0,55) e carregando (texto de ação no gerúndio). Altura 40px.
- **Campos:** rótulo acima, ajuda abaixo, erro associado por `aria-describedby`, borda `input-border`, foco com anel verde.
- **Etiqueta de status:** ponto colorido de 7px + texto, como o bloco "Estado dos dados" do guia. A cor nunca aparece sozinha.
- **Aviso:** ícone + texto + ação opcional; variantes sucesso, informação, atenção e erro.
- **Estado vazio:** ícone, frase que explica o que é aquela área e a ação que a inicia.
- **Esqueleto:** blocos com a forma do conteúdo durante o carregamento; nunca um spinner no meio da página.
- **Ícones:** SVG próprios, traço de 1,75px, cantos arredondados, significado literal; sempre ao lado de um rótulo.

## Do's and Don'ts

- Faça: mostrar período, fonte e data de referência; revelar detalhes conforme a necessidade; linguagem simples; diferenciar ação, informação e alerta; nomear a ação em cada botão; dizer o problema e a recuperação em cada erro.
- Evite: promessas de rentabilidade; gradientes chamativos; telas feitas só de cartões; esconder indisponibilidade ou defasagem; eyebrows acima de títulos; bordas coloridas grossas em avisos; cor como único indicador; movimento decorativo (transições de 150–200ms só para mudança de estado, respeitando `prefers-reduced-motion`).

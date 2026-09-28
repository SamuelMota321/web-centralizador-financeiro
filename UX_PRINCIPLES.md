# Princípios de UX — Coinciente (web)

Consolida padrões de experiência já implementados no app, espalhados hoje entre `PRODUCT.md` (princípios
de produto) e `DESIGN.md` (componentes). Não redefine tokens visuais — isso é `DESIGN.md`. Fonte para as
skills `ux-critic` e `visual-audit`, e para qualquer revisão de tela nova.

## Hierarquia e ações

- Uma ação primária por tela, no cabeçalho (`PageHeader`), nunca competindo com uma segunda ação de mesmo peso.
- Ações secundárias e destrutivas ficam fora da linha visível: um botão de ação secundária ao lado + um menu
  "Mais ações" (`ActionMenu`) para o resto. Destrutiva sempre por último no menu, em `negative`.
- Ação destrutiva sempre pede confirmação em diálogo (`ConfirmDialog`), com foco inicial em "Cancelar" — a
  opção segura precisa ser a que já está em foco, nunca a destrutiva.

## Feedback

- Sucesso de uma ação: toast (Sonner), transitório, some sozinho.
- Erro: fixo na tela, perto de onde aconteceu — nunca um toast que desaparece sozinho.
- Todo aviso de erro explica o problema e o caminho de recuperação, nunca só "algo deu errado".
- Envio em andamento: `aria-busy` + rótulo no gerúndio dentro do próprio botão (`PendingLabel`), nunca um
  spinner solto no meio da tela.

## Estados

Estados sempre explícitos, nunca escondidos ou inferidos pela ausência de dado:

| Estado | Como aparece |
|---|---|
| Carregando | Esqueleto com a forma do conteúdo final (`SkeletonLine`), nunca um spinner central |
| Vazio | `EmptyState`: ícone + frase que explica a área + ação que a inicia |
| Erro | `Notice` fixo com o problema e a recuperação; `error.tsx` de rota com "Tentar de novo" |
| Sucesso | Toast, ou `Notice tone="success"` quando precisa persistir na tela |
| Categorização | Sempre um dos 5 estados explícitos do domínio — nunca "sem categoria" tratado como erro |

## Divulgação progressiva

- Formulários de criação abrem no próprio local da lista (painel), pela ação do cabeçalho — não é modal.
- Explicações permanentes (ex.: como a precedência de regras funciona) ficam num bloco recolhível
  (`Disclosure`), aberto por padrão só quando a lista está vazia.
- Modal (`AlertDialog`) só quando a tarefa exige foco protegido: confirmação destrutiva. Nunca para criação.

## Redução de carga cognitiva

- Histórico agrupado por dia, com "Hoje"/"Ontem" em vez de datas soltas repetidas.
- "Primeiros passos" (`GettingStarted`) aparece só enquanto falta um passo essencial e destaca qual é o
  próximo — some sozinho quando completo, nunca fica como ruído permanente.
- Sem saldo consolidado nem total antes do dashboard: a interface nunca insinua um número que não calculou.

## Consistência

- O mesmo vocabulário de estado (`categorizationLabel`, `StatusChip`) em toda tela que mostra uma
  movimentação — nunca um rótulo ad hoc por tela.
- Data sempre DD/MM/AAAA digitada com máscara — nunca o seletor nativo do navegador.

## TODO

- [ ] Nenhum gap identificado nesta auditoria inicial além do que já está coberto acima. Revisar quando uma
      tela nova introduzir um padrão que não se encaixe nesta lista.

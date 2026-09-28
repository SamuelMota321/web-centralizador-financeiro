# Definition of Done — telas (web)

Critério mínimo antes de considerar uma tela pronta. Curto de propósito; detalhe de cada item mora em
`UX_PRINCIPLES.md` e `DESIGN.md`, não aqui.

## UX

- [ ] Objetivo da tela claro em uma frase (`PageHeader` context)
- [ ] Uma ação primária, sem CTA competindo
- [ ] Loading, vazio, erro e sucesso implementados (não só o caminho feliz)
- [ ] Ação destrutiva com confirmação e recuperação explicada

## Visual

- [ ] Sem valor de cor, radius, espaçamento ou tipografia fora do `DESIGN.md`
- [ ] Componente reaproveitado da lista existente (`components/ui.tsx`, `interactive.tsx`) antes de criar um novo

## Responsivo

- [ ] Funciona em desktop, tablet (trilho) e celular (abas) — os três breakpoints do `shell.module.css`
- [ ] Sem rolagem horizontal, sem alvo de toque abaixo de 44px

## Acessibilidade

- [ ] Navegável por teclado, foco visível
- [ ] Rótulo acessível em todo botão só-ícone
- [ ] Contraste dentro do medido em `DESIGN.md`
- [ ] HTML semântico (landmarks, hierarquia de heading)

## Validação

- [ ] `pnpm lint && pnpm typecheck && pnpm test && pnpm build` sem erro
- [ ] `git diff --check` limpo

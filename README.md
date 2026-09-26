# Centralizador Financeiro — Web

Cliente web (Next.js, App Router, TypeScript) do MVP acadêmico. Aplicação independente
da mobile: não compartilha componentes, navegação nem código-fonte. Consome o contrato
OpenAPI do backend sob `/api/v1`.

A Sprint 1 (S1-04 a S1-07) cobre login Auth0, área protegida, logout e a manutenção de
contas manuais: criar, listar, editar e desativar (com confirmação), além do isolamento de
dados entre sessões.

A Sprint 2 (S2-04 a S2-07) acrescenta movimentações (receita, despesa e transferência
contábil entre contas próprias, com Idempotency-Key), categorias pessoais, categorização
manual com estados incerto e não reconhecido, regras pessoais de categorização com
precedência explicada e o isolamento de estado entre sessões. A interface segue o Style
Guide 1.0, documentado em `PRODUCT.md` e `DESIGN.md`.

A reformulação da interface reorganizou a navegação (lateral em Confiança com grupos
"Registros" e "Organização", trilho no tablet e abas no celular), trouxe histórico agrupado
por dia, primeiros passos, menus de ações, diálogo de confirmação e toasts. Componentes
interativos acessíveis vêm de `@base-ui/react` (menu e diálogo) e `sonner` (toasts),
estilizados com os tokens do produto.

O access token nunca chega ao navegador: a listagem roda em Server Component e as mutações
(criar, editar, desativar) em Server Actions, então quem chama o backend é o servidor Next.
Por isso o backend não precisa de CORS para este cliente.

## Requisitos

| Ferramenta | Versão | Observação |
|---|---|---|
| Node.js | `>=22.12 <27` | veja `.nvmrc` (`22`). Com `nvm`: `nvm install && nvm use` |
| pnpm | 12.x | não instale manualmente — vem pelo corepack (passo 1) |
| Backend | — | precisa estar no ar para as chamadas à API; a UI atual sobe sem ele |

## Passo a passo para rodar

### 1. Habilitar o pnpm

O pnpm é distribuído pelo Node via corepack. Rode uma vez por máquina:

```bash
corepack enable
pnpm -v          # deve imprimir 12.3.4 (ou compatível)
```

Se `pnpm -v` falhar com "command not found":

```bash
corepack prepare pnpm@12.3.4 --activate
```

### 2. Instalar as dependências

Na raiz deste repositório:

```bash
pnpm install
```

Cria a pasta `node_modules/`. Repita sempre que o `package.json` mudar.

### 3. Subir o backend (pré-requisito para usar a API)

O contrato e os dados vêm de `backend-centralizador-financeiro`. Em outro terminal:

```bash
cd ../backend-centralizador-financeiro
cp .env.example .env          # troque cada replace_me por uma senha local qualquer
docker compose up -d --wait   # requer Docker Desktop rodando
```

> O backend usa **npm**, não pnpm. Se for rodá-lo fora do Docker, use `npm ci` e
> `npm run start:dev` na pasta dele. Um `pnpm install` no backend cria `pnpm-lock.yaml` e
> `pnpm-workspace.yaml` e falha com `ERR_PNPM_IGNORED_BUILDS` (Prisma e esbuild sem build).

Confirme:

```bash
curl http://localhost:3000/api/v1/health/ready
# esperado: {"status":"ok"}
```

> **Portas ocupadas?** Se `3000` ou `5432` já estiverem em uso na sua máquina
> (comum no Windows: PostgreSQL nativo na 5432, serviços na 3000), crie
> `backend-centralizador-financeiro/compose.override.yaml` com portas livres:
>
> ```yaml
> services:
>   api:
>     ports: ["3100:3000"]
>   postgres:
>     ports: ["55432:5432"]
> ```
>
> Nesse caso a API fica em `http://localhost:3100/api/v1` — ajuste o `.env` no passo 4.

### 4. Configurar o ambiente

```bash
cp .env.example .env
```

Abra o `.env` e ajuste `NEXT_PUBLIC_API_BASE_URL` se o backend não estiver na porta
padrão:

```bash
# backend na porta padrão
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000/api/v1

# backend remapeado (compose.override.yaml com 3100)
NEXT_PUBLIC_API_BASE_URL=http://localhost:3100/api/v1
```

O `.env` é ignorado pelo git. Nunca coloque credenciais reais nele nem no
`.env.example`.

### 4.1. Configurar o Auth0

No painel do Auth0, registre uma aplicação do tipo **Regular Web Application** e
configure nela:

| Campo | Valor |
|---|---|
| Allowed Callback URLs | `http://localhost:3001/auth/callback` |
| Allowed Logout URLs | `http://localhost:3001` |

Preencha no `.env`:

```bash
AUTH0_DOMAIN=seu-tenant.us.auth0.com
AUTH0_CLIENT_ID=...
AUTH0_CLIENT_SECRET=...
AUTH0_AUDIENCE=...            # idêntico ao AUTH0_AUDIENCE do backend
APP_BASE_URL=http://localhost:3001
AUTH0_SECRET=                 # gere com: openssl rand -hex 32
```

`AUTH0_AUDIENCE` precisa ser exatamente o mesmo do backend — se divergir, o backend
recusa o token com 401.

### 5. Iniciar o servidor de desenvolvimento

```bash
pnpm dev
```

Saída esperada:

```
▲ Next.js 16.x
- Local:  http://localhost:3001
✓ Ready in ...
```

Este cliente usa a **porta 3001** (a 3000 é do backend). Abra
**http://localhost:3001**.

Parar: `Ctrl+C`.

### 6. Verificar que está tudo certo

1. `http://localhost:3001` mostra a página de entrada com o botão **Entrar**.
2. `/movimentacoes`, `/contas`, `/categorias` e `/regras` sem estar logado redirecionam para o Auth0.
3. Depois de entrar, o app abre em **Movimentações**, com a navegação lateral agrupada
   (Registros: Movimentações e Contas; Organização: Categorias e Regras) e o atalho
   **Registrar movimentação** sempre à mão. Datas são digitadas em DD/MM/AAAA.
4. Estreite a janela: abaixo de 64rem a lateral vira trilho de ícones; abaixo de 40rem,
   barra superior e abas inferiores.
5. **Sair** fica no menu da conta (pé da lateral ou avatar no celular) e encerra a sessão;
   as rotas do app voltam a redirecionar.

## Checagens de qualidade

Rode antes de commitar:

```bash
pnpm lint          # ESLint
pnpm typecheck     # next typegen (tipos de rota) + tsc --noEmit
pnpm test          # Vitest
pnpm build         # build de produção (o que a Vercel faz)
```

Todos devem terminar sem erro.

### Testes automatizados

Vitest em ambiente Node, sem navegador nem credenciais: `fetch`, Auth0 e as funções do
Next são simulados. Os arquivos `*.test.ts` ficam ao lado do código testado.

| Arquivo | O que garante |
|---|---|
| `src/lib/money.test.ts` | entrada pt-BR normalizada e formatação em BRL sem `Number` (sem erro de ponto flutuante) |
| `src/lib/civil-date.test.ts` | data civil sem fuso, anos bissextos, datas inexistentes, DD/MM/AAAA, máscara de digitação, data por extenso e "Hoje"/"Ontem" |
| `src/lib/idempotency.test.ts` | chave UUID nova e quando trocá-la (`REUSED`/`EXPIRED`) |
| `src/lib/api/http-client.test.ts` | bearer só com token, `cache: "no-store"` sempre, URL, corpo JSON e normalização de erros |
| `src/lib/page-window.test.ts` | páginas exibidas na paginação numerada (primeira, última, vizinhas e reticências) |
| `src/lib/api/pagination.test.ts` | leitura de todas as páginas para seletores, com aviso de truncamento |
| `src/lib/api/contract.test.ts` | operações existem no `openapi.snapshot.json`; fixtures de cada resposta validadas contra o snapshot e contra o Zod; enums iguais aos do contrato |
| `src/lib/accounts/*.test.ts` | contas: schema, PATCH só com alterações, mensagens, chamadas da API |
| `src/lib/transactions/*.test.ts` | movimentações: schemas de entrada (valor, data, transferência entre contas distintas, categorização), chamadas com Idempotency-Key, mensagens |
| `src/lib/categories/api.test.ts`, `src/lib/category-rules/*.test.ts` | categorias e regras: chamadas, gramática da condição e limites de prioridade |
| `src/app/(app)/movimentacoes/*.test.ts` | Server Actions de receita, despesa, transferência e categorização (chave mantida em falha e trocada após sucesso ou recusa); rótulos, sinais, agrupamento por dia e primeiros passos |
| `src/app/(app)/account-menu.test.ts` | iniciais do avatar da conta |
| `src/app/(app)/contas/*.test.ts` | Server Actions de contas e avisos restritos a uma lista fechada |
| `src/app/(app)/categorias/*.test.ts` | criar, renomear e arquivar; nome repetido recusado antes da API |
| `src/app/(app)/regras/*.test.ts` | criar, editar só o que mudou, ativar, desativar e remover; frase da regra e gramática |
| `src/proxy.test.ts` | rotas do app sem sessão redirecionam ao login; `/auth/*` e a página pública não exigem sessão |

Os fluxos de tela (login real no Auth0, confirmação visual, logout pelo navegador) são
verificados pelo roteiro de demonstração abaixo.

## Build de produção local

```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000/api/v1 pnpm build
pnpm start          # serve o build na porta 3001
```

## Solução de problemas

| Sintoma | Causa provável | O que fazer |
|---|---|---|
| `pnpm: command not found` | corepack não habilitado | `corepack enable` (passo 1) |
| `Error: NEXT_PUBLIC_API_BASE_URL nao definido` | falta o `.env` | passo 4 |
| toda página responde 500 com `DomainResolutionError` / `Missing: domain` | variáveis do Auth0 vazias (o `.env.example` vem sem valores) | preencha `AUTH0_*` no `.env` (passo 4.1) e reinicie o `pnpm dev` |
| chamadas à API falham / timeout | backend não está no ar ou porta errada | passo 3; confira a URL no `.env` |
| `curl localhost:3000` conecta mas trava | outro processo na porta 3000 | use `compose.override.yaml` (passo 3) |
| porta 3001 ocupada | outra instância rodando | `pnpm dev -- -p 3002` e abra a porta nova |
| `Cannot connect to the Docker daemon` no WSL | integração do Docker Desktop com a distro desligada ou travada | Docker Desktop → Settings → Resources → WSL Integration: ative a distro. Se persistir: feche o Docker Desktop, rode `wsl --shutdown` no PowerShell e abra o Docker Desktop de novo |

## Estrutura relevante

| Caminho | Responsabilidade |
|---|---|
| `PRODUCT.md`, `DESIGN.md` | produto e sistema visual (tokens, tipografia, componentes) derivados do Style Guide |
| `src/app/page.tsx` | página de entrada com o acesso ao login |
| `src/app/(app)/layout.tsx`, `app-frame.tsx` | sessão e estrutura do app: lateral, trilho ou abas (`side-nav.tsx`), menu da conta e atalho de registro (`account-menu.tsx`) |
| `src/app/(app)/movimentacoes/` | histórico agrupado por dia, primeiros passos, registro de receita, despesa e transferência, categorização |
| `src/app/(app)/contas/` | contas manuais: criar, editar, desativar com confirmação |
| `src/app/(app)/categorias/` | categorias pessoais: criar, renomear, arquivar |
| `src/app/(app)/regras/` | regras pessoais: formulário guiado, ciclo de vida e explicação da precedência |
| `src/components/` | ícones SVG, símbolo da marca, peças de interface (`ui.tsx`), menu, diálogo, toasts e controle segmentado (`interactive.tsx`) e painel de criação (`panel.tsx`) |
| `src/proxy.ts` | fronteira de autenticação (convenção do Next 16; era `middleware.ts`) |
| `src/lib/auth0.ts` | instância do `Auth0Client` |
| `src/lib/api/config.ts` | base URL da API a partir do ambiente |
| `src/lib/api/http-client.ts` | wrapper `fetch` (JSON, token por requisição, erros normalizados) |
| `src/lib/api/CONTRACT.md` | estado do contrato OpenAPI e opções de gerador |
| `src/lib/accounts/` | tipos, Zod de borda, funções da API, diff do PATCH e mensagens por código |
| `src/lib/transactions/`, `categories/`, `category-rules/` | clientes tipados de Transactions, com Zod de borda e mensagens |
| `src/lib/session.ts` | token da sessão no servidor e detecção de falha de autenticação |
| `vitest.config.mts` | configuração dos testes (alias `@`, variáveis fictícias) |

## Demonstração da Sprint 1

Roteiro da parte web para a demonstração acadêmica. Use somente dados fictícios e dois
usuários de teste (A e B) do mesmo tenant Auth0. Não mostre `.env`, tokens nem a aba de rede.

| # | Ação | Resultado esperado |
|---|---|---|
| 1 | Abrir `http://localhost:3001/contas` sem login | redireciona para o Auth0 |
| 2 | Entrar como A | volta para `/contas`, lista vazia com orientação |
| 3 | Criar "Conta principal" e "Reserva" | ambas aparecem na lista, com aviso "Conta criada. Ela já pode receber movimentações." |
| 4 | Criar conta com saldo `abc` ou data futura | erro no próprio campo, nada é criado |
| 5 | **Editar** "Reserva", mudar o nome, salvar | aviso "Conta atualizada." e nome novo na lista |
| 6 | **Editar** e salvar sem mudar nada | "Nenhuma alteração para salvar." sem chamada à API |
| 7 | **Editar** e mudar só a data de referência | salva: saldo e data vão juntos |
| 8 | **Mais ações** (⋯) → **Desativar conta** → **Cancelar** | o diálogo fecha e nada muda |
| 9 | **Mais ações** (⋯) → **Desativar conta** → **Desativar conta** no diálogo | conta some; aviso de desativação com histórico preservado |
| 10 | Duas abas em `/contas`: desativar na primeira, editar a mesma conta na segunda | "Esta conta não foi encontrada ou não está mais disponível." e lista recarregada |
| 11 | Menu da conta → **Sair** e usar o botão voltar do navegador | nenhuma conta visível; `/contas` pede login |
| 12 | Entrar como B | nenhuma conta de A aparece |

## Demonstração da Sprint 2

O roteiro completo (web e mobile, usuários A e B, precedência de regras, reenvio sem
duplicar e isolamento) está em
`documentacao-centralizador-financeiro/prompts/sprint2/dev2/roteiro-demonstracao-sprint-2.md`.

## Ambiente

Todas as variáveis do `.env.example` são obrigatórias. Nenhuma credencial é versionada:
`.env` é ignorado pelo git e `.env.example` só tem placeholders.

O token de acesso fica exclusivamente no servidor — o endpoint `/auth/access-token` do
SDK está desabilitado de propósito, para que nenhum script da página consiga lê-lo.

# Centralizador Financeiro — Web

Cliente web (Next.js, App Router, TypeScript) do MVP acadêmico. Aplicação independente
da mobile: não compartilha componentes, navegação nem código-fonte. Consome o contrato
OpenAPI do backend sob `/api/v1`.

A Sprint 1 (S1-04 a S1-07) cobre login Auth0, área protegida, logout e a manutenção de
contas manuais: criar, listar, editar e desativar (com confirmação), além do isolamento de
dados entre sessões.

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

1. `http://localhost:3001` mostra a página pública com o botão **Entrar**.
2. `http://localhost:3001/contas` sem estar logado redireciona para o Auth0.
3. Depois de entrar, `/contas` lista suas contas e permite criar, editar e desativar.
4. **Sair** encerra a sessão e `/contas` volta a redirecionar.

## Checagens de qualidade

Rode antes de commitar:

```bash
pnpm lint          # ESLint
pnpm typecheck     # tsc --noEmit
pnpm test          # Vitest
pnpm build         # build de produção (o que a Vercel faz)
```

Todos devem terminar sem erro.

### Testes automatizados

Vitest em ambiente Node, sem navegador nem credenciais: `fetch`, Auth0 e as funções do
Next são simulados. Os arquivos `*.test.ts` ficam ao lado do código testado.

| Arquivo | O que garante |
|---|---|
| `src/lib/accounts/patch.test.ts` | PATCH só com campos alterados; saldo e data sempre juntos; comparação de valores sem `Number` |
| `src/lib/accounts/schema.test.ts` | validação de borda da criação e da edição espelhando o contrato |
| `src/lib/accounts/messages.test.ts` | mensagens em pt-BR por código; 404 e conta arquivada indistinguíveis; `detail` do backend nunca exibido |
| `src/lib/api/http-client.test.ts` | bearer só com token, URL, corpo JSON e normalização de erros |
| `src/lib/accounts/api.test.ts` | rotas, métodos e corpo de update/deactivate; UUID inválido não chega à API; resposta fora do contrato falha |
| `src/app/contas/actions.test.ts` | Server Actions: sem alteração, id adulterado, sucesso, indisponível, duplicidade, erros de campo |
| `src/app/contas/notices.test.ts` | avisos da página restritos a uma lista fechada |
| `src/proxy.test.ts` | `/contas` sem sessão redireciona ao login; `/auth/*` e a página pública não exigem sessão |
| `src/lib/api/contract.test.ts` | operações de contas do cliente existem no `openapi.snapshot.json` com os mesmos campos |

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
| chamadas à API falham / timeout | backend não está no ar ou porta errada | passo 3; confira a URL no `.env` |
| `curl localhost:3000` conecta mas trava | outro processo na porta 3000 | use `compose.override.yaml` (passo 3) |
| porta 3001 ocupada | outra instância rodando | `pnpm dev -- -p 3002` e abra a porta nova |
| `Cannot connect to the Docker daemon` no WSL | integração do Docker Desktop com a distro desligada ou travada | Docker Desktop → Settings → Resources → WSL Integration: ative a distro. Se persistir: feche o Docker Desktop, rode `wsl --shutdown` no PowerShell e abra o Docker Desktop de novo |

## Estrutura relevante

| Caminho | Responsabilidade |
|---|---|
| `src/app/page.tsx` | página pública com o acesso ao login |
| `src/app/contas/` | área protegida: listagem, criação, edição, desativação com confirmação, avisos, estados de carga e erro |
| `src/proxy.ts` | fronteira de autenticação (convenção do Next 16; era `middleware.ts`) |
| `src/lib/auth0.ts` | instância do `Auth0Client` |
| `src/lib/api/config.ts` | base URL da API a partir do ambiente |
| `src/lib/api/http-client.ts` | wrapper `fetch` (JSON, token por requisição, erros normalizados) |
| `src/lib/api/CONTRACT.md` | estado do contrato OpenAPI e opções de gerador |
| `src/lib/accounts/` | tipos, Zod de borda, funções da API, diff do PATCH e mensagens por código |
| `vitest.config.mts` | configuração dos testes (alias `@`, variáveis fictícias) |

## Demonstração da Sprint 1

Roteiro da parte web para a demonstração acadêmica. Use somente dados fictícios e dois
usuários de teste (A e B) do mesmo tenant Auth0. Não mostre `.env`, tokens nem a aba de rede.

| # | Ação | Resultado esperado |
|---|---|---|
| 1 | Abrir `http://localhost:3001/contas` sem login | redireciona para o Auth0 |
| 2 | Entrar como A | volta para `/contas`, lista vazia com orientação |
| 3 | Criar "Conta principal" e "Reserva" | ambas aparecem na lista, com aviso "Conta criada." |
| 4 | Criar conta com saldo `abc` ou data futura | erro no próprio campo, nada é criado |
| 5 | **Editar** "Reserva", mudar o nome, salvar | aviso "Conta atualizada." e nome novo na lista |
| 6 | **Editar** e salvar sem mudar nada | "Nenhuma alteracao para salvar." sem chamada à API |
| 7 | **Editar** e mudar só a data de referência | salva: saldo e data vão juntos |
| 8 | **Desativar** → **Cancelar** | nada muda |
| 9 | **Desativar** → **Confirmar desativação** | conta some; aviso de desativação com histórico preservado |
| 10 | Duas abas em `/contas`: desativar na primeira, editar a mesma conta na segunda | "Esta conta nao foi encontrada ou nao esta mais disponivel." e lista recarregada |
| 11 | **Sair** e usar o botão voltar do navegador | nenhuma conta visível; `/contas` pede login |
| 12 | Entrar como B | nenhuma conta de A aparece |

## Ambiente

Todas as variáveis do `.env.example` são obrigatórias. Nenhuma credencial é versionada:
`.env` é ignorado pelo git e `.env.example` só tem placeholders.

O token de acesso fica exclusivamente no servidor — o endpoint `/auth/access-token` do
SDK está desabilitado de propósito, para que nenhum script da página consiga lê-lo.

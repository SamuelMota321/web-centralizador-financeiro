# Centralizador Financeiro — Web

Cliente web (Next.js, App Router, TypeScript) do MVP acadêmico. Aplicação independente
da mobile: não compartilha componentes, navegação nem código-fonte. Consome o contrato
OpenAPI do backend sob `/api/v1`.

Esta fase (S1-02 + parcial S1-03) cobre a fundação: bootstrap, configuração de ambiente,
wrapper HTTP e camada de dados provisória alinhada ao contrato. Autenticação Auth0 e as
telas de contas pertencem a fases posteriores — hoje a aplicação sobe com a página
inicial padrão do Next.

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
**http://localhost:3001** — você verá a página inicial padrão do Next.js.

Parar: `Ctrl+C`.

### 6. Verificar que está tudo certo

```bash
curl -o /dev/null -w "%{http_code}\n" http://localhost:3001
# esperado: 200
```

## Checagens de qualidade

Rode antes de commitar:

```bash
pnpm lint          # ESLint
pnpm typecheck     # tsc --noEmit
pnpm build         # build de produção (o que a Vercel faz)
```

Todos devem terminar sem erro.

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

## Estrutura relevante

| Caminho | Responsabilidade |
|---|---|
| `src/app/` | rotas e páginas (App Router) |
| `src/lib/api/config.ts` | base URL da API a partir do ambiente |
| `src/lib/api/http-client.ts` | wrapper `fetch` (JSON, injeção de token, erros normalizados) |
| `src/lib/api/CONTRACT.md` | estado do contrato OpenAPI e opções de gerador |
| `src/lib/accounts/` | tipos e Zod de borda **provisórios** para contas |

## Ambiente

`NEXT_PUBLIC_API_BASE_URL` é obrigatória. Segredos do Auth0 entram na fase 3 e nunca
são versionados. `.env.example` não contém credenciais.

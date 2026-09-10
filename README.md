# Centralizador Financeiro — Web

Cliente web (Next.js, App Router, TypeScript) do MVP academico. Aplicacao independente
da mobile: nao compartilha componentes, navegacao nem codigo-fonte. Consome o contrato
OpenAPI do backend sob `/api/v1`.

Esta fase (S1-02 + parcial S1-03) cobre a fundacao: bootstrap, configuracao de ambiente,
wrapper HTTP e camada de dados provisoria alinhada ao contrato. Autenticacao Auth0 e as
telas de contas pertencem a fases posteriores.

## Requisitos

- Node.js na faixa de `package.json` (`>=22.12 <27`); use `.nvmrc`.
- pnpm via corepack: `corepack enable`.
- Backend acessivel (por padrao `http://localhost:3000/api/v1`).

## Execucao local

```bash
corepack enable
pnpm install
cp .env.example .env   # ajuste NEXT_PUBLIC_API_BASE_URL se necessario
pnpm dev               # http://localhost:3001
```

O backend roda na porta 3000; este cliente usa a 3001 para evitar conflito.
Para subir o backend, veja o README de `backend-centralizador-financeiro`.

## Checagens

```bash
pnpm lint
pnpm typecheck
pnpm build
```

## Estrutura relevante

| Caminho | Responsabilidade |
|---|---|
| `src/lib/api/config.ts` | Base URL da API a partir do ambiente |
| `src/lib/api/http-client.ts` | Wrapper `fetch` (JSON, injecao de token, erros) |
| `src/lib/api/CONTRACT.md` | Estado do contrato e decisao de gerador |
| `src/lib/accounts/` | Tipos e Zod de borda provisorios para contas |

## Ambiente

`NEXT_PUBLIC_API_BASE_URL` e obrigatoria. Segredos do Auth0 entram na fase 3 e nunca
sao versionados. `.env.example` nao contem credenciais.

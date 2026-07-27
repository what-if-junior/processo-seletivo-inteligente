# IFB Admin (`admin-web`)

Console administrativo de revisão de processos seletivos (Next.js 15).

## Rotas

| Rota | Descrição |
| --- | --- |
| `/login` | Autenticação JWT contra a API |
| `/admin` | Dashboard (KPIs, gráfico, atividade) |
| `/admin/inscricoes` | Lista de candidaturas |
| `/admin/inscricoes/[id]` | Detalhe + ações de homologação |
| `/admin/candidatos` | Lista de usuários |
| `/admin/relatorios` | Relatórios CSV no cliente |
| `/admin/configuracoes` | Preferências (localStorage) |

## Desenvolvimento

Na raiz do monorepo (ou neste pacote):

```bash
# API (Nest) precisa estar em :5005 para dados reais
export NEXT_PUBLIC_API_URL=http://localhost:5005
pnpm --filter admin-web dev
# ou
npm run dev --workspace=admin-web
```

Abra [http://localhost:3000](http://localhost:3000). Sem token, você é redirecionado para `/login`.

Seed de desenvolvimento:

- `admin@teste.com` / `admin123`

## Scripts

- `npm run dev` — Turbopack na porta 3000
- `npm run check-types` — `tsc --noEmit`
- `npm run lint` — ESLint
- `npm run build` — build standalone
- `npm start` — serve o build standalone (`scripts/start-standalone.mjs`, porta 3000)

## Notas

Quando a API estiver indisponível, as telas caem para mocks tipados com aviso visual. Ações `PATCH` de status/documentos ainda não existem no backend — a UI tenta a chamada e documenta o gap. Gaps trackeados em `codegen/issues-found/` (workspace root).

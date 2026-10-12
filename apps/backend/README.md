# Backend API (`apps/backend`)

API NestJS + TypeORM do Processo Seletivo Inteligente. Expõe Swagger em `/api` e
persiste no Postgres usando o schema SQL de `database/` como fonte da verdade
(`synchronize: false`).

## Docker (recomendado)

O backend é um dos targets do `Dockerfile` multi-stage do monorepo
(`target: backend`) e roda como serviço `backend` no `docker-compose.yaml`.

A partir da raiz do monorepo:

```bash
# 1. Crie o .env a partir do modelo já versionado no projeto
cp .env.sample .env

# 2. Suba o stack (postgres + backend + admin-web + candidate-app)
docker compose up --build
```

- Backend API: http://localhost:5005
- Swagger: http://localhost:5005/api
- Postgres: localhost:5432

> `docker compose up --build` compila as imagens localmente a partir do
> `Dockerfile`. Para usar as imagens pré-construídas do GHCR no servidor, use o
> override `docker-compose.prod.yaml`:
> `docker compose -f docker-compose.yaml -f docker-compose.prod.yaml up -d`
> (veja o `README.md` raiz).

### Variáveis de ambiente

O backend lê as seguintes variáveis (todas já presentes em `.env.sample`):

| Variável | Uso |
| --- | --- |
| `DATABASE_HOST` | host do Postgres (`postgres` no Docker; `localhost` no host) |
| `DATABASE_PORT` | porta do Postgres (5432) |
| `DATABASE_USER` | usuário do banco |
| `DATABASE_PASS` | senha do banco |
| `DATABASE_NAME` | nome do banco |
| `PORT` | porta do Nest (5005) |
| `JWT_SECRET_TO_SIGN` | segredo para assinar o JWT |
| `SECRET_OR_KEY` | segredo para validar o JWT (deve ser igual ao de assinatura) |
| `WEB_ORIGIN` | origens CORS permitidas (separadas por vírgula; ex: `http://localhost:3000,http://localhost:3001`) |
| `N8N_BASE_URL` | URL base da instância n8n, sem a rota do webhook |
| `N8N_CHAT_URL` | caminho do webhook de chat (ex.: `/webhook/chat`) |
| `N8N_INGEST_URL` | caminho do webhook de ingestão RAG (ex.: `/webhook/ingest`) |
| `N8N_USER` | usuário Basic Auth configurado nos webhooks n8n |
| `N8N_PASSWORD` | senha Basic Auth; mantenha apenas no `.env` |
| `N8N_EMAIL_ENDPOINT` | webhook de entrega de e-mail, independente do assistente (W31) |

## Desenvolvimento local (npm workspaces)

Sem Docker, a partir da raiz do monorepo:

```bash
# instala dependências de todos os workspaces
npm install

# backend em modo watch (porta 5005)
npm run start:dev --workspace=backend

# build de produção
npm run build --workspace=backend

# testes
npm run test --workspace=backend
```

Requer Postgres acessível com as variáveis de `.env`
(`DATABASE_HOST=localhost` se o banco estiver no host).

## Swagger

- UI interativa em `GET /api` (rota pública).
- Todos os controllers são anotados com `@ApiTags` / `@ApiOperation`.
- Botão **Authorize** para autenticar com `Authorization: Bearer <access_token>`.
- Exemplos de uso no Next.js disponíveis na própria UI do Swagger.

## Assistente e contrato n8n (W34)

O backend chama os webhooks n8n de forma server-to-server e autentica com
Basic Auth (`N8N_USER` / `N8N_PASSWORD`). Configure `N8N_BASE_URL` como a origem
da instância, sem barra final, e `N8N_CHAT_URL` / `N8N_INGEST_URL` como
caminhos relativos, sem repetir a origem. Não grave credenciais reais no
repositório.

### Chat

`POST /assistant/chat` é público; o JWT do candidato é opcional. O backend envia
ao webhook configurado em `N8N_CHAT_URL` um JSON com estes campos:

```json
{
  "sessionId": "uuid-da-conversa",
  "pageId": "/inscricoes",
  "chatInput": "Como faço minha inscrição?",
  "audio": "base64-opcional",
  "email": null,
  "cidade": null,
  "candidaturasAtivas": []
}
```

`sessionId`, `pageId` e `audio` são omitidos quando não foram informados.
`audio`, quando presente, é base64 e tem limite de 25 MiB. Com JWT válido, o
backend acrescenta `email`, `cidade` e `candidaturasAtivas` com o contexto do
candidato; sem usuário autenticado, os campos são nulos ou lista vazia.

O webhook deve responder com JSON neste formato, com `output` como texto no
nível superior:

```json
{
  "output": "Resposta apresentada ao candidato",
  "sources": [],
  "sentiment": "neutro",
  "audio": null
}
```

`sources`, `sentiment` e `audio` são opcionais. O backend atual não interpreta
`assistant_reply`, `state` ou `cities`. No `pinData` do fluxo em construção, o
texto aparece em `output.assistant_reply`; use um nó de mapeamento antes de
responder ao webhook para expô-lo como `output` textual no nível superior.
Mantenha `sources`, `sentiment` e `audio` também no nível superior, se forem
produzidos. Evite encapsular o objeto numa chave adicional como `reply`: uma
resposta sem `output` faz o backend usar o fallback de FAQ do Hub em vez do
texto do agente.

Se o n8n não estiver configurado, retornar status HTTP não-2xx ou falhar na
requisição, o backend usa a FAQ correspondente do Hub ou uma mensagem genérica.
O retorno de `POST /assistant/chat` inclui `resposta`, `messageId`,
`sessionId`, `precisaLogin`, `sources`, `sentiment` e `audio`. Use o
`messageId` em `POST /assistant/feedback` com `thumbs: "up"` ou `"down"`.

### Ingestão RAG de editais

Quando os termos, flags de publicação/inscrição ou PDFs vigentes de um edital
mudam, o backend enfileira uma operação local em `AssistantIngestoes`.
`POST /assistant/ingestoes/flush` (JWT de gestor) envia cada item pendente em
uma requisição POST autenticada ao webhook `N8N_INGEST_URL`. A resposta HTTP
2xx marca a linha como enviada; outros status ou erros de rede marcam erro.
O endpoint não é chamado automaticamente.

O corpo enviado é sempre uma lista com um objeto:

```json
[
  {
    "id": 123,
    "numero_ano": "001/2026",
    "metodo_selecao": "ALEATORIO",
    "termos_modo": "URL",
    "termos_valor": "https://example.org/edital.pdf",
    "link_oficial": "https://example.org/edital.pdf",
    "publicado": true,
    "inscricoes_abertas": true
  }
]
```

Para remoção, o objeto contém somente `id`, por exemplo `[{"id": 123}]`.
Atualmente o payload não inclui o campo `operacao`: o fluxo de ingestão deve
tratar o objeto completo como upsert e o objeto apenas com `id` como remoção.
O backend lê a resposta apenas pelo status HTTP; não é necessário um formato
JSON específico de confirmação.

Os endpoints de gestão `GET /assistant/auditoria` e
`GET /assistant/ingestoes` exigem JWT de gestor e retornam até 200 registros
recentes. A auditoria armazena mensagem, resposta, sessão, fontes, sentimento e
eventual identificação do candidato.

## Seeds de desenvolvimento

- `joao@teste.com` / `senha123`
- `admin@teste.com` / `admin123`

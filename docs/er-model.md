# Modelo relacional (database/)

Fonte da verdade: scripts em `database/` montados em `/docker-entrypoint-initdb.d`.

> Visão geral de arquitetura, API e Docker: [architecture.md](architecture.md).

```mermaid
erDiagram
  Campus ||--o{ Ofertas : hosts
  Cursos ||--o{ Ofertas : catalogued_as
  Editais ||--o{ Ofertas : offers
  Editais ||--o{ EditalArquivos : pdf_history
  Ofertas ||--o{ DistribuicaoCotas : splits
  Ofertas ||--o{ Candidaturas : receives
  Editais ||--o{ Candidaturas : denorm_edital
  Usuarios ||--o{ Enderecos : possui
  Usuarios ||--o{ Candidaturas : candidata
  Usuarios ||--o{ Gestores : pode_ser
  Usuarios ||--o{ Contestacoes : pode_abrir
  Usuarios ||--o{ NotificacaoLeituras : le
  Usuarios ||--o| PreferenciasNotificacao : configura
  Candidaturas ||--o{ Documentos : anexa
  Candidaturas ||--o{ EtapasProcesso : passa_por
  Candidaturas ||--o{ Contestacoes : pode_gerar
  Gestores ||--o{ EtapasProcesso : avalia
  Gestores ||--o{ Recursos : analisa
  Gestores ||--o{ Notificacoes : dispara
  Gestores ||--o{ ContestacaoHistorico : responde
  EtapasProcesso ||--o{ Recursos : recebe
  Contestacoes ||--o{ ContestacaoHistorico : historico
  Notificacoes ||--o{ NotificacaoLeituras : entrega
  TemplatesBiblioteca ||--o{ TemplatesEdital : copia
  TemplatesEdital ||--o{ ContestacaoHistorico : usa
  ConfiguracaoGlobal ||--o{ FaixasSalarioMinimo : referencia_sm
  Editais ||--o{ Contestacoes : referencia
  Editais ||--o{ Notificacoes : referencia
  Editais ||--o{ CarrosselItens : referencia
  Editais ||--o{ TemplatesEdital : referencia

  Campus {
    int id PK
    string nome UK
  }

  Cursos {
    int id PK
    string nome
    string eixo_tecnologico
    string requisito_escolaridade
    string area_conhecimento
  }

  Editais {
    int id PK
    string numero_ano
    metodo_selecao metodo_selecao
    merito_tipo merito_tipo
    bool is_simplificado
    bool fallback_ac_para_rv
    termos_modo termos_modo
    string termos_valor
    string link_oficial
    bool publicado
    bool inscricoes_abertas
  }

  EditalArquivos {
    int id PK
    bigint id_edital FK
    bytea arquivo
    timestamp criado_em
  }

  Ofertas {
    int id PK
    bigint id_edital FK
    bigint id_curso FK
    bigint id_campus FK
    turno turno
    smallint vagas_totais
  }

  DistribuicaoCotas {
    int id PK
    bigint id_oferta FK
    string tipo_cota
    smallint vagas
    decimal percentual
  }

  Usuarios {
    int id PK
    string nome_completo
    string email UK
    string senha
    string CPF UK
    date data_nascimento
    string telefone
    string ppi
    boolean pcd
  }

  Enderecos {
    int id PK
    bigint id_usuario FK
    string estado
    string cidade
    string CEP
  }

  Candidaturas {
    int id PK
    bigint id_usuario FK
    bigint id_oferta FK
    bigint id_edital FK
    date data_inscricao
    status_candidatura status
    tipo_vaga tipo_vaga
    string protocolo
  }

  Documentos {
    int id PK
    bigint id_candidatura FK
    string tipo_documento
    string nome_arquivo
    string status_documento
  }

  Gestores {
    int id PK
    bigint id_usuario FK
    string funcao
  }

  EtapasProcesso {
    int id PK
    bigint id_candidatura FK
    bigint id_gestor FK
    etapa_processo tipo_etapa
    resultado_etapa status
  }

  Recursos {
    int id PK
    bigint id_etapa_processo FK
    bigint id_gestor FK
    status_recurso status
  }

  Contestacoes {
    int id PK
    tipo_contestacao tipo
    status_contestacao status
    bigint id_edital FK
    bigint id_usuario FK
    bigint id_candidatura FK
    text texto
  }

  ContestacaoHistorico {
    int id PK
    bigint id_contestacao FK
    bigint id_gestor FK
    bigint id_template_edital FK
    string canal
  }

  Notificacoes {
    int id PK
    string titulo
    origem_notificacao origem
    bigint id_edital FK
    bigint id_gestor FK
  }

  NotificacaoLeituras {
    int id PK
    bigint id_notificacao FK
    bigint id_usuario FK
    timestamp lida_em
  }

  PreferenciasNotificacao {
    int id PK
    bigint id_usuario FK
    boolean silenciar_email
    boolean silenciar_push
    boolean silenciar_oficiais
  }

  CarrosselItens {
    int id PK
    tipo_carrossel tipo
    string titulo
    int ordem
    bigint id_edital FK
    boolean auto_edital_habilitado
  }

  ConfiguracaoGlobal {
    int id PK
    decimal salario_minimo_referencia
  }

  FaixasSalarioMinimo {
    int id PK
    int ordem UK
    string rotulo
    boolean ativo
  }

  TemplatesBiblioteca {
    int id PK
    string titulo
    text corpo
    boolean ativo
  }

  TemplatesEdital {
    int id PK
    bigint id_template_origem FK
    bigint id_edital FK
    string titulo
  }
```

## W1 foundation (`01_schemas.sql` + `02_seeds.sql` + `03_auth.sql`)

| Área | Tabelas / enums | Notas |
| --- | --- | --- |
| Campus | `Campus` | Nomes IFB únicos; seed alinhado a `CampusNome` em `@repo/types` |
| Editais | `Editais`, `EditalArquivos` | Método/mérito/termos/flags; PDF vigente = último `EditalArquivos` por edital |
| Catálogo | `Cursos` slim | Sem campus/turno/vagas/janela de inscrição |
| Ofertas | `Ofertas`, `DistribuicaoCotas` | Unique `(edital, curso, campus, turno)`; cotas `vagas` e/ou `percentual` |
| Candidaturas | `Candidaturas` | FK `id_oferta` + `id_edital` denormalizado; partial unique ativo CPF×edital |

Enums W1: `metodo_selecao`, `merito_tipo`, `termos_modo`, `turno`, `status_candidatura` (+ `cancelada` / `desclassificada`), `tipo_vaga` alinhado a cotas (`AC`, `PPI`, `PCD`, `ESCOLA_PUBLICA`, `BAIXA_RENDA`).

`03_auth.sql`: senha bcrypt; unique email/CPF; partial unique
`candidaturas_usuario_edital_active_unique` on `(id_usuario, id_edital)` where status ∉ (`cancelada`, `reprovado`, `desclassificada`).

## W2 extras (`04_schema_extras.sql` + `05_seeds_extras.sql`)

| Área | Tabelas | Notas |
| --- | --- | --- |
| Contestações (REQ-1.3 / 5.1) | `Contestacoes`, `ContestacaoHistorico` | `tipo` ∈ IMPUGNACAO\|RECURSO\|JUSTIFICATIVA; status `enviada`→`indeferida` |
| Notificações (REQ-6.1) | `Notificacoes`, `NotificacaoLeituras`, `PreferenciasNotificacao` | Audiência via filtros; preferências de silêncio |
| Carrossel (REQ-6.2 / RS09) | `CarrosselItens` | `manual` \| `auto_edital` + toggle `auto_edital_habilitado` |
| Faixas SM (REQ-1.7) | `ConfiguracaoGlobal`, `FaixasSalarioMinimo` | Seed: SM referência; faixas vazias = regra B |
| Templates (REQ-5.2 stub) | `TemplatesBiblioteca`, `TemplatesEdital` | Biblioteca + cópia por edital; APIs em W30 |

`id_edital` columns on W2 tables have **hard FKs** to `Editais` (hardened with W1 on `db/extra-schemas`). Legacy `Recursos` remains for the old etapa-bound flow; new contestação UX uses `Contestacoes`.

## Mapeamento coluna SQL ↔ propriedade TypeORM

| Tabela SQL | Coluna | Entity / prop |
| --- | --- | --- |
| Campus | nome | Campus.nome |
| Editais | metodo_selecao / termos_modo | Edital (`metodo_selecao` / `termos_modo`) |
| Ofertas | turno / vagas_totais | Oferta.turno / Oferta.vagas_totais |
| DistribuicaoCotas | tipo_cota / vagas / percentual | DistribuicaoCota |
| Usuarios | id | User.id |
| Usuarios | ppi | User.ppi |
| Usuarios | senha | User.senha (`select: false`) |
| Enderecos | id_usuario | Endereco.id_usuario + relation `usuario` |
| Cursos | nome / eixo_tecnologico | Curso.nome / Curso.eixo_tecnologico |
| Cursos | area_conhecimento | Curso.area_conhecimento |
| Candidaturas | id_oferta / id_edital | Candidatura (+ relations) |
| Candidaturas | status | Candidatura.status (`status_candidatura`) |
| Candidaturas | tipo_vaga | Candidatura.tipo_vaga (`tipo_vaga`) |
| Candidaturas | protocolo | Candidatura.protocolo |
| Etapas Processo | (nome com espaço) | EtapaProcesso `@Entity('Etapas Processo')` |
| Contestacoes | tipo / status | Contestacao (`tipo_contestacao` / `status_contestacao`) |
| CarrosselItens | tipo | CarrosselItem (`tipo_carrossel`) |
| ConfiguracaoGlobal | salario_minimo_referencia | ConfiguracaoGlobal.salario_minimo_referencia |

Enums persistidos: ver `packages/types/src/db-enums.ts` (valores idênticos a `01_schemas.sql` + `04_schema_extras.sql`).

## Auth seed

`03_auth.sql` adiciona `senha` e índices de unicidade.

- `joao@teste.com` / `senha123`
- `admin@teste.com` / `admin123`

## W2 seed

`05_seeds_extras.sql` garante singleton `ConfiguracaoGlobal` (SM referência). Lista de faixas inicia vazia (regra B).

> Init scripts só rodam em volume vazio: use `docker compose down -v` ao mudar SQL.

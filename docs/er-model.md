# Modelo relacional (database/)

Fonte da verdade: scripts em `database/` montados em `/docker-entrypoint-initdb.d`.

> Visão geral de arquitetura, API e Docker: [architecture.md](architecture.md).

```mermaid
erDiagram
  Usuarios ||--o{ Enderecos : possui
  Usuarios ||--o{ Candidaturas : candidata
  Usuarios ||--o{ Gestores : pode_ser
  Cursos ||--o{ Candidaturas : recebe
  Candidaturas ||--o{ Documentos : anexa
  Candidaturas ||--o{ EtapasProcesso : passa_por
  Gestores ||--o{ EtapasProcesso : avalia
  EtapasProcesso ||--o{ Recursos : recebe
  Gestores ||--o{ Recursos : analisa

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

  Cursos {
    int id PK
    string nome
    string campus
    string modalidade
    string turno
    smallint vagas_totais
  }

  Candidaturas {
    int id PK
    bigint id_usuario FK
    bigint id_curso FK
    date data_inscricao
    status_candidatura status
    tipo_vaga tipo_vaga
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
```

## Mapeamento coluna SQL ↔ propriedade TypeORM

| Tabela SQL | Coluna | Entity / prop |
| --- | --- | --- |
| Usuarios | id | User.id |
| Usuarios | ppi | User.ppi |
| Usuarios | senha | User.senha (`select: false`) |
| Enderecos | id_usuario | Endereco.id_usuario + relation `usuario` |
| Cursos | nome | Curso.nome |
| Cursos | vagas_cotas_pii | Curso.vagas_cotas_pii |
| Cursos | area_conhecimento | Curso.area_conhecimento |
| Candidaturas | status | Candidatura.status (`status_candidatura`) |
| Candidaturas | tipo_vaga | Candidatura.tipo_vaga (`tipo_vaga`) |
| Etapas Processo | (nome com espaço) | EtapaProcesso `@Entity('Etapas Processo')` |

Enums persistidos: ver `packages/types/src/db-enums.ts` (valores idênticos a `01_schemas.sql`).

## Auth seed

`03_auth.sql` adiciona `senha` e índices de unicidade.

- `joao@teste.com` / `senha123`
- `admin@teste.com` / `admin123`

> Init scripts só rodam em volume vazio: use `docker compose down -v` ao mudar SQL.

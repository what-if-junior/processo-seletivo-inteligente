-- W5 seed: sample cronograma for edital id=1 (from 02_seeds.sql).

INSERT INTO "CronogramaEtapas"
(
    "id_edital",
    "tipo",
    "nome_exibido",
    "data_inicio",
    "data_fim",
    "descricao",
    "ordem",
    "override",
    "elegivel_impugnacao",
    "elegivel_recurso",
    "template_instrucao_id"
)
VALUES
(
    1,
    'INSCRICAO',
    'Período de Inscrições',
    '2024-01-01 00:00:00',
    '2024-12-31 23:59:59',
    'Inscrições online pelo PWA.',
    1,
    'AUTOMATICO',
    FALSE,
    FALSE,
    NULL
),
(
    1,
    'HOMOLOGACAO',
    'Homologação de Documentos',
    '2025-01-01 00:00:00',
    '2025-01-31 23:59:59',
    NULL,
    2,
    'AUTOMATICO',
    FALSE,
    TRUE,
    NULL
),
(
    1,
    'RESULTADO_PRELIMINAR',
    'Resultado Preliminar',
    '2025-02-01 00:00:00',
    '2025-02-05 23:59:59',
    NULL,
    3,
    'AUTOMATICO',
    TRUE,
    FALSE,
    NULL
),
(
    1,
    'MATRICULA',
    'Matrícula',
    '2025-03-01 00:00:00',
    '2025-03-15 23:59:59',
    NULL,
    4,
    'AUTOMATICO',
    FALSE,
    FALSE,
    NULL
);

SELECT setval(
    pg_get_serial_sequence('"CronogramaEtapas"', 'id'),
    (SELECT COALESCE(MAX(id), 1) FROM "CronogramaEtapas")
);

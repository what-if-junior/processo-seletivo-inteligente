-- W6 seed: sample doc types + delivery for edital id=1.
-- Depends on 02_seeds (edital/campus/curso) and 07_seeds_cronograma (etapas).

INSERT INTO "TiposDocumento"
(
    "id_edital",
    "nome",
    "descricao",
    "obrigatorio",
    "formatos",
    "tamanho_max_bytes",
    "fase",
    "tipo_cota",
    "ordem"
)
VALUES
(
    1,
    'Documento de identidade',
    'RG, CNH ou equivalente com foto.',
    TRUE,
    ARRAY['pdf', 'jpg', 'jpeg', 'png']::TEXT[],
    5242880,
    'INSCRICAO',
    NULL,
    1
),
(
    1,
    'Comprovante de renda',
    'Obrigatório apenas para cotas de baixa renda.',
    TRUE,
    ARRAY['pdf']::TEXT[],
    10485760,
    'INSCRICAO',
    'BAIXA_RENDA',
    2
),
(
    1,
    'Comprovante de matrícula escolar',
    'Entrega na fase de matrícula.',
    TRUE,
    ARRAY['pdf']::TEXT[],
    5242880,
    'MATRICULA',
    NULL,
    3
);

INSERT INTO "TipoDocumentoCampos"
(
    "id_tipo_documento",
    "tipo",
    "rotulo",
    "obrigatorio",
    "ordem",
    "formatos",
    "tamanho_max_bytes"
)
VALUES
(1, 'texto', 'Número do documento', TRUE, 1, NULL, NULL),
(1, 'documento', 'Arquivo digitalizado', TRUE, 2, ARRAY['pdf', 'jpg', 'png']::TEXT[], 5242880),
(2, 'numero', 'Renda familiar mensal (R$)', TRUE, 1, NULL, NULL),
(2, 'documento', 'Comprovante em PDF', TRUE, 2, ARRAY['pdf']::TEXT[], 10485760),
(3, 'documento', 'Declaração ou histórico', TRUE, 1, ARRAY['pdf']::TEXT[], 5242880);

-- CronogramaEtapas seed order: 1=INSCRICAO, 2=HOMOLOGACAO, 3=RESULTADO_PRELIMINAR, 4=MATRICULA
INSERT INTO "ConfiguracaoEntregaDocumental"
(
    "id_edital",
    "id_campus",
    "id_curso",
    "id_cronograma_etapa",
    "modo",
    "local_nome",
    "endereco",
    "horario",
    "contactos",
    "subtipo_online",
    "url_externa",
    "email_institucional",
    "instrucoes"
)
VALUES
(
    1,
    10,
    1,
    1,
    'ONLINE',
    NULL,
    NULL,
    NULL,
    NULL,
    'UPLOAD_NATIVO_PWA',
    NULL,
    NULL,
    'Envie os documentos pelo PWA durante a inscrição.'
),
(
    1,
    10,
    1,
    4,
    'PRESENCIAL',
    'Secretaria Acadêmica — Campus Taguatinga',
    'QNM 40, Área Especial 01 — Taguatinga/DF',
    'Seg–Sex 08:00–17:00',
    'matricula.taguatinga@ifb.edu.br',
    NULL,
    NULL,
    NULL,
    'Apresente originais e cópias. Uploads da PWA ficam ocultos nesta etapa.'
);

SELECT setval(
    pg_get_serial_sequence('"TiposDocumento"', 'id'),
    (SELECT COALESCE(MAX(id), 1) FROM "TiposDocumento")
);

SELECT setval(
    pg_get_serial_sequence('"TipoDocumentoCampos"', 'id'),
    (SELECT COALESCE(MAX(id), 1) FROM "TipoDocumentoCampos")
);

SELECT setval(
    pg_get_serial_sequence('"ConfiguracaoEntregaDocumental"', 'id'),
    (SELECT COALESCE(MAX(id), 1) FROM "ConfiguracaoEntregaDocumental")
);

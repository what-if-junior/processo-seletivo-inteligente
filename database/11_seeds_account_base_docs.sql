-- W8 seed: sample account-base document types (empty DocumentosConta).
-- Depends on 10_account_base_docs.sql.

INSERT INTO "TiposDocumentoBase"
(
    "nome",
    "descricao",
    "obrigatorio",
    "formatos",
    "tamanho_max_bytes",
    "fase",
    "ordem",
    "ativo"
)
VALUES
(
    'Documento de identidade (base)',
    'Tipo base da conta: herdado por novos editais (desmarcável).',
    TRUE,
    ARRAY['pdf', 'jpg', 'jpeg', 'png']::TEXT[],
    5242880,
    'INSCRICAO',
    1,
    TRUE
),
(
    'Comprovante de residência (base)',
    'Tipo base opcional para Meus Dados / reutilização futura.',
    FALSE,
    ARRAY['pdf']::TEXT[],
    5242880,
    'INSCRICAO',
    2,
    TRUE
);

SELECT setval(
    pg_get_serial_sequence('"TiposDocumentoBase"', 'id'),
    (SELECT COALESCE(MAX(id), 1) FROM "TiposDocumentoBase")
);

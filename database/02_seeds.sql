TRUNCATE TABLE
    "Recursos",
    "Etapas Processo",
    "Documentos",
    "Candidaturas",
    "DistribuicaoCotas",
    "Ofertas",
    "EditalArquivos",
    "Editais",
    "Cursos",
    "Campus",
    "Gestores",
    "Enderecos",
    "Usuarios"
RESTART IDENTITY CASCADE;

INSERT INTO "Campus" ("id", "nome")
OVERRIDING SYSTEM VALUE VALUES
(1, 'Brasília'),
(2, 'Ceilândia'),
(3, 'Estrutural'),
(4, 'Gama'),
(5, 'Planaltina'),
(6, 'Recanto das Emas'),
(7, 'Riacho Fundo'),
(8, 'Samambaia'),
(9, 'São Sebastião'),
(10, 'Taguatinga'),
(11, 'Sol Nascente (Campus em construção)'),
(12, 'Sobradinho (Campus em construção)');

INSERT INTO "Editais"
("id", "numero_ano", "metodo_selecao", "merito_tipo", "is_simplificado", "fallback_ac_para_rv", "termos_modo", "termos_valor", "link_oficial", "publicado", "inscricoes_abertas")
OVERRIDING SYSTEM VALUE VALUES
(
    1,
    '001/2024',
    'ALEATORIO',
    NULL,
    FALSE,
    FALSE,
    'PDF',
    'editais/001-2024/termos.pdf',
    'https://www.ifb.edu.br/processos-seletivos/001-2024',
    TRUE,
    TRUE
);

INSERT INTO "EditalArquivos" ("id_edital", "arquivo", "criado_em")
VALUES
(1, '\x255044462d312e340a25e2e3cfd30a312030206f626a0a3c3c0a2f54797065202f436174616c6f670a2f50616765732031200a2f4b696473205b32203020525d0a3e3e0a656e646f626a0a332030206f626a0a3c3c0a2f54797065202f50616765730a2f4b696473205b34203020525d0a2f436f756e7420310a3e3e0a656e646f626a0a342030206f626a0a3c3c0a2f54797065202f506167650a2f506172656e742033203020520a3e3e0a656e646f626a0a787265660a3020340a3030303030303030303020363535333520660a30303030303030303135203030303030206e0a30303030303030303630203030303030206e0a30303030303030313131203030303030206e0a747261696c65720a3c3c0a2f53697a6520340a2f526f6f742031203020520a3e3e0a7374617274787265660a3139390a2525454f460a', NOW());

INSERT INTO "Cursos"
("id", "nome", "eixo_tecnologico", "requisito_escolaridade", "area_conhecimento")
OVERRIDING SYSTEM VALUE VALUES
(1, 'Técnico em Desenvolvimento de Sistemas', 'Tecnologia da Informação', 'Ensino Médio completo', 'Tecnologia da Informação'),
(2, 'Técnico em Administração', 'Gestão e Negócios', 'Ensino Médio completo', 'Gestão e Negócios');

INSERT INTO "Ofertas"
("id", "id_edital", "id_curso", "id_campus", "turno", "vagas_totais")
OVERRIDING SYSTEM VALUE VALUES
(1, 1, 1, 10, 'NOTURNO', 40),
(2, 1, 2, 1, 'MATUTINO', 35);

INSERT INTO "DistribuicaoCotas" ("id_oferta", "tipo_cota", "vagas", "percentual")
VALUES
(1, 'AC', 28, NULL),
(1, 'PPI', 5, NULL),
(1, 'PCD', 2, NULL),
(1, 'ESCOLA_PUBLICA', 3, NULL),
(1, 'BAIXA_RENDA', 2, NULL),
(2, 'AC', 24, NULL),
(2, 'PPI', 4, NULL),
(2, 'PCD', 1, NULL),
(2, 'ESCOLA_PUBLICA', 4, NULL),
(2, 'BAIXA_RENDA', 2, NULL);

INSERT INTO "Usuarios"
("id", "nome_completo", "email", "CPF", "data_nascimento", "telefone", "nome_RG", "RG", "nome_historico_escolar", "historico_escolar", "renda_familiar", "foto_alt", "foto", "ppi", "pcd", "criado_em", "atualizado_em", "token")
OVERRIDING SYSTEM VALUE VALUES
(
    1,
    'Candidato João Silva',
    'joao@teste.com',
    '123.456.789-00',
    '1995-05-20',
    '11999999999',
    'rg_joao.pdf',
    '\x',
    'historico_joao.pdf',
    '\x',
    1500.00,
    'Foto de perfil de João',
    '\x',
    'pardo',
    false,
    NOW(),
    NOW(),
    'token_acesso_candidato_1'
),
(
    2,
    'Maria Gestora',
    'admin@teste.com',
    '000.000.000-00',
    '1980-01-01',
    '11888888888',
    'rg_maria.pdf',
    '\x',
    'historico_maria.pdf',
    '\x',
    5000.00,
    'Foto de rosto da Maria',
    '\x',
    NULL,
    false,
    NOW(),
    NOW(),
    'token_acesso_gestor_1'
);

INSERT INTO "Enderecos"
("id_usuario", "estado", "cidade", "CEP", "logradouro", "bairro", "numero_residencia", "complemento")
VALUES
(1, 'DF', 'Brasilia', '01000-000', 'SQN Quadra 1', 'Asa Norte', '2', 'Apto 100'),
(2, 'DF', 'Brasilia', '02000-000', 'QNM 38 Conjunto A', 'Taguatinga', '15', NULL);

INSERT INTO "Gestores"
("id", "id_usuario", "funcao")
OVERRIDING SYSTEM VALUE VALUES
(1, 2, 'Coordenador de Processo Seletivo');

INSERT INTO "Candidaturas"
("id", "id_usuario", "id_oferta", "id_edital", "data_inscricao", "status", "tipo_ingresso", "tipo_vaga", "protocolo")
OVERRIDING SYSTEM VALUE VALUES
(1, 1, 1, 1, '2024-05-21', 'inscricao_recebida', 'sorteio', 'AC', NULL);

INSERT INTO "Documentos"
("id_candidatura", "tipo_documento", "nome_arquivo", "arquivo", "status_documento", "criado_em")
VALUES
(1, 'comprovante_residencia', 'conta_luz.pdf', '\x', 'em_analise', NOW());

INSERT INTO "Etapas Processo"
("id", "id_candidatura", "id_gestor", "tipo_etapa", "status", "pontuacao", "observacoes", "data_realizacao", "prazo")
OVERRIDING SYSTEM VALUE VALUES
(1, 1, 1, 'analise_documental', 'pendente', NULL, 'Aguardando verificação', '2024-06-01', '2024-06-10');

INSERT INTO "Recursos"
("id_etapa_processo", "data_solicitacao", "titulo", "nome_anexo", "arquivo_anexo", "status", "id_gestor", "observacoes")
VALUES
(1, '2024-06-05', 'Revisão de Documento', 'novo_comprovante_res.pdf', '\x', 'aberto', 1, 'Envio de documento atualizado');

-- OVERRIDING SYSTEM VALUE does not advance IDENTITY; sync sequences for CRUD inserts.
SELECT setval(pg_get_serial_sequence('"Campus"', 'id'), (SELECT COALESCE(MAX(id), 1) FROM "Campus"));
SELECT setval(pg_get_serial_sequence('"Editais"', 'id'), (SELECT COALESCE(MAX(id), 1) FROM "Editais"));
SELECT setval(pg_get_serial_sequence('"Cursos"', 'id'), (SELECT COALESCE(MAX(id), 1) FROM "Cursos"));
SELECT setval(pg_get_serial_sequence('"Ofertas"', 'id'), (SELECT COALESCE(MAX(id), 1) FROM "Ofertas"));
SELECT setval(pg_get_serial_sequence('"Usuarios"', 'id'), (SELECT COALESCE(MAX(id), 1) FROM "Usuarios"));
SELECT setval(pg_get_serial_sequence('"Gestores"', 'id'), (SELECT COALESCE(MAX(id), 1) FROM "Gestores"));
SELECT setval(pg_get_serial_sequence('"Candidaturas"', 'id'), (SELECT COALESCE(MAX(id), 1) FROM "Candidaturas"));
SELECT setval(pg_get_serial_sequence('"Etapas Processo"', 'id'), (SELECT COALESCE(MAX(id), 1) FROM "Etapas Processo"));

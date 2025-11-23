TRUNCATE TABLE "Recursos", "Etapas Processo", "Documentos", "Candidaturas", "Gestores", "Enderecos", "Usuarios", "Cursos" RESTART IDENTITY CASCADE;

INSERT INTO "Cursos" 
("id", "nome", "duracao_semestres", "campus", "modalidade", "turno", "vagas_totais", "vagas_cotas_pii", "vagas_pcd", "data_inicio_inscricao", "data_fim_inscricao", "area_conhecimento")
OVERRIDING SYSTEM VALUE VALUES 
(1, 'Técnico em Desenvolvimento de Sistemas', '4', 'Campus Taguatinga', 'Presencial', 'Noturno', 40, 5, 2, '2024-01-01', '2024-12-31', 'Tecnologia da Informação'),
(2, 'Técnico em Administração', '4', 'Campus Brasilia', 'EAD', 'Matutino', 35, 4, 1, '2024-02-01', '2024-12-31', 'Gestao e Negocios');


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
("id", "id_usuario", "id_curso", "data_inscricao", "status", "tipo_ingresso", "tipo_vaga")
OVERRIDING SYSTEM VALUE VALUES
(1, 1, 1, '2024-05-21', 'inscricao_recebida', 'sorteio', 'AC');

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
-- W29/W30 — Contestações + Templates seeds (idempotent).
-- ContestacaoHistorico.id_contestacao insertability is a TypeORM entity fix (no DDL).

INSERT INTO "TemplatesBiblioteca"
("titulo", "corpo", "canal", "tipo_uso", "ativo", "criado_em", "atualizado_em")
SELECT
  'Resposta padrão a contestação',
  'Prezado(a) {{nome}},

Recebemos a sua contestação referente ao edital e apresentamos a seguinte resposta:

{{corpo}}

Atenciosamente,
Comissão do Processo Seletivo',
  'ambos',
  'RESPOSTA_CONTESTACAO',
  TRUE,
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "TemplatesBiblioteca"
  WHERE "tipo_uso" = 'RESPOSTA_CONTESTACAO' AND "titulo" = 'Resposta padrão a contestação'
);

INSERT INTO "TemplatesBiblioteca"
("titulo", "corpo", "canal", "tipo_uso", "ativo", "criado_em", "atualizado_em")
SELECT
  'Impugnação por e-mail',
  'Assunto: Impugnação — Edital {{edital}}

Prezados,

Venho por meio deste apresentar impugnação ao edital, pelos seguintes fundamentos:

{{texto}}

Nome: {{nome}}
E-mail: {{email}}',
  'email',
  'IMPUGNACAO_EMAIL',
  TRUE,
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "TemplatesBiblioteca"
  WHERE "tipo_uso" = 'IMPUGNACAO_EMAIL' AND "titulo" = 'Impugnação por e-mail'
);

INSERT INTO "TemplatesBiblioteca"
("titulo", "corpo", "canal", "tipo_uso", "ativo", "criado_em", "atualizado_em")
SELECT
  'Instrução de etapa — recurso/impugnação',
  'Nesta etapa você pode apresentar recurso ou impugnação conforme o cronograma do edital. Inclua fundamentação clara e, se necessário, um anexo em PDF/JPEG/PNG (máx. 5MB).',
  'pwa',
  'INSTRUCAO_ETAPA',
  TRUE,
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "TemplatesBiblioteca"
  WHERE "tipo_uso" = 'INSTRUCAO_ETAPA' AND "titulo" = 'Instrução de etapa — recurso/impugnação'
);

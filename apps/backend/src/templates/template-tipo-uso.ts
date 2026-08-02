/** Locked tipo_uso vocabulary (varchar) for TemplatesBiblioteca / TemplatesEdital. */
export const TemplateTipoUso = {
  RESPOSTA_CONTESTACAO: 'RESPOSTA_CONTESTACAO',
  INSTRUCAO_ETAPA: 'INSTRUCAO_ETAPA',
  IMPUGNACAO_EMAIL: 'IMPUGNACAO_EMAIL',
} as const;

export type TemplateTipoUsoValue =
  (typeof TemplateTipoUso)[keyof typeof TemplateTipoUso];

export const TEMPLATE_CANAIS = ['email', 'pwa', 'ambos'] as const;

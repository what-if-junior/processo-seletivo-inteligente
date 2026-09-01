/** Tipos de operação da fila de ingestão RAG (W34). */
export type AssistantOperacao = 'insert' | 'update' | 'delete';

/** Status da fila de ingestão RAG (W34). */
export type AssistantIngestaoStatus = 'pendente' | 'enviado' | 'erro';

/** Sentimento calculado pelo n8n (LLM) para uma interação de chat (W34). */
export type AssistantSentimento = 'positivo' | 'neutro' | 'negativo' | null;

/** Feedback do usuário (thumbs) em uma resposta do assistente (W34). */
export type AssistantThumbs = 'up' | 'down' | null;

/** Linha de auditoria de uma interação de chat (tabela AssistantInteracoes). */
export interface AssistantInteracao {
  id: number;
  session_id: string;
  id_usuario?: number | null;
  page_id?: string | null;
  chat_input: string;
  audio_flag: boolean;
  resposta_agente?: string | null;
  arquivos_usados?: unknown[] | null;
  sentimento?: AssistantSentimento;
  thumbs?: AssistantThumbs;
  criado_em: Date;
}

/** Item da fila de sincronização edital→n8n RAG (tabela AssistantIngestoes). */
export interface AssistantIngestao {
  id: number;
  id_edital: number;
  operacao: AssistantOperacao;
  status: AssistantIngestaoStatus;
  erro?: string | null;
  enviado_em?: Date | null;
  criado_em: Date;
}

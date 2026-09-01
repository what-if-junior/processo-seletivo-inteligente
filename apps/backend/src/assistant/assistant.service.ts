import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomUUID } from 'node:crypto';
import {
  AssistantOperacao,
  AssistantIngestaoStatus,
  AssistantSentimento,
  StatusCandidatura,
} from '@repo/types';
import { AssistantInteracao } from './entities/assistant-interacao.entity';
import { AssistantIngestao } from './entities/assistant-ingestao.entity';
import { ChatDto } from './dto/chat.dto';
import { FeedbackDto } from './dto/feedback.dto';
import { Edital } from '../editais/entities/edital.entity';
import { Candidatura } from '../candidaturas/entities/candidatura.entity';
import { User } from '../user/entities/user.entity';
import { HubService } from '../hub/hub.service';

/** Limite de áudio aceito pelo assistente: 25MB em bytes. */
const AUDIO_MAX_BYTES = 26_214_400;

/** Status de candidatura considerados "ativos" para contexto do chat. */
const STATUS_CANDIDATURA_ATIVOS = new Set<StatusCandidatura>([
  StatusCandidatura.INSCRICAO_RECEBIDA,
  StatusCandidatura.PRE_SELECIONADO,
  StatusCandidatura.ANALISE_DOCUMENTAL,
  StatusCandidatura.APROVADO,
]);

/** Mensagem genérica usada quando nenhuma FAQ casa com a pergunta. */
const FALLBACK_MENSAGEM =
  'Ainda não tenho essa informação. Fale com a central de atendimento ou consulte o edital oficial.';

/** Payload decodificado do JWT do candidato. */
type JwtPayload = { sub: number | string; email?: string };

/** Resposta bruta do webhook de chat do n8n. */
interface N8nChatResult {
  output: string;
  sources?: unknown[];
  sentiment?: AssistantSentimento;
  audio?: string;
}

/** Resposta normalizada do endpoint POST /assistant/chat. */
export interface ChatResponse {
  resposta: string;
  messageId: number;
  sessionId?: string;
  precisaLogin: boolean;
  sources?: unknown[] | null;
  sentiment?: AssistantSentimento;
  audio?: string | null;
}

/** Resultado do flush da fila de ingestão para o n8n. */
export interface FlushIngestoesResult {
  enviados: number;
  erros: number;
  detalhes: Array<{
    id: number;
    id_edital: number;
    operacao: AssistantOperacao;
    status: AssistantIngestaoStatus;
    erro?: string;
  }>;
}

/**
 * Serviço central do assistente W34 (REQ-7.x).
 *
 * Responsabilidades:
 * - `chat`: orquestra a conversa com o n8n (com contexto opcional do candidato),
 *   com fallback determinístico para as FAQs do hub quando o n8n está indisponível.
 * - `feedback`: registra o thumbs up/down do usuário sobre uma resposta.
 * - `enqueueIngestao` / `flushIngestoes`: fila de sincronização edital → índice RAG.
 * - `listAuditoria` / `listIngestoes`: consultas administrativas.
 */
@Injectable()
export class AssistantService {
  constructor(
    @InjectRepository(AssistantInteracao)
    private readonly interacaoRepo: Repository<AssistantInteracao>,
    @InjectRepository(AssistantIngestao)
    private readonly ingestaoRepo: Repository<AssistantIngestao>,
    @InjectRepository(Edital)
    private readonly editalRepo: Repository<Edital>,
    @InjectRepository(Candidatura)
    private readonly candidaturaRepo: Repository<Candidatura>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly hubService: HubService,
  ) {}

  /**
   * Envia a mensagem do usuário ao assistente (n8n) e persiste a auditoria.
   *
   * A autenticação é opcional: quando um bearer token válido é informado, o
   * contexto do candidato (email, cidade e candidaturas ativas) é anexado ao
   * payload enviado ao n8n. Token ausente/inválido → tratado como anônimo.
   *
   * Se o n8n não estiver configurado ou falhar, cai no fallback determinístico
   * de FAQ (HubFaqItem) para nunca deixar o usuário sem resposta.
   */
  async chat(dto: ChatDto, bearerToken?: string | null): Promise<ChatResponse> {
    // 1. Autenticação opcional: extrai contexto do candidato quando possível.
    let email: string | null = null;
    let cidade: string | null = null;
    let candidaturasAtivas: string[] = [];
    let idUsuario: number | null = null;

    if (bearerToken) {
      try {
        const token = bearerToken.startsWith('Bearer ')
          ? bearerToken.slice(7)
          : bearerToken;
        const payload = this.jwtService.verify<JwtPayload>(token);
        const sub = Number(payload.sub);
        if (Number.isFinite(sub) && sub > 0) {
          const user = await this.userRepo.findOne({
            where: { id: sub },
            relations: { enderecos: true },
          });
          if (user) {
            idUsuario = user.id;
            email = user.email;
            cidade = user.enderecos?.[0]?.cidade ?? null;

            const candidaturas = await this.candidaturaRepo.find({
              where: { id_usuario: sub },
              relations: { oferta: { edital: true } },
            });
            candidaturasAtivas = candidaturas
              .filter((c) => STATUS_CANDIDATURA_ATIVOS.has(c.status))
              .map((c) => c.oferta?.edital?.numero_ano ?? String(c.id_edital));
          }
        }
      } catch {
        // Token inválido/expirado → segue como anônimo.
      }
    }

    // 2. Validação do áudio (base64 + limite de 25MB).
    const audio = dto.audio ? this.validateAudio(dto.audio) : undefined;

    // 3. Chamada ao n8n (null quando não configurado ou em falha).
    const n8nResult = await this.callN8nChat(
      dto,
      email,
      cidade,
      candidaturasAtivas,
      audio,
    );

    // 4. Resposta final: n8n ou fallback determinístico de FAQ.
    const resposta =
      n8nResult?.output ?? (await this.faqFallback(dto.chatInput));
    const sources = n8nResult?.sources ?? null;
    const sentiment = n8nResult?.sentiment ?? null;
    const respostaAudio = n8nResult?.audio ?? null;

    // 5. Auditoria da interação.
    const saved = await this.interacaoRepo.save(
      this.interacaoRepo.create({
        session_id: dto.sessionId ?? randomUUID(),
        id_usuario: idUsuario,
        page_id: dto.pageId ?? null,
        chat_input: dto.chatInput,
        audio_flag: !!dto.audio,
        resposta_agente: resposta,
        arquivos_usados: sources,
        sentimento: sentiment,
      }),
    );

    return {
      resposta,
      messageId: saved.id,
      sessionId: dto.sessionId,
      precisaLogin: !email,
      sources,
      sentiment,
      audio: respostaAudio,
    };
  }

  /**
   * Registra o feedback (thumbs up/down) do usuário sobre uma resposta.
   * Lança NotFoundException quando o messageId não existe.
   */
  async feedback(dto: FeedbackDto): Promise<{ ok: true }> {
    const result = await this.interacaoRepo.update(
      { id: Number(dto.messageId) },
      { thumbs: dto.thumbs },
    );
    if (!result.affected) {
      throw new NotFoundException('Interação não encontrada');
    }
    return { ok: true };
  }

  /**
   * Enfileira uma operação de ingestão (insert|update|delete) de um edital
   * para sincronização posterior com o índice RAG do n8n.
   */
  async enqueueIngestao(
    editalId: number,
    operacao: AssistantOperacao,
  ): Promise<AssistantIngestao> {
    return this.ingestaoRepo.save(
      this.ingestaoRepo.create({
        id_edital: editalId,
        operacao,
        status: 'pendente',
      }),
    );
  }

  /**
   * Descarrega a fila de ingestões pendentes para o webhook do n8n.
   *
   * Para cada item pendente: carrega o edital, monta o payload (id apenas para
   * delete; metadados completos para insert/update) e envia via POST. Atualiza
   * o status da fila para 'enviado' ou 'erro' conforme o resultado.
   */
  async flushIngestoes(): Promise<FlushIngestoesResult> {
    const pendentes = await this.ingestaoRepo.find({
      where: { status: 'pendente' },
      order: { id: 'ASC' },
    });

    if (pendentes.length === 0) {
      return { enviados: 0, erros: 0, detalhes: [] };
    }

    const baseUrl = this.configService.get<string>('N8N_BASE_URL');
    const ingestUrl = this.configService.get<string>('N8N_INGEST_URL');
    const n8nUser = this.configService.get<string>('N8N_USER');
    const n8nPass = this.configService.get<string>('N8N_PASSWORD');

    // Sem configuração do n8n → marca tudo como erro e encerra.
    if (!baseUrl || !ingestUrl || !n8nUser || !n8nPass) {
      const detalhes: FlushIngestoesResult['detalhes'] = [];
      for (const item of pendentes) {
        item.status = 'erro';
        item.erro = 'N8N_INGEST_URL não configurado';
        await this.ingestaoRepo.save(item);
        detalhes.push({
          id: item.id,
          id_edital: item.id_edital,
          operacao: item.operacao,
          status: item.status,
          erro: item.erro,
        });
      }
      return { enviados: 0, erros: pendentes.length, detalhes };
    }

    const auth =
      'Basic ' + Buffer.from(`${n8nUser}:${n8nPass}`).toString('base64');
    let enviados = 0;
    let erros = 0;
    const detalhes: FlushIngestoesResult['detalhes'] = [];

    for (const item of pendentes) {
      const edital = await this.editalRepo.findOne({
        where: { id: item.id_edital },
      });

      if (!edital) {
        item.status = 'erro';
        item.erro = 'Edital não encontrado';
        await this.ingestaoRepo.save(item);
        erros++;
        detalhes.push({
          id: item.id,
          id_edital: item.id_edital,
          operacao: item.operacao,
          status: item.status,
          erro: item.erro,
        });
        continue;
      }

      const payload =
        item.operacao === 'delete'
          ? [{ id: edital.id }]
          : [
              {
                id: edital.id,
                numero_ano: edital.numero_ano,
                metodo_selecao: edital.metodo_selecao,
                termos_modo: edital.termos_modo,
                termos_valor: edital.termos_valor,
                link_oficial: edital.link_oficial,
                publicado: edital.publicado,
                inscricoes_abertas: edital.inscricoes_abertas,
              },
            ];

      try {
        const res = await globalThis.fetch(baseUrl + ingestUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: auth,
          },
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          item.status = 'enviado';
          item.enviado_em = new Date();
          item.erro = null;
          enviados++;
        } else {
          item.status = 'erro';
          item.erro = 'HTTP ' + res.status;
          erros++;
        }
      } catch (err) {
        item.status = 'erro';
        item.erro = err instanceof Error ? err.message : String(err);
        erros++;
      }

      await this.ingestaoRepo.save(item);
      detalhes.push({
        id: item.id,
        id_edital: item.id_edital,
        operacao: item.operacao,
        status: item.status,
        erro: item.erro ?? undefined,
      });
    }

    return { enviados, erros, detalhes };
  }

  /** Auditoria das interações de chat (admin) — últimas 200. */
  async listAuditoria(): Promise<AssistantInteracao[]> {
    return this.interacaoRepo.find({ order: { id: 'DESC' }, take: 200 });
  }

  /** Fila de ingestões (admin) — últimas 200. */
  async listIngestoes(): Promise<AssistantIngestao[]> {
    return this.ingestaoRepo.find({ order: { id: 'DESC' }, take: 200 });
  }

  /**
   * Valida o áudio base64: formato válido e tamanho ≤ 25MB.
   * Retorna o base64 normalizado (sem espaços) para envio ao n8n.
   */
  private validateAudio(audio: string): string {
    const cleaned = audio.replace(/\s+/g, '');
    if (
      cleaned.length === 0 ||
      cleaned.length % 4 !== 0 ||
      !/^[A-Za-z0-9+/]+={0,2}$/.test(cleaned)
    ) {
      throw new BadRequestException('Áudio inválido: não é base64 válido');
    }
    try {
      const buffer = Buffer.from(cleaned, 'base64');
      if (buffer.length > AUDIO_MAX_BYTES) {
        throw new BadRequestException(
          'Áudio excede o limite de 25MB (26.214.400 bytes)',
        );
      }
      return cleaned;
    } catch (err) {
      if (err instanceof BadRequestException) {
        throw err;
      }
      throw new BadRequestException('Áudio inválido: não é base64 válido');
    }
  }

  /**
   * Chama o webhook de chat do n8n com o contexto do candidato.
   * Retorna null quando as variáveis de ambiente não estão configuradas,
   * a requisição falha ou a resposta não é ok (→ fallback de FAQ).
   */
  private async callN8nChat(
    dto: ChatDto,
    email: string | null,
    cidade: string | null,
    candidaturasAtivas: string[],
    audio?: string,
  ): Promise<N8nChatResult | null> {
    const baseUrl = this.configService.get<string>('N8N_BASE_URL');
    const chatUrl = this.configService.get<string>('N8N_CHAT_URL');
    const n8nUser = this.configService.get<string>('N8N_USER');
    const n8nPass = this.configService.get<string>('N8N_PASSWORD');

    if (!baseUrl || !chatUrl || !n8nUser || !n8nPass) {
      return null;
    }

    try {
      const res = await globalThis.fetch(baseUrl + chatUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization:
            'Basic ' + Buffer.from(`${n8nUser}:${n8nPass}`).toString('base64'),
        },
        body: JSON.stringify({
          sessionId: dto.sessionId,
          pageId: dto.pageId,
          chatInput: dto.chatInput,
          audio,
          email,
          cidade,
          candidaturasAtivas,
        }),
      });
      if (!res.ok) {
        return null;
      }
      return (await res.json()) as N8nChatResult;
    } catch {
      return null;
    }
  }

  /**
   * Fallback determinístico: casa a pergunta do usuário com as FAQs ativas do
   * hub (match simples por `includes`). Sem match → mensagem genérica.
   */
  private async faqFallback(chatInput: string): Promise<string> {
    const hub = await this.hubService.getPublic();
    const input = chatInput.toLowerCase();
    const match = hub.faqs.find((faq) =>
      input.includes(faq.pergunta.toLowerCase()),
    );
    return match?.resposta ?? FALLBACK_MENSAGEM;
  }
}
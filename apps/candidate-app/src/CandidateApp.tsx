"use client"

import { useState, useMemo, useRef, useEffect, type ReactNode, type ElementType } from "react"
import {
  Home, FileText, Bell, User, Search, ArrowLeft, Camera,
  Upload, MessageCircle, CheckCircle, Clock, AlertCircle,
  X, Shield, Calendar, Check, AlertTriangle, Mic, Send,
  Info, Eye, LogOut, ChevronRight, ChevronDown,
  MapPin, Loader2, GraduationCap,
  Award, UserCheck,
  RefreshCw, HelpCircle, Plus
} from "lucide-react"
import { login, logout, loginPayloadFromIdentifier, register } from "./lib/auth"
import { apiFetch, getAccessToken } from "./lib/api"
import { useDocumentos, useInscricoes, useOfertas, useProfile } from "./lib/hooks"
import {
  tipoVagaFromWizard,
  type EditalCard as EditalCardData,
  AVISO_UM_CURSO_POR_EDITAL,
  messageFromInscricaoApiError,
  filterEditalCards,
  uniqueEditaisFromCards,
  uniqueCampusesFromCards,
  isBaixaRendaCota,
  socioWizardIssues,
  buildSocioPayload,
  statusCandidaturaToInscricaoStep,
  wizardCotasStepReady,
  type FaixasSmPublicEnvelope,
} from "./lib/mappers"
import {
  MOCK_PROFILE,
  firstNameFrom,
  fetchCurrentUser,
  getSessionUserId,
  maskCpf,
  profileMinimumIssues,
  shouldUseMocks,
  updateCurrentUser,
} from "./lib/session"
import {
  deleteDocumentoConta,
  fetchDocumentosConta,
  fetchTiposBaseAtivos,
  mergeDocumentoContaSlots,
  upsertDocumentoConta,
  type TipoBaseSlot,
} from "./lib/documentos-conta"
import {
  fileToBase64,
  isMenorNaData,
  MSG_MENOR_RESPONSAVEL_CLIENT,
  responsavelSubmitIssues,
} from "./lib/menoridade"
import {
  enqueueUpload,
  fileToDataUrl,
  flushUploadQueue,
  isBrowserOffline,
  listUploadQueue,
  onOnlineFlush,
  type QueuedUpload,
} from "./lib/upload-queue"

// ─── Types ────────────────────────────────────────────────────────────────────
type Screen =
  | "home" | "processos" | "edital" | "wizard" | "docs"
  | "camera" | "inscricoes" | "notificacoes" | "perfil" | "meus-dados"
type NavTab = "home" | "inscricoes" | "notificacoes" | "perfil"
type WizardStep = 1 | 2 | 3 | 4

// ─── Mock Data ────────────────────────────────────────────────────────────────
const EDITAIS: EditalCardData[] = [
  { id: "1", id_oferta: 1, id_edital: 1, id_campus: 1, titulo: "Técnico em Informática", editalLabel: "2025.1-IFB", sub: "Integrado ao Ensino Médio", campus: "Campus Brasília", turno: "Integral", area_conhecimento: "Informática", vagas: 40, prazo: "10/01/2025", status: "aberto", tipo: "Técnico" },
  { id: "2", id_oferta: 2, id_edital: 1, id_campus: 2, titulo: "Superior em Computação", editalLabel: "2025.1-IFB", sub: "Bacharelado", campus: "Campus Taguatinga", turno: "Noturno", area_conhecimento: "Computação", vagas: 30, prazo: "15/01/2025", status: "aberto", tipo: "Superior" },
  { id: "3", id_oferta: 3, id_edital: 2, id_campus: 3, titulo: "Técnico em Hotelaria", editalLabel: "2024.2-IFB", sub: "Subsequente", campus: "Campus Planaltina", turno: "Matutino", area_conhecimento: "Turismo e Hospitalidade", vagas: 35, prazo: "Encerrado", status: "encerrado", tipo: "Técnico" },
  { id: "4", id_oferta: 4, id_edital: 1, id_campus: 4, titulo: "Técnico em Moda", editalLabel: "2025.1-IFB", sub: "Integrado ao Ensino Médio", campus: "Campus Samambaia", turno: "Vespertino", area_conhecimento: "Design", vagas: 25, prazo: "12/01/2025", status: "aberto", tipo: "Técnico" },
  { id: "5", id_oferta: 5, id_edital: 1, id_campus: 5, titulo: "Ensino Médio Integrado", editalLabel: "2025.1-IFB", sub: "Regular", campus: "Campus Gama", turno: "Integral", area_conhecimento: "Ensino Médio", vagas: 60, prazo: "08/01/2025", status: "aberto", tipo: "Médio" },
]

const CRONOGRAMA = [
  { data: "12/11/2024", etapa: "Publicação do Edital", st: "done" },
  { data: "14/11 a 10/01/2025", etapa: "Abertura do Período de Inscrições", st: "active" },
  { data: "06 a 13/01/2025", etapa: "Entrega de documentação comprobatória de reserva de vaga (on-line ou presencial)", st: "pending" },
  { data: "16/01/2025", etapa: "Publicação do Resultado Preliminar da Análise de Documentação Comprobatória de Reserva de Vaga", st: "pending" },
  { data: "17/01/2025", etapa: "Período de apresentação de recurso", st: "pending" },
  { data: "22/01/2025", etapa: "Publicação da Convocação para Autodeclaração de Candidatos Negros (Heteroidentificação)", st: "pending" },
  { data: "26/01/2025", etapa: "Interposição de Recursos contra o Resultado Preliminar da Autodeclaração", st: "pending" },
]

const DOCS_LIST = [
  { id: "1", nome: "RG ou CNH (frente e verso)", obrigatorio: true, status: "enviado", tipo: "upload" },
  { id: "2", nome: "CPF", obrigatorio: true, status: "pendente", tipo: "upload" },
  { id: "3", nome: "Histórico Escolar", obrigatorio: true, status: "enviado", tipo: "upload" },
  { id: "4", nome: "Comprovante de Renda Familiar", obrigatorio: true, status: "pendente", tipo: "upload" },
  { id: "5", nome: "Laudo Médico (PcD)", obrigatorio: false, status: "na", tipo: "upload" },
  { id: "6", nome: "Foto para Autodeclaração Étnico-Racial", obrigatorio: true, status: "pendente", tipo: "camera" },
]

const NOTIFS = [
  { id: "1", tipo: "erro", titulo: "Documento pendente", msg: "Seu CPF foi enviado em baixa resolução. Por favor, reenvie o documento.", tempo: "Há 2 horas", lida: false },
  { id: "2", tipo: "info", titulo: "Inscrição recebida", msg: "Sua inscrição no Técnico em Hotelaria foi recebida com sucesso e está em análise.", tempo: "Há 1 dia", lida: false },
  { id: "3", tipo: "sucesso", titulo: "Documento aprovado", msg: "Seu histórico escolar foi validado pela equipe do IFB.", tempo: "Há 3 dias", lida: true },
  { id: "4", tipo: "aviso", titulo: "Prazo se aproximando", msg: "O prazo de inscrição para Técnico em Informática encerra em 5 dias.", tempo: "Há 5 dias", lida: true },
]

const INSCRICAO_STEPS = [
  { label: "Inscrição", sub: "Formulário enviado" },
  { label: "Análise de Documentos", sub: "Em verificação" },
  { label: "Classificação", sub: "Sorteio / Nota ENEM" },
  { label: "Homologação", sub: "Resultado final" },
  { label: "Matrícula", sub: "Conclusão" },
]

// ─── Status helpers ───────────────────────────────────────────────────────────
function badgeCls(s: string) {
  const map: Record<string, string> = {
    aberto: "bg-emerald-600 text-white",
    analise: "bg-amber-500 text-white",
    andamento: "bg-amber-500 text-white",
    aprovado: "bg-emerald-600 text-white",
    reprovado: "bg-red-600 text-white",
    encerrado: "bg-gray-400 text-white",
    pendente: "bg-red-100 text-red-700 ring-1 ring-red-200",
    pendente_docs: "bg-amber-100 text-amber-800 ring-1 ring-amber-200",
    enviado: "bg-emerald-100 text-emerald-800",
    superior: "bg-blue-600 text-white",
    técnico: "bg-[#2A7B3E] text-white",
    médio: "bg-violet-600 text-white",
    sorteio: "bg-blue-600 text-white",
    na: "bg-gray-100 text-gray-500",
  }
  return map[s.toLowerCase()] ?? "bg-gray-200 text-gray-700"
}

function badgeLabel(s: string) {
  const map: Record<string, string> = {
    aberto: "Aberto", analise: "Em Análise", andamento: "Em Andamento",
    aprovado: "Aprovado", reprovado: "Reprovado", encerrado: "Encerrado",
    pendente: "Pendente", pendente_docs: "Documentação Pendente", enviado: "Enviado ✓", superior: "Superior",
    técnico: "Técnico", médio: "Médio", sorteio: "Sorteio", na: "N/A",
  }
  return map[s.toLowerCase()] ?? s
}

// ─── Primitive atoms ──────────────────────────────────────────────────────────
function Badge({ s }: { s: string }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold font-mono tracking-wide ${badgeCls(s)}`}>
      {badgeLabel(s)}
    </span>
  )
}

function IFBLogo({ inv = false }: { inv?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-[11px] font-black tracking-tight border-2 ${inv ? "bg-white/20 border-white/30 text-white" : "bg-[#2A7B3E] border-[#1D5C2E] text-white"}`}>
        IFB
      </div>
      <div className={`${inv ? "text-white" : "text-[#2A7B3E]"}`}>
        <div className="text-[9px] font-bold tracking-[0.12em] leading-none">PROCESSOS</div>
        <div className="text-[9px] font-bold tracking-[0.12em] leading-none mt-0.5">SELETIVOS</div>
      </div>
    </div>
  )
}

function Btn({
  children, v = "primary", cls = "", onClick, disabled = false,
}: {
  children: ReactNode
  v?: "primary" | "secondary" | "outline" | "ghost" | "danger"
  cls?: string
  onClick?: () => void
  disabled?: boolean
}) {
  const base = "inline-flex items-center justify-center gap-2 min-h-[48px] px-5 rounded-xl font-semibold text-base transition-all focus-visible:outline-4 focus-visible:outline-[#2A7B3E] focus-visible:outline-offset-2 active:scale-[0.97] disabled:opacity-40 disabled:pointer-events-none select-none"
  const variants = {
    primary: "bg-[#2A7B3E] text-white hover:bg-[#1D5C2E] shadow-sm shadow-[#2A7B3E]/20",
    secondary: "bg-[#E7F4EA] text-[#1A5429] hover:bg-[#D4EDD9]",
    outline: "border-2 border-[#2A7B3E] text-[#2A7B3E] hover:bg-[#E7F4EA] bg-transparent",
    ghost: "text-[#2A7B3E] hover:bg-[#E7F4EA] bg-transparent",
    danger: "bg-red-600 text-white hover:bg-red-700",
  }
  return (
    <button className={`${base} ${variants[v]} ${cls}`} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  )
}

function Field({ label, placeholder, type = "text", hint, required = false }: {
  label: string; placeholder?: string; type?: string; hint?: string; required?: boolean
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-semibold text-[#0D1E12]">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <input
        type={type}
        placeholder={placeholder}
        className="h-12 px-4 rounded-xl border-2 border-[#D1E8D7] bg-white text-[#0D1E12] placeholder:text-[#A8C4B0] focus:outline-none focus:border-[#2A7B3E] focus:ring-4 focus:ring-[#2A7B3E]/10 transition-all text-base"
      />
      {hint && <p className="text-xs text-[#4E6859]">{hint}</p>}
    </div>
  )
}

function SelectField({ label, options, required = false }: {
  label: string; options: string[]; required?: boolean
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-semibold text-[#0D1E12]">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <div className="relative">
        <select className="w-full h-12 px-4 pr-10 rounded-xl border-2 border-[#D1E8D7] bg-white text-[#0D1E12] focus:outline-none focus:border-[#2A7B3E] focus:ring-4 focus:ring-[#2A7B3E]/10 transition-all text-base appearance-none">
          {options.map(o => <option key={o}>{o}</option>)}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4E6859] pointer-events-none" />
      </div>
    </div>
  )
}

function RadioOpt({ label, sub, checked, onClick }: {
  label: string; sub?: string; checked: boolean; onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 p-3.5 rounded-xl border-2 text-left transition-all focus-visible:outline-2 focus-visible:outline-[#2A7B3E] ${checked ? "border-[#2A7B3E] bg-[#E7F4EA]" : "border-[#D1E8D7] bg-white hover:border-[#2A7B3E]/40"}`}
    >
      <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${checked ? "border-[#2A7B3E] bg-[#2A7B3E]" : "border-[#A8C4B0]"}`}>
        {checked && <div className="w-2 h-2 rounded-full bg-white" />}
      </div>
      <div>
        <div className="text-sm font-semibold text-[#0D1E12]">{label}</div>
        {sub && <div className="text-xs text-[#4E6859] mt-0.5">{sub}</div>}
      </div>
    </button>
  )
}

// ─── Headers ──────────────────────────────────────────────────────────────────
function MainHeader({ onSearch, onProfile }: { onSearch?: () => void; onProfile?: () => void }) {
  return (
    <header className="bg-[#2A7B3E] px-4 pt-10 pb-4" style={{ paddingTop: "max(2.5rem, env(safe-area-inset-top))" }}>
      <div className="flex items-center justify-between">
        <IFBLogo inv />
        <div className="flex items-center gap-2">
          {onSearch ? (
            <button onClick={onSearch} aria-label="Buscar cursos" className="w-10 h-10 flex items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25 focus-visible:outline-2 focus-visible:outline-white transition-colors">
              <Search className="w-5 h-5" />
            </button>
          ) : null}
          <button onClick={onProfile} aria-label="Abrir conta" className="w-10 h-10 flex items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25 focus-visible:outline-2 focus-visible:outline-white transition-colors">
            <User className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  )
}

function BackHeader({ title, onBack, right }: { title: string; onBack: () => void; right?: ReactNode }) {
  return (
    <header className="bg-[#2A7B3E] px-4 pt-10 pb-4" style={{ paddingTop: "max(2.5rem, env(safe-area-inset-top))" }}>
      <div className="flex items-center gap-3">
        <button onClick={onBack} aria-label="Voltar" className="w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25 focus-visible:outline-2 focus-visible:outline-white transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="flex-1 text-white text-[17px] font-bold leading-snug line-clamp-2">{title}</h1>
        {right}
      </div>
    </header>
  )
}

// ─── Bottom Nav ───────────────────────────────────────────────────────────────
function BottomNav({ active, onChange }: { active: NavTab; onChange: (t: NavTab) => void }) {
  const tabs: { id: NavTab; label: string; Icon: ElementType; badge?: number }[] = [
    { id: "home", label: "Início", Icon: Home },
    { id: "inscricoes", label: "Inscrições", Icon: FileText },
    { id: "notificacoes", label: "Avisos", Icon: Bell, badge: 2 },
    { id: "perfil", label: "Perfil", Icon: User },
  ]
  return (
    <div className="bg-white border-t border-[#D1E8D7] px-1 pt-2 pb-6" style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}>
      <div className="flex">
        {tabs.map(({ id, label, Icon, badge }) => {
          const on = active === id
          return (
            <button key={id} onClick={() => onChange(id)}
              className={`flex-1 flex flex-col items-center gap-1 py-1 rounded-xl transition-all focus-visible:outline-2 focus-visible:outline-[#2A7B3E] active:scale-95 ${on ? "text-[#2A7B3E]" : "text-[#A8C4B0]"}`}
            >
              <div className="relative">
                <Icon className="w-6 h-6" strokeWidth={on ? 2.5 : 2} />
                {badge && !on && (
                  <span className="absolute -top-1 -right-1.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                    {badge}
                  </span>
                )}
              </div>
              <span className={`text-[10px] font-semibold ${on ? "text-[#2A7B3E]" : "text-[#A8C4B0]"}`}>{label}</span>
              {on && <div className="w-1 h-1 rounded-full bg-[#2A7B3E]" />}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── Chat Modal ───────────────────────────────────────────────────────────────
const FAQS = ["Como me inscrever?", "Onde enviar documentos?", "Como funciona o sorteio?", "Qual é o prazo?"]

function ChatModal({ onClose }: { onClose: () => void }) {
  const [msgs, setMsgs] = useState([
    { from: "bot", text: "Olá! Sou o assistente virtual do PSI-IFB. Como posso te ajudar hoje? 👋" }
  ])
  const [input, setInput] = useState("")

  function send(text: string) {
    if (!text.trim()) return
    setMsgs(m => [...m, { from: "user", text }, { from: "bot", text: "Entendi! Vou verificar essa informação para você. Aguarde um momento..." }])
    setInput("")
  }

  return (
    <div className="absolute inset-0 z-50 flex flex-col bg-black/50">
      <div className="flex-1" onClick={onClose} />
      <div className="bg-white rounded-t-2xl flex flex-col" style={{ maxHeight: "80%" }}>
        {/* Header */}
        <div className="bg-[#2A7B3E] rounded-t-2xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-white text-sm font-bold">Assistente PSI</p>
              <p className="text-emerald-200 text-[11px]">● Online</p>
            </div>
          </div>
          <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-full bg-white/15 text-white focus-visible:outline-2 focus-visible:outline-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 min-h-0">
          {msgs.map((m, i) => (
            <div key={i} className={`flex ${m.from === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${m.from === "user" ? "bg-[#2A7B3E] text-white rounded-br-sm" : "bg-[#E7F4EA] text-[#0D1E12] rounded-bl-sm"}`}>
                {m.text}
              </div>
            </div>
          ))}

          {/* Quick actions */}
          {msgs.length === 1 && (
            <div className="flex flex-col gap-2 mt-1">
              <p className="text-xs text-[#4E6859] font-medium">Perguntas frequentes:</p>
              {FAQS.map(q => (
                <button key={q} onClick={() => send(q)}
                  className="text-left px-3.5 py-2 rounded-xl border-2 border-[#D1E8D7] text-sm text-[#2A7B3E] font-medium hover:bg-[#E7F4EA] transition-colors focus-visible:outline-2 focus-visible:outline-[#2A7B3E]">
                  {q}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Input */}
        <div className="px-4 py-3 border-t border-[#E4EBE6] flex items-center gap-2">
          <button className="w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-full bg-[#E7F4EA] text-[#2A7B3E] focus-visible:outline-2 focus-visible:outline-[#2A7B3E]">
            <Mic className="w-5 h-5" />
          </button>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && send(input)}
            placeholder="Digite sua dúvida…"
            className="flex-1 h-10 px-3.5 rounded-xl bg-[#F0F6F2] border-2 border-transparent focus:border-[#2A7B3E] focus:ring-4 focus:ring-[#2A7B3E]/10 text-base text-[#0D1E12] placeholder:text-[#A8C4B0] focus:outline-none transition-all"
          />
          <button onClick={() => send(input)}
            className="w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-full bg-[#2A7B3E] text-white focus-visible:outline-2 focus-visible:outline-[#2A7B3E] active:scale-95 transition-transform">
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Edital Card ──────────────────────────────────────────────────────────────
function EditalCard({ e, onClick }: { e: EditalCardData; onClick: () => void }) {
  const tipoColor: Record<string, string> = {
    Técnico: "bg-[#2A7B3E]", Superior: "bg-blue-600", Médio: "bg-violet-600"
  }
  const accent = tipoColor[e.tipo] ?? "bg-gray-500"
  return (
    <button onClick={onClick}
      className="w-full bg-white rounded-2xl border border-[#D1E8D7] overflow-hidden flex text-left transition-all hover:shadow-md hover:border-[#2A7B3E]/40 focus-visible:outline-2 focus-visible:outline-[#2A7B3E] active:scale-[0.99]">
      <div className={`w-1.5 flex-shrink-0 ${accent}`} />
      <div className="flex-1 p-4">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex-1 min-w-0">
            <p className="text-[15px] font-bold text-[#0D1E12] leading-snug">{e.titulo}</p>
            <p className="text-xs text-[#4E6859] mt-0.5">{e.editalLabel}</p>
            <p className="text-xs text-[#4E6859] mt-0.5">{e.sub}</p>
          </div>
          <Badge s={e.status} />
        </div>
        {/* Mobile field order: campus → turno → vagas → área → prazo */}
        <div className="flex flex-col gap-1.5 text-xs text-[#4E6859]">
          <span className="flex items-center gap-1"><MapPin className="w-3 h-3 flex-shrink-0" />{e.campus}</span>
          <span>Turno: <span className="font-semibold text-[#0D1E12]">{e.turno}</span></span>
          <span className="flex items-center gap-1"><User className="w-3 h-3 flex-shrink-0" />{e.vagas} vagas</span>
          <span>Área: <span className="font-semibold text-[#0D1E12]">{e.area_conhecimento}</span></span>
        </div>
        <div className="mt-3 pt-3 border-t border-[#E4EBE6] flex items-center justify-between">
          <div className="flex items-center gap-1 text-xs text-[#4E6859]">
            <Calendar className="w-3 h-3" />
            <span>Prazo: <span className="font-rawline font-semibold text-[#0D1E12]">{e.prazo}</span></span>
          </div>
          <ChevronRight className="w-4 h-4 text-[#A8C4B0]" />
        </div>
      </div>
    </button>
  )
}

function OfertaFiltersBar({
  editais,
  search,
  setSearch,
  filterTipo,
  setFilterTipo,
  filterEditalId,
  setFilterEditalId,
  filterCampusId,
  setFilterCampusId,
  tipos = ["Todos", "Técnico", "Superior", "Médio"],
}: {
  editais: EditalCardData[]
  search: string
  setSearch: (v: string) => void
  filterTipo: string
  setFilterTipo: (v: string) => void
  filterEditalId: number | null
  setFilterEditalId: (v: number | null) => void
  filterCampusId: number | null
  setFilterCampusId: (v: number | null) => void
  tipos?: string[]
}) {
  const processos = useMemo(() => uniqueEditaisFromCards(editais), [editais])
  const campuses = useMemo(() => uniqueCampusesFromCards(editais), [editais])
  const selectCls =
    "w-full h-10 px-3 rounded-xl bg-white border border-[#D1E8D7] text-sm text-[#0D1E12] focus:border-[#2A7B3E] focus:ring-4 focus:ring-[#2A7B3E]/10 focus:outline-none"

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A8C4B0]" />
        <input
          id="oferta-search"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar curso, campus, área…"
          className="w-full h-11 pl-10 pr-3 rounded-xl bg-white border border-[#D1E8D7] text-base text-[#0D1E12] placeholder:text-[#A8C4B0] focus:border-[#2A7B3E] focus:ring-4 focus:ring-[#2A7B3E]/10 focus:outline-none"
          aria-label="Buscar cursos"
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-bold tracking-wide uppercase text-[#4E6859]">Processo / edital</span>
          <select
            className={selectCls}
            value={filterEditalId ?? ""}
            onChange={e => setFilterEditalId(e.target.value ? Number(e.target.value) : null)}
            aria-label="Filtrar por processo ou edital"
          >
            <option value="">Todos os processos</option>
            {processos.map(p => (
              <option key={p.id} value={p.id}>{p.label}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-bold tracking-wide uppercase text-[#4E6859]">Campus</span>
          <select
            className={selectCls}
            value={filterCampusId ?? ""}
            onChange={e => setFilterCampusId(e.target.value ? Number(e.target.value) : null)}
            aria-label="Filtrar por campus"
          >
            <option value="">Todos os campi</option>
            {campuses.map(c => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
        {tipos.map(t => (
          <button key={t} type="button" onClick={() => setFilterTipo(t)}
            className={`flex-shrink-0 px-4 h-8 rounded-full text-sm font-semibold transition-all focus-visible:outline-2 focus-visible:outline-[#2A7B3E] ${filterTipo === t ? "bg-[#2A7B3E] text-white" : "bg-white border border-[#D1E8D7] text-[#4E6859] hover:border-[#2A7B3E]/40"}`}>
            {t}
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── HOME SCREEN ──────────────────────────────────────────────────────────────
function HomeScreen({
  goto, setNav, onSelectEdital, onOpenChat, onRequestDocs,
}: {
  goto: (s: Screen) => void
  setNav: (t: NavTab) => void
  onSelectEdital: (e: EditalCardData) => void
  onOpenChat: () => void
  onRequestDocs: () => void
}) {
  const [filterTipo, setFilterTipo] = useState("Todos")
  const [search, setSearch] = useState("")
  const [filterEditalId, setFilterEditalId] = useState<number | null>(null)
  const [filterCampusId, setFilterCampusId] = useState<number | null>(null)
  const fallback = useMemo(() => EDITAIS, [])
  const { editais, error: ofertasError, loading: ofertasLoading } = useOfertas(fallback)
  const { user, authed } = useProfile()
  const greetName = authed && user ? firstNameFrom(user.nome_completo) : null
  const shown = useMemo(
    () =>
      filterEditalCards(editais, {
        tipo: filterTipo,
        search,
        id_edital: filterEditalId,
        id_campus: filterCampusId,
      }),
    [editais, filterTipo, search, filterEditalId, filterCampusId],
  )

  return (
    <div>
      <MainHeader
        onSearch={() => document.getElementById("oferta-search")?.focus()}
        onProfile={() => { goto("perfil"); setNav("perfil") }}
      />
      <div className="px-4 pt-5 pb-4 bg-[#2A7B3E]">
        {authed && greetName ? (
          <>
            <p className="text-emerald-200 text-sm font-medium">Bem-vindo de volta</p>
            <h2 className="text-white text-2xl font-extrabold mt-0.5">Olá, {greetName}!</h2>
          </>
        ) : (
          <>
            <p className="text-emerald-200 text-sm font-medium">Processo Seletivo IFB</p>
            <h2 className="text-white text-2xl font-extrabold mt-0.5">Olá!</h2>
            <p className="text-emerald-100 text-sm mt-1">Entre para se inscrever e acompanhar candidaturas.</p>
          </>
        )}
      </div>

      {/* Banner */}
      <div className="mx-4 -mt-3 rounded-2xl overflow-hidden shadow-lg bg-gradient-to-br from-[#1D5C2E] to-[#3A9B54] p-4 flex items-center justify-between">
        <div className="flex-1">
          <p className="text-emerald-200 text-[11px] font-semibold tracking-wide uppercase">Inscrições Abertas</p>
          <p className="text-white text-base font-bold mt-1 leading-snug">Processo Seletivo 2025.1</p>
          <p className="text-emerald-200 text-xs mt-1">Vagas para cursos técnicos e superiores</p>
          <button onClick={() => goto("processos")}
            className="mt-3 inline-flex items-center gap-1.5 bg-white text-[#2A7B3E] text-xs font-bold px-3 py-1.5 rounded-full hover:bg-emerald-50 transition-colors">
            Ver editais <ChevronRight className="w-3 h-3" />
          </button>
        </div>
        <div className="w-16 h-16 rounded-full bg-white/15 flex items-center justify-center flex-shrink-0 ml-3">
          <GraduationCap className="w-9 h-9 text-white" />
        </div>
      </div>

      {/* Filters + list */}
      <div className="px-4 pt-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[#0D1E12] text-base font-bold">Cursos disponíveis</h3>
          <button onClick={() => goto("processos")} className="text-[#2A7B3E] text-sm font-semibold focus-visible:outline-2 focus-visible:outline-[#2A7B3E] rounded">
            Ver todos
          </button>
        </div>
        <OfertaFiltersBar
          editais={editais}
          search={search}
          setSearch={setSearch}
          filterTipo={filterTipo}
          setFilterTipo={setFilterTipo}
          filterEditalId={filterEditalId}
          setFilterEditalId={setFilterEditalId}
          filterCampusId={filterCampusId}
          setFilterCampusId={setFilterCampusId}
        />
        <div className="mt-3 mb-1 bg-amber-50 border border-amber-200 rounded-xl p-3 flex gap-2.5">
          <Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-amber-800 text-xs leading-relaxed">{AVISO_UM_CURSO_POR_EDITAL}</p>
        </div>
      </div>

      <div className="px-4 pt-3 pb-4 flex flex-col gap-3">
        {ofertasError ? (
          <p className="text-sm text-red-700 text-center py-6" role="alert">{ofertasError}</p>
        ) : ofertasLoading ? (
          <p className="text-sm text-[#4E6859] text-center py-6">Carregando cursos…</p>
        ) : shown.length === 0 ? (
          <p className="text-sm text-[#4E6859] text-center py-6">Nenhum curso encontrado com estes filtros.</p>
        ) : (
          shown.map(e => (
            <EditalCard key={e.id} e={e} onClick={() => { onSelectEdital(e); goto("edital") }} />
          ))
        )}
      </div>

      {/* Quick actions */}
      <div className="px-4 pb-4">
        <h3 className="text-[#0D1E12] text-base font-bold mb-3">Atalhos</h3>
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: FileText, label: "Minhas\nInscrições", action: () => {
              if (!shouldUseMocks() && getSessionUserId() == null) {
                goto("perfil"); setNav("perfil"); return
              }
              goto("inscricoes"); setNav("inscricoes")
            } },
            { icon: Upload, label: "Enviar\nDocumentos", action: onRequestDocs },
            { icon: HelpCircle, label: "Ajuda\nRápida", action: onOpenChat },
          ].map(({ icon: Icon, label, action }) => (
            <button key={label} onClick={action}
              className="flex flex-col items-center justify-center gap-2 bg-white border border-[#D1E8D7] rounded-2xl py-4 px-2 hover:border-[#2A7B3E]/40 hover:bg-[#F0F6F2] transition-all focus-visible:outline-2 focus-visible:outline-[#2A7B3E] active:scale-95">
              <div className="w-10 h-10 rounded-xl bg-[#E7F4EA] flex items-center justify-center">
                <Icon className="w-5 h-5 text-[#2A7B3E]" />
              </div>
              <span className="text-[11px] font-semibold text-[#0D1E12] text-center leading-tight whitespace-pre-line">{label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── PROCESSOS ABERTOS SCREEN ─────────────────────────────────────────────────
function ProcessosScreen({
  goto, onBack, onSelectEdital,
}: {
  goto: (s: Screen) => void
  onBack: () => void
  onSelectEdital: (e: EditalCardData) => void
}) {
  const [filterTipo, setFilterTipo] = useState("Todos")
  const [search, setSearch] = useState("")
  const [filterEditalId, setFilterEditalId] = useState<number | null>(null)
  const [filterCampusId, setFilterCampusId] = useState<number | null>(null)
  const fallback = useMemo(() => EDITAIS, [])
  const { editais, error: ofertasError } = useOfertas(fallback)
  const shown = useMemo(
    () =>
      filterEditalCards(editais, {
        tipo: filterTipo,
        search,
        id_edital: filterEditalId,
        id_campus: filterCampusId,
      }),
    [editais, filterTipo, search, filterEditalId, filterCampusId],
  )
  const abertos = editais.filter(e => e.status === "aberto").length

  return (
    <div>
      <BackHeader title="Processos Abertos" onBack={onBack} />
      <div className="px-4 pt-4">
        {ofertasError && (
          <p className="text-sm text-red-700 mb-3" role="alert">{ofertasError}</p>
        )}
        <p className="text-[#4E6859] text-sm mb-3">
          <span className="font-rawline font-semibold text-[#0D1E12]">{abertos}</span> cursos com inscrições abertas
        </p>
        <OfertaFiltersBar
          editais={editais}
          search={search}
          setSearch={setSearch}
          filterTipo={filterTipo}
          setFilterTipo={setFilterTipo}
          filterEditalId={filterEditalId}
          setFilterEditalId={setFilterEditalId}
          filterCampusId={filterCampusId}
          setFilterCampusId={setFilterCampusId}
        />
        <div className="mt-3 mb-3 bg-amber-50 border border-amber-200 rounded-xl p-3 flex gap-2.5">
          <Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-amber-800 text-xs leading-relaxed">{AVISO_UM_CURSO_POR_EDITAL}</p>
        </div>
        <div className="flex flex-col gap-3 pb-4">
          {shown.length === 0 ? (
            <p className="text-sm text-[#4E6859] text-center py-6">Nenhum curso encontrado com estes filtros.</p>
          ) : (
            shown.map(e => (
              <EditalCard key={e.id} e={e} onClick={() => { onSelectEdital(e); goto("edital") }} />
            ))
          )}
        </div>
      </div>
    </div>
  )
}

// ─── EDITAL DETAIL SCREEN ─────────────────────────────────────────────────────
function EditalScreen({
  goto, onBack, edital, setNav, onRequireAuth, onOpenDocs,
}: {
  goto: (s: Screen) => void
  onBack: () => void
  edital: EditalCardData | null
  setNav?: (t: NavTab) => void
  onRequireAuth: (next: Screen) => void
  onOpenDocs: (candidaturaId: number) => void
}) {
  const title = edital?.titulo ?? "Técnico em Informática"
  const campus = edital?.campus ?? "Campus Brasília"
  const vagas = edital?.vagas ?? 40
  const turno = edital?.turno ?? "—"
  const area = edital?.area_conhecimento ?? "—"
  const editalLabel = edital?.editalLabel ?? "—"
  const ofertaAberta = (edital?.status ?? "aberto") === "aberto"
  const { active } = useInscricoes()
  const matchesOferta =
    active != null &&
    edital?.id_oferta != null &&
    active.id_oferta === edital.id_oferta
  const hasActiveForOferta = Boolean(matchesOferta && active?.isActive)
  const view: "aberto" | "andamento" | "aprovado" =
    matchesOferta && active?.statusBadge === "aprovado"
      ? "aprovado"
      : hasActiveForOferta
        ? "andamento"
        : "aberto"

  function requireLoginThen(next: Screen) {
    if (!shouldUseMocks() && getSessionUserId() == null) {
      setNav?.("perfil")
      onRequireAuth(next)
      return
    }
    goto(next)
  }

  return (
    <div>
      <BackHeader title={title} onBack={onBack} />

      {view === "andamento" && (
        <div className="mx-4 mt-4 flex items-center gap-3 bg-amber-50 border-2 border-amber-200 rounded-2xl p-4">
          <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
            <Loader2 className="w-5 h-5 text-amber-600 animate-spin" />
          </div>
          <div>
            <p className="text-amber-800 text-sm font-bold">Inscrição em andamento</p>
            <p className="text-amber-700 text-xs mt-0.5">Acompanhe o status em Minhas Inscrições</p>
          </div>
        </div>
      )}

      {view === "aprovado" && (
        <div className="mx-4 mt-4 flex items-center gap-3 bg-emerald-50 border-2 border-emerald-200 rounded-2xl p-4">
          <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
            <UserCheck className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-emerald-800 text-sm font-bold">Resultado disponível</p>
            <p className="text-emerald-700 text-xs mt-0.5 font-semibold">Consulte Minhas Inscrições para detalhes</p>
          </div>
        </div>
      )}

      {/* Info chips — mobile order */}
      <div className="px-4 pt-4 flex gap-2 flex-wrap">
        <span className="flex items-center gap-1 bg-white border border-[#D1E8D7] rounded-full px-3 py-1.5 text-xs font-semibold text-[#4E6859]">
          {editalLabel}
        </span>
        <span className="flex items-center gap-1 bg-white border border-[#D1E8D7] rounded-full px-3 py-1.5 text-xs font-semibold text-[#4E6859]">
          <MapPin className="w-3 h-3" /> {campus}
        </span>
        <span className="flex items-center gap-1 bg-white border border-[#D1E8D7] rounded-full px-3 py-1.5 text-xs font-semibold text-[#4E6859]">
          {turno}
        </span>
        <span className="flex items-center gap-1 bg-white border border-[#D1E8D7] rounded-full px-3 py-1.5 text-xs font-semibold text-[#4E6859]">
          <User className="w-3 h-3" /> {vagas} vagas
        </span>
        <span className="flex items-center gap-1 bg-white border border-[#D1E8D7] rounded-full px-3 py-1.5 text-xs font-semibold text-[#4E6859]">
          {area}
        </span>
        <Badge s={ofertaAberta ? "aberto" : "encerrado"} />
      </div>

      {/* Timeline table */}
      <div className="mx-4 mt-4 rounded-2xl overflow-hidden border border-[#D1E8D7]">
        <div className="grid grid-cols-[100px_1fr] bg-[#2A7B3E]">
          <div className="px-3 py-2.5 text-white text-[11px] font-bold tracking-wider uppercase border-r border-white/20">Data</div>
          <div className="px-3 py-2.5 text-white text-[11px] font-bold tracking-wider uppercase">Etapa</div>
        </div>
        {CRONOGRAMA.map((row, i) => {
          const isDone = row.st === "done"
          const isActive = row.st === "active"
          return (
            <div key={i}
              className={`grid grid-cols-[100px_1fr] border-t border-[#D1E8D7] ${isActive ? "bg-[#2A7B3E]" : isDone ? "bg-[#F0F6F2]" : "bg-white"}`}>
              <div className={`px-3 py-3 text-[11px] font-rawline font-semibold border-r ${isActive ? "border-white/20 text-emerald-100" : "border-[#D1E8D7] text-[#4E6859]"}`}>
                {row.data}
              </div>
              <div className={`px-3 py-3 text-[12px] leading-relaxed flex items-start gap-2 ${isActive ? "text-white font-semibold" : isDone ? "text-[#4E6859]" : "text-[#0D1E12]"}`}>
                {isDone && <CheckCircle className="w-4 h-4 text-[#2A7B3E] flex-shrink-0 mt-0.5" />}
                {isActive && <Clock className="w-4 h-4 text-white flex-shrink-0 mt-0.5 animate-pulse" />}
                {row.etapa}
              </div>
            </div>
          )
        })}
      </div>

      {/* CTA */}
      <div className="px-4 py-5">
        {view === "aberto" && ofertaAberta && (
          <>
            <div className="mb-3 bg-amber-50 border border-amber-200 rounded-xl p-3.5 flex gap-2.5">
              <Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-amber-800 text-xs leading-relaxed">{AVISO_UM_CURSO_POR_EDITAL}</p>
            </div>
            <Btn v="primary" cls="w-full text-lg font-black h-14" onClick={() => requireLoginThen("wizard")}>
              INSCREVER-SE
            </Btn>
          </>
        )}
        {view === "aberto" && !ofertaAberta && (
          <p className="text-center text-sm text-[#4E6859]">Inscrições encerradas para esta oferta.</p>
        )}
        {view === "andamento" && (
          <div className="flex flex-col gap-3">
            <Btn v="secondary" cls="w-full h-14" onClick={() => requireLoginThen("inscricoes")}>
              <FileText className="w-5 h-5" /> Acompanhar Inscrição
            </Btn>
            {active && active.id > 0 && (
              <Btn v="outline" cls="w-full h-12" onClick={() => { onOpenDocs(active.id); goto("docs") }}>
                <Upload className="w-4 h-4" /> Enviar documentos
              </Btn>
            )}
          </div>
        )}
        {view === "aprovado" && (
          <div className="flex flex-col gap-3">
            <Btn v="primary" cls="w-full h-14" onClick={() => requireLoginThen("inscricoes")}>
              <Award className="w-5 h-5" /> Ver Resultado Completo
            </Btn>
            <p className="text-center text-xs text-[#4E6859]">Consulte as datas de matrícula no edital</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── WIZARD SCREEN ────────────────────────────────────────────────────────────
function WizardScreen({
  goto, onBack, edital, onCandidaturaCreated,
}: {
  goto: (s: Screen) => void
  onBack: () => void
  edital: EditalCardData | null
  onCandidaturaCreated: (id: number) => void
}) {
  const [step, setStep] = useState<WizardStep>(1)
  const [escola, setEscola] = useState("")
  const [cota, setCota] = useState("")
  const [confirmed, setConfirmed] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [nome, setNome] = useState("")
  const [cpf, setCpf] = useState("")
  const [nascimento, setNascimento] = useState("")
  const [email, setEmail] = useState("")
  const [telefone, setTelefone] = useState("")
  const [faixasEnv, setFaixasEnv] = useState<FaixasSmPublicEnvelope | null>(null)
  const [faixasLoading, setFaixasLoading] = useState(false)
  const [idFaixa, setIdFaixa] = useState("")
  const [numeroPessoas, setNumeroPessoas] = useState("")
  const [stepError, setStepError] = useState<string | null>(null)
  const [respNome, setRespNome] = useState("")
  const [respCpf, setRespCpf] = useState("")
  const [respAceite, setRespAceite] = useState(false)
  const [respDocNome, setRespDocNome] = useState("")
  const [respDocBase64, setRespDocBase64] = useState("")

  const STEPS = ["Dados Pessoais", "Cotas", "Socioeconômico", "Revisão"]
  const cursoLabel = edital
    ? `${edital.titulo} — ${edital.campus}`
    : "Técnico em Informática — Campus Brasília"
  const regraB = faixasEnv?.regra_b_socioeconomico === true
  const submitDate = new Date().toISOString().slice(0, 10)
  const isMenor =
    Boolean(nascimento) && isMenorNaData(nascimento, submitDate)

  useEffect(() => {
    if (shouldUseMocks()) {
      setNome(MOCK_PROFILE.nome_completo)
      setCpf(MOCK_PROFILE.CPF)
      return
    }
    if (getSessionUserId() == null) {
      goto("perfil")
      return
    }
    void fetchCurrentUser().then((u) => {
      if (!u) return
      setNome(u.nome_completo ?? "")
      setCpf(u.CPF ?? "")
      setNascimento(u.data_nascimento?.slice(0, 10) ?? "")
      setEmail(u.email ?? "")
      setTelefone(u.telefone ?? "")
    })
  }, [goto])

  useEffect(() => {
    if (!isBaixaRendaCota(cota)) {
      setFaixasEnv(null)
      setIdFaixa("")
      setNumeroPessoas("")
      return
    }
    if (shouldUseMocks()) {
      setFaixasEnv({
        salario_minimo_referencia: 1518,
        faixas: [
          { id: 1, ordem: 1, rotulo: "Até 1 SM" },
          { id: 2, ordem: 2, rotulo: "Até 1,5 SM" },
        ],
        regra_b_socioeconomico: false,
      })
      return
    }
    setFaixasLoading(true)
    void apiFetch<FaixasSmPublicEnvelope>("/faixas-sm")
      .then((env) => {
        setFaixasEnv(env)
      })
      .catch(() => {
        setFaixasEnv({
          salario_minimo_referencia: 0,
          faixas: [],
          regra_b_socioeconomico: true,
        })
      })
      .finally(() => setFaixasLoading(false))
  }, [cota])

  function tryAdvanceFromStep() {
    setStepError(null)
    if (step === 2 && !wizardCotasStepReady(escola, cota)) {
      setStepError("Selecione a escola de origem e a modalidade de cota para continuar.")
      return
    }
    if (step === 3 && isBaixaRendaCota(cota)) {
      const issues = socioWizardIssues({
        cota,
        regraB,
        idFaixa,
        numeroPessoas,
      })
      if (issues.length) {
        setStepError(issues.join(" "))
        return
      }
    }
    setStep((step + 1) as WizardStep)
  }

  async function confirmInscricao() {
    if (submitting) return
    setSubmitting(true)
    setSubmitError(null)

    if (!shouldUseMocks()) {
      const userId = getSessionUserId()
      if (userId == null) {
        setSubmitError("Faça login para enviar a inscrição.")
        setSubmitting(false)
        goto("perfil")
        return
      }
      const user = await fetchCurrentUser()
      const issues = profileMinimumIssues(user)
      if (!nome.trim()) issues.push("Nome completo é obrigatório no formulário.")
      if (!cpf.replace(/\D/g, "")) issues.push("CPF é obrigatório no formulário.")
      if (!telefone.trim()) issues.push("Telefone é obrigatório no formulário.")
      if (!nascimento) issues.push("Data de nascimento é obrigatória no formulário.")
      if (!email.trim()) issues.push("E-mail é obrigatório no formulário.")
      const menorNow =
        Boolean(nascimento) && isMenorNaData(nascimento, submitDate)
      issues.push(
        ...socioWizardIssues({
          cota: cota || "nenhuma",
          regraB,
          idFaixa,
          numeroPessoas,
        }),
      )
      issues.push(
        ...responsavelSubmitIssues(menorNow, {
          nome: respNome,
          cpf: respCpf,
          aceite: respAceite,
          documentoNome: respDocNome,
          documentoBase64: respDocBase64,
        }),
      )
      if (issues.length) {
        setSubmitError(
          `${issues.join(" ")} Complete em Meus Dados se faltar endereço.`,
        )
        setSubmitting(false)
        return
      }
      const idOferta = edital?.id_oferta
      const idEdital = edital?.id_edital
      if (
        idOferta == null ||
        idEdital == null ||
        !Number.isFinite(idOferta) ||
        !Number.isFinite(idEdital)
      ) {
        setSubmitError("Curso/oferta inválido para inscrição.")
        setSubmitting(false)
        return
      }
      try {
        const socio = buildSocioPayload({
          cota: cota || "nenhuma",
          regraB,
          idFaixa,
          numeroPessoas,
        })
        const created = await apiFetch<{ id: number }>("/candidaturas", {
          method: "POST",
          body: JSON.stringify({
            id_usuario: userId,
            id_oferta: idOferta,
            id_edital: idEdital,
            tipo_vaga: tipoVagaFromWizard(cota || "nenhuma", escola),
            ...(socio != null ? { socioeconomico: socio } : {}),
            ...(menorNow
              ? {
                  responsavel_nome: respNome.trim(),
                  responsavel_cpf: respCpf,
                  responsavel_aceite: true,
                  responsavel_documento_base64: respDocBase64,
                  responsavel_documento_nome: respDocNome,
                }
              : {}),
          }),
        })
        onCandidaturaCreated(created.id)
        setSubmitting(false)
        goto("docs")
        return
      } catch (err) {
        setSubmitError(messageFromInscricaoApiError(err))
        setSubmitting(false)
        return
      }
    }

    setSubmitting(false)
    goto("docs")
  }

  const inputCls =
    "h-12 px-4 rounded-xl border-2 border-[#D1E8D7] bg-white text-[#0D1E12] placeholder:text-[#A8C4B0] focus:outline-none focus:border-[#2A7B3E] focus:ring-4 focus:ring-[#2A7B3E]/10 text-base w-full"

  const stepContent: Record<WizardStep, ReactNode> = {
    1: (
      <div className="flex flex-col gap-4">
        <button
          type="button"
          onClick={() => goto("meus-dados")}
          className="text-left text-xs font-semibold text-[#2A7B3E] underline underline-offset-2"
        >
          Atualizar dados em Meus Dados
        </button>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-semibold text-[#0D1E12]">Nome Completo<span className="text-red-500 ml-0.5">*</span></label>
          <input className={inputCls} value={nome} onChange={e => setNome(e.target.value)} aria-label="Nome Completo" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-semibold text-[#0D1E12]">CPF<span className="text-red-500 ml-0.5">*</span></label>
          <input className={inputCls} value={cpf} onChange={e => setCpf(e.target.value)} aria-label="CPF" />
          <p className="text-xs text-[#4E6859]">Apenas números</p>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-semibold text-[#0D1E12]">Data de Nascimento<span className="text-red-500 ml-0.5">*</span></label>
          <input className={inputCls} type="date" value={nascimento} onChange={e => setNascimento(e.target.value)} aria-label="Data de Nascimento" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-semibold text-[#0D1E12]">E-mail<span className="text-red-500 ml-0.5">*</span></label>
          <input className={inputCls} type="email" value={email} onChange={e => setEmail(e.target.value)} aria-label="E-mail" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-semibold text-[#0D1E12]">Celular / WhatsApp<span className="text-red-500 ml-0.5">*</span></label>
          <input className={inputCls} type="tel" value={telefone} onChange={e => setTelefone(e.target.value)} aria-label="Celular" />
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 flex gap-2.5">
          <Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-amber-800 text-xs leading-relaxed">Endereço completo é validado no envio a partir de Meus Dados.</p>
        </div>
        {isMenor && (
          <div className="flex flex-col gap-3 border-t border-[#E4EBE6] pt-4" aria-label="Dados do responsável legal">
            <p className="text-sm font-bold text-[#0D1E12]">Responsável legal</p>
            <p className="text-xs text-[#4E6859] leading-relaxed">{MSG_MENOR_RESPONSAVEL_CLIENT}</p>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-[#0D1E12]">Nome do responsável<span className="text-red-500 ml-0.5">*</span></label>
              <input className={inputCls} value={respNome} onChange={e => setRespNome(e.target.value)} aria-label="Nome do responsável" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-[#0D1E12]">CPF do responsável<span className="text-red-500 ml-0.5">*</span></label>
              <input className={inputCls} value={respCpf} onChange={e => setRespCpf(e.target.value)} aria-label="CPF do responsável" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-[#0D1E12]">Documento do responsável<span className="text-red-500 ml-0.5">*</span></label>
              <input
                type="file"
                accept="image/*,.pdf,application/pdf"
                aria-label="Documento do responsável"
                className="text-sm text-[#0D1E12]"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (!file) {
                    setRespDocNome("")
                    setRespDocBase64("")
                    return
                  }
                  void fileToBase64(file).then((b64) => {
                    setRespDocNome(file.name)
                    setRespDocBase64(b64)
                  })
                }}
              />
              {respDocNome ? (
                <p className="text-xs text-[#4E6859]">Anexo: {respDocNome}</p>
              ) : null}
            </div>
            <label className="flex items-start gap-2.5 text-sm text-[#0D1E12]">
              <input
                type="checkbox"
                className="mt-1"
                checked={respAceite}
                onChange={e => setRespAceite(e.target.checked)}
                aria-label="Aceite do responsável legal"
              />
              <span>Declaro que o responsável legal autoriza esta inscrição e que o documento anexado é válido.<span className="text-red-500 ml-0.5">*</span></span>
            </label>
          </div>
        )}
      </div>
    ),
    2: (
      <div className="flex flex-col gap-5">
        <RadioOpt label="Escola Pública" sub="Cursou todo o Ensino Fundamental em escola pública" checked={escola === "pub"} onClick={() => setEscola("pub")} />
        <RadioOpt label="Escola Privada" sub="Cursou o Ensino Fundamental em escola particular" checked={escola === "priv"} onClick={() => setEscola("priv")} />

        <div className="border-t border-[#E4EBE6] pt-4">
          <p className="text-sm font-bold text-[#0D1E12] mb-3">Modalidade de cota</p>
          {[
            { value: "ppi", label: "Preto, Pardo ou Indígena (PPI)", sub: "Autodeclaração étnico-racial" },
            { value: "pcd", label: "Pessoa com Deficiência (PcD)", sub: "Laudo médico obrigatório" },
            { value: "renda", label: "Renda Familiar Baixa", sub: "Até 1,5 salário mínimo per capita" },
            { value: "nenhuma", label: "Ampla Concorrência", sub: "Sem reserva de vagas" },
          ].map(o => (
            <div key={o.value} className="mb-2.5">
              <RadioOpt label={o.label} sub={o.sub} checked={cota === o.value} onClick={() => setCota(o.value)} />
            </div>
          ))}
        </div>

        {cota === "ppi" && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3.5 flex gap-2.5">
            <Shield className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
            <p className="text-blue-800 text-xs leading-relaxed">Você precisará tirar uma foto para o processo de heteroidentificação. Isso será solicitado na etapa de documentos.</p>
          </div>
        )}
        {stepError && step === 2 && (
          <p className="text-xs text-red-700 leading-relaxed" role="alert">{stepError}</p>
        )}
      </div>
    ),
    3: (
      <div className="flex flex-col gap-4">
        {!isBaixaRendaCota(cota) ? (
          <div className="bg-[#E7F4EA] border border-[#D1E8D7] rounded-xl p-4 flex gap-2.5">
            <Info className="w-4 h-4 text-[#2A7B3E] flex-shrink-0 mt-0.5" />
            <p className="text-[#0D1E12] text-sm leading-relaxed">
              O formulário socioeconómico aplica-se apenas à cota de renda familiar baixa.
              Pode continuar para a revisão.
            </p>
          </div>
        ) : faixasLoading ? (
          <p className="text-sm text-[#4E6859] flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> A carregar faixas de salário mínimo…
          </p>
        ) : regraB ? (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 flex gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-amber-900 text-xs leading-relaxed space-y-1">
              <p className="font-semibold">Bloco socioeconómico incompleto (regra B)</p>
              <p>
                Não há faixas de salário mínimo ativas. A inscrição em baixa renda é permitida;
                a situação ficará como Documentação Pendente até o gestor configurar as faixas.
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-[#0D1E12]">
                Faixa de renda familiar<span className="text-red-500 ml-0.5">*</span>
              </label>
              <select
                className={inputCls}
                value={idFaixa}
                onChange={(e) => setIdFaixa(e.target.value)}
                aria-label="Faixa de renda familiar"
              >
                <option value="">Selecione…</option>
                {(faixasEnv?.faixas ?? []).map((f) => (
                  <option key={f.id} value={String(f.id)}>
                    {f.rotulo}
                    {faixasEnv?.salario_minimo_referencia
                      ? ` (ref. SM R$ ${faixasEnv.salario_minimo_referencia})`
                      : ""}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-[#0D1E12]">
                Número de pessoas na residência<span className="text-red-500 ml-0.5">*</span>
              </label>
              <input
                className={inputCls}
                type="number"
                min={1}
                step={1}
                placeholder="Ex: 4"
                value={numeroPessoas}
                onChange={(e) => setNumeroPessoas(e.target.value)}
                aria-label="Número de pessoas na residência"
              />
            </div>
            <p className="text-[11px] text-[#4E6859] leading-relaxed">
              Campos e templates documentais adicionais configurados pelo admin (construtor)
              podem ser pedidos na etapa de documentos.
            </p>
          </>
        )}
        {stepError && (
          <p className="text-xs text-red-700 leading-relaxed">{stepError}</p>
        )}
      </div>
    ),
    4: (
      <div className="flex flex-col gap-4">
        <div className="bg-[#E7F4EA] rounded-2xl p-4 border border-[#D1E8D7]">
          <p className="text-[#2A7B3E] text-xs font-bold uppercase tracking-wider mb-3">Resumo da Inscrição</p>
          {[
            ["Curso", cursoLabel],
            ["Nome", nome || "—"],
            ["CPF", cpf || "***.***.***-**"],
            ["E-mail", email || "—"],
            ["Escola de Origem", escola === "pub" ? "Pública" : escola === "priv" ? "Privada" : "Não informado"],
            ["Modalidade", cota || "Não selecionado"],
            ...(isBaixaRendaCota(cota)
              ? [
                  [
                    "Socioeconómico",
                    regraB
                      ? "Incompleto (regra B — Documentação Pendente)"
                      : idFaixa
                        ? `Faixa #${idFaixa} · ${numeroPessoas || "—"} pessoa(s)`
                        : "Pendente",
                  ] as [string, string],
                ]
              : []),
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between py-2 border-b border-[#D1E8D7] last:border-0">
              <span className="text-xs text-[#4E6859] font-medium">{k}</span>
              <span className="text-xs text-[#0D1E12] font-semibold text-right max-w-[60%]">{v}</span>
            </div>
          ))}
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 flex gap-2.5">
          <Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-amber-800 text-xs leading-relaxed">{AVISO_UM_CURSO_POR_EDITAL}</p>
        </div>

        {/* LGPD & Terms */}
        <div className="bg-gray-50 border border-[#D1E8D7] rounded-xl p-4">
          <p className="text-[11px] text-[#4E6859] leading-relaxed">
            Ao confirmar, você declara que as informações prestadas são verdadeiras e concorda com o edital do processo seletivo. Dados tratados conforme a <span className="font-semibold text-[#2A7B3E]">LGPD (Lei 13.709/2018)</span>.
          </p>
        </div>

        <button onClick={() => setConfirmed(!confirmed)}
          className={`flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all focus-visible:outline-2 focus-visible:outline-[#2A7B3E] ${confirmed ? "border-[#2A7B3E] bg-[#E7F4EA]" : "border-[#D1E8D7] bg-white"}`}>
          <div className={`w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center mt-0.5 transition-all ${confirmed ? "border-[#2A7B3E] bg-[#2A7B3E]" : "border-[#A8C4B0]"}`}>
            {confirmed && <Check className="w-3.5 h-3.5 text-white" />}
          </div>
          <span className="text-sm text-[#0D1E12] font-medium leading-relaxed">
            Li e concordo com o edital e com a política de privacidade do IFB.
          </span>
        </button>
      </div>
    ),
  }

  return (
    <div>
      <BackHeader
        title={STEPS[step - 1] ?? "Inscrição"}
        onBack={step === 1 ? onBack : () => setStep((step - 1) as WizardStep)}
        right={
          <span className="font-mono text-white/70 text-sm">{step}/4</span>
        }
      />

      {/* Progress bar */}
      <div className="h-1 bg-white/20 bg-[#D1E8D7]">
        <div className="h-full bg-[#2A7B3E] transition-all duration-500" style={{ width: `${(step / 4) * 100}%` }} />
      </div>

      {/* Step indicators */}
      <div className="px-4 pt-4 pb-2 flex items-center gap-1">
        {STEPS.map((s, i) => {
          const n = i + 1
          const done = n < step
          const active = n === step
          return (
            <div key={s} className="flex items-center flex-1 last:flex-none">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-all ${done ? "bg-[#2A7B3E] text-white" : active ? "bg-[#2A7B3E] text-white ring-4 ring-[#2A7B3E]/20" : "bg-[#E4EBE6] text-[#A8C4B0]"}`}>
                {done ? <Check className="w-3.5 h-3.5" /> : n}
              </div>
              {i < 3 && <div className={`flex-1 h-0.5 mx-1 ${done ? "bg-[#2A7B3E]" : "bg-[#D1E8D7]"}`} />}
            </div>
          )
        })}
      </div>

      {/* Step content */}
      <div className="px-4 pt-3 pb-4">
        {stepContent[step]}

        {/* Navigation */}
        <div className="flex gap-3 mt-6">
          {step > 1 && (
            <Btn v="outline" cls="flex-1 h-12" onClick={() => setStep((step - 1) as WizardStep)}>
              Voltar
            </Btn>
          )}
          {step < 4 ? (
            <Btn v="primary" cls="flex-1 h-12" onClick={() => tryAdvanceFromStep()}>
              Continuar <ChevronRight className="w-4 h-4" />
            </Btn>
          ) : (
            <Btn v="primary" cls="flex-1 h-14 text-base font-black" disabled={!confirmed || submitting} onClick={() => { void confirmInscricao() }}>
              {submitting ? "Enviando…" : "Confirmar Inscrição"}
            </Btn>
          )}
        </div>
        {submitError && (
          <p className="mt-3 text-xs text-red-700 text-center leading-relaxed">{submitError}</p>
        )}
      </div>
    </div>
  )
}

// ─── DOCS UPLOAD SCREEN ───────────────────────────────────────────────────────
const DOC_MAX_BYTES = 5 * 1024 * 1024
const DOC_ACCEPT = "image/jpeg,image/png,image/jpg,application/pdf"

async function postDocumentoUpload(opts: {
  candidaturaId: number
  tipoDocumento: string
  file: Blob
  fileName: string
  replaceId?: number
}): Promise<void> {
  const form = new FormData()
  form.append("arquivo", opts.file, opts.fileName)
  if (opts.replaceId && opts.replaceId > 0) {
    await apiFetch(`/documentos/${opts.replaceId}`, { method: "PUT", body: form })
    return
  }
  form.append("id_candidatura", String(opts.candidaturaId))
  form.append("tipo_documento", opts.tipoDocumento)
  await apiFetch("/documentos", { method: "POST", body: form })
}

function validateDocFile(file: File | Blob, nameHint?: string): string | null {
  const name = ("name" in file && file.name ? file.name : nameHint || "").toLowerCase()
  const type = (file.type || "").toLowerCase()
  const okType =
    type.includes("pdf") ||
    type.includes("jpeg") ||
    type.includes("jpg") ||
    type.includes("png") ||
    /\.(pdf|jpe?g|png)$/.test(name)
  if (!okType) return "Formato inválido. Use JPG, PNG ou PDF."
  if (file.size > DOC_MAX_BYTES) return "Arquivo excede 5MB."
  return null
}

function DocsScreen({
  goto, onBack, candidaturaId, setNav, cameraCapturePending, cameraBlob, onConsumeCameraBlob,
}: {
  goto: (s: Screen) => void
  onBack: () => void
  candidaturaId: number | null
  setNav?: (t: NavTab) => void
  cameraCapturePending?: boolean
  cameraBlob?: Blob | null
  onConsumeCameraBlob?: () => void
}) {
  const docsFallback = useMemo(
    () =>
      DOCS_LIST.map(d => ({
        ...d,
        status: d.status as "enviado" | "pendente" | "na",
        tipo: d.tipo as "upload" | "camera",
      })),
    [],
  )
  const { docs, error: docsError, reload } = useDocumentos(candidaturaId, docsFallback)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [queueCount, setQueueCount] = useState(0)
  const [syncMsg, setSyncMsg] = useState<string | null>(null)
  const localPendingCamera = Boolean(cameraCapturePending)

  useEffect(() => {
    setQueueCount(listUploadQueue().length)
  }, [docs, syncMsg])

  async function submitDocFile(opts: {
    docId: string
    tipoDocumento: string
    file: Blob
    fileName: string
  }) {
    if (shouldUseMocks()) return
    if (!candidaturaId || !getAccessToken()) {
      setUploadError("Faça login e selecione uma inscrição para enviar.")
      return
    }
    const replaceId = /^\d+$/.test(opts.docId) ? Number(opts.docId) : undefined
    if (isBrowserOffline()) {
      const dataUrl = await fileToDataUrl(opts.file)
      enqueueUpload({
        candidaturaId,
        tipoDocumento: opts.tipoDocumento,
        dataUrl,
        fileName: opts.fileName,
        mime: opts.file.type || "application/octet-stream",
        replaceId,
      })
      setQueueCount(listUploadQueue().length)
      setSyncMsg("Sem conexão — documento na fila offline. Será enviado ao voltar a rede.")
      return
    }
    await postDocumentoUpload({
      candidaturaId,
      tipoDocumento: opts.tipoDocumento,
      file: opts.file,
      fileName: opts.fileName,
      replaceId,
    })
    reload()
  }

  useEffect(() => {
    if (!cameraBlob || !candidaturaId) return
    const ppi = docs.find(d => d.tipo === "camera") ?? docs[0]
    if (!ppi) {
      onConsumeCameraBlob?.()
      return
    }
    void (async () => {
      setUploadError(null)
      const err = validateDocFile(cameraBlob, "ppi.jpg")
      if (err) {
        setUploadError(err)
        onConsumeCameraBlob?.()
        return
      }
      try {
        await submitDocFile({
          docId: ppi.id,
          tipoDocumento: ppi.nome,
          file: cameraBlob,
          fileName: "ppi-autodeclaracao.jpg",
        })
      } catch {
        setUploadError("Falha ao enviar a foto capturada.")
      } finally {
        onConsumeCameraBlob?.()
      }
    })()
  }, [cameraBlob])

  const statusIcon = (s: string) => {
    if (s === "enviado") return <CheckCircle className="w-5 h-5 text-emerald-600" />
    if (s === "pendente") return <AlertCircle className="w-5 h-5 text-amber-500" />
    if (s === "na") return <Eye className="w-5 h-5 text-gray-400" />
    return <Upload className="w-5 h-5 text-[#4E6859]" />
  }

  const enviados = docs.filter(d => d.status === "enviado").length
  const total = docs.filter(d => d.status !== "na").length
  const missing = Math.max(total - enviados, 0)
  const canFinish = total > 0 && enviados >= total

  if (!shouldUseMocks() && (candidaturaId == null || candidaturaId <= 0)) {
    return (
      <div>
        <BackHeader title="Envio de Documentos" onBack={onBack} />
        <div className="px-4 pt-6 flex flex-col gap-4">
          <div className="bg-white rounded-2xl border border-[#D1E8D7] p-5 text-center">
            <p className="text-sm font-semibold text-[#0D1E12] mb-2">Nenhuma inscrição selecionada</p>
            <p className="text-xs text-[#4E6859] mb-4 leading-relaxed">
              Conclua uma inscrição ou abra os documentos a partir de Minhas Inscrições.
            </p>
            <Btn v="primary" cls="w-full h-12" onClick={() => { setNav?.("inscricoes"); goto("inscricoes") }}>
              Ir para Minhas Inscrições
            </Btn>
            <Btn v="secondary" cls="w-full h-12 mt-2" onClick={() => goto("processos")}>
              Ver cursos
            </Btn>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <BackHeader title="Envio de Documentos" onBack={onBack} />

      <div className="px-4 pt-4">
        <div className="bg-white rounded-2xl border border-[#D1E8D7] p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-bold text-[#0D1E12]">Progresso</p>
            <span className="font-mono text-sm font-bold text-[#2A7B3E]">{enviados}/{total}</span>
          </div>
          <div className="h-2 bg-[#E4EBE6] rounded-full overflow-hidden">
            <div className="h-full bg-[#2A7B3E] rounded-full transition-all" style={{ width: `${total ? (enviados / total) * 100 : 0}%` }} />
          </div>
          <p className="text-xs text-[#4E6859] mt-2">{missing} documento(s) ainda precisam ser enviados</p>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 mb-4 flex gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-amber-800 text-xs leading-relaxed">Envie documentos em boa iluminação, sem rasuras, com todos os cantos visíveis. Formatos aceitos: JPG, PNG ou PDF (máx. 5MB). Offline: ficam na fila e sincronizam ao voltar a rede.</p>
        </div>

        {queueCount > 0 && (
          <p className="mb-3 text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded-xl p-3" role="status">
            Fila offline: {queueCount} documento(s) aguardando sincronização.
          </p>
        )}
        {syncMsg && (
          <p className="mb-3 text-xs text-[#2A7B3E] bg-[#E7F4EA] border border-[#D1E8D7] rounded-xl p-3" role="status">
            {syncMsg}
          </p>
        )}
        {docsError && (
          <p className="mb-3 text-xs text-red-700" role="alert">{docsError}</p>
        )}
        {uploadError && (
          <p className="mb-3 text-xs text-red-700" role="alert">{uploadError}</p>
        )}
        {localPendingCamera && !cameraBlob && (
          <p className="mb-3 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-3">
            Foto capturada. Se o envio automático falhar, use Arquivo na lista.
          </p>
        )}

        <div className="flex flex-col gap-3 pb-4">
          {docs.length === 0 && !docsError ? (
            <p className="text-sm text-[#4E6859] text-center py-4">Nenhum documento listado para esta inscrição.</p>
          ) : null}
          {docs.map(doc => (
            <div key={doc.id}
              className={`bg-white rounded-2xl border p-4 ${doc.status === "pendente" ? "border-amber-300" : doc.status === "enviado" ? "border-[#D1E8D7]" : "border-[#E4EBE6]"}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-bold text-[#0D1E12]">{doc.nome}</p>
                    {doc.obrigatorio && <span className="text-[10px] text-red-500 font-bold">OBRIGATÓRIO</span>}
                  </div>
                  <Badge s={doc.status === "na" ? "na" : doc.status} />
                </div>
                {statusIcon(doc.status)}
              </div>

              {doc.status !== "na" && (
                <div className="mt-3 pt-3 border-t border-[#E4EBE6] flex gap-2">
                  {doc.tipo === "camera" ? (
                    <button onClick={() => goto("camera")}
                      className="flex-1 flex items-center justify-center gap-2 h-10 rounded-xl bg-[#2A7B3E] text-white text-sm font-semibold hover:bg-[#1D5C2E] transition-colors focus-visible:outline-2 focus-visible:outline-[#2A7B3E]">
                      <Camera className="w-4 h-4" /> Tirar Foto
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => {
                          const input = document.createElement("input")
                          input.type = "file"
                          input.accept = DOC_ACCEPT
                          input.onchange = () => {
                            const file = input.files?.[0]
                            if (!file) return
                            void (async () => {
                              setUploadError(null)
                              setSyncMsg(null)
                              if (shouldUseMocks()) return
                              const err = validateDocFile(file)
                              if (err) {
                                setUploadError(err)
                                return
                              }
                              try {
                                await submitDocFile({
                                  docId: doc.id,
                                  tipoDocumento: doc.nome,
                                  file,
                                  fileName: file.name,
                                })
                              } catch {
                                setUploadError("Falha no envio do documento. Verifique formato/tamanho e tente de novo.")
                              }
                            })()
                          }
                          input.click()
                        }}
                        className="flex-1 flex items-center justify-center gap-2 h-10 rounded-xl border-2 border-[#D1E8D7] text-[#2A7B3E] text-sm font-semibold hover:bg-[#E7F4EA] transition-colors focus-visible:outline-2 focus-visible:outline-[#2A7B3E]">
                        <Upload className="w-4 h-4" /> {doc.status === "enviado" ? "Substituir" : "Arquivo"}
                      </button>
                      <button onClick={() => goto("camera")}
                        className="flex-1 flex items-center justify-center gap-2 h-10 rounded-xl border-2 border-[#D1E8D7] text-[#2A7B3E] text-sm font-semibold hover:bg-[#E7F4EA] transition-colors focus-visible:outline-2 focus-visible:outline-[#2A7B3E]">
                        <Camera className="w-4 h-4" /> Câmera
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        <Btn
          v="primary"
          cls="w-full h-14"
          disabled={!canFinish}
          onClick={() => {
            reload()
            setNav?.("inscricoes")
            goto("inscricoes")
          }}
        >
          <CheckCircle className="w-5 h-5" /> Finalizar Envio
        </Btn>
        {!canFinish && (
          <p className="text-center text-xs text-[#4E6859] mt-2 pb-4">
            Envie os {missing} documento(s) pendente(s) para habilitar Finalizar Envio.
          </p>
        )}
        {canFinish && (
          <p className="text-center text-xs text-[#4E6859] mt-2 pb-4">Você pode finalizar e acompanhar em Minhas Inscrições.</p>
        )}
      </div>
    </div>
  )
}

// ─── CAMERA SCREEN (PPI collection — no CNN) ──────────────────────────────────
function CameraScreen({
  onBack,
  onConfirmCapture,
}: {
  onBack: () => void
  onConfirmCapture?: (blob: Blob) => void
}) {
  const [consented, setConsented] = useState(false)
  const [captured, setCaptured] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  useEffect(() => {
    if (!consented || captured) return
    let cancelled = false
    ;(async () => {
      setCameraError(null)
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          setCameraError("Câmera indisponível neste dispositivo/navegador.")
          return
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user" },
          audio: false,
        })
        if (cancelled) {
          stream.getTracks().forEach(t => t.stop())
          return
        }
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play().catch(() => undefined)
        }
      } catch {
        if (!cancelled) setCameraError("Não foi possível aceder à câmera. Verifique permissões.")
      }
    })()
    return () => {
      cancelled = true
      streamRef.current?.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
  }, [consented, captured])

  function stopStream() {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
  }

  function takePhoto() {
    const video = videoRef.current
    if (!video) {
      setCaptured(true)
      return
    }
    const canvas = document.createElement("canvas")
    canvas.width = video.videoWidth || 640
    canvas.height = video.videoHeight || 480
    const ctx = canvas.getContext("2d")
    if (!ctx) {
      setCameraError("Falha ao capturar frame.")
      return
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    canvas.toBlob(
      blob => {
        if (!blob) {
          setCameraError("Falha ao gerar imagem.")
          return
        }
        setCapturedBlob(blob)
        setPreviewUrl(URL.createObjectURL(blob))
        setCaptured(true)
        stopStream()
      },
      "image/jpeg",
      0.92,
    )
  }

  if (!consented) {
    return (
      <div>
        <BackHeader title="Autodeclaração Étnico-Racial" onBack={onBack} />
        <div className="px-4 pt-5 pb-4">
          <div className="bg-white rounded-2xl border border-[#D1E8D7] overflow-hidden mb-4">
            <div className="bg-[#2A7B3E] px-4 py-3 flex items-center gap-2">
              <Shield className="w-5 h-5 text-white" />
              <p className="text-white font-bold text-sm">Aviso de Privacidade — LGPD</p>
            </div>
            <div className="p-4 flex flex-col gap-3">
              {[
                { title: "Por que coletamos sua foto?", text: "Para verificar a autodeclaração de raça/cor como parte do processo de cotas étnico-raciais do IFB, conforme exigido pelo edital." },
                { title: "Como seus dados são usados?", text: "A imagem é usada apenas para análise de heteroidentificação por comissão designada. Não é compartilhada com terceiros. Não há classificação automática por CNN nesta versão." },
                { title: "Seus direitos (LGPD)", text: "Você pode solicitar exclusão dos dados a qualquer momento pelo e-mail privacidade@ifb.edu.br, conforme a Lei 13.709/2018." },
              ].map(({ title, text }) => (
                <div key={title}>
                  <p className="text-sm font-bold text-[#0D1E12]">{title}</p>
                  <p className="text-xs text-[#4E6859] mt-1 leading-relaxed">{text}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3.5 mb-5 flex gap-2.5">
            <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
            <p className="text-blue-800 text-xs leading-relaxed">
              <span className="font-bold">Dicas para uma boa foto:</span> boa iluminação frontal, rosto centralizado, sem óculos de sol ou chapéu, fundo neutro.
            </p>
          </div>

          <Btn v="primary" cls="w-full h-14" onClick={() => setConsented(true)}>
            <Shield className="w-5 h-5" /> Entendi e Concordo
          </Btn>
          <button onClick={onBack} className="w-full mt-3 text-center text-sm text-[#4E6859] font-medium py-3 focus-visible:outline-2 focus-visible:outline-[#2A7B3E] rounded-xl">
            Não concordar e voltar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <BackHeader title="Captura de Foto" onBack={() => { setCaptured(false); setConsented(false); stopStream(); onBack() }} />
      <div className="px-4 pt-4 pb-4">
        {captured ? (
          <div className="flex flex-col items-center gap-4">
            <div className="w-48 h-48 rounded-full bg-[#E7F4EA] border-4 border-[#2A7B3E] flex items-center justify-center overflow-hidden">
              {previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={previewUrl} alt="Pré-visualização da captura PPI" className="w-full h-full object-cover" />
              ) : (
                <User className="w-24 h-24 text-[#2A7B3E] opacity-40" />
              )}
            </div>
            <div className="text-center">
              <CheckCircle className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
              <p className="text-[#0D1E12] font-bold">Foto capturada com sucesso!</p>
              <p className="text-[#4E6859] text-sm mt-1">Verifique se o rosto está visível e nítido</p>
            </div>
            <div className="flex gap-3 w-full">
              <Btn v="outline" cls="flex-1 h-12" onClick={() => { setCaptured(false); setCapturedBlob(null); if (previewUrl) URL.revokeObjectURL(previewUrl); setPreviewUrl(null) }}>
                <RefreshCw className="w-4 h-4" /> Repetir
              </Btn>
              <Btn
                v="primary"
                cls="flex-1 h-12"
                onClick={() => {
                  if (capturedBlob) onConfirmCapture?.(capturedBlob)
                  onBack()
                }}
              >
                <Check className="w-4 h-4" /> Confirmar
              </Btn>
            </div>
            <p className="text-xs text-[#4E6859] text-center leading-relaxed">
              A foto será enviada à lista de documentos (ou à fila offline se sem rede). Sem classificação CNN.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="relative rounded-2xl overflow-hidden bg-[#0D1E12]" style={{ aspectRatio: "3/4" }}>
              <video
                ref={videoRef}
                playsInline
                muted
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-44 h-56 rounded-full border-4 border-white/60 shadow-[0_0_0_1000px_rgba(0,0,0,0.4)]" />
              </div>
              <div className="absolute bottom-4 left-0 right-0 flex justify-center">
                <div className="bg-black/60 backdrop-blur-sm rounded-full px-4 py-2">
                  <p className="text-white text-xs font-medium text-center">Centralize seu rosto na moldura</p>
                </div>
              </div>
            </div>
            {cameraError && (
              <p className="text-xs text-red-700" role="alert">{cameraError}</p>
            )}
            <div className="grid grid-cols-3 gap-2">
              {[
                { icon: "💡", tip: "Boa iluminação frontal" },
                { icon: "😐", tip: "Expressão neutra" },
                { icon: "🎯", tip: "Rosto centralizado" },
              ].map(({ icon, tip }) => (
                <div key={tip} className="bg-white border border-[#D1E8D7] rounded-xl p-2.5 text-center">
                  <p className="text-xl mb-1">{icon}</p>
                  <p className="text-[10px] text-[#4E6859] font-medium leading-tight">{tip}</p>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-center pt-2">
              <button onClick={takePhoto}
                className="w-20 h-20 rounded-full bg-white border-4 border-[#2A7B3E] flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-transform focus-visible:outline-4 focus-visible:outline-[#2A7B3E] focus-visible:outline-offset-4">
                <div className="w-14 h-14 rounded-full bg-[#2A7B3E] flex items-center justify-center">
                  <Camera className="w-7 h-7 text-white" />
                </div>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── MINHAS INSCRIÇÕES (Dashboard) ────────────────────────────────────────────
function InscricoesScreen({
  goto, onOpenDocs, setNav,
}: {
  goto: (s: Screen) => void
  onOpenDocs: (candidaturaId: number) => void
  setNav?: (t: NavTab) => void
}) {
  const loggedIn = shouldUseMocks() || getSessionUserId() != null
  const { active, past, cancelActive, downloadComprovante, source, error: listError } = useInscricoes()
  const currentStep = active
    ? statusCandidaturaToInscricaoStep(active.status)
    : 0
  const [cancelError, setCancelError] = useState<string | null>(null)
  const [cancelling, setCancelling] = useState(false)
  const [downloadError, setDownloadError] = useState<string | null>(null)
  const [downloading, setDownloading] = useState(false)

  async function handleCancel() {
    if (cancelling) return
    if (!window.confirm("Cancelar esta inscrição? Esta ação não pode ser desfeita nesta fase.")) {
      return
    }
    setCancelling(true)
    setCancelError(null)
    try {
      await cancelActive()
    } catch (err) {
      setCancelError(messageFromInscricaoApiError(err))
    } finally {
      setCancelling(false)
    }
  }

  async function handleDownloadComprovante() {
    if (downloading) return
    setDownloading(true)
    setDownloadError(null)
    try {
      await downloadComprovante()
    } catch (err) {
      setDownloadError(messageFromInscricaoApiError(err))
    } finally {
      setDownloading(false)
    }
  }

  if (!loggedIn) {
    return (
      <div>
        <div className="bg-[#2A7B3E] px-4 pt-10 pb-5">
          <h1 className="text-white text-xl font-extrabold">Minhas Inscrições</h1>
          <p className="text-emerald-200 text-sm mt-0.5">Acompanhe o status das suas candidaturas</p>
        </div>
        <div className="px-4 pt-6 flex flex-col gap-4">
          <div className="bg-white rounded-2xl border border-[#D1E8D7] p-5 text-center">
            <p className="text-sm text-[#0D1E12] font-semibold mb-2">Login necessário</p>
            <p className="text-xs text-[#4E6859] mb-4 leading-relaxed">
              Entre com CPF ou e-mail para ver as suas inscrições. A listagem pública de cursos permanece disponível sem login.
            </p>
            <Btn v="primary" cls="w-full h-12" onClick={() => { setNav?.("perfil"); goto("perfil") }}>
              Ir para Perfil / Entrar
            </Btn>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="bg-[#2A7B3E] px-4 pt-10 pb-5">
        <h1 className="text-white text-xl font-extrabold">Minhas Inscrições</h1>
        <p className="text-emerald-200 text-sm mt-0.5">Acompanhe o status das suas candidaturas</p>
      </div>

      <div className="px-4 pt-4 flex flex-col gap-4 pb-4">
        {listError && (
          <p className="text-sm text-red-700 text-center py-2" role="alert">{listError}</p>
        )}

        {!active && !listError && (
          <div className="bg-white rounded-2xl border border-[#D1E8D7] p-5 text-center">
            <p className="text-sm text-[#0D1E12] font-semibold mb-2">Nenhuma inscrição ativa</p>
            <p className="text-xs text-[#4E6859] mb-4 leading-relaxed">
              Escolha um curso com inscrições abertas para começar.
            </p>
            <Btn v="primary" cls="w-full h-12" onClick={() => goto("processos")}>
              Ver cursos
            </Btn>
          </div>
        )}

        {/* Active inscription card */}
        {active && (
          <div className="bg-white rounded-2xl border border-[#D1E8D7] overflow-hidden">
            <div className="bg-[#2A7B3E] px-4 py-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-white text-base font-bold leading-snug">{active.curso}</p>
                  <p className="text-emerald-200 text-xs mt-0.5">{active.campus}</p>
                </div>
                <Badge s={active.statusBadge} />
              </div>
            </div>

            <div className="px-4 py-4">
              <div className="flex gap-3 mb-4 text-xs font-rawline text-[#4E6859]">
                <span>Nº {active.protocolo || "—"}</span>
                <span>•</span>
                <span>Inscrito em {active.data}</span>
              </div>

              {/* Timeline stepper */}
              <div className="relative">
                {/* Connecting line */}
                <div className="absolute left-3.5 top-4 bottom-4 w-0.5 bg-[#D1E8D7]">
                  <div className="w-full bg-[#2A7B3E] transition-all" style={{ height: `${(currentStep / (INSCRICAO_STEPS.length - 1)) * 100}%` }} />
                </div>

                <div className="flex flex-col gap-5">
                  {INSCRICAO_STEPS.map((s, i) => {
                    const done = i < currentStep
                    const activeStep = i === currentStep
                    const future = i > currentStep
                    return (
                      <div key={s.label} className="flex items-start gap-3 relative">
                        <div className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center border-2 transition-all z-10 ${done ? "bg-[#2A7B3E] border-[#2A7B3E]" : activeStep ? "bg-white border-[#2A7B3E] ring-4 ring-[#2A7B3E]/15" : "bg-white border-[#D1E8D7]"}`}>
                          {done ? <Check className="w-3.5 h-3.5 text-white" />
                            : activeStep ? <Clock className="w-3.5 h-3.5 text-[#2A7B3E]" />
                              : <div className={`w-2 h-2 rounded-full ${future ? "bg-[#D1E8D7]" : "bg-[#2A7B3E]"}`} />}
                        </div>
                        <div className={`flex-1 pt-0.5 pb-1 ${future ? "opacity-40" : ""}`}>
                          <p className={`text-sm font-bold leading-snug ${activeStep ? "text-[#2A7B3E]" : "text-[#0D1E12]"}`}>{s.label}</p>
                          <p className="text-xs text-[#4E6859] mt-0.5">{s.sub}</p>
                          {activeStep && (
                            <div className="mt-2 inline-flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1">
                              <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                              <span className="text-amber-700 text-[11px] font-semibold">Em andamento</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            <div className="px-4 pb-4 flex flex-col gap-2">
              <button onClick={() => goto("edital")}
                className="w-full flex items-center justify-center gap-2 h-10 rounded-xl border-2 border-[#D1E8D7] text-[#2A7B3E] text-sm font-semibold hover:bg-[#E7F4EA] transition-colors focus-visible:outline-2 focus-visible:outline-[#2A7B3E]">
                Ver detalhes do edital <ChevronRight className="w-4 h-4" />
              </button>
              {source === "api" && active.id > 0 && active.protocolo && (
                <button
                  type="button"
                  disabled={downloading}
                  onClick={() => { void handleDownloadComprovante() }}
                  className="w-full flex items-center justify-center gap-2 h-10 rounded-xl bg-[#2A7B3E] text-white text-sm font-semibold hover:bg-[#236b35] transition-colors focus-visible:outline-2 focus-visible:outline-[#2A7B3E] disabled:opacity-60"
                >
                  <FileText className="w-4 h-4" />
                  {downloading ? "Gerando PDF…" : "Baixar comprovante (PDF)"}
                </button>
              )}
              {downloadError && (
                <p className="text-xs text-red-700 text-center leading-relaxed">{downloadError}</p>
              )}
              {source === "api" && active.id > 0 && (
                <button
                  type="button"
                  disabled={cancelling}
                  onClick={() => { void handleCancel() }}
                  className="w-full flex items-center justify-center gap-2 h-10 rounded-xl border-2 border-red-200 text-red-700 text-sm font-semibold hover:bg-red-50 transition-colors focus-visible:outline-2 focus-visible:outline-red-600 disabled:opacity-60"
                >
                  {cancelling ? "Cancelando…" : "Cancelar inscrição"}
                </button>
              )}
              {cancelError && (
                <p className="text-xs text-red-700 text-center leading-relaxed">{cancelError}</p>
              )}
            </div>
          </div>
        )}

        {/* Past inscriptions */}
        <div>
          <p className="text-[#0D1E12] text-sm font-bold mb-3">Inscrições Anteriores</p>
          <div className="bg-white rounded-2xl border border-[#D1E8D7] divide-y divide-[#E4EBE6]">
            {past.map(ins => (
              <div key={`${ins.id}-${ins.curso}`} className="flex items-center gap-3 px-4 py-3">
                <div className="flex-1">
                  <p className="text-sm font-semibold text-[#0D1E12]">{ins.curso}</p>
                  <p className="text-xs text-[#4E6859]">{ins.campus} · {ins.data}</p>
                </div>
                <Badge s={ins.statusBadge} />
              </div>
            ))}
            {!past.length && (
              <p className="px-4 py-3 text-xs text-[#4E6859]">Nenhuma inscrição anterior.</p>
            )}
          </div>
        </div>

        <Btn v="secondary" cls="w-full h-12" onClick={() => goto("processos")}>
          <Plus className="w-4 h-4" /> Nova Inscrição
        </Btn>
      </div>
    </div>
  )
}

// ─── NOTIFICAÇÕES SCREEN ──────────────────────────────────────────────────────
function NotifScreen() {
  const iconMap: Record<string, { icon: ElementType; cls: string; bg: string }> = {
    erro: { icon: AlertCircle, cls: "text-red-600", bg: "bg-red-100" },
    info: { icon: Info, cls: "text-blue-600", bg: "bg-blue-100" },
    sucesso: { icon: CheckCircle, cls: "text-emerald-600", bg: "bg-emerald-100" },
    aviso: { icon: AlertTriangle, cls: "text-amber-600", bg: "bg-amber-100" },
  }

  const unread = NOTIFS.filter(n => !n.lida).length

  return (
    <div>
      <div className="bg-[#2A7B3E] px-4 pt-10 pb-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-white text-xl font-extrabold">Notificações</h1>
            {unread > 0 && <p className="text-emerald-200 text-sm mt-0.5">{unread} não lida{unread > 1 ? "s" : ""}</p>}
          </div>
          {unread > 0 && (
            <button className="text-emerald-200 text-xs font-semibold focus-visible:outline-2 focus-visible:outline-white rounded px-2 py-1 hover:text-white">
              Marcar todas
            </button>
          )}
        </div>
      </div>

      <div className="px-4 pt-4 flex flex-col gap-2 pb-4">
        {NOTIFS.map(n => {
          const cfg = iconMap[n.tipo] ?? iconMap.info!
          const Icon = cfg.icon
          return (
            <div key={n.id}
              className={`bg-white rounded-2xl border p-4 flex gap-3 transition-all ${!n.lida ? "border-[#2A7B3E]/40 shadow-sm" : "border-[#E4EBE6]"}`}>
              <div className={`w-10 h-10 rounded-full ${cfg.bg} flex items-center justify-center flex-shrink-0`}>
                <Icon className={`w-5 h-5 ${cfg.cls}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className={`text-sm font-bold text-[#0D1E12] ${!n.lida ? "" : "font-semibold"}`}>{n.titulo}</p>
                  {!n.lida && <div className="w-2.5 h-2.5 rounded-full bg-[#2A7B3E] flex-shrink-0 mt-1.5" />}
                </div>
                <p className="text-xs text-[#4E6859] mt-1 leading-relaxed">{n.msg}</p>
                <p className="text-[11px] text-[#A8C4B0] font-mono mt-2">{n.tempo}</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── MEUS DADOS (REQ-2.1) ─────────────────────────────────────────────────────
function MeusDadosScreen({ onBack }: { onBack: () => void }) {
  const { user, authed, refresh, loading } = useProfile()
  const [nome, setNome] = useState("")
  const [telefone, setTelefone] = useState("")
  const [nascimento, setNascimento] = useState("")
  const [estado, setEstado] = useState("")
  const [cidade, setCidade] = useState("")
  const [cep, setCep] = useState("")
  const [logradouro, setLogradouro] = useState("")
  const [bairro, setBairro] = useState("")
  const [numero, setNumero] = useState("")
  const [complemento, setComplemento] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedOk, setSavedOk] = useState(false)
  const [docSlots, setDocSlots] = useState<TipoBaseSlot[]>([])
  const [docsLoading, setDocsLoading] = useState(false)
  const [docsError, setDocsError] = useState<string | null>(null)
  const [docsBusyId, setDocsBusyId] = useState<number | null>(null)
  const fileInputRefs = useRef<Record<number, HTMLInputElement | null>>({})

  useEffect(() => {
    if (!user) return
    const end0 = user.enderecos?.[0]
    setNome(user.nome_completo ?? "")
    setTelefone(user.telefone ?? "")
    setNascimento(user.data_nascimento?.slice(0, 10) ?? "")
    setEstado(end0?.estado ?? "")
    setCidade(end0?.cidade ?? "")
    setCep(end0?.CEP ?? "")
    setLogradouro(end0?.logradouro ?? "")
    setBairro(end0?.bairro ?? "")
    setNumero(end0?.numero_residencia ?? "")
    setComplemento(end0?.complemento ?? "")
  }, [user])

  async function refreshDocs() {
    if (!authed || shouldUseMocks()) {
      setDocSlots([])
      return
    }
    setDocsLoading(true)
    setDocsError(null)
    try {
      const [tipos, docs] = await Promise.all([
        fetchTiposBaseAtivos(),
        fetchDocumentosConta(),
      ])
      setDocSlots(mergeDocumentoContaSlots(tipos, docs))
    } catch {
      setDocsError("Não foi possível carregar documentos da conta.")
      setDocSlots([])
    } finally {
      setDocsLoading(false)
    }
  }

  useEffect(() => {
    void refreshDocs()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refresh when auth flips
  }, [authed])

  async function handleUpload(tipoId: number, file: File | undefined) {
    if (!file) return
    setDocsBusyId(tipoId)
    setDocsError(null)
    try {
      await upsertDocumentoConta(tipoId, file)
      await refreshDocs()
    } catch {
      setDocsError("Falha no envio do documento. Verifique o formato/tamanho.")
    } finally {
      setDocsBusyId(null)
    }
  }

  async function handleRemoveDoc(tipoId: number) {
    setDocsBusyId(tipoId)
    setDocsError(null)
    try {
      await deleteDocumentoConta(tipoId)
      await refreshDocs()
    } catch {
      setDocsError("Não foi possível remover o documento.")
    } finally {
      setDocsBusyId(null)
    }
  }

  async function handleSave() {
    if (!authed || !user) {
      setError("Faça login para editar Meus Dados.")
      return
    }
    setSaving(true)
    setError(null)
    setSavedOk(false)
    try {
      await updateCurrentUser({
        nome_completo: nome.trim(),
        telefone: telefone.trim(),
        data_nascimento: nascimento || undefined,
        endereco: {
          estado: estado.trim(),
          cidade: cidade.trim(),
          CEP: cep.trim(),
          logradouro: logradouro.trim(),
          bairro: bairro.trim(),
          numero_residencia: numero.trim(),
          complemento: complemento.trim() || undefined,
        },
      })
      await refresh()
      setSavedOk(true)
    } catch {
      setError("Não foi possível salvar. Tente novamente.")
    } finally {
      setSaving(false)
    }
  }

  const inputCls =
    "h-12 px-4 rounded-xl border-2 border-[#D1E8D7] bg-white text-[#0D1E12] placeholder:text-[#A8C4B0] focus:outline-none focus:border-[#2A7B3E] focus:ring-4 focus:ring-[#2A7B3E]/10 text-base w-full"

  function Labeled({
    label, children, required,
  }: { label: string; children: ReactNode; required?: boolean }) {
    return (
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-semibold text-[#0D1E12]">
          {label}{required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
        {children}
      </div>
    )
  }

  return (
    <div>
      <div className="bg-[#2A7B3E] px-4 pt-10 pb-5 flex items-center gap-3">
        <button
          onClick={onBack}
          aria-label="Voltar"
          className="w-10 h-10 flex items-center justify-center rounded-full bg-white/15 text-white focus-visible:outline-2 focus-visible:outline-white"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-white text-xl font-extrabold">Meus Dados</h1>
          <p className="text-emerald-200 text-sm mt-0.5">Pessoais, telefone e endereço</p>
        </div>
      </div>

      <div className="px-4 pt-4 pb-6 flex flex-col gap-4">
        {!authed && !loading && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-amber-900 text-sm">
            Entre na conta (Perfil) para visualizar e editar seus dados.
          </div>
        )}

        <section className="bg-white rounded-2xl border border-[#D1E8D7] p-4 flex flex-col gap-3">
          <p className="text-sm font-bold text-[#0D1E12]">Dados pessoais</p>
          <Labeled label="Nome completo" required>
            <input className={inputCls} value={nome} onChange={e => setNome(e.target.value)} aria-label="Nome completo" disabled={!authed} />
          </Labeled>
          <Labeled label="CPF">
            <input className={inputCls} value={user?.CPF ?? ""} readOnly aria-label="CPF" disabled />
          </Labeled>
          <Labeled label="E-mail">
            <input className={inputCls} value={user?.email ?? ""} readOnly aria-label="E-mail" disabled />
          </Labeled>
          <Labeled label="Data de nascimento" required>
            <input className={inputCls} type="date" value={nascimento} onChange={e => setNascimento(e.target.value)} aria-label="Data de nascimento" disabled={!authed} />
          </Labeled>
          <Labeled label="Telefone / WhatsApp" required>
            <input className={inputCls} type="tel" value={telefone} onChange={e => setTelefone(e.target.value)} aria-label="Telefone" disabled={!authed} />
          </Labeled>
        </section>

        <section className="bg-white rounded-2xl border border-[#D1E8D7] p-4 flex flex-col gap-3">
          <p className="text-sm font-bold text-[#0D1E12]">Endereço</p>
          <Labeled label="CEP" required>
            <input className={inputCls} value={cep} onChange={e => setCep(e.target.value)} aria-label="CEP" disabled={!authed} />
          </Labeled>
          <Labeled label="Logradouro" required>
            <input className={inputCls} value={logradouro} onChange={e => setLogradouro(e.target.value)} aria-label="Logradouro" disabled={!authed} />
          </Labeled>
          <div className="grid grid-cols-2 gap-3">
            <Labeled label="Número" required>
              <input className={inputCls} value={numero} onChange={e => setNumero(e.target.value)} aria-label="Número" disabled={!authed} />
            </Labeled>
            <Labeled label="Complemento">
              <input className={inputCls} value={complemento} onChange={e => setComplemento(e.target.value)} aria-label="Complemento" disabled={!authed} />
            </Labeled>
          </div>
          <Labeled label="Bairro" required>
            <input className={inputCls} value={bairro} onChange={e => setBairro(e.target.value)} aria-label="Bairro" disabled={!authed} />
          </Labeled>
          <div className="grid grid-cols-2 gap-3">
            <Labeled label="Cidade" required>
              <input className={inputCls} value={cidade} onChange={e => setCidade(e.target.value)} aria-label="Cidade" disabled={!authed} />
            </Labeled>
            <Labeled label="Estado" required>
              <input className={inputCls} value={estado} onChange={e => setEstado(e.target.value)} aria-label="Estado" disabled={!authed} />
            </Labeled>
          </div>
        </section>

        {error && <p className="text-xs text-red-600">{error}</p>}
        {savedOk && <p className="text-xs text-[#2A7B3E] font-semibold">Dados salvos. Inscrições já enviadas não são alteradas.</p>}

        <Btn v="primary" cls="w-full h-12" disabled={!authed || saving} onClick={() => { void handleSave() }}>
          {saving ? "Salvando…" : "Salvar Meus Dados"}
        </Btn>

        <section className="bg-white rounded-2xl border border-[#D1E8D7] p-4 flex flex-col gap-3">
          <div>
            <p className="text-sm font-bold text-[#0D1E12]">Documentos da conta</p>
            <p className="text-xs text-[#4E6859] mt-0.5">Um ficheiro atual por tipo (substitui ao enviar de novo). Reutilização em inscrições: REQ-2.6.</p>
          </div>
          {docsLoading && <p className="text-xs text-[#4E6859]">A carregar documentos…</p>}
          {docsError && <p className="text-xs text-red-600">{docsError}</p>}
          {!docsLoading && authed && docSlots.length === 0 && !docsError && (
            <p className="text-xs text-[#4E6859]">Nenhum tipo base ativo configurado.</p>
          )}
          {docSlots.map((slot) => (
            <div key={slot.id} className="flex items-start gap-3 border border-[#E4EBE6] rounded-xl p-3">
              <div className="w-9 h-9 rounded-xl bg-[#E7F4EA] flex items-center justify-center flex-shrink-0">
                <FileText className="w-4 h-4 text-[#2A7B3E]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[#0D1E12]">{slot.nome}</p>
                <p className="text-xs text-[#4E6859] truncate">
                  {slot.current
                    ? `Atual: ${slot.current.nome_arquivo}`
                    : "Nenhum ficheiro enviado"}
                </p>
                {slot.formatos.length > 0 && (
                  <p className="text-[10px] text-[#A8C4B0] mt-0.5">Formatos: {slot.formatos.join(", ")}</p>
                )}
                <div className="flex flex-wrap gap-2 mt-2">
                  <input
                    ref={(el) => { fileInputRefs.current[slot.id] = el }}
                    type="file"
                    className="hidden"
                    aria-label={`Enviar ${slot.nome}`}
                    onChange={(e) => {
                      const f = e.target.files?.[0]
                      void handleUpload(slot.id, f)
                      e.target.value = ""
                    }}
                  />
                  <Btn
                    v="secondary"
                    cls="h-10 px-3 text-sm"
                    disabled={docsBusyId === slot.id}
                    onClick={() => fileInputRefs.current[slot.id]?.click()}
                  >
                    {docsBusyId === slot.id ? "…" : slot.current ? "Substituir" : "Enviar"}
                  </Btn>
                  {slot.current && (
                    <Btn
                      v="ghost"
                      cls="h-10 px-3 text-sm text-red-600"
                      disabled={docsBusyId === slot.id}
                      onClick={() => { void handleRemoveDoc(slot.id) }}
                    >
                      Remover
                    </Btn>
                  )}
                </div>
              </div>
            </div>
          ))}
        </section>
      </div>
    </div>
  )
}

// ─── PERFIL SCREEN ────────────────────────────────────────────────────────────
function PerfilScreen({
  goto, setNav, onAuthChange, onOpenChat, onRequestDocs,
}: {
  goto: (s: Screen) => void
  setNav: (t: NavTab) => void
  onAuthChange: () => void
  onOpenChat: () => void
  onRequestDocs: () => void
}) {
  const { user, authed, refresh } = useProfile()
  const [authTab, setAuthTab] = useState<"entrar" | "criar">("entrar")
  const [identifier, setIdentifier] = useState("")
  const [senha, setSenha] = useState("")
  const [loginError, setLoginError] = useState<string | null>(null)
  const [loggingIn, setLoggingIn] = useState(false)
  const [regNome, setRegNome] = useState("")
  const [regCpf, setRegCpf] = useState("")
  const [regEmail, setRegEmail] = useState("")
  const [regSenha, setRegSenha] = useState("")
  const [regNascimento, setRegNascimento] = useState("")
  const [regTelefone, setRegTelefone] = useState("")
  const [regError, setRegError] = useState<string | null>(null)
  const [registering, setRegistering] = useState(false)

  const displayName = authed && user ? user.nome_completo : "Conta do candidato"
  const displayCpf = authed && user ? maskCpf(user.CPF) : "Entre ou crie uma conta"

  async function handleLogin() {
    setLoggingIn(true)
    setLoginError(null)
    try {
      await login(loginPayloadFromIdentifier(identifier, senha))
      await refresh()
      onAuthChange()
    } catch {
      setLoginError("Falha no login. Verifique CPF/e-mail e senha.")
    } finally {
      setLoggingIn(false)
    }
  }

  async function handleRegister() {
    setRegistering(true)
    setRegError(null)
    const cpfDigits = regCpf.replace(/\D/g, "")
    if (!regNome.trim() || !regEmail.trim() || !regSenha || !cpfDigits || !regNascimento || !regTelefone.trim()) {
      setRegError("Preencha nome, CPF, e-mail, senha, nascimento e telefone.")
      setRegistering(false)
      return
    }
    try {
      if (shouldUseMocks()) {
        await login(loginPayloadFromIdentifier(regEmail, regSenha)).catch(() => {
          /* mock: still show success path below if login unavailable */
        })
      } else {
        await register({
          nome_completo: regNome.trim(),
          email: regEmail.trim(),
          senha: regSenha,
          CPF: cpfDigits,
          data_nascimento: regNascimento,
          telefone: regTelefone.trim(),
        })
        await login(loginPayloadFromIdentifier(regEmail, regSenha))
      }
      await refresh()
      onAuthChange()
    } catch {
      setRegError("Não foi possível criar a conta. Verifique os dados ou se o CPF/e-mail já existe.")
    } finally {
      setRegistering(false)
    }
  }

  function handleLogout() {
    logout()
    void refresh()
    onAuthChange()
  }

  const inputCls =
    "h-12 px-4 rounded-xl border-2 border-[#D1E8D7] bg-white text-[#0D1E12] placeholder:text-[#A8C4B0] focus:outline-none focus:border-[#2A7B3E] focus:ring-4 focus:ring-[#2A7B3E]/10 text-base"

  return (
    <div>
      <div className="bg-[#2A7B3E] px-4 pt-10 pb-10">
        <div className="flex flex-col items-center">
          <div className="w-20 h-20 rounded-full bg-white/20 border-4 border-white/40 flex items-center justify-center mb-3">
            <User className="w-10 h-10 text-white/80" />
          </div>
          <h1 className="text-white text-xl font-extrabold">{displayName}</h1>
          <p className="text-emerald-200 text-sm mt-0.5 font-mono">{displayCpf}</p>
          <div className="mt-3 inline-flex items-center gap-1.5 bg-white/15 rounded-full px-3 py-1.5">
            <div className={`w-1.5 h-1.5 rounded-full ${authed ? "bg-emerald-300" : "bg-amber-300"}`} />
            <span className="text-emerald-100 text-xs font-semibold">
              {authed ? "Candidato autenticado" : "Não autenticado"}
            </span>
          </div>
        </div>
      </div>

      {!authed && (
        <div className="px-4 -mt-4 mb-4">
          <div className="bg-white rounded-2xl border border-[#D1E8D7] p-4 flex flex-col gap-3">
            <div className="flex gap-1 rounded-xl bg-[#F0F6F2] p-1">
              {([
                { id: "entrar" as const, label: "Entrar" },
                { id: "criar" as const, label: "Criar conta" },
              ]).map(t => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setAuthTab(t.id)}
                  className={`flex-1 h-9 rounded-lg text-sm font-bold transition-all ${authTab === t.id ? "bg-[#2A7B3E] text-white" : "text-[#4E6859]"}`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {authTab === "entrar" ? (
              <>
                <p className="text-sm font-bold text-[#0D1E12]">Entrar com CPF ou e-mail</p>
                <input
                  type="text"
                  value={identifier}
                  onChange={e => setIdentifier(e.target.value)}
                  placeholder="CPF ou e-mail"
                  aria-label="CPF ou e-mail"
                  autoComplete="username"
                  className={inputCls}
                />
                <input
                  type="password"
                  value={senha}
                  onChange={e => setSenha(e.target.value)}
                  placeholder="Senha"
                  aria-label="Senha"
                  autoComplete="current-password"
                  className={inputCls}
                />
                {loginError && <p className="text-xs text-red-600" role="alert">{loginError}</p>}
                <Btn v="primary" cls="w-full h-12" disabled={loggingIn || !identifier.trim() || !senha} onClick={() => { void handleLogin() }}>
                  {loggingIn ? "Entrando…" : "Entrar"}
                </Btn>
              </>
            ) : (
              <>
                <p className="text-sm font-bold text-[#0D1E12]">Criar conta</p>
                <input className={inputCls} value={regNome} onChange={e => setRegNome(e.target.value)} placeholder="Nome completo" aria-label="Nome completo" />
                <input className={inputCls} value={regCpf} onChange={e => setRegCpf(e.target.value)} placeholder="CPF" aria-label="CPF cadastro" />
                <input className={inputCls} type="email" value={regEmail} onChange={e => setRegEmail(e.target.value)} placeholder="E-mail" aria-label="E-mail cadastro" />
                <input className={inputCls} type="password" value={regSenha} onChange={e => setRegSenha(e.target.value)} placeholder="Senha" aria-label="Senha cadastro" />
                <input className={inputCls} type="date" value={regNascimento} onChange={e => setRegNascimento(e.target.value)} aria-label="Data de nascimento cadastro" />
                <input className={inputCls} type="tel" value={regTelefone} onChange={e => setRegTelefone(e.target.value)} placeholder="Telefone" aria-label="Telefone cadastro" />
                {regError && <p className="text-xs text-red-600" role="alert">{regError}</p>}
                <Btn
                  v="primary"
                  cls="w-full h-12"
                  disabled={registering}
                  onClick={() => { void handleRegister() }}
                >
                  {registering ? "Criando…" : "Criar conta e entrar"}
                </Btn>
              </>
            )}
          </div>
        </div>
      )}

      <div className={`px-4 ${authed ? "-mt-4" : ""}`}>
        <div className="bg-white rounded-2xl border border-[#D1E8D7] overflow-hidden divide-y divide-[#E4EBE6]">
          {[
            { icon: User, label: "Meus Dados", sub: "Informações pessoais", action: () => goto("meus-dados") },
            { icon: FileText, label: "Minhas Inscrições", sub: "Histórico de candidaturas", action: () => {
              if (!authed && !shouldUseMocks()) return
              goto("inscricoes"); setNav("inscricoes")
            } },
            { icon: Upload, label: "Documentos Enviados", sub: "Gerenciar arquivos", action: onRequestDocs },
            { icon: HelpCircle, label: "Central de Ajuda", sub: "Assistente e dúvidas", action: onOpenChat },
          ].map(({ icon: Icon, label, sub, action }) => (
            <button key={label} onClick={action}
              className="w-full flex items-center gap-4 px-4 py-3.5 text-left hover:bg-[#F5F8F5] transition-colors focus-visible:outline-2 focus-visible:outline-[#2A7B3E] active:bg-[#E7F4EA]">
              <div className="w-9 h-9 rounded-xl bg-[#E7F4EA] flex items-center justify-center flex-shrink-0">
                <Icon className="w-4.5 h-4.5 text-[#2A7B3E]" strokeWidth={2} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-[#0D1E12]">{label}</p>
                <p className="text-xs text-[#4E6859]">{sub}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-[#A8C4B0]" />
            </button>
          ))}
        </div>

        {authed && (
          <button
            onClick={handleLogout}
            className="w-full mt-4 mb-4 flex items-center justify-center gap-2 h-12 rounded-xl border-2 border-red-200 text-red-600 font-semibold text-sm hover:bg-red-50 transition-colors focus-visible:outline-2 focus-visible:outline-red-600"
          >
            <LogOut className="w-4 h-4" /> Sair da Conta
          </button>
        )}

        <div className="text-center pb-4 mt-4">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <div className="text-[10px] font-black text-[#2A7B3E] bg-[#E7F4EA] px-2 py-0.5 rounded border border-[#D1E8D7]">IFB</div>
            <span className="text-[10px] text-[#A8C4B0]">Processo Seletivo Inteligente</span>
          </div>
          <p className="text-[10px] text-[#A8C4B0] font-mono">Versão 1.0.0 · PSI-IFB</p>
        </div>
      </div>
    </div>
  )
}

// ─── ROOT APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [screen, setScreen] = useState<Screen>("home")
  const [nav, setNav] = useState<NavTab>("home")
  const [chat, setChat] = useState(false)
  const [selectedEdital, setSelectedEdital] = useState<EditalCardData | null>(null)
  const [activeCandidaturaId, setActiveCandidaturaId] = useState<number | null>(null)
  const [docsBack, setDocsBack] = useState<"wizard" | "inscricoes">("wizard")
  const [pendingAfterAuth, setPendingAfterAuth] = useState<Screen | null>(null)
  const [cameraCapturePending, setCameraCapturePending] = useState(false)
  const [cameraBlob, setCameraBlob] = useState<Blob | null>(null)

  useEffect(() => {
    const flushOne = async (item: QueuedUpload, blob: Blob) => {
      await postDocumentoUpload({
        candidaturaId: item.candidaturaId,
        tipoDocumento: item.tipoDocumento,
        file: blob,
        fileName: item.fileName,
        replaceId: item.replaceId,
      })
    }
    const off = onOnlineFlush(flushOne)
    if (typeof navigator !== "undefined" && navigator.onLine && listUploadQueue().length) {
      void flushUploadQueue(flushOne)
    }
    return off
  }, [])

  function goto(s: Screen) {
    setScreen(s)
  }

  function handleNav(t: NavTab) {
    setNav(t)
    if (t === "home") goto("home")
    else if (t === "inscricoes") goto("inscricoes")
    else if (t === "notificacoes") goto("notificacoes")
    else if (t === "perfil") goto("perfil")
  }

  function requireAuth(next: Screen) {
    setPendingAfterAuth(next)
    setNav("perfil")
    goto("perfil")
  }

  function openDocs(candidaturaId: number, back: "wizard" | "inscricoes" = "inscricoes") {
    setActiveCandidaturaId(candidaturaId)
    setDocsBack(back)
    goto("docs")
  }

  function requestDocs() {
    if (shouldUseMocks()) {
      setDocsBack("inscricoes")
      goto("docs")
      return
    }
    if (getSessionUserId() == null) {
      requireAuth("inscricoes")
      return
    }
    if (activeCandidaturaId != null && activeCandidaturaId > 0) {
      setDocsBack("inscricoes")
      goto("docs")
      return
    }
    setNav("inscricoes")
    goto("inscricoes")
  }

  function onAuthChange() {
    if (pendingAfterAuth) {
      const next = pendingAfterAuth
      setPendingAfterAuth(null)
      if (next === "inscricoes") setNav("inscricoes")
      goto(next)
    }
  }

  const screenEl: Record<Screen, ReactNode> = {
    home: (
      <HomeScreen
        goto={goto}
        setNav={setNav}
        onSelectEdital={setSelectedEdital}
        onOpenChat={() => setChat(true)}
        onRequestDocs={requestDocs}
      />
    ),
    processos: (
      <ProcessosScreen
        goto={goto}
        onBack={() => goto("home")}
        onSelectEdital={setSelectedEdital}
      />
    ),
    edital: (
      <EditalScreen
        goto={goto}
        setNav={setNav}
        onBack={() => goto(nav === "inscricoes" ? "inscricoes" : "home")}
        edital={selectedEdital}
        onRequireAuth={requireAuth}
        onOpenDocs={(id) => openDocs(id, "inscricoes")}
      />
    ),
    wizard: (
      <WizardScreen
        goto={goto}
        onBack={() => goto("edital")}
        edital={selectedEdital}
        onCandidaturaCreated={(id) => {
          setActiveCandidaturaId(id)
          setDocsBack("wizard")
        }}
      />
    ),
    docs: (
      <DocsScreen
        goto={goto}
        setNav={setNav}
        onBack={() => goto(docsBack === "inscricoes" ? "inscricoes" : "wizard")}
        candidaturaId={activeCandidaturaId}
        cameraCapturePending={cameraCapturePending}
        cameraBlob={cameraBlob}
        onConsumeCameraBlob={() => {
          setCameraBlob(null)
          setCameraCapturePending(false)
        }}
      />
    ),
    camera: (
      <CameraScreen
        onBack={() => goto("docs")}
        onConfirmCapture={(blob) => {
          setCameraBlob(blob)
          setCameraCapturePending(true)
        }}
      />
    ),
    inscricoes: (
      <InscricoesScreen
        goto={goto}
        setNav={setNav}
        onOpenDocs={(id) => openDocs(id, "inscricoes")}
      />
    ),
    notificacoes: <NotifScreen />,
    perfil: (
      <PerfilScreen
        goto={goto}
        setNav={setNav}
        onAuthChange={onAuthChange}
        onOpenChat={() => setChat(true)}
        onRequestDocs={requestDocs}
      />
    ),
    "meus-dados": <MeusDadosScreen onBack={() => goto("perfil")} />,
  }

  return (
    <div className="min-h-dvh bg-[#F5F8F5]">
      <div
        className="relative bg-[#F5F8F5] w-full max-w-lg mx-auto min-h-dvh overflow-hidden flex flex-col"
      >
        <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
          {screenEl[screen]}
        </div>

        <div className="absolute bottom-[84px] right-4 z-50">
          <button
            onClick={() => setChat(true)}
            aria-label="Abrir Assistente Virtual"
            className="w-14 h-14 rounded-full bg-[#2A7B3E] text-white shadow-xl flex items-center justify-center hover:bg-[#1D5C2E] active:scale-95 transition-all focus-visible:outline-4 focus-visible:outline-[#2A7B3E] focus-visible:outline-offset-4"
          >
            <MessageCircle className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-shrink-0 z-40">
          <BottomNav active={nav} onChange={handleNav} />
        </div>

        {chat && <ChatModal onClose={() => setChat(false)} />}
      </div>
    </div>
  )
}

import { useState, useRef } from "react"
import {
  Home, FileText, Bell, User, Search, ArrowLeft, Camera,
  Upload, MessageCircle, CheckCircle, Clock, AlertCircle,
  X, Shield, Calendar, Check, AlertTriangle, Mic, Send,
  Info, Eye, LogOut, ChevronRight, ChevronDown, Filter,
  MapPin, Star, Paperclip, Loader2, GraduationCap,
  Award, UserCheck, BookOpen, Mail, Phone, Edit3,
  RefreshCw, ZoomIn, HelpCircle, Plus
} from "lucide-react"

// ─── Types ────────────────────────────────────────────────────────────────────
type Screen =
  | "home" | "processos" | "edital" | "wizard" | "docs"
  | "camera" | "inscricoes" | "notificacoes" | "perfil"
type NavTab = "home" | "inscricoes" | "notificacoes" | "perfil"
type WizardStep = 1 | 2 | 3 | 4

// ─── Mock Data ────────────────────────────────────────────────────────────────
const EDITAIS = [
  { id: "1", titulo: "Técnico em Informática", sub: "Integrado ao Ensino Médio", campus: "Campus Brasília", vagas: 40, prazo: "10/01/2025", status: "aberto", tipo: "Técnico" },
  { id: "2", titulo: "Superior em Computação", sub: "Bacharelado", campus: "Campus Taguatinga", vagas: 30, prazo: "15/01/2025", status: "aberto", tipo: "Superior" },
  { id: "3", titulo: "Técnico em Hotelaria", sub: "Subsequente", campus: "Campus Planaltina", vagas: 35, prazo: "Encerrado", status: "encerrado", tipo: "Técnico" },
  { id: "4", titulo: "Técnico em Moda", sub: "Integrado ao Ensino Médio", campus: "Campus Samambaia", vagas: 25, prazo: "12/01/2025", status: "aberto", tipo: "Técnico" },
  { id: "5", titulo: "Ensino Médio Integrado", sub: "Regular", campus: "Campus Gama", vagas: 60, prazo: "08/01/2025", status: "aberto", tipo: "Médio" },
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
    pendente: "Pendente", enviado: "Enviado ✓", superior: "Superior",
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
  children: React.ReactNode
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
    <header className="bg-[#2A7B3E] px-4 pt-10 pb-4">
      <div className="flex items-center justify-between">
        <IFBLogo inv />
        <div className="flex items-center gap-2">
          <button onClick={onSearch} aria-label="Buscar" className="w-10 h-10 flex items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25 focus-visible:outline-2 focus-visible:outline-white transition-colors">
            <Search className="w-5 h-5" />
          </button>
          <button onClick={onProfile} aria-label="Perfil" className="w-10 h-10 flex items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25 focus-visible:outline-2 focus-visible:outline-white transition-colors">
            <User className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  )
}

function BackHeader({ title, onBack, right }: { title: string; onBack: () => void; right?: React.ReactNode }) {
  return (
    <header className="bg-[#2A7B3E] px-4 pt-10 pb-4">
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
  const tabs: { id: NavTab; label: string; Icon: React.ElementType; badge?: number }[] = [
    { id: "home", label: "Início", Icon: Home },
    { id: "inscricoes", label: "Inscrições", Icon: FileText },
    { id: "notificacoes", label: "Avisos", Icon: Bell, badge: 2 },
    { id: "perfil", label: "Perfil", Icon: User },
  ]
  return (
    <div className="bg-white border-t border-[#D1E8D7] px-1 pt-2 pb-6">
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
            className="flex-1 h-10 px-3.5 rounded-xl bg-[#F0F6F2] border-2 border-transparent focus:border-[#2A7B3E] focus:ring-4 focus:ring-[#2A7B3E]/10 text-sm text-[#0D1E12] placeholder:text-[#A8C4B0] focus:outline-none transition-all"
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
function EditalCard({ e, onClick }: { e: typeof EDITAIS[0]; onClick: () => void }) {
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
          <div className="flex-1">
            <p className="text-[15px] font-bold text-[#0D1E12] leading-snug">{e.titulo}</p>
            <p className="text-xs text-[#4E6859] mt-0.5">{e.sub}</p>
          </div>
          <Badge s={e.status} />
        </div>
        <div className="flex items-center gap-3 text-xs text-[#4E6859]">
          <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{e.campus}</span>
          <span className="flex items-center gap-1"><User className="w-3 h-3" />{e.vagas} vagas</span>
        </div>
        <div className="mt-3 pt-3 border-t border-[#E4EBE6] flex items-center justify-between">
          <div className="flex items-center gap-1 text-xs text-[#4E6859]">
            <Calendar className="w-3 h-3" />
            <span>Prazo: <span className="font-semibold text-[#0D1E12]">{e.prazo}</span></span>
          </div>
          <ChevronRight className="w-4 h-4 text-[#A8C4B0]" />
        </div>
      </div>
    </button>
  )
}

// ─── HOME SCREEN ──────────────────────────────────────────────────────────────
function HomeScreen({ goto, setNav }: { goto: (s: Screen) => void; setNav: (t: NavTab) => void }) {
  const [filter, setFilter] = useState("Todos")
  const tipos = ["Todos", "Técnico", "Superior", "Médio"]
  const shown = filter === "Todos" ? EDITAIS : EDITAIS.filter(e => e.tipo === filter)

  return (
    <div>
      <MainHeader onProfile={() => { goto("perfil"); setNav("perfil") }} />
      <div className="px-4 pt-5 pb-4 bg-[#2A7B3E]">
        <p className="text-emerald-200 text-sm font-medium">Bem-vindo de volta 👋</p>
        <h2 className="text-white text-2xl font-extrabold mt-0.5">Olá, João!</h2>
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

      {/* Dot indicators */}
      <div className="flex justify-center gap-1.5 mt-3">
        {[0, 1, 2].map(i => (
          <div key={i} className={`rounded-full transition-all ${i === 0 ? "w-5 h-1.5 bg-[#2A7B3E]" : "w-1.5 h-1.5 bg-[#D1E8D7]"}`} />
        ))}
      </div>

      {/* Category filter */}
      <div className="px-4 pt-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[#0D1E12] text-base font-bold">Processos Disponíveis</h3>
          <button onClick={() => goto("processos")} className="text-[#2A7B3E] text-sm font-semibold focus-visible:outline-2 focus-visible:outline-[#2A7B3E] rounded">
            Ver todos
          </button>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
          {tipos.map(t => (
            <button key={t} onClick={() => setFilter(t)}
              className={`flex-shrink-0 px-4 h-8 rounded-full text-sm font-semibold transition-all focus-visible:outline-2 focus-visible:outline-[#2A7B3E] ${filter === t ? "bg-[#2A7B3E] text-white" : "bg-white border border-[#D1E8D7] text-[#4E6859] hover:border-[#2A7B3E]/40"}`}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Editais list */}
      <div className="px-4 pt-3 pb-4 flex flex-col gap-3">
        {shown.map(e => (
          <EditalCard key={e.id} e={e} onClick={() => goto("edital")} />
        ))}
      </div>

      {/* Quick actions */}
      <div className="px-4 pb-4">
        <h3 className="text-[#0D1E12] text-base font-bold mb-3">Atalhos</h3>
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: FileText, label: "Minhas\nInscrições", action: () => { goto("inscricoes"); setNav("inscricoes") } },
            { icon: Upload, label: "Enviar\nDocumentos", action: () => goto("docs") },
            { icon: HelpCircle, label: "Ajuda\nRápida", action: () => {} },
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
function ProcessosScreen({ goto, onBack }: { goto: (s: Screen) => void; onBack: () => void }) {
  const [filter, setFilter] = useState("Todos")
  const tipos = ["Todos", "Técnico", "Superior", "Médio"]
  const shown = filter === "Todos" ? EDITAIS : EDITAIS.filter(e => e.tipo === filter)

  return (
    <div>
      <BackHeader title="Processos Abertos" onBack={onBack} />
      <div className="px-4 pt-4">
        <p className="text-[#4E6859] text-sm mb-4">{EDITAIS.filter(e => e.status === "aberto").length} editais com inscrições abertas</p>
        <div className="flex gap-2 overflow-x-auto pb-1 mb-4" style={{ scrollbarWidth: "none" }}>
          {tipos.map(t => (
            <button key={t} onClick={() => setFilter(t)}
              className={`flex-shrink-0 px-4 h-8 rounded-full text-sm font-semibold transition-all focus-visible:outline-2 focus-visible:outline-[#2A7B3E] ${filter === t ? "bg-[#2A7B3E] text-white" : "bg-white border border-[#D1E8D7] text-[#4E6859] hover:border-[#2A7B3E]/40"}`}>
              {t}
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-3 pb-4">
          {shown.map(e => (
            <EditalCard key={e.id} e={e} onClick={() => goto("edital")} />
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── EDITAL DETAIL SCREEN ─────────────────────────────────────────────────────
function EditalScreen({ goto, onBack }: { goto: (s: Screen) => void; onBack: () => void }) {
  const [view, setView] = useState<"aberto" | "andamento" | "aprovado">("aberto")

  const statusBanners = {
    aberto: null,
    andamento: (
      <div className="mx-4 mt-4 flex items-center gap-3 bg-amber-50 border-2 border-amber-200 rounded-2xl p-4">
        <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
          <Loader2 className="w-5 h-5 text-amber-600 animate-spin" />
        </div>
        <div>
          <p className="text-amber-800 text-sm font-bold">Processo em Andamento</p>
          <p className="text-amber-700 text-xs mt-0.5">Acompanhe o cronograma abaixo</p>
        </div>
        <div className="ml-auto w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse flex-shrink-0" />
      </div>
    ),
    aprovado: (
      <div className="mx-4 mt-4 flex items-center gap-3 bg-emerald-50 border-2 border-emerald-200 rounded-2xl p-4">
        <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
          <UserCheck className="w-5 h-5 text-emerald-600" />
        </div>
        <div>
          <p className="text-emerald-800 text-sm font-bold">Processo Finalizado</p>
          <p className="text-emerald-700 text-xs mt-0.5 font-semibold">✓ Você foi aprovado!</p>
        </div>
      </div>
    ),
  }

  return (
    <div>
      <BackHeader title="Técnico em Informática" onBack={onBack} />

      {/* Demo toggle — style guide only */}
      <div className="mx-4 mt-4 bg-[#E7F4EA] rounded-xl p-3 border border-[#D1E8D7]">
        <p className="text-[#4E6859] text-[10px] font-bold tracking-widest uppercase mb-2">Demo: Estado da inscrição</p>
        <div className="flex gap-1.5">
          {(["aberto", "andamento", "aprovado"] as const).map(s => (
            <button key={s} onClick={() => setView(s)}
              className={`flex-1 h-7 rounded-lg text-xs font-bold transition-all focus-visible:outline-2 focus-visible:outline-[#2A7B3E] ${view === s ? "bg-[#2A7B3E] text-white" : "bg-white text-[#4E6859] border border-[#D1E8D7]"}`}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {statusBanners[view]}

      {/* Pendência alert */}
      {view === "andamento" && (
        <div className="mx-4 mt-3 flex items-start gap-3 bg-red-50 border-2 border-red-200 rounded-2xl p-4">
          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-red-800 text-sm font-bold">Revisão Manual Necessária</p>
            <p className="text-red-700 text-xs mt-1 leading-relaxed">Seu CPF está ilegível. Reenvie o documento para continuar.</p>
            <button onClick={() => goto("docs")} className="mt-2 text-xs font-bold text-red-700 underline underline-offset-2">
              Ir para documentos →
            </button>
          </div>
        </div>
      )}

      {/* Info chips */}
      <div className="px-4 pt-4 flex gap-2 flex-wrap">
        <span className="flex items-center gap-1 bg-white border border-[#D1E8D7] rounded-full px-3 py-1.5 text-xs font-semibold text-[#4E6859]">
          <MapPin className="w-3 h-3" /> Campus Brasília
        </span>
        <span className="flex items-center gap-1 bg-white border border-[#D1E8D7] rounded-full px-3 py-1.5 text-xs font-semibold text-[#4E6859]">
          <User className="w-3 h-3" /> 40 vagas
        </span>
        <Badge s={view === "aberto" ? "aberto" : view === "andamento" ? "andamento" : "aprovado"} />
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
              <div className={`px-3 py-3 text-[11px] font-mono font-semibold border-r ${isActive ? "border-white/20 text-emerald-100" : "border-[#D1E8D7] text-[#4E6859]"}`}>
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
        {view === "aberto" && (
          <Btn v="primary" cls="w-full text-lg font-black h-14" onClick={() => goto("wizard")}>
            INSCREVER-SE
          </Btn>
        )}
        {view === "andamento" && (
          <Btn v="secondary" cls="w-full h-14" onClick={() => goto("inscricoes")}>
            <FileText className="w-5 h-5" /> Acompanhar Inscrição
          </Btn>
        )}
        {view === "aprovado" && (
          <div className="flex flex-col gap-3">
            <Btn v="primary" cls="w-full h-14" onClick={() => goto("inscricoes")}>
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
function WizardScreen({ goto, onBack }: { goto: (s: Screen) => void; onBack: () => void }) {
  const [step, setStep] = useState<WizardStep>(1)
  const [escola, setEscola] = useState("")
  const [cota, setCota] = useState("")
  const [raca, setRaca] = useState("")
  const [pcd, setPcd] = useState("")
  const [bolsa, setBolsa] = useState("")
  const [confirmed, setConfirmed] = useState(false)

  const STEPS = ["Dados Pessoais", "Cotas", "Socioeconômico", "Revisão"]

  const stepContent: Record<WizardStep, React.ReactNode> = {
    1: (
      <div className="flex flex-col gap-4">
        <Field label="Nome Completo" placeholder="Ex: João da Silva" required />
        <Field label="CPF" placeholder="000.000.000-00" type="text" required hint="Apenas números" />
        <Field label="Data de Nascimento" type="date" required />
        <Field label="E-mail" placeholder="seu@email.com" type="email" required />
        <Field label="Celular / WhatsApp" placeholder="(61) 99999-9999" type="tel" required />
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 flex gap-2.5">
          <Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-amber-800 text-xs leading-relaxed">Se você é menor de idade, um responsável legal deverá assinar a matrícula presencialmente.</p>
        </div>
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
      </div>
    ),
    3: (
      <div className="flex flex-col gap-4">
        <SelectField label="Renda Familiar Bruta (mensal)" required
          options={["Selecione…", "Até R$ 1.320 (1 SM)", "R$ 1.321 a R$ 2.640 (até 2 SM)", "R$ 2.641 a R$ 5.280 (até 4 SM)", "Acima de R$ 5.280"]} />
        <Field label="Número de pessoas na residência" type="number" placeholder="Ex: 4" required />
        <SelectField label="Situação de moradia" required
          options={["Selecione…", "Casa própria quitada", "Casa financiada", "Alugada", "Cedida/emprestada", "Outra"]} />

        <div className="border-t border-[#E4EBE6] pt-4">
          <p className="text-sm font-bold text-[#0D1E12] mb-3">Programas sociais</p>
          {[
            { value: "bolsa", label: "Bolsa Família / CadÚnico" },
            { value: "bpc", label: "BPC - Benefício de Prestação Continuada" },
            { value: "nenhum", label: "Nenhum" },
          ].map(o => (
            <div key={o.value} className="mb-2.5">
              <RadioOpt label={o.label} checked={bolsa === o.value} onClick={() => setBolsa(o.value)} />
            </div>
          ))}
        </div>
      </div>
    ),
    4: (
      <div className="flex flex-col gap-4">
        <div className="bg-[#E7F4EA] rounded-2xl p-4 border border-[#D1E8D7]">
          <p className="text-[#2A7B3E] text-xs font-bold uppercase tracking-wider mb-3">Resumo da Inscrição</p>
          {[
            ["Curso", "Técnico em Informática — Campus Brasília"],
            ["CPF", "***.***.***-**"],
            ["E-mail", "joao@email.com"],
            ["Escola de Origem", escola === "pub" ? "Pública" : escola === "priv" ? "Privada" : "Não informado"],
            ["Modalidade", cota || "Não selecionado"],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between py-2 border-b border-[#D1E8D7] last:border-0">
              <span className="text-xs text-[#4E6859] font-medium">{k}</span>
              <span className="text-xs text-[#0D1E12] font-semibold text-right max-w-[60%]">{v}</span>
            </div>
          ))}
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
        title={STEPS[step - 1]}
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
            <Btn v="primary" cls="flex-1 h-12" onClick={() => setStep((step + 1) as WizardStep)}>
              Continuar <ChevronRight className="w-4 h-4" />
            </Btn>
          ) : (
            <Btn v="primary" cls="flex-1 h-14 text-base font-black" disabled={!confirmed} onClick={() => goto("docs")}>
              Confirmar Inscrição
            </Btn>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── DOCS UPLOAD SCREEN ───────────────────────────────────────────────────────
function DocsScreen({ goto, onBack }: { goto: (s: Screen) => void; onBack: () => void }) {
  const statusIcon = (s: string) => {
    if (s === "enviado") return <CheckCircle className="w-5 h-5 text-emerald-600" />
    if (s === "pendente") return <AlertCircle className="w-5 h-5 text-amber-500" />
    if (s === "na") return <Eye className="w-5 h-5 text-gray-400" />
    return <Upload className="w-5 h-5 text-[#4E6859]" />
  }

  const enviados = DOCS_LIST.filter(d => d.status === "enviado").length
  const total = DOCS_LIST.filter(d => d.status !== "na").length

  return (
    <div>
      <BackHeader title="Envio de Documentos" onBack={onBack} />

      <div className="px-4 pt-4">
        {/* Progress */}
        <div className="bg-white rounded-2xl border border-[#D1E8D7] p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-bold text-[#0D1E12]">Progresso</p>
            <span className="font-mono text-sm font-bold text-[#2A7B3E]">{enviados}/{total}</span>
          </div>
          <div className="h-2 bg-[#E4EBE6] rounded-full overflow-hidden">
            <div className="h-full bg-[#2A7B3E] rounded-full transition-all" style={{ width: `${(enviados / total) * 100}%` }} />
          </div>
          <p className="text-xs text-[#4E6859] mt-2">{total - enviados} documento(s) ainda precisam ser enviados</p>
        </div>

        {/* Alert */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 mb-4 flex gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-amber-800 text-xs leading-relaxed">Envie documentos em boa iluminação, sem rasuras, com todos os cantos visíveis. Formatos aceitos: JPG, PNG ou PDF (máx. 5MB).</p>
        </div>

        {/* Doc list */}
        <div className="flex flex-col gap-3 pb-4">
          {DOCS_LIST.map(doc => (
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

              {doc.status !== "enviado" && doc.status !== "na" && (
                <div className="mt-3 pt-3 border-t border-[#E4EBE6] flex gap-2">
                  {doc.tipo === "camera" ? (
                    <button onClick={() => goto("camera")}
                      className="flex-1 flex items-center justify-center gap-2 h-10 rounded-xl bg-[#2A7B3E] text-white text-sm font-semibold hover:bg-[#1D5C2E] transition-colors focus-visible:outline-2 focus-visible:outline-[#2A7B3E]">
                      <Camera className="w-4 h-4" /> Tirar Foto
                    </button>
                  ) : (
                    <>
                      <button className="flex-1 flex items-center justify-center gap-2 h-10 rounded-xl border-2 border-[#D1E8D7] text-[#2A7B3E] text-sm font-semibold hover:bg-[#E7F4EA] transition-colors focus-visible:outline-2 focus-visible:outline-[#2A7B3E]">
                        <Upload className="w-4 h-4" /> Arquivo
                      </button>
                      <button className="flex-1 flex items-center justify-center gap-2 h-10 rounded-xl border-2 border-[#D1E8D7] text-[#2A7B3E] text-sm font-semibold hover:bg-[#E7F4EA] transition-colors focus-visible:outline-2 focus-visible:outline-[#2A7B3E]">
                        <Camera className="w-4 h-4" /> Câmera
                      </button>
                    </>
                  )}
                </div>
              )}

              {doc.status === "pendente" && doc.nome.includes("CPF") && (
                <p className="mt-2 text-xs text-red-600 font-medium">⚠ Documento enviado está ilegível. Reenvie.</p>
              )}
            </div>
          ))}
        </div>

        <Btn v="primary" cls="w-full h-14" disabled={enviados < total}>
          <CheckCircle className="w-5 h-5" /> Finalizar Envio
        </Btn>
        <p className="text-center text-xs text-[#4E6859] mt-2 pb-4">Envie todos os documentos obrigatórios para prosseguir</p>
      </div>
    </div>
  )
}

// ─── CAMERA SCREEN ────────────────────────────────────────────────────────────
function CameraScreen({ onBack }: { onBack: () => void }) {
  const [consented, setConsented] = useState(false)
  const [captured, setCaptured] = useState(false)

  if (!consented) {
    return (
      <div>
        <BackHeader title="Autodeclaração Étnico-Racial" onBack={onBack} />
        <div className="px-4 pt-5 pb-4">
          {/* LGPD Modal-like card */}
          <div className="bg-white rounded-2xl border border-[#D1E8D7] overflow-hidden mb-4">
            <div className="bg-[#2A7B3E] px-4 py-3 flex items-center gap-2">
              <Shield className="w-5 h-5 text-white" />
              <p className="text-white font-bold text-sm">Aviso de Privacidade — LGPD</p>
            </div>
            <div className="p-4 flex flex-col gap-3">
              {[
                { title: "Por que coletamos sua foto?", text: "Para verificar a autodeclaração de raça/cor como parte do processo de cotas étnico-raciais do IFB, conforme exigido pelo edital." },
                { title: "Como seus dados são usados?", text: "A imagem é usada apenas para análise de heteroidentificação por comissão designada. Não é compartilhada com terceiros." },
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
      <BackHeader title="Captura de Foto" onBack={() => { setCaptured(false); setConsented(false); onBack() }} />
      <div className="px-4 pt-4 pb-4">
        {captured ? (
          <div className="flex flex-col items-center gap-4">
            <div className="w-48 h-48 rounded-full bg-[#E7F4EA] border-4 border-[#2A7B3E] flex items-center justify-center overflow-hidden">
              <User className="w-24 h-24 text-[#2A7B3E] opacity-40" />
            </div>
            <div className="text-center">
              <CheckCircle className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
              <p className="text-[#0D1E12] font-bold">Foto capturada com sucesso!</p>
              <p className="text-[#4E6859] text-sm mt-1">Verifique se o rosto está visível e nítido</p>
            </div>
            <div className="flex gap-3 w-full">
              <Btn v="outline" cls="flex-1 h-12" onClick={() => setCaptured(false)}>
                <RefreshCw className="w-4 h-4" /> Repetir
              </Btn>
              <Btn v="primary" cls="flex-1 h-12" onClick={onBack}>
                <Check className="w-4 h-4" /> Confirmar
              </Btn>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {/* Viewfinder */}
            <div className="relative rounded-2xl overflow-hidden bg-[#0D1E12]" style={{ aspectRatio: "3/4" }}>
              {/* Simulated camera bg */}
              <div className="absolute inset-0 bg-gradient-to-b from-gray-800 to-gray-900 flex items-center justify-center">
                <User className="w-32 h-32 text-white/10" />
              </div>
              {/* Oval face guide */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-44 h-56 rounded-full border-4 border-white/60 shadow-[0_0_0_1000px_rgba(0,0,0,0.4)]" />
              </div>
              {/* Corner brackets */}
              {[
                "top-[20%] left-[20%] border-t-2 border-l-2 rounded-tl-lg",
                "top-[20%] right-[20%] border-t-2 border-r-2 rounded-tr-lg",
                "bottom-[20%] left-[20%] border-b-2 border-l-2 rounded-bl-lg",
                "bottom-[20%] right-[20%] border-b-2 border-r-2 rounded-br-lg",
              ].map((cls, i) => (
                <div key={i} className={`absolute w-8 h-8 border-white/80 ${cls}`} />
              ))}
              {/* Instructions */}
              <div className="absolute bottom-4 left-0 right-0 flex justify-center">
                <div className="bg-black/60 backdrop-blur-sm rounded-full px-4 py-2">
                  <p className="text-white text-xs font-medium text-center">Centralize seu rosto na moldura</p>
                </div>
              </div>
            </div>

            {/* Tips */}
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

            {/* Capture button */}
            <div className="flex items-center justify-center pt-2">
              <button onClick={() => setCaptured(true)}
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
function InscricoesScreen({ goto }: { goto: (s: Screen) => void }) {
  const currentStep = 1 // 0-indexed, step 1 = "Análise de Documentos"

  return (
    <div>
      <div className="bg-[#2A7B3E] px-4 pt-10 pb-5">
        <h1 className="text-white text-xl font-extrabold">Minhas Inscrições</h1>
        <p className="text-emerald-200 text-sm mt-0.5">Acompanhe o status das suas candidaturas</p>
      </div>

      <div className="px-4 pt-4 flex flex-col gap-4 pb-4">
        {/* Pendência alert */}
        <div className="bg-red-50 border-2 border-red-300 rounded-2xl p-4 flex gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-red-800 text-sm font-bold">Ação necessária</p>
            <p className="text-red-700 text-xs mt-1 leading-relaxed">Seu CPF foi enviado em baixa qualidade. Reenvie para não perder o prazo.</p>
            <button onClick={() => goto("docs")}
              className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-red-700 underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-red-600 rounded">
              Ir para documentos <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Active inscription card */}
        <div className="bg-white rounded-2xl border border-[#D1E8D7] overflow-hidden">
          <div className="bg-[#2A7B3E] px-4 py-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-white text-base font-bold leading-snug">Técnico em Hotelaria</p>
                <p className="text-emerald-200 text-xs mt-0.5">Campus Planaltina</p>
              </div>
              <Badge s="analise" />
            </div>
          </div>

          <div className="px-4 py-4">
            <div className="flex gap-3 mb-4 text-xs font-mono text-[#4E6859]">
              <span>Nº IFB-2025-00847</span>
              <span>•</span>
              <span>Inscrito em 14/11/2024</span>
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
                  const active = i === currentStep
                  const future = i > currentStep
                  return (
                    <div key={s.label} className="flex items-start gap-3 relative">
                      <div className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center border-2 transition-all z-10 ${done ? "bg-[#2A7B3E] border-[#2A7B3E]" : active ? "bg-white border-[#2A7B3E] ring-4 ring-[#2A7B3E]/15" : "bg-white border-[#D1E8D7]"}`}>
                        {done ? <Check className="w-3.5 h-3.5 text-white" />
                          : active ? <Clock className="w-3.5 h-3.5 text-[#2A7B3E]" />
                            : <div className={`w-2 h-2 rounded-full ${future ? "bg-[#D1E8D7]" : "bg-[#2A7B3E]"}`} />}
                      </div>
                      <div className={`flex-1 pt-0.5 pb-1 ${future ? "opacity-40" : ""}`}>
                        <p className={`text-sm font-bold leading-snug ${active ? "text-[#2A7B3E]" : "text-[#0D1E12]"}`}>{s.label}</p>
                        <p className="text-xs text-[#4E6859] mt-0.5">{s.sub}</p>
                        {active && (
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

          <div className="px-4 pb-4">
            <button onClick={() => goto("edital")}
              className="w-full flex items-center justify-center gap-2 h-10 rounded-xl border-2 border-[#D1E8D7] text-[#2A7B3E] text-sm font-semibold hover:bg-[#E7F4EA] transition-colors focus-visible:outline-2 focus-visible:outline-[#2A7B3E]">
              Ver detalhes do edital <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Past inscriptions */}
        <div>
          <p className="text-[#0D1E12] text-sm font-bold mb-3">Inscrições Anteriores</p>
          <div className="bg-white rounded-2xl border border-[#D1E8D7] divide-y divide-[#E4EBE6]">
            {[
              { curso: "Técnico em Moda", campus: "Campus Samambaia", status: "reprovado", data: "2024.1" },
              { curso: "Ensino Médio Integrado", campus: "Campus Gama", status: "aprovado", data: "2023.2" },
            ].map(ins => (
              <div key={ins.curso} className="flex items-center gap-3 px-4 py-3">
                <div className="flex-1">
                  <p className="text-sm font-semibold text-[#0D1E12]">{ins.curso}</p>
                  <p className="text-xs text-[#4E6859]">{ins.campus} · {ins.data}</p>
                </div>
                <Badge s={ins.status} />
              </div>
            ))}
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
  const iconMap: Record<string, { icon: React.ElementType; cls: string; bg: string }> = {
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
          const cfg = iconMap[n.tipo]
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

// ─── PERFIL SCREEN ────────────────────────────────────────────────────────────
function PerfilScreen({ goto, setNav }: { goto: (s: Screen) => void; setNav: (t: NavTab) => void }) {
  return (
    <div>
      <div className="bg-[#2A7B3E] px-4 pt-10 pb-10">
        <div className="flex flex-col items-center">
          <div className="w-20 h-20 rounded-full bg-white/20 border-4 border-white/40 flex items-center justify-center mb-3">
            <User className="w-10 h-10 text-white/80" />
          </div>
          <h1 className="text-white text-xl font-extrabold">João da Silva</h1>
          <p className="text-emerald-200 text-sm mt-0.5 font-mono">CPF: ***.***.***-12</p>
          <div className="mt-3 inline-flex items-center gap-1.5 bg-white/15 rounded-full px-3 py-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-300" />
            <span className="text-emerald-100 text-xs font-semibold">Candidato Ativo</span>
          </div>
        </div>
      </div>

      {/* Menu */}
      <div className="px-4 -mt-4">
        <div className="bg-white rounded-2xl border border-[#D1E8D7] overflow-hidden divide-y divide-[#E4EBE6]">
          {[
            { icon: User, label: "Meus Dados", sub: "Informações pessoais" },
            { icon: FileText, label: "Minhas Inscrições", sub: "Histórico de candidaturas", action: () => { goto("inscricoes"); setNav("inscricoes") } },
            { icon: Upload, label: "Documentos Enviados", sub: "Gerenciar arquivos", action: () => goto("docs") },
            { icon: Bell, label: "Preferências de Avisos", sub: "Email e push" },
            { icon: Shield, label: "Privacidade & LGPD", sub: "Seus dados e direitos" },
            { icon: HelpCircle, label: "Central de Ajuda", sub: "Dúvidas frequentes" },
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

        <button className="w-full mt-4 mb-4 flex items-center justify-center gap-2 h-12 rounded-xl border-2 border-red-200 text-red-600 font-semibold text-sm hover:bg-red-50 transition-colors focus-visible:outline-2 focus-visible:outline-red-600">
          <LogOut className="w-4 h-4" /> Sair da Conta
        </button>

        <div className="text-center pb-4">
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

  const screenEl: Record<Screen, React.ReactNode> = {
    home: <HomeScreen goto={goto} setNav={setNav} />,
    processos: <ProcessosScreen goto={goto} onBack={() => goto("home")} />,
    edital: <EditalScreen goto={goto} onBack={() => goto(nav === "inscricoes" ? "inscricoes" : "home")} />,
    wizard: <WizardScreen goto={goto} onBack={() => goto("edital")} />,
    docs: <DocsScreen goto={goto} onBack={() => goto("wizard")} />,
    camera: <CameraScreen onBack={() => goto("docs")} />,
    inscricoes: <InscricoesScreen goto={goto} />,
    notificacoes: <NotifScreen />,
    perfil: <PerfilScreen goto={goto} setNav={setNav} />,
  }

  return (
    <div className="min-h-screen bg-gray-300 sm:flex sm:items-start sm:justify-center sm:pt-6 sm:pb-6">
      <div
        className="relative bg-[#F5F8F5] w-full sm:max-w-[390px] sm:rounded-[44px] sm:shadow-2xl sm:border-8 sm:border-gray-400/30 overflow-hidden flex flex-col"
        style={{ minHeight: "100dvh", maxHeight: "844px" }}
      >
        {/* Scrollable screen content */}
        <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
          {screenEl[screen]}
        </div>

        {/* FAB — Chatbot */}
        <div className="absolute bottom-[84px] right-4 z-50">
          <button
            onClick={() => setChat(true)}
            aria-label="Abrir Assistente Virtual"
            className="w-14 h-14 rounded-full bg-[#2A7B3E] text-white shadow-xl flex items-center justify-center hover:bg-[#1D5C2E] active:scale-95 transition-all focus-visible:outline-4 focus-visible:outline-[#2A7B3E] focus-visible:outline-offset-4"
          >
            <MessageCircle className="w-6 h-6" />
          </button>
        </div>

        {/* Bottom Nav */}
        <div className="flex-shrink-0 z-40">
          <BottomNav active={nav} onChange={handleNav} />
        </div>

        {/* Chat modal */}
        {chat && <ChatModal onClose={() => setChat(false)} />}
      </div>
    </div>
  )
}

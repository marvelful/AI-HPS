import { useState, useRef, useEffect } from 'react'
import { Send, Sparkles, AlertTriangle, BookOpen, ClipboardList, Stethoscope } from 'lucide-react'
import { pipelineApi, type PipelineQueryResponse } from '@/lib/api'
import { useAuthStore } from '@/stores/auth.store'

interface Message {
  id: string
  role: 'user' | 'ai'
  text: string
  structured?: StreamBData | null
  time: string
  isEmergency?: boolean
  intent?: string | null
}

interface StreamBStep {
  step: number
  instruction: string
  approval_required?: boolean
}

interface StreamBData {
  disclaimer?: string
  summary?: string
  steps?: StreamBStep[]
  compliance_notes?: string[]
  risk_level?: string
  escalation?: string
  citations?: string[]
}

const SUGGESTED = [
  'Blood transfusion protocol',
  'Hand hygiene procedure',
  'ICU patient admission',
  'Surgical site infection control',
  'Emergency resuscitation steps',
]

function riskColor(level?: string) {
  if (!level) return 'text-slate-500 bg-slate-50 border-slate-200'
  const l = level.toLowerCase()
  if (l === 'critical') return 'text-red-700 bg-red-50 border-red-200'
  if (l === 'high')     return 'text-orange-700 bg-orange-50 border-orange-200'
  if (l === 'medium' || l === 'moderate') return 'text-yellow-700 bg-yellow-50 border-yellow-200'
  return 'text-green-700 bg-green-50 border-green-200'
}

function formatOutput(res: PipelineQueryResponse): { text: string; structured?: StreamBData; isEmergency: boolean } {
  const { output, is_emergency, error } = res

  if (error) return { text: `Error: ${error}`, isEmergency: false }

  if (is_emergency) {
    const msg = typeof output === 'string'
      ? output
      : output?.message ?? 'Emergency detected. Activate emergency protocol immediately.'
    return { text: msg, isEmergency: true }
  }

  if (!output) {
    return {
      text: 'No matching procedure found in the knowledge base. Check the procedure library or contact the clinical documentation team.',
      isEmergency: false,
    }
  }

  if (typeof output === 'string') return { text: output, isEmergency: false }

  // Not found — backend provides a specific message
  if (output.found === false) {
    return { text: output.message ?? 'Not found in knowledge base.', isEmergency: false }
  }

  // Procedure result — {found: true, data: {summary, steps, compliance_notes, ...}}
  if (output.found === true && output.data) {
    const d: StreamBData = output.data
    return { text: d.summary ?? 'Procedure found.', structured: d, isEmergency: false }
  }

  // Navigation result — {found: true, department, steps, ...}
  if (output.found === true && output.department) {
    let text = `Directions to ${output.department}`
    if (output.estimated_time_minutes) text += ` (${output.estimated_time_minutes} min)`
    if (output.steps?.length) {
      text += '\n' + output.steps.map((s: any, i: number) => `${i + 1}. ${s.instruction ?? s}`).join('\n')
    }
    return { text: text.trim(), isEmergency: false }
  }

  // Department info — {found: true, name, location, hours, contact}
  if (output.found === true && output.name) {
    let text = output.name
    if (output.location) text += `\nLocation: ${output.location}`
    if (output.hours) {
      const h = output.hours
      const str = typeof h === 'object' ? Object.entries(h).map(([k, v]) => `${k}: ${v}`).join(' | ') : String(h)
      if (str) text += `\nHours: ${str}`
    }
    return { text: text.trim(), isEmergency: false }
  }

  // Fallback
  if (output.message) return { text: output.message, isEmergency: false }
  if (output.summary) return { text: output.summary, isEmergency: false }

  return { text: 'Response received. Refine your query for more detail.', isEmergency: false }
}

function StructuredResult({ data }: { data: StreamBData }) {
  return (
    <div className="mt-3 space-y-3 text-sm">
      {data.steps && data.steps.length > 0 && (
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide text-text-sec mb-1.5 flex items-center gap-1">
            <ClipboardList size={11} /> Procedure Steps
          </p>
          <ol className="space-y-1.5">
            {data.steps.map((s) => (
              <li key={s.step} className="flex gap-2">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-hgd-blue text-white text-[10px] font-bold flex items-center justify-center mt-0.5">
                  {s.step}
                </span>
                <span className="text-text-pri leading-snug">
                  {s.instruction}
                  {s.approval_required && (
                    <span className="ml-1.5 text-[9px] font-bold text-orange-600 bg-orange-50 border border-orange-200 rounded px-1 py-0.5 uppercase">
                      Approval
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {data.compliance_notes && data.compliance_notes.length > 0 && (
        <div className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
          <p className="text-[11px] font-bold uppercase tracking-wide text-blue-600 mb-1">Compliance</p>
          <ul className="space-y-0.5">
            {data.compliance_notes.map((note, i) => (
              <li key={i} className="text-[12px] text-blue-800 flex gap-1.5">
                <span className="mt-1 w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" />
                {note}
              </li>
            ))}
          </ul>
        </div>
      )}

      {(data.risk_level || data.escalation) && (
        <div className="flex gap-2 flex-wrap">
          {data.risk_level && (
            <span className={`text-[11px] font-bold uppercase px-2 py-1 rounded border ${riskColor(data.risk_level)}`}>
              Risk: {data.risk_level}
            </span>
          )}
          {data.escalation && (
            <span className="text-[11px] text-orange-700 bg-orange-50 border border-orange-200 rounded px-2 py-1">
              Escalate: {data.escalation}
            </span>
          )}
        </div>
      )}

      {data.citations && data.citations.length > 0 && (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wide text-text-sec mb-0.5">Sources</p>
          <p className="text-[11px] text-text-sec font-mono">{data.citations.join(' · ')}</p>
        </div>
      )}

      {data.disclaimer && (
        <p className="text-[11px] text-ai-purple italic border-t border-ai-purple/10 pt-2">
          ⚠️ {data.disclaimer}
        </p>
      )}
    </div>
  )
}

function TypingDots() {
  return (
    <div className="flex flex-col gap-1 py-1">
      <div className="flex gap-1.5 items-center">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-2 h-2 rounded-full bg-hgd-blue/40"
            style={{ animation: 'bounce 1.2s infinite', animationDelay: `${i * 0.2}s` }}
          />
        ))}
      </div>
      <span className="text-[10px] text-slate-400">Searching knowledge base…</span>
    </div>
  )
}

const now = () => new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })

function useSessionId() {
  const ref = useRef<string>(`sess_${Date.now()}_${Math.random().toString(36).slice(2)}`)
  return ref.current
}

export default function AdminAssistantPage() {
  const { user } = useAuthStore()
  const sessionId = useSessionId()

  const [messages, setMessages] = useState<Message[]>([
    {
      id: '0',
      role: 'ai',
      text: `Welcome, ${user?.full_name?.split(' ')[0] ?? 'Staff'}. I can retrieve clinical procedures, protocols, and department guidelines from the HGD knowledge base. Ask me anything.`,
      time: now(),
    },
  ])
  const [input, setInput] = useState('')
  const [thinking, setThinking] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, thinking])

  const send = async (text?: string) => {
    const msg = (text ?? input).trim()
    if (!msg || thinking) return
    setInput('')
    setApiError(null)
    inputRef.current?.focus()

    const userMsg: Message = { id: Date.now().toString(), role: 'user', text: msg, time: now() }
    setMessages((m) => [...m, userMsg])
    setThinking(true)

    try {
      const res = await pipelineApi.query({
        raw_query: msg,
        platform: 'web',
        stream: 'B',
        user_id: user?.id,
        user_role: user?.role,
        session_id: sessionId,
        chatbot_mode: true,
      })

      const { text: responseText, structured, isEmergency } = formatOutput(res)

      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        text: responseText,
        structured,
        time: now(),
        isEmergency,
        intent: res.intent,
      }
      setMessages((m) => [...m, aiMsg])
    } catch {
      setApiError('Could not reach the AI pipeline. Ensure the agent service is running on port 8020.')
      const errMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        text: 'Unable to connect to the AI service. Please try again.',
        time: now(),
      }
      setMessages((m) => [...m, errMsg])
    } finally {
      setThinking(false)
    }
  }

  return (
    <div className="flex gap-5 h-[calc(100vh-80px)] max-w-6xl">
      {/* Left panel — suggested + info */}
      <aside className="w-56 flex-shrink-0 space-y-4">
        <div className="bg-white rounded-lg shadow-card p-4">
          <p className="text-[11px] font-bold uppercase tracking-wide text-text-sec mb-3 flex items-center gap-1.5">
            <BookOpen size={11} /> Suggested queries
          </p>
          <div className="space-y-1.5">
            {SUGGESTED.map((s) => (
              <button
                key={s}
                onClick={() => send(s)}
                disabled={thinking}
                className="w-full text-left text-xs px-3 py-2 rounded-lg bg-surf-alt hover:bg-hgd-blue3 hover:text-hgd-blue text-text-sec transition-colors disabled:opacity-50"
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-ai-purple-bg border border-ai-purple/20 rounded-lg p-3">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Stethoscope size={12} className="text-ai-purple" />
            <p className="text-[10px] font-bold text-ai-purple uppercase tracking-wide">Clinical stream</p>
          </div>
          <p className="text-[11px] text-ai-purple/80 leading-snug">
            Results are filtered for clinical staff. Full procedure steps and compliance notes are shown.
          </p>
        </div>
      </aside>

      {/* Chat area */}
      <div className="flex-1 flex flex-col bg-white rounded-lg shadow-card overflow-hidden">
        {/* Chat header */}
        <div className="px-5 py-3.5 border-b border-[#CBD5E1] flex items-center gap-3 flex-shrink-0"
          style={{ background: 'linear-gradient(90deg, #004A8F 0%, #0062B8 70%, #E8620A 100%)' }}
        >
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
            <Sparkles size={15} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-white">AI Clinical Assistant</p>
            <p className="text-[10px] text-white/70">Stream B · grounded in HGD procedure knowledge base</p>
          </div>
          <span className="ml-auto text-[10px] font-semibold bg-green-400/20 text-green-300 border border-green-400/30 rounded-full px-2 py-0.5">
            ● Live
          </span>
        </div>

        {/* API error */}
        {apiError && (
          <div className="px-4 py-2 bg-red-50 border-b border-red-200 flex items-center gap-2 flex-shrink-0">
            <AlertTriangle size={13} className="text-red-500 flex-shrink-0" />
            <p className="text-xs text-red-600">{apiError}</p>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5 bg-[#F8FAFC]">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'ai' && (
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${msg.isEmergency ? 'bg-red-500' : 'bg-hgd-blue'}`}>
                  {msg.isEmergency
                    ? <AlertTriangle size={14} className="text-white" />
                    : <Sparkles size={14} className="text-white" />
                  }
                </div>
              )}
              <div className={`max-w-[75%] ${msg.role === 'user' ? 'order-first' : ''}`}>
                <div
                  className={`rounded-xl px-4 py-3 text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-hgd-blue text-white rounded-br-sm ml-auto'
                      : msg.isEmergency
                        ? 'bg-red-50 border border-red-200 text-red-800 rounded-tl-sm'
                        : 'bg-white border border-[#E2E8F0] shadow-sm text-text-pri rounded-tl-sm'
                  }`}
                >
                  <p className="whitespace-pre-line font-medium">{msg.text}</p>
                  {msg.structured && <StructuredResult data={msg.structured} />}
                  <div className={`flex items-center justify-between mt-2 ${msg.role === 'user' ? 'text-white/60' : 'text-text-sec'}`}>
                    <span className="text-[10px]">{msg.time}</span>
                    {msg.intent && msg.role === 'ai' && (
                      <span className="text-[10px] font-mono opacity-60 capitalize">{msg.intent}</span>
                    )}
                  </div>
                </div>
              </div>
              {msg.role === 'user' && (
                <div className="w-8 h-8 rounded-full bg-hgd-blue3 flex items-center justify-center flex-shrink-0 mt-0.5 text-hgd-blue text-xs font-bold">
                  {user?.full_name?.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase() ?? 'U'}
                </div>
              )}
            </div>
          ))}

          {thinking && (
            <div className="flex gap-3 justify-start">
              <div className="w-8 h-8 rounded-full bg-hgd-blue flex items-center justify-center flex-shrink-0">
                <Sparkles size={14} className="text-white" />
              </div>
              <div className="bg-white border border-[#E2E8F0] shadow-sm rounded-xl rounded-tl-sm px-4 py-3">
                <TypingDots />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="border-t border-[#CBD5E1] px-4 py-3 flex gap-3 items-center bg-white flex-shrink-0">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && send()}
            placeholder="Search clinical procedures, protocols, guidelines..."
            className="flex-1 bg-surf-alt rounded-xl px-4 py-2.5 text-sm text-text-pri placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-hgd-blue border border-[#CBD5E1] focus:border-transparent"
          />
          <button
            onClick={() => send()}
            disabled={!input.trim() || thinking}
            className="w-10 h-10 rounded-xl bg-hgd-blue flex items-center justify-center text-white hover:bg-hgd-blue2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
          >
            <Send size={15} />
          </button>
        </div>
      </div>
    </div>
  )
}

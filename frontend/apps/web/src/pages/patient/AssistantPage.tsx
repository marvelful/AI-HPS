import { useState, useRef, useEffect } from 'react'
import { Send, Sparkles, AlertTriangle } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { pipelineApi, type PipelineQueryResponse } from '@/lib/api'
import { useAuthStore } from '@/stores/auth.store'

interface Message {
  id: string
  role: 'user' | 'ai'
  text: string
  time: string
  isEmergency?: boolean
  hadResult?: boolean
}

const SUGGESTED = ['Visiting hours', 'Find pediatrics', 'Pre-op fasting']

function formatOutput(res: PipelineQueryResponse): { text: string; isEmergency: boolean } {
  const { output, is_emergency, had_result, error } = res

  if (error) return { text: `Something went wrong: ${error}`, isEmergency: false }

  if (is_emergency) {
    const msg = typeof output === 'string'
      ? output
      : (output?.message ?? 'Emergency detected. Please go to the Emergency department immediately or call for help.')
    return { text: msg, isEmergency: true }
  }

  if (!had_result || !output) {
    return {
      text: 'No information found for your query. Please try rephrasing your question or ask a member of hospital staff for assistance.',
      isEmergency: false,
    }
  }

  if (typeof output === 'string') return { text: output, isEmergency: false }

  // navigation / dept info — has .found
  if (output.found === false) {
    return { text: output.message ?? 'Department not found. Please contact the main reception.', isEmergency: false }
  }
  if (output.found === true) {
    let text = output.name ? `**${output.name}**\n` : ''
    if (output.description) text += `\n${output.description}\n`
    if (output.location)    text += `\nLocation: ${output.location}`
    if (output.phone)       text += `\nPhone: ${output.phone}`
    if (output.hours)       text += `\nHours: ${output.hours}`
    return { text: text.trim() || (output.message ?? ''), isEmergency: false }
  }

  // procedure result — has .data
  if (output.data) {
    const d = output.data
    let text = ''
    if (d.summary)          text += d.summary
    if (d.key_steps?.length) {
      text += '\n\nKey steps:\n' + (d.key_steps as string[]).map((s, i) => `${i + 1}. ${s}`).join('\n')
    }
    if (d.when_to_seek_help) text += `\n\nWhen to seek help: ${d.when_to_seek_help}`
    if (d.disclaimer)        text += `\n\n⚠️ ${d.disclaimer}`
    return { text: text.trim(), isEmergency: false }
  }

  if (output.message) return { text: output.message, isEmergency: false }
  if (output.summary) return { text: output.summary, isEmergency: false }

  return { text: 'Response received. Please try asking again for more detail.', isEmergency: false }
}

function TypingDots() {
  return (
    <div className="flex gap-1.5 items-center px-4 py-3">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-2 h-2 rounded-full bg-hgd-orange"
          style={{ animation: 'bounce 1.2s infinite', animationDelay: `${i * 0.2}s`, opacity: 0.5 }}
        />
      ))}
    </div>
  )
}

const now = () => new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })

// stable session id for the duration of the page visit
function useSessionId() {
  const ref = useRef<string>(`sess_${Date.now()}_${Math.random().toString(36).slice(2)}`)
  return ref.current
}

export default function AssistantPage() {
  const [searchParams] = useSearchParams()
  const prefill = searchParams.get('q') ?? ''
  const { user } = useAuthStore()
  const sessionId = useSessionId()

  const [messages, setMessages] = useState<Message[]>([
    {
      id: '0',
      role: 'ai',
      text: "Hello! I'm the AI-HPS assistant for Hôpital Général de Douala. I can help you find departments, understand procedures, and answer general questions. How can I help you today?",
      time: now(),
    },
  ])
  const [input, setInput] = useState(prefill)
  const [thinking, setThinking] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, thinking])

  const send = async (text?: string) => {
    const msg = (text ?? input).trim()
    if (!msg || thinking) return
    setInput('')
    setApiError(null)

    const userMsg: Message = { id: Date.now().toString(), role: 'user', text: msg, time: now() }
    setMessages((m) => [...m, userMsg])
    setThinking(true)

    try {
      const res = await pipelineApi.query({
        raw_query: msg,
        platform: 'web',
        stream: 'A',
        user_id: user?.id,
        session_id: sessionId,
        chatbot_mode: true,
      })

      const { text: responseText, isEmergency } = formatOutput(res)

      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        text: responseText,
        time: now(),
        isEmergency,
        hadResult: res.had_result,
      }
      setMessages((m) => [...m, aiMsg])
    } catch (err: any) {
      setApiError('Could not reach the AI assistant. Please check your connection and try again.')
      const errMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        text: 'Sorry, I could not connect to the AI service right now. Please try again in a moment.',
        time: now(),
      }
      setMessages((m) => [...m, errMsg])
    } finally {
      setThinking(false)
    }
  }

  return (
    <div className="flex flex-col h-full" style={{ height: '100dvh' }}>
      {/* Header */}
      <div
        className="px-5 pt-12 pb-4 flex-shrink-0"
        style={{ background: 'linear-gradient(135deg, #004A8F 0%, #0062B8 60%, #E8620A 100%)' }}
      >
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
            <Sparkles size={15} className="text-white" />
          </div>
          <div>
            <p className="text-base font-bold text-white">AI Assistant</p>
            <p className="text-[10px] text-white/70">Always-on · grounded in HGD protocols</p>
          </div>
          <span className="ml-auto text-[10px] font-semibold bg-green-400/20 text-green-300 border border-green-400/30 rounded-full px-2 py-0.5">
            ● Online
          </span>
        </div>
      </div>

      {/* Suggested topics */}
      {messages.length <= 1 && (
        <div className="px-4 py-3 flex gap-2 overflow-x-auto hide-scrollbar bg-white border-b border-slate-100 flex-shrink-0">
          {SUGGESTED.map((s) => (
            <button
              key={s}
              onClick={() => send(s)}
              className="flex-shrink-0 text-xs font-semibold text-hgd-blue bg-hgd-blue3 border border-hgd-blue/20 rounded-full px-3 py-1.5 hover:bg-hgd-blue hover:text-white transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* API error banner */}
      {apiError && (
        <div className="px-4 py-2 bg-red-50 border-b border-red-200 flex items-center gap-2 flex-shrink-0">
          <AlertTriangle size={13} className="text-red-500 flex-shrink-0" />
          <p className="text-xs text-red-600">{apiError}</p>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-[#F5F7FA]">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'ai' && (
              <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mr-2 mt-1 ${msg.isEmergency ? 'bg-red-500' : 'bg-hgd-blue'}`}>
                {msg.isEmergency ? <AlertTriangle size={12} className="text-white" /> : <Sparkles size={12} className="text-white" />}
              </div>
            )}
            <div
              className={`max-w-[78%] ${
                msg.role === 'user'
                  ? 'bg-hgd-blue text-white rounded-2xl rounded-br-sm px-4 py-3 text-sm leading-relaxed'
                  : msg.isEmergency
                    ? 'bg-red-50 border border-red-200 rounded-2xl rounded-tl-sm px-4 py-3 text-sm text-red-800 leading-relaxed'
                    : 'bg-white border border-slate-100 shadow-sm rounded-2xl rounded-tl-sm px-4 py-3 text-sm text-text-pri leading-relaxed'
              }`}
            >
              <p className="whitespace-pre-line">{msg.text}</p>
              <div className={`flex items-center justify-between mt-2 ${msg.role === 'user' ? 'text-white/60' : 'text-text-sec'}`}>
                <span className="text-[10px]">{msg.time}</span>
                {msg.role === 'ai' && msg.isEmergency && (
                  <span className="text-[10px] font-bold text-red-600">⚠️ Emergency</span>
                )}
              </div>
            </div>
          </div>
        ))}
        {thinking && (
          <div className="flex justify-start">
            <div className="w-7 h-7 rounded-full bg-hgd-blue flex items-center justify-center flex-shrink-0 mr-2 mt-1">
              <Sparkles size={12} className="text-white" />
            </div>
            <div className="bg-white border border-slate-100 shadow-sm rounded-2xl rounded-tl-sm">
              <TypingDots />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* AI disclaimer */}
      <div className="px-4 py-1.5 bg-ai-purple-bg border-t border-ai-purple/20 flex-shrink-0">
        <p className="text-[10px] text-ai-purple italic text-center">
          AI guidance · Always verify with a senior clinician before clinical use
        </p>
      </div>

      {/* Input */}
      <div className="bg-white border-t border-slate-200 px-4 py-3 flex gap-2 items-center flex-shrink-0">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && send()}
          placeholder="Ask about departments, procedures..."
          className="flex-1 bg-slate-50 rounded-2xl px-4 py-2.5 text-sm text-text-pri placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-hgd-blue border border-slate-200 focus:border-transparent"
        />
        <button
          onClick={() => send()}
          disabled={!input.trim() || thinking}
          className="w-10 h-10 rounded-full bg-hgd-orange flex items-center justify-center text-white hover:bg-hgd-orange2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
        >
          <Send size={15} />
        </button>
      </div>
    </div>
  )
}

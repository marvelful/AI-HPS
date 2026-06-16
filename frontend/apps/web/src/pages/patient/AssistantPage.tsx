import { useState, useRef, useEffect } from 'react'
import { Send, Sparkles } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'

interface Message {
  id: string
  role: 'user' | 'ai'
  text: string
  time: string
  confidence?: number
  ref?: string
}

const SUGGESTED = ['Visiting hours', 'Find pediatrics', 'Pre-op fasting']

const MOCK_ANSWERS: Record<string, { text: string; confidence: number; ref: string }> = {
  default: {
    text: 'Based on HGD protocols, I can help you with that. For clinical use, always verify with a senior clinician before proceeding. Would you like me to show the full procedure steps?',
    confidence: 94,
    ref: 'HGD-GEN-001',
  },
  'visiting hours': {
    text: 'Visiting hours at HGD are:\n• General wards: 12:00–14:00 and 17:00–19:00\n• ICU: Family visits by appointment only\n• Maternity: 10:00–12:00 and 16:00–18:00\n\nPlease check with the nursing desk for any changes.',
    confidence: 98,
    ref: 'HGD-ADM-012',
  },
  'find pediatrics': {
    text: 'The Pediatrics department is located on the 3rd Floor, Wing A. From the main entrance, take the elevator to level 3, turn left, and follow the blue signs.',
    confidence: 99,
    ref: 'HGD-MAP-031',
  },
  'pre-op fasting': {
    text: 'Standard pre-operative fasting guidelines at HGD:\n• Solid food: Nothing after midnight before surgery\n• Clear fluids: Stop 2 hours before scheduled time\n• Medications: Take with a small sip of water unless instructed otherwise\n\nAlways confirm with your surgeon.',
    confidence: 97,
    ref: 'HGD-SURG-008',
  },
  'blood test': {
    text: 'Blood tests at HGD are done at the Laboratory on Basement 1. Walk-in hours are 07:00–15:00 Monday to Saturday. For urgent tests, present at the Emergency lab (Ground Floor) at any time.',
    confidence: 98,
    ref: 'HGD-LAB-051',
  },
}

function getMockAnswer(query: string) {
  const q = query.toLowerCase()
  for (const key of Object.keys(MOCK_ANSWERS)) {
    if (key !== 'default' && q.includes(key)) return MOCK_ANSWERS[key]
  }
  return MOCK_ANSWERS.default
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

export default function AssistantPage() {
  const [searchParams] = useSearchParams()
  const prefill = searchParams.get('q') ?? ''

  const [messages, setMessages] = useState<Message[]>([
    {
      id: '0',
      role: 'ai',
      text: "Hello! I'm the AI-HPS assistant for Hôpital Général de Douala. I can help you find departments, understand procedures, and answer general questions. How can I help you today?",
      time: now(),
      confidence: 100,
    },
  ])
  const [input, setInput] = useState(prefill)
  const [thinking, setThinking] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, thinking])

  const send = async (text?: string) => {
    const msg = (text ?? input).trim()
    if (!msg || thinking) return
    setInput('')

    const userMsg: Message = { id: Date.now().toString(), role: 'user', text: msg, time: now() }
    setMessages((m) => [...m, userMsg])
    setThinking(true)

    await new Promise((r) => setTimeout(r, 1400))

    const answer = getMockAnswer(msg)
    const aiMsg: Message = {
      id: (Date.now() + 1).toString(),
      role: 'ai',
      text: answer.text,
      time: now(),
      confidence: answer.confidence,
      ref: answer.ref,
    }
    setMessages((m) => [...m, aiMsg])
    setThinking(false)
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

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-[#F5F7FA]">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'ai' && (
              <div className="w-7 h-7 rounded-full bg-hgd-blue flex items-center justify-center flex-shrink-0 mr-2 mt-1">
                <Sparkles size={12} className="text-white" />
              </div>
            )}
            <div
              className={`max-w-[78%] ${
                msg.role === 'user'
                  ? 'bg-hgd-blue text-white rounded-2xl rounded-br-sm px-4 py-3 text-sm leading-relaxed'
                  : 'bg-white border border-slate-100 shadow-sm rounded-2xl rounded-tl-sm px-4 py-3 text-sm text-text-pri leading-relaxed'
              }`}
            >
              <p className="whitespace-pre-line">{msg.text}</p>
              <div className={`flex items-center justify-between mt-2 ${msg.role === 'user' ? 'text-white/60' : 'text-text-sec'}`}>
                <span className="text-[10px]">{msg.time}</span>
                {msg.confidence !== undefined && msg.role === 'ai' && (
                  <div className="flex items-center gap-2">
                    {msg.ref && <span className="text-[9px] font-mono opacity-60">{msg.ref}</span>}
                    <span className="text-[10px] font-bold text-green-600">Confidence {msg.confidence}%</span>
                  </div>
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

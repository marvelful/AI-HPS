'use client';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Sparkles, ArrowLeft, Phone, Mic, MicOff, PanelLeft, Plus, Clock } from 'lucide-react';
import Link from 'next/link';
import { pipelineApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

type MessageType = 'user' | 'ai-text' | 'ai-procedure' | 'ai-navigation' | 'ai-emergency';

interface Message {
  id: string;
  type: MessageType;
  content?: any;
  timestamp: string;
  procedure?: { title: string; steps: string[]; warning: string };
  navigation?: { dept: string; floor: string; time: string; directions: string[] };
}

interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
}

const SESSIONS_KEY = 'aihps_patient_sessions';

function loadSessions(): ChatSession[] {
  try {
    const raw = localStorage.getItem(SESSIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveSessions(all: ChatSession[], id: string, msgs: Message[]): ChatSession[] {
  const title = msgs.find((m) => m.type === 'user')?.content?.slice(0, 48) ?? 'Chat';
  const updated = all.filter((s) => s.id !== id);
  const session: ChatSession = { id, title, messages: msgs, createdAt: Date.now() };
  const next = [session, ...updated].slice(0, 30);
  try { localStorage.setItem(SESSIONS_KEY, JSON.stringify(next)); } catch {}
  return next;
}

const SUGGESTED_TOPICS = {
  fr: [
    { id: 'topic-blood', label: 'Préparer une prise de sang', query: 'Comment se préparer pour une analyse sanguine?' },
    { id: 'topic-pediatrics', label: 'Trouver la Pédiatrie', query: 'Comment aller au département Pédiatrie?' },
    { id: 'topic-visiting', label: 'Horaires de visite', query: 'Quels sont les horaires de visite?' },
    { id: 'topic-mri', label: 'Préparer un IRM', query: 'Comment se préparer pour un IRM?' },
    { id: 'topic-chest', label: 'Douleur thoracique', query: 'J\'ai une douleur thoracique sévère' },
    { id: 'topic-bp', label: 'Tension artérielle', query: 'Comment mesurer ma tension artérielle?' },
  ],
  en: [
    { id: 'topic-blood', label: 'Prepare for blood test', query: 'How to prepare for a blood test?' },
    { id: 'topic-pediatrics', label: 'Find Pediatrics', query: 'How do I get to the Pediatrics department?' },
    { id: 'topic-visiting', label: 'Visiting hours', query: 'What are the visiting hours?' },
    { id: 'topic-mri', label: 'Prepare for MRI', query: 'How to prepare for an MRI scan?' },
    { id: 'topic-chest', label: 'Chest pain', query: 'I have severe chest pain' },
    { id: 'topic-bp', label: 'Blood pressure', query: 'How do I measure my blood pressure?' },
  ],
};

function nowTime() {
  return new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function UserBubble({ msg }: { msg: Message }) {
  return (
    <div className="flex justify-end message-fade-in">
      <div className="max-w-[78%] px-4 py-3 rounded-2xl rounded-br-sm text-white text-sm leading-relaxed" style={{ background: 'var(--primary)' }}>
        {msg.content}
      </div>
    </div>
  );
}

function AITextBubble({ msg }: { msg: Message }) {
  const lines = (typeof msg.content === 'string' ? msg.content : '').split('\n');
  return (
    <div className="flex items-end gap-2 message-fade-in">
      <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mb-1" style={{ background: 'var(--accent)' }}>
        <Sparkles size={14} color="white" />
      </div>
      <div className="max-w-[78%] bg-white px-4 py-3 rounded-2xl rounded-bl-sm text-sm leading-relaxed shadow-sm border" style={{ borderColor: 'var(--border)' }}>
        {lines.map((line, i) => (
          <p key={`line-${i}`} className={`text-foreground ${i > 0 ? 'mt-1' : ''}`}>
            {line.replace(/\*\*(.*?)\*\*/g, '$1')}
          </p>
        ))}
      </div>
    </div>
  );
}

function AIProcedureBubble({ msg, lang }: { msg: Message; lang: 'fr' | 'en' }) {
  const raw = msg.procedure ?? msg.content;
  const title: string = raw?.title || raw?.summary || (lang === 'en' ? 'Procedure' : 'Procédure');
  const steps: string[] = (raw?.steps || []).map((s: any) =>
    typeof s === 'string' ? s : (s.description || s.text || s.step || s.instruction || JSON.stringify(s))
  );
  const warning: string = raw?.warning || raw?.when_to_seek_help || (lang === 'en'
    ? 'Always consult your doctor for personalized advice.'
    : 'Consultez toujours votre médecin pour des conseils personnalisés.');

  const stepLabel = lang === 'en' ? 'Procedure:' : 'Procédure:';
  const doctorLabel = lang === 'en' ? 'When to see a doctor:' : 'Quand consulter un médecin:';

  return (
    <div className="flex items-end gap-2 message-fade-in">
      <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mb-1" style={{ background: 'var(--accent)' }}>
        <Sparkles size={14} color="white" />
      </div>
      <div className="max-w-[82%] space-y-2">
        <div className="bg-white rounded-2xl rounded-bl-sm p-4 shadow-sm border" style={{ borderColor: 'var(--border)' }}>
          <p className="text-xs font-bold mb-3" style={{ color: 'var(--accent)' }}>{stepLabel} {title}</p>
          <div className="space-y-2">
            {steps.map((step, i) => (
              <div key={`step-${i}`} className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5" style={{ background: 'var(--secondary-light)', color: 'var(--secondary)' }}>
                  {i + 1}
                </span>
                <p className="text-xs text-foreground leading-relaxed">{step}</p>
              </div>
            ))}
          </div>
          {raw?.answer && (
            <p className="text-xs text-foreground leading-relaxed mt-3">{raw.answer}</p>
          )}
        </div>
        <div className="rounded-xl p-3 border" style={{ background: '#FEF3C7', borderColor: '#F59E0B' }}>
          <p className="text-xs font-semibold mb-1" style={{ color: '#92400E' }}>{doctorLabel}</p>
          <p className="text-xs" style={{ color: '#78350F' }}>{warning}</p>
        </div>
      </div>
    </div>
  );
}

function AINavigationBubble({ msg, lang }: { msg: Message; lang: 'fr' | 'en' }) {
  const raw = msg.navigation ?? msg.content;
  const dept: string = raw?.dept || raw?.to || raw?.department || (lang === 'en' ? 'Department' : 'Département');
  const floor: string = raw?.floor || raw?.location || '';
  const time: string = raw?.time || (raw?.estimated_time_minutes ? `${raw.estimated_time_minutes} min` : '');
  const directions: string[] = (raw?.directions || []).map((d: any) =>
    typeof d === 'string' ? d : (d.instruction || d.text || JSON.stringify(d))
  );
  const mapLabel = lang === 'en' ? 'View full map' : 'Voir le plan complet';

  return (
    <div className="flex items-end gap-2 message-fade-in">
      <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mb-1" style={{ background: 'var(--accent)' }}>
        <Sparkles size={14} color="white" />
      </div>
      <div className="max-w-[82%] bg-white rounded-2xl rounded-bl-sm p-4 shadow-sm border" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-base">📍</span>
          <div>
            <p className="text-sm font-bold text-foreground">{dept}</p>
            <p className="text-xs text-muted-foreground">{floor}{floor && time ? ' · ' : ''}{time}</p>
          </div>
        </div>
        <div className="space-y-2">
          {directions.map((dir, i) => (
            <div key={`dir-${i}`} className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5" style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}>
                {i + 1}
              </span>
              <p className="text-xs text-foreground leading-relaxed">{dir}</p>
            </div>
          ))}
        </div>
        <Link
          href="/departments"
          className="mt-3 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all duration-150 active:scale-95"
          style={{ background: 'var(--secondary-light)', color: 'var(--secondary)' }}
        >
          {mapLabel}
        </Link>
      </div>
    </div>
  );
}

function AIEmergencyBubble({ lang }: { lang: 'fr' | 'en' }) {
  const title = lang === 'en' ? 'Emergency Detected' : 'Urgence Détectée';
  const desc = lang === 'en'
    ? 'Your symptoms require immediate medical attention. Do not wait.'
    : 'Vos symptômes nécessitent une attention médicale immédiate. N\'attendez pas.';
  const callLabel = lang === 'en' ? 'Call HGD Emergency' : 'Appeler les Urgences HGD';

  return (
    <div className="flex items-end gap-2 message-fade-in">
      <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mb-1" style={{ background: 'var(--critical)' }}>
        <Sparkles size={14} color="white" />
      </div>
      <div className="max-w-[82%] rounded-2xl rounded-bl-sm p-4 border-2 pulse-emergency" style={{ background: '#FEF2F2', borderColor: 'var(--critical)' }}>
        <p className="text-sm font-bold mb-1" style={{ color: 'var(--critical)' }}>{title}</p>
        <p className="text-xs mb-3" style={{ color: '#7F1D1D' }}>{desc}</p>
        <a href="tel:+237222311501" className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all duration-150 active:scale-95" style={{ background: 'var(--critical)', color: 'white' }}>
          <Phone size={16} /> {callLabel}
        </a>
        <p className="text-center text-[10px] mt-2" style={{ color: '#9B1C1C' }}>HGD: +237 222 311 501</p>
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex items-end gap-2 message-fade-in">
      <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'var(--accent)' }}>
        <Sparkles size={14} color="white" />
      </div>
      <div className="bg-white rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm border flex items-center gap-1.5" style={{ borderColor: 'var(--border)' }}>
        {[0, 1, 2].map((i) => (
          <div key={`typing-dot-${i}`} className="w-2 h-2 rounded-full typing-dot" style={{ background: 'var(--muted-foreground)', animationDelay: `${i * 0.2}s` }} />
        ))}
      </div>
    </div>
  );
}

function HistorySidebar({
  open, sessions, activeId, onSelect, onNewChat, onClose, lang,
}: {
  open: boolean;
  sessions: ChatSession[];
  activeId: string;
  onSelect: (id: string) => void;
  onNewChat: () => void;
  onClose: () => void;
  lang: 'fr' | 'en';
}) {
  if (!open) return null;
  const historyLabel = lang === 'en' ? 'Chat History' : 'Historique';
  const newChatLabel = lang === 'en' ? 'New Chat' : 'Nouveau Chat';
  const noHistoryLabel = lang === 'en' ? 'No history yet.' : 'Aucun historique.';

  return (
    <div className="absolute inset-0 z-30 flex" style={{ background: 'rgba(0,0,0,0.4)' }} onClick={onClose}>
      <div className="w-72 bg-white flex flex-col shadow-xl h-full" onClick={(e) => e.stopPropagation()}>
        <div className="px-4 py-4 border-b flex items-center justify-between" style={{ background: 'var(--primary)' }}>
          <span className="font-bold text-white text-base">{historyLabel}</span>
          <button onClick={onClose} className="text-white/70 hover:text-white text-lg leading-none">✕</button>
        </div>
        <div className="px-3 py-2 border-b">
          <button
            onClick={onNewChat}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-white font-semibold text-sm"
            style={{ background: 'var(--secondary)' }}
          >
            <Plus size={15} /> {newChatLabel}
          </button>
        </div>
        <div className="flex-1 overflow-y-auto py-2">
          {sessions.length === 0 ? (
            <p className="px-4 py-8 text-center text-muted-foreground text-xs">{noHistoryLabel}</p>
          ) : (
            sessions.map((s) => (
              <button
                key={s.id}
                onClick={() => { onSelect(s.id); onClose(); }}
                className={`w-full text-left px-4 py-3 hover:bg-muted/60 transition-colors flex flex-col gap-0.5 ${activeId === s.id ? 'bg-primary-light border-r-2 border-primary' : ''}`}
              >
                <span className="truncate font-medium text-foreground text-xs">{s.title}</span>
                <span className="text-muted-foreground flex items-center gap-1" style={{ fontSize: '10px' }}>
                  <Clock size={9} /> {new Date(s.createdAt).toLocaleDateString(lang === 'en' ? 'en-US' : 'fr-FR')}
                </span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default function AIAssistantScreen() {
  const { patient } = useAuthStore();
  const lang: 'fr' | 'en' = patient?.language ?? 'fr';

  const [sessions, setSessions] = useState<ChatSession[]>(() => loadSessions());
  const [activeSessionId, setActiveSessionId] = useState(() => 'sess_' + Date.now());
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recRef = useRef<any>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  useEffect(() => {
    if (messages.length > 0) {
      setSessions((prev) => saveSessions(prev, activeSessionId, messages));
    }
  }, [messages, activeSessionId]);

  const startNewSession = useCallback(() => {
    const id = 'sess_' + Date.now();
    setActiveSessionId(id);
    setMessages([]);
    setSidebarOpen(false);
  }, []);

  const loadSession = useCallback((id: string) => {
    const s = sessions.find((x) => x.id === id);
    if (s) {
      setActiveSessionId(id);
      setMessages(s.messages);
    }
  }, [sessions]);

  const toggleMic = () => {
    if (isRecording) {
      recRef.current?.stop();
      setIsRecording(false);
      return;
    }
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      alert(lang === 'en'
        ? 'Voice recognition is not supported in this browser. Try Chrome.'
        : 'La reconnaissance vocale n\'est pas supportée dans ce navigateur. Essayez Chrome.');
      return;
    }
    const rec = new SR();
    rec.lang = lang === 'en' ? 'en-US' : 'fr-FR';
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.continuous = false;
    rec.onresult = (e: any) => {
      const t: string = e.results[0][0].transcript;
      setInput((p) => (p ? p + ' ' + t : t));
    };
    rec.onerror = (e: any) => {
      if (e.error !== 'no-speech') {
        alert(lang === 'en'
          ? `Microphone error: ${e.error}. Make sure microphone access is allowed.`
          : `Erreur micro: ${e.error}. Vérifiez que l'accès au microphone est autorisé.`);
      }
      setIsRecording(false);
    };
    rec.onend = () => setIsRecording(false);
    rec.start();
    recRef.current = rec;
    setIsRecording(true);
  };

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;
    const userMsg: Message = { id: `msg-user-${Date.now()}`, type: 'user', content: text, timestamp: nowTime() };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    setIsTyping(true);

    try {
      const data = await pipelineApi.query({
        raw_query: text,
        platform: 'mobile',
        stream: 'A',
        user_id: patient?.id,
        session_id: activeSessionId,
        chatbot_mode: true,
      });

      // Unwrap agent_o's nested {found, data} structure
      let outputPayload = data.output;
      if (data.output_type === 'json' && data.output && typeof data.output === 'object' && 'found' in data.output) {
        if (data.output.found === true && data.output.data) {
          outputPayload = data.output.data;
        } else if (data.output.found === false) {
          outputPayload = { text: data.output.message ?? (lang === 'en' ? 'No information found for your query.' : 'Aucune information trouvée pour votre question.') };
        }
      }

      const isEmptyJson =
        data.output_type === 'json' &&
        !outputPayload?.answer &&
        (!outputPayload?.steps || outputPayload.steps.length === 0);
      const isFailed = !data.had_result && (!outputPayload || isEmptyJson);

      const notFoundMsg = lang === 'en'
        ? 'I couldn\'t find information matching your question.'
        : 'Je n\'ai pas trouvé d\'information correspondante pour votre question.';
      const errTxt = data.error
        ? (lang === 'en' ? `AI service error: ${data.error}` : `Erreur du service IA: ${data.error}`)
        : (lang === 'en'
            ? 'AI assistant temporarily unavailable (LLM unreachable). Check your internet connection and try again.'
            : 'Le service IA est temporairement indisponible (modèle LLM inaccessible). Vérifiez votre connexion internet et réessayez.');

      let aiMsg: Message;
      if (isFailed || data.error) {
        aiMsg = { id: `msg-ai-${Date.now()}`, type: 'ai-text', content: errTxt, timestamp: nowTime() };
      } else if (data.is_emergency) {
        aiMsg = { id: `msg-ai-${Date.now()}`, type: 'ai-emergency', content: outputPayload?.answer, timestamp: nowTime() };
      } else if (data.output_type === 'json' && outputPayload?.steps?.length > 0) {
        aiMsg = { id: `msg-ai-${Date.now()}`, type: 'ai-procedure', content: outputPayload, timestamp: nowTime() };
      } else if (outputPayload?.from && outputPayload?.directions) {
        aiMsg = { id: `msg-ai-${Date.now()}`, type: 'ai-navigation', content: outputPayload, timestamp: nowTime() };
      } else {
        const txt = typeof outputPayload === 'string' ? outputPayload
          : (outputPayload?.answer || outputPayload?.text || null);
        aiMsg = { id: `msg-ai-${Date.now()}`, type: 'ai-text', content: txt ?? notFoundMsg, timestamp: nowTime() };
      }
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      const offline = !err?.response?.status;
      const msg = offline
        ? (lang === 'en' ? 'AI service temporarily unavailable. Check your connection.' : 'Service IA temporairement indisponible. Vérifiez votre connexion.')
        : (lang === 'en' ? 'Sorry, an error occurred. Please try again.' : 'Désolé, une erreur s\'est produite. Veuillez réessayer.');
      setMessages((prev) => [...prev, { id: `msg-ai-${Date.now()}`, type: 'ai-text', content: msg, timestamp: nowTime() }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSend = () => sendMessage(input);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
  };

  const greetingName = patient?.name?.split(' ')[0] || (lang === 'fr' ? 'vous' : 'you');
  const greetingMsg = lang === 'en' ? `Hello, ${greetingName}!` : `Bonjour, ${greetingName}!`;
  const greetingSubMsg = lang === 'en'
    ? 'Ask me a health question, a procedure, or to find a department.'
    : 'Posez-moi une question sur votre santé, une procédure ou pour trouver un département.';
  const placeholder = lang === 'en' ? 'Ask your question...' : 'Posez votre question...';
  const disclaimer = lang === 'en'
    ? 'This assistant provides general information — always consult a doctor.'
    : 'Cet assistant fournit des informations générales — consultez toujours un médecin.';
  const onlineLabel = lang === 'en' ? 'Online' : 'En ligne';
  const topics = SUGGESTED_TOPICS[lang];

  return (
    <div className="flex flex-col relative" style={{ height: 'calc(100dvh - 64px)' }}>
      <HistorySidebar
        open={sidebarOpen}
        sessions={sessions}
        activeId={activeSessionId}
        onSelect={loadSession}
        onNewChat={startNewSession}
        onClose={() => setSidebarOpen(false)}
        lang={lang}
      />

      {/* Header */}
      <div className="gradient-primary px-4 pt-12 pb-4 relative overflow-hidden flex-shrink-0">
        <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full opacity-10" style={{ background: 'var(--secondary)' }} />
        <div className="flex items-center gap-3 relative">
          <Link href="/" className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.15)' }} aria-label={lang === 'en' ? 'Back' : 'Retour'}>
            <ArrowLeft size={18} color="white" />
          </Link>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'var(--accent)' }}>
                <Sparkles size={14} color="white" />
              </div>
              <div>
                <p className="text-white text-sm font-bold leading-none">AI-HPS Assistant</p>
                <p className="text-blue-200 text-[10px] mt-0.5">Hôpital Général de Douala</p>
              </div>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(true)}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-all duration-150 active:scale-95"
            style={{ background: 'rgba(255,255,255,0.15)' }}
            aria-label={lang === 'en' ? 'Chat history' : 'Historique des chats'}
          >
            <PanelLeft size={16} color="white" />
          </button>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full" style={{ background: 'rgba(16,185,129,0.2)' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
            <span className="text-[10px] font-semibold text-emerald-300">{onlineLabel}</span>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3" style={{ background: 'var(--background)' }}>
        {messages.length === 0 && (
          <div>
            <div className="text-center mb-5">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ background: 'var(--accent)' }}>
                <Sparkles size={28} color="white" />
              </div>
              <h2 className="text-foreground font-bold text-base mb-1">{greetingMsg}</h2>
              <p className="text-muted-foreground text-xs">{greetingSubMsg}</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {topics.map((topic) => (
                <button
                  key={topic.id}
                  onClick={() => sendMessage(topic.query)}
                  className="text-left p-3 rounded-xl border transition-all duration-150 active:scale-95 hover:border-primary/50"
                  style={{ background: 'white', borderColor: 'var(--border)' }}
                >
                  <p className="text-xs font-semibold text-foreground leading-snug">{topic.label}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => {
          if (msg.type === 'user') return <UserBubble key={msg.id} msg={msg} />;
          if (msg.type === 'ai-text') return <AITextBubble key={msg.id} msg={msg} />;
          if (msg.type === 'ai-procedure') return <AIProcedureBubble key={msg.id} msg={msg} lang={lang} />;
          if (msg.type === 'ai-navigation') return <AINavigationBubble key={msg.id} msg={msg} lang={lang} />;
          if (msg.type === 'ai-emergency') return <AIEmergencyBubble key={msg.id} lang={lang} />;
          return null;
        })}

        {isTyping && <TypingIndicator />}
        <div ref={bottomRef} />
      </div>

      {/* AI Disclaimer */}
      <div className="px-4 py-2 flex-shrink-0 border-t" style={{ background: '#F3E8FF', borderColor: '#DDD6FE' }}>
        <p className="text-[10px] text-center font-medium" style={{ color: '#5B21B6' }}>
          {disclaimer}
        </p>
      </div>

      {/* Input Area */}
      <div className="px-4 py-3 flex-shrink-0 border-t flex items-end gap-2" style={{ background: 'white', borderColor: 'var(--border)' }}>
        <textarea
          ref={textareaRef}
          value={input}
          onChange={handleTextareaChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={1}
          className="flex-1 resize-none rounded-2xl border px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200"
          style={{ borderColor: 'var(--border)', minHeight: '44px', maxHeight: '120px' }}
          aria-label={lang === 'en' ? 'Message' : 'Message'}
        />
        <button
          onClick={toggleMic}
          title={isRecording
            ? (lang === 'en' ? 'Stop recording' : 'Arrêter l\'enregistrement')
            : (lang === 'en' ? 'Voice input' : 'Saisie vocale')}
          className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 transition-all duration-150 active:scale-95 ${isRecording ? 'text-white' : 'border text-muted-foreground hover:text-foreground'}`}
          style={{
            background: isRecording ? 'var(--critical)' : 'transparent',
            borderColor: 'var(--border)',
          }}
          aria-label={isRecording ? 'Stop' : 'Microphone'}
        >
          {isRecording ? <MicOff size={18} /> : <Mic size={18} />}
        </button>
        <button
          onClick={handleSend}
          disabled={!input.trim() || isTyping}
          className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 transition-all duration-150 active:scale-95 disabled:opacity-40"
          style={{ background: 'var(--secondary)' }}
          aria-label={lang === 'en' ? 'Send' : 'Envoyer'}
        >
          <Send size={18} color="white" />
        </button>
      </div>
    </div>
  );
}

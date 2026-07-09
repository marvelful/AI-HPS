'use client';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Sparkles, Send, AlertTriangle, Phone, PanelLeft, Plus, Mic, MicOff, Clock, MoreVertical, Trash2 } from 'lucide-react';
import Badge from '@/components/ui/Badge';
import { pipelineApi } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';

type MessageRole = 'user' | 'assistant';

interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string | null;
  timestamp: string;
  procedureResponse?: boolean;
  responseData?: any;
  isEmergency?: boolean;
  isText?: boolean;
}

interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
}

const SESSIONS_KEY = 'aihps_staff_chat_sessions';

function sessionStorageKey(ownerId?: string): string {
  return `${SESSIONS_KEY}:${ownerId || 'guest'}`;
}

function loadSessions(key: string): ChatSession[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveSessions(key: string, all: ChatSession[], id: string, msgs: ChatMessage[]) {
  const title = msgs.find((m) => m.role === 'user')?.content?.slice(0, 48) ?? 'Chat';
  const updated = all.filter((s) => s.id !== id);
  const session: ChatSession = { id, title, messages: msgs, createdAt: Date.now() };
  const next = [session, ...updated].slice(0, 30);
  try { localStorage.setItem(key, JSON.stringify(next)); } catch {}
  return next;
}

function ProcedureResponseBubble({ data }: { data?: any }) {
  if (!data) return null;

  const answer: string | null = data.answer ?? data.disclaimer ?? null;
  const steps: { text: string; requiresApproval: boolean }[] = data.steps
    ? data.steps.map((s: any) => ({
        text: typeof s === 'string' ? s : s.instruction ?? s.description ?? s.text ?? JSON.stringify(s),
        requiresApproval: s.requires_approval ?? false,
      }))
    : [];
  const complianceNotes: string[] = data.compliance_notes
    ? (Array.isArray(data.compliance_notes) ? data.compliance_notes : [data.compliance_notes])
    : [];
  const riskLevel: string | null = data.risk_level ?? null;
  const sources: string[] = data.source
    ? (Array.isArray(data.source) ? data.source : [data.source])
    : [];

  return (
    <div className="bg-card rounded-md shadow-card border border-border max-w-3xl p-5 chat-message-enter">
      {answer && (
        <p className="text-foreground leading-relaxed mb-4" style={{ fontSize: '14px' }}>
          {answer}
        </p>
      )}

      {steps.length > 0 && (
        <div className="mb-4">
          <div className="pb-2 mb-3 border-b border-border">
            <span className="label-meta text-primary">Procedure Steps</span>
          </div>
          <div className="flex flex-col gap-3">
            {steps.map((step, idx) => (
              <div key={`step-${idx}`} className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center font-bold flex-shrink-0 mt-0.5" style={{ fontSize: '11px' }}>
                  {idx + 1}
                </div>
                <div className="flex-1">
                  <p className="text-foreground leading-snug" style={{ fontSize: '13px' }}>{step.text}</p>
                  {step.requiresApproval && (
                    <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full bg-secondary-light text-secondary label-meta">
                      Approval: Dept Head
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {complianceNotes.length > 0 && (
        <div className="rounded-sm p-3 mb-4" style={{ borderLeft: '3px solid #004A8F', backgroundColor: '#E8F0FA' }}>
          <p className="label-meta text-primary mb-2">Compliance Notes</p>
          <ul className="flex flex-col gap-1">
            {complianceNotes.map((note, i) => (
              <li key={`note-${i}`} className="text-primary flex items-start gap-1.5" style={{ fontSize: '12px' }}>
                <span className="mt-0.5">•</span> {note}
              </li>
            ))}
          </ul>
        </div>
      )}

      {riskLevel && (
        <div className="flex items-center gap-2 mb-3">
          <span className="label-meta text-muted-foreground">Risk Level:</span>
          <Badge variant={riskLevel as any}>{riskLevel.toUpperCase()}</Badge>
        </div>
      )}

      {sources.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {sources.map((src) => (
            <span key={`src-${src}`} className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-mono-clinical" style={{ fontSize: '11px' }}>
              {src}
            </span>
          ))}
        </div>
      )}

      <p className="text-muted-foreground italic mt-2" style={{ fontSize: '11px' }}>
        AI-generated · Always verify with senior clinician before performing procedure
      </p>
    </div>
  );
}

function TextResponseBubble({ content }: { content: string }) {
  return (
    <div className="bg-card rounded-md shadow-card border border-border max-w-3xl p-5 chat-message-enter">
      <p className="text-foreground leading-relaxed" style={{ fontSize: '14px', whiteSpace: 'pre-wrap' }}>
        {content}
      </p>
      <p className="text-muted-foreground italic mt-3" style={{ fontSize: '11px' }}>
        AI-generated · Always verify with senior clinician before acting
      </p>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex items-start gap-3 chat-message-enter">
      <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0" style={{ background: 'linear-gradient(135deg, #5B21B6, #7C3AED)', fontSize: '11px' }}>
        AI
      </div>
      <div className="bg-card rounded-md shadow-card border border-border px-4 py-3">
        <div className="flex items-center gap-1.5">
          {[0, 1, 2].map((i) => (
            <div key={`dot-${i}`} className="w-2 h-2 rounded-full bg-primary typing-dot" style={{ animationDelay: `${i * 0.2}s` }} />
          ))}
        </div>
      </div>
    </div>
  );
}

function Sidebar({
  open, sessions, activeId, onSelect, onDelete, onNewChat, onClose,
}: {
  open: boolean;
  sessions: ChatSession[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onNewChat: () => void;
  onClose: () => void;
}) {
  const [menuId, setMenuId] = useState<string | null>(null);
  if (!open) return null;
  return (
    <div className="flex-shrink-0 bg-card border-r border-border flex flex-col overflow-hidden" style={{ width: '260px' }}>
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <span className="font-semibold text-foreground" style={{ fontSize: '14px' }}>Chat History</span>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors" style={{ fontSize: '12px' }}>✕</button>
      </div>
      <div className="px-3 py-2 border-b border-border">
        <button
          onClick={onNewChat}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-sm bg-primary text-white hover:bg-primary-hover transition-colors font-medium"
          style={{ fontSize: '13px' }}
        >
          <Plus size={14} /> New Chat
        </button>
      </div>
      <div className="flex-1 overflow-y-auto py-2">
        {sessions.length === 0 ? (
          <p className="px-4 py-8 text-center text-muted-foreground" style={{ fontSize: '12px' }}>No chat history yet.</p>
        ) : (
          sessions.map((s) => (
            <div
              key={s.id}
              className={`relative w-full px-4 py-3 hover:bg-muted/60 transition-colors flex items-start gap-2 ${activeId === s.id ? 'bg-primary-light border-r-2 border-primary' : ''}`}
            >
              <button onClick={() => onSelect(s.id)} className="min-w-0 flex-1 text-left flex flex-col gap-0.5">
                <span className="truncate font-medium text-foreground" style={{ fontSize: '12px' }}>{s.title}</span>
                <span className="text-muted-foreground flex items-center gap-1" style={{ fontSize: '10px' }}>
                  <Clock size={9} /> {new Date(s.createdAt).toLocaleDateString()}
                </span>
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setMenuId(menuId === s.id ? null : s.id); }}
                className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-background"
                aria-label="Chat options"
              >
                <MoreVertical size={14} />
              </button>
              {menuId === s.id && (
                <button
                  onClick={(e) => { e.stopPropagation(); onDelete(s.id); setMenuId(null); }}
                  className="absolute right-3 top-9 z-10 flex items-center gap-2 px-3 py-2 rounded-sm border border-border bg-card shadow-card text-clinical-red hover:bg-clinical-red-bg"
                  style={{ fontSize: '12px' }}
                >
                  <Trash2 size={13} /> Delete
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default function AIAssistantChat() {
  const { user } = useAuthStore();
  const storageKey = sessionStorageKey(user?.id || user?.email);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sessions, setSessions] = useState<ChatSession[]>(() => loadSessions(storageKey));
  const [activeSessionId, setActiveSessionId] = useState<string>(() => 'sess_' + Date.now());
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showEmergency, setShowEmergency] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recRef = useRef<any>(null);

  useEffect(() => {
    setSessions(loadSessions(storageKey));
    setActiveSessionId('sess_' + Date.now());
    setMessages([]);
  }, [storageKey]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  useEffect(() => {
    if (messages.length > 0) {
      setSessions((prev) => saveSessions(storageKey, prev, activeSessionId, messages));
    }
  }, [messages, activeSessionId, storageKey]);

  const startNewSession = useCallback(() => {
    const id = 'sess_' + Date.now();
    setActiveSessionId(id);
    setMessages([]);
    setShowEmergency(false);
    setSidebarOpen(false);
  }, []);

  const loadSession = useCallback((id: string) => {
    const s = sessions.find((x) => x.id === id);
    if (s) {
      setActiveSessionId(id);
      setMessages(s.messages);
      setShowEmergency(false);
      setSidebarOpen(false);
    }
  }, [sessions]);

  const deleteSession = useCallback((id: string) => {
    setSessions((prev) => {
      const next = prev.filter((session) => session.id !== id);
      try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch {}
      return next;
    });
    if (activeSessionId === id) {
      startNewSession();
    }
  }, [activeSessionId, startNewSession, storageKey]);

  const requestBrowserMic = async () => {
    if (!navigator?.mediaDevices?.getUserMedia) return;
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((track) => track.stop());
  };

  const toggleMic = async () => {
    if (isRecording) {
      recRef.current?.stop();
      setIsRecording(false);
      return;
    }
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      alert('Voice recognition is not supported in this browser. Try Chrome or Edge.');
      return;
    }
    try {
      await requestBrowserMic();
    } catch {
      alert('Microphone access was blocked. Please allow microphone permission for this site and try again.');
      return;
    }
    const rec = new SR();
    rec.lang = 'fr-FR';
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.continuous = false;
    rec.onresult = (e: any) => {
      const t: string = e.results[0][0].transcript;
      setInput((p) => (p ? p + ' ' + t : t));
    };
    rec.onerror = (e: any) => {
      if (e.error !== 'no-speech') {
        alert(`Microphone error: ${e.error}. Make sure microphone access is allowed.`);
      }
      setIsRecording(false);
    };
    rec.onend = () => setIsRecording(false);
    try {
      rec.start();
      recRef.current = rec;
      setIsRecording(true);
    } catch {
      alert('Could not start voice recognition. Please try again.');
      setIsRecording(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}-user`,
      role: 'user',
      content: input.trim(),
      timestamp: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    setIsTyping(true);

    try {
      const data = await pipelineApi.query({
        raw_query: userMsg.content!,
        platform: 'web',
        stream: 'B',
        user_id: user?.id,
        user_role: user?.role,
        session_id: `${user?.id || user?.email || 'staff'}:${activeSessionId}`,
        chatbot_mode: true,
      });

      if (data.is_emergency) setShowEmergency(true);

      // agent_o wraps JSON output: {found: true, data: {answer, steps, ...}} or {found: false, message}
      // Unwrap to get the actual content payload
      let outputPayload = data.output;
      let isTextResponse = data.output_type !== 'json';

      if (data.output_type === 'json' && data.output && typeof data.output === 'object' && 'found' in data.output) {
        if (data.output.found === true && data.output.data) {
          outputPayload = data.output.data;
        } else if (data.output.found === false) {
          outputPayload = data.output.message ?? 'No information found for your query.';
          isTextResponse = true;
        }
      }

      // Detect empty/failed response — LLM offline or no usable answer
      const isEmptyJson =
        !isTextResponse &&
        !outputPayload?.answer &&
        (!outputPayload?.steps || outputPayload.steps.length === 0);
      const isFailed = !data.had_result && (!outputPayload || isEmptyJson);

      let assistantMsg: ChatMessage;
      if (isFailed || data.error) {
        const errorText = data.error
          ? `Service error: ${data.error}`
          : 'The AI assistant could not generate a response. The language model service (Groq) may be unreachable — check internet connectivity and try again. If this persists, contact your system administrator.';
        assistantMsg = {
          id: `msg-${Date.now()}-assistant`,
          role: 'assistant',
          content: null,
          timestamp: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
          isText: true,
          responseData: { text: errorText },
        };
      } else {
        assistantMsg = {
          id: `msg-${Date.now()}-assistant`,
          role: 'assistant',
          content: null,
          timestamp: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
          procedureResponse: !isTextResponse,
          responseData: outputPayload,
          isEmergency: data.is_emergency,
          isText: isTextResponse,
        };
      }

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      const status = err?.response?.status;
      const detail = err?.response?.data?.detail ?? err?.message ?? 'Connection failed';
      const hint = !status ? ' Pipeline service may be offline (expected on port 8020).' : '';
      const errMsg: ChatMessage = {
        id: `msg-${Date.now()}-error`,
        role: 'assistant',
        content: null,
        timestamp: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
        isText: true,
        responseData: { text: `Unable to get a response. ${detail}${hint}` },
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 96) + 'px';
    }
  };

  return (
    <div className="flex" style={{ height: 'calc(100vh - 88px)' }}>
      <Sidebar
        open={sidebarOpen}
        sessions={sessions}
        activeId={activeSessionId}
        onSelect={loadSession}
        onDelete={deleteSession}
        onNewChat={startNewSession}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex flex-col flex-1 min-w-0">
        {/* Header */}
        <div className="rounded-md p-4 mb-3 flex items-center gap-3 flex-shrink-0" style={{ background: 'linear-gradient(90deg, #5B21B6, #004A8F)' }}>
          <button
            onClick={() => setSidebarOpen((v) => !v)}
            className="p-1.5 rounded-sm border border-white/30 text-white/70 hover:text-white hover:border-white/50 transition-colors flex-shrink-0"
            title="Chat History"
          >
            <PanelLeft size={16} />
          </button>
          <Sparkles size={22} className="text-white flex-shrink-0" />
          <div>
            <p className="text-white font-bold" style={{ fontSize: '18px' }}>Clinical AI Assistant</p>
            <p className="text-white/60" style={{ fontSize: '11px' }}>AI-HPS · Stream B · Clinical Staff</p>
          </div>
        </div>

        {/* Emergency Banner */}
        {showEmergency && (
          <div className="rounded-md p-4 mb-3 flex items-center justify-between gap-3 flex-shrink-0 emergency-pulse" style={{ backgroundColor: '#FFEBEE', border: '2px solid #C62828' }}>
            <div className="flex items-center gap-3">
              <AlertTriangle size={22} className="text-clinical-red flex-shrink-0" />
              <div>
                <p className="font-bold text-clinical-red" style={{ fontSize: '15px' }}>EMERGENCY DETECTED</p>
                <p className="text-clinical-red" style={{ fontSize: '13px' }}>Emergency protocol activated. Escalating to senior clinician and ICU team immediately.</p>
              </div>
            </div>
            <a href="tel:+237233425141" className="flex items-center gap-2 px-3 py-2 rounded-sm bg-clinical-red text-white font-semibold hover:opacity-90 transition-opacity flex-shrink-0 active:scale-95" style={{ fontSize: '13px' }}>
              <Phone size={14} /> Call Now: +237 233 42 51 41
            </a>
          </div>
        )}

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto flex flex-col gap-4 pb-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center px-8">
              <div className="w-16 h-16 rounded-full flex items-center justify-center text-white mb-4" style={{ background: 'linear-gradient(135deg, #5B21B6, #7C3AED)' }}>
                <Sparkles size={28} />
              </div>
              <p className="font-semibold text-foreground mb-1" style={{ fontSize: '16px' }}>Clinical AI Assistant</p>
              <p className="text-muted-foreground" style={{ fontSize: '13px' }}>
                Ask a clinical question or search a procedure to get started.
              </p>
            </div>
          )}

          {messages.map((msg) => {
            if (msg.role === 'user') {
              return (
                <div key={msg.id} className="flex justify-end">
                  <div className="rounded-md px-4 py-3 max-w-lg chat-message-enter" style={{ backgroundColor: '#004A8F', borderTopRightRadius: '2px' }}>
                    <p className="text-white" style={{ fontSize: '14px' }}>{msg.content}</p>
                  </div>
                </div>
              );
            }

            const isStructured = msg.procedureResponse && !msg.isText;
            const textContent = msg.isText
              ? (typeof msg.responseData === 'string' ? msg.responseData : msg.responseData?.text ?? msg.responseData?.answer ?? JSON.stringify(msg.responseData))
              : null;

            return (
              <div key={msg.id} className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0" style={{ background: 'linear-gradient(135deg, #5B21B6, #7C3AED)', fontSize: '11px' }}>
                  AI
                </div>
                {isStructured ? (
                  <ProcedureResponseBubble data={msg.responseData} />
                ) : textContent ? (
                  <TextResponseBubble content={textContent} />
                ) : (
                  <ProcedureResponseBubble data={msg.responseData} />
                )}
              </div>
            );
          })}

          {isTyping && <TypingIndicator />}
          <div ref={chatEndRef} />
        </div>

        {/* Input Area */}
        <div className="bg-card border-t border-border pt-3 pb-2 flex-shrink-0 rounded-b-md">
          <div className="flex items-end gap-2">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              placeholder="Ask a clinical question or search a procedure…"
              rows={1}
              className="flex-1 resize-none px-4 py-2.5 border border-border rounded-sm bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
              style={{ fontSize: '14px', minHeight: '42px', maxHeight: '96px' }}
            />
            <button
              onClick={toggleMic}
              title={isRecording ? 'Stop recording' : 'Record voice input'}
              className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-150 active:scale-95 ${isRecording ? 'bg-clinical-red text-white' : 'border border-border text-muted-foreground hover:text-foreground hover:border-primary'}`}
              aria-label={isRecording ? 'Stop recording' : 'Voice input'}
            >
              {isRecording ? <MicOff size={15} /> : <Mic size={15} />}
            </button>
            <button
              onClick={handleSend}
              disabled={!input.trim() || isTyping}
              className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center hover:bg-primary-hover disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150 active:scale-95 flex-shrink-0"
              aria-label="Send message"
            >
              <Send size={16} />
            </button>
          </div>
          <p className="text-center text-muted-foreground mt-2" style={{ fontSize: '11px' }}>
            AI responses are clinical guidance only · Not a substitute for clinical judgment
          </p>
        </div>
      </div>
    </div>
  );
}

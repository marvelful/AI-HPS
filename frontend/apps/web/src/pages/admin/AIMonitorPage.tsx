import { Cpu, Activity, TrendingUp, AlertTriangle } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { formatDateTime } from '@/lib/utils'

const agents = [
  { id: 'R', name: 'R-Agent', role: 'Retrieval',     status: 'active', confidence: 0.96, qph: 142 },
  { id: 'C', name: 'C-Agent', role: 'Classification', status: 'active', confidence: 0.94, qph: 138 },
  { id: 'N', name: 'N-Agent', role: 'Navigation',     status: 'active', confidence: 0.92, qph: 125 },
  { id: 'P', name: 'P-Agent', role: 'Procedure',      status: 'active', confidence: 0.95, qph: 131 },
  { id: 'E', name: 'E-Agent', role: 'Emergency',      status: 'degraded', confidence: 0.78, qph: 18 },
  { id: 'O', name: 'O-Agent', role: 'Output',         status: 'active', confidence: 0.93, qph: 144 },
]

const recentActivity = [
  { agent: 'R-Agent', action: 'Retrieved Haemorrhage Protocol (v3.2)', confidence: 0.98, time: '2026-06-16T09:44:00Z', channel: 'Mobile' },
  { agent: 'E-Agent', action: 'Emergency flag triggered — WhatsApp query', confidence: 0.91, time: '2026-06-16T09:41:00Z', channel: 'WhatsApp' },
  { agent: 'C-Agent', action: 'Query classified: Emergency / Haemorrhage', confidence: 0.95, time: '2026-06-16T09:40:00Z', channel: 'Mobile' },
  { agent: 'P-Agent', action: 'Generated procedure steps for ICU Sepsis', confidence: 0.93, time: '2026-06-16T09:38:00Z', channel: 'Web' },
  { agent: 'O-Agent', action: 'Response formatted with AI disclaimer',    confidence: 0.99, time: '2026-06-16T09:37:00Z', channel: 'SMS' },
]

export default function AIMonitorPage() {
  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex items-center gap-3">
        <Cpu size={22} className="text-ai-purple" />
        <div>
          <h1 className="text-2xl font-bold text-text-pri">AI Monitor</h1>
          <p className="text-sm text-text-sec mt-0.5">LangGraph agent status, confidence scores, and activity</p>
        </div>
      </div>

      {/* Agent grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {agents.map((a) => (
          <Card key={a.id} padding="md" accent={a.status === 'active' ? undefined : 'amber'}>
            <div className="flex items-center justify-between mb-2">
              <div className="w-8 h-8 rounded-lg bg-ai-purple-bg flex items-center justify-center text-xs font-bold text-ai-purple">
                {a.id}
              </div>
              <Badge variant={a.status === 'active' ? 'green' : 'amber'}>
                {a.status === 'active' ? 'Active' : 'Degraded'}
              </Badge>
            </div>
            <p className="text-xs font-bold text-text-pri">{a.name}</p>
            <p className="text-[10px] text-text-sec mb-3">{a.role}</p>
            <div className="space-y-1.5">
              <div>
                <div className="flex justify-between text-[10px] text-text-sec mb-1">
                  <span>Confidence</span>
                  <span className="font-bold text-text-pri">{(a.confidence * 100).toFixed(0)}%</span>
                </div>
                <div className="h-1.5 bg-surf-alt rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${a.confidence >= 0.9 ? 'bg-clin-green' : 'bg-clin-amber'}`}
                    style={{ width: `${a.confidence * 100}%` }}
                  />
                </div>
              </div>
              <p className="text-[10px] text-text-sec">
                <span className="font-bold text-text-pri">{a.qph}</span> q/hr
              </p>
            </div>
          </Card>
        ))}
      </div>

      {/* System alerts */}
      {agents.some((a) => a.status === 'degraded') && (
        <div className="bg-clin-amber-bg border border-clin-amber/20 rounded-lg px-5 py-3 flex items-start gap-3">
          <AlertTriangle size={18} className="text-clin-amber flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-clin-amber">Degraded Agent Detected</p>
            <p className="text-xs text-clin-amber mt-0.5">
              E-Agent (Emergency) is running below confidence threshold (0.78). Escalation to manual review recommended.
            </p>
          </div>
        </div>
      )}

      {/* Recent AI activity */}
      <div className="bg-white rounded-lg shadow-card">
        <div className="px-5 py-4 border-b border-[#CBD5E1] flex items-center gap-2">
          <Activity size={16} className="text-ai-purple" />
          <h2 className="font-bold text-text-pri text-sm">Recent AI Activity</h2>
          <TrendingUp size={14} className="text-clin-green ml-auto" />
          <span className="text-xs text-clin-green font-medium">834 queries today</span>
        </div>
        <div className="divide-y divide-[#F1F5F9]">
          {recentActivity.map((a, i) => (
            <div key={i} className="flex items-center gap-3 px-5 py-3.5">
              <span className="text-xs font-bold px-2 py-1 bg-ai-purple-bg text-ai-purple rounded font-mono">
                {a.agent}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-text-pri truncate">{a.action}</p>
              </div>
              <span className={`text-xs font-bold ${a.confidence >= 0.9 ? 'text-clin-green' : 'text-clin-amber'}`}>
                {(a.confidence * 100).toFixed(0)}%
              </span>
              <Badge variant="blue" className="hidden md:inline-flex">{a.channel}</Badge>
              <span className="text-[10px] text-text-sec whitespace-nowrap hidden lg:block">
                {formatDateTime(a.time)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

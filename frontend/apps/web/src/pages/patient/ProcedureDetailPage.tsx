import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, AlertTriangle, Lock } from 'lucide-react'
import { Badge, RiskDot } from '@/components/ui/Badge'

const mockProcedure = {
  id: '1',
  title: 'Haemorrhage Control Protocol',
  dept: 'Emergency',
  category: 'Emergency Protocols',
  risk: 'critical' as const,
  version: 'v3.2',
  updated: '2026-06-16',
  steps: [
    { num: 1, text: 'Immediately call for emergency assistance. Alert senior physician on duty.', gate: null },
    { num: 2, text: 'Apply direct pressure to the wound site using sterile dressings.', gate: null },
    { num: 3, text: 'Assess patient\'s airway, breathing, and circulation (ABCs).', gate: null },
    { num: 4, text: 'Establish IV access — 2 large-bore peripheral IVs.', gate: 'Approval required: Senior Nurse or Physician' },
    { num: 5, text: 'Administer 0.9% NaCl 500mL IV bolus, reassess after each 250mL.', gate: 'Approval required: Physician' },
    { num: 6, text: 'Order emergency blood cross-match and full blood count.', gate: null },
  ],
  escalation: {
    trigger: 'Bleeding not controlled after 10 minutes or haemodynamic instability',
    action: 'Activate massive transfusion protocol — contact Blood Bank immediately.',
  },
}

const riskBadge: Record<string, 'red' | 'amber' | 'green'> = {
  critical: 'red', high: 'amber', medium: 'green',
}

export default function ProcedureDetailPage() {
  const { id } = useParams()
  const proc = mockProcedure

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Link to="/patient/browse" className="text-text-sec hover:text-text-pri transition-colors">
          <ArrowLeft size={18} />
        </Link>
        <p className="text-xs text-text-sec">Procedure #{id}</p>
      </div>

      {/* Header */}
      <div className="bg-white rounded-lg shadow-card p-5">
        <div className="flex items-start gap-3">
          <RiskDot level={proc.risk} />
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-text-pri leading-tight">{proc.title}</h1>
            <p className="text-xs text-text-sec mt-1">{proc.dept} · {proc.category}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 mt-3">
          <Badge variant={riskBadge[proc.risk]}>
            {proc.risk === 'critical' ? 'Critical Risk' : proc.risk === 'high' ? 'High Risk' : 'Standard Risk'}
          </Badge>
          <Badge variant="blue">{proc.version}</Badge>
          <Badge variant="published">Published</Badge>
        </div>
      </div>

      {/* AI disclaimer */}
      <div className="bg-ai-purple-bg border-l-4 border-ai-purple rounded-r-lg px-4 py-2.5">
        <p className="text-xs text-ai-purple italic">
          AI-HPS procedural guidance · Always verify with a senior clinician before clinical use
        </p>
      </div>

      {/* Steps */}
      <div className="space-y-3">
        <p className="text-xs font-bold text-text-sec uppercase tracking-wide">Procedure Steps</p>
        {proc.steps.map((step) => (
          <div key={step.num} className="bg-white rounded-lg shadow-card p-4">
            <div className="flex gap-3">
              <div className="w-7 h-7 rounded-full bg-hgd-orange text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                {step.num}
              </div>
              <div className="flex-1">
                <p className="text-sm text-text-pri leading-relaxed">{step.text}</p>
                {step.gate && (
                  <div className="mt-2 bg-hgd-orange3 border border-hgd-orange/20 rounded px-3 py-1.5 flex items-center gap-2">
                    <Lock size={12} className="text-hgd-orange flex-shrink-0" />
                    <p className="text-xs text-hgd-orange font-semibold">{step.gate}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Escalation */}
      <div className="bg-clin-red-bg border-l-4 border-clin-red rounded-r-lg p-4">
        <div className="flex items-start gap-2">
          <AlertTriangle size={16} className="text-clin-red flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-clin-red">Escalation Trigger</p>
            <p className="text-xs text-clin-red mt-1 leading-relaxed">{proc.escalation.trigger}</p>
            <p className="text-xs text-clin-red font-semibold mt-2">{proc.escalation.action}</p>
          </div>
        </div>
      </div>

      <div className="h-4" />
    </div>
  )
}

import { CheckCircle, XCircle, Clock } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import { formatDateTime } from '@/lib/utils'

const approvals = [
  {
    id: '1',
    title: 'ICU Ventilator Weaning Protocol',
    submittedBy: 'Dr. Ayuk Emmanuel',
    submittedAt: '2026-06-16T07:15:00Z',
    dept: 'ICU',
    version: 'v1.0',
    chain: [
      { name: 'Dr. Ayuk Emmanuel', role: 'Dept. Head (ICU)',   status: 'approved', time: '2026-06-16T07:30:00Z' },
      { name: 'Prof. Ngo Mireille',role: 'Chief Medical Officer', status: 'pending', time: null },
    ],
  },
  {
    id: '2',
    title: 'Blood Transfusion SOP v4',
    submittedBy: 'Sr. Kamga Ruth',
    submittedAt: '2026-06-15T14:10:00Z',
    dept: 'Blood Bank',
    version: 'v4.0',
    chain: [
      { name: 'Dr. Fru Richard', role: 'Dept. Head (Blood Bank)', status: 'approved', time: '2026-06-15T15:00:00Z' },
      { name: 'Prof. Ngo Mireille', role: 'Chief Medical Officer', status: 'waiting',  time: null },
    ],
  },
  {
    id: '3',
    title: 'Pharmacy Dispensing Protocol Update',
    submittedBy: 'Pharm. Tabe Louis',
    submittedAt: '2026-06-14T09:45:00Z',
    dept: 'Pharmacy',
    version: 'v2.1',
    chain: [
      { name: 'Dr. Bih Clara', role: 'Dept. Head (Pharmacy)', status: 'pending', time: null },
    ],
  },
]

const stepStatus = {
  approved: { color: 'text-clin-green', icon: CheckCircle, label: 'Approved' },
  pending:  { color: 'text-clin-amber', icon: Clock,       label: 'Pending'  },
  waiting:  { color: 'text-text-sec',   icon: Clock,       label: 'Waiting'  },
  rejected: { color: 'text-clin-red',   icon: XCircle,     label: 'Rejected' },
}

export default function ApprovalsPage() {
  return (
    <div className="space-y-5 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-text-pri">Approval Queue</h1>
        <p className="text-sm text-text-sec mt-0.5">
          {approvals.length} procedure{approvals.length !== 1 ? 's' : ''} awaiting approval
        </p>
      </div>

      <div className="space-y-4">
        {approvals.map((a) => (
          <div key={a.id} className="bg-white rounded-lg shadow-card overflow-hidden">
            {/* Header */}
            <div className="px-5 py-4 border-b border-[#F1F5F9] flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-bold text-text-pri">{a.title}</h3>
                  <Badge variant="orange">{a.version}</Badge>
                </div>
                <p className="text-xs text-text-sec mt-1">
                  {a.dept} · Submitted by {a.submittedBy} · {formatDateTime(a.submittedAt)}
                </p>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <Button variant="outline" size="sm" icon={<XCircle size={13} />}>
                  Reject
                </Button>
                <Button variant="primary" size="sm" icon={<CheckCircle size={13} />}>
                  Approve
                </Button>
              </div>
            </div>

            {/* Approval chain */}
            <div className="px-5 py-3">
              <p className="text-[10px] font-bold text-text-sec uppercase tracking-wide mb-2">Approval Chain</p>
              <div className="space-y-2">
                {a.chain.map((step, i) => {
                  const { color, icon: Icon, label } = stepStatus[step.status as keyof typeof stepStatus]
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-xs text-text-sec w-4">{i + 1}.</span>
                      <Avatar name={step.name} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-text-pri">{step.name}</p>
                        <p className="text-[10px] text-text-sec">{step.role}</p>
                      </div>
                      <span className={`flex items-center gap-1 text-xs font-bold ${color}`}>
                        <Icon size={13} />
                        {label}
                      </span>
                      {step.time && (
                        <span className="text-[10px] text-text-sec hidden md:block">{formatDateTime(step.time)}</span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

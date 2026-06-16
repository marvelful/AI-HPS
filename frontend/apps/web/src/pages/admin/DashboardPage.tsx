import { KPICard } from '@/components/ui/Card'
import { Badge, RiskDot } from '@/components/ui/Badge'
import { formatDateTime } from '@/lib/utils'

const kpis = [
  { title: 'Active Procedures',    value: 247,  accent: 'blue'   as const },
  { title: 'Pending Approvals',    value: 12,   accent: 'orange' as const, trend: 'Needs action', trendUp: false },
  { title: 'AI Queries Today',     value: 834,  accent: 'purple' as const, trend: '↑ 12% vs yesterday', trendUp: true },
  { title: 'Critical Alerts',      value: 3,    accent: 'red'    as const },
  { title: 'Published This Week',  value: 18,   accent: 'green'  as const, trend: '+3 this week',  trendUp: true },
  { title: 'Departments',          value: 8,    accent: 'blue'   as const },
]

const recentProcedures = [
  { id: '1', title: 'Haemorrhage Control Protocol',    dept: 'Emergency', risk: 'critical' as const, updated: '2026-06-16T07:00:00Z', status: 'published' as const },
  { id: '2', title: 'ICU Sepsis Management Protocol', dept: 'ICU',       risk: 'high'     as const, updated: '2026-06-16T08:32:00Z', status: 'published' as const },
  { id: '3', title: 'Blood Transfusion SOP v4',       dept: 'Blood Bank',risk: 'high'     as const, updated: '2026-06-15T14:10:00Z', status: 'pending'   as const },
  { id: '4', title: 'ICU Ventilator Weaning Protocol',dept: 'ICU',       risk: 'high'     as const, updated: '2026-06-14T09:45:00Z', status: 'draft'     as const },
]

const recentActivity = [
  { type: 'AI Query',          user: 'Staff A',  time: '2026-06-16T09:44:00Z', color: 'bg-ai-purple-bg text-ai-purple' },
  { type: 'Procedure Updated', user: 'Dr. Ayuk', time: '2026-06-16T08:32:00Z', color: 'bg-hgd-blue3 text-hgd-blue'   },
  { type: 'Approval Requested',user: 'Sr. Ngo',  time: '2026-06-16T07:15:00Z', color: 'bg-hgd-orange3 text-hgd-orange'},
  { type: 'Emergency Query',   user: 'System',   time: '2026-06-16T06:50:00Z', color: 'bg-clin-red-bg text-clin-red'  },
]

const statusVariant: Record<string, 'draft' | 'pending' | 'published' | 'archived'> = {
  draft: 'draft', pending: 'pending', published: 'published', archived: 'archived',
}

export default function DashboardPage() {
  return (
    <div className="space-y-6 max-w-7xl">
      <div>
        <h1 className="text-2xl font-bold text-text-pri">Dashboard</h1>
        <p className="text-sm text-text-sec mt-0.5">AI-HPS · Hôpital Général de Douala — operational overview</p>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {kpis.map((kpi) => (
          <KPICard key={kpi.title} {...kpi} />
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Procedures */}
        <div className="bg-white rounded-lg shadow-card">
          <div className="px-5 py-4 border-b border-[#CBD5E1] flex items-center justify-between">
            <h2 className="font-bold text-text-pri text-sm">Recent Procedures</h2>
            <a href="/admin/procedures" className="text-xs text-hgd-blue hover:underline font-medium">View all</a>
          </div>
          <div className="divide-y divide-[#F1F5F9]">
            {recentProcedures.map((p) => (
              <div key={p.id} className="flex items-center gap-3 px-5 py-3.5">
                <RiskDot level={p.risk} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-text-pri truncate">{p.title}</p>
                  <p className="text-xs text-text-sec mt-0.5">{p.dept} · {formatDateTime(p.updated)}</p>
                </div>
                <Badge variant={statusVariant[p.status]}>{p.status}</Badge>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-lg shadow-card">
          <div className="px-5 py-4 border-b border-[#CBD5E1]">
            <h2 className="font-bold text-text-pri text-sm">Recent Activity</h2>
          </div>
          <div className="divide-y divide-[#F1F5F9]">
            {recentActivity.map((a, i) => (
              <div key={i} className="flex items-center gap-3 px-5 py-3.5">
                <span className={`text-xs font-bold px-2 py-1 rounded ${a.color}`}>{a.type}</span>
                <div className="flex-1">
                  <p className="text-xs text-text-sec">{a.user}</p>
                </div>
                <p className="text-xs text-text-sec">{formatDateTime(a.time)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* AI System Status */}
      <div className="bg-white rounded-lg shadow-card">
        <div className="px-5 py-4 border-b border-[#CBD5E1]">
          <h2 className="font-bold text-text-pri text-sm">AI System Status</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-0 divide-x divide-y md:divide-y-0 divide-[#F1F5F9]">
          {['R-Agent', 'C-Agent', 'N-Agent', 'P-Agent', 'E-Agent', 'O-Agent'].map((agent) => (
            <div key={agent} className="px-4 py-4 text-center">
              <p className="text-xs font-bold text-text-pri">{agent}</p>
              <span className="inline-flex items-center gap-1 mt-1.5 text-[10px] font-bold text-clin-green">
                <span className="w-1.5 h-1.5 rounded-full bg-clin-green inline-block" />
                Active
              </span>
              <p className="text-xs text-text-sec mt-0.5">0.94 confidence</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

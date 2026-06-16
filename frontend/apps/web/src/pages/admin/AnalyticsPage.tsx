import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { BarChart2, TrendingUp, AlertTriangle } from 'lucide-react'

const topProcedures = [
  { title: 'Haemorrhage Control Protocol',  dept: 'Emergency', queries: 234, trend: '+18%' },
  { title: 'ICU Sepsis Management',          dept: 'ICU',       queries: 187, trend: '+9%'  },
  { title: 'Blood Transfusion SOP',          dept: 'Blood Bank',queries: 142, trend: '+24%' },
  { title: 'Malaria Treatment Guideline',    dept: 'General',   queries: 98,  trend: '-3%'  },
  { title: 'Post-op Pain Management',        dept: 'Surgery',   queries: 76,  trend: '+11%' },
]

const contentGaps = [
  { query: 'Neonatal jaundice phototherapy',   count: 47, dept: 'Maternity'  },
  { query: 'Diabetic ketoacidosis management', count: 31, dept: 'ICU'        },
  { query: 'Post-caesarean wound care',        count: 28, dept: 'Maternity'  },
  { query: 'Paediatric fever protocol',        count: 22, dept: 'Paediatrics'},
]

const weeklyData = [
  { day: 'Mon', queries: 112, procedures: 4  },
  { day: 'Tue', queries: 145, procedures: 6  },
  { day: 'Wed', queries: 98,  procedures: 2  },
  { day: 'Thu', queries: 187, procedures: 8  },
  { day: 'Fri', queries: 156, procedures: 5  },
  { day: 'Sat', queries: 67,  procedures: 1  },
  { day: 'Sun', queries: 69,  procedures: 0  },
]
const maxQ = Math.max(...weeklyData.map((d) => d.queries))

export default function AnalyticsPage() {
  return (
    <div className="space-y-6 max-w-7xl">
      <div>
        <h1 className="text-2xl font-bold text-text-pri">Analytics</h1>
        <p className="text-sm text-text-sec mt-0.5">AI query volume, procedure usage, and content gaps</p>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Queries (7d)', value: '834', icon: BarChart2, color: 'text-ai-purple', bg: 'bg-ai-purple-bg' },
          { label: 'Avg Confidence',     value: '0.94', icon: TrendingUp, color: 'text-clin-green', bg: 'bg-clin-green-bg' },
          { label: 'Content Gaps',       value: '12', icon: AlertTriangle, color: 'text-clin-amber', bg: 'bg-clin-amber-bg' },
          { label: 'Departments Active', value: '8', icon: BarChart2, color: 'text-hgd-blue', bg: 'bg-hgd-blue3' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <Card key={label} padding="md">
            <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center mb-3`}>
              <Icon size={17} className={color} />
            </div>
            <p className="text-xs text-text-sec font-medium">{label}</p>
            <p className="text-2xl font-bold text-text-pri mt-0.5">{value}</p>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Query Volume Chart (bar chart) */}
        <Card padding="md">
          <h2 className="font-bold text-text-pri text-sm mb-4">AI Query Volume — Last 7 Days</h2>
          <div className="flex items-end gap-2 h-32">
            {weeklyData.map((d) => (
              <div key={d.day} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[10px] text-text-sec">{d.queries}</span>
                <div
                  className="w-full rounded-t bg-ai-purple opacity-80 hover:opacity-100 transition-opacity"
                  style={{ height: `${(d.queries / maxQ) * 100}%` }}
                  title={`${d.queries} queries`}
                />
                <span className="text-[10px] text-text-sec">{d.day}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Top Procedures */}
        <Card padding="md">
          <h2 className="font-bold text-text-pri text-sm mb-3">Top Queried Procedures</h2>
          <div className="space-y-2">
            {topProcedures.map((p, i) => (
              <div key={p.title} className="flex items-center gap-3">
                <span className="text-xs font-bold text-text-sec w-4">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-text-pri truncate">{p.title}</p>
                  <p className="text-[10px] text-text-sec">{p.dept}</p>
                </div>
                <span className="text-sm font-bold text-text-pri">{p.queries}</span>
                <span className={`text-[10px] font-bold ${p.trend.startsWith('+') ? 'text-clin-green' : 'text-clin-red'}`}>
                  {p.trend}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Content Gaps */}
      <Card padding="md">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle size={16} className="text-clin-amber" />
          <h2 className="font-bold text-text-pri text-sm">Content Gaps — Unanswered Queries</h2>
          <Badge variant="amber">{contentGaps.length} gaps identified</Badge>
        </div>
        <div className="divide-y divide-[#F1F5F9]">
          {contentGaps.map((g) => (
            <div key={g.query} className="flex items-center gap-4 py-3">
              <div className="flex-1">
                <p className="text-sm font-medium text-text-pri italic">"{g.query}"</p>
                <p className="text-xs text-text-sec mt-0.5">{g.dept}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-clin-amber">{g.count}</p>
                <p className="text-[10px] text-text-sec">queries</p>
              </div>
              <button className="text-xs text-hgd-blue hover:underline font-medium">
                Create procedure
              </button>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

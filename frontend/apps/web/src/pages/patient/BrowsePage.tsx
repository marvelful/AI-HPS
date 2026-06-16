import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { Badge, RiskDot } from '@/components/ui/Badge'

const departments = ['All', 'Emergency', 'ICU', 'Blood Bank', 'Surgery', 'Maternity', 'General', 'Pharmacy']

const categories = [
  { id: '1', title: 'Emergency Protocols',    dept: 'Emergency', count: 14, risk: 'critical' as const, badge: 'Critical' },
  { id: '2', title: 'Critical Care',          dept: 'ICU',       count: 9,  risk: 'high'     as const, badge: 'High Risk' },
  { id: '3', title: 'Transfusion Medicine',   dept: 'Blood Bank',count: 6,  risk: 'high'     as const, badge: 'High Risk' },
  { id: '4', title: 'Surgical Protocols',     dept: 'Surgery',   count: 11, risk: 'medium'   as const, badge: null },
  { id: '5', title: 'Obstetrics',             dept: 'Maternity', count: 8,  risk: 'critical' as const, badge: 'Critical' },
  { id: '6', title: 'Infectious Disease',     dept: 'General',   count: 15, risk: 'medium'   as const, badge: null },
  { id: '7', title: 'Pharmacy Dispensing',    dept: 'Pharmacy',  count: 7,  risk: 'medium'   as const, badge: null },
  { id: '8', title: 'Infection Control',      dept: 'Surgery',   count: 5,  risk: 'medium'   as const, badge: null },
]

const riskBadge: Record<string, 'red' | 'amber' | 'green'> = {
  critical: 'red', high: 'amber', medium: 'green',
}

export default function BrowsePage() {
  const [searchParams] = useSearchParams()
  const [activeDept, setActiveDept] = useState(searchParams.get('dept') ?? 'All')

  const filtered = categories.filter(
    (c) => activeDept === 'All' || c.dept === activeDept,
  )

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold text-text-pri">Procedure Library</h1>

      {/* Dept chips */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {departments.map((d) => (
          <button
            key={d}
            onClick={() => setActiveDept(d)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
              activeDept === d
                ? 'bg-hgd-blue text-white border-hgd-blue'
                : 'bg-hgd-blue3 text-hgd-blue border-hgd-blue/30 hover:bg-hgd-blue hover:text-white'
            }`}
          >
            {d}
          </button>
        ))}
      </div>

      {/* Categories */}
      <div className="space-y-2">
        {filtered.map((cat) => (
          <Link
            key={cat.id}
            to={`/patient/search?category=${encodeURIComponent(cat.title)}`}
            className="flex items-center gap-3 bg-white rounded-lg shadow-card px-4 py-3.5 hover:bg-surf-screen transition-colors"
          >
            <div className="w-9 h-9 rounded-lg bg-hgd-blue3 flex items-center justify-center flex-shrink-0">
              <RiskDot level={cat.risk} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-text-pri">{cat.title}</p>
              <p className="text-xs text-text-sec mt-0.5">{cat.count} procedures · {cat.dept}</p>
            </div>
            {cat.badge && (
              <Badge variant={riskBadge[cat.risk]}>{cat.badge}</Badge>
            )}
            <ChevronRight size={14} className="text-text-sec flex-shrink-0" />
          </Link>
        ))}
      </div>
    </div>
  )
}

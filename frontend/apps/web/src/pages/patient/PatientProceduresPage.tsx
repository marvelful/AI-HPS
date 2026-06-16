import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Search, ChevronRight, Clock, ListChecks } from 'lucide-react'

const ALL_PROCEDURES = [
  { id: '1', title: 'Adult Suspected Stroke — Door to CT under 25 min', dept: 'Emergency',  steps: 3, duration: '10 min', priority: 'critical' as const, status: 'published' as const },
  { id: '2', title: 'Paediatric Fever Management (< 5 years)',           dept: 'Pediatrics', steps: 4, duration: '12 min', priority: 'high'     as const, status: 'published' as const },
  { id: '3', title: 'Pre-eclampsia Management Protocol',                  dept: 'Maternity',  steps: 4, duration: '18 min', priority: 'high'     as const, status: 'published' as const },
  { id: '4', title: 'Post-operative Wound Care — General Surgery',        dept: 'Surgery',    steps: 5, duration: '20 min', priority: 'moderate' as const, status: 'review'    as const },
  { id: '5', title: 'Malaria RDT & Treatment Guideline',                  dept: 'General',    steps: 3, duration: '15 min', priority: 'moderate' as const, status: 'published' as const },
  { id: '6', title: 'Blood Transfusion Safety Checklist',                 dept: 'Laboratory', steps: 6, duration: '24 min', priority: 'high'     as const, status: 'published' as const },
]

const DEPTS = ['All', 'Emergency', 'Pediatrics', 'Maternity', 'Surgery', 'General', 'Laboratory']

const priorityStyle: Record<string, string> = {
  critical: 'bg-red-50 text-red-600 border-red-200',
  high:     'bg-orange-50 text-orange-600 border-orange-200',
  moderate: 'bg-amber-50 text-amber-700 border-amber-200',
  low:      'bg-green-50 text-green-700 border-green-200',
}

const statusStyle: Record<string, string> = {
  published: 'bg-green-50 text-green-700 border-green-200',
  review:    'bg-amber-50 text-amber-700 border-amber-200',
  draft:     'bg-slate-100 text-slate-500 border-slate-200',
}

export default function PatientProceduresPage() {
  const [searchParams] = useSearchParams()
  const [query, setQuery] = useState('')
  const [activeDept, setActiveDept] = useState(searchParams.get('dept') ?? 'All')

  const filtered = ALL_PROCEDURES.filter((p) => {
    const matchDept = activeDept === 'All' || p.dept === activeDept
    const matchQuery = !query || p.title.toLowerCase().includes(query.toLowerCase()) || p.dept.toLowerCase().includes(query.toLowerCase())
    return matchDept && matchQuery
  })

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <div
        className="px-5 pt-12 pb-5 text-white flex-shrink-0"
        style={{ background: 'linear-gradient(135deg, #004A8F 0%, #0062B8 60%, #E8620A 100%)' }}
      >
        <p className="text-xl font-bold tracking-tight mb-4">Procedures</p>
        {/* Search */}
        <div className="flex items-center gap-2 bg-white/15 border border-white/25 rounded-2xl px-4 py-2.5 backdrop-blur-sm">
          <Search size={15} className="text-white/70 flex-shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search HGD protocols..."
            className="flex-1 bg-transparent text-sm text-white placeholder:text-white/60 outline-none"
          />
        </div>
      </div>

      {/* Department filters */}
      <div className="px-4 py-3 bg-white border-b border-slate-100 flex-shrink-0">
        <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-0.5">
          {DEPTS.map((d) => (
            <button
              key={d}
              onClick={() => setActiveDept(d)}
              className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                activeDept === d
                  ? 'bg-hgd-blue text-white'
                  : 'bg-slate-100 text-slate-500 hover:bg-hgd-blue3 hover:text-hgd-blue'
              }`}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 px-4 py-4 space-y-3 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-text-sec">
            <Search size={32} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">No procedures found</p>
          </div>
        ) : (
          filtered.map((p) => (
            <Link
              key={p.id}
              to={`/patient/procedure/${p.id}`}
              className="flex items-start gap-3 bg-white rounded-2xl shadow-sm border border-slate-100 px-4 py-4 hover:bg-surf-screen transition-colors"
            >
              <div className="w-10 h-10 rounded-xl bg-hgd-blue3 flex items-center justify-center flex-shrink-0">
                <ListChecks size={18} className="text-hgd-blue" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-text-pri leading-snug">{p.title}</p>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-[10px] text-text-sec">{p.dept}</span>
                  <span className="text-[10px] text-slate-300">·</span>
                  <span className="flex items-center gap-0.5 text-[10px] text-text-sec">
                    <ListChecks size={9} /> {p.steps} steps
                  </span>
                  <span className="text-[10px] text-slate-300">·</span>
                  <span className="flex items-center gap-0.5 text-[10px] text-text-sec">
                    <Clock size={9} /> {p.duration}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full border ${priorityStyle[p.priority]}`}>
                    {p.priority}
                  </span>
                  <span className={`text-[9px] font-semibold capitalize px-2 py-0.5 rounded-full border ${statusStyle[p.status]}`}>
                    {p.status}
                  </span>
                </div>
              </div>
              <ChevronRight size={16} className="text-slate-300 mt-1 flex-shrink-0" />
            </Link>
          ))
        )}
      </div>
    </div>
  )
}

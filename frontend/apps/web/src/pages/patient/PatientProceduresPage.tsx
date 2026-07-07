import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Search, ChevronRight, ListChecks, AlertTriangle, Loader2, FileText } from 'lucide-react'
import { proceduresApi, type Procedure, type Department } from '@/lib/api'
import { useAuthStore } from '@/stores/auth.store'

const riskStyle: Record<string, string> = {
  critical: 'bg-red-50 text-red-600 border-red-200',
  high:     'bg-orange-50 text-orange-600 border-orange-200',
  medium:   'bg-amber-50 text-amber-700 border-amber-200',
  low:      'bg-green-50 text-green-700 border-green-200',
}

function isPatientVisible(p: Procedure, userRole?: string): boolean {
  // Exclude staff-only (stream B) procedures
  if (p.stream_target === 'B') return false
  // If applicable_roles is set, patient must be listed (or role is 'patient')
  if (p.applicable_roles.length > 0) {
    const role = userRole ?? 'patient'
    return p.applicable_roles.includes(role) || p.applicable_roles.includes('patient')
  }
  return true
}

export default function PatientProceduresPage() {
  const [searchParams] = useSearchParams()
  const { user } = useAuthStore()

  const [procedures, setProcedures] = useState<Procedure[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [activeDept, setActiveDept] = useState(searchParams.get('dept') ?? 'All')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    Promise.all([
      proceduresApi.list({ status: 'published', limit: 200 }),
      proceduresApi.listDepartments(),
    ])
      .then(([procList, depts]) => {
        if (cancelled) return
        const visible = procList.items.filter((p) => isPatientVisible(p, user?.role))
        setProcedures(visible)
        setDepartments(depts)
      })
      .catch((err) => {
        if (cancelled) return
        setError(
          err?.response?.status === 401
            ? 'Please log in to view procedures.'
            : 'Could not load procedures. Make sure the backend is running.',
        )
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [user?.role])

  // Build dept name lookup from fetched departments
  const deptMap = Object.fromEntries(departments.map((d) => [d.id, d.name]))

  // Derive unique dept names from visible procedures (fallback if dept fetch failed)
  const deptNames = ['All', ...Array.from(
    new Set(
      procedures
        .map((p) => (p.department_id ? deptMap[p.department_id] : null))
        .filter(Boolean) as string[]
    )
  ).sort()]

  const filtered = procedures.filter((p) => {
    const deptName = p.department_id ? deptMap[p.department_id] : ''
    const matchDept = activeDept === 'All' || deptName === activeDept
    const matchQuery =
      !query ||
      p.title.toLowerCase().includes(query.toLowerCase()) ||
      deptName.toLowerCase().includes(query.toLowerCase()) ||
      (p.summary ?? '').toLowerCase().includes(query.toLowerCase())
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
          {deptNames.map((d) => (
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
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-text-sec gap-3">
            <Loader2 size={28} className="animate-spin opacity-40" />
            <p className="text-sm">Loading procedures…</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 px-6 text-center">
            <AlertTriangle size={28} className="text-red-400" />
            <p className="text-sm text-red-600 font-medium">{error}</p>
            <p className="text-xs text-text-sec">
              You can still ask the AI assistant questions about procedures.
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-text-sec">
            <Search size={32} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">
              {procedures.length === 0
                ? 'No published procedures available yet.'
                : 'No procedures match your search.'}
            </p>
          </div>
        ) : (
          filtered.map((p) => {
            const deptName = p.department_id ? deptMap[p.department_id] : 'General'
            const stepCount = p.steps?.length ?? 0
            const assistantLink = `/patient/assistant?q=${encodeURIComponent(p.title)}`
            return (
              <div
                key={p.id}
                className="flex items-start gap-3 bg-white rounded-2xl shadow-sm border border-slate-100 px-4 py-4"
              >
                <div className="w-10 h-10 rounded-xl bg-hgd-blue3 flex items-center justify-center flex-shrink-0">
                  <ListChecks size={18} className="text-hgd-blue" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-text-pri leading-snug">{p.title}</p>
                  {p.summary && (
                    <p className="text-xs text-text-sec mt-0.5 line-clamp-1">{p.summary}</p>
                  )}
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-[10px] text-text-sec">{deptName}</span>
                    {stepCount > 0 && (
                      <>
                        <span className="text-[10px] text-slate-300">·</span>
                        <span className="flex items-center gap-0.5 text-[10px] text-text-sec">
                          <ListChecks size={9} /> {stepCount} step{stepCount !== 1 ? 's' : ''}
                        </span>
                      </>
                    )}
                    <span className="text-[10px] text-slate-300">·</span>
                    <span className="text-[10px] text-text-sec uppercase font-medium">{p.language}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <span
                      className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full border ${riskStyle[p.risk_level] ?? riskStyle.low}`}
                    >
                      {p.risk_level}
                    </span>
                    <span className="text-[9px] font-semibold capitalize px-2 py-0.5 rounded-full border bg-green-50 text-green-700 border-green-200">
                      published
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    <Link
                      to={assistantLink}
                      className="flex items-center gap-1 text-[11px] font-semibold text-hgd-blue hover:underline"
                    >
                      Ask AI <ChevronRight size={11} />
                    </Link>
                    {p.document_url && (
                      <>
                        <span className="text-slate-200">·</span>
                        <a
                          href={p.document_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center gap-1 text-[11px] font-semibold text-orange-600 hover:underline"
                        >
                          <FileText size={11} /> View PDF
                        </a>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {!loading && !error && filtered.length > 0 && (
        <div className="px-4 py-2 bg-white border-t border-slate-100 flex-shrink-0">
          <p className="text-[10px] text-text-sec text-center">
            {filtered.length} of {procedures.length} procedure{procedures.length !== 1 ? 's' : ''} · View PDF or Ask AI
          </p>
        </div>
      )}
    </div>
  )
}

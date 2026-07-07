import { useState, useEffect } from 'react'
import { Plus, Search, Filter, Loader2, AlertTriangle, RefreshCw, FileText } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge, RiskDot } from '@/components/ui/Badge'
import { formatDate } from '@/lib/utils'
import { Link } from 'react-router-dom'
import { proceduresApi, pipelineApi, type Procedure, type Department } from '@/lib/api'

const riskLabel: Record<string, string> = {
  critical: 'Critical', high: 'High', medium: 'Medium', low: 'Low',
}
const riskVariant: Record<string, 'red' | 'amber' | 'green' | 'gray'> = {
  critical: 'red', high: 'amber', medium: 'green', low: 'gray',
}
const statusVariant: Record<string, 'draft' | 'pending' | 'published' | 'archived'> = {
  draft: 'draft', pending: 'pending', published: 'published', archived: 'archived',
}

export default function ProceduresPage() {
  const [procedures, setProcedures] = useState<Procedure[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rebuilding, setRebuilding] = useState(false)
  const [rebuildMsg, setRebuildMsg] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [deptFilter, setDeptFilter] = useState('All')
  const [statusFilter, setStatusFilter] = useState('All')

  const fetchData = () => {
    setLoading(true)
    setError(null)
    Promise.all([
      proceduresApi.list({ limit: 200 }),
      proceduresApi.listDepartments(false),
    ])
      .then(([procList, depts]) => {
        setProcedures(procList.items)
        setDepartments(depts)
      })
      .catch((err) => {
        setError(
          err?.response?.status === 401
            ? 'Session expired. Please log in again.'
            : 'Could not load procedures. Make sure SVC-03 (port 8003) is running.',
        )
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchData() }, [])

  const deptMap = Object.fromEntries(departments.map((d) => [d.id, d.name]))
  const deptNames = ['All', ...departments.map((d) => d.name).sort()]
  const statuses = ['All', 'draft', 'pending', 'published', 'archived']

  const filtered = procedures.filter((p) => {
    const deptName = p.department_id ? deptMap[p.department_id] : ''
    const matchSearch = !search || p.title.toLowerCase().includes(search.toLowerCase())
    const matchDept = deptFilter === 'All' || deptName === deptFilter
    const matchStatus = statusFilter === 'All' || p.status === statusFilter
    return matchSearch && matchDept && matchStatus
  })

  const handleRebuildKb = async () => {
    setRebuilding(true)
    setRebuildMsg(null)
    try {
      const result = await pipelineApi.rebuildKb()
      setRebuildMsg(
        result.ok
          ? `KB rebuilt: ${result.chunks_indexed ?? result.chunks ?? 0} chunks indexed from ${result.unique_procedures ?? '?'} procedures.`
          : `Rebuild failed: ${result.error}`,
      )
    } catch {
      setRebuildMsg('Rebuild request failed — is the agent service (port 8020) running?')
    } finally {
      setRebuilding(false)
    }
  }

  return (
    <div className="space-y-5 max-w-7xl">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-text-pri">Procedures</h1>
          <p className="text-sm text-text-sec mt-0.5">
            Knowledge base · {procedures.length} total · {procedures.filter((p) => p.status === 'published').length} published
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            icon={rebuilding ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            size="sm"
            onClick={handleRebuildKb}
            disabled={rebuilding}
          >
            {rebuilding ? 'Rebuilding AI index…' : 'Rebuild AI index'}
          </Button>
          <Button variant="action" icon={<Plus size={15} />}>
            New Procedure
          </Button>
        </div>
      </div>

      {rebuildMsg && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2.5 text-sm text-blue-800 flex items-center gap-2">
          <RefreshCw size={13} className="flex-shrink-0" />
          {rebuildMsg}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-card p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-sec" />
          <input
            type="text"
            placeholder="Search procedures..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-2 text-sm border border-[#CBD5E1] rounded focus:outline-none focus:ring-2 focus:ring-hgd-blue bg-surf-alt"
          />
        </div>
        <select
          value={deptFilter}
          onChange={(e) => setDeptFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-[#CBD5E1] rounded focus:outline-none focus:ring-2 focus:ring-hgd-blue bg-white min-w-36"
        >
          {deptNames.map((d) => <option key={d}>{d}</option>)}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-[#CBD5E1] rounded focus:outline-none focus:ring-2 focus:ring-hgd-blue bg-white min-w-32"
        >
          {statuses.map((s) => <option key={s} value={s}>{s === 'All' ? 'All statuses' : s}</option>)}
        </select>
        <Button variant="ghost" icon={<Filter size={14} />} size="sm">More filters</Button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20 gap-3 text-text-sec">
            <Loader2 size={22} className="animate-spin opacity-40" />
            <span className="text-sm">Loading procedures…</span>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-center px-8">
            <AlertTriangle size={28} className="text-red-400" />
            <p className="text-sm text-red-600 font-medium">{error}</p>
            <button onClick={fetchData} className="text-xs text-hgd-blue underline">Retry</button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surf-alt border-b border-[#CBD5E1]">
                  <th className="text-left px-5 py-3 text-xs font-bold text-text-sec uppercase tracking-wide">Procedure</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-text-sec uppercase tracking-wide hidden md:table-cell">Department</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-text-sec uppercase tracking-wide hidden lg:table-cell">Stream</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-text-sec uppercase tracking-wide">Risk</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-text-sec uppercase tracking-wide">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-text-sec uppercase tracking-wide hidden lg:table-cell">Version</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-text-sec uppercase tracking-wide hidden md:table-cell">Updated</th>
                  <th className="text-right px-5 py-3 text-xs font-bold text-text-sec uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-text-sec text-sm">
                      {procedures.length === 0
                        ? 'No procedures in the database yet. Create your first procedure to get started.'
                        : 'No procedures match your filters.'}
                    </td>
                  </tr>
                ) : (
                  filtered.map((p) => {
                    const deptName = p.department_id ? deptMap[p.department_id] : '—'
                    const streamLabel = p.stream_target === 'A' ? 'Patient' : p.stream_target === 'B' ? 'Staff only' : 'Both'
                    return (
                      <tr key={p.id} className="hover:bg-surf-screen transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2">
                            <RiskDot level={p.risk_level as any} />
                            <span className="font-semibold text-text-pri truncate max-w-xs">{p.title}</span>
                          </div>
                          {p.summary && (
                            <p className="text-xs text-text-sec mt-0.5 truncate max-w-xs pl-5">{p.summary}</p>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-text-sec hidden md:table-cell">{deptName}</td>
                        <td className="px-4 py-3.5 hidden lg:table-cell">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            p.stream_target === 'B'
                              ? 'bg-purple-50 text-purple-700'
                              : p.stream_target === 'A'
                                ? 'bg-blue-50 text-blue-700'
                                : 'bg-slate-100 text-slate-600'
                          }`}>
                            {streamLabel}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <Badge variant={riskVariant[p.risk_level] ?? 'gray'}>{riskLabel[p.risk_level] ?? p.risk_level}</Badge>
                        </td>
                        <td className="px-4 py-3.5">
                          <Badge variant={statusVariant[p.status] ?? 'draft'} className="capitalize">{p.status}</Badge>
                        </td>
                        <td className="px-4 py-3.5 text-text-sec text-xs font-mono hidden lg:table-cell">v{p.version}</td>
                        <td className="px-4 py-3.5 text-text-sec text-xs hidden md:table-cell">{formatDate(p.updated_at)}</td>
                        <td className="px-5 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Link
                              to={`/admin/procedures/${p.id}`}
                              className="text-xs text-hgd-blue hover:underline font-medium"
                            >
                              View
                            </Link>
                            <span className="text-[#CBD5E1]">·</span>
                            <button className="text-xs text-text-sec hover:text-text-pri font-medium">Edit</button>
                            {p.document_url && (
                              <>
                                <span className="text-[#CBD5E1]">·</span>
                                <a
                                  href={p.document_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-orange-600 hover:underline font-medium flex items-center gap-0.5"
                                  title="Open source PDF"
                                >
                                  <FileText size={11} /> PDF
                                </a>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
        {!loading && !error && (
          <div className="px-5 py-3 border-t border-[#F1F5F9] text-xs text-text-sec flex items-center justify-between">
            <span>Showing {filtered.length} of {procedures.length} procedures</span>
            <span className="text-[10px] text-slate-400">
              Stream A = patient-visible · Stream B = staff-only · Both = all users
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

import { useState } from 'react'
import { Plus, Search, Filter } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge, RiskDot } from '@/components/ui/Badge'
import { formatDate } from '@/lib/utils'
import { Link } from 'react-router-dom'

const procedures = [
  { id: '1', title: 'Haemorrhage Control Protocol',    dept: 'Emergency', category: 'Emergency Protocols', risk: 'critical' as const, status: 'published' as const, version: 'v3.2', updated: '2026-06-16' },
  { id: '2', title: 'ICU Sepsis Management Protocol', dept: 'ICU',       category: 'Critical Care',       risk: 'high'     as const, status: 'published' as const, version: 'v2.1', updated: '2026-06-16' },
  { id: '3', title: 'Blood Transfusion SOP',          dept: 'Blood Bank',category: 'Transfusion Medicine',risk: 'high'     as const, status: 'pending'   as const, version: 'v4.0', updated: '2026-06-15' },
  { id: '4', title: 'ICU Ventilator Weaning',         dept: 'ICU',       category: 'Critical Care',       risk: 'high'     as const, status: 'draft'     as const, version: 'v1.0', updated: '2026-06-14' },
  { id: '5', title: 'Neonatal Resuscitation',         dept: 'Maternity', category: 'Obstetrics',          risk: 'critical' as const, status: 'published' as const, version: 'v2.3', updated: '2026-06-12' },
  { id: '6', title: 'Surgical Site Infection Protocol',dept:'Surgery',   category: 'Infection Control',   risk: 'medium'   as const, status: 'published' as const, version: 'v1.5', updated: '2026-06-10' },
  { id: '7', title: 'Malaria Treatment Guideline',    dept: 'General',   category: 'Infectious Disease',  risk: 'medium'   as const, status: 'archived'  as const, version: 'v3.1', updated: '2026-06-01' },
]

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
  const [search, setSearch] = useState('')
  const [dept, setDept] = useState('All')

  const filtered = procedures.filter((p) => {
    const matchesSearch = p.title.toLowerCase().includes(search.toLowerCase())
    const matchesDept = dept === 'All' || p.dept === dept
    return matchesSearch && matchesDept
  })

  return (
    <div className="space-y-5 max-w-7xl">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-text-pri">Procedures</h1>
          <p className="text-sm text-text-sec mt-0.5">Manage clinical procedures and protocols</p>
        </div>
        <Button variant="action" icon={<Plus size={15} />}>
          New Procedure
        </Button>
      </div>

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
          value={dept}
          onChange={(e) => setDept(e.target.value)}
          className="px-3 py-2 text-sm border border-[#CBD5E1] rounded focus:outline-none focus:ring-2 focus:ring-hgd-blue bg-white min-w-36"
        >
          {['All', 'Emergency', 'ICU', 'Blood Bank', 'Surgery', 'Maternity', 'General'].map((d) => (
            <option key={d}>{d}</option>
          ))}
        </select>
        <Button variant="ghost" icon={<Filter size={14} />} size="sm">More filters</Button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surf-alt border-b border-[#CBD5E1]">
                <th className="text-left px-5 py-3 text-xs font-bold text-text-sec uppercase tracking-wide">Procedure</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-text-sec uppercase tracking-wide hidden md:table-cell">Department</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-text-sec uppercase tracking-wide hidden lg:table-cell">Category</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-text-sec uppercase tracking-wide">Risk</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-text-sec uppercase tracking-wide">Status</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-text-sec uppercase tracking-wide hidden lg:table-cell">Version</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-text-sec uppercase tracking-wide hidden md:table-cell">Updated</th>
                <th className="text-right px-5 py-3 text-xs font-bold text-text-sec uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9]">
              {filtered.map((p) => (
                <tr key={p.id} className="hover:bg-surf-screen transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <RiskDot level={p.risk} />
                      <span className="font-semibold text-text-pri truncate max-w-xs">{p.title}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-text-sec hidden md:table-cell">{p.dept}</td>
                  <td className="px-4 py-3.5 text-text-sec hidden lg:table-cell text-xs">{p.category}</td>
                  <td className="px-4 py-3.5">
                    <Badge variant={riskVariant[p.risk]}>{riskLabel[p.risk]}</Badge>
                  </td>
                  <td className="px-4 py-3.5">
                    <Badge variant={statusVariant[p.status]} className="capitalize">{p.status}</Badge>
                  </td>
                  <td className="px-4 py-3.5 text-text-sec text-xs font-mono hidden lg:table-cell">{p.version}</td>
                  <td className="px-4 py-3.5 text-text-sec text-xs hidden md:table-cell">{formatDate(p.updated)}</td>
                  <td className="px-5 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link to={`/admin/procedures/${p.id}`} className="text-xs text-hgd-blue hover:underline font-medium">View</Link>
                      <span className="text-[#CBD5E1]">·</span>
                      <button className="text-xs text-text-sec hover:text-text-pri font-medium">Edit</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-3 border-t border-[#F1F5F9] text-xs text-text-sec">
          Showing {filtered.length} of {procedures.length} procedures
        </div>
      </div>
    </div>
  )
}

import { useState } from 'react'
import { Shield, Search } from 'lucide-react'
import { formatDateTime } from '@/lib/utils'

const auditTypes = [
  'All', 'LOGIN', 'LOGOUT', 'PROCEDURE_VIEW', 'PROCEDURE_EDIT',
  'APPROVAL', 'USER_CREATE', 'AI_QUERY', 'EMERGENCY',
]

const logs = [
  { id: '1', type: 'AI_QUERY',        user: 'Staff A',             entity: 'Haemorrhage Protocol', time: '2026-06-16T09:44:00Z', hmac: 'a3f8...d291' },
  { id: '2', type: 'PROCEDURE_EDIT',  user: 'Dr. Ayuk Emmanuel',   entity: 'ICU Sepsis Protocol v3', time: '2026-06-16T08:32:00Z', hmac: 'b7c4...e120' },
  { id: '3', type: 'APPROVAL',        user: 'Prof. Ngo Mireille',  entity: 'Blood Transfusion SOP', time: '2026-06-16T08:01:00Z', hmac: 'c1a9...f445' },
  { id: '4', type: 'LOGIN',           user: 'Sr. Kamga Ruth',      entity: 'auth',                  time: '2026-06-16T07:55:00Z', hmac: 'd2b3...a891' },
  { id: '5', type: 'USER_CREATE',     user: 'Admin System',        entity: 'New user: Nurse Bih',   time: '2026-06-15T16:22:00Z', hmac: 'e4f1...b234' },
  { id: '6', type: 'EMERGENCY',       user: 'System',              entity: 'WhatsApp emergency query', time: '2026-06-15T14:09:00Z', hmac: 'f5a7...c891' },
  { id: '7', type: 'PROCEDURE_VIEW',  user: 'Dr. Tabi Jean',       entity: 'Neonatal Resuscitation', time: '2026-06-15T11:30:00Z', hmac: 'g6b8...d112' },
  { id: '8', type: 'LOGOUT',          user: 'Pharm. Louis Tabe',   entity: 'auth',                  time: '2026-06-15T09:10:00Z', hmac: 'h7c2...e345' },
]

const typeConfig: Record<string, { bg: string; text: string }> = {
  LOGIN:           { bg: 'bg-hgd-blue3',       text: 'text-hgd-blue'   },
  LOGOUT:          { bg: 'bg-surf-alt',         text: 'text-text-sec'   },
  PROCEDURE_VIEW:  { bg: 'bg-hgd-blue3',        text: 'text-hgd-blue'   },
  PROCEDURE_EDIT:  { bg: 'bg-hgd-orange3',      text: 'text-hgd-orange' },
  APPROVAL:        { bg: 'bg-clin-green-bg',    text: 'text-clin-green' },
  USER_CREATE:     { bg: 'bg-ai-purple-bg',     text: 'text-ai-purple'  },
  AI_QUERY:        { bg: 'bg-ai-purple-bg',     text: 'text-ai-purple'  },
  EMERGENCY:       { bg: 'bg-clin-red-bg',      text: 'text-clin-red'   },
}

export default function AuditLogPage() {
  const [typeFilter, setTypeFilter] = useState('All')
  const [search, setSearch] = useState('')

  const filtered = logs.filter((l) => {
    const matchType = typeFilter === 'All' || l.type === typeFilter
    const matchSearch = l.user.toLowerCase().includes(search.toLowerCase())
      || l.entity.toLowerCase().includes(search.toLowerCase())
    return matchType && matchSearch
  })

  return (
    <div className="space-y-5 max-w-7xl">
      <div className="flex items-center gap-3">
        <Shield size={22} className="text-hgd-blue" />
        <div>
          <h1 className="text-2xl font-bold text-text-pri">Audit Log</h1>
          <p className="text-sm text-text-sec mt-0.5">Tamper-evident, append-only audit trail — HMAC verified</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-card p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-sec" />
          <input
            type="text"
            placeholder="Search by user or entity..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-2 text-sm border border-[#CBD5E1] rounded focus:outline-none focus:ring-2 focus:ring-hgd-blue bg-surf-alt"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-[#CBD5E1] rounded focus:outline-none focus:ring-2 focus:ring-hgd-blue bg-white"
        >
          {auditTypes.map((t) => <option key={t}>{t}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surf-alt border-b border-[#CBD5E1]">
                <th className="text-left px-5 py-3 text-xs font-bold text-text-sec uppercase tracking-wide">Timestamp</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-text-sec uppercase tracking-wide">Action</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-text-sec uppercase tracking-wide">User</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-text-sec uppercase tracking-wide hidden md:table-cell">Entity</th>
                <th className="text-left px-5 py-3 text-xs font-bold text-text-sec uppercase tracking-wide hidden lg:table-cell">HMAC</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9]">
              {filtered.map((log) => {
                const cfg = typeConfig[log.type] ?? { bg: 'bg-surf-alt', text: 'text-text-sec' }
                return (
                  <tr key={log.id} className="hover:bg-surf-screen transition-colors">
                    <td className="px-5 py-3 text-xs text-text-sec font-mono whitespace-nowrap">
                      {formatDateTime(log.time)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-bold px-2 py-1 rounded ${cfg.bg} ${cfg.text}`}>
                        {log.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-text-pri">{log.user}</td>
                    <td className="px-4 py-3 text-xs text-text-sec hidden md:table-cell">{log.entity}</td>
                    <td className="px-5 py-3 text-xs font-mono text-clin-green hidden lg:table-cell">{log.hmac}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-3 border-t border-[#F1F5F9] text-xs text-text-sec">
          {filtered.length} entries · All times UTC · Append-only · Verified
        </div>
      </div>
    </div>
  )
}

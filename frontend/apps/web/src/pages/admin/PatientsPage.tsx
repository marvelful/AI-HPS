import { useState, useEffect, useCallback } from 'react'
import { Search, Users } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { staffApi } from '@/lib/api'
import type { ApiUser } from '@/lib/api'
import { cn, formatDate } from '@/lib/utils'

export default function PatientsPage() {
  const [patients, setPatients] = useState<ApiUser[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [fetchErr, setFetchErr] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const fetchPatients = useCallback(async () => {
    setLoading(true)
    setFetchErr(null)
    try {
      const res = await staffApi.list({ role: 'patient', search: search || undefined, limit: 200 })
      setPatients(res.items)
      setTotal(res.total)
    } catch {
      setFetchErr('Failed to load patient accounts.')
    } finally {
      setLoading(false)
    }
  }, [search])

  useEffect(() => {
    const t = setTimeout(fetchPatients, search ? 300 : 0)
    return () => clearTimeout(t)
  }, [fetchPatients])

  const active = patients.filter((p) => p.is_active).length

  return (
    <div className="space-y-5 max-w-6xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-text-pri">Patients</h1>
        <p className="text-sm text-text-sec mt-0.5">
          Patient portal accounts — self-registered via the patient app
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-lg shadow-card p-4">
          <p className="text-[10px] font-bold text-text-sec uppercase tracking-wide mb-1">Total Registered</p>
          <p className="text-3xl font-bold text-text-pri">{total}</p>
        </div>
        <div className="bg-white rounded-lg shadow-card p-4">
          <p className="text-[10px] font-bold text-text-sec uppercase tracking-wide mb-1">Active</p>
          <p className="text-3xl font-bold text-clin-green">{active}</p>
        </div>
        <div className="bg-white rounded-lg shadow-card p-4">
          <p className="text-[10px] font-bold text-text-sec uppercase tracking-wide mb-1">Inactive</p>
          <p className="text-3xl font-bold text-text-sec">{total - active}</p>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-lg shadow-card p-4">
        <div className="relative max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-sec" />
          <input
            type="text"
            placeholder="Search patients by name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-2 text-sm border border-[#CBD5E1] rounded focus:outline-none focus:ring-2 focus:ring-hgd-blue bg-surf-alt"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-text-sec text-sm gap-2">
            <span className="w-4 h-4 border-2 border-hgd-blue border-t-transparent rounded-full animate-spin" />
            Loading patient accounts…
          </div>
        ) : fetchErr ? (
          <div className="py-10 text-center text-sm text-clin-red">{fetchErr}</div>
        ) : patients.length === 0 ? (
          <div className="py-16 text-center text-text-sec text-sm">
            <Users size={36} className="mx-auto mb-3 opacity-20" />
            <p className="font-semibold text-text-pri mb-1">
              {search ? 'No patients match your search' : 'No patient accounts yet'}
            </p>
            <p>
              {search
                ? 'Try a different name or email.'
                : 'Patients who register via the patient portal will appear here.'}
            </p>
          </div>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surf-alt border-b border-[#CBD5E1]">
                  <th className="text-left px-5 py-3 text-xs font-bold text-text-sec uppercase tracking-wide">Patient</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-text-sec uppercase tracking-wide hidden md:table-cell">Email</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-text-sec uppercase tracking-wide hidden lg:table-cell">Phone</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-text-sec uppercase tracking-wide hidden lg:table-cell">Date of birth</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-text-sec uppercase tracking-wide hidden md:table-cell">Registered</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-text-sec uppercase tracking-wide">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {patients.map((p) => (
                  <tr key={p.id} className="hover:bg-surf-screen transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <Avatar name={p.full_name} size="sm" />
                        <p className="font-semibold text-text-pri truncate">{p.full_name}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-text-sec hidden md:table-cell">{p.email}</td>
                    <td className="px-4 py-3.5 text-xs text-text-sec hidden lg:table-cell">{p.phone ?? '—'}</td>
                    <td className="px-4 py-3.5 text-xs text-text-sec hidden lg:table-cell">
                      {p.date_of_birth ? formatDate(p.date_of_birth) : '—'}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-text-sec hidden md:table-cell">
                      {formatDate(p.created_at)}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={cn('text-xs font-bold', p.is_active ? 'text-clin-green' : 'text-text-sec')}>
                        {p.is_active ? '● Active' : '○ Inactive'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-5 py-3 border-t border-[#F1F5F9] text-xs text-text-sec">
              {patients.length} patient{patients.length !== 1 ? 's' : ''}
              {search && ` matching "${search}"`}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

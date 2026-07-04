import { useState, useEffect, useCallback } from 'react'
import { Plus, Search, UserCheck, UserX, Eye, EyeOff, X } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import { Input } from '@/components/ui/Input'
import { staffApi } from '@/lib/api'
import type { ApiUser } from '@/lib/api'
import { useAuthStore } from '@/stores/auth.store'
import { cn, formatDate } from '@/lib/utils'

// ── Role config ──────────────────────────────────────────────────────────────

const ROLE_LABELS: Record<string, string> = {
  super_admin:               'Super Admin',
  admin:                     'Admin',
  department_admin:          'Dept. Admin',
  department_head:           'Dept. Head',
  doctor:                    'Doctor',
  clinician:                 'Clinician',
  nurse:                     'Nurse',
  pharmacist:                'Pharmacist',
  lab_technician:            'Lab Tech',
  radiologist:               'Radiologist',
  infection_control_officer: 'Infection Ctrl',
  staff:                     'Staff',
}

const ROLE_VARIANT: Record<string, 'red' | 'orange' | 'blue' | 'green' | 'purple' | 'gray'> = {
  super_admin:               'red',
  admin:                     'orange',
  department_admin:          'orange',
  department_head:           'blue',
  doctor:                    'green',
  clinician:                 'green',
  nurse:                     'green',
  pharmacist:                'green',
  lab_technician:            'green',
  radiologist:               'green',
  infection_control_officer: 'purple',
  staff:                     'gray',
}

const ROLES_SUPER_ADMIN = [
  'super_admin', 'admin', 'department_admin',
  'department_head', 'doctor', 'clinician', 'nurse',
  'pharmacist', 'lab_technician', 'radiologist',
  'infection_control_officer', 'staff',
]
const ROLES_ADMIN = [
  'department_head', 'doctor', 'clinician', 'nurse',
  'pharmacist', 'lab_technician', 'radiologist',
  'infection_control_officer', 'staff',
]

const SUMMARY_ROLES = ['doctor', 'nurse', 'department_head', 'clinician', 'pharmacist', 'staff']


// ── Create Staff Modal ───────────────────────────────────────────────────────

const createSchema = z.object({
  full_name:   z.string().min(2, 'Full name required'),
  email:       z.string().email('Enter a valid email'),
  employee_id: z.string().optional(),
  phone:       z.string().optional(),
  role:        z.string().min(1, 'Select a role'),
  password:    z.string().min(8, 'Minimum 8 characters'),
})
type CreateForm = z.infer<typeof createSchema>

interface CreatedInfo { user: ApiUser }

function CreateStaffModal({
  availableRoles,
  onClose,
  onCreated,
}: {
  availableRoles: string[]
  onClose: () => void
  onCreated: (info: CreatedInfo) => void
}) {
  const [showPass, setShowPass] = useState(false)
  const [serverErr, setServerErr] = useState<string | null>(null)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
    defaultValues: { role: availableRoles[0] ?? '', password: '' },
  })

  const onSubmit = async (data: CreateForm) => {
    setServerErr(null)
    try {
      const user = await staffApi.create({
        full_name:   data.full_name,
        email:       data.email,
        role:        data.role,
        password:    data.password,
        employee_id: data.employee_id || undefined,
        phone:       data.phone || undefined,
      })
      onCreated({ user })
    } catch (e: any) {
      setServerErr(e?.response?.data?.detail ?? 'Failed to create account. Please try again.')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#CBD5E1]">
          <div>
            <h2 className="font-bold text-text-pri">New Staff Account</h2>
            <p className="text-xs text-text-sec mt-0.5">Create credentials for a hospital staff member</p>
          </div>
          <button onClick={onClose} className="text-text-sec hover:text-text-pri transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-5 space-y-4">
          <Input
            label="Full Name"
            placeholder="Dr. Jean-Paul Kamga"
            error={errors.full_name?.message}
            {...register('full_name')}
          />
          <Input
            label="Email Address"
            type="email"
            placeholder="staff@hgd.cm"
            error={errors.email?.message}
            {...register('email')}
          />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-text-pri mb-1.5">Role</label>
              <select
                {...register('role')}
                className="w-full px-3 py-2 text-sm border border-[#CBD5E1] rounded focus:outline-none focus:ring-2 focus:ring-hgd-blue bg-white text-text-pri"
              >
                {availableRoles.map((r) => (
                  <option key={r} value={r}>{ROLE_LABELS[r] ?? r}</option>
                ))}
              </select>
              {errors.role && <p className="text-xs text-clin-red mt-1">{errors.role.message}</p>}
            </div>
            <Input
              label="Employee ID (optional)"
              placeholder="EMP-001"
              error={errors.employee_id?.message}
              {...register('employee_id')}
            />
          </div>

          <Input
            label="Phone (optional)"
            type="tel"
            placeholder="+237 6XX XXX XXX"
            error={errors.phone?.message}
            {...register('phone')}
          />

          <div>
            <label className="block text-xs font-semibold text-text-pri mb-1.5">Password</label>
            <div className="relative flex-1">
              <input
                type={showPass ? 'text' : 'password'}
                className="w-full pr-9 pl-3 py-2 text-sm border border-[#CBD5E1] rounded focus:outline-none focus:ring-2 focus:ring-hgd-blue"
                {...register('password')}
              />
              <button
                type="button"
                onClick={() => setShowPass((v) => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-sec hover:text-text-pri"
              >
                {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
            {errors.password && <p className="text-xs text-clin-red mt-1">{errors.password.message}</p>}
            <p className="text-xs text-text-sec mt-1">Staff will use this password to log in</p>
          </div>

          {serverErr && (
            <div className="rounded bg-clin-red-bg border border-clin-red/20 px-3 py-2 text-sm text-clin-red">
              {serverErr}
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <Button type="button" variant="ghost" onClick={onClose} className="flex-1">Cancel</Button>
            <Button type="submit" variant="action" loading={isSubmitting} icon={<Plus size={14} />} className="flex-1">
              Create Account
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Created success modal ────────────────────────────────────────────────────

function CreatedModal({ info, onClose }: { info: CreatedInfo; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm">
        <div className="px-6 pt-6 pb-4 text-center">
          <div className="w-12 h-12 bg-clin-green-bg rounded-full flex items-center justify-center mx-auto mb-3">
            <UserCheck size={22} className="text-clin-green" />
          </div>
          <h2 className="font-bold text-text-pri">Account Created</h2>
          <p className="text-sm text-text-sec mt-1">
            Staff account created successfully for {info.user.full_name.split(' ')[0]}.
          </p>
        </div>

        <div className="px-6 pb-4 space-y-3">
          <div className="bg-surf-alt rounded-lg p-3">
            <p className="text-[10px] text-text-sec font-bold uppercase tracking-wide mb-0.5">Email</p>
            <p className="text-sm font-medium text-text-pri">{info.user.email}</p>
          </div>
          <p className="text-[11px] text-text-sec text-center">
            Staff account created successfully. The staff member can now log in with their credentials.
          </p>
        </div>

        <div className="px-6 pb-6">
          <Button variant="primary" className="w-full" onClick={onClose}>Done</Button>
        </div>
      </div>
    </div>
  )
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function StaffPage() {
  const { user } = useAuthStore()
  const isSuperAdmin = user?.role === 'super_admin'
  const availableRoles = isSuperAdmin ? ROLES_SUPER_ADMIN : ROLES_ADMIN

  const [users, setUsers] = useState<ApiUser[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [fetchErr, setFetchErr] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [createdInfo, setCreatedInfo] = useState<CreatedInfo | null>(null)

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    setFetchErr(null)
    try {
      const res = await staffApi.list({ search: search || undefined, limit: 200 })
      const staffOnly = res.items.filter((u) => u.role !== 'patient')
      setUsers(staffOnly)
      setTotal(staffOnly.length)
    } catch {
      setFetchErr('Failed to load staff accounts.')
    } finally {
      setLoading(false)
    }
  }, [search])

  useEffect(() => {
    const t = setTimeout(fetchUsers, search ? 300 : 0)
    return () => clearTimeout(t)
  }, [fetchUsers])

  const handleCreated = (info: CreatedInfo) => {
    setShowCreate(false)
    setCreatedInfo(info)
    fetchUsers()
  }

  const toggleActive = async (u: ApiUser) => {
    try {
      await staffApi.setActive(u.id, !u.is_active)
      fetchUsers()
    } catch { /* silent */ }
  }

  const roleCounts: Record<string, number> = {}
  users.forEach((u) => { roleCounts[u.role] = (roleCounts[u.role] ?? 0) + 1 })

  return (
    <>
      {showCreate && (
        <CreateStaffModal
          availableRoles={availableRoles}
          onClose={() => setShowCreate(false)}
          onCreated={handleCreated}
        />
      )}
      {createdInfo && (
        <CreatedModal info={createdInfo} onClose={() => setCreatedInfo(null)} />
      )}

      <div className="space-y-5 max-w-6xl">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-text-pri">Hospital Staff</h1>
            <p className="text-sm text-text-sec mt-0.5">
              Manage staff accounts and access credentials · {total} account{total !== 1 ? 's' : ''}
            </p>
          </div>
          <Button variant="action" icon={<Plus size={15} />} onClick={() => setShowCreate(true)}>
            New staff account
          </Button>
        </div>

        {/* Role summary */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
          {SUMMARY_ROLES.map((role) => (
            <div key={role} className="bg-white rounded-lg shadow-card p-3 text-center">
              <Badge variant={ROLE_VARIANT[role]} className="mb-1.5 text-[10px]">
                {ROLE_LABELS[role]}
              </Badge>
              <p className="text-xl font-bold text-text-pri">{roleCounts[role] ?? 0}</p>
            </div>
          ))}
        </div>

        {/* Search */}
        <div className="bg-white rounded-lg shadow-card p-4">
          <div className="relative max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-sec" />
            <input
              type="text"
              placeholder="Search by name or email…"
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
              Loading staff accounts…
            </div>
          ) : fetchErr ? (
            <div className="py-10 text-center text-sm text-clin-red">{fetchErr}</div>
          ) : users.length === 0 ? (
            <div className="py-14 text-center text-text-sec text-sm">
              <p className="font-semibold text-text-pri mb-1">No staff accounts found</p>
              <p>{search ? 'Try a different search term.' : 'Create the first staff account using the button above.'}</p>
            </div>
          ) : (
            <>
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-surf-alt border-b border-[#CBD5E1]">
                    <th className="text-left px-5 py-3 text-xs font-bold text-text-sec uppercase tracking-wide">Staff member</th>
                    <th className="text-left px-4 py-3 text-xs font-bold text-text-sec uppercase tracking-wide">Role</th>
                    <th className="text-left px-4 py-3 text-xs font-bold text-text-sec uppercase tracking-wide hidden md:table-cell">Email</th>
                    <th className="text-left px-4 py-3 text-xs font-bold text-text-sec uppercase tracking-wide hidden lg:table-cell">Phone</th>
                    <th className="text-left px-4 py-3 text-xs font-bold text-text-sec uppercase tracking-wide hidden lg:table-cell">Created</th>
                    <th className="text-left px-4 py-3 text-xs font-bold text-text-sec uppercase tracking-wide">Status</th>
                    <th className="text-right px-5 py-3 text-xs font-bold text-text-sec uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9]">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-surf-screen transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <Avatar name={u.full_name} size="sm" />
                          <div className="min-w-0">
                            <p className="font-semibold text-text-pri truncate">{u.full_name}</p>
                            {u.employee_id && (
                              <p className="text-[10px] text-text-sec">{u.employee_id}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <Badge variant={ROLE_VARIANT[u.role] ?? 'gray'}>
                          {ROLE_LABELS[u.role] ?? u.role}
                        </Badge>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-text-sec hidden md:table-cell">{u.email}</td>
                      <td className="px-4 py-3.5 text-xs text-text-sec hidden lg:table-cell">{u.phone ?? '—'}</td>
                      <td className="px-4 py-3.5 text-xs text-text-sec hidden lg:table-cell">
                        {formatDate(u.created_at)}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={cn('text-xs font-bold', u.is_active ? 'text-clin-green' : 'text-text-sec')}>
                          {u.is_active ? '● Active' : '○ Inactive'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <button
                          onClick={() => toggleActive(u)}
                          title={u.is_active ? 'Deactivate account' : 'Activate account'}
                          className={cn(
                            'p-1.5 rounded transition-colors',
                            u.is_active
                              ? 'text-text-sec hover:bg-clin-red-bg hover:text-clin-red'
                              : 'text-text-sec hover:bg-clin-green-bg hover:text-clin-green',
                          )}
                        >
                          {u.is_active ? <UserX size={14} /> : <UserCheck size={14} />}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="px-5 py-3 border-t border-[#F1F5F9] text-xs text-text-sec">
                {users.length} staff account{users.length !== 1 ? 's' : ''}
                {search && ` matching "${search}"`}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}

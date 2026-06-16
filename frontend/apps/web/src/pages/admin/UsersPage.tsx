import { useState } from 'react'
import { Plus, Search, MoreVertical } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'

type UserRole = 'super_admin' | 'admin' | 'department_head' | 'clinician' | 'nurse' | 'patient'

const roleVariant: Record<UserRole, 'red' | 'orange' | 'blue' | 'green' | 'gray' | 'purple'> = {
  super_admin:     'red',
  admin:           'orange',
  department_head: 'blue',
  clinician:       'green',
  nurse:           'green',
  patient:         'gray',
}

const users = [
  { id: '1', name: 'Dr. Ayuk Emmanuel',  role: 'department_head' as UserRole, dept: 'ICU',       lastActive: '10 min ago', active: true  },
  { id: '2', name: 'Sr. Kamga Ruth',     role: 'nurse'           as UserRole, dept: 'Emergency', lastActive: '2h ago',     active: true  },
  { id: '3', name: 'Prof. Ngo Mireille', role: 'admin'           as UserRole, dept: 'Admin',     lastActive: 'Today',      active: true  },
  { id: '4', name: 'Pharm. Tabe Louis',  role: 'clinician'       as UserRole, dept: 'Pharmacy',  lastActive: 'Yesterday',  active: true  },
  { id: '5', name: 'Dr. Fru Richard',    role: 'department_head' as UserRole, dept: 'Blood Bank',lastActive: '3d ago',     active: false },
  { id: '6', name: 'System Admin',       role: 'super_admin'     as UserRole, dept: 'System',    lastActive: 'Now',        active: true  },
]

export default function UsersPage() {
  const [search, setSearch] = useState('')

  const filtered = users.filter((u) =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.dept.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <div className="space-y-5 max-w-6xl">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-text-pri">Users &amp; Roles</h1>
          <p className="text-sm text-text-sec mt-0.5">Manage staff accounts and role-based access</p>
        </div>
        <Button variant="action" icon={<Plus size={15} />}>
          Invite User
        </Button>
      </div>

      {/* Role summary */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {(['super_admin', 'admin', 'department_head', 'clinician', 'nurse', 'patient'] as UserRole[]).map((role) => {
          const count = users.filter((u) => u.role === role).length
          return (
            <div key={role} className="bg-white rounded-lg shadow-card p-3 text-center">
              <Badge variant={roleVariant[role]} className="mb-1.5 capitalize">
                {role.replace('_', ' ')}
              </Badge>
              <p className="text-xl font-bold text-text-pri">{count}</p>
            </div>
          )
        })}
      </div>

      {/* Search */}
      <div className="bg-white rounded-lg shadow-card p-4">
        <div className="relative max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-sec" />
          <input
            type="text"
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-2 text-sm border border-[#CBD5E1] rounded focus:outline-none focus:ring-2 focus:ring-hgd-blue bg-surf-alt"
          />
        </div>
      </div>

      {/* Users table */}
      <div className="bg-white rounded-lg shadow-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-surf-alt border-b border-[#CBD5E1]">
              <th className="text-left px-5 py-3 text-xs font-bold text-text-sec uppercase tracking-wide">User</th>
              <th className="text-left px-4 py-3 text-xs font-bold text-text-sec uppercase tracking-wide">Role</th>
              <th className="text-left px-4 py-3 text-xs font-bold text-text-sec uppercase tracking-wide hidden md:table-cell">Department</th>
              <th className="text-left px-4 py-3 text-xs font-bold text-text-sec uppercase tracking-wide hidden lg:table-cell">Last Active</th>
              <th className="text-left px-4 py-3 text-xs font-bold text-text-sec uppercase tracking-wide">Status</th>
              <th className="text-right px-5 py-3 text-xs font-bold text-text-sec uppercase tracking-wide">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F1F5F9]">
            {filtered.map((u) => (
              <tr key={u.id} className="hover:bg-surf-screen transition-colors">
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <Avatar name={u.name} size="sm" />
                    <span className="font-semibold text-text-pri">{u.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3.5">
                  <Badge variant={roleVariant[u.role]} className="capitalize">
                    {u.role.replace('_', ' ')}
                  </Badge>
                </td>
                <td className="px-4 py-3.5 text-text-sec hidden md:table-cell">{u.dept}</td>
                <td className="px-4 py-3.5 text-xs text-text-sec hidden lg:table-cell">{u.lastActive}</td>
                <td className="px-4 py-3.5">
                  <span className={`text-xs font-bold ${u.active ? 'text-clin-green' : 'text-text-sec'}`}>
                    {u.active ? '● Active' : '○ Inactive'}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-right">
                  <button className="text-text-sec hover:text-text-pri transition-colors">
                    <MoreVertical size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="px-5 py-3 border-t border-[#F1F5F9] text-xs text-text-sec">
          {filtered.length} of {users.length} users
        </div>
      </div>
    </div>
  )
}

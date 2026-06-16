import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, FolderOpen, CheckSquare, BarChart2,
  Shield, Users, Cpu, Bell, LogOut, User,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth.store'

const navItems = [
  { to: '/admin/dashboard',     label: 'Dashboard',   icon: LayoutDashboard },
  { to: '/admin/procedures',    label: 'Procedures',  icon: FolderOpen },
  { to: '/admin/approvals',     label: 'Approvals',   icon: CheckSquare,  badge: true },
  { to: '/admin/analytics',     label: 'Analytics',   icon: BarChart2 },
  { to: '/admin/audit',         label: 'Audit Log',   icon: Shield },
  { to: '/admin/users',         label: 'Users & Roles', icon: Users },
  { to: '/admin/ai-monitor',    label: 'AI Monitor',  icon: Cpu },
  { to: '/admin/notifications', label: 'Notifications', icon: Bell },
]

export function Sidebar() {
  const { user, clearAuth } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = () => {
    clearAuth()
    navigate('/login')
  }

  return (
    <aside className="w-60 h-screen bg-white border-r border-[#CBD5E1] flex flex-col flex-shrink-0 sticky top-0">
      {/* Logo */}
      <div className="px-5 py-4 border-b border-[#CBD5E1]">
        <span className="text-xl font-bold text-hgd-blue tracking-tight">
          AI-<span className="text-hgd-orange">HPS</span>
        </span>
        <p className="text-[10px] text-text-sec mt-0.5 leading-tight">Hôpital Général de Douala</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 overflow-y-auto">
        {navItems.map(({ to, label, icon: Icon, badge }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-5 py-2.5 text-sm font-medium transition-colors',
                'border-l-[3px]',
                isActive
                  ? 'border-l-hgd-blue bg-hgd-blue3 text-hgd-blue'
                  : 'border-l-transparent text-text-sec hover:bg-surf-alt hover:text-text-pri',
              )
            }
          >
            <Icon size={16} className="flex-shrink-0" />
            <span className="flex-1">{label}</span>
            {badge && (
              <span className="bg-hgd-orange text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                12
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User footer */}
      <div className="border-t border-[#CBD5E1] p-4">
        <NavLink
          to="/admin/profile"
          className={({ isActive }) =>
            cn(
              'flex items-center gap-2.5 px-2 py-2 rounded text-sm transition-colors mb-2',
              isActive ? 'bg-hgd-blue3 text-hgd-blue' : 'text-text-sec hover:bg-surf-alt',
            )
          }
        >
          <div className="w-7 h-7 rounded-full bg-hgd-blue3 text-hgd-blue text-xs font-bold flex items-center justify-center flex-shrink-0">
            {user?.full_name?.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase() ?? 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-xs text-text-pri truncate">{user?.full_name ?? 'Staff'}</p>
            <p className="text-[10px] text-text-sec capitalize truncate">{user?.role?.replace('_', ' ')}</p>
          </div>
          <User size={14} />
        </NavLink>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 w-full px-2 py-2 text-xs text-text-sec hover:text-clin-red hover:bg-clin-red-bg rounded transition-colors"
        >
          <LogOut size={14} />
          Sign out
        </button>
      </div>
    </aside>
  )
}

import { Outlet, NavLink } from 'react-router-dom'
import { Home, ClipboardList, MapPin, User, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

const leftTabs = [
  { to: '/patient/home',       label: 'Home',       icon: Home },
  { to: '/patient/procedures', label: 'Procedures', icon: ClipboardList },
]

const rightTabs = [
  { to: '/patient/departments', label: 'Map',     icon: MapPin },
  { to: '/patient/profile',     label: 'Profile', icon: User },
]

export function PatientLayout() {
  return (
    <div className="flex flex-col h-screen bg-[#F5F7FA]" style={{ maxWidth: 430, margin: '0 auto' }}>
      {/* Content */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>

      {/* Bottom nav */}
      <nav className="relative bg-white border-t border-slate-200 flex items-center h-16 flex-shrink-0">
        {/* Left tabs */}
        {leftTabs.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex-1 relative flex flex-col items-center gap-1 py-2 transition-colors',
                isActive ? 'text-hgd-blue' : 'text-slate-400 hover:text-slate-600',
              )
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-b-full bg-hgd-blue" />
                )}
                <Icon size={22} strokeWidth={isActive ? 2.2 : 1.8} />
                <span className="text-[10px] font-semibold tracking-wide">{label}</span>
              </>
            )}
          </NavLink>
        ))}

        {/* Center AI tab — round, same level as others */}
        <NavLink
          to="/patient/assistant"
          className={({ isActive }) =>
            cn(
              'flex-1 flex items-center justify-center py-2 transition-opacity active:opacity-70',
              isActive ? 'opacity-100' : 'opacity-85',
            )
          }
        >
          {({ isActive }) => (
            <div
              className={cn(
                'w-10 h-10 rounded-full flex items-center justify-center',
                isActive ? 'ring-2 ring-offset-1 ring-[#E8620A]' : '',
              )}
              style={{ background: 'linear-gradient(135deg, #E8620A 0%, #F47D2C 100%)' }}
            >
              <Sparkles size={20} className="text-white" strokeWidth={1.8} />
            </div>
          )}
        </NavLink>

        {/* Right tabs */}
        {rightTabs.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex-1 relative flex flex-col items-center gap-1 py-2 transition-colors',
                isActive ? 'text-hgd-blue' : 'text-slate-400 hover:text-slate-600',
              )
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-b-full bg-hgd-blue" />
                )}
                <Icon size={22} strokeWidth={isActive ? 2.2 : 1.8} />
                <span className="text-[10px] font-semibold tracking-wide">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}

import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { Home, ClipboardList, MapPin, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth.store'

const tabs = [
  { to: '/patient/home',        label: 'Home',       icon: Home },
  { to: '/patient/procedures',  label: 'Procedures', icon: ClipboardList },
  { to: '/patient/departments', label: 'Map',        icon: MapPin },
  { to: '/patient/profile',     label: 'Profile',    icon: User },
]

export function PatientLayout() {
  const { clearAuth } = useAuthStore()
  const navigate = useNavigate()

  const handleSignOut = () => {
    clearAuth()
    navigate('/')
  }

  // expose sign-out via context so profile page can call it
  void handleSignOut

  return (
    <div className="flex flex-col h-screen bg-[#F5F7FA]" style={{ maxWidth: '430px', margin: '0 auto' }}>
      {/* Content */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>

      {/* Bottom nav */}
      <nav className="bg-white border-t border-slate-200 flex items-center h-16 flex-shrink-0 safe-area-pb">
        {tabs.map(({ to, label, icon: Icon }) => (
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

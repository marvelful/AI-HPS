import { Bell, Menu } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth.store'

interface TopBarProps {
  title?: string
  onMenuToggle?: () => void
}

export function TopBar({ title, onMenuToggle }: TopBarProps) {
  const { user } = useAuthStore()

  return (
    <header className="h-14 bg-hgd-blue flex items-center px-5 gap-4 flex-shrink-0 sticky top-0 z-20">
      {onMenuToggle && (
        <button
          onClick={onMenuToggle}
          className="text-white/70 hover:text-white lg:hidden"
          aria-label="Toggle menu"
        >
          <Menu size={20} />
        </button>
      )}

      <div className="flex items-center gap-2 lg:hidden">
        <span className="text-lg font-bold text-white tracking-tight">
          AI-<span className="text-hgd-orange2">HPS</span>
        </span>
      </div>

      {title && (
        <p className="hidden lg:block text-sm font-semibold text-white/80">{title}</p>
      )}

      <div className="flex-1" />

      <Link
        to="/admin/notifications"
        className="relative text-white/80 hover:text-white transition-colors"
        aria-label="Notifications"
      >
        <Bell size={20} />
        <span className="absolute -top-1 -right-1 bg-hgd-orange text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
          3
        </span>
      </Link>

      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-full bg-white/20 text-white text-xs font-bold flex items-center justify-center">
          {user?.full_name?.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase() ?? 'U'}
        </div>
        <div className="hidden md:block text-right">
          <p className="text-xs font-semibold text-white leading-tight">{user?.full_name ?? 'Staff'}</p>
          <p className="text-[10px] text-white/60 capitalize">{user?.role?.replace('_', ' ')}</p>
        </div>
      </div>
    </header>
  )
}

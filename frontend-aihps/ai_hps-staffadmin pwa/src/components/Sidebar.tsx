'use client';
import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, ClipboardList, Sparkles, CheckSquare,
  BarChart2, Shield, Users, UserCircle, Activity, Bell, LogOut
} from 'lucide-react';
import AppLogo from '@/components/ui/AppLogo';
import { useAuthStore } from '@/stores/auth.store';
import { authApi } from '@/lib/api';

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

type NavItem = {
  key: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  href: string;
  roles: string[];
  badge: string | null;
  badgeColor?: 'amber' | 'blue' | null;
  accentColor?: string | null;
};

const navItems: NavItem[] = [
  { key: 'nav-dashboard', label: 'Dashboard', icon: LayoutDashboard, href: '/', roles: ['all'], badge: null, accentColor: null },
  { key: 'nav-procedures', label: 'Procedures', icon: ClipboardList, href: '/procedures', roles: ['all'], badge: null, accentColor: null },
  { key: 'nav-assistant', label: 'AI Assistant', icon: Sparkles, href: '/ai-assistant', roles: ['all'], badge: null, accentColor: 'purple' },
  { key: 'nav-approvals', label: 'Approvals', icon: CheckSquare, href: '/approvals', roles: ['all'], badge: null, accentColor: null },
  { key: 'nav-notifications', label: 'Notifications', icon: Bell, href: '/notifications', roles: ['all'], badge: null, accentColor: null },
  { key: 'nav-analytics', label: 'Analytics', icon: BarChart2, href: '/analytics', roles: ['admin'], badge: null, accentColor: null },
  { key: 'nav-audit', label: 'Audit Log', icon: Shield, href: '/audit', roles: ['admin'], badge: null, accentColor: null },
  { key: 'nav-staff', label: 'Hospital Staff', icon: Users, href: '/staff', roles: ['admin'], badge: null, accentColor: null },
  { key: 'nav-patients', label: 'Patients', icon: UserCircle, href: '/patients', roles: ['admin'], badge: null, accentColor: null },
  { key: 'nav-monitor', label: 'AI Monitor', icon: Activity, href: '/ai-monitor', roles: ['admin'], badge: null, accentColor: null },
];

function getInitialColor(name: string): string {
  const colors = ['#004A8F', '#5B21B6', '#2E7D32', '#E8620A'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, clearAuth } = useAuthStore();

  const displayName = user?.full_name ?? 'Staff';
  const initials = displayName.split(' ').filter(Boolean).slice(0, 2).map((n: string) => n[0].toUpperCase()).join('');
  const avatarColor = getInitialColor(displayName);
  const roleLabel = user?.role?.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) ?? 'Staff';
  const isAdmin = user?.role === 'super_admin' || user?.role === 'admin' || user?.role === 'department_admin';
  const visibleNavItems = navItems.filter((item) => item.roles.includes('all') || isAdmin);

  const handleLogout = async () => {
    await authApi.logout();
    clearAuth();
    router.replace('/staff-login');
  };

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-14 left-0 bottom-0 z-40 w-60 bg-white border-r border-border
          flex flex-col sidebar-transition
          ${open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Header */}
        <div className="h-16 flex items-center gap-2.5 px-4 border-b border-border flex-shrink-0">
          <div className="w-8 h-8 rounded-md flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #004A8F, #0062B8)' }}>
            <AppLogo size={20} className="brightness-0 invert" />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="font-bold text-primary" style={{ fontSize: '15px' }}>AI-HPS</span>
            <span className="text-muted-foreground label-meta">Clinical Portal</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-2">
          {visibleNavItems.map((item) => {
            const active = isActive(item.href);
            const isAI = item.key === 'nav-assistant';
            return (
              <Link
                key={item.key}
                href={item.href}
                onClick={onClose}
                className={`
                  flex items-center gap-3 px-3 h-11 rounded-md mb-0.5 transition-all duration-100 relative group
                  ${active
                    ? isAI
                      ? 'bg-accent-light text-accent border-l-[3px] border-accent pl-[9px]'
                      : 'bg-primary-light text-primary border-l-[3px] border-primary pl-[9px]' :'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }
                `}
              >
                <item.icon size={17} className="flex-shrink-0" />
                <span className="font-medium flex-1 truncate" style={{ fontSize: '14px' }}>{item.label}</span>
                {item.badge && (
                  <span
                    className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-white font-bold"
                    style={{
                      backgroundColor: item.badgeColor === 'amber' ? '#E65100' : '#004A8F',
                      fontSize: '10px',
                    }}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Role badge */}
        <div className="px-4 py-2 border-t border-border">
          <div className="flex items-center gap-2 px-2 py-1.5 rounded-md border border-clinical-amber/40 bg-clinical-amber-bg/50">
            <span className="label-meta text-clinical-amber">{isAdmin ? 'Administrator Access' : 'Staff Access'}</span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-2.5 px-4 py-3 border-t border-border">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0"
            style={{ backgroundColor: avatarColor, fontSize: '11px' }}
          >
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold truncate text-foreground" style={{ fontSize: '13px' }}>{displayName}</p>
            <span className="label-meta text-muted-foreground">{roleLabel}</span>
          </div>
          <button
            onClick={handleLogout}
            className="text-clinical-red hover:bg-clinical-red-bg p-1.5 rounded transition-colors"
            title="Sign Out"
          >
            <LogOut size={15} />
          </button>
        </div>
      </aside>
    </>
  );
}

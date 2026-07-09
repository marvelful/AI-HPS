'use client';
import React from 'react';
import { Bell, Menu, X } from 'lucide-react';
import Link from 'next/link';
import AppLogo from '@/components/ui/AppLogo';
import { useAuthStore } from '@/stores/auth.store';


interface TopbarProps {
  onMenuClick: () => void;
  sidebarOpen: boolean;
}

function getInitialColor(name: string): string {
  const colors = ['#004A8F', '#5B21B6', '#2E7D32', '#E8620A', '#0891B2', '#C62828'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'U';
}

function roleLabel(role?: string): string {
  if (!role) return 'Staff';
  return role.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function Topbar({ onMenuClick, sidebarOpen }: TopbarProps) {
  const { user } = useAuthStore();
  const displayName = user?.full_name ?? 'Staff';
  const avatarColor = getInitialColor(displayName);
  const initials = getInitials(displayName);

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 h-14 flex items-center px-4 justify-between"
      style={{ background: 'linear-gradient(135deg, #0a1628 0%, #004A8F 100%)' }}
    >
      {/* Left */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="lg:hidden text-white/80 hover:text-white p-1 rounded transition-colors"
          aria-label="Toggle sidebar"
        >
          {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
        <div className="flex items-center gap-2">
          <AppLogo size={28} className="brightness-0 invert" />
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-bold text-white tracking-tight">
              <span style={{ color: '#E8620A' }}>AI</span>
              <span className="text-white">-HPS</span>
            </span>
            <span className="text-white/60 hidden sm:block" style={{ fontSize: '10px' }}>
              Hôpital Général de Douala
            </span>
          </div>
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-3">
        {/* Bell */}
        <div className="relative">
          <Link
            href="/notifications"
            className="relative text-white/80 hover:text-white p-1.5 rounded transition-colors"
            aria-label="Notifications"
          >
            <Bell size={18} />
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center text-white font-bold"
              style={{ backgroundColor: '#E8620A', fontSize: '9px' }}>
              3
            </span>
          </Link>
        </div>

        {/* Divider */}
        <div className="w-px h-6 bg-white/20 hidden sm:block" />

        {/* User */}
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0"
            style={{ backgroundColor: avatarColor, fontSize: '12px' }}
          >
            {initials}
          </div>
          <div className="hidden sm:flex flex-col leading-tight">
            <span className="text-white font-semibold" style={{ fontSize: '13px' }}>{displayName}</span>
            <span className="text-white/60" style={{ fontSize: '10px' }}>{roleLabel(user?.role)}</span>
          </div>
        </div>
      </div>
    </header>
  );
}

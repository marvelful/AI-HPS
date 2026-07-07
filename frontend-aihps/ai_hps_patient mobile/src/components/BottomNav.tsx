'use client';
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, BookOpen, MapPin, User, MessageCircle } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

export default function BottomNav() {
  const pathname = usePathname();
  const { patient } = useAuthStore();
  const lang = patient?.language ?? 'fr';

  const navItems = [
    { label: lang === 'en' ? 'Home' : 'Accueil', href: '/home', icon: Home },
    { label: lang === 'en' ? 'Procedures' : 'Procédures', href: '/procedures', icon: BookOpen },
    { label: 'AI', href: '/ai-assistant', icon: MessageCircle, isCenter: true },
    { label: lang === 'en' ? 'Depts' : 'Dépts', href: '/departments', icon: MapPin },
    { label: lang === 'en' ? 'Profile' : 'Profil', href: '/profile', icon: User },
  ];

  return (
    <nav
      className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white border-t border-border shadow-nav z-50 bottom-nav-safe"
      style={{ height: '64px' }}
      aria-label="Main navigation"
    >
      <div className="flex items-center justify-around h-full px-2">
        {navItems.map((item) => {
          if (item.isCenter) {
            return (
              <Link
                key="nav-ai"
                href={item.href}
                className="flex flex-col items-center justify-center -mt-6"
                aria-label="AI Assistant"
              >
                <span
                  className="flex items-center justify-center w-14 h-14 rounded-full shadow-float float-pulse"
                  style={{ background: 'var(--secondary)' }}
                >
                  <MessageCircle size={26} color="white" />
                </span>
              </Link>
            );
          }
          const isActive =
            item.href === '/home'
              ? pathname === '/home'
              : pathname?.startsWith(item.href);
          return (
            <Link
              key={`nav-${item.href}`}
              href={item.href}
              className="flex flex-col items-center justify-center gap-0.5 flex-1 py-1 group"
              aria-label={item.label}
            >
              <item.icon
                size={22}
                className="transition-colors duration-200"
                color={isActive ? 'var(--primary)' : 'var(--muted-foreground)'}
                strokeWidth={isActive ? 2.5 : 1.8}
              />
              <span
                className="text-[10px] font-medium transition-colors duration-200"
                style={{ color: isActive ? 'var(--primary)' : 'var(--muted-foreground)' }}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

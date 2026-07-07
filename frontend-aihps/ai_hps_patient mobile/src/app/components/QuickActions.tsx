'use client';
import React from 'react';
import Link from 'next/link';
import { MapPin, BookOpen } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

export default function QuickActions() {
  const { patient } = useAuthStore();
  const lang = patient?.language ?? 'fr';

  const sectionTitle = lang === 'en' ? 'Quick Actions' : 'Actions Rapides';

  const actions = [
    {
      id: 'quick-dept',
      label: lang === 'en' ? 'Find' : 'Trouver',
      sublabel: lang === 'en' ? 'Department' : 'Département',
      icon: MapPin,
      bg: 'var(--primary-light)',
      color: 'var(--primary)',
      href: '/departments',
    },
    {
      id: 'quick-procedures',
      label: lang === 'en' ? 'Procedures' : 'Procédures',
      sublabel: lang === 'en' ? 'Medical' : 'Médicales',
      icon: BookOpen,
      bg: 'var(--secondary-light)',
      color: 'var(--secondary)',
      href: '/procedures',
    },
  ];

  return (
    <div>
      <h2 className="text-foreground font-bold text-base mb-3">{sectionTitle}</h2>
      <div className="grid grid-cols-2 gap-3">
        {actions.map((action) => (
          <Link
            key={action.id}
            href={action.href}
            className="flex flex-col items-center gap-2 p-3 rounded-2xl transition-all duration-150 active:scale-95 card-base text-center"
          >
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center"
              style={{ background: action.bg }}
            >
              <action.icon size={22} color={action.color} />
            </div>
            <div>
              <p className="text-foreground text-xs font-bold leading-tight">{action.label}</p>
              <p className="text-muted-foreground text-[10px] font-medium">{action.sublabel}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

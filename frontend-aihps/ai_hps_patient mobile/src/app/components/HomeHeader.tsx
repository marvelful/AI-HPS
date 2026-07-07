'use client';
import React from 'react';
import { Bell } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

function getDateLabel(lang: 'fr' | 'en'): string {
  return new Date().toLocaleDateString(lang === 'en' ? 'en-US' : 'fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export default function HomeHeader() {
  const { patient } = useAuthStore();
  const lang: 'fr' | 'en' = patient?.language ?? 'fr';
  const firstName = patient?.name?.split(' ')[0] || (lang === 'fr' ? 'là' : 'there');
  const dateLabel = getDateLabel(lang);
  const greeting = lang === 'en' ? `Hello, ${firstName} 👋` : `Bonjour, ${firstName} 👋`;
  const question = lang === 'en' ? 'How are you feeling today?' : 'Comment vous sentez-vous aujourd\'hui ?';

  return (
    <div className="gradient-primary px-4 pt-12 pb-12 relative overflow-hidden">
      <div
        className="absolute -top-8 -right-8 w-40 h-40 rounded-full opacity-10"
        style={{ background: 'var(--secondary)' }}
      />
      <div
        className="absolute top-4 -right-4 w-24 h-24 rounded-full opacity-10"
        style={{ background: 'var(--primary-hover)' }}
      />

      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-blue-200 text-sm font-medium mb-1 capitalize">
            {dateLabel}
          </p>
          <h1 className="text-white text-2xl font-bold leading-tight">
            {greeting}
          </h1>
          <p className="text-blue-200 text-sm mt-1">{question}</p>
        </div>
        <button
          className="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-150 active:scale-95"
          style={{ background: 'rgba(255,255,255,0.15)' }}
          aria-label={lang === 'en' ? 'Notifications' : 'Notifications'}
        >
          <Bell size={20} color="white" />
          <span
            className="absolute top-2 right-2 w-2 h-2 rounded-full"
            style={{ background: 'var(--secondary)' }}
          />
        </button>
      </div>
    </div>
  );
}

'use client';
import React from 'react';
import { useAuthStore } from '@/store/authStore';

const updates = {
  fr: [
    {
      id: 'upd-001',
      dot: '#2E7D32',
      title: 'Résultats d\'analyse disponibles',
      desc: 'Votre bilan sanguin du 2 juillet est prêt.',
      time: 'Il y a 2h',
    },
    {
      id: 'upd-002',
      dot: '#004A8F',
      title: 'Rappel de rendez-vous',
      desc: 'Cardiologie — Dr. Fofana, mardi 7 juillet à 9h30.',
      time: 'Il y a 5h',
    },
  ],
  en: [
    {
      id: 'upd-001',
      dot: '#2E7D32',
      title: 'Lab results available',
      desc: 'Your blood panel from July 2 is ready.',
      time: '2h ago',
    },
    {
      id: 'upd-002',
      dot: '#004A8F',
      title: 'Appointment reminder',
      desc: 'Cardiology — Dr. Fofana, Tuesday July 7 at 9:30am.',
      time: '5h ago',
    },
  ],
};

export default function LatestUpdates() {
  const { patient } = useAuthStore();
  const lang: 'fr' | 'en' = patient?.language ?? 'fr';
  const title = lang === 'en' ? 'Latest Updates' : 'Dernières Mises à Jour';
  const list = updates[lang];

  return (
    <div>
      <h2 className="text-foreground font-bold text-base mb-3">{title}</h2>
      <div className="card-base divide-y" style={{ borderColor: 'var(--border)' }}>
        {list.map((u) => (
          <div key={u.id} className="flex items-start gap-3 p-3">
            <div
              className="w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0"
              style={{ background: u.dot }}
            />
            <div className="flex-1 min-w-0">
              <p className="text-foreground text-sm font-semibold leading-snug">{u.title}</p>
              <p className="text-muted-foreground text-xs mt-0.5 leading-snug">{u.desc}</p>
            </div>
            <span className="text-muted-foreground text-[10px] font-medium flex-shrink-0">{u.time}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

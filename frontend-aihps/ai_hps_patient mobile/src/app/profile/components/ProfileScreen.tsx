'use client';
import React, { useState } from 'react';
import MobileShell from '@/components/MobileShell';
import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';
import { Mail, Phone, Globe, HelpCircle, LogOut, ChevronRight, Edit3 } from 'lucide-react';
import EditProfileSheet from './EditProfileSheet';

const i18n = {
  fr: {
    role: 'Patient',
    editProfile: 'Modifier le profil',
    personalInfo: 'Informations personnelles',
    email: 'Email',
    phone: 'Téléphone',
    preferences: 'Préférences',
    language: 'Langue',
    helpSupport: 'Aide et Support',
    signOut: 'Se déconnecter',
    footer1: 'AI-HPS · Hôpital Général de Douala · v1.0.0',
    footer2: 'Construit avec la sécurité clinique en tête.',
  },
  en: {
    role: 'Patient',
    editProfile: 'Edit Profile',
    personalInfo: 'Personal Information',
    email: 'Email',
    phone: 'Phone',
    preferences: 'Preferences',
    language: 'Language',
    helpSupport: 'Help & Support',
    signOut: 'Sign Out',
    footer1: 'AI-HPS · Hôpital Général de Douala · v1.0.0',
    footer2: 'Built with clinical safety in mind.',
  },
};

export default function ProfileScreen() {
  const { patient, logout, updateLanguage } = useAuthStore();
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const lang: 'fr' | 'en' = patient?.language ?? 'fr';
  const t = i18n[lang];

  const initials = patient?.name
    ? patient.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : 'JP';

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <MobileShell>
      {/* Header */}
      <div
        className="relative pt-10 pb-6 flex flex-col items-center gap-2"
        style={{ background: 'linear-gradient(135deg, #004A8F 0%, #0062B8 60%, #E8620A 100%)' }}
      >
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold shadow-lg"
          style={{ background: 'linear-gradient(135deg, #004A8F 0%, #0062B8 100%)', color: '#fff', border: '3px solid rgba(255,255,255,0.4)' }}
        >
          {initials}
        </div>
        <div className="text-center">
          <p className="text-white font-bold text-lg leading-tight">{patient?.name ?? 'Patient'}</p>
          <p className="text-white/70 text-xs mt-0.5">{t.role} · ID •••{patient?.id?.slice(-3) ?? '5A3'} · HGD</p>
        </div>
        <button
          onClick={() => setEditOpen(true)}
          className="mt-1 flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-95"
          style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', border: '1px solid rgba(255,255,255,0.35)' }}
        >
          <Edit3 size={13} />
          {t.editProfile}
        </button>
      </div>

      {/* Scrollable content */}
      <div className="px-4 pt-4 pb-6 flex flex-col gap-4">

        {/* Personal Info Summary */}
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--muted-foreground)' }}>
            {t.personalInfo}
          </p>
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden" style={{ border: '1px solid var(--border)' }}>
            <InfoRow icon={<Mail size={16} color="var(--primary)" />} label={t.email} value={patient?.email ?? '—'} />
            <div style={{ height: 1, background: 'var(--border)' }} />
            <InfoRow icon={<Phone size={16} color="var(--primary)" />} label={t.phone} value={patient?.phone ?? '—'} />
          </div>
        </div>

        {/* Preferences */}
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--muted-foreground)' }}>
            {t.preferences}
          </p>
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden" style={{ border: '1px solid var(--border)' }}>
            {/* Language */}
            <div className="flex items-center gap-3 px-4 py-3">
              <Globe size={16} color="var(--primary)" />
              <span className="text-sm font-medium flex-1" style={{ color: 'var(--foreground)' }}>{t.language}</span>
              <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                {(['fr', 'en'] as const).map((l) => (
                  <button
                    key={l}
                    onClick={() => updateLanguage(l)}
                    className="px-3 py-1 text-xs font-semibold transition-all"
                    style={{
                      background: lang === l ? 'var(--primary)' : '#fff',
                      color: lang === l ? '#fff' : 'var(--muted-foreground)',
                    }}
                  >
                    {l === 'fr' ? 'FR' : 'EN'}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ height: 1, background: 'var(--border)' }} />
            <TappableRow icon={<HelpCircle size={16} color="var(--primary)" />} label={t.helpSupport} />
          </div>
        </div>

        {/* Sign Out */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all active:scale-95"
          style={{ background: '#FFEBEE', color: 'var(--critical)', border: '1px solid #FFCDD2' }}
        >
          <LogOut size={16} />
          {t.signOut}
        </button>

        {/* Footer */}
        <div className="text-center pt-1">
          <p className="text-[10px]" style={{ color: 'var(--muted-foreground)' }}>{t.footer1}</p>
          <p className="text-[10px]" style={{ color: 'var(--muted-foreground)' }}>{t.footer2}</p>
        </div>
      </div>

      {/* Edit Profile Sheet */}
      {editOpen && <EditProfileSheet onClose={() => setEditOpen(false)} lang={lang} />}
    </MobileShell>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      {icon}
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-wide" style={{ color: 'var(--muted-foreground)' }}>{label}</p>
        <p className="text-sm font-medium truncate" style={{ color: 'var(--foreground)' }}>{value}</p>
      </div>
    </div>
  );
}

function TappableRow({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 cursor-pointer active:bg-gray-50 transition-colors">
      {icon}
      <span className="text-sm font-medium flex-1" style={{ color: 'var(--foreground)' }}>{label}</span>
      <ChevronRight size={16} color="var(--muted-foreground)" />
    </div>
  );
}

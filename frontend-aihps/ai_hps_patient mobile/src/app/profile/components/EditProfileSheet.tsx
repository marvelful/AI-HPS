'use client';
import React, { useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { X, Check, User, Mail, Phone, Calendar, AlertCircle } from 'lucide-react';

interface EditProfileSheetProps {
  onClose: () => void;
  lang?: 'fr' | 'en';
}

interface FormData {
  name: string;
  email: string;
  phone: string;
  dob: string;
}

interface FormErrors {
  name?: string;
  email?: string;
  phone?: string;
  dob?: string;
}

const i18n = {
  fr: {
    title: 'Modifier le profil',
    save: 'Enregistrer',
    saved: 'Enregistré',
    personalInfo: 'Informations personnelles',
    nameLabel: 'Nom complet',
    emailLabel: 'Adresse email',
    phoneLabel: 'Numéro de téléphone',
    dobLabel: 'Date de naissance',
    errors: {
      nameRequired: 'Le nom complet est requis',
      emailRequired: 'L\'email est requis',
      emailInvalid: 'Entrez une adresse email valide',
    },
  },
  en: {
    title: 'Edit Profile',
    save: 'Save',
    saved: 'Saved',
    personalInfo: 'Personal Information',
    nameLabel: 'Full Name',
    emailLabel: 'Email Address',
    phoneLabel: 'Phone Number',
    dobLabel: 'Date of Birth',
    errors: {
      nameRequired: 'Full name is required',
      emailRequired: 'Email is required',
      emailInvalid: 'Enter a valid email address',
    },
  },
};

export default function EditProfileSheet({ onClose, lang = 'fr' }: EditProfileSheetProps) {
  const { patient, updateProfile } = useAuthStore();
  const t = i18n[lang];
  const [saved, setSaved] = useState(false);

  const [form, setForm] = useState<FormData>({
    name: patient?.name ?? '',
    email: patient?.email ?? '',
    phone: patient?.phone ?? '',
    dob: patient?.dob ?? '',
  });

  const [errors, setErrors] = useState<FormErrors>({});

  const validate = (): boolean => {
    const newErrors: FormErrors = {};
    if (!form.name.trim()) newErrors.name = t.errors.nameRequired;
    if (!form.email.trim()) {
      newErrors.email = t.errors.emailRequired;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = t.errors.emailInvalid;
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (field: keyof FormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleSave = () => {
    if (!validate()) return;
    updateProfile({
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      dob: form.dob,
    });
    setSaved(true);
    setTimeout(() => {
      onClose();
    }, 800);
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] z-50 bg-white rounded-t-[20px] shadow-2xl"
        style={{ maxHeight: '92dvh', display: 'flex', flexDirection: 'column' }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-8 h-1 rounded-full" style={{ background: 'var(--border)' }} />
        </div>

        {/* Sheet header */}
        <div className="flex items-center justify-between px-5 py-3 flex-shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-full transition-colors active:bg-gray-100"
            style={{ color: 'var(--muted-foreground)' }}
          >
            <X size={18} />
          </button>
          <h2 className="text-base font-bold" style={{ color: 'var(--foreground)' }}>{t.title}</h2>
          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-semibold transition-all active:scale-95"
            style={{
              background: saved ? '#E8F5E9' : 'var(--primary)',
              color: saved ? 'var(--safe)' : '#fff',
            }}
          >
            {saved ? <><Check size={14} /> {t.saved}</> : t.save}
          </button>
        </div>

        {/* Scrollable form — extra bottom padding ensures last field clears the keyboard */}
        <div
          className="overflow-y-auto flex-1 px-5 py-4 flex flex-col gap-5"
          style={{ WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' }}
        >
          <section>
            <SectionLabel>{t.personalInfo}</SectionLabel>
            <div className="flex flex-col gap-3">
              <Field label={t.nameLabel} icon={<User size={15} color="var(--primary)" />} required error={errors.name}>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder="Jean-Paul Kamga"
                  className="field-input"
                />
              </Field>

              <Field label={t.emailLabel} icon={<Mail size={15} color="var(--primary)" />} required error={errors.email}>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  placeholder="you@email.com"
                  className="field-input"
                />
              </Field>

              <Field label={t.phoneLabel} icon={<Phone size={15} color="var(--primary)" />} error={errors.phone}>
                <div className="flex items-center gap-0" style={{ border: '1.5px solid var(--border)', borderRadius: 6, overflow: 'hidden', background: '#fff' }}>
                  <span className="px-3 py-2.5 text-sm font-medium flex-shrink-0" style={{ background: 'var(--muted)', color: 'var(--muted-foreground)', borderRight: '1px solid var(--border)' }}>
                    +237
                  </span>
                  <input
                    type="tel"
                    value={form.phone.replace(/^\+237\s?/, '')}
                    onChange={(e) => handleChange('phone', '+237 ' + e.target.value)}
                    placeholder="6XX XXX XXX"
                    className="flex-1 px-3 py-2.5 text-sm outline-none bg-white"
                    style={{ color: 'var(--foreground)' }}
                  />
                </div>
              </Field>

              <Field label={t.dobLabel} icon={<Calendar size={15} color="var(--primary)" />} error={errors.dob}>
                <input
                  type="date"
                  value={form.dob}
                  onChange={(e) => handleChange('dob', e.target.value)}
                  className="field-input"
                  max={new Date().toISOString().split('T')[0]}
                />
              </Field>
            </div>
          </section>

          {/* Extra space so the last field is above the keyboard on mobile */}
          <div className="h-16" />
        </div>
      </div>

      <style jsx>{`
        .field-input {
          width: 100%;
          padding: 10px 12px;
          font-size: 14px;
          border: 1.5px solid var(--border);
          border-radius: 6px;
          background: #fff;
          color: var(--foreground);
          outline: none;
          transition: border-color 0.1s;
        }
        .field-input:focus {
          border-color: var(--primary);
          box-shadow: 0 0 0 2px rgba(0, 74, 143, 0.12);
        }
        .field-input::placeholder {
          color: var(--muted-foreground);
          opacity: 0.7;
        }
      `}</style>
    </>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--muted-foreground)' }}>
      {children}
    </p>
  );
}

function Field({
  label,
  icon,
  required,
  error,
  children,
}: {
  label: string;
  icon?: React.ReactNode;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: 'var(--foreground)' }}>
        {icon}
        {label}
        {required && <span style={{ color: 'var(--critical)' }}>*</span>}
      </label>
      {children}
      {error && (
        <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--critical)' }}>
          <AlertCircle size={11} />
          {error}
        </div>
      )}
    </div>
  );
}

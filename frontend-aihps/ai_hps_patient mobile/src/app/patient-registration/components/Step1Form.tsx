'use client';
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react';
import { authApi } from '@/lib/api';
import type { RegistrationData } from './RegistrationFlow';

const i18n = {
  fr: {
    title: 'Vos Informations',
    subtitle: 'Étape 1 sur 2 — Remplissez vos données',
    langLabel: 'Langue préférée',
    nameLabel: 'Nom complet',
    namePlaceholder: 'Jean-Paul Kamga',
    emailLabel: 'Adresse email',
    emailHint: 'Un code de vérification sera envoyé à cette adresse',
    phoneLabel: 'Numéro de téléphone',
    phoneHint: 'Optionnel — pour les rappels de rendez-vous',
    phoneOptional: '(optionnel)',
    dobLabel: 'Date de naissance',
    dobOptional: '(optionnel)',
    pwLabel: 'Mot de passe',
    pwPlaceholder: 'Minimum 8 caractères',
    confirmPwLabel: 'Confirmer le mot de passe',
    confirmPwPlaceholder: 'Répétez votre mot de passe',
    submitBtn: 'Continuer',
    sending: 'Envoi du code...',
    alreadyHaveAccount: 'Déjà un compte ?',
    signIn: 'Se connecter',
    pwStrength: { weak: 'Faible', fair: 'Passable', good: 'Bon', strong: 'Fort' },
    errors: {
      nameRequired: 'Nom complet requis (min. 3 caractères)',
      emailInvalid: 'Adresse email invalide',
      phoneTooShort: 'Numéro de téléphone invalide',
      phoneTooLong: 'Trop long',
      pwMin: 'Minimum 8 caractères',
      pwNoMatch: 'Les mots de passe ne correspondent pas',
    },
    serverError: 'Impossible d\'envoyer le code. Veuillez réessayer.',
  },
  en: {
    title: 'Your Information',
    subtitle: 'Step 1 of 2 — Fill in your details',
    langLabel: 'Preferred language',
    nameLabel: 'Full Name',
    namePlaceholder: 'Jean-Paul Kamga',
    emailLabel: 'Email Address',
    emailHint: 'We\'ll send a verification code to this address',
    phoneLabel: 'Phone Number',
    phoneHint: 'Optional — for appointment reminders',
    phoneOptional: '(optional)',
    dobLabel: 'Date of Birth',
    dobOptional: '(optional)',
    pwLabel: 'Password',
    pwPlaceholder: 'Minimum 8 characters',
    confirmPwLabel: 'Confirm Password',
    confirmPwPlaceholder: 'Repeat your password',
    submitBtn: 'Continue',
    sending: 'Sending code...',
    alreadyHaveAccount: 'Already have an account?',
    signIn: 'Sign in',
    pwStrength: { weak: 'Weak', fair: 'Fair', good: 'Good', strong: 'Strong' },
    errors: {
      nameRequired: 'Full name required (min 3 characters)',
      emailInvalid: 'Invalid email address',
      phoneTooShort: 'Invalid phone number',
      phoneTooLong: 'Too long',
      pwMin: 'Minimum 8 characters',
      pwNoMatch: 'Passwords do not match',
    },
    serverError: 'Failed to send verification code. Please try again.',
  },
};

function getStrength(pw: string, t: typeof i18n['en']): { score: number; label: string; color: string } {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  const map = [
    { label: t.pwStrength.weak, color: 'var(--critical)' },
    { label: t.pwStrength.weak, color: 'var(--critical)' },
    { label: t.pwStrength.fair, color: '#E65100' },
    { label: t.pwStrength.good, color: '#F59E0B' },
    { label: t.pwStrength.strong, color: '#2E7D32' },
  ];
  return { score, ...map[score] };
}

export default function Step1Form({ onNext }: { onNext: (data: RegistrationData) => void }) {
  const [lang, setLang] = useState<'fr' | 'en'>('fr');
  const t = i18n[lang];

  const schema = z.object({
    fullName: z.string().min(3, t.errors.nameRequired),
    email: z.string().email(t.errors.emailInvalid),
    phone: z.string().min(9, t.errors.phoneTooShort).max(12, t.errors.phoneTooLong).optional().or(z.literal('')),
    dob: z.string().optional(),
    password: z.string().min(8, t.errors.pwMin),
    confirmPassword: z.string(),
  }).refine((d) => d.password === d.confirmPassword, {
    message: t.errors.pwNoMatch,
    path: ['confirmPassword'],
  });

  type FormData = z.infer<typeof schema>;

  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [pwValue, setPwValue] = useState('');
  const [serverError, setServerError] = useState('');

  const { register, handleSubmit, formState: { errors }, watch, reset } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const watchedPw = watch('password', '');
  const strength = getStrength(watchedPw || pwValue, t);

  const handleLangChange = (newLang: 'fr' | 'en') => {
    setLang(newLang);
    setServerError('');
  };

  const onSubmit = async (data: FormData) => {
    setServerError('');
    setIsLoading(true);
    try {
      await authApi.requestOtp({ email: data.email, purpose: 'register', full_name: data.fullName });
      onNext({
        email: data.email,
        fullName: data.fullName,
        phone: data.phone || '',
        dob: data.dob || '',
        password: data.password,
        language: lang,
      });
    } catch (err: any) {
      setServerError(err.response?.data?.detail || t.serverError);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl shadow-card p-5 mb-6">
      {/* Language selector — shown at the top of the registration form */}
      <div className="flex items-center justify-between mb-4 p-3 rounded-xl" style={{ background: 'var(--muted)' }}>
        <span className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>{t.langLabel}</span>
        <div className="flex rounded-xl overflow-hidden" style={{ border: '1.5px solid var(--border)' }}>
          {(['fr', 'en'] as const).map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => handleLangChange(l)}
              className="px-4 py-1.5 text-sm font-bold transition-all"
              style={{
                background: lang === l ? 'var(--primary)' : '#fff',
                color: lang === l ? '#fff' : 'var(--muted-foreground)',
              }}
            >
              {l === 'fr' ? 'Français' : 'English'}
            </button>
          ))}
        </div>
      </div>

      <h2 className="text-[17px] font-bold mb-1" style={{ color: '#1A2433' }}>{t.title}</h2>
      <p className="text-sm mb-5" style={{ color: '#4A5568' }}>{t.subtitle}</p>

      {serverError && (
        <div
          className="flex items-start gap-2 px-4 py-3 rounded-xl mb-4 border"
          style={{ background: '#FEF2F2', borderColor: '#FCA5A5' }}
        >
          <AlertCircle size={16} color="var(--critical)" className="flex-shrink-0 mt-0.5" />
          <p className="text-xs font-medium" style={{ color: 'var(--critical)' }}>{serverError}</p>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <div>
          <label className="block text-sm font-semibold mb-1.5" style={{ color: '#1A2433' }} htmlFor="su-name">
            {t.nameLabel} <span style={{ color: 'var(--critical)' }}>*</span>
          </label>
          <input id="su-name" type="text" placeholder={t.namePlaceholder} className="input-field" {...register('fullName')} />
          {errors.fullName && <p className="text-xs mt-1 font-medium" style={{ color: 'var(--critical)' }}>{errors.fullName.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-semibold mb-1.5" style={{ color: '#1A2433' }} htmlFor="su-email">
            {t.emailLabel} <span style={{ color: 'var(--critical)' }}>*</span>
          </label>
          <input id="su-email" type="email" placeholder="you@email.com" className="input-field" {...register('email')} />
          <p className="text-[11px] mt-1" style={{ color: '#94A3B8' }}>{t.emailHint}</p>
          {errors.email && <p className="text-xs mt-1 font-medium" style={{ color: 'var(--critical)' }}>{errors.email.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-semibold mb-1.5" style={{ color: '#1A2433' }} htmlFor="su-phone">
            {t.phoneLabel} <span className="text-xs font-normal" style={{ color: '#94A3B8' }}>{t.phoneOptional}</span>
          </label>
          <div className="flex gap-2">
            <div
              className="flex items-center px-3 rounded-xl border font-semibold text-sm flex-shrink-0"
              style={{ background: 'var(--muted)', borderColor: 'var(--border)', color: 'var(--foreground)' }}
            >
              +237
            </div>
            <input id="su-phone" type="tel" placeholder="6XX XXX XXX" className="input-field flex-1" {...register('phone')} />
          </div>
          <p className="text-[11px] mt-1" style={{ color: '#94A3B8' }}>{t.phoneHint}</p>
          {errors.phone && <p className="text-xs mt-1 font-medium" style={{ color: 'var(--critical)' }}>{errors.phone.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-semibold mb-1.5" style={{ color: '#1A2433' }} htmlFor="su-dob">
            {t.dobLabel} <span className="text-xs font-normal" style={{ color: '#94A3B8' }}>{t.dobOptional}</span>
          </label>
          <input id="su-dob" type="date" className="input-field" max={new Date().toISOString().split('T')[0]} {...register('dob')} />
        </div>

        <div>
          <label className="block text-sm font-semibold mb-1.5" style={{ color: '#1A2433' }} htmlFor="su-pw">
            {t.pwLabel} <span style={{ color: 'var(--critical)' }}>*</span>
          </label>
          <div className="relative">
            <input
              id="su-pw"
              type={showPw ? 'text' : 'password'}
              placeholder={t.pwPlaceholder}
              className="input-field pr-12"
              {...register('password', { onChange: (e) => setPwValue(e.target.value) })}
            />
            <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 p-1" onClick={() => setShowPw(!showPw)}>
              {showPw ? <EyeOff size={18} color="#94A3B8" /> : <Eye size={18} color="#94A3B8" />}
            </button>
          </div>
          {(watchedPw || pwValue) && (
            <div className="mt-2">
              <div className="flex gap-1 mb-1">
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={`strength-${i}`}
                    className="flex-1 h-1.5 rounded-full transition-all duration-300"
                    style={{ background: i < strength.score ? strength.color : 'var(--border)' }}
                  />
                ))}
              </div>
              <p className="text-[11px] font-medium text-right" style={{ color: strength.color }}>{strength.label}</p>
            </div>
          )}
          {errors.password && <p className="text-xs mt-1 font-medium" style={{ color: 'var(--critical)' }}>{errors.password.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-semibold mb-1.5" style={{ color: '#1A2433' }} htmlFor="su-confirm">
            {t.confirmPwLabel} <span style={{ color: 'var(--critical)' }}>*</span>
          </label>
          <div className="relative">
            <input
              id="su-confirm"
              type={showConfirm ? 'text' : 'password'}
              placeholder={t.confirmPwPlaceholder}
              className="input-field pr-12"
              {...register('confirmPassword')}
            />
            <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 p-1" onClick={() => setShowConfirm(!showConfirm)}>
              {showConfirm ? <EyeOff size={18} color="#94A3B8" /> : <Eye size={18} color="#94A3B8" />}
            </button>
          </div>
          {errors.confirmPassword && <p className="text-xs mt-1 font-medium" style={{ color: 'var(--critical)' }}>{errors.confirmPassword.message}</p>}
        </div>

        <button type="submit" disabled={isLoading} className="btn-secondary flex items-center justify-center gap-2 mt-2">
          {isLoading ? <><Loader2 size={18} className="animate-spin" /><span>{t.sending}</span></> : t.submitBtn}
        </button>
      </form>

      <p className="text-center text-xs mt-4" style={{ color: '#4A5568' }}>
        {t.alreadyHaveAccount}{' '}
        <a href="/login" className="font-semibold" style={{ color: 'var(--primary)' }}>{t.signIn}</a>
      </p>
    </div>
  );
}

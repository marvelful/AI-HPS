'use client';
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import Link from 'next/link';

const schema = z.object({
  fullName: z.string().min(3, 'Full name required (min 3 characters)'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(9, 'Invalid phone number').max(12, 'Too long').optional().or(z.literal('')),
  dob: z.string().optional(),
  password: z.string().min(8, 'Minimum 8 characters'),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

type FormData = z.infer<typeof schema>;

function getStrength(pw: string): { score: number; label: string; color: string } {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  const map = [
    { label: 'Weak', color: 'var(--critical)' },
    { label: 'Weak', color: 'var(--critical)' },
    { label: 'Fair', color: '#E65100' },
    { label: 'Good', color: '#F59E0B' },
    { label: 'Strong', color: '#2E7D32' },
  ];
  return { score, ...map[score] };
}

export default function SignUpStep1({ onNext }: { onNext: (email: string) => void }) {
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [pwValue, setPwValue] = useState('');

  const { register, handleSubmit, formState: { errors }, watch } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const watchedPw = watch('password', '');
  const strength = getStrength(watchedPw || pwValue);

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    // Backend integration point: POST /api/auth/register step 1, send OTP to email
    await new Promise((r) => setTimeout(r, 1000));
    setIsLoading(false);
    onNext(data.email);
  };

  return (
    <div className="bg-white rounded-3xl shadow-card p-5 mb-6">
      <h2 className="text-[17px] font-bold mb-1" style={{ color: '#1A2433' }}>Your Information</h2>
      <p className="text-sm mb-5" style={{ color: '#4A5568' }}>Step 1 of 2 — Fill in your details</p>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        {/* Full Name */}
        <div>
          <label className="block text-sm font-semibold mb-1.5" style={{ color: '#1A2433' }} htmlFor="su-name">
            Full Name <span style={{ color: 'var(--critical)' }}>*</span>
          </label>
          <input id="su-name" type="text" placeholder="Jean-Paul Kamga" className="input-field" {...register('fullName')} />
          {errors.fullName && <p className="text-xs mt-1 font-medium" style={{ color: 'var(--critical)' }}>{errors.fullName.message}</p>}
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm font-semibold mb-1.5" style={{ color: '#1A2433' }} htmlFor="su-email">
            Email Address <span style={{ color: 'var(--critical)' }}>*</span>
          </label>
          <input id="su-email" type="email" placeholder="you@email.com" className="input-field" {...register('email')} />
          <p className="text-[11px] mt-1" style={{ color: '#94A3B8' }}>We&apos;ll send a verification code to this address</p>
          {errors.email && <p className="text-xs mt-1 font-medium" style={{ color: 'var(--critical)' }}>{errors.email.message}</p>}
        </div>

        {/* Phone */}
        <div>
          <label className="block text-sm font-semibold mb-1.5" style={{ color: '#1A2433' }} htmlFor="su-phone">
            Phone Number <span className="text-xs font-normal" style={{ color: '#94A3B8' }}>(optional)</span>
          </label>
          <div className="flex gap-2">
            <div
              className="flex items-center px-3 rounded-xl border font-semibold text-sm flex-shrink-0"
              style={{ background: 'var(--muted)', borderColor: 'var(--border)', color: 'var(--foreground)' }}
            >
              🇨🇲 +237
            </div>
            <input id="su-phone" type="tel" placeholder="6XX XXX XXX" className="input-field flex-1" {...register('phone')} />
          </div>
          <p className="text-[11px] mt-1" style={{ color: '#94A3B8' }}>Optional — for appointment reminders</p>
          {errors.phone && <p className="text-xs mt-1 font-medium" style={{ color: 'var(--critical)' }}>{errors.phone.message}</p>}
        </div>

        {/* Date of Birth */}
        <div>
          <label className="block text-sm font-semibold mb-1.5" style={{ color: '#1A2433' }} htmlFor="su-dob">
            Date of Birth <span className="text-xs font-normal" style={{ color: '#94A3B8' }}>(optional)</span>
          </label>
          <input id="su-dob" type="date" className="input-field" {...register('dob')} />
        </div>

        {/* Password */}
        <div>
          <label className="block text-sm font-semibold mb-1.5" style={{ color: '#1A2433' }} htmlFor="su-pw">
            Password <span style={{ color: 'var(--critical)' }}>*</span>
          </label>
          <div className="relative">
            <input
              id="su-pw"
              type={showPw ? 'text' : 'password'}
              placeholder="Minimum 8 characters"
              className="input-field pr-12"
              {...register('password', {
                onChange: (e) => setPwValue(e.target.value),
              })}
            />
            <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 p-1" onClick={() => setShowPw(!showPw)}>
              {showPw ? <EyeOff size={18} color="#94A3B8" /> : <Eye size={18} color="#94A3B8" />}
            </button>
          </div>
          {/* Strength Bar */}
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
              <p className="text-[11px] font-medium text-right" style={{ color: strength.color }}>
                {strength.label}
              </p>
            </div>
          )}
          {errors.password && <p className="text-xs mt-1 font-medium" style={{ color: 'var(--critical)' }}>{errors.password.message}</p>}
        </div>

        {/* Confirm Password */}
        <div>
          <label className="block text-sm font-semibold mb-1.5" style={{ color: '#1A2433' }} htmlFor="su-confirm">
            Confirm Password <span style={{ color: 'var(--critical)' }}>*</span>
          </label>
          <div className="relative">
            <input
              id="su-confirm"
              type={showConfirm ? 'text' : 'password'}
              placeholder="Repeat your password"
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
          {isLoading ? <><Loader2 size={18} className="animate-spin" /><span>Sending code…</span></> : 'Continue →'}
        </button>
      </form>

      <p className="text-center text-xs mt-4" style={{ color: '#4A5568' }}>
        Already have an account?{' '}
        <Link href="/signin-signup/sign-in" className="font-semibold" style={{ color: 'var(--primary)' }}>
          Sign in
        </Link>
      </p>
    </div>
  );
}

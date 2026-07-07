'use client';
import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, CheckCircle } from 'lucide-react';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import type { RegistrationData } from './RegistrationFlow';

interface Props {
  formData: RegistrationData;
  onBack: () => void;
}

export default function Step2OTP({ formData, onBack }: Props) {
  const router = useRouter();
  const { login } = useAuthStore();
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');
  const [cooldown, setCooldown] = useState(60);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const handleChange = (idx: number, val: string) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...otp];
    next[idx] = val;
    setOtp(next);
    if (val && idx < 5) inputRefs.current[idx + 1]?.focus();
    if (next.every((d) => d !== '')) handleVerify(next.join(''));
  };

  const handleKeyDown = (idx: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[idx] && idx > 0) {
      inputRefs.current[idx - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      const digits = pasted.split('');
      setOtp(digits);
      inputRefs.current[5]?.focus();
      handleVerify(pasted);
    }
  };

  const handleVerify = async (code: string) => {
    setIsLoading(true);
    setError('');
    try {
      const data = await authApi.register({
        full_name: formData.fullName,
        email: formData.email,
        phone: formData.phone || undefined,
        date_of_birth: formData.dob || undefined,
        password: formData.password,
        otp_code: code,
      });
      login({
        id: data.user.id,
        name: data.user.full_name,
        email: data.user.email,
        phone: data.user.phone || '',
        dob: data.user.date_of_birth || '',
        language: formData.language ?? (data.user.language === 'en' ? 'en' : 'fr'),
      }, data.access_token);
      setIsSuccess(true);
      setTimeout(() => router.push('/home'), 1500);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Incorrect code. Please try again.');
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0) return;
    try {
      await authApi.requestOtp({ email: formData.email, purpose: 'register', full_name: formData.fullName });
      setCooldown(60);
    } catch {
      setCooldown(60);
    }
  };

  if (isSuccess) {
    return (
      <div className="bg-white rounded-3xl shadow-card p-8 mb-6 flex flex-col items-center text-center">
        <div className="w-20 h-20 rounded-full flex items-center justify-center mb-4" style={{ background: '#F0FDF4' }}>
          <CheckCircle size={48} color="var(--safe)" strokeWidth={1.5} />
        </div>
        <h2 className="text-[19px] font-bold mb-2" style={{ color: '#1A2433' }}>Account Created!</h2>
        <p className="text-sm mb-4" style={{ color: '#4A5568' }}>
          Welcome to AI-HPS. Redirecting to your patient dashboard...
        </p>
        <Loader2 size={20} className="animate-spin mx-auto" color="var(--primary)" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl shadow-card p-5 mb-6">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm font-semibold mb-5"
        style={{ color: 'var(--primary)' }}
      >
        <ArrowLeft size={16} />
        Back
      </button>

      <h2 className="text-[17px] font-bold mb-1" style={{ color: '#1A2433' }}>Verify Your Email</h2>
      <p className="text-sm mb-1" style={{ color: '#4A5568' }}>
        Enter the 6-digit code sent to
      </p>
      <p className="text-sm font-bold mb-6" style={{ color: 'var(--primary)' }}>{formData.email}</p>

      {/* OTP Boxes */}
      <div className="flex gap-2 justify-center mb-5" onPaste={handlePaste}>
        {otp.map((digit, i) => (
          <input
            key={`otp-${i}`}
            ref={(el) => { inputRefs.current[i] = el; }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            className="w-11 h-14 text-center text-xl font-bold rounded-xl border-2 transition-all duration-150 focus:outline-none"
            style={{
              borderColor: digit ? 'var(--primary)' : 'var(--border)',
              background: digit ? 'var(--primary-light)' : 'white',
              color: 'var(--foreground)',
            }}
            disabled={isLoading}
            aria-label={`OTP digit ${i + 1}`}
          />
        ))}
      </div>

      {error && (
        <p className="text-center text-xs font-semibold mb-4" style={{ color: 'var(--critical)' }}>{error}</p>
      )}

      {isLoading && (
        <div className="flex items-center justify-center gap-2 mb-4">
          <Loader2 size={18} className="animate-spin" color="var(--primary)" />
          <span className="text-sm" style={{ color: '#4A5568' }}>Verifying...</span>
        </div>
      )}

      <div className="text-center mb-5">
        <p className="text-[13px] mb-2" style={{ color: '#4A5568' }}>{"Didn't receive it?"}</p>
        <button
          onClick={handleResend}
          disabled={cooldown > 0}
          className="text-sm font-semibold py-2 px-4 rounded-xl transition-all duration-150"
          style={{
            color: cooldown > 0 ? '#94A3B8' : 'var(--primary)',
            background: cooldown > 0 ? 'transparent' : 'var(--primary-light)',
          }}
        >
          {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend Code'}
        </button>
      </div>

      <button
        onClick={() => {
          const code = otp.join('');
          if (code.length === 6) handleVerify(code);
        }}
        disabled={otp.join('').length < 6 || isLoading}
        className="btn-primary flex items-center justify-center gap-2"
      >
        {isLoading ? (
          <><Loader2 size={18} className="animate-spin" /><span>Creating your account...</span></>
        ) : (
          'Verify & Create Account'
        )}
      </button>
    </div>
  );
}

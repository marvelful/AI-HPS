'use client';
import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Eye, EyeOff, ChevronDown, Loader2, CheckCircle, ArrowLeft, Cross } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

type Language = 'en' | 'fr';
type Step = 'form' | 'otp' | 'success';

interface FormValues {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  language: Language;
  terms: boolean;
}

const INITIAL: FormValues = {
  firstName: '', lastName: '', email: '', phone: '',
  password: '', confirmPassword: '', language: 'en', terms: false,
};

export default function SignUpPage() {
  const router = useRouter();
  const { login } = useAuthStore();
  const [step, setStep] = useState<Step>('form');
  const [values, setValues] = useState<FormValues>(INITIAL);
  const [showPw, setShowPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // OTP state
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [cooldown, setCooldown] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const set = (field: keyof FormValues, value: any) =>
    setValues(prev => ({ ...prev, [field]: value }));

  const fullName = `${values.firstName} ${values.lastName}`.trim();

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!values.firstName || !values.lastName || !values.email || !values.password) {
      setError('Please fill in all required fields.');
      return;
    }
    if (values.password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (values.password !== values.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (!values.terms) {
      setError('Please accept the Terms of Service and Privacy Policy.');
      return;
    }
    setIsLoading(true);
    try {
      await authApi.requestOtp({ email: values.email, purpose: 'register', full_name: fullName });
      setCooldown(60);
      setStep('otp');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Could not send verification code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpChange = (idx: number, val: string) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...otp];
    next[idx] = val;
    setOtp(next);
    if (val && idx < 5) inputRefs.current[idx + 1]?.focus();
    if (next.every(d => d !== '')) handleVerify(next.join(''));
  };

  const handleOtpKeyDown = (idx: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[idx] && idx > 0)
      inputRefs.current[idx - 1]?.focus();
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      setOtp(pasted.split(''));
      inputRefs.current[5]?.focus();
      handleVerify(pasted);
    }
  };

  const handleVerify = async (code: string) => {
    setIsLoading(true);
    setError('');
    try {
      const res = await authApi.register({
        full_name: fullName,
        email: values.email,
        phone: values.phone || undefined,
        password: values.password,
        otp_code: code,
      });
      login(
        {
          id: res.user.id,
          name: res.user.full_name,
          email: res.user.email,
          phone: res.user.phone || '',
          dob: res.user.date_of_birth || '',
          language: values.language,
        },
        res.access_token,
      );
      setStep('success');
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
      await authApi.requestOtp({ email: values.email, purpose: 'register', full_name: fullName });
      setCooldown(60);
    } catch {
      setCooldown(60);
    }
  };

  if (step === 'success') {
    return (
      <div className="auth-container">
        <div className="auth-form-wrapper flex flex-col items-center text-center py-12">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mb-6" style={{ background: '#F0FDF4' }}>
            <CheckCircle size={48} color="var(--safe)" strokeWidth={1.5} aria-hidden="true" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Account Created!</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Welcome to AI-HPS. Redirecting to your patient dashboard…
          </p>
          <Loader2 size={20} className="animate-spin" color="var(--primary)" aria-hidden="true" />
        </div>
      </div>
    );
  }

  if (step === 'otp') {
    return (
      <div className="auth-container">
        <div className="auth-form-wrapper">
          <div className="mb-10">
            <button
              onClick={() => setStep('form')}
              className="inline-flex items-center gap-2 text-sm text-primary font-medium mb-10 hover:text-primary-hover transition-colors"
            >
              <ArrowLeft size={16} aria-hidden="true" /> Back
            </button>
            <h1 className="text-[1.75rem] font-bold text-foreground tracking-tight mb-2">Verify Your Email</h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Enter the 6-digit code sent to{' '}
              <span className="font-semibold text-foreground">{values.email}</span>
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200">
              <p className="text-xs font-medium text-red-600">{error}</p>
            </div>
          )}

          <div className="flex gap-2 justify-center mb-6" onPaste={handleOtpPaste}>
            {otp.map((digit, i) => (
              <input
                key={i}
                ref={el => { inputRefs.current[i] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={e => handleOtpChange(i, e.target.value)}
                onKeyDown={e => handleOtpKeyDown(i, e)}
                className="w-12 h-14 text-center text-xl font-bold rounded-xl border-2 transition-all focus:outline-none"
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

          <div className="text-center mb-5">
            <p className="text-xs text-muted-foreground mb-2">{"Didn't receive it?"}</p>
            <button
              onClick={handleResend}
              disabled={cooldown > 0}
              className="text-sm font-semibold py-2 px-4 rounded-xl transition-colors disabled:opacity-50"
              style={{ color: cooldown > 0 ? 'var(--muted-foreground)' : 'var(--primary)' }}
            >
              {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend Code'}
            </button>
          </div>

          <button
            onClick={() => { const code = otp.join(''); if (code.length === 6) handleVerify(code); }}
            disabled={otp.join('').length < 6 || isLoading}
            className="btn-primary w-full py-3.5 text-base"
            style={{ minHeight: 52 }}
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 size={18} className="animate-spin" aria-hidden="true" /> Verifying…
              </span>
            ) : 'Verify & Create Account'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <div className="auth-form-wrapper">
        {/* Logo & heading */}
        <div className="mb-5">
          <Link href="/" className="inline-flex items-center gap-2.5 mb-5">
            <Cross size={28} className="text-primary flex-shrink-0" strokeWidth={2} />
            <div className="flex flex-col leading-none">
              <span className="text-sm font-bold text-foreground">AI-HPS</span>
            </div>
          </Link>

          {/* Hospital image */}
          <div className="mb-5 w-full rounded-xl overflow-hidden" style={{ height: 200 }}>
            <Image
              src="/assets/images/HGD.jpeg"
              width={1451}
              height={676}
              alt="Hôpital Général de Douala"
              className="w-full h-full object-cover object-top"
              quality={100}
              priority
            />
          </div>

          <h1 className="text-[1.75rem] font-bold text-foreground tracking-tight mb-2">Create your account</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Create an account to access AI-powered hospital guidance, navigation, and personalized assistance.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200">
            <p className="text-xs font-medium text-red-600">{error}</p>
          </div>
        )}

        <form onSubmit={handleFormSubmit} noValidate className="flex flex-col gap-5">
          {/* First + Last name */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="firstName" className="label-base">First Name</label>
              <input
                id="firstName" type="text" autoComplete="given-name"
                placeholder="Jean" className="input-base" name="firstName"
                value={values.firstName} onChange={e => set('firstName', e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="lastName" className="label-base">Last Name</label>
              <input
                id="lastName" type="text" autoComplete="family-name"
                placeholder="Mbarga" className="input-base" name="lastName"
                value={values.lastName} onChange={e => set('lastName', e.target.value)}
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label htmlFor="email" className="label-base">Email Address</label>
            <input
              id="email" type="email" autoComplete="email"
              placeholder="you@email.com" className="input-base" name="email"
              value={values.email} onChange={e => set('email', e.target.value)}
            />
          </div>

          {/* Phone */}
          <div>
            <label htmlFor="phone" className="label-base">Phone Number</label>
            <p className="text-xs text-muted-foreground mb-2">Cameroonian number starting with +237</p>
            <input
              id="phone" type="tel" autoComplete="tel"
              placeholder="+237 6XX XXX XXX" className="input-base" name="phone"
              value={values.phone} onChange={e => set('phone', e.target.value)}
            />
          </div>

          {/* Password */}
          <div>
            <label htmlFor="password" className="label-base">Password</label>
            <p className="text-xs text-muted-foreground mb-2">Minimum 8 characters, at least one number.</p>
            <div className="relative">
              <input
                id="password" type={showPw ? 'text' : 'password'} autoComplete="new-password"
                placeholder="Create a strong password" className="input-base pr-12" name="password"
                value={values.password} onChange={e => set('password', e.target.value)}
              />
              <button
                type="button"
                className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Show password"
                onClick={() => setShowPw(v => !v)}
              >
                {showPw ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div>
            <label htmlFor="confirmPassword" className="label-base">Confirm Password</label>
            <div className="relative">
              <input
                id="confirmPassword" type={showConfirmPw ? 'text' : 'password'} autoComplete="new-password"
                placeholder="Repeat your password" className="input-base pr-12" name="confirmPassword"
                value={values.confirmPassword} onChange={e => set('confirmPassword', e.target.value)}
              />
              <button
                type="button"
                className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Show confirm password"
                onClick={() => setShowConfirmPw(v => !v)}
              >
                {showConfirmPw ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
              </button>
            </div>
          </div>

          {/* Language */}
          <div>
            <label htmlFor="language" className="label-base">Preferred Language</label>
            <p className="text-xs text-muted-foreground mb-2">AI-HPS will respond in your chosen language.</p>
            <div className="relative">
              <select
                id="language"
                className="input-base appearance-none pr-10 cursor-pointer"
                name="language"
                value={values.language}
                onChange={e => set('language', e.target.value as Language)}
              >
                <option value="en">English</option>
                <option value="fr">Français</option>
              </select>
              <ChevronDown
                size={16}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                aria-hidden="true"
              />
            </div>
          </div>

          {/* Terms */}
          <div>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                className="mt-0.5 w-4 h-4 rounded border-border accent-primary flex-shrink-0 cursor-pointer"
                name="terms"
                checked={values.terms}
                onChange={e => set('terms', e.target.checked)}
              />
              <span className="text-sm text-muted-foreground leading-relaxed">
                I agree to the{' '}
                <a href="#" className="text-primary hover:text-primary-hover font-medium transition-colors">Terms of Service</a>
                {' '}and{' '}
                <a href="#" className="text-primary hover:text-primary-hover font-medium transition-colors">Privacy Policy</a>.
                {' '}AI-HPS data is handled in accordance with Cameroonian health data regulations.
              </span>
            </label>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="btn-primary w-full py-3.5 text-base mt-1"
            style={{ minHeight: 52 }}
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 size={18} className="animate-spin" aria-hidden="true" /> Sending code…
              </span>
            ) : 'Create Account'}
          </button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link
              href="/sign-in"
              className="text-primary font-semibold hover:text-primary-hover transition-colors"
            >
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

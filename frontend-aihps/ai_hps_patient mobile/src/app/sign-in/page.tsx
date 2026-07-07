'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Eye, EyeOff, Loader2, Cross } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

export default function SignInPage() {
  const router = useRouter();
  const { login } = useAuthStore();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier || !password) {
      setError('Please enter your email/phone and password.');
      return;
    }
    setError('');
    setIsLoading(true);
    try {
      const res = await authApi.login({ email: identifier, password });
      login(
        {
          id: res.user.id,
          name: res.user.full_name,
          email: res.user.email,
          phone: res.user.phone || '',
          dob: res.user.date_of_birth || '',
          language: 'fr',
        },
        res.access_token,
      );
      router.push('/home');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Invalid credentials — please check your details.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-form-wrapper">
        {/* Logo & heading */}
        <div className="mb-6">
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

          <h1 className="text-[1.75rem] font-bold text-foreground tracking-tight mb-2">Sign In</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Sign in to access your AI-HPS patient account.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200">
            <p className="text-xs font-medium text-red-600">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
          {/* Identifier */}
          <div>
            <label htmlFor="identifier" className="label-base">Email or Phone Number</label>
            <p className="text-xs text-muted-foreground mb-2">
              Enter your email address or Cameroon phone number (+237…)
            </p>
            <input
              id="identifier"
              type="text"
              autoComplete="username"
              placeholder="you@email.com or +237 6XX XXX XXX"
              className="input-base"
              name="identifier"
              value={identifier}
              onChange={e => setIdentifier(e.target.value)}
            />
          </div>

          {/* Password */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="password" className="label-base mb-0">Password</label>
              <a
                href="#"
                className="text-xs text-primary hover:text-primary-hover transition-colors font-medium"
              >
                Forgot password?
              </a>
            </div>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="Enter your password"
                className="input-base pr-12"
                name="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
              <button
                type="button"
                className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground transition-colors"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                onClick={() => setShowPassword(v => !v)}
              >
                {showPassword
                  ? <EyeOff size={16} aria-hidden="true" />
                  : <Eye size={16} aria-hidden="true" />}
              </button>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading}
            className="btn-primary w-full py-3.5 text-base mt-1"
            style={{ minHeight: 52 }}
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 size={18} className="animate-spin" aria-hidden="true" />
                Signing in…
              </span>
            ) : 'Sign In'}
          </button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-sm text-muted-foreground">
            Don&apos;t have an account?{' '}
            <Link
              href="/sign-up"
              className="text-primary font-semibold hover:text-primary-hover transition-colors"
            >
              Sign Up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

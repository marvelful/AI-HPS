'use client';
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Eye, EyeOff, Mail, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';

interface LoginFormData {
  email: string;
  password: string;
  rememberMe: boolean;
}

export default function StaffLoginForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { setAuth } = useAuthStore();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<LoginFormData>({ defaultValues: { rememberMe: false } });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    try {
      const result = await authApi.login({ email: data.email, password: data.password });
      setAuth(result.user, result.access_token);
      toast.success(`Welcome back, ${result.user.full_name}!`);
      const role = result.user.role;
      if (role === 'admin' || role === 'super_admin') {
        router.push('/');
      } else {
        router.push('/ai-assistant');
      }
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      setError('root', {
        message: typeof detail === 'string' ? detail : 'Invalid credentials — please check your email and password',
      });
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
      {/* Email */}
      <div className="flex flex-col gap-1.5">
        <label className="font-medium text-foreground" style={{ fontSize: '13px' }}>Email Address</label>
        <div className="relative">
          <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="email"
            {...register('email', {
              required: 'Email is required',
              pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Enter a valid email address' },
            })}
            placeholder="dr.name@hgd-douala.cm"
            className="w-full pl-9 pr-4 py-2.5 border border-border rounded-xl bg-card text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
            style={{ fontSize: '14px' }}
          />
        </div>
        {errors.email && (
          <p className="text-clinical-red" style={{ fontSize: '12px' }}>{errors.email.message}</p>
        )}
      </div>

      {/* Password */}
      <div className="flex flex-col gap-1.5">
        <label className="font-medium text-foreground" style={{ fontSize: '13px' }}>Password</label>
        <div className="relative">
          <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type={showPassword ? 'text' : 'password'}
            {...register('password', {
              required: 'Password is required',
              minLength: { value: 6, message: 'Password must be at least 6 characters' },
            })}
            placeholder="Enter your password"
            className="w-full pl-9 pr-10 py-2.5 border border-border rounded-xl bg-card text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
            style={{ fontSize: '14px' }}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>
        {errors.password && (
          <p className="text-clinical-red" style={{ fontSize: '12px' }}>{errors.password.message}</p>
        )}
      </div>

      {/* Remember me + Forgot */}
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            {...register('rememberMe')}
            className="w-4 h-4 rounded border-border text-primary focus:ring-primary/30"
          />
          <span className="text-muted-foreground" style={{ fontSize: '13px' }}>Remember me</span>
        </label>
        <a href="/forgot-password" className="text-primary hover:text-primary-hover transition-colors" style={{ fontSize: '13px' }}>
          Forgot password?
        </a>
      </div>

      {/* Root error */}
      {errors.root && (
        <div className="px-3 py-2.5 rounded-xl bg-clinical-red-bg border border-clinical-red/30">
          <p className="text-clinical-red" style={{ fontSize: '13px' }}>{errors.root.message}</p>
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={isLoading}
        className="w-full h-11 rounded-xl bg-primary text-white font-semibold hover:bg-primary-hover disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-150 active:scale-95 flex items-center justify-center gap-2"
        style={{ fontSize: '15px' }}
      >
        {isLoading ? (
          <>
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Signing in…
          </>
        ) : (
          'Sign In'
        )}
      </button>

      {/* Need help */}
      <div className="text-center">
        <a href="#" className="text-muted-foreground hover:text-foreground transition-colors" style={{ fontSize: '13px' }}>
          Need help? Contact IT Support
        </a>
      </div>
    </form>
  );
}

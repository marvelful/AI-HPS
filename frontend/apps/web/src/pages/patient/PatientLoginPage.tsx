import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, AlertCircle, Loader2, Sparkles, Mail, Lock, UserPlus } from 'lucide-react'
import { authApi } from '@/lib/api'
import { useAuthStore } from '@/stores/auth.store'

const schema = z.object({
  email:    z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})
type FormData = z.infer<typeof schema>

const DEMO_EMAIL = 'jean-paul.kamga@gmail.com'
const DEMO_PASSWORD = 'HGD@2026!'

export default function PatientLoginPage() {
  const { setAuth } = useAuthStore()
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)
  const [serverError, setServerError] = useState('')

  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    setServerError('')
    try {
      const res = await authApi.login(data)
      setAuth(res.user, res.access_token)
      navigate('/patient/home')
    } catch (e: any) {
      setServerError(e?.response?.data?.detail ?? 'Invalid credentials. Please try again.')
    }
  }

  const fillDemo = () => {
    setValue('email', DEMO_EMAIL)
    setValue('password', DEMO_PASSWORD)
  }

  return (
    <div className="mobile-container min-h-screen flex flex-col" style={{ background: 'var(--background)' }}>
      {/* Gradient Header */}
      <div
        className="px-6 pt-14 pb-20 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #0a1628 0%, #004A8F 60%, #0062B8 100%)' }}
      >
        <div
          className="absolute -top-10 -right-10 w-48 h-48 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #E8620A, transparent)' }}
        />
        <div className="flex flex-col items-center text-center relative">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: 'rgba(255,255,255,0.12)' }}
          >
            <Sparkles size={28} color="white" />
          </div>
          <h1 className="text-white text-2xl font-extrabold">AI-HPS Patient</h1>
          <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.65)' }}>
            Hôpital Général de Douala
          </p>
        </div>
      </div>

      {/* White Card */}
      <div className="flex-1 px-5 -mt-8 relative z-10 pb-8">
        <div className="bg-white rounded-3xl shadow-card p-6">
          <h2 className="text-[19px] font-bold mb-1" style={{ color: '#1A2433' }}>Welcome back</h2>
          <p className="text-sm mb-6" style={{ color: '#4A5568' }}>Sign in to your HGD account</p>

          {serverError && (
            <div
              className="flex items-start gap-2 px-4 py-3 rounded-xl mb-5 border"
              style={{ background: '#FEF2F2', borderColor: '#FCA5A5' }}
            >
              <AlertCircle size={16} color="var(--critical)" className="flex-shrink-0 mt-0.5" />
              <p className="text-xs font-medium" style={{ color: 'var(--critical)' }}>{serverError}</p>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-sm font-semibold mb-1.5" style={{ color: '#1A2433' }}>
                Email Address
              </label>
              <div className="relative">
                <Mail size={16} color="#94A3B8" className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="email"
                  autoComplete="email"
                  placeholder="you@email.com"
                  className="input-field pl-10"
                  {...register('email')}
                />
              </div>
              {errors.email && (
                <p className="text-xs mt-1.5 font-medium" style={{ color: 'var(--critical)' }}>
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-semibold mb-1.5" style={{ color: '#1A2433' }}>
                Password
              </label>
              <div className="relative">
                <Lock size={16} color="#94A3B8" className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="input-field pl-10 pr-12"
                  {...register('password')}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword
                    ? <EyeOff size={18} color="#94A3B8" />
                    : <Eye size={18} color="#94A3B8" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs mt-1.5 font-medium" style={{ color: 'var(--critical)' }}>
                  {errors.password.message}
                </p>
              )}
            </div>

            <div className="flex justify-end">
              <Link to="/forgot-password" className="text-sm font-semibold" style={{ color: 'var(--primary)' }}>
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <><Loader2 size={18} className="animate-spin" /><span>Signing in…</span></>
              ) : 'Sign In'}
            </button>
          </form>

          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px" style={{ background: '#E2E8F0' }} />
            <span className="text-xs font-medium" style={{ color: '#94A3B8' }}>or</span>
            <div className="flex-1 h-px" style={{ background: '#E2E8F0' }} />
          </div>

          <Link to="/register" className="btn-outline flex items-center justify-center gap-2">
            <UserPlus size={18} color="var(--primary)" />
            Create a new account
          </Link>

          {/* Demo credentials */}
          <button
            type="button"
            onClick={fillDemo}
            className="mt-5 p-4 rounded-xl border w-full text-left cursor-pointer hover:opacity-80 transition-opacity"
            style={{ background: 'var(--primary-light)', borderColor: 'rgba(0,74,143,0.2)' }}
          >
            <p className="text-xs font-bold mb-2" style={{ color: 'var(--primary)' }}>Demo account (tap to fill):</p>
            <p className="text-xs font-medium" style={{ color: 'var(--primary)' }}>📧 {DEMO_EMAIL}</p>
            <p className="text-xs font-medium mt-1" style={{ color: 'var(--primary)' }}>🔑 {DEMO_PASSWORD}</p>
          </button>
        </div>

        <p className="text-center text-xs mt-5" style={{ color: '#94A3B8' }}>
          For hospital staff:{' '}
          <a href="http://localhost:3002/login" className="font-semibold" style={{ color: 'var(--primary)' }}>
            Staff portal →
          </a>
        </p>
      </div>
    </div>
  )
}

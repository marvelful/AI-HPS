import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, Loader2, ArrowLeft, Sparkles, CheckCircle } from 'lucide-react'
import { authApi } from '@/lib/api'
import { useAuthStore } from '@/stores/auth.store'

// ── Password strength ──────────────────────────────────────────────────────

function getStrength(pw: string): { score: number; label: string; color: string } {
  let score = 0
  if (pw.length >= 8) score++
  if (/[A-Z]/.test(pw)) score++
  if (/[0-9]/.test(pw)) score++
  if (/[^A-Za-z0-9]/.test(pw)) score++
  const map = [
    { label: 'Weak',   color: 'var(--critical)' },
    { label: 'Weak',   color: 'var(--critical)' },
    { label: 'Fair',   color: '#E65100' },
    { label: 'Good',   color: '#F59E0B' },
    { label: 'Strong', color: 'var(--safe)' },
  ]
  return { score, ...map[score] }
}

// ── Form schema ────────────────────────────────────────────────────────────

const schema = z.object({
  fullName: z.string().min(3, 'Full name required (min 3 characters)'),
  email:    z.string().email('Invalid email address'),
  phone:    z.string().min(9, 'Invalid phone number').max(12, 'Too long').optional().or(z.literal('')),
  dob:      z.string().optional(),
  password:        z.string().min(8, 'Minimum 8 characters'),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})
type FormData = z.infer<typeof schema>

// ── OTP verification step ──────────────────────────────────────────────────

function OtpStep({
  email,
  formData,
  onBack,
}: {
  email: string
  formData: FormData
  onBack: () => void
}) {
  const { setAuth } = useAuthStore()
  const navigate = useNavigate()
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState('')
  const [cooldown, setCooldown] = useState(60)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    if (cooldown <= 0) return
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  const handleChange = (idx: number, val: string) => {
    if (!/^\d?$/.test(val)) return
    const next = [...otp]
    next[idx] = val
    setOtp(next)
    if (val && idx < 5) inputRefs.current[idx + 1]?.focus()
    if (next.every((d) => d !== '')) handleVerify(next.join(''))
  }

  const handleKeyDown = (idx: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[idx] && idx > 0) {
      inputRefs.current[idx - 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (pasted.length === 6) {
      const digits = pasted.split('')
      setOtp(digits)
      inputRefs.current[5]?.focus()
      handleVerify(pasted)
    }
  }

  const handleVerify = async (code: string) => {
    setIsLoading(true)
    setError('')
    try {
      const res = await authApi.register({
        full_name:     formData.fullName,
        email:         formData.email,
        phone:         formData.phone || undefined,
        date_of_birth: formData.dob || undefined,
        password:      formData.password,
        otp_code:      code,
      })
      setAuth(res.user, res.access_token)
      setIsSuccess(true)
      setTimeout(() => navigate('/patient/home'), 1500)
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? 'Incorrect code. Please try again.')
      setOtp(['', '', '', '', '', ''])
      inputRefs.current[0]?.focus()
    } finally {
      setIsLoading(false)
    }
  }

  const handleResend = async () => {
    if (cooldown > 0) return
    try {
      await authApi.requestOtp({ email, purpose: 'register', full_name: formData.fullName })
      setCooldown(60)
      setOtp(['', '', '', '', '', ''])
      inputRefs.current[0]?.focus()
    } catch {
      // silently fail resend
    }
  }

  if (isSuccess) {
    return (
      <div className="mobile-container min-h-screen flex flex-col items-center justify-center px-5"
        style={{ background: 'var(--background)' }}>
        <div className="bg-white rounded-3xl shadow-card p-8 w-full flex flex-col items-center text-center">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mb-4" style={{ background: '#F0FDF4' }}>
            <CheckCircle size={48} color="var(--safe)" strokeWidth={1.5} />
          </div>
          <h2 className="text-[19px] font-bold mb-2" style={{ color: '#1A2433' }}>Account Created!</h2>
          <p className="text-sm mb-4" style={{ color: '#4A5568' }}>
            Welcome to AI-HPS. Redirecting to your dashboard…
          </p>
          <Loader2 size={20} className="animate-spin mx-auto" color="var(--primary)" />
        </div>
      </div>
    )
  }

  return (
    <div className="mobile-container min-h-screen flex flex-col" style={{ background: 'var(--background)' }}>
      {/* Gradient Header */}
      <div
        className="px-5 pt-12 pb-20 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #0a1628 0%, #004A8F 60%, #0062B8 100%)' }}
      >
        <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #E8620A, transparent)' }} />
        <div className="flex items-center gap-3 mb-6 relative">
          <button
            onClick={onBack}
            className="w-9 h-9 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.12)' }}
          >
            <ArrowLeft size={18} color="white" />
          </button>
          <div className="flex items-center gap-2">
            <Sparkles size={18} color="#E8620A" />
            <span className="text-white font-extrabold text-lg">AI-HPS Patient</span>
          </div>
        </div>
        <h1 className="text-white text-2xl font-extrabold relative mb-1">Verify Email</h1>
        <p className="text-sm relative" style={{ color: 'rgba(255,255,255,0.65)' }}>
          Step 2 of 2 — Enter the code sent to you
        </p>
      </div>

      <div className="px-5 -mt-8 relative z-10 pb-8">
        <div className="bg-white rounded-3xl shadow-card p-5 mb-6">
          <h2 className="text-[17px] font-bold mb-1" style={{ color: '#1A2433' }}>Verify Your Email</h2>
          <p className="text-sm mb-1" style={{ color: '#4A5568' }}>6-digit code sent to</p>
          <p className="text-sm font-bold mb-6" style={{ color: 'var(--primary)' }}>{email}</p>

          <div className="flex gap-2 justify-center mb-5" onPaste={handlePaste}>
            {otp.map((digit, i) => (
              <input
                key={`otp-${i}`}
                ref={(el) => { inputRefs.current[i] = el }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                className="w-11 h-14 text-center text-xl font-bold rounded-xl border-2 transition-all duration-150 focus:outline-none"
                style={{
                  borderColor: digit ? 'var(--primary)' : 'var(--border)',
                  background:  digit ? 'var(--primary-light)' : 'white',
                  color:       'var(--foreground)',
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
              <span className="text-sm" style={{ color: '#4A5568' }}>Verifying…</span>
            </div>
          )}

          <div className="text-center mb-5">
            <p className="text-[13px] mb-2" style={{ color: '#4A5568' }}>Didn't receive it?</p>
            <button
              onClick={handleResend}
              disabled={cooldown > 0}
              className="text-sm font-semibold py-2 px-4 rounded-xl transition-all duration-150"
              style={{
                color:      cooldown > 0 ? '#94A3B8' : 'var(--primary)',
                background: cooldown > 0 ? 'transparent' : 'var(--primary-light)',
              }}
            >
              {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend Code'}
            </button>
          </div>

          <button
            onClick={() => { const code = otp.join(''); if (code.length === 6) handleVerify(code) }}
            disabled={otp.join('').length < 6 || isLoading}
            className="btn-primary flex items-center justify-center gap-2"
          >
            {isLoading
              ? <><Loader2 size={18} className="animate-spin" /><span>Creating your account…</span></>
              : 'Verify & Create Account'}
          </button>

          <p className="text-center text-[11px] mt-4" style={{ color: '#94A3B8' }}>
            Demo code: <span className="font-bold">123456</span> (any code works in demo mode)
          </p>
        </div>
      </div>
    </div>
  )
}

// ── Main registration component ────────────────────────────────────────────

export default function PatientRegisterPage() {
  const [step, setStep] = useState<1 | 2>(1)
  const [stepOneData, setStepOneData] = useState<FormData | null>(null)
  const [serverError, setServerError] = useState('')
  const [pwValue, setPwValue] = useState('')

  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const watchedPw = watch('password', '')
  const strength = getStrength(watchedPw || pwValue)

  const [showPw, setShowPw] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const onSubmit = async (data: FormData) => {
    setServerError('')
    try {
      await authApi.requestOtp({ email: data.email, purpose: 'register', full_name: data.fullName })
      setStepOneData(data)
      setStep(2)
    } catch (e: any) {
      setServerError(e?.response?.data?.detail ?? 'Failed to send verification code. Please try again.')
    }
  }

  if (step === 2 && stepOneData) {
    return (
      <OtpStep
        email={stepOneData.email}
        formData={stepOneData}
        onBack={() => setStep(1)}
      />
    )
  }

  return (
    <div className="mobile-container min-h-screen flex flex-col" style={{ background: 'var(--background)' }}>
      {/* Gradient Header */}
      <div
        className="px-5 pt-12 pb-20 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #0a1628 0%, #004A8F 60%, #0062B8 100%)' }}
      >
        <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #E8620A, transparent)' }} />

        <div className="flex items-center gap-3 mb-6 relative">
          <Link
            to="/login"
            className="w-9 h-9 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.12)' }}
          >
            <ArrowLeft size={18} color="white" />
          </Link>
          <div className="flex items-center gap-2">
            <Sparkles size={18} color="#E8620A" />
            <span className="text-white font-extrabold text-lg">AI-HPS Patient</span>
          </div>
        </div>

        <h1 className="text-white text-2xl font-extrabold relative mb-1">Create Account</h1>
        <p className="text-sm relative mb-6" style={{ color: 'rgba(255,255,255,0.65)' }}>
          Hôpital Général de Douala
        </p>

        {/* Step progress */}
        <div className="flex items-center gap-3 relative">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold bg-white" style={{ color: 'var(--primary)' }}>
              1
            </div>
            <span className="text-white text-xs font-medium">Your Info</span>
          </div>
          <div className="flex-1 h-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.3)' }} />
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: 'rgba(255,255,255,0.2)', color: 'white' }}>
              2
            </div>
            <span className="text-white text-xs font-medium">Verify Email</span>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="px-5 -mt-8 relative z-10 pb-8">
        <div className="bg-white rounded-3xl shadow-card p-5 mb-6">
          <h2 className="text-[17px] font-bold mb-1" style={{ color: '#1A2433' }}>Your Information</h2>
          <p className="text-sm mb-5" style={{ color: '#4A5568' }}>Step 1 of 2 — Fill in your details</p>

          {serverError && (
            <div className="flex items-start gap-2 px-4 py-3 rounded-xl mb-4 border"
              style={{ background: '#FEF2F2', borderColor: '#FCA5A5' }}>
              <p className="text-xs font-medium" style={{ color: 'var(--critical)' }}>{serverError}</p>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
            {/* Full Name */}
            <div>
              <label className="block text-sm font-semibold mb-1.5" style={{ color: '#1A2433' }}>
                Full Name <span style={{ color: 'var(--critical)' }}>*</span>
              </label>
              <input type="text" placeholder="Jean-Paul Kamga" className="input-field" {...register('fullName')} />
              {errors.fullName && <p className="text-xs mt-1 font-medium" style={{ color: 'var(--critical)' }}>{errors.fullName.message}</p>}
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-semibold mb-1.5" style={{ color: '#1A2433' }}>
                Email Address <span style={{ color: 'var(--critical)' }}>*</span>
              </label>
              <input type="email" placeholder="you@email.com" className="input-field" {...register('email')} />
              <p className="text-[11px] mt-1" style={{ color: '#94A3B8' }}>We'll send a verification code to this address</p>
              {errors.email && <p className="text-xs mt-1 font-medium" style={{ color: 'var(--critical)' }}>{errors.email.message}</p>}
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-semibold mb-1.5" style={{ color: '#1A2433' }}>
                Phone <span className="text-xs font-normal" style={{ color: '#94A3B8' }}>(optional)</span>
              </label>
              <div className="flex gap-2">
                <div className="flex items-center px-3 rounded-xl border font-semibold text-sm flex-shrink-0"
                  style={{ background: 'var(--muted)', borderColor: 'var(--border)', color: 'var(--foreground)' }}>
                  🇨🇲 +237
                </div>
                <input type="tel" placeholder="6XX XXX XXX" className="input-field flex-1" {...register('phone')} />
              </div>
              {errors.phone && <p className="text-xs mt-1 font-medium" style={{ color: 'var(--critical)' }}>{errors.phone.message}</p>}
            </div>

            {/* Date of Birth */}
            <div>
              <label className="block text-sm font-semibold mb-1.5" style={{ color: '#1A2433' }}>
                Date of Birth <span className="text-xs font-normal" style={{ color: '#94A3B8' }}>(optional)</span>
              </label>
              <input type="date" className="input-field" {...register('dob')} />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-semibold mb-1.5" style={{ color: '#1A2433' }}>
                Password <span style={{ color: 'var(--critical)' }}>*</span>
              </label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  placeholder="Minimum 8 characters"
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
                      <div key={`s-${i}`} className="flex-1 h-1.5 rounded-full transition-all duration-300"
                        style={{ background: i < strength.score ? strength.color : 'var(--border)' }} />
                    ))}
                  </div>
                  <p className="text-[11px] font-medium text-right" style={{ color: strength.color }}>{strength.label}</p>
                </div>
              )}
              {errors.password && <p className="text-xs mt-1 font-medium" style={{ color: 'var(--critical)' }}>{errors.password.message}</p>}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-semibold mb-1.5" style={{ color: '#1A2433' }}>
                Confirm Password <span style={{ color: 'var(--critical)' }}>*</span>
              </label>
              <div className="relative">
                <input
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

            <button type="submit" disabled={isSubmitting} className="btn-secondary flex items-center justify-center gap-2 mt-2">
              {isSubmitting ? <><Loader2 size={18} className="animate-spin" /><span>Sending code…</span></> : 'Continue →'}
            </button>
          </form>

          <p className="text-center text-xs mt-4" style={{ color: '#4A5568' }}>
            Already have an account?{' '}
            <Link to="/login" className="font-semibold" style={{ color: 'var(--primary)' }}>Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}

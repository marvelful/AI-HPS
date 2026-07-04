import { useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, Mail, CheckCircle } from 'lucide-react'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { authApi } from '@/lib/api'
import { useAuthStore } from '@/stores/auth.store'

// ── Step 1: Registration form ──────────────────────────────────────────────

const registerSchema = z.object({
  full_name:       z.string().min(2, 'Full name required'),
  email:           z.string().email('Enter a valid email'),
  phone:           z.string().optional(),
  date_of_birth:   z.string().optional(),
  password:        z.string().min(8, 'Minimum 8 characters'),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})
type RegisterForm = z.infer<typeof registerSchema>

// ── Step 2: OTP input ──────────────────────────────────────────────────────

function OtpStep({
  email,
  formData,
  onBack,
}: {
  email: string
  formData: RegisterForm
  onBack: () => void
}) {
  const { setAuth } = useAuthStore()
  const navigate = useNavigate()
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [resending, setResending] = useState(false)
  const [resent, setResent] = useState(false)
  const inputs = useRef<Array<HTMLInputElement | null>>([])

  const otpValue = otp.join('')

  const handleChange = (i: number, val: string) => {
    if (!/^\d*$/.test(val)) return
    const next = [...otp]
    next[i] = val.slice(-1)
    setOtp(next)
    if (val && i < 5) inputs.current[i + 1]?.focus()
  }

  const handleKeyDown = (i: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[i] && i > 0) {
      inputs.current[i - 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    const digits = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (digits.length === 6) {
      setOtp(digits.split(''))
      inputs.current[5]?.focus()
    }
  }

  const handleSubmit = async () => {
    if (otpValue.length < 6) {
      setError('Please enter the 6-digit code.')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const res = await authApi.register({
        full_name:     formData.full_name,
        email:         formData.email,
        phone:         formData.phone,
        date_of_birth: formData.date_of_birth,
        password:      formData.password,
        otp_code:      otpValue,
      })
      setAuth(res.user, res.access_token)
      navigate('/patient/home')
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? 'Verification failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleResend = async () => {
    setResending(true)
    setResent(false)
    setError(null)
    try {
      await authApi.requestOtp({ email, purpose: 'register', full_name: formData.full_name })
      setResent(true)
      setOtp(['', '', '', '', '', ''])
      inputs.current[0]?.focus()
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? 'Failed to resend. Please try again.')
    } finally {
      setResending(false)
    }
  }

  return (
    <div className="w-full max-w-md">
      <div className="text-center mb-8">
        <span className="text-4xl font-bold text-hgd-blue tracking-tight">
          AI-<span className="text-hgd-orange">HPS</span>
        </span>
        <p className="text-xs text-text-sec mt-1">Hôpital Général de Douala · Patient Portal</p>
      </div>

      <div className="bg-white rounded-xl shadow-card-lg p-8">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs text-text-sec hover:text-text-pri mb-5 transition-colors"
        >
          <ArrowLeft size={13} /> Back to form
        </button>

        <div className="text-center mb-6">
          <div className="w-10 h-10 bg-hgd-orange3 rounded-full flex items-center justify-center mx-auto mb-3">
            <Mail size={18} className="text-hgd-orange" />
          </div>
          <h1 className="text-xl font-bold text-text-pri">Check your email</h1>
          <p className="text-sm text-text-sec mt-1">
            We sent a 6-digit code to<br />
            <span className="font-semibold text-text-pri">{email}</span>
          </p>
        </div>

        {/* OTP digit inputs */}
        <div className="flex gap-2.5 justify-center mb-5" onPaste={handlePaste}>
          {otp.map((digit, i) => (
            <input
              key={i}
              ref={(el) => { inputs.current[i] = el }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              className="w-11 h-12 text-center text-xl font-bold rounded-lg border-2 border-slate-200 text-text-pri focus:outline-none focus:border-hgd-orange transition-colors"
            />
          ))}
        </div>

        {error && (
          <div className="rounded bg-clin-red-bg border border-clin-red/20 px-3 py-2 text-sm text-clin-red mb-4">
            {error}
          </div>
        )}

        {resent && (
          <div className="flex items-center gap-2 rounded bg-green-50 border border-green-200 px-3 py-2 text-sm text-green-700 mb-4">
            <CheckCircle size={14} /> New code sent to your email.
          </div>
        )}

        <Button
          variant="action"
          size="lg"
          className="w-full"
          onClick={handleSubmit}
          loading={submitting}
          disabled={otpValue.length < 6 || submitting}
        >
          Verify & Sign In
        </Button>

        <p className="text-center text-xs text-text-sec mt-5">
          Didn't receive the code?{' '}
          <button
            onClick={handleResend}
            disabled={resending}
            className="text-hgd-orange font-semibold hover:underline disabled:opacity-50"
          >
            {resending ? 'Sending…' : 'Resend code'}
          </button>
        </p>
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────

export default function PatientRegisterPage() {
  const [step, setStep] = useState<'form' | 'otp'>('form')
  const [savedForm, setSavedForm] = useState<RegisterForm | null>(null)
  const [sendError, setSendError] = useState<string | null>(null)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  })

  const onSubmit = async (data: RegisterForm) => {
    setSendError(null)
    try {
      await authApi.requestOtp({ email: data.email, purpose: 'register', full_name: data.full_name })
      setSavedForm(data)
      setStep('otp')
    } catch (e: any) {
      setSendError(e?.response?.data?.detail ?? 'Failed to send verification code. Please try again.')
    }
  }

  if (step === 'otp' && savedForm) {
    return (
      <OtpStep
        email={savedForm.email}
        formData={savedForm}
        onBack={() => setStep('form')}
      />
    )
  }

  return (
    <div className="w-full max-w-md">
      <div className="text-center mb-8">
        <Link to="/" className="inline-block">
          <span className="text-4xl font-bold text-hgd-blue tracking-tight">
            AI-<span className="text-hgd-orange">HPS</span>
          </span>
        </Link>
        <p className="text-xs text-text-sec mt-1">Hôpital Général de Douala · Patient Portal</p>
      </div>

      <div className="bg-white rounded-xl shadow-card-lg p-8">
        <div className="text-center mb-6">
          <div className="w-10 h-10 bg-hgd-orange3 rounded-full flex items-center justify-center mx-auto mb-3">
            <Mail size={18} className="text-hgd-orange" />
          </div>
          <h1 className="text-xl font-bold text-text-pri">Create Patient Account</h1>
          <p className="text-sm text-text-sec mt-1">Access hospital services and procedures</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <Input
            label="Full Name"
            placeholder="Jean-Paul Kamga"
            autoComplete="name"
            error={errors.full_name?.message}
            {...register('full_name')}
          />
          <Input
            label="Email Address"
            type="email"
            placeholder="patient@example.com"
            autoComplete="email"
            error={errors.email?.message}
            {...register('email')}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Phone (optional)"
              type="tel"
              placeholder="+237 6XX XXX XXX"
              autoComplete="tel"
              error={errors.phone?.message}
              {...register('phone')}
            />
            <Input
              label="Date of Birth"
              type="date"
              error={errors.date_of_birth?.message}
              {...register('date_of_birth')}
            />
          </div>
          <Input
            label="Password"
            type="password"
            placeholder="••••••••"
            autoComplete="new-password"
            error={errors.password?.message}
            hint="Minimum 8 characters"
            {...register('password')}
          />
          <Input
            label="Confirm Password"
            type="password"
            placeholder="••••••••"
            autoComplete="new-password"
            error={errors.confirmPassword?.message}
            {...register('confirmPassword')}
          />

          {sendError && (
            <div className="rounded bg-clin-red-bg border border-clin-red/20 px-3 py-2 text-sm text-clin-red">
              {sendError}
            </div>
          )}

          <Button variant="action" size="lg" loading={isSubmitting} className="w-full mt-2">
            Sign Up
          </Button>
        </form>

        <p className="text-center text-xs text-text-sec mt-4">
          Already have an account?{' '}
          <Link to="/login" className="text-hgd-orange font-semibold hover:text-hgd-orange2">
            Sign in
          </Link>
        </p>
      </div>

      <p className="text-center text-xs text-text-sec mt-4">
        This portal is for patients only ·{' '}
        <span className="text-hgd-orange font-medium">Hospital staff sign in separately</span>
      </p>
    </div>
  )
}

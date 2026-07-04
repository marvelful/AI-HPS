import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useState } from 'react'
import { UserPlus } from 'lucide-react'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { authApi } from '@/lib/api'
import { useAuthStore } from '@/stores/auth.store'

const schema = z.object({
  full_name:     z.string().min(2, 'Full name required'),
  email:         z.string().email('Enter a valid email'),
  phone:         z.string().optional(),
  date_of_birth: z.string().optional(),
  password:      z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})
type FormData = z.infer<typeof schema>

export default function RegisterPage() {
  const { setAuth } = useAuthStore()
  const navigate = useNavigate()
  const [serverErr, setServerErr] = useState<string | null>(null)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    setServerErr(null)
    try {
      const res = await authApi.register({
        full_name:     data.full_name,
        email:         data.email,
        phone:         data.phone,
        date_of_birth: data.date_of_birth,
        password:      data.password,
        otp_code:      '',
      })
      setAuth(res.user, res.access_token)
      navigate('/patient/home')
    } catch (e: any) {
      setServerErr(e?.response?.data?.detail ?? 'Registration failed. Please try again.')
    }
  }

  return (
    <div className="w-full max-w-md">
      <div className="text-center mb-8">
        <Link to="/" className="inline-block">
          <span className="text-4xl font-bold text-hgd-blue tracking-tight">
            AI-<span className="text-hgd-orange">HPS</span>
          </span>
        </Link>
        <p className="text-xs text-text-sec mt-1">Hôpital Général de Douala</p>
      </div>

      <div className="bg-white rounded-xl shadow-card-lg p-8">
        <div className="text-center mb-6">
          <div className="w-10 h-10 bg-hgd-orange3 rounded-full flex items-center justify-center mx-auto mb-3">
            <UserPlus size={18} className="text-hgd-orange" />
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

          {serverErr && (
            <div className="rounded bg-clin-red-bg border border-clin-red/20 px-3 py-2 text-sm text-clin-red">
              {serverErr}
            </div>
          )}

          <Button
            type="submit"
            variant="action"
            size="lg"
            loading={isSubmitting}
            className="w-full mt-2"
          >
            Create Account
          </Button>
        </form>

        <p className="text-center text-xs text-text-sec mt-4">
          Already have an account?{' '}
          <Link to="/patient/login" className="text-hgd-blue font-semibold hover:text-hgd-blue2">
            Sign in
          </Link>
        </p>
      </div>

      <p className="text-center text-xs text-text-sec mt-4">
        Are you hospital staff?{' '}
        <Link to="/login" className="text-hgd-blue hover:underline">Staff login →</Link>
      </p>
    </div>
  )
}

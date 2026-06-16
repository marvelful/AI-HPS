import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, Lock } from 'lucide-react'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { authApi } from '@/lib/api'
import { useAuthStore } from '@/stores/auth.store'

const schema = z.object({
  email:    z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
})
type FormData = z.infer<typeof schema>

export default function LoginPage() {
  const { setAuth } = useAuthStore()
  const navigate = useNavigate()
  const [showPass, setShowPass] = useState(false)
  const [serverErr, setServerErr] = useState<string | null>(null)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    setServerErr(null)
    try {
      const res = await authApi.login(data)
      setAuth(res.user, res.access_token)
      if (res.user.role === 'patient') {
        navigate('/patient/home')
      } else {
        navigate('/admin/dashboard')
      }
    } catch (e: any) {
      setServerErr(e?.response?.data?.detail ?? 'Login failed. Please check your credentials.')
    }
  }

  return (
    <div className="w-full max-w-md">
      {/* Logo */}
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
          <div className="w-10 h-10 bg-hgd-blue3 rounded-full flex items-center justify-center mx-auto mb-3">
            <Lock size={18} className="text-hgd-blue" />
          </div>
          <h1 className="text-xl font-bold text-text-pri">Welcome Back</h1>
          <p className="text-sm text-text-sec mt-1">Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <Input
            label="Email address"
            type="email"
            placeholder="staff@hgd.cm"
            autoComplete="email"
            error={errors.email?.message}
            {...register('email')}
          />

          <div className="relative">
            <Input
              label="Password"
              type={showPass ? 'text' : 'password'}
              placeholder="••••••••"
              autoComplete="current-password"
              error={errors.password?.message}
              {...register('password')}
            />
            <button
              type="button"
              onClick={() => setShowPass((v) => !v)}
              className="absolute right-3 top-7 text-text-sec hover:text-text-pri"
              tabIndex={-1}
            >
              {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>

          {serverErr && (
            <div className="rounded bg-clin-red-bg border border-clin-red/20 px-3 py-2 text-sm text-clin-red">
              {serverErr}
            </div>
          )}

          <Button
            type="submit"
            variant="primary"
            size="lg"
            loading={isSubmitting}
            className="w-full mt-2"
          >
            Sign In
          </Button>
        </form>

        <div className="mt-4 flex items-center justify-between text-xs text-text-sec">
          <Link to="/forgot-password" className="hover:text-hgd-blue transition-colors">
            Forgot password?
          </Link>
          <Link to="/patient/register" className="text-hgd-blue font-semibold hover:text-hgd-blue2 transition-colors">
            Create patient account →
          </Link>
        </div>
      </div>

      <p className="text-center text-xs text-text-sec mt-6">
        Admins &amp; staff sign in here · Patients use the{' '}
        <Link to="/patient/login" className="text-hgd-blue hover:underline">patient portal</Link>
      </p>
    </div>
  )
}

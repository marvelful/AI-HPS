import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { MailOpen } from 'lucide-react'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

const schema = z.object({ email: z.string().email('Enter a valid email') })
type FormData = z.infer<typeof schema>

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false)
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (_data: FormData) => {
    await new Promise((r) => setTimeout(r, 800))
    setSent(true)
  }

  return (
    <div className="w-full max-w-sm">
      <div className="text-center mb-8">
        <Link to="/" className="inline-block">
          <span className="text-3xl font-bold text-hgd-blue tracking-tight">
            AI-<span className="text-hgd-orange">HPS</span>
          </span>
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow-card-lg p-8">
        <div className="text-center mb-6">
          <div className="w-10 h-10 bg-hgd-blue3 rounded-full flex items-center justify-center mx-auto mb-3">
            <MailOpen size={18} className="text-hgd-blue" />
          </div>
          <h1 className="text-xl font-bold text-text-pri">Forgot Password</h1>
          <p className="text-sm text-text-sec mt-1">
            {sent
              ? 'Check your email for a reset link.'
              : 'Enter your email to receive a reset link.'}
          </p>
        </div>

        {!sent ? (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <Input
              label="Email address"
              type="email"
              placeholder="staff@hgd.cm"
              error={errors.email?.message}
              {...register('email')}
            />
            <Button type="submit" size="lg" loading={isSubmitting} className="w-full">
              Send Reset Link
            </Button>
          </form>
        ) : (
          <div className="bg-clin-green-bg rounded-lg px-4 py-3 text-sm text-clin-green text-center font-medium">
            Reset link sent! Check your inbox.
          </div>
        )}

        <p className="text-center text-xs text-text-sec mt-4">
          <Link to="/login" className="text-hgd-blue hover:underline">← Back to sign in</Link>
        </p>
      </div>
    </div>
  )
}

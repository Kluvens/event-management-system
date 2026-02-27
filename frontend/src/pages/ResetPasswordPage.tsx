import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useResetPassword } from '@/api/auth'

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  code: z.string().min(1, 'Enter the code from your email'),
  newPassword: z
    .string()
    .min(8, 'At least 8 characters')
    .regex(/[A-Z]/, 'At least one uppercase letter')
    .regex(/[0-9]/, 'At least one number'),
})

type FormData = z.infer<typeof schema>

export function ResetPasswordPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const prefilled = (location.state as { email?: string })?.email ?? ''

  const reset = useResetPassword()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { email: prefilled },
  })

  async function onSubmit(data: FormData) {
    await reset.mutateAsync(data)
    navigate('/login', { replace: true })
  }

  const inputClass =
    'border-slate-700 bg-slate-800 text-white placeholder:text-slate-500 focus:border-indigo-500'

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Reset your password</h1>
        <p className="mt-1 text-sm text-slate-400">
          Enter the code from your email and choose a new password.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="email" className="text-slate-300">
          Email
        </Label>
        <Input
          id="email"
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          className={inputClass}
          {...register('email')}
        />
        {errors.email && <p className="text-xs text-red-400">{errors.email.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="code" className="text-slate-300">
          Reset Code
        </Label>
        <Input
          id="code"
          placeholder="Enter code from email"
          autoComplete="one-time-code"
          className={inputClass}
          {...register('code')}
        />
        {errors.code && <p className="text-xs text-red-400">{errors.code.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="newPassword" className="text-slate-300">
          New Password
        </Label>
        <Input
          id="newPassword"
          type="password"
          placeholder="••••••••"
          autoComplete="new-password"
          className={inputClass}
          {...register('newPassword')}
        />
        {errors.newPassword && (
          <p className="text-xs text-red-400">{errors.newPassword.message}</p>
        )}
      </div>

      <Button
        type="submit"
        className="w-full bg-indigo-600 hover:bg-indigo-500"
        disabled={reset.isPending}
      >
        {reset.isPending ? 'Resetting…' : 'Reset Password'}
      </Button>

      <p className="text-center text-sm text-slate-400">
        <Link to="/forgot-password" className="font-medium text-indigo-400 hover:text-indigo-300">
          Send a new code
        </Link>
      </p>
    </form>
  )
}

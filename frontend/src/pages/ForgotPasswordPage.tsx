import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate, Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useForgotPassword } from '@/api/auth'

const schema = z.object({
  email: z.string().email('Enter a valid email'),
})

type FormData = z.infer<typeof schema>

export function ForgotPasswordPage() {
  const navigate = useNavigate()
  const forgot = useForgotPassword()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  async function onSubmit(data: FormData) {
    await forgot.mutateAsync(data.email)
    navigate('/reset-password', { state: { email: data.email } })
  }

  const inputClass =
    'border-slate-700 bg-slate-800 text-white placeholder:text-slate-500 focus:border-amber-500'

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Forgot password?</h1>
        <p className="mt-1 text-sm text-slate-400">
          Enter your email and we'll send you a reset code.
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

      <Button
        type="submit"
        className="w-full bg-amber-600 hover:bg-amber-500"
        disabled={forgot.isPending}
      >
        {forgot.isPending ? 'Sending…' : 'Send Reset Code'}
      </Button>

      <p className="text-center text-sm text-slate-400">
        Remember your password?{' '}
        <Link to="/login" className="font-medium text-amber-400 hover:text-amber-300">
          Sign in
        </Link>
      </p>
    </form>
  )
}

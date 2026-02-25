import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useConfirmSignUp } from '@/api/auth'

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  code:  z.string().length(6, 'Code must be 6 digits'),
})

type FormData = z.infer<typeof schema>

export function ConfirmEmailPage() {
  const navigate  = useNavigate()
  const location  = useLocation()
  const prefilled = (location.state as { email?: string })?.email ?? ''

  const confirm = useConfirmSignUp()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { email: prefilled },
  })

  async function onSubmit(data: FormData) {
    await confirm.mutateAsync(data)
    navigate('/login', { replace: true })
  }

  const inputClass =
    'border-slate-700 bg-slate-800 text-white placeholder:text-slate-500 focus:border-indigo-500'

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-sm rounded-xl border border-slate-800 bg-slate-900 p-8 shadow-xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">Confirm your email</h1>
          <p className="mt-1 text-sm text-slate-400">
            Enter the 6-digit code we sent to your email address.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-slate-300">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              className={inputClass}
              {...register('email')}
            />
            {errors.email && <p className="text-xs text-red-400">{errors.email.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="code" className="text-slate-300">Confirmation Code</Label>
            <Input
              id="code"
              placeholder="123456"
              inputMode="numeric"
              maxLength={6}
              className={inputClass}
              {...register('code')}
            />
            {errors.code && <p className="text-xs text-red-400">{errors.code.message}</p>}
          </div>

          <Button
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-500"
            disabled={confirm.isPending}
          >
            {confirm.isPending ? 'Confirming…' : 'Confirm Email'}
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-slate-400">
          Already confirmed?{' '}
          <Link to="/login" className="font-medium text-indigo-400 hover:text-indigo-300">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}

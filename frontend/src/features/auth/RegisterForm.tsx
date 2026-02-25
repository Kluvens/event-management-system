import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useRegister } from '@/api/auth'

const schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Enter a valid email'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain an uppercase letter')
    .regex(/[0-9]/, 'Must contain a number'),
})

type FormData = z.infer<typeof schema>

export function RegisterForm() {
  const navigate   = useNavigate()
  const register_  = useRegister()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  async function onSubmit(data: FormData) {
    const email = await register_.mutateAsync(data)
    // Navigate to confirm-email page with the email pre-filled
    navigate('/confirm-email', { state: { email } })
  }

  const inputClass =
    'border-slate-700 bg-slate-800 text-white placeholder:text-slate-500 focus:border-indigo-500'
  const labelClass = 'text-slate-300'

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Create an account</h1>
        <p className="mt-1 text-sm text-slate-400">Start booking and hosting events</p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="name" className={labelClass}>
          Full Name
        </Label>
        <Input id="name" placeholder="Alice Smith" className={inputClass} {...register('name')} />
        {errors.name && <p className="text-xs text-red-400">{errors.name.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="email" className={labelClass}>
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
        <Label htmlFor="password" className={labelClass}>
          Password
        </Label>
        <Input
          id="password"
          type="password"
          placeholder="Min. 8 chars, 1 uppercase, 1 number"
          autoComplete="new-password"
          className={inputClass}
          {...register('password')}
        />
        {errors.password && <p className="text-xs text-red-400">{errors.password.message}</p>}
      </div>

      <Button
        type="submit"
        className="w-full bg-indigo-600 hover:bg-indigo-500"
        disabled={register_.isPending}
      >
        {register_.isPending ? 'Creating account…' : 'Create Account'}
      </Button>

      <p className="text-center text-sm text-slate-400">
        Already have an account?{' '}
        <Link to="/login" className="font-medium text-indigo-400 hover:text-indigo-300">
          Sign in
        </Link>
      </p>
    </form>
  )
}

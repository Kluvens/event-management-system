import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useLogin, signInWithGoogle, signInWithFacebook } from '@/api/auth'

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
})

type FormData = z.infer<typeof schema>

export function LoginForm() {
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? '/'
  const login = useLogin()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  async function onSubmit(data: FormData) {
    await login.mutateAsync(data)
    navigate(from, { replace: true })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Welcome back</h1>
        <p className="mt-1 text-sm text-slate-400">Sign in to your account</p>
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
          className="border-slate-700 bg-slate-800 text-white placeholder:text-slate-500 focus:border-amber-500"
          {...register('email')}
        />
        {errors.email && <p className="text-xs text-red-400">{errors.email.message}</p>}
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="password" className="text-slate-300">
            Password
          </Label>
          <Link to="/forgot-password" className="text-xs text-amber-400 hover:text-amber-300">
            Forgot password?
          </Link>
        </div>
        <Input
          id="password"
          type="password"
          placeholder="••••••••"
          autoComplete="current-password"
          className="border-slate-700 bg-slate-800 text-white placeholder:text-slate-500 focus:border-amber-500"
          {...register('password')}
        />
        {errors.password && <p className="text-xs text-red-400">{errors.password.message}</p>}
      </div>

      <Button
        type="submit"
        className="w-full bg-amber-600 hover:bg-amber-500"
        disabled={login.isPending}
      >
        {login.isPending ? 'Signing in…' : 'Sign In'}
      </Button>

      {/* Social login */}
      <div className="relative my-1">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-slate-700" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-slate-900 px-2 text-slate-400">Or continue with</span>
        </div>
      </div>

      <div className="flex gap-3">
        <Button
          type="button"
          variant="outline"
          className="flex-1 border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700"
          onClick={signInWithGoogle}
        >
          Google
        </Button>
        <Button
          type="button"
          variant="outline"
          className="flex-1 border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700"
          onClick={signInWithFacebook}
        >
          Facebook
        </Button>
      </div>

      <p className="text-center text-sm text-slate-400">
        Don&apos;t have an account?{' '}
        <Link to="/register" className="font-medium text-amber-400 hover:text-amber-300">
          Sign up
        </Link>
      </p>
    </form>
  )
}

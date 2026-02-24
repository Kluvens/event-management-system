import { Outlet, Link } from 'react-router-dom'
import { Zap } from 'lucide-react'
import { BackgroundBeams } from '@/components/aceternity/BackgroundBeams'

export function AuthLayout() {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <BackgroundBeams />
      <div className="relative z-10 w-full max-w-md">
        <Link to="/" className="mb-8 flex items-center justify-center gap-2">
          <Zap className="h-6 w-6 text-indigo-400" />
          <span className="text-xl font-bold text-white">EventHub</span>
        </Link>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-8 shadow-2xl backdrop-blur-sm">
          <Outlet />
        </div>
      </div>
    </div>
  )
}

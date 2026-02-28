import { Outlet, Link } from 'react-router-dom'
import { Zap } from 'lucide-react'
import { motion } from 'framer-motion'

export function AuthLayout() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4"
      style={{ background: 'linear-gradient(135deg, #1c0a00 0%, #3d1a00 40%, #1f0d00 70%, #0f0500 100%)' }}
    >
      {/* Animated warm glow orbs */}
      <motion.div
        className="absolute left-1/4 top-1/4 h-96 w-96 rounded-full opacity-20 blur-3xl"
        style={{ background: 'radial-gradient(circle, #f97316, transparent)' }}
        animate={{ x: [0, 30, 0], y: [0, -20, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute right-1/4 bottom-1/4 h-80 w-80 rounded-full opacity-15 blur-3xl"
        style={{ background: 'radial-gradient(circle, #f59e0b, transparent)' }}
        animate={{ x: [0, -20, 0], y: [0, 25, 0] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
      />

      <motion.div
        className="relative z-10 w-full max-w-md"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        <Link to="/" className="mb-8 flex items-center justify-center gap-2">
          <Zap className="h-7 w-7 text-amber-400" />
          <span className="text-2xl font-extrabold text-white">EventHub</span>
        </Link>
        <div
          className="rounded-2xl p-8 shadow-2xl backdrop-blur-sm"
          style={{
            background: 'rgba(28, 10, 0, 0.75)',
            border: '1px solid rgba(251, 191, 36, 0.15)',
            boxShadow: '0 0 60px rgba(249, 115, 22, 0.08), 0 25px 50px rgba(0,0,0,0.5)',
          }}
        >
          <Outlet />
        </div>
      </motion.div>
    </div>
  )
}

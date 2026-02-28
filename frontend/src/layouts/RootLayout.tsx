import { Outlet, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { Navbar } from '@/components/Navbar'

export function RootLayout() {
  const { pathname } = useLocation()
  const isHome = pathname === '/'

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
  }, [pathname])

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      {/* On the home page the navbar is transparent over the hero, so no padding needed */}
      <main className={isHome ? '' : 'pt-14'}>
        <motion.div
          key={pathname}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
        >
          <Outlet />
        </motion.div>
      </main>
    </div>
  )
}

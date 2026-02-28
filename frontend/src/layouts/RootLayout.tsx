import { Outlet, useLocation, Link } from 'react-router-dom'
import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { Navbar } from '@/components/Navbar'

export function RootLayout() {
  const { pathname } = useLocation()
  const isHome = pathname === '/'
  const hideFooter = isHome || pathname.startsWith('/dashboard') || pathname.startsWith('/admin')

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
  }, [pathname])

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      {/* On the home page the navbar is transparent over the hero, so no padding needed */}
      <main className={`flex-1 ${isHome ? '' : 'pt-14'}`}>
        <motion.div
          key={pathname}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
        >
          <Outlet />
        </motion.div>
      </main>

      {!hideFooter && (
        <footer className="border-t border-border bg-background py-6">
          <div className="container mx-auto flex flex-col items-center justify-between gap-3 px-4 text-xs text-muted-foreground sm:flex-row">
            <span>© {new Date().getFullYear()} EventHub. All rights reserved.</span>
            <div className="flex gap-4">
              <Link to="/terms" className="hover:text-foreground hover:underline">Terms of Service</Link>
              <Link to="/privacy" className="hover:text-foreground hover:underline">Privacy Policy</Link>
            </div>
          </div>
        </footer>
      )}
    </div>
  )
}

import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Menu,
  X,
  Zap,
  LogOut,
  LayoutDashboard,
  Ticket,
  ShieldCheck,
  Plus,
  Heart,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet'
import { signOut } from 'aws-amplify/auth'
import { useAuthStore } from '@/stores/authStore'
import { getInitials } from '@/lib/utils'
import { NotificationBell } from '@/components/NotificationBell'

export function Navbar() {
  const navigate = useNavigate()
  const { user, logout, isAdmin } = useAuthStore()
  const [mobileOpen, setMobileOpen] = useState(false)

  async function handleLogout() {
    logout()
    await signOut()
    navigate('/')
  }

  const navLinks = (
    <>
      <Link
        to="/"
        className="text-sm font-medium text-slate-600 transition-colors hover:text-slate-900"
        onClick={() => setMobileOpen(false)}
      >
        Browse Events
      </Link>
      {user && (
        <Link
          to="/my-bookings"
          className="text-sm font-medium text-slate-600 transition-colors hover:text-slate-900"
          onClick={() => setMobileOpen(false)}
        >
          My Bookings
        </Link>
      )}
      {user && (
        <Link
          to="/favorites"
          className="flex items-center gap-1.5 text-sm font-medium text-slate-600 transition-colors hover:text-slate-900"
          onClick={() => setMobileOpen(false)}
        >
          <Heart className="h-3.5 w-3.5" />
          Favourites
        </Link>
      )}
      {user && (
        <Link
          to="/dashboard"
          className="text-sm font-medium text-slate-600 transition-colors hover:text-slate-900"
          onClick={() => setMobileOpen(false)}
        >
          Dashboard
        </Link>
      )}
      {isAdmin() && (
        <Link
          to="/admin"
          className="text-sm font-medium text-indigo-600 transition-colors hover:text-indigo-700"
          onClick={() => setMobileOpen(false)}
        >
          Admin
        </Link>
      )}
    </>
  )

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
      <div className="container mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
        {/* Logo */}
        <Link
          to="/"
          className="flex items-center gap-1.5 font-bold text-slate-900"
        >
          <Zap className="h-5 w-5 text-indigo-600" />
          <span>EventHub</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-6 md:flex">{navLinks}</nav>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {user ? (
            <>
              <Button
                variant="outline"
                size="sm"
                className="hidden gap-1 md:flex"
                onClick={() => navigate('/events/create')}
              >
                <Plus className="h-3.5 w-3.5" />
                Create Event
              </Button>

              <NotificationBell />

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-indigo-100 text-xs font-semibold text-indigo-700">
                        {getInitials(user?.name ?? '?')}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <div className="px-2 py-1.5">
                    <p className="text-sm font-medium">{user?.name}</p>
                    <p className="text-xs text-slate-500">{user?.email}</p>
                    <p className="mt-0.5 text-xs font-medium text-indigo-600">
                      {user?.role}
                    </p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate('/my-bookings')}>
                    <Ticket className="mr-2 h-4 w-4" />
                    My Bookings
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/favorites')}>
                    <Heart className="mr-2 h-4 w-4" />
                    Favourites
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/dashboard')}>
                    <LayoutDashboard className="mr-2 h-4 w-4" />
                    Dashboard
                  </DropdownMenuItem>
                  {isAdmin() && (
                    <DropdownMenuItem onClick={() => navigate('/admin')}>
                      <ShieldCheck className="mr-2 h-4 w-4" />
                      Admin Panel
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="text-red-600 focus:text-red-600"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/login')}
              >
                Sign In
              </Button>
              <Button size="sm" onClick={() => navigate('/register')}>
                Sign Up
              </Button>
            </div>
          )}

          {/* Mobile hamburger */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                {mobileOpen ? (
                  <X className="h-5 w-5" />
                ) : (
                  <Menu className="h-5 w-5" />
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-64">
              <div className="mt-6 flex flex-col gap-4">
                {navLinks}
                <Separator />
                {user ? (
                  <>
                    <button
                      onClick={() => {
                        navigate('/events/create')
                        setMobileOpen(false)
                      }}
                      className="text-left text-sm font-medium text-indigo-600"
                    >
                      + Create Event
                    </button>
                    <button
                      onClick={() => {
                        handleLogout()
                        setMobileOpen(false)
                      }}
                      className="text-left text-sm font-medium text-red-600"
                    >
                      Sign Out
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      to="/login"
                      className="text-sm font-medium"
                      onClick={() => setMobileOpen(false)}
                    >
                      Sign In
                    </Link>
                    <Link
                      to="/register"
                      className="text-sm font-medium text-indigo-600"
                      onClick={() => setMobileOpen(false)}
                    >
                      Sign Up
                    </Link>
                  </>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}

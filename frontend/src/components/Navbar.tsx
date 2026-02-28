import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
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
  Sun,
  Moon,
  ShoppingBag,
  Link2,
  UserCircle,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet'
import { signOut } from 'aws-amplify/auth'
import { useAuthStore } from '@/stores/authStore'
import { getInitials } from '@/lib/utils'
import { NotificationBell } from '@/components/NotificationBell'
import { useTheme } from '@/contexts/ThemeContext'
import { useUpdateProfile } from '@/api/organizers'
import { toast } from 'sonner'

export function Navbar() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { user, setUser, logout, isAdmin } = useAuthStore()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [socialOpen, setSocialOpen] = useState(false)
  const [twitterVal, setTwitterVal] = useState('')
  const [instagramVal, setInstagramVal] = useState('')
  const [isScrolled, setIsScrolled] = useState(false)
  const { theme, toggleTheme } = useTheme()
  const updateProfile = useUpdateProfile()

  const isHome = pathname === '/'
  const isTransparent = isHome && !isScrolled

  useEffect(() => {
    function onScroll() {
      setIsScrolled(window.scrollY > 60)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  async function handleLogout() {
    logout()
    await signOut()
    navigate('/')
  }

  function openSocialDialog() {
    setTwitterVal(user?.twitterHandle ?? '')
    setInstagramVal(user?.instagramHandle ?? '')
    setSocialOpen(true)
  }

  function handleSocialSave() {
    updateProfile.mutate(
      {
        name: user?.name,
        bio: user?.bio,
        website: user?.website,
        twitterHandle: twitterVal || null,
        instagramHandle: instagramVal || null,
      },
      {
        onSuccess: () => {
          if (user) {
            setUser({
              ...user,
              twitterHandle: twitterVal || null,
              instagramHandle: instagramVal || null,
            })
          }
          toast.success('Social accounts updated.')
          setSocialOpen(false)
        },
        onError: () => toast.error('Failed to update social accounts.'),
      },
    )
  }

  const linkClass = isTransparent
    ? 'text-sm font-medium text-white/80 transition-colors hover:text-white'
    : 'text-sm font-medium text-muted-foreground transition-colors hover:text-foreground'

  const navLinks = (
    <>
      <Link to="/" className={linkClass} onClick={() => setMobileOpen(false)}>
        Browse Events
      </Link>
      {user && (
        <Link to="/my-bookings" className={linkClass} onClick={() => setMobileOpen(false)}>
          My Bookings
        </Link>
      )}
      {user && (
        <Link
          to="/favorites"
          className={`flex items-center gap-1.5 ${linkClass}`}
          onClick={() => setMobileOpen(false)}
        >
          <Heart className="h-3.5 w-3.5" />
          Favourites
        </Link>
      )}
      {user && (
        <Link
          to="/store"
          className={`flex items-center gap-1.5 ${linkClass}`}
          onClick={() => setMobileOpen(false)}
        >
          <ShoppingBag className="h-3.5 w-3.5" />
          Store
        </Link>
      )}
      {user && (
        <Link to="/dashboard" className={linkClass} onClick={() => setMobileOpen(false)}>
          Dashboard
        </Link>
      )}
      {isAdmin() && (
        <Link
          to="/admin"
          className="text-sm font-medium text-amber-500 transition-colors hover:text-amber-400"
          onClick={() => setMobileOpen(false)}
        >
          Admin
        </Link>
      )}
    </>
  )

  return (
    <motion.header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isTransparent
          ? 'border-transparent bg-transparent'
          : 'border-b border-border bg-background/95 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/80'
      }`}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      <div className="container mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
        {/* Logo */}
        <Link
          to="/"
          className={`flex items-center gap-1.5 font-bold transition-colors ${
            isTransparent ? 'text-white' : 'text-foreground'
          }`}
        >
          <Zap className="h-5 w-5 text-amber-400" />
          <span>EventHub</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-6 md:flex">{navLinks}</nav>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {user ? (
            <>
              <Button
                variant={isTransparent ? 'outline' : 'outline'}
                size="sm"
                className={`hidden gap-1 md:flex ${
                  isTransparent
                    ? 'border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white'
                    : ''
                }`}
                onClick={() => navigate('/events/create')}
              >
                <Plus className="h-3.5 w-3.5" />
                Create Event
              </Button>

              <NotificationBell transparent={isTransparent} />

              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                aria-label="Toggle theme"
                className={isTransparent ? 'text-white/80 hover:text-white hover:bg-white/10' : ''}
              >
                {theme === 'dark' ? (
                  <Sun className="h-5 w-5" />
                ) : (
                  <Moon className="h-5 w-5" />
                )}
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center rounded-full focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className={`text-xs font-semibold ${
                        isTransparent
                          ? 'bg-white/20 text-white'
                          : 'bg-amber-100 text-amber-700'
                      }`}>
                        {getInitials(user?.name ?? '?')}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <div className="px-2 py-1.5">
                    <p className="text-sm font-medium">{user?.name}</p>
                    <p className="text-xs text-muted-foreground">{user?.email}</p>
                    <p className="mt-0.5 text-xs font-medium text-amber-600">
                      {user?.role}
                    </p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate('/profile')}>
                    <UserCircle className="mr-2 h-4 w-4" />
                    My Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/my-bookings')}>
                    <Ticket className="mr-2 h-4 w-4" />
                    My Bookings
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/favorites')}>
                    <Heart className="mr-2 h-4 w-4" />
                    Favourites
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/store')}>
                    <ShoppingBag className="mr-2 h-4 w-4" />
                    Loyalty Store
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
                  <DropdownMenuItem onClick={openSocialDialog}>
                    <Link2 className="mr-2 h-4 w-4" />
                    Social Accounts
                  </DropdownMenuItem>
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

              {/* Social accounts dialog */}
              <Dialog open={socialOpen} onOpenChange={setSocialOpen}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Connect Social Accounts</DialogTitle>
                  </DialogHeader>
                  <p className="text-sm text-muted-foreground">
                    Link your X (Twitter) and Instagram handles so others can find you.
                  </p>
                  <div className="space-y-4 pt-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="twitter-handle">X (Twitter) handle</Label>
                      <Input
                        id="twitter-handle"
                        placeholder="@yourhandle"
                        value={twitterVal}
                        onChange={(e) => setTwitterVal(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="instagram-handle">Instagram handle</Label>
                      <Input
                        id="instagram-handle"
                        placeholder="@yourhandle"
                        value={instagramVal}
                        onChange={(e) => setInstagramVal(e.target.value)}
                      />
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                      <Button variant="outline" onClick={() => setSocialOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleSocialSave} disabled={updateProfile.isPending}>
                        Save
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                aria-label="Toggle theme"
                className={isTransparent ? 'text-white/80 hover:text-white hover:bg-white/10' : ''}
              >
                {theme === 'dark' ? (
                  <Sun className="h-5 w-5" />
                ) : (
                  <Moon className="h-5 w-5" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/login')}
                className={isTransparent ? 'text-white/80 hover:text-white hover:bg-white/10' : ''}
              >
                Sign In
              </Button>
              <Button
                size="sm"
                onClick={() => navigate('/register')}
                className={
                  isTransparent
                    ? 'bg-white text-orange-600 hover:bg-white/90 font-semibold'
                    : 'bg-amber-500 text-white hover:bg-amber-600'
                }
              >
                Sign Up
              </Button>
            </div>
          )}

          {/* Mobile hamburger */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={`md:hidden ${isTransparent ? 'text-white hover:bg-white/10' : ''}`}
              >
                <AnimatePresence mode="wait">
                  {mobileOpen ? (
                    <motion.span key="x" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}>
                      <X className="h-5 w-5" />
                    </motion.span>
                  ) : (
                    <motion.span key="menu" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.15 }}>
                      <Menu className="h-5 w-5" />
                    </motion.span>
                  )}
                </AnimatePresence>
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
                      className="text-left text-sm font-medium text-amber-600"
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
                      className="text-sm font-medium text-amber-600"
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
    </motion.header>
  )
}

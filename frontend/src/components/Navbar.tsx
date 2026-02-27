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
  Sun,
  Moon,
  ShoppingBag,
  Link2,
} from 'lucide-react'
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
  const { user, setUser, logout, isAdmin } = useAuthStore()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [socialOpen, setSocialOpen] = useState(false)
  const [twitterVal, setTwitterVal] = useState('')
  const [instagramVal, setInstagramVal] = useState('')
  const { theme, toggleTheme } = useTheme()
  const updateProfile = useUpdateProfile()

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

  const navLinks = (
    <>
      <Link
        to="/"
        className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        onClick={() => setMobileOpen(false)}
      >
        Browse Events
      </Link>
      {user && (
        <Link
          to="/my-bookings"
          className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          onClick={() => setMobileOpen(false)}
        >
          My Bookings
        </Link>
      )}
      {user && (
        <Link
          to="/favorites"
          className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          onClick={() => setMobileOpen(false)}
        >
          <Heart className="h-3.5 w-3.5" />
          Favourites
        </Link>
      )}
      {user && (
        <Link
          to="/store"
          className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          onClick={() => setMobileOpen(false)}
        >
          <ShoppingBag className="h-3.5 w-3.5" />
          Store
        </Link>
      )}
      {user && (
        <Link
          to="/dashboard"
          className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
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
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="container mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
        {/* Logo */}
        <Link
          to="/"
          className="flex items-center gap-1.5 font-bold text-foreground"
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

              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                aria-label="Toggle theme"
              >
                {theme === 'dark' ? (
                  <Sun className="h-5 w-5" />
                ) : (
                  <Moon className="h-5 w-5" />
                )}
              </Button>

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
                    <p className="text-xs text-muted-foreground">{user?.email}</p>
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

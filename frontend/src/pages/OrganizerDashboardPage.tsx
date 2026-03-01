import { useState } from 'react'
import { Link } from 'react-router-dom'
import { format, formatDistanceToNow } from 'date-fns'
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import {
  LayoutDashboard,
  CalendarDays,
  Users,
  Banknote,
  Settings,
  Plus,
  Pencil,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  CheckSquare,
  MapPin,
  Clock,
  CheckCircle2,
  XCircle,
  Ticket,
} from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { StatusBadge } from '@/components/StatusBadge'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { AttendeeTable } from '@/features/organizer/AttendeeTable'
import { useOrganizerDashboard, useUpdateProfile } from '@/api/organizers'
import { useSubscribers } from '@/api/subscriptions'
import { useEventAnalytics } from '@/api/analytics'
import { useMyPayouts, useCreatePayout } from '@/api/payouts'
import { useAuthStore } from '@/stores/authStore'
import { useTheme } from '@/contexts/ThemeContext'
import { formatDate, formatCurrency } from '@/lib/utils'
import type { DashboardEvent, UpdateOrganizerProfileRequest } from '@/types'

// ── Schemas ───────────────────────────────────────────────────────────────────

const profileSchema = z.object({
  bio: z.string().max(500).optional(),
  website: z.string().url('Enter a valid URL').optional().or(z.literal('')),
  twitterHandle: z.string().optional(),
  instagramHandle: z.string().optional(),
})
type ProfileForm = z.infer<typeof profileSchema>

const payoutSchema = z.object({
  amount: z.coerce.number().positive('Amount must be greater than 0'),
  bankDetails: z.string().min(5, 'Please provide your bank or PayPal details'),
})
type PayoutForm = z.infer<typeof payoutSchema>

const payoutStatusMeta: Record<string, { icon: React.ElementType; className: string }> = {
  Pending:  { icon: Clock,        className: 'border-amber-200 bg-amber-50 text-amber-700'     },
  Approved: { icon: CheckCircle2, className: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
  Rejected: { icon: XCircle,      className: 'border-red-200 bg-red-50 text-red-600'            },
}

type DashboardView = 'overview' | 'events' | 'subscribers' | 'payouts'

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const EVENT_GRADIENTS = [
  'from-amber-400 to-orange-500',
  'from-purple-500 to-pink-500',
  'from-blue-500 to-indigo-600',
  'from-emerald-400 to-teal-500',
  'from-rose-400 to-red-500',
  'from-cyan-400 to-blue-500',
]

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType
  label: string
  value: string | number
  color: string
}) {
  return (
    <div className="rounded-2xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-stone-500 dark:text-stone-400">{label}</p>
          <p className="mt-1.5 text-2xl font-bold text-stone-900 dark:text-stone-100">{value}</p>
        </div>
        <div className={`rounded-xl p-2.5 ${color}`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
      </div>
    </div>
  )
}

// ── Mini event card (overview grid) ──────────────────────────────────────────

function MiniEventCard({ event }: { event: DashboardEvent }) {
  const gradient = EVENT_GRADIENTS[event.eventId % EVENT_GRADIENTS.length]
  const fill = event.capacity > 0 ? Math.min(100, (event.confirmedBookings / event.capacity) * 100) : 0

  return (
    <Link to={`/events/${event.eventId}`}>
      <div className="group rounded-2xl overflow-hidden border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5">
        <div className="relative h-28 overflow-hidden">
          {event.imageUrl ? (
            <img
              src={event.imageUrl}
              alt={event.title}
              className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className={`h-full w-full bg-gradient-to-br ${gradient}`} />
          )}
          <span className="absolute bottom-2 right-2 rounded-full bg-white/90 dark:bg-stone-900/90 px-2 py-0.5 text-xs font-semibold text-stone-800 dark:text-stone-100">
            {event.price === 0 ? 'Free' : `$${event.price}`}
          </span>
        </div>
        <div className="p-3">
          <p className="font-semibold text-sm text-stone-900 dark:text-stone-100 line-clamp-1">{event.title}</p>
          <p className="mt-1 flex items-center gap-1 text-xs text-stone-400">
            <CalendarDays className="h-3 w-3 shrink-0" />
            {format(new Date(event.startDate), 'MMM d, h:mm a')}
          </p>
          <p className="mt-0.5 flex items-center gap-1 text-xs text-stone-400">
            <MapPin className="h-3 w-3 shrink-0" />
            <span className="line-clamp-1">{event.location}</span>
          </p>
          <div className="mt-2.5 h-1.5 w-full rounded-full bg-stone-100 dark:bg-stone-800">
            <div
              className="h-1.5 rounded-full bg-amber-500 transition-all"
              style={{ width: `${fill}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-stone-400">{event.confirmedBookings}/{event.capacity} booked</p>
        </div>
      </div>
    </Link>
  )
}

// ── Calendar widget ───────────────────────────────────────────────────────────

function EventCalendar({ events }: { events: DashboardEvent[] }) {
  const [viewDate, setViewDate] = useState(new Date())
  const today = new Date()
  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()

  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const eventDays = new Set(
    events
      .map((e) => new Date(e.startDate))
      .filter((d) => d.getFullYear() === year && d.getMonth() === month)
      .map((d) => d.getDate()),
  )

  const cells: (number | null)[] = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)

  return (
    <div className="rounded-2xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-stone-400">
            {today.toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
          <p className="text-lg font-bold text-stone-900 dark:text-stone-100">Today</p>
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => setViewDate(new Date(year, month - 1, 1))}
            className="rounded-lg p-1.5 text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewDate(new Date(year, month + 1, 1))}
            className="rounded-lg p-1.5 text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <p className="mb-3 text-sm font-semibold text-stone-700 dark:text-stone-300">
        {viewDate.toLocaleDateString('en-AU', { month: 'long', year: 'numeric' })}
      </p>

      <div className="grid grid-cols-7 mb-1">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
          <div key={d} className="text-center text-xs font-medium text-stone-400 py-1">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-1">
        {cells.map((day, idx) => {
          if (!day) return <div key={idx} />
          const isToday =
            day === today.getDate() &&
            month === today.getMonth() &&
            year === today.getFullYear()
          const hasEvent = eventDays.has(day)
          return (
            <div key={idx} className="flex flex-col items-center py-0.5">
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs cursor-default
                  ${isToday
                    ? 'bg-stone-900 dark:bg-amber-500 text-white font-bold'
                    : 'text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800'
                  }`}
              >
                {day}
              </span>
              {hasEvent && <span className="mt-0.5 h-1 w-1 rounded-full bg-amber-500" />}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Expandable event row ───────────────────────────────────────────────────────

function ExpandableEventRow({ event }: { event: DashboardEvent }) {
  const [expanded, setExpanded] = useState(false)
  const { data: analytics } = useEventAnalytics(event.eventId, expanded)
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  const trendData = (analytics?.dailyBookings ?? []).map((d) => ({
    date: d.date.slice(5),
    bookings: d.count,
  }))

  return (
    <>
      <TableRow
        className="cursor-pointer hover:bg-muted/50"
        onClick={() => setExpanded((v) => !v)}
      >
        <TableCell className="font-medium text-foreground">{event.title}</TableCell>
        <TableCell>{formatDate(event.startDate)}</TableCell>
        <TableCell>{event.confirmedBookings}/{event.capacity}</TableCell>
        <TableCell>{formatCurrency(event.revenue)}</TableCell>
        <TableCell><StatusBadge status={event.displayStatus} /></TableCell>
        <TableCell>
          <div className="flex items-center gap-2">
            <Link to={`/events/${event.eventId}/edit`} onClick={(e) => e.stopPropagation()}>
              <Button size="sm" variant="ghost"><Pencil className="h-3.5 w-3.5" /></Button>
            </Link>
            {expanded
              ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
              : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </div>
        </TableCell>
      </TableRow>
      {expanded && (
        <TableRow>
          <TableCell colSpan={6} className="bg-muted/50 p-4">
            {analytics && (
              <div className="mb-4 space-y-3">
                <div className="flex flex-wrap gap-4 text-sm">
                  <span className="text-muted-foreground">
                    Occupancy:{' '}
                    <span className="font-semibold text-foreground">{analytics.occupancyRate.toFixed(1)}%</span>
                  </span>
                  <span className="text-muted-foreground">
                    Waitlist:{' '}
                    <span className="font-semibold text-foreground">{analytics.waitlistCount}</span>
                  </span>
                  <span className="text-muted-foreground">
                    Avg rating:{' '}
                    <span className="font-semibold text-foreground">
                      {analytics.averageRating > 0 ? `${analytics.averageRating.toFixed(1)} ★` : 'No reviews'}
                    </span>
                  </span>
                  <span className="text-muted-foreground">
                    Revenue:{' '}
                    <span className="font-semibold text-foreground">{formatCurrency(analytics.totalRevenue)}</span>
                  </span>
                </div>
                {trendData.length > 0 && (
                  <div>
                    <p className="mb-1 text-xs font-medium text-muted-foreground">Daily bookings (last 30 days)</p>
                    <ResponsiveContainer width="100%" height={120}>
                      <LineChart data={trendData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#292524' : '#f1f5f9'} />
                        <XAxis dataKey="date" tick={{ fontSize: 10, fill: isDark ? '#a8a29e' : '#78716c' }} />
                        <YAxis tick={{ fontSize: 10, fill: isDark ? '#a8a29e' : '#78716c' }} allowDecimals={false} />
                        <Tooltip
                          contentStyle={isDark ? { borderRadius: '10px', border: '1px solid #292524', backgroundColor: '#1c1917', color: '#e7e5e4', fontSize: 12 } : { borderRadius: '10px', fontSize: 12 }}
                        />
                        <Line type="monotone" dataKey="bookings" stroke="#f59e0b" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            )}
            <AttendeeTable eventId={event.eventId} />
          </TableCell>
        </TableRow>
      )}
    </>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function OrganizerDashboardPage() {
  const [view, setView] = useState<DashboardView>('overview')
  const [profileOpen, setProfileOpen] = useState(false)
  const [payoutOpen, setPayoutOpen] = useState(false)

  const user = useAuthStore((s) => s.user)
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const { data: dashboard, isPending, error } = useOrganizerDashboard()
  const { data: subscribers = [] } = useSubscribers()
  const { data: payouts = [] } = useMyPayouts()
  const updateProfile = useUpdateProfile()
  const createPayout = useCreatePayout()

  const { register, handleSubmit, formState: { errors } } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
  })
  const {
    register: registerPayout,
    handleSubmit: handlePayoutSubmit,
    reset: resetPayout,
    formState: { errors: payoutErrors },
  } = useForm<PayoutForm>({ resolver: zodResolver(payoutSchema) })

  function onPayoutSubmit(data: PayoutForm) {
    createPayout.mutate(
      { amount: data.amount, bankDetails: data.bankDetails },
      { onSuccess: () => { resetPayout(); setPayoutOpen(false) } },
    )
  }

  function onProfileSubmit(data: ProfileForm) {
    const body: UpdateOrganizerProfileRequest = {
      bio: data.bio || null,
      website: data.website || null,
      twitterHandle: data.twitterHandle || null,
      instagramHandle: data.instagramHandle || null,
    }
    updateProfile.mutate(body, {
      onSuccess: () => { toast.success('Profile updated'); setProfileOpen(false) },
      onError: () => toast.error('Failed to update profile'),
    })
  }

  if (isPending) return <LoadingSpinner />
  if (error || !dashboard) {
    return <div className="py-16 text-center text-muted-foreground">Failed to load dashboard.</div>
  }

  const allEvents = [...dashboard.upcomingEvents, ...dashboard.recentEvents]
  const draftEvents = allEvents.filter((ev) => ev.displayStatus === 'Draft')
  const nonDraftUpcoming = dashboard.upcomingEvents.filter((ev) => ev.displayStatus !== 'Draft')
  const pendingPayoutsCount = payouts.filter((p) => p.status === 'Pending').length

  // Monthly revenue aggregation (current calendar year)
  const currentYear = new Date().getFullYear()
  const monthlyRevenue = MONTH_LABELS.map((month, i) => ({
    month,
    revenue: allEvents
      .filter((e) => {
        const d = new Date(e.startDate)
        return d.getFullYear() === currentYear && d.getMonth() === i
      })
      .reduce((sum, e) => sum + e.revenue, 0),
  }))

  // Donut chart: checked-in / confirmed-pending / available
  const totalCapacity = allEvents.reduce((s, e) => s + e.capacity, 0)
  const confirmedNotChecked = Math.max(0, dashboard.totalAttendees - dashboard.totalCheckedIn)
  const available = Math.max(0, totalCapacity - dashboard.totalAttendees)
  const donutData = [
    { name: 'Checked In', value: dashboard.totalCheckedIn, color: isDark ? '#f59e0b' : '#1c1917' },
    { name: 'Confirmed',  value: confirmedNotChecked,       color: isDark ? '#78716c' : '#a8a29e' },
    { name: 'Available',  value: available,                  color: isDark ? '#292524' : '#e7e5e4' },
  ].filter((d) => d.value > 0)
  const totalTickets = donutData.reduce((s, d) => s + d.value, 0)
  const fillRate = totalCapacity > 0
    ? ((dashboard.totalAttendees / totalCapacity) * 100).toFixed(0)
    : '0'

  const navItems: { key: DashboardView; icon: React.ElementType; label: string; badge?: number }[] = [
    { key: 'overview',     icon: LayoutDashboard, label: 'Dashboard'   },
    { key: 'events',       icon: CalendarDays,    label: 'Events'      },
    { key: 'subscribers',  icon: Users,           label: 'Subscribers', badge: subscribers.length   },
    { key: 'payouts',      icon: Banknote,        label: 'Payouts',     badge: pendingPayoutsCount  },
  ]

  return (
    <div className="flex h-[calc(100vh-56px)] overflow-hidden">

      {/* ── Sidebar ────────────────────────────────────────────────── */}
      <aside className="w-52 shrink-0 flex flex-col py-6 overflow-y-auto bg-card border-r border-border">

        {/* Logo */}
        <div className="px-4 mb-6">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-amber-500 flex items-center justify-center shrink-0">
              <Ticket className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-lg text-foreground">EventHub</span>
          </Link>
        </div>

        {/* User info */}
        <div className="px-4 mb-6 pb-5 border-b border-border">
          <div className="h-10 w-10 rounded-full bg-amber-500 flex items-center justify-center mb-2.5">
            <span className="text-white font-bold text-sm">
              {user?.name.charAt(0).toUpperCase()}
            </span>
          </div>
          <p className="font-semibold text-sm text-foreground truncate">{user?.name}</p>
          <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
        </div>

        {/* Navigation */}
        <div className="px-3 flex-1">
          <p className="px-1 mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Menu</p>
          <nav className="space-y-0.5">
            {navItems.map(({ key, icon: Icon, label, badge }) => (
              <button
                key={key}
                onClick={() => setView(key)}
                className={`w-full flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition-colors
                  ${view === key
                    ? 'bg-amber-500 text-white'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                  }`}
              >
                <span className="flex items-center gap-2.5">
                  <Icon className="h-4 w-4 shrink-0" />
                  {label}
                </span>
                {badge != null && badge > 0 && (
                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none
                    ${view === key ? 'bg-white/20 text-white' : 'bg-muted text-muted-foreground'}`}>
                    {badge}
                  </span>
                )}
              </button>
            ))}
          </nav>

          <p className="px-1 mt-6 mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">General</p>

          {/* Profile settings (opens dialog) */}
          <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
            <DialogTrigger asChild>
              <button className="w-full flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
                <Settings className="h-4 w-4 shrink-0" />
                Edit Profile
              </button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Edit Public Profile</DialogTitle></DialogHeader>
              <form onSubmit={handleSubmit(onProfileSubmit)} className="space-y-4">
                <div className="space-y-1">
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea id="bio" rows={3} {...register('bio')} />
                  {errors.bio && <p className="text-xs text-red-500">{errors.bio.message}</p>}
                </div>
                <div className="space-y-1">
                  <Label htmlFor="website">Website</Label>
                  <Input id="website" placeholder="https://..." {...register('website')} />
                  {errors.website && <p className="text-xs text-red-500">{errors.website.message}</p>}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="twitter">Twitter</Label>
                    <Input id="twitter" placeholder="@handle" {...register('twitterHandle')} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="instagram">Instagram</Label>
                    <Input id="instagram" placeholder="@handle" {...register('instagramHandle')} />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => setProfileOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={updateProfile.isPending}>Save</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Create event CTA */}
        <div className="px-3 mt-4 pt-4 border-t border-border">
          <Link to="/events/create">
            <Button className="w-full bg-amber-500 hover:bg-amber-600 text-white rounded-xl">
              <Plus className="h-4 w-4 mr-1.5" />
              New Event
            </Button>
          </Link>
        </div>
      </aside>

      {/* ── Main content ───────────────────────────────────────────── */}
      <div className="flex-1 bg-stone-50 dark:bg-stone-950 overflow-y-auto">

        {/* Content header */}
        <div className="sticky top-0 z-10 border-b border-stone-200 dark:border-stone-800 bg-stone-50/95 dark:bg-stone-950/95 backdrop-blur px-6 py-4">
          <p className="text-xs text-stone-400">Dashboard</p>
          <h1 className="text-xl font-bold text-stone-900 dark:text-stone-100 capitalize">
            {view === 'overview' ? 'Dashboard' : view}
          </h1>
        </div>

        <div className="p-6 space-y-6">

          {/* ══ OVERVIEW ══════════════════════════════════════════════ */}
          {view === 'overview' && (
            <>
              {/* Stat cards */}
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <StatCard icon={CalendarDays} label="Total Events"     value={dashboard.totalEvents}                     color="bg-stone-800 dark:bg-stone-700"   />
                <StatCard icon={Ticket}        label="Tickets Sold"     value={dashboard.totalAttendees.toLocaleString()} color="bg-amber-500"   />
                <StatCard icon={DollarSign}    label="Total Revenue"    value={formatCurrency(dashboard.totalRevenue)}    color="bg-emerald-600" />
                <StatCard icon={CheckSquare}   label="Upcoming Events"  value={nonDraftUpcoming.length}                   color="bg-sky-500"     />
              </div>

              {/* Draft events banner */}
              {draftEvents.length > 0 && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                        {draftEvents.length} Draft Event{draftEvents.length > 1 ? 's' : ''} — not yet published
                      </h3>
                      <p className="mt-0.5 text-xs text-amber-700 dark:text-amber-400">
                        Only you can see these. Publish when ready to make them visible to attendees.
                      </p>
                    </div>
                    <button
                      onClick={() => setView('events')}
                      className="shrink-0 text-xs font-medium text-amber-600 hover:underline"
                    >
                      View all
                    </button>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {draftEvents.slice(0, 3).map((ev) => (
                      <Link
                        key={ev.eventId}
                        to={`/events/${ev.eventId}/edit`}
                        className="flex items-center gap-1.5 rounded-lg border border-amber-200 dark:border-amber-800 bg-white dark:bg-stone-900 px-3 py-1.5 text-xs transition-colors hover:bg-amber-100 dark:hover:bg-stone-800"
                      >
                        <Pencil className="h-3 w-3 text-amber-600" />
                        <span className="max-w-[160px] truncate font-medium text-stone-800 dark:text-stone-100">
                          {ev.title}
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Revenue chart + Ticket summary */}
              <div className="grid grid-cols-3 gap-5">

                {/* Revenue Breakdown */}
                <div className="col-span-2 rounded-2xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 p-5 shadow-sm">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <h2 className="font-semibold text-stone-900 dark:text-stone-100">Revenue Breakdown</h2>
                      <p className="text-xs text-stone-400 mt-0.5">Monthly revenue — {currentYear}</p>
                    </div>
                    <button
                      onClick={() => setView('events')}
                      className="text-xs font-medium text-amber-600 hover:underline"
                    >
                      see details
                    </button>
                  </div>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={monthlyRevenue} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#292524' : '#f5f5f4'} vertical={false} />
                      <XAxis
                        dataKey="month"
                        tick={{ fontSize: 11, fill: '#a8a29e' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: '#a8a29e' }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(v: number) =>
                          v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`
                        }
                      />
                      <Tooltip
                        formatter={(v: number) => [formatCurrency(v), 'Revenue']}
                        contentStyle={isDark
                          ? { borderRadius: '12px', border: '1px solid #292524', backgroundColor: '#1c1917', color: '#e7e5e4', fontSize: 12 }
                          : { borderRadius: '12px', border: '1px solid #e7e5e4', fontSize: 12 }
                        }
                        cursor={{ fill: isDark ? 'rgba(255,255,255,0.04)' : '#f5f5f4' }}
                      />
                      <Bar dataKey="revenue" fill={isDark ? '#f59e0b' : '#1c1917'} radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Ticket Summary */}
                <div className="rounded-2xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 p-5 shadow-sm">
                  <h2 className="font-semibold text-stone-900 dark:text-stone-100">Ticket Summary</h2>
                  <p className="text-xs text-stone-400 mt-0.5 mb-3">Occupancy breakdown</p>
                  {donutData.length > 0 ? (
                    <>
                      <ResponsiveContainer width="100%" height={130}>
                        <PieChart>
                          <Pie
                            data={donutData}
                            cx="50%"
                            cy="50%"
                            innerRadius={38}
                            outerRadius={58}
                            dataKey="value"
                            strokeWidth={0}
                          >
                            {donutData.map((entry, index) => (
                              <Cell key={index} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{ borderRadius: '10px', fontSize: 12 }}
                            formatter={(v: number, name: string) => [v.toLocaleString(), name]}
                          />
                        </PieChart>
                      </ResponsiveContainer>

                      <div className="mt-2 space-y-1.5">
                        {donutData.map((d) => (
                          <div key={d.name} className="flex items-center justify-between text-xs">
                            <span className="flex items-center gap-1.5 text-stone-500">
                              <span className="h-2.5 w-2.5 rounded-sm shrink-0" style={{ background: d.color }} />
                              {d.name}
                            </span>
                            <span className="font-semibold text-stone-700 dark:text-stone-300">
                              {totalTickets > 0 ? Math.round((d.value / totalTickets) * 100) : 0}%
                            </span>
                          </div>
                        ))}
                      </div>

                      <div className="mt-3 space-y-1.5 border-t border-stone-100 dark:border-stone-800 pt-3 text-xs">
                        <div className="flex justify-between">
                          <span className="text-stone-400">Total Tickets Sold</span>
                          <span className="font-semibold text-stone-800 dark:text-stone-200">{dashboard.totalAttendees.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-stone-400">Total Revenue</span>
                          <span className="font-semibold text-stone-800 dark:text-stone-200">{formatCurrency(dashboard.totalRevenue)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-stone-400">Fill Rate</span>
                          <span className="font-semibold text-stone-800 dark:text-stone-200">{fillRate}%</span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="flex h-36 items-center justify-center text-sm text-stone-400">
                      No booking data yet
                    </div>
                  )}
                </div>
              </div>

              {/* Upcoming event cards + Calendar */}
              <div className="grid grid-cols-3 gap-5">

                {/* Upcoming events */}
                <div className="col-span-2">
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="font-semibold text-stone-900 dark:text-stone-100">Upcoming Events</h2>
                    <button
                      onClick={() => setView('events')}
                      className="text-xs font-medium text-amber-600 hover:underline"
                    >
                      More
                    </button>
                  </div>
                  {nonDraftUpcoming.length === 0 ? (
                    <div className="rounded-2xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 py-12 text-center text-sm text-stone-400">
                      No upcoming events.{' '}
                      <Link to="/events/create" className="text-amber-600 hover:underline">
                        Create one
                      </Link>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-4 xl:grid-cols-3">
                      {nonDraftUpcoming.slice(0, 6).map((ev) => (
                        <MiniEventCard key={ev.eventId} event={ev} />
                      ))}
                    </div>
                  )}
                </div>

                {/* Calendar */}
                <div>
                  <div className="mb-3">
                    <h2 className="font-semibold text-stone-900 dark:text-stone-100">Calendar</h2>
                  </div>
                  <EventCalendar events={allEvents} />
                </div>
              </div>
            </>
          )}

          {/* ══ EVENTS ════════════════════════════════════════════════ */}
          {view === 'events' && (
            <div className="space-y-6">
              {draftEvents.length > 0 && (
                <div>
                  <h2 className="mb-3 font-semibold text-stone-900 dark:text-stone-100">
                    Drafts ({draftEvents.length})
                  </h2>
                  <div className="overflow-hidden rounded-2xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 shadow-sm">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Event</TableHead>
                          <TableHead>Start Date</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {draftEvents.map((ev) => (
                          <TableRow key={ev.eventId}>
                            <TableCell className="font-medium">{ev.title}</TableCell>
                            <TableCell className="text-muted-foreground">{formatDate(ev.startDate)}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Link to={`/events/${ev.eventId}/edit`}>
                                  <Button size="sm" variant="outline" className="gap-1.5">
                                    <Pencil className="h-3.5 w-3.5" />Edit
                                  </Button>
                                </Link>
                                <Link to={`/events/${ev.eventId}`}>
                                  <Button size="sm" variant="ghost">View</Button>
                                </Link>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              <div>
                <h2 className="mb-3 font-semibold text-stone-900 dark:text-stone-100">
                  Upcoming ({nonDraftUpcoming.length})
                </h2>
                <div className="overflow-hidden rounded-2xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 shadow-sm">
                  {nonDraftUpcoming.length === 0 ? (
                    <p className="py-10 text-center text-muted-foreground">No upcoming events.</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Event</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Bookings</TableHead>
                          <TableHead>Revenue</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {nonDraftUpcoming.map((ev) => (
                          <ExpandableEventRow key={ev.eventId} event={ev} />
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              </div>

              <div>
                <h2 className="mb-3 font-semibold text-stone-900 dark:text-stone-100">
                  Recent ({dashboard.recentEvents.length})
                </h2>
                <div className="overflow-hidden rounded-2xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 shadow-sm">
                  {dashboard.recentEvents.length === 0 ? (
                    <p className="py-10 text-center text-muted-foreground">No recent events.</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Event</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Bookings</TableHead>
                          <TableHead>Revenue</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {dashboard.recentEvents.map((ev) => (
                          <ExpandableEventRow key={ev.eventId} event={ev} />
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ══ SUBSCRIBERS ═══════════════════════════════════════════ */}
          {view === 'subscribers' && (
            <div className="overflow-hidden rounded-2xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 shadow-sm">
              {subscribers.length === 0 ? (
                <p className="py-10 text-center text-muted-foreground">No subscribers yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Subscribed</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {subscribers.map((sub) => (
                      <TableRow key={sub.subscriberId}>
                        <TableCell className="font-medium">{sub.name}</TableCell>
                        <TableCell>{formatDate(sub.subscribedAt)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          )}

          {/* ══ PAYOUTS ═══════════════════════════════════════════════ */}
          {view === 'payouts' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-2xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 p-5 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-amber-500 p-2.5">
                    <Banknote className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-stone-400">Total Revenue Available</p>
                    <p className="text-xl font-bold text-stone-900 dark:text-stone-100">
                      {formatCurrency(dashboard.totalRevenue)}
                    </p>
                  </div>
                </div>
                <Dialog open={payoutOpen} onOpenChange={setPayoutOpen}>
                  <DialogTrigger asChild>
                    <Button
                      disabled={payouts.some((p) => p.status === 'Pending')}
                      title={payouts.some((p) => p.status === 'Pending') ? 'You have a pending request' : undefined}
                    >
                      <Banknote className="mr-1.5 h-4 w-4" />
                      Request Payout
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader><DialogTitle>Request a Payout</DialogTitle></DialogHeader>
                    <form onSubmit={handlePayoutSubmit(onPayoutSubmit)} className="space-y-4 pt-2">
                      <div className="space-y-1.5">
                        <Label htmlFor="amount">Amount (AUD)</Label>
                        <Input id="amount" type="number" step="0.01" placeholder="e.g. 500.00" {...registerPayout('amount')} />
                        {payoutErrors.amount && <p className="text-xs text-red-500">{payoutErrors.amount.message}</p>}
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="bankDetails">Bank / PayPal Details</Label>
                        <Textarea id="bankDetails" rows={3} placeholder="BSB & account number, or PayPal email…" {...registerPayout('bankDetails')} />
                        {payoutErrors.bankDetails && <p className="text-xs text-red-500">{payoutErrors.bankDetails.message}</p>}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Payouts are processed manually within 5 business days.
                      </p>
                      <div className="flex justify-end gap-2 pt-1">
                        <Button type="button" variant="outline" onClick={() => setPayoutOpen(false)}>Cancel</Button>
                        <Button type="submit" disabled={createPayout.isPending}>
                          {createPayout.isPending ? 'Submitting…' : 'Submit Request'}
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>

              {payouts.length === 0 ? (
                <div className="rounded-2xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 py-12 text-center text-muted-foreground">
                  No payout requests yet.
                </div>
              ) : (
                <div className="overflow-hidden rounded-2xl border border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 shadow-sm">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Requested</TableHead>
                        <TableHead>Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payouts.map((p) => {
                        const meta = payoutStatusMeta[p.status] ?? payoutStatusMeta.Pending
                        const Icon = meta.icon
                        return (
                          <TableRow key={p.id}>
                            <TableCell className="font-semibold">{formatCurrency(p.amount)}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className={`gap-1 ${meta.className}`}>
                                <Icon className="h-3 w-3" />
                                {p.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {formatDistanceToNow(new Date(p.requestedAt), { addSuffix: true })}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">{p.adminNotes ?? '—'}</TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  )
}

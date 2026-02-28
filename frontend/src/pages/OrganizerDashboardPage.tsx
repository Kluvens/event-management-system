import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import {
  Calendar,
  Users,
  DollarSign,
  CheckSquare,
  Plus,
  Pencil,
  ChevronDown,
  ChevronUp,
  Banknote,
  Clock,
  CheckCircle2,
  XCircle,
} from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { StatusBadge } from '@/components/StatusBadge'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { AttendeeTable } from '@/features/organizer/AttendeeTable'
import { useOrganizerDashboard, useUpdateProfile } from '@/api/organizers'
import { useSubscribers } from '@/api/subscriptions'
import { useEventAnalytics } from '@/api/analytics'
import { useMyPayouts, useCreatePayout } from '@/api/payouts'
import { formatDate, formatCurrency } from '@/lib/utils'
import type { DashboardEvent, UpdateOrganizerProfileRequest } from '@/types'

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
  Pending:  { icon: Clock,         className: 'border-amber-200 bg-amber-50 text-amber-700' },
  Approved: { icon: CheckCircle2,  className: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
  Rejected: { icon: XCircle,       className: 'border-red-200 bg-red-50 text-red-600' },
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: Readonly<{
  icon: React.ElementType
  label: string
  value: string | number
  color: string
}>) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{label}</p>
        <div className={`rounded-lg p-2 ${color}`}>
          <Icon className="h-4 w-4 text-white" />
        </div>
      </div>
      <p className="mt-2 text-2xl font-bold text-card-foreground">{value}</p>
    </div>
  )
}

function ExpandableEventRow({ event }: { event: DashboardEvent }) {
  const [expanded, setExpanded] = useState(false)
  const { data: analytics } = useEventAnalytics(event.eventId, expanded)

  const trendData = (analytics?.dailyBookings ?? []).map((d) => ({
    date: d.date.slice(5), // MM-DD
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
        <TableCell>
          {event.confirmedBookings}/{event.capacity}
        </TableCell>
        <TableCell>{formatCurrency(event.revenue)}</TableCell>
        <TableCell>
          <StatusBadge status={event.displayStatus} />
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-2">
            <Link to={`/events/${event.eventId}/edit`} onClick={(e) => e.stopPropagation()}>
              <Button size="sm" variant="ghost">
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            </Link>
            {expanded ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
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
                    <span className="font-semibold text-foreground">
                      {analytics.occupancyRate.toFixed(1)}%
                    </span>
                  </span>
                  <span className="text-muted-foreground">
                    Waitlist:{' '}
                    <span className="font-semibold text-foreground">{analytics.waitlistCount}</span>
                  </span>
                  <span className="text-muted-foreground">
                    Avg rating:{' '}
                    <span className="font-semibold text-foreground">
                      {analytics.averageRating > 0
                        ? `${analytics.averageRating.toFixed(1)} ★`
                        : 'No reviews'}
                    </span>
                  </span>
                  <span className="text-muted-foreground">
                    Revenue:{' '}
                    <span className="font-semibold text-foreground">
                      {formatCurrency(analytics.totalRevenue)}
                    </span>
                  </span>
                </div>
                {trendData.length > 0 && (
                  <div>
                    <p className="mb-1 text-xs font-medium text-muted-foreground">
                      Daily bookings (last 30 days)
                    </p>
                    <ResponsiveContainer width="100%" height={120}>
                      <LineChart data={trendData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                        <Tooltip />
                        <Line
                          type="monotone"
                          dataKey="bookings"
                          stroke="#6366f1"
                          strokeWidth={2}
                          dot={false}
                        />
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

export function OrganizerDashboardPage() {
  const [profileOpen, setProfileOpen] = useState(false)
  const [payoutOpen, setPayoutOpen] = useState(false)

  const { data: dashboard, isPending, error } = useOrganizerDashboard()
  const { data: subscribers = [] } = useSubscribers()
  const { data: payouts = [] } = useMyPayouts()
  const updateProfile = useUpdateProfile()
  const createPayout = useCreatePayout()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProfileForm>({
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
      {
        onSuccess: () => {
          resetPayout()
          setPayoutOpen(false)
        },
      },
    )
  }

  const onProfileSubmit = (data: ProfileForm) => {
    const body: UpdateOrganizerProfileRequest = {
      bio: data.bio || null,
      website: data.website || null,
      twitterHandle: data.twitterHandle || null,
      instagramHandle: data.instagramHandle || null,
    }
    updateProfile.mutate(body, {
      onSuccess: () => {
        toast.success('Profile updated')
        setProfileOpen(false)
      },
      onError: () => toast.error('Failed to update profile'),
    })
  }

  if (isPending) return <LoadingSpinner />
  if (error || !dashboard) {
    return (
      <div className="container mx-auto max-w-5xl px-4 py-16 text-center text-muted-foreground">
        Failed to load dashboard.
      </div>
    )
  }

  const draftEvents = [
    ...dashboard.upcomingEvents,
    ...dashboard.recentEvents,
  ].filter((ev) => ev.displayStatus === 'Draft')

  const nonDraftUpcoming = dashboard.upcomingEvents.filter(
    (ev) => ev.displayStatus !== 'Draft'
  )

  const chartData = nonDraftUpcoming.slice(0, 8).map((ev) => ({
    name: ev.title.length > 16 ? ev.title.slice(0, 16) + '…' : ev.title,
    bookings: ev.confirmedBookings,
    capacity: ev.capacity,
  }))

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Organizer Dashboard</h1>
        <div className="flex gap-2">
          <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">Edit Profile</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Public Profile</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit(onProfileSubmit)} className="space-y-4">
                <div className="space-y-1">
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea id="bio" rows={3} {...register('bio')} />
                  {errors.bio && (
                    <p className="text-xs text-red-500">{errors.bio.message}</p>
                  )}
                </div>
                <div className="space-y-1">
                  <Label htmlFor="website">Website</Label>
                  <Input id="website" placeholder="https://..." {...register('website')} />
                  {errors.website && (
                    <p className="text-xs text-red-500">{errors.website.message}</p>
                  )}
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
                  <Button type="button" variant="outline" onClick={() => setProfileOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={updateProfile.isPending}>
                    Save
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
          <Link to="/events/create">
            <Button>
              <Plus className="mr-1.5 h-4 w-4" />
              New Event
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard
          icon={Calendar}
          label="Total Events"
          value={dashboard.totalEvents}
          color="bg-amber-500"
        />
        <StatCard
          icon={Users}
          label="Total Attendees"
          value={dashboard.totalAttendees.toLocaleString()}
          color="bg-emerald-500"
        />
        <StatCard
          icon={DollarSign}
          label="Total Revenue"
          value={formatCurrency(dashboard.totalRevenue)}
          color="bg-amber-500"
        />
        <StatCard
          icon={CheckSquare}
          label="Checked In"
          value={dashboard.totalCheckedIn.toLocaleString()}
          color="bg-sky-500"
        />
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <div className="mb-6 rounded-xl border border-border bg-card p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-foreground">
            Upcoming Events — Bookings vs Capacity
          </h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="bookings" fill="#6366f1" radius={[4, 4, 0, 0]} name="Bookings" />
              <Bar dataKey="capacity" fill="#e2e8f0" radius={[4, 4, 0, 0]} name="Capacity" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue={draftEvents.length > 0 ? 'drafts' : 'upcoming'}>
        <TabsList className="mb-4">
          {draftEvents.length > 0 && (
            <TabsTrigger value="drafts">
              Drafts ({draftEvents.length})
            </TabsTrigger>
          )}
          <TabsTrigger value="upcoming">
            Upcoming ({nonDraftUpcoming.length})
          </TabsTrigger>
          <TabsTrigger value="recent">
            Recent ({dashboard.recentEvents.length})
          </TabsTrigger>
          <TabsTrigger value="subscribers">
            Subscribers ({subscribers.length})
          </TabsTrigger>
          <TabsTrigger value="payouts">
            Payouts {payouts.filter((p) => p.status === 'Pending').length > 0 && `(${payouts.filter((p) => p.status === 'Pending').length})`}
          </TabsTrigger>
        </TabsList>

        {draftEvents.length > 0 && (
          <TabsContent value="drafts">
            <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
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
                      <TableCell className="font-medium text-foreground">
                        {ev.title}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(ev.startDate)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link to={`/events/${ev.eventId}/edit`}>
                            <Button size="sm" variant="outline" className="gap-1.5">
                              <Pencil className="h-3.5 w-3.5" />
                              Edit
                            </Button>
                          </Link>
                          <Link to={`/events/${ev.eventId}`}>
                            <Button size="sm" variant="ghost">
                              View
                            </Button>
                          </Link>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        )}

        <TabsContent value="upcoming">
          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
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
        </TabsContent>

        <TabsContent value="recent">
          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
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
        </TabsContent>

        <TabsContent value="subscribers">
          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
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
        </TabsContent>

        <TabsContent value="payouts">
          <div className="space-y-4">
            {/* Summary + request button */}
            <div className="flex items-center justify-between rounded-xl border border-border bg-card p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-amber-500 p-2">
                  <Banknote className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Revenue</p>
                  <p className="text-xl font-bold">{formatCurrency(dashboard.totalRevenue)}</p>
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
                  <DialogHeader>
                    <DialogTitle>Request a Payout</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handlePayoutSubmit(onPayoutSubmit)} className="space-y-4 pt-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="amount">Amount (AUD)</Label>
                      <Input
                        id="amount"
                        type="number"
                        step="0.01"
                        placeholder="e.g. 500.00"
                        {...registerPayout('amount')}
                      />
                      {payoutErrors.amount && (
                        <p className="text-xs text-red-500">{payoutErrors.amount.message}</p>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="bankDetails">Bank / PayPal Details</Label>
                      <Textarea
                        id="bankDetails"
                        rows={3}
                        placeholder="BSB & account number, or PayPal email…"
                        {...registerPayout('bankDetails')}
                      />
                      {payoutErrors.bankDetails && (
                        <p className="text-xs text-red-500">{payoutErrors.bankDetails.message}</p>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Payouts are processed manually within 5 business days. You will receive a
                      notification when your request is approved or rejected.
                    </p>
                    <div className="flex justify-end gap-2 pt-1">
                      <Button type="button" variant="outline" onClick={() => setPayoutOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" disabled={createPayout.isPending}>
                        {createPayout.isPending ? 'Submitting…' : 'Submit Request'}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {/* Payout history */}
            {payouts.length === 0 ? (
              <div className="rounded-xl border border-border bg-card py-12 text-center text-muted-foreground">
                No payout requests yet.
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
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
                          <TableCell className="text-sm text-muted-foreground">
                            {p.adminNotes ?? '—'}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

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
} from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
import { formatDate, formatCurrency } from '@/lib/utils'
import type { DashboardEvent, UpdateOrganizerProfileRequest } from '@/types'

const profileSchema = z.object({
  bio: z.string().max(500).optional(),
  website: z.string().url('Enter a valid URL').optional().or(z.literal('')),
  twitterHandle: z.string().optional(),
  instagramHandle: z.string().optional(),
})

type ProfileForm = z.infer<typeof profileSchema>

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
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{label}</p>
        <div className={`rounded-lg p-2 ${color}`}>
          <Icon className="h-4 w-4 text-white" />
        </div>
      </div>
      <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
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
        className="cursor-pointer hover:bg-slate-50"
        onClick={() => setExpanded((v) => !v)}
      >
        <TableCell className="font-medium text-slate-900">{event.title}</TableCell>
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
              <ChevronUp className="h-4 w-4 text-slate-400" />
            ) : (
              <ChevronDown className="h-4 w-4 text-slate-400" />
            )}
          </div>
        </TableCell>
      </TableRow>
      {expanded && (
        <TableRow>
          <TableCell colSpan={6} className="bg-slate-50 p-4">
            {analytics && (
              <div className="mb-4 space-y-3">
                <div className="flex flex-wrap gap-4 text-sm">
                  <span className="text-slate-600">
                    Occupancy:{' '}
                    <span className="font-semibold text-slate-900">
                      {analytics.occupancyRate.toFixed(1)}%
                    </span>
                  </span>
                  <span className="text-slate-600">
                    Waitlist:{' '}
                    <span className="font-semibold text-slate-900">{analytics.waitlistCount}</span>
                  </span>
                  <span className="text-slate-600">
                    Avg rating:{' '}
                    <span className="font-semibold text-slate-900">
                      {analytics.averageRating > 0
                        ? `${analytics.averageRating.toFixed(1)} ★`
                        : 'No reviews'}
                    </span>
                  </span>
                  <span className="text-slate-600">
                    Revenue:{' '}
                    <span className="font-semibold text-slate-900">
                      {formatCurrency(analytics.totalRevenue)}
                    </span>
                  </span>
                </div>
                {trendData.length > 0 && (
                  <div>
                    <p className="mb-1 text-xs font-medium text-slate-500">
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

  const { data: dashboard, isPending, error } = useOrganizerDashboard()
  const { data: subscribers = [] } = useSubscribers()
  const updateProfile = useUpdateProfile()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
  })

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
      <div className="container mx-auto max-w-5xl px-4 py-16 text-center text-slate-500">
        Failed to load dashboard.
      </div>
    )
  }

  const chartData = dashboard.upcomingEvents.slice(0, 8).map((ev) => ({
    name: ev.title.length > 16 ? ev.title.slice(0, 16) + '…' : ev.title,
    bookings: ev.confirmedBookings,
    capacity: ev.capacity,
  }))

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Organizer Dashboard</h1>
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
          color="bg-indigo-500"
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
        <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-slate-700">
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
      <Tabs defaultValue="upcoming">
        <TabsList className="mb-4">
          <TabsTrigger value="upcoming">
            Upcoming ({dashboard.upcomingEvents.length})
          </TabsTrigger>
          <TabsTrigger value="recent">
            Recent ({dashboard.recentEvents.length})
          </TabsTrigger>
          <TabsTrigger value="subscribers">
            Subscribers ({subscribers.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming">
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            {dashboard.upcomingEvents.length === 0 ? (
              <p className="py-10 text-center text-slate-500">No upcoming events.</p>
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
                  {dashboard.upcomingEvents.map((ev) => (
                    <ExpandableEventRow key={ev.eventId} event={ev} />
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </TabsContent>

        <TabsContent value="recent">
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            {dashboard.recentEvents.length === 0 ? (
              <p className="py-10 text-center text-slate-500">No recent events.</p>
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
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            {subscribers.length === 0 ? (
              <p className="py-10 text-center text-slate-500">No subscribers yet.</p>
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
      </Tabs>
    </div>
  )
}

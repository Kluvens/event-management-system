import { useParams, useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts'
import {
  ArrowLeft,
  CalendarDays,
  MapPin,
  Tag,
  Users,
  CheckCircle2,
  Clock,
  XCircle,
  DollarSign,
  Star,
} from 'lucide-react'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { StatusBadge } from '@/components/StatusBadge'
import { AttendeeTable } from '@/features/organizer/AttendeeTable'
import { useEventAnalytics } from '@/api/analytics'
import { useEvent } from '@/api/events'
import { useTheme } from '@/contexts/ThemeContext'
import { formatCurrency } from '@/lib/utils'

// ── Small metric card ─────────────────────────────────────────────────────────

function InsightCard({
  label,
  value,
  icon: Icon,
  colorClass,
}: {
  label: string
  value: string | number
  icon: React.ElementType
  colorClass: string
}) {
  return (
    <div className={`rounded-2xl border p-5 shadow-sm ${colorClass}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium opacity-70">{label}</p>
          <p className="mt-1.5 text-3xl font-bold">{typeof value === 'number' ? value.toLocaleString() : value}</p>
        </div>
        <div className="rounded-xl bg-white/20 p-2.5">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  )
}

// ── Progress bar row ──────────────────────────────────────────────────────────

function ProgressRow({
  label,
  pct,
  count,
  barClass,
}: {
  label: string
  pct: number
  count: string
  barClass: string
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-sm">
        <span className="text-stone-500 dark:text-stone-400">{label}</span>
        <div className="flex items-center gap-3">
          <span className="text-xs text-stone-400">{count}</span>
          <span className="w-10 text-right font-semibold text-stone-700 dark:text-stone-300">
            {pct.toFixed(1)}%
          </span>
        </div>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-stone-100 dark:bg-stone-800">
        <div
          className={`h-2.5 rounded-full transition-all ${barClass}`}
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function EventInsightsPage() {
  const { id } = useParams<{ id: string }>()
  const eventId = parseInt(id ?? '0')
  const navigate = useNavigate()
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  const { data: analytics, isPending: analyticsPending } = useEventAnalytics(eventId)
  const { data: event, isPending: eventPending } = useEvent(eventId)

  const isPending = analyticsPending || eventPending

  const trendData = (analytics?.dailyBookings ?? []).map((d) => ({
    date: d.date.slice(5),
    bookings: d.count,
  }))

  // Aggregate daily bookings to compute peak day
  const peakDay = trendData.reduce<{ date: string; bookings: number } | null>(
    (best, d) => (!best || d.bookings > best.bookings ? d : best),
    null,
  )

  if (isPending) return <LoadingSpinner />

  if (!analytics || !event) {
    return (
      <div className="py-20 text-center text-muted-foreground">Event not found.</div>
    )
  }

  const avgPerAttendee =
    analytics.confirmedBookings > 0
      ? analytics.totalRevenue / analytics.confirmedBookings
      : 0

  const tooltipStyle = isDark
    ? { borderRadius: '10px', border: '1px solid #292524', backgroundColor: '#1c1917', color: '#e7e5e4', fontSize: 12 }
    : { borderRadius: '10px', fontSize: 12 }

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950">

      {/* ── Sticky header ── */}
      <div className="sticky top-14 z-10 border-b border-stone-200 dark:border-stone-800 bg-white/95 dark:bg-stone-900/95 backdrop-blur">
        <div className="container mx-auto max-w-5xl px-4 py-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="mb-2 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </button>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold text-stone-900 dark:text-stone-100">{analytics.title}</h1>
              <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-stone-500">
                <span className="flex items-center gap-1">
                  <CalendarDays className="h-3.5 w-3.5" />
                  {format(new Date(event.startDate), 'MMM d, yyyy · h:mm a')}
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {event.location}
                </span>
                <span className="flex items-center gap-1">
                  <Tag className="h-3.5 w-3.5" />
                  {event.categoryName}
                </span>
              </div>
            </div>
            <StatusBadge status={event.displayStatus} />
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-5xl space-y-5 px-4 py-6">

        {/* ── 4 stat cards ── */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <InsightCard
            label="Confirmed"
            value={analytics.confirmedBookings}
            icon={Users}
            colorClass="border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300"
          />
          <InsightCard
            label="Checked In"
            value={analytics.totalCheckedIn}
            icon={CheckCircle2}
            colorClass="border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300"
          />
          <InsightCard
            label="Waitlist"
            value={analytics.waitlistCount}
            icon={Clock}
            colorClass="border-sky-200 dark:border-sky-800 bg-sky-50 dark:bg-sky-950/30 text-sky-700 dark:text-sky-300"
          />
          <InsightCard
            label="Cancelled"
            value={analytics.cancelledBookings}
            icon={XCircle}
            colorClass="border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300"
          />
        </div>

        {/* ── Capacity + Revenue/Rating ── */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">

          {/* Capacity Usage */}
          <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-5 shadow-sm">
            <h2 className="font-semibold text-stone-900 dark:text-stone-100">Capacity Usage</h2>
            <p className="mt-0.5 text-xs text-stone-400">How full is your event?</p>
            <div className="mt-5 space-y-4">
              <ProgressRow
                label="Booking rate"
                pct={analytics.occupancyRate}
                count={`${analytics.confirmedBookings} / ${analytics.totalCapacity}`}
                barClass="bg-amber-500"
              />
              <ProgressRow
                label="Check-in rate"
                pct={analytics.checkInRate}
                count={`${analytics.totalCheckedIn} / ${analytics.confirmedBookings}`}
                barClass="bg-emerald-500"
              />
            </div>
            <p className="mt-4 text-xs text-stone-400">
              {analytics.totalCapacity - analytics.confirmedBookings} seat{analytics.totalCapacity - analytics.confirmedBookings !== 1 ? 's' : ''} still available
            </p>
          </div>

          {/* Revenue & Rating */}
          <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-5 shadow-sm">
            <h2 className="font-semibold text-stone-900 dark:text-stone-100">Revenue & Rating</h2>
            <p className="mt-0.5 text-xs text-stone-400">Financial performance & attendee satisfaction</p>
            <div className="mt-5">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-emerald-100 dark:bg-emerald-900/30 p-2.5">
                  <DollarSign className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-stone-900 dark:text-stone-100">
                    {formatCurrency(analytics.totalRevenue)}
                  </p>
                  <p className="text-xs text-stone-400">
                    {avgPerAttendee > 0 ? `${formatCurrency(avgPerAttendee)} per attendee` : 'Free event'}
                  </p>
                </div>
              </div>

              <div className="mt-5 border-t border-stone-100 dark:border-stone-800 pt-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-amber-100 dark:bg-amber-900/30 p-2.5">
                    <Star className="h-5 w-5 text-amber-500" />
                  </div>
                  <div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-stone-900 dark:text-stone-100">
                        {analytics.averageRating > 0 ? analytics.averageRating.toFixed(1) : '—'}
                      </span>
                      <div className="flex">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <span
                            key={s}
                            className={`text-lg leading-none ${
                              s <= Math.round(analytics.averageRating)
                                ? 'text-amber-400'
                                : 'text-stone-200 dark:text-stone-700'
                            }`}
                          >
                            ★
                          </span>
                        ))}
                      </div>
                    </div>
                    <p className="text-xs text-stone-400">
                      {analytics.reviewCount} review{analytics.reviewCount !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Booking trend ── */}
        <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="font-semibold text-stone-900 dark:text-stone-100">Booking Trend</h2>
              <p className="mt-0.5 text-xs text-stone-400">Daily confirmed bookings — last 30 days</p>
            </div>
            {peakDay && (
              <div className="text-right">
                <p className="text-xs text-stone-400">Peak day</p>
                <p className="text-sm font-semibold text-stone-700 dark:text-stone-300">
                  {peakDay.date} · {peakDay.bookings} booking{peakDay.bookings !== 1 ? 's' : ''}
                </p>
              </div>
            )}
          </div>
          {trendData.length > 0 ? (
            <div className="mt-4">
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={trendData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#292524' : '#f1f5f9'} />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: isDark ? '#a8a29e' : '#78716c' }} />
                  <YAxis tick={{ fontSize: 11, fill: isDark ? '#a8a29e' : '#78716c' }} allowDecimals={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Line
                    type="monotone"
                    dataKey="bookings"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    dot={{ fill: '#f59e0b', r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="mt-4 flex h-32 items-center justify-center text-sm text-stone-400">
              No booking data in the last 30 days
            </div>
          )}
        </div>

        {/* ── Daily booking bar chart (top days) ── */}
        {trendData.length > 0 && (
          <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-5 shadow-sm">
            <h2 className="font-semibold text-stone-900 dark:text-stone-100">Booking Volume by Day</h2>
            <p className="mt-0.5 text-xs text-stone-400">Top booking days at a glance</p>
            <div className="mt-4">
              <ResponsiveContainer width="100%" height={160}>
                <BarChart
                  data={[...trendData].sort((a, b) => b.bookings - a.bookings).slice(0, 10)}
                  margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#292524' : '#f5f5f4'} vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: isDark ? '#a8a29e' : '#78716c' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: isDark ? '#a8a29e' : '#78716c' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ fill: isDark ? 'rgba(255,255,255,0.04)' : '#f5f5f4' }} />
                  <Bar dataKey="bookings" fill={isDark ? '#f59e0b' : '#1c1917'} radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* ── Attendee table ── */}
        <div className="overflow-hidden rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 shadow-sm">
          <div className="border-b border-stone-100 dark:border-stone-800 px-5 py-4">
            <h2 className="font-semibold text-stone-900 dark:text-stone-100">Attendees</h2>
            <p className="mt-0.5 text-xs text-stone-400">
              {analytics.confirmedBookings} confirmed · {analytics.totalCheckedIn} checked in
            </p>
          </div>
          <AttendeeTable eventId={eventId} />
        </div>

      </div>
    </div>
  )
}

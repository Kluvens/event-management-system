import { useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  Calendar,
  MapPin,
  QrCode,
  CalendarPlus,
  Printer,
  Ticket,
  CheckCircle2,
  Clock,
  XCircle,
  ChevronRight,
  Star,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { useMineBookings, useCancelBooking, bookingsApi } from '@/api/bookings'
import { formatDate, formatCurrency } from '@/lib/utils'
import { QRCodeSVG } from 'qrcode.react'
import type { Booking } from '@/types'

// ── Helpers ───────────────────────────────────────────────────────────────────

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function getLabel(b: Booking): { text: string } {
  if (b.status === 'Cancelled') return { text: 'Cancelled' }
  const now = Date.now()
  if (new Date(b.eventEndDate).getTime() < now) return { text: 'Completed' }
  if (new Date(b.eventStartDate).getTime() <= now) return { text: 'Happening Now' }
  return { text: 'Upcoming' }
}

const CARD_ACCENTS = [
  'border-l-amber-400',
  'border-l-purple-500',
  'border-l-blue-500',
  'border-l-emerald-400',
  'border-l-rose-400',
  'border-l-cyan-400',
]

type TabKey = 'upcoming' | 'past' | 'cancelled'

const TABS: { key: TabKey; label: string; icon: React.ElementType }[] = [
  { key: 'upcoming',  label: 'Upcoming',  icon: Clock        },
  { key: 'past',      label: 'Past',      icon: CheckCircle2 },
  { key: 'cancelled', label: 'Cancelled', icon: XCircle      },
]

// ── Booking card ──────────────────────────────────────────────────────────────

function BookingCard({
  booking,
  isPast = false,
  onQr,
  onCancel,
}: {
  booking: Booking
  isPast?: boolean
  onQr: (b: Booking) => void
  onCancel: (b: Booking) => void
}) {
  const accent = CARD_ACCENTS[booking.eventId % CARD_ACCENTS.length]
  const { text: labelText } = getLabel(booking)
  const canCancel = !isPast && booking.status !== 'Cancelled'

  return (
    <div className="group overflow-hidden rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 shadow-sm transition-shadow hover:shadow-md">
      {/* Image banner — only when a real photo exists */}
      {booking.eventImageUrl && (
        <div className="relative h-40 w-full overflow-hidden">
          <img
            src={booking.eventImageUrl}
            alt={booking.eventTitle}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
          <span className="absolute left-3 top-3 rounded-full bg-black/50 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-sm">
            {labelText}
          </span>
        </div>
      )}

      <div className={`p-5 ${!booking.eventImageUrl ? `border-l-4 ${accent}` : ''}`}>
        <div className="flex items-start justify-between gap-3">
          <Link
            to={`/events/${booking.eventId}`}
            className="text-sm font-semibold text-stone-900 dark:text-stone-100 hover:text-amber-600 dark:hover:text-amber-400 transition-colors leading-snug"
          >
            {booking.eventTitle}
          </Link>
          {!booking.eventImageUrl && (
            <span className="shrink-0 rounded-full bg-stone-100 dark:bg-stone-800 px-2 py-0.5 text-[10px] font-semibold text-stone-500 dark:text-stone-400">
              {labelText}
            </span>
          )}
        </div>

        <div className="mt-3 space-y-1.5 text-xs text-stone-500 dark:text-stone-400">
          <div className="flex items-center gap-2">
            <Calendar className="h-3.5 w-3.5 shrink-0 text-amber-500" />
            {formatDate(booking.eventStartDate, 'EEE, MMM d yyyy · h:mm a')}
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-amber-500" />
            {booking.eventLocation}
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-stone-900 dark:text-stone-100">
              {formatCurrency(booking.eventPrice)}
            </span>
            {booking.pointsEarned > 0 && booking.status !== 'Cancelled' && (
              <span className="flex items-center gap-0.5 rounded-full bg-amber-50 dark:bg-amber-950/30 px-2 py-0.5 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                <Star className="h-2.5 w-2.5" />
                +{booking.pointsEarned} pts
              </span>
            )}
          </div>
          {booking.isCheckedIn && (
            <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-3 w-3" />
              Checked in
            </span>
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-stone-100 dark:border-stone-800 pt-4">
          {canCancel && (
            <>
              <Button size="sm" variant="outline" className="h-7 gap-1.5 text-xs" onClick={() => onQr(booking)}>
                <QrCode className="h-3.5 w-3.5" />
                QR Code
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-7 gap-1.5 text-xs"
                onClick={() =>
                  bookingsApi.downloadIcs(booking.id).then((blob) => downloadBlob(blob, `event-${booking.eventId}.ics`))
                }
              >
                <CalendarPlus className="h-3.5 w-3.5" />
                Add to Calendar
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="ml-auto h-7 text-xs text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                onClick={() => onCancel(booking)}
              >
                Cancel
              </Button>
            </>
          )}
          {(isPast || booking.status === 'Cancelled') && (
            <Link
              to={`/events/${booking.eventId}`}
              className="ml-auto flex items-center gap-0.5 text-xs font-semibold text-amber-600 dark:text-amber-400 hover:text-amber-700 transition-colors"
            >
              {booking.status === 'Cancelled' ? 'View Event' : 'View & Review'}
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState({ tab }: { tab: TabKey }) {
  const msgs: Record<TabKey, string> = {
    upcoming: 'No upcoming bookings.',
    past: 'No past events yet.',
    cancelled: 'No cancelled bookings.',
  }
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-stone-200 dark:border-stone-800 py-16 text-center">
      <div className="mb-3 rounded-full bg-stone-100 dark:bg-stone-800 p-4">
        <Ticket className="h-6 w-6 text-stone-400" />
      </div>
      <p className="text-sm font-medium text-stone-500 dark:text-stone-400">{msgs[tab]}</p>
      {tab === 'upcoming' && (
        <Button asChild size="sm" variant="outline" className="mt-4">
          <Link to="/">Browse Events</Link>
        </Button>
      )}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function MyBookingsPage() {
  const { data: bookings = [], isPending } = useMineBookings()
  const cancel = useCancelBooking()
  const [activeTab, setActiveTab] = useState<TabKey>('upcoming')
  const [qrBooking, setQrBooking] = useState<Booking | null>(null)
  const [cancelTarget, setCancelTarget] = useState<Booking | null>(null)
  const ticketRef = useRef<HTMLDivElement>(null)

  function handlePrint() {
    const content = ticketRef.current
    if (!content) return
    const win = window.open('', '_blank', 'width=480,height=700')
    if (!win) return
    win.document.write(`
      <html><head><title>Event Ticket</title>
      <style>
        body { font-family: sans-serif; padding: 24px; color: #111; }
        .logo { font-size: 18px; font-weight: 800; color: #d97706; margin-bottom: 16px; }
        .title { font-size: 20px; font-weight: 700; margin-bottom: 4px; }
        .meta { font-size: 13px; color: #555; margin: 2px 0; }
        .divider { border: none; border-top: 1px dashed #ccc; margin: 16px 0; }
        .label { font-size: 11px; color: #888; text-transform: uppercase; letter-spacing: .05em; }
        .value { font-size: 14px; font-weight: 600; margin-top: 2px; }
        .qr { text-align: center; margin: 20px 0; }
        .token { font-family: monospace; font-size: 10px; color: #888; word-break: break-all; text-align: center; }
        .footer { font-size: 11px; color: #aaa; text-align: center; margin-top: 24px; }
      </style></head><body>
      ${content.innerHTML}
      </body></html>
    `)
    win.document.close()
    win.focus()
    win.print()
    win.close()
  }

  const now = Date.now()
  const confirmed = bookings.filter((b) => b.status === 'Confirmed')
  const upcoming  = confirmed.filter((b) => new Date(b.eventEndDate).getTime() >= now)
  const past      = confirmed.filter((b) => new Date(b.eventEndDate).getTime() < now)
  const cancelled = bookings.filter((b) => b.status === 'Cancelled')

  const tabLists: Record<TabKey, Booking[]> = { upcoming, past, cancelled }

  if (isPending) return <LoadingSpinner />

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950">

      {/* ── Header ── */}
      <div className="border-b border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900">
        <div className="container mx-auto max-w-4xl px-4 py-6">
          <h1 className="text-xl font-bold text-stone-900 dark:text-stone-100 sm:text-2xl">My Bookings</h1>
          <p className="mt-1 text-xs text-stone-400 sm:text-sm">
            All your event tickets in one place
          </p>

          {/* ── Stat row ── */}
          <div className="mt-5 grid grid-cols-3 gap-3">
            {[
              { label: 'Upcoming',  value: upcoming.length,  icon: Clock,        color: 'text-amber-500',   bg: 'bg-amber-50 dark:bg-amber-950/30'   },
              { label: 'Attended',  value: past.length,      icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-950/30' },
              { label: 'Cancelled', value: cancelled.length, icon: XCircle,      color: 'text-rose-500',    bg: 'bg-rose-50 dark:bg-rose-950/30'    },
            ].map(({ label, value, icon: Icon, color, bg }) => (
              <div key={label} className={`rounded-2xl ${bg} border border-stone-100 dark:border-stone-800 p-4`}>
                <div className="flex items-center gap-2">
                  <Icon className={`h-4 w-4 ${color}`} />
                  <span className="text-xs font-medium text-stone-500 dark:text-stone-400">{label}</span>
                </div>
                <p className="mt-1.5 text-2xl font-bold text-stone-900 dark:text-stone-100">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-4xl px-4 py-6">

        {/* ── Custom tabs ── */}
        <div className="mb-5 flex gap-1 rounded-xl bg-stone-100 dark:bg-stone-800/60 p-1">
          {TABS.map(({ key, label, icon: Icon }) => {
            const count = tabLists[key].length
            return (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                  activeTab === key
                    ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-sm'
                    : 'text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-300'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
                {count > 0 && (
                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none ${
                    activeTab === key
                      ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400'
                      : 'bg-stone-200 dark:bg-stone-700 text-stone-500 dark:text-stone-400'
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* ── Card list ── */}
        <div className="space-y-3">
          {tabLists[activeTab].length === 0 ? (
            <EmptyState tab={activeTab} />
          ) : (
            tabLists[activeTab].map((b) => (
              <BookingCard
                key={b.id}
                booking={b}
                isPast={activeTab === 'past'}
                onQr={setQrBooking}
                onCancel={setCancelTarget}
              />
            ))
          )}
        </div>
      </div>

      {/* ── Ticket modal ── */}
      <Dialog open={!!qrBooking} onOpenChange={() => setQrBooking(null)}>
        <DialogContent className="max-w-sm p-0">
          <DialogHeader className="px-6 pt-5">
            <DialogTitle className="flex items-center gap-2">
              <Ticket className="h-4 w-4 text-amber-500" />
              Your Ticket
            </DialogTitle>
          </DialogHeader>

          <div ref={ticketRef} className="px-6 pb-2">
            <p className="logo mb-3 text-lg font-extrabold text-amber-600">EventHub</p>
            <p className="title text-base font-bold leading-snug">{qrBooking?.eventTitle}</p>
            <div className="mt-2 space-y-1">
              <p className="meta flex items-center gap-1.5 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                {qrBooking && formatDate(qrBooking.eventStartDate, 'EEE, MMM d yyyy · h:mm a')}
              </p>
              <p className="meta flex items-center gap-1.5 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3" />
                {qrBooking?.eventLocation}
              </p>
            </div>

            <Separator className="divider my-4 border-dashed" />

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="label text-[10px] uppercase tracking-wide text-muted-foreground">Booking ID</p>
                <p className="value font-semibold">#{qrBooking?.id}</p>
              </div>
              <div>
                <p className="label text-[10px] uppercase tracking-wide text-muted-foreground">Amount Paid</p>
                <p className="value font-semibold">{qrBooking && formatCurrency(qrBooking.eventPrice)}</p>
              </div>
              {(qrBooking?.pointsEarned ?? 0) > 0 && (
                <div>
                  <p className="label text-[10px] uppercase tracking-wide text-muted-foreground">Points Earned</p>
                  <p className="value font-semibold text-amber-600">+{qrBooking?.pointsEarned}</p>
                </div>
              )}
              {qrBooking?.isCheckedIn && (
                <div>
                  <p className="label text-[10px] uppercase tracking-wide text-muted-foreground">Checked In</p>
                  <p className="value font-semibold text-emerald-600">Yes</p>
                </div>
              )}
            </div>

            <Separator className="divider my-4 border-dashed" />

            <div className="qr flex flex-col items-center gap-3">
              <QRCodeSVG value={qrBooking?.checkInToken ?? ''} size={180} />
              <p className="token break-all text-center font-mono text-[10px] text-muted-foreground">
                {qrBooking?.checkInToken}
              </p>
            </div>

            <p className="footer mt-4 text-center text-[10px] text-muted-foreground">
              Present this QR code at the door for check-in.
            </p>
          </div>

          <div className="flex justify-end gap-2 border-t border-border px-6 py-4">
            <Button variant="outline" size="sm" className="gap-1.5" onClick={handlePrint}>
              <Printer className="h-3.5 w-3.5" />
              Print
            </Button>
            <Button size="sm" onClick={() => setQrBooking(null)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!cancelTarget}
        onOpenChange={() => setCancelTarget(null)}
        title="Cancel Booking"
        description="Are you sure? Cancellations within 7 days of the event are not allowed."
        confirmLabel="Cancel Booking"
        onConfirm={() => {
          if (cancelTarget) {
            cancel.mutate(cancelTarget.id, {
              onSettled: () => setCancelTarget(null),
            })
          }
        }}
        loading={cancel.isPending}
      />
    </div>
  )
}

import { useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Calendar, MapPin, QrCode, CalendarPlus, Printer, Ticket } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function getBookingLabel(b: Booking): string {
  if (b.status === 'Cancelled') return 'Cancelled by You'
  const now = Date.now()
  const start = new Date(b.eventStartDate).getTime()
  const end = new Date(b.eventEndDate).getTime()
  if (end < now) return 'Event Completed'
  if (start <= now) return 'Happening Now'
  return 'Upcoming'
}

function getLabelClass(b: Booking): string {
  if (b.status === 'Cancelled') return 'border-red-200 bg-red-50 text-red-600'
  const now = Date.now()
  if (new Date(b.eventEndDate).getTime() < now)
    return 'border-border bg-muted text-muted-foreground'
  if (new Date(b.eventStartDate).getTime() <= now)
    return 'border-emerald-200 bg-emerald-50 text-emerald-700'
  return 'border-amber-200 bg-amber-50 text-amber-700'
}

export function MyBookingsPage() {
  const { data: bookings = [], isPending } = useMineBookings()
  const cancel = useCancelBooking()
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

  if (isPending) return <LoadingSpinner />

  function BookingCard({ booking, isPast = false }: { booking: Booking; isPast?: boolean }) {
    return (
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm transition-shadow hover:shadow-md sm:p-5">
        <div className="mb-3 flex items-start justify-between gap-3">
          <Link
            to={`/events/${booking.eventId}`}
            className="text-sm font-semibold text-card-foreground hover:text-amber-600 sm:text-base"
          >
            {booking.eventTitle}
          </Link>
          <Badge
            variant="outline"
            className={`shrink-0 text-xs ${getLabelClass(booking)}`}
          >
            {getBookingLabel(booking)}
          </Badge>
        </div>

        <div className="mb-3 space-y-1.5 text-xs text-muted-foreground sm:text-sm">
          <div className="flex items-center gap-2">
            <Calendar className="h-3.5 w-3.5 shrink-0" />
            {formatDate(booking.eventStartDate, 'MMM d, yyyy · h:mm a')}
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            {booking.eventLocation}
          </div>
        </div>

        <div className="mb-4 flex items-center justify-between text-sm">
          <span className="font-medium text-foreground">
            {formatCurrency(booking.eventPrice)}
          </span>
          {booking.pointsEarned > 0 && booking.status !== 'Cancelled' && (
            <span className="text-xs font-medium text-amber-600">
              +{booking.pointsEarned} pts
            </span>
          )}
        </div>

        {booking.isCheckedIn && (
          <div className="mb-3 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">
            Checked in
            {booking.checkedInAt
              ? ` · ${formatDate(booking.checkedInAt, 'MMM d · h:mm a')}`
              : ''}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {!isPast && booking.status !== 'Cancelled' && (
            <>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5"
                onClick={() => setQrBooking(booking)}
              >
                <QrCode className="h-3.5 w-3.5" />
                QR Code
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5"
                onClick={() =>
                  bookingsApi
                    .downloadIcs(booking.id)
                    .then((blob) => downloadBlob(blob, `event-${booking.eventId}.ics`))
                }
              >
                <CalendarPlus className="h-3.5 w-3.5" />
                Add to Calendar
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-red-500 hover:text-red-600"
                onClick={() => setCancelTarget(booking)}
              >
                Cancel
              </Button>
            </>
          )}
          {(isPast || booking.status === 'Cancelled') && (
            <Button asChild size="sm" variant="outline">
              <Link to={`/events/${booking.eventId}`}>
                {booking.status === 'Cancelled' ? 'View Event' : 'View & Review'}
              </Link>
            </Button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto max-w-3xl px-4 py-6 sm:py-8">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-foreground sm:text-2xl">My Bookings</h1>
        <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
          {upcoming.length} upcoming · {past.length} past · {cancelled.length} cancelled
        </p>
      </div>

      <Tabs defaultValue="upcoming">
        <TabsList className="mb-4">
          <TabsTrigger value="upcoming">
            Upcoming {upcoming.length > 0 && `(${upcoming.length})`}
          </TabsTrigger>
          <TabsTrigger value="past">
            Past {past.length > 0 && `(${past.length})`}
          </TabsTrigger>
          <TabsTrigger value="cancelled">
            Cancelled {cancelled.length > 0 && `(${cancelled.length})`}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="space-y-3">
          {upcoming.length === 0 ? (
            <div className="rounded-xl border border-border bg-card py-12 text-center">
              <p className="text-muted-foreground">No upcoming bookings.</p>
              <Button asChild className="mt-4" variant="outline">
                <Link to="/">Browse Events</Link>
              </Button>
            </div>
          ) : (
            upcoming.map((b) => <BookingCard key={b.id} booking={b} />)
          )}
        </TabsContent>

        <TabsContent value="past" className="space-y-3">
          {past.length === 0 ? (
            <div className="rounded-xl border border-border bg-card py-12 text-center text-muted-foreground">
              No past events yet.
            </div>
          ) : (
            past.map((b) => <BookingCard key={b.id} booking={b} isPast />)
          )}
        </TabsContent>

        <TabsContent value="cancelled" className="space-y-3">
          {cancelled.length === 0 ? (
            <div className="rounded-xl border border-border bg-card py-12 text-center text-muted-foreground">
              No cancelled bookings.
            </div>
          ) : (
            cancelled.map((b) => <BookingCard key={b.id} booking={b} />)
          )}
        </TabsContent>
      </Tabs>

      {/* Ticket Modal */}
      <Dialog open={!!qrBooking} onOpenChange={() => setQrBooking(null)}>
        <DialogContent className="max-w-sm p-0">
          <DialogHeader className="px-6 pt-5">
            <DialogTitle className="flex items-center gap-2">
              <Ticket className="h-4 w-4 text-amber-500" />
              Your Ticket
            </DialogTitle>
          </DialogHeader>

          {/* Printable ticket area */}
          <div ref={ticketRef} className="px-6 pb-2">
            {/* Header */}
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

            {/* QR Code */}
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

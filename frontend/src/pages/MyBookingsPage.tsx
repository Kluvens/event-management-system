import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Calendar, MapPin, QrCode } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { useMineBookings, useCancelBooking } from '@/api/bookings'
import { formatDate, formatCurrency } from '@/lib/utils'
import { QRCodeSVG } from 'qrcode.react'
import type { Booking } from '@/types'

export function MyBookingsPage() {
  const { data: bookings = [], isPending } = useMineBookings()
  const cancel = useCancelBooking()
  const [qrBooking, setQrBooking] = useState<Booking | null>(null)
  const [cancelTarget, setCancelTarget] = useState<Booking | null>(null)

  const confirmed = bookings.filter((b) => b.status === 'Confirmed')
  const cancelled = bookings.filter((b) => b.status === 'Cancelled')

  if (isPending) return <LoadingSpinner />

  function BookingCard({ booking }: { booking: Booking }) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
        <div className="mb-3 flex items-start justify-between gap-3">
          <Link
            to={`/events/${booking.eventId}`}
            className="text-base font-semibold text-slate-900 hover:text-indigo-600"
          >
            {booking.eventTitle}
          </Link>
          <Badge
            variant={booking.status === 'Confirmed' ? 'default' : 'secondary'}
            className="shrink-0 text-xs"
          >
            {booking.status}
          </Badge>
        </div>

        <div className="mb-3 space-y-1.5 text-sm text-slate-500">
          <div className="flex items-center gap-2">
            <Calendar className="h-3.5 w-3.5" />
            {formatDate(booking.eventStartDate, 'MMM d, yyyy · h:mm a')}
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="h-3.5 w-3.5" />
            {booking.eventLocation}
          </div>
        </div>

        <div className="mb-4 flex items-center justify-between text-sm">
          <span className="font-medium text-slate-700">
            {formatCurrency(booking.eventPrice)}
          </span>
          {booking.pointsEarned > 0 && (
            <span className="text-xs font-medium text-indigo-600">
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

        {booking.status === 'Confirmed' && (
          <div className="flex gap-2">
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
              variant="ghost"
              className="text-red-500 hover:text-red-600"
              onClick={() => setCancelTarget(booking)}
            >
              Cancel
            </Button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">My Bookings</h1>
        <p className="mt-1 text-sm text-slate-500">
          {confirmed.length} confirmed · {cancelled.length} cancelled
        </p>
      </div>

      <Tabs defaultValue="confirmed">
        <TabsList className="mb-4">
          <TabsTrigger value="confirmed">
            Confirmed ({confirmed.length})
          </TabsTrigger>
          <TabsTrigger value="cancelled">
            Cancelled ({cancelled.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="confirmed" className="space-y-3">
          {confirmed.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white py-12 text-center">
              <p className="text-slate-500">No confirmed bookings yet.</p>
              <Button asChild className="mt-4" variant="outline">
                <Link to="/">Browse Events</Link>
              </Button>
            </div>
          ) : (
            confirmed.map((b) => <BookingCard key={b.id} booking={b} />)
          )}
        </TabsContent>

        <TabsContent value="cancelled" className="space-y-3">
          {cancelled.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white py-12 text-center text-slate-500">
              No cancelled bookings.
            </div>
          ) : (
            cancelled.map((b) => <BookingCard key={b.id} booking={b} />)
          )}
        </TabsContent>
      </Tabs>

      {/* QR Modal */}
      <Dialog open={!!qrBooking} onOpenChange={() => setQrBooking(null)}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle>Check-In QR Code</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            <p className="text-center text-sm font-medium text-slate-700">
              {qrBooking?.eventTitle}
            </p>
            <QRCodeSVG value={qrBooking?.checkInToken ?? ''} size={200} />
            <p className="break-all text-center font-mono text-xs text-slate-400">
              {qrBooking?.checkInToken}
            </p>
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

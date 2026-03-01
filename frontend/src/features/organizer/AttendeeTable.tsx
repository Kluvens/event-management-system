import { useState } from 'react'
import { Download, Search, UserCheck, QrCode } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import {
  useEventAttendees,
  useOrganizerCancelBooking,
  organizersApi,
} from '@/api/organizers'
import { useCheckinById } from '@/api/bookings'
import { formatDateTime, formatRelative } from '@/lib/utils'
import { QRCodeSVG } from 'qrcode.react'
import type { AttendeeRecord } from '@/types'

interface Props {
  eventId: number
}

export function AttendeeTable({ eventId }: Props) {
  const { data: attendees = [], isPending } = useEventAttendees(eventId)
  const cancelBooking = useOrganizerCancelBooking(eventId)
  const checkin = useCheckinById()

  const [search, setSearch] = useState('')
  const [qrRecord, setQrRecord] = useState<AttendeeRecord | null>(null)
  const [refundTarget, setRefundTarget] = useState<AttendeeRecord | null>(null)

  const filtered = attendees.filter(
    (a) =>
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.email.toLowerCase().includes(search.toLowerCase())
  )

  async function handleExport() {
    try {
      const res = await organizersApi.exportAttendees(eventId)
      const blob = res.data as Blob
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `attendees-event-${eventId}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      // handled by api layer
    }
  }

  const confirmed = attendees.filter(
    (a) => a.bookingStatus === 'Confirmed'
  ).length
  const checkedIn = attendees.filter((a) => a.isCheckedIn).length

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-4 text-sm">
          <span className="text-muted-foreground">
            <strong className="text-foreground">{confirmed}</strong> confirmed
          </span>
          <span className="text-emerald-600 dark:text-emerald-400">
            <strong>{checkedIn}</strong> checked in
          </span>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search attendees…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 pl-8 text-sm"
            />
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={handleExport}
            className="gap-1"
          >
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Attendee</TableHead>
              <TableHead>Booked</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Check-in</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isPending ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="py-8 text-center text-muted-foreground"
                >
                  Loading…
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="py-8 text-center text-muted-foreground"
                >
                  No attendees found.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((a) => (
                <TableRow key={a.bookingId}>
                  <TableCell>
                    <div>
                      <p className="text-sm font-medium">{a.name}</p>
                      <p className="text-xs text-muted-foreground">{a.email}</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatRelative(a.bookedAt)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={`text-xs ${
                        a.bookingStatus === 'Confirmed'
                          ? 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-400'
                          : 'border-stone-200 bg-stone-50 text-stone-500 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-400'
                      }`}
                    >
                      {a.bookingStatus}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {a.isCheckedIn ? (
                      <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                        {a.checkedInAt
                          ? formatDateTime(a.checkedInAt)
                          : 'Checked in'}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        Not checked in
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0"
                        onClick={() => setQrRecord(a)}
                        title="View QR"
                      >
                        <QrCode className="h-3.5 w-3.5" />
                      </Button>
                      {a.bookingStatus === 'Confirmed' && !a.isCheckedIn && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-emerald-600 hover:text-emerald-700"
                          onClick={() => checkin.mutate(a.bookingId)}
                          title="Check in"
                        >
                          <UserCheck className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      {a.bookingStatus === 'Confirmed' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-red-500 hover:text-red-600"
                          onClick={() => setRefundTarget(a)}
                          title="Refund booking"
                        >
                          ×
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* QR Modal */}
      <Dialog open={!!qrRecord} onOpenChange={() => setQrRecord(null)}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle>Check-In QR – {qrRecord?.name}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-3 py-4">
            <QRCodeSVG value={qrRecord?.checkInToken ?? ''} size={200} />
            <p className="break-all text-center font-mono text-xs text-muted-foreground">
              {qrRecord?.checkInToken}
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Refund confirm */}
      <ConfirmDialog
        open={!!refundTarget}
        onOpenChange={() => setRefundTarget(null)}
        title="Refund Booking"
        description={`Cancel and refund ${refundTarget?.name}'s booking? Their loyalty points will be deducted.`}
        confirmLabel="Refund"
        onConfirm={() => {
          if (refundTarget) {
            cancelBooking.mutate(refundTarget.bookingId, {
              onSettled: () => setRefundTarget(null),
            })
          }
        }}
        loading={cancelBooking.isPending}
      />
    </div>
  )
}

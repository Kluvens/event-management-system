import { Link } from 'react-router-dom'
import { Calendar, MapPin } from 'lucide-react'
import { StatusBadge } from './StatusBadge'
import { formatDateRange, formatCurrency } from '@/lib/utils'
import type { Event } from '@/types'

// Category-based gradient backgrounds used when no image is uploaded
const CATEGORY_GRADIENTS: Record<string, string> = {
  Conference: 'from-blue-600 to-indigo-700',
  Workshop:   'from-emerald-500 to-teal-600',
  Concert:    'from-purple-600 to-pink-600',
  Sports:     'from-orange-500 to-red-600',
  Networking: 'from-cyan-500 to-blue-600',
  Other:      'from-slate-500 to-slate-700',
}

interface Props {
  event: Event
}

export function EventCard({ event }: Props) {
  const spotsLeft    = event.capacity - event.bookingCount
  const occupancy    = event.capacity > 0 ? event.bookingCount / event.capacity : 0
  const isAlmostFull = (occupancy >= 0.8 || spotsLeft <= 10) && spotsLeft > 0
  const isFree       = event.price === 0
  const gradient     = CATEGORY_GRADIENTS[event.categoryName] ?? CATEGORY_GRADIENTS['Other']

  return (
    <Link
      to={`/events/${event.id}`}
      className="group block overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-900/5 transition-shadow duration-200 hover:shadow-md"
    >
      {/* Hero image */}
      <div className="relative h-48 w-full overflow-hidden">
        {event.imageUrl ? (
          <img
            src={event.imageUrl}
            alt={event.title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div
            className={`flex h-full w-full items-center justify-center bg-gradient-to-br ${gradient}`}
          >
            <span className="text-5xl font-bold text-white/20 select-none">
              {event.categoryName.charAt(0)}
            </span>
          </div>
        )}

        {/* Status badge — top-right corner */}
        <div className="absolute right-3 top-3">
          <StatusBadge status={event.displayStatus} showDot />
        </div>
      </div>

      {/* Card body */}
      <div className="p-4">
        {/* "Almost full" pill — matches Eventbrite style */}
        {isAlmostFull && (
          <span className="mb-2 inline-block rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-medium text-rose-600">
            Almost full
          </span>
        )}

        {/* Title */}
        <h3 className="mb-2 line-clamp-2 text-base font-semibold leading-snug text-slate-900">
          {event.title}
        </h3>

        {/* Date */}
        <div className="mb-1 flex items-center gap-1.5 text-sm font-semibold text-slate-800">
          <Calendar className="h-3.5 w-3.5 shrink-0 text-slate-400" />
          <span className="truncate">{formatDateRange(event.startDate, event.endDate)}</span>
        </div>

        {/* Location */}
        <div className="mb-3 flex items-center gap-1.5 text-sm text-slate-500">
          <MapPin className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{event.location}</span>
        </div>

        {/* Price */}
        <p
          className={`text-base font-bold ${
            isFree ? 'text-emerald-600' : 'text-slate-900'
          }`}
        >
          {formatCurrency(event.price)}
        </p>
      </div>
    </Link>
  )
}

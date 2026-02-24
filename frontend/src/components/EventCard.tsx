import { Link } from 'react-router-dom'
import { Calendar, MapPin, Users } from 'lucide-react'
import { HoverBorderGradient } from './aceternity/HoverBorderGradient'
import { StatusBadge } from './StatusBadge'
import { formatDateRange, formatCurrency } from '@/lib/utils'
import type { Event } from '@/types'

interface Props {
  event: Event
}

export function EventCard({ event }: Props) {
  const spotsLeft = event.capacity - event.bookingCount
  const isFree = event.price === 0

  return (
    <HoverBorderGradient containerClassName="h-full">
      <Link to={`/events/${event.id}`} className="flex h-full flex-col p-5">
        {/* Header */}
        <div className="mb-3 flex items-start justify-between gap-2">
          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
            {event.categoryName}
          </span>
          <StatusBadge status={event.displayStatus} showDot />
        </div>

        {/* Title */}
        <h3 className="mb-2 line-clamp-2 text-base font-semibold leading-snug text-slate-900">
          {event.title}
        </h3>

        {/* Meta */}
        <div className="mb-3 space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Calendar className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{formatDateRange(event.startDate, event.endDate)}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{event.location}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Users className="h-3.5 w-3.5 shrink-0" />
            <span>
              {event.bookingCount}/{event.capacity} booked
              {spotsLeft <= 10 && spotsLeft > 0 && (
                <span className="ml-1 font-medium text-orange-600">
                  · {spotsLeft} left
                </span>
              )}
            </span>
          </div>
        </div>

        {/* Tags */}
        {event.tags.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-1">
            {event.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs text-indigo-600"
              >
                {tag}
              </span>
            ))}
            {event.tags.length > 3 && (
              <span className="text-xs text-slate-400">
                +{event.tags.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="mt-auto flex items-center justify-between border-t border-slate-100 pt-3">
          <span
            className={
              isFree
                ? 'text-sm font-semibold text-emerald-600'
                : 'text-sm font-semibold text-slate-900'
            }
          >
            {formatCurrency(event.price)}
          </span>
          <span className="text-xs font-medium text-indigo-600">
            View details →
          </span>
        </div>
      </Link>
    </HoverBorderGradient>
  )
}

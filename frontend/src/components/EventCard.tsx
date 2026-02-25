import { Link, useNavigate } from 'react-router-dom'
import { Calendar, MapPin, Heart } from 'lucide-react'
import { StatusBadge } from './StatusBadge'
import { cn, formatDateRange, formatCurrency } from '@/lib/utils'
import { useMyFavoriteIds, useToggleFavorite } from '@/api/favorites'
import { useAuthStore } from '@/stores/authStore'
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

function HeartButton({ event }: { event: Event }) {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { data: ids = [] } = useMyFavoriteIds()
  const isFaved = ids.includes(event.id)
  const { addMutation, removeMutation } = useToggleFavorite(event.id)
  const isPending = addMutation.isPending || removeMutation.isPending

  function handleClick(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (!user) { navigate('/login'); return }
    if (isFaved) removeMutation.mutate()
    else addMutation.mutate()
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      aria-label={isFaved ? 'Remove from favourites' : 'Save to favourites'}
      className={cn(
        'flex h-7 w-7 items-center justify-center rounded-full transition-all',
        'bg-white/90 shadow-sm backdrop-blur-sm hover:scale-110 active:scale-95',
        isPending && 'opacity-50'
      )}
    >
      <Heart
        className={cn(
          'h-3.5 w-3.5 transition-colors',
          isFaved ? 'fill-rose-500 text-rose-500' : 'text-slate-500'
        )}
      />
    </button>
  )
}

export function EventCard({ event }: Props) {
  const now          = Date.now()
  const startMs      = new Date(event.startDate).getTime()
  const createdMs    = new Date(event.createdAt).getTime()
  const spotsLeft    = event.capacity - event.bookingCount
  const occupancy    = event.capacity > 0 ? event.bookingCount / event.capacity : 0
  const msUntilStart = startMs - now
  const daysSinceCreated = (now - createdMs) / (1000 * 60 * 60 * 24)

  const isActive       = event.displayStatus === 'Published' || event.displayStatus === 'Live'
  const isAlmostFull   = isActive && (occupancy >= 0.8 || spotsLeft <= 10) && spotsLeft > 0
  const isStartingSoon = isActive && msUntilStart > 0 && msUntilStart <= 72 * 60 * 60 * 1000
  const isNew          = event.displayStatus === 'Published' && daysSinceCreated <= 7
  const isDimmed       = event.displayStatus === 'Cancelled' || event.displayStatus === 'Completed'

  const isFree   = event.price === 0
  const gradient = CATEGORY_GRADIENTS[event.categoryName] ?? CATEGORY_GRADIENTS['Other']

  // Only show one pill — priority: Almost Full > Starts Soon > New
  const pill = isAlmostFull
    ? { label: 'Almost full', classes: 'bg-rose-50 text-rose-600' }
    : isStartingSoon
    ? { label: 'Starts soon', classes: 'bg-amber-50 text-amber-700' }
    : isNew
    ? { label: 'New',         classes: 'bg-indigo-50 text-indigo-600' }
    : null

  return (
    <Link
      to={`/events/${event.id}`}
      className={cn(
        'group block overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-900/5 transition-shadow duration-200 hover:shadow-md',
        isDimmed && 'opacity-60 grayscale'
      )}
    >
      {/* Hero image */}
      <div className="relative h-44 w-full overflow-hidden sm:h-48">
        {event.imageUrl ? (
          <img
            src={event.imageUrl}
            alt={event.title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className={`flex h-full w-full items-center justify-center bg-gradient-to-br ${gradient}`}>
            <span className="select-none text-5xl font-bold text-white/20">
              {event.categoryName.charAt(0)}
            </span>
          </div>
        )}

        {/* Status badge — top-left */}
        <div className="absolute left-3 top-3">
          <StatusBadge status={event.displayStatus} showDot />
        </div>

        {/* Heart / favourite button — top-right */}
        <div className="absolute right-3 top-3">
          <HeartButton event={event} />
        </div>
      </div>

      {/* Card body */}
      <div className="p-4">
        {pill && (
          <span className={cn('mb-2 inline-block rounded-full px-2.5 py-0.5 text-xs font-medium', pill.classes)}>
            {pill.label}
          </span>
        )}

        <h3 className="mb-2 line-clamp-2 text-sm font-semibold leading-snug text-slate-900 sm:text-base">
          {event.title}
        </h3>

        <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-slate-800 sm:text-sm">
          <Calendar className="h-3.5 w-3.5 shrink-0 text-slate-400" />
          <span className="truncate">{formatDateRange(event.startDate, event.endDate)}</span>
        </div>

        <div className="mb-3 flex items-center gap-1.5 text-xs text-slate-500 sm:text-sm">
          <MapPin className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{event.location}</span>
        </div>

        <p className={cn('text-sm font-bold sm:text-base', isFree ? 'text-emerald-600' : 'text-slate-900')}>
          {isFree ? 'Free' : formatCurrency(event.price)}
        </p>
      </div>
    </Link>
  )
}

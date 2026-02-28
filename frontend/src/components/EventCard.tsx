import { Link, useNavigate } from 'react-router-dom'
import { Calendar, MapPin, Heart } from 'lucide-react'
import { motion } from 'framer-motion'
import { StatusBadge } from './StatusBadge'
import { cn, formatDateRange, formatCurrency } from '@/lib/utils'
import { useMyFavoriteIds, useToggleFavorite } from '@/api/favorites'
import { useAuthStore } from '@/stores/authStore'
import type { Event } from '@/types'

// Category-based gradient backgrounds used when no image is uploaded
const CATEGORY_GRADIENTS: Record<string, string> = {
  Conference: 'from-blue-500 to-blue-700',
  Workshop:   'from-emerald-500 to-teal-600',
  Concert:    'from-purple-600 to-pink-600',
  Sports:     'from-orange-400 to-red-500',
  Networking: 'from-amber-400 to-orange-500',
  Other:      'from-stone-400 to-stone-600',
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
    <motion.button
      onClick={handleClick}
      disabled={isPending}
      aria-label={isFaved ? 'Remove from favourites' : 'Save to favourites'}
      whileHover={{ scale: 1.15 }}
      whileTap={{ scale: 0.9 }}
      className={cn(
        'flex h-8 w-8 items-center justify-center rounded-full transition-all',
        'bg-white/90 shadow-md backdrop-blur-sm',
        isPending && 'opacity-50'
      )}
    >
      <Heart
        className={cn(
          'h-4 w-4 transition-colors',
          isFaved ? 'fill-rose-500 text-rose-500' : 'text-slate-500'
        )}
      />
    </motion.button>
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
    ? { label: 'Almost full', classes: 'bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400' }
    : isStartingSoon
    ? { label: 'Starts soon', classes: 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400' }
    : isNew
    ? { label: 'New',         classes: 'bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400' }
    : null

  return (
    <Link
      to={`/events/${event.id}`}
      className={cn(
        'group flex h-full flex-col overflow-hidden rounded-2xl bg-card shadow-sm ring-1 ring-border transition-all duration-300 hover:shadow-xl hover:-translate-y-1',
        isDimmed && 'opacity-60 grayscale'
      )}
    >
      {/* Hero image */}
      <div className="relative h-48 w-full shrink-0 overflow-hidden sm:h-52">
        {event.imageUrl ? (
          <motion.img
            src={event.imageUrl}
            alt={event.title}
            className="h-full w-full object-cover"
            whileHover={{ scale: 1.07 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          />
        ) : (
          <div className={`flex h-full w-full items-center justify-center bg-gradient-to-br ${gradient}`}>
            <span className="select-none text-6xl font-extrabold text-white/20">
              {event.categoryName.charAt(0)}
            </span>
          </div>
        )}

        {/* Status badge — top-left (hidden for Published, which is the default) */}
        {event.displayStatus !== 'Published' && (
          <div className="absolute left-3 top-3">
            <StatusBadge status={event.displayStatus} showDot />
          </div>
        )}

        {/* Heart / favourite button — top-right */}
        <div className="absolute right-3 top-3">
          <HeartButton event={event} />
        </div>
      </div>

      {/* Card body — flex column so price always sits at the bottom */}
      <div className="flex flex-1 flex-col p-4">
        {pill && (
          <span className={cn('mb-2 self-start rounded-full px-2.5 py-0.5 text-xs font-semibold', pill.classes)}>
            {pill.label}
          </span>
        )}

        <h3 className="mb-2 line-clamp-2 text-sm font-bold leading-snug text-card-foreground sm:text-base">
          {event.title}
        </h3>

        <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-muted-foreground sm:text-sm">
          <Calendar className="h-3.5 w-3.5 shrink-0 text-amber-500" />
          <span className="truncate">{formatDateRange(event.startDate, event.endDate)}</span>
        </div>

        <div className="mb-3 flex items-center gap-1.5 text-xs text-muted-foreground sm:text-sm">
          <MapPin className="h-3.5 w-3.5 shrink-0 text-amber-500" />
          <span className="truncate">{event.location}</span>
        </div>

        <p className={cn('mt-auto text-sm font-bold sm:text-base', isFree ? 'text-emerald-600' : 'text-card-foreground')}>
          {isFree ? 'Free' : formatCurrency(event.price)}
        </p>
      </div>
    </Link>
  )
}

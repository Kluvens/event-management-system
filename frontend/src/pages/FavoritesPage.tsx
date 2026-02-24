import { Link } from 'react-router-dom'
import { Heart } from 'lucide-react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { EventCard } from '@/components/EventCard'
import { useMyFavorites } from '@/api/favorites'

export function FavoritesPage() {
  const { data: events = [], isPending } = useMyFavorites()

  return (
    <div className="container mx-auto max-w-7xl px-4 py-6 sm:py-8">
      {/* Header */}
      <div className="mb-6 flex items-center gap-2.5">
        <Heart className="h-5 w-5 fill-rose-500 text-rose-500" />
        <div>
          <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">My Favourites</h1>
          {!isPending && events.length > 0 && (
            <p className="text-xs text-slate-500 sm:text-sm">
              {events.length} saved event{events.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>
      </div>

      {isPending ? (
        <LoadingSpinner />
      ) : events.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 py-20 text-center">
          <div className="mb-4 rounded-full bg-rose-50 p-5">
            <Heart className="h-7 w-7 text-rose-300" />
          </div>
          <h2 className="mb-1 font-semibold text-slate-800">No saved events yet</h2>
          <p className="mb-5 text-sm text-slate-500">
            Tap the heart on any event to save it here.
          </p>
          <Button asChild variant="outline">
            <Link to="/">Browse Events</Link>
          </Button>
        </div>
      ) : (
        <motion.div
          className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          {events.map((event, i) => (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04, duration: 0.3 }}
            >
              <EventCard event={event} />
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  )
}

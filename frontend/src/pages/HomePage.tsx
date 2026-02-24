import { useState } from 'react'
import { motion } from 'framer-motion'
import { useEvents } from '@/api/events'
import { EventCard } from '@/components/EventCard'
import { EventFilters } from '@/components/EventFilters'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { Spotlight } from '@/components/aceternity/Spotlight'
import type { EventFilters as Filters } from '@/types'

export function HomePage() {
  const [filters, setFilters] = useState<Filters>({})
  const { data: events = [], isPending, error } = useEvents(filters)

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-slate-950 pb-16 pt-20">
        <Spotlight className="-top-40 left-0 md:-top-20 md:left-60" fill="white" />
        <div className="container relative z-10 mx-auto max-w-4xl px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <span className="mb-4 inline-block rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-400">
              Discover · Book · Connect
            </span>
            <h1 className="mb-4 text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
              Find events that{' '}
              <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
                inspire you
              </span>
            </h1>
            <p className="mx-auto mb-8 max-w-xl text-base text-slate-400">
              Browse conferences, workshops, concerts, and more. Book your spot in seconds.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Content */}
      <section className="container mx-auto max-w-7xl px-4 py-8">
        <div className="mb-6">
          <EventFilters filters={filters} onChange={setFilters} />
        </div>

        {!isPending && (
          <p className="mb-4 text-sm text-slate-500">
            {events.length === 0
              ? 'No events found.'
              : `${events.length} event${events.length !== 1 ? 's' : ''} found`}
          </p>
        )}

        {isPending ? (
          <LoadingSpinner />
        ) : error ? (
          <div className="py-16 text-center text-slate-500">
            Failed to load events. Please try again.
          </div>
        ) : events.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-4 rounded-full bg-slate-100 p-6">
              <svg
                className="h-8 w-8 text-slate-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
            <h3 className="mb-1 font-semibold text-slate-800">No events found</h3>
            <p className="text-sm text-slate-500">
              Try adjusting your filters or search terms.
            </p>
          </div>
        ) : (
          <motion.div
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
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
      </section>
    </div>
  )
}

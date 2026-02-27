import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { MapPin, ChevronRight, Navigation, Loader2 } from 'lucide-react'
import { useInfiniteEvents, eventsApi } from '@/api/events'
import { EventCard } from '@/components/EventCard'
import { EventFilters } from '@/components/EventFilters'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { Spotlight } from '@/components/aceternity/Spotlight'
import { useUserLocation } from '@/hooks/useUserLocation'
import type { EventFilters as Filters } from '@/types'

export function HomePage() {
  const [filters, setFilters] = useState<Filters>({})
  const allEventsRef = useRef<HTMLElement>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)

  const { city, loading: locationLoading, source } = useUserLocation()

  // Nearby events: only fetch once city is known
  const { data: nearbyEvents = [], isPending: nearbyPending } = useQuery({
    queryKey: ['events', 'nearby', city],
    queryFn: () => eventsApi.list({ location: city! }),
    enabled: city !== null,
  })

  const {
    data,
    isPending,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    error,
  } = useInfiniteEvents(filters)

  const events = data?.pages.flatMap((p) => p.items) ?? []
  const totalCount = data?.pages[0]?.totalCount ?? 0

  // Infinite scroll — trigger next page when sentinel enters viewport
  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage()
        }
      },
      { rootMargin: '200px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  function scrollToAll() {
    allEventsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function seeAllNearby() {
    if (city) setFilters((f) => ({ ...f, location: city }))
    scrollToAll()
  }

  return (
    <div className="min-h-screen bg-background">
      {/* ── Hero ───────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-slate-950 pb-10 pt-14 sm:pb-16 sm:pt-20">
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
            <h1 className="mb-4 text-3xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
              Find events that{' '}
              <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
                inspire you
              </span>
            </h1>
            <p className="mx-auto mb-6 max-w-xl text-sm text-slate-400 sm:text-base">
              Browse conferences, workshops, concerts, and more. Book your spot in seconds.
            </p>

            {/* Location pill */}
            <div className="flex items-center justify-center gap-2">
              {locationLoading ? (
                <span className="flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-800/60 px-3 py-1.5 text-xs text-slate-400">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-slate-400" />
                  Detecting your location…
                </span>
              ) : source === 'gps' ? (
                <span className="flex items-center gap-1.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1.5 text-xs text-indigo-300">
                  <Navigation className="h-3 w-3" />
                  Near {city}
                </span>
              ) : (
                <span className="flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-800/60 px-3 py-1.5 text-xs text-slate-400">
                  <MapPin className="h-3 w-3" />
                  {city} (enable location for local results)
                </span>
              )}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Nearby Events ──────────────────────────────────────────────── */}
      {!locationLoading && (
        <section className="border-b border-border bg-muted/50 py-6 sm:py-8">
          <div className="container mx-auto max-w-7xl px-4">
            {/* Section header */}
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-indigo-500" />
                <h2 className="text-sm font-semibold text-foreground sm:text-base">
                  Events near {city}
                </h2>
                {source === 'default' && (
                  <span className="hidden text-xs text-slate-400 sm:inline">
                    — enable location for local results
                  </span>
                )}
              </div>
              {nearbyEvents.length > 0 && (
                <button
                  onClick={seeAllNearby}
                  className="flex items-center gap-0.5 text-xs font-medium text-indigo-600 hover:text-indigo-700"
                >
                  See all <ChevronRight className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Cards: horizontal scroll on mobile, grid on desktop */}
            {nearbyPending ? (
              <LoadingSpinner />
            ) : nearbyEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No upcoming events found near {city}.
              </p>
            ) : (
              <div className="flex gap-3 overflow-x-auto pb-2 [-webkit-overflow-scrolling:touch] sm:grid sm:grid-cols-2 sm:gap-4 sm:overflow-visible lg:grid-cols-3 xl:grid-cols-4">
                {nearbyEvents.slice(0, 8).map((event, i) => (
                  <motion.div
                    key={event.id}
                    className="w-64 shrink-0 sm:w-auto"
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04, duration: 0.3 }}
                  >
                    <EventCard event={event} />
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── All Events ─────────────────────────────────────────────────── */}
      <section ref={allEventsRef} className="container mx-auto max-w-7xl px-4 py-6 sm:py-8">
        <h2 className="mb-4 text-sm font-semibold text-foreground sm:text-base">
          All Events
        </h2>

        <div className="mb-4">
          <EventFilters filters={filters} onChange={setFilters} />
        </div>

        {!isPending && (
          <p className="mb-4 text-xs text-muted-foreground sm:text-sm">
            {totalCount === 0
              ? 'No events found.'
              : `${totalCount} event${totalCount !== 1 ? 's' : ''} found`}
          </p>
        )}

        {isPending ? (
          <LoadingSpinner />
        ) : error ? (
          <div className="py-16 text-center text-muted-foreground">
            Failed to load events. Please try again.
          </div>
        ) : events.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 rounded-full bg-muted p-5">
              <svg
                className="h-7 w-7 text-muted-foreground"
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
            <h3 className="mb-1 text-sm font-semibold text-foreground sm:text-base">
              No events found
            </h3>
            <p className="text-xs text-muted-foreground sm:text-sm">
              Try adjusting your filters or search terms.
            </p>
          </div>
        ) : (
          <>
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
                  transition={{ delay: Math.min(i * 0.04, 0.4), duration: 0.3 }}
                >
                  <EventCard event={event} />
                </motion.div>
              ))}
            </motion.div>

            {/* Infinite scroll sentinel */}
            <div ref={sentinelRef} className="mt-6" />

            {isFetchingNextPage && (
              <div className="flex justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
              </div>
            )}
          </>
        )}
      </section>
    </div>
  )
}

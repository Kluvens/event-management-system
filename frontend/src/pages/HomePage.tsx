import { useState, useRef, useEffect } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import {
  MapPin,
  ChevronRight,
  Navigation,
  Loader2,
  Music,
  Trophy,
  Utensils,
  Palette,
  Cpu,
  Users,
  Mic2,
  Dumbbell,
} from 'lucide-react'
import { useInfiniteEvents, eventsApi } from '@/api/events'
import { EventCard } from '@/components/EventCard'
import { EventFilters } from '@/components/EventFilters'
import { useUserLocation } from '@/hooks/useUserLocation'
import type { EventFilters as Filters } from '@/types'

// Category quick-filters for the hero pill row
const CATEGORIES = [
  { label: 'Music',       icon: Music },
  { label: 'Sports',      icon: Trophy },
  { label: 'Food',        icon: Utensils },
  { label: 'Arts',        icon: Palette },
  { label: 'Tech',        icon: Cpu },
  { label: 'Networking',  icon: Users },
  { label: 'Concerts',    icon: Mic2 },
  { label: 'Fitness',     icon: Dumbbell },
]

function EventCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl bg-card shadow-sm ring-1 ring-border">
      <div className="h-48 w-full animate-shimmer bg-gradient-to-r from-muted via-secondary to-muted bg-[length:200%_100%]" />
      <div className="p-4 space-y-3">
        <div className="h-4 w-3/4 rounded-full animate-shimmer bg-gradient-to-r from-muted via-secondary to-muted bg-[length:200%_100%]" />
        <div className="h-3 w-1/2 rounded-full animate-shimmer bg-gradient-to-r from-muted via-secondary to-muted bg-[length:200%_100%]" />
        <div className="h-3 w-2/3 rounded-full animate-shimmer bg-gradient-to-r from-muted via-secondary to-muted bg-[length:200%_100%]" />
        <div className="h-5 w-1/4 rounded-full animate-shimmer bg-gradient-to-r from-muted via-secondary to-muted bg-[length:200%_100%]" />
      </div>
    </div>
  )
}

export function HomePage() {
  const [filters, setFilters] = useState<Filters>({})
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const allEventsRef = useRef<HTMLElement>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const heroRef = useRef<HTMLDivElement>(null)

  const { city, loading: locationLoading, source } = useUserLocation()

  // Parallax for hero text
  const { scrollY } = useScroll()
  const heroY = useTransform(scrollY, [0, 400], [0, 80])
  const heroOpacity = useTransform(scrollY, [0, 300], [1, 0])

  // Nearby events
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

  // Infinite scroll
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

  function handleCategoryClick(label: string) {
    const next = activeCategory === label ? null : label
    setActiveCategory(next)
    setFilters((f) => ({ ...f, search: next ?? undefined }))
    scrollToAll()
  }

  const containerVariants = {
    hidden: {},
    show: { transition: { staggerChildren: 0.06 } },
  }
  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
  }

  return (
    <div className="min-h-screen bg-background">
      {/* ── Hero ───────────────────────────────────────────────────────── */}
      <section
        ref={heroRef}
        className="relative overflow-hidden"
        style={{ minHeight: '520px' }}
      >
        {/* Warm gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-orange-500 via-amber-500 to-yellow-400 dark:from-amber-900 dark:via-orange-900 dark:to-stone-900" />
        {/* Subtle pattern overlay */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />
        {/* Bottom fade */}
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-background to-transparent" />

        <motion.div
          style={{ y: heroY, opacity: heroOpacity }}
          className="relative z-10 container mx-auto max-w-4xl px-4 pt-28 pb-20 text-center"
        >
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          >
            <span className="mb-5 inline-block rounded-full border border-white/30 bg-white/20 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-white backdrop-blur-sm">
              Discover · Book · Connect
            </span>
            <h1 className="mb-4 text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl drop-shadow-sm">
              Find Your Next{' '}
              <span className="relative inline-block">
                Experience
                <span className="absolute bottom-1 left-0 right-0 h-1 rounded-full bg-white/40" />
              </span>
            </h1>
            <p className="mx-auto mb-8 max-w-xl text-sm text-white/80 sm:text-base">
              Browse conferences, workshops, concerts, and more. Book your spot in seconds.
            </p>

            {/* Location pill */}
            <div className="flex items-center justify-center gap-2 mb-8">
              {locationLoading ? (
                <span className="flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs text-white/70 backdrop-blur-sm">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white/70" />
                  Detecting your location…
                </span>
              ) : source === 'gps' ? (
                <span className="flex items-center gap-1.5 rounded-full border border-white/30 bg-white/20 px-4 py-2 text-xs font-medium text-white backdrop-blur-sm">
                  <Navigation className="h-3 w-3" />
                  Near {city}
                </span>
              ) : (
                <span className="flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs text-white/70 backdrop-blur-sm">
                  <MapPin className="h-3 w-3" />
                  {city} — enable location for local results
                </span>
              )}
            </div>

            {/* Category pills */}
            <div className="flex flex-wrap justify-center gap-2">
              {CATEGORIES.map(({ label, icon: Icon }, i) => (
                <motion.button
                  key={label}
                  onClick={() => handleCategoryClick(label)}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 + i * 0.05, duration: 0.25, type: 'spring', stiffness: 200 }}
                  whileHover={{ scale: 1.06 }}
                  whileTap={{ scale: 0.95 }}
                  className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold transition-all ${
                    activeCategory === label
                      ? 'bg-white text-orange-600 shadow-md'
                      : 'border border-white/30 bg-white/15 text-white hover:bg-white/25 backdrop-blur-sm'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </motion.button>
              ))}
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* ── Nearby Events ──────────────────────────────────────────────── */}
      {!locationLoading && (
        <section className="border-b border-border bg-muted/40 py-8 sm:py-10">
          <div className="container mx-auto max-w-7xl px-4">
            {/* Section header */}
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-5 w-1 rounded-full bg-amber-500" />
                <div className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-amber-500" />
                  <h2 className="text-base font-bold text-foreground">
                    Events near {city}
                  </h2>
                  {source === 'default' && (
                    <span className="hidden text-xs text-muted-foreground sm:inline">
                      — enable location for local results
                    </span>
                  )}
                </div>
              </div>
              {nearbyEvents.length > 0 && (
                <button
                  onClick={seeAllNearby}
                  className="flex items-center gap-0.5 text-xs font-semibold text-amber-600 hover:text-amber-700 transition-colors"
                >
                  See all <ChevronRight className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Cards */}
            {nearbyPending ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => <EventCardSkeleton key={i} />)}
              </div>
            ) : nearbyEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No upcoming events found near {city}.
              </p>
            ) : (
              <motion.div
                className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide sm:grid sm:grid-cols-2 sm:gap-4 sm:overflow-visible lg:grid-cols-3 xl:grid-cols-4"
                variants={containerVariants}
                initial="hidden"
                animate="show"
              >
                {nearbyEvents.slice(0, 8).map((event) => (
                  <motion.div
                    key={event.id}
                    className="w-64 shrink-0 sm:w-auto"
                    variants={cardVariants}
                  >
                    <EventCard event={event} />
                  </motion.div>
                ))}
              </motion.div>
            )}
          </div>
        </section>
      )}

      {/* ── All Events ─────────────────────────────────────────────────── */}
      <section ref={allEventsRef} className="container mx-auto max-w-7xl px-4 py-8 sm:py-10">
        <div className="mb-5 flex items-center gap-2">
          <span className="h-5 w-1 rounded-full bg-amber-500" />
          <h2 className="text-base font-bold text-foreground">All Events</h2>
        </div>

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
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => <EventCardSkeleton key={i} />)}
          </div>
        ) : error ? (
          <div className="py-16 text-center text-muted-foreground">
            Failed to load events. Please try again.
          </div>
        ) : events.length === 0 ? (
          <motion.div
            className="flex flex-col items-center justify-center py-20 text-center"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            <div className="mb-4 rounded-full bg-amber-50 p-6 dark:bg-amber-950/30">
              <svg
                className="h-8 w-8 text-amber-400"
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
            <h3 className="mb-1 text-base font-bold text-foreground">
              No events found
            </h3>
            <p className="text-sm text-muted-foreground">
              Try adjusting your filters or search terms.
            </p>
          </motion.div>
        ) : (
          <>
            <motion.div
              className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
              variants={containerVariants}
              initial="hidden"
              animate="show"
            >
              {events.map((event) => (
                <motion.div key={event.id} variants={cardVariants}>
                  <EventCard event={event} />
                </motion.div>
              ))}
            </motion.div>

            {/* Infinite scroll sentinel */}
            <div ref={sentinelRef} className="mt-6" />

            {isFetchingNextPage && (
              <div className="flex justify-center py-6">
                <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
              </div>
            )}
          </>
        )}
      </section>
    </div>
  )
}

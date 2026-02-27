import { useState } from 'react'
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  Calendar,
  MapPin,
  Users,
  DollarSign,
  ArrowLeft,
  Edit,
  Trash2,
  Send,
  Ban,
  Clock,
  Globe,
  Lock,
  CheckCircle,
  Pin,
  Car,
  Bus,
  Bike,
  Footprints,
  Link2,
  Copy,
  RotateCcw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { StatusBadge } from '@/components/StatusBadge'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import {
  useEvent,
  usePublishEvent,
  useCancelEvent,
  usePostponeEvent,
  useDeleteEvent,
  useAnnouncements,
  usePostAnnouncement,
  useGenerateInviteCode,
  useRevokeInviteCode,
} from '@/api/events'
import { useMineBookings, useCreateBooking, useCancelBooking } from '@/api/bookings'
import { useWaitlistPosition, useJoinWaitlist, useLeaveWaitlist } from '@/api/waitlist'
import {
  useReviews,
  useCreateReview,
  useDeleteReview,
  usePinReview,
  useReplyToReview,
  useVoteReview,
} from '@/api/reviews'
import {
  useFollowHost,
  useUnfollowHost,
  useSubscriptions,
} from '@/api/subscriptions'
import { useAuthStore } from '@/stores/authStore'
import {
  formatDateRange,
  formatCurrency,
  formatRelative,
  getInitials,
} from '@/lib/utils'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { StarRating } from '@/components/StarRating'

export function EventDetailPage() {
  const { id } = useParams<{ id: string }>()
  const eventId = parseInt(id ?? '0')
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const inviteCodeParam = searchParams.get('code') ?? undefined
  const { user, isAdmin } = useAuthStore()

  const { data: event, isPending, error } = useEvent(eventId, inviteCodeParam)
  const { data: announcements = [] } = useAnnouncements(eventId)
  const { data: reviews = [] } = useReviews(eventId)
  const { data: myBookings = [] } = useMineBookings()
  const { data: subscriptions = [] } = useSubscriptions()

  const isOwner = user?.userId === event?.createdById
  const canManage = isOwner || isAdmin()

  const myBooking = myBookings.find(
    (b) => b.eventId === eventId && b.status === 'Confirmed'
  )
  const isFollowing = subscriptions.some((s) => s.hostId === event?.createdById)

  const createBooking = useCreateBooking()
  const cancelBooking = useCancelBooking()
  const publishEvent = usePublishEvent()
  const cancelEvent = useCancelEvent()
  const deleteEvent = useDeleteEvent()
  const postponeEvent = usePostponeEvent(eventId)
  const postAnnouncement = usePostAnnouncement(eventId)
  const createReview = useCreateReview(eventId)
  const deleteReview = useDeleteReview(eventId)
  const pinReview = usePinReview(eventId)
  const replyToReview = useReplyToReview(eventId)
  const voteReview = useVoteReview(eventId)
  const follow = useFollowHost()
  const unfollow = useUnfollowHost()
  const { data: waitlistPos } = useWaitlistPosition(eventId)
  const joinWaitlist = useJoinWaitlist(eventId)
  const leaveWaitlist = useLeaveWaitlist(eventId)
  const generateInviteCode = useGenerateInviteCode(eventId)
  const revokeInviteCode = useRevokeInviteCode(eventId)

  const [cancelBookingConfirm, setCancelBookingConfirm] = useState(false)
  const [cancelEventConfirm, setCancelEventConfirm] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [postponeOpen, setPostponeOpen] = useState(false)
  const [replyTarget, setReplyTarget] = useState<number | null>(null)
  const [replyText, setReplyText] = useState('')

  const announcementForm = useForm<{ title: string; message: string }>({
    resolver: zodResolver(
      z.object({ title: z.string().min(1), message: z.string().min(1) })
    ),
  })

  const reviewForm = useForm({
    resolver: zodResolver(
      z.object({
        rating: z.coerce.number().min(1).max(5),
        comment: z.string().min(5, 'Comment must be at least 5 characters'),
      })
    ),
    defaultValues: { rating: 5, comment: '' },
  })

  const postponeForm = useForm({
    resolver: zodResolver(
      z.object({
        newStartDate: z.string().min(1),
        newEndDate: z.string().min(1),
      })
    ),
  })

  if (isPending) return <LoadingSpinner />
  if (error || !event) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-16 text-center">
        <p className="text-muted-foreground">Event not found.</p>
        <Button variant="ghost" onClick={() => navigate(-1)} className="mt-4">
          Go back
        </Button>
      </div>
    )
  }

  const spotsLeft = event.capacity - event.bookingCount
  const isBookable =
    (event.displayStatus === 'Published' || event.displayStatus === 'Live') &&
    !myBooking &&
    !!user
  const canReview =
    !!myBooking &&
    event.displayStatus === 'Completed' &&
    !reviews.find((r) => r.userId === user?.userId)

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8">
      <button
        onClick={() => navigate(-1)}
        className="mb-6 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      {/* Header card */}
      <div className="mb-6 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        {/* Hero image */}
        {event.imageUrl && (
          <div className="h-64 w-full overflow-hidden sm:h-80">
            <img
              src={event.imageUrl}
              alt={event.title}
              className="h-full w-full object-cover"
            />
          </div>
        )}

        <div className="p-6">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{event.categoryName}</Badge>
            <StatusBadge status={event.displayStatus} showDot />
            {!event.isPublic && (
              <span className="flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs text-amber-700">
                <Lock className="h-3 w-3" /> Private
              </span>
            )}
          </div>
          {canManage && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  Manage Event
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {event.displayStatus === 'Draft' && (
                  <DropdownMenuItem
                    onClick={() => publishEvent.mutate(eventId)}
                  >
                    <Globe className="mr-2 h-4 w-4" /> Publish
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  onClick={() => navigate(`/events/${eventId}/edit`)}
                >
                  <Edit className="mr-2 h-4 w-4" /> Edit
                </DropdownMenuItem>
                {event.displayStatus !== 'Cancelled' && (
                  <DropdownMenuItem onClick={() => setPostponeOpen(true)}>
                    <Clock className="mr-2 h-4 w-4" /> Postpone
                  </DropdownMenuItem>
                )}
                {event.displayStatus !== 'Cancelled' && (
                  <DropdownMenuItem
                    className="text-red-600"
                    onClick={() => setCancelEventConfirm(true)}
                  >
                    <Ban className="mr-2 h-4 w-4" /> Cancel Event
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  className="text-red-600"
                  onClick={() => setDeleteConfirm(true)}
                >
                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        <h1 className="mb-4 text-2xl font-bold text-foreground sm:text-3xl">
          {event.title}
        </h1>

        <div className="mb-5 grid gap-2.5 sm:grid-cols-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4 shrink-0 text-indigo-500" />
            <span>{formatDateRange(event.startDate, event.endDate)}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4 shrink-0 text-indigo-500" />
            <span>{event.location}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <DollarSign className="h-4 w-4 shrink-0 text-indigo-500" />
            <span className="font-medium">{formatCurrency(event.price)}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="h-4 w-4 shrink-0 text-indigo-500" />
            <span>
              {event.bookingCount}/{event.capacity} booked
              {spotsLeft <= 10 &&
                spotsLeft > 0 &&
                event.displayStatus !== 'Cancelled' && (
                  <span className="ml-1 font-medium text-orange-600">
                    · {spotsLeft} spots left
                  </span>
                )}
            </span>
          </div>
        </div>

        {/* Organizer */}
        <div className="mb-5 flex items-center justify-between rounded-lg border border-border bg-muted/50 px-4 py-3">
          <Link
            to={`/organizers/${event.createdById}`}
            className="flex items-center gap-2 hover:opacity-80"
          >
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-indigo-100 text-xs text-indigo-700">
                {getInitials(event.createdByName)}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium">{event.createdByName}</p>
              <p className="text-xs text-muted-foreground">Organizer</p>
            </div>
          </Link>
          {user && user?.userId !== event.createdById && (
            <Button
              size="sm"
              variant={isFollowing ? 'outline' : 'default'}
              onClick={() =>
                isFollowing
                  ? unfollow.mutate(event.createdById)
                  : follow.mutate(event.createdById)
              }
              disabled={follow.isPending || unfollow.isPending}
            >
              {isFollowing ? 'Unfollow' : 'Follow'}
            </Button>
          )}
        </div>

        {/* Invite link — private events, owner only */}
        {isOwner && !event.isPublic && (
          <div className="mb-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-800 dark:bg-amber-950/30">
            <div className="mb-2 flex items-center gap-1.5 text-sm font-medium text-amber-800 dark:text-amber-300">
              <Link2 className="h-4 w-4" />
              Private Event — Invite Link
            </div>
            {event.inviteCode ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <code className="flex-1 truncate rounded bg-white px-2 py-1 text-xs text-slate-700 dark:bg-slate-900 dark:text-slate-300">
                    {`${window.location.origin}/events/${event.id}?code=${event.inviteCode}`}
                  </code>
                  <Button
                    size="sm"
                    variant="outline"
                    className="shrink-0"
                    onClick={() => {
                      navigator.clipboard.writeText(
                        `${window.location.origin}/events/${event.id}?code=${event.inviteCode}`
                      )
                      toast.success('Invite link copied!')
                    }}
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="shrink-0"
                    title="Generate a new link (invalidates the current one)"
                    onClick={() => generateInviteCode.mutate()}
                    disabled={generateInviteCode.isPending}
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="shrink-0 text-red-600 hover:text-red-700"
                    onClick={() => revokeInviteCode.mutate()}
                    disabled={revokeInviteCode.isPending}
                  >
                    Revoke
                  </Button>
                </div>
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  Anyone with this link can view and book this event.
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  No invite link yet. Generate one to share this private event.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => generateInviteCode.mutate()}
                  disabled={generateInviteCode.isPending}
                >
                  Generate Invite Link
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Booking action */}
        {!canManage && (
          <div className="flex flex-wrap gap-3">
            {!user ? (
              <Button onClick={() => navigate('/login')}>
                Sign in to Book
              </Button>
            ) : myBooking ? (
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1.5 text-sm font-medium text-emerald-600">
                  <CheckCircle className="h-4 w-4" />
                  You&apos;re booked!
                  {myBooking.isCheckedIn && ' (Checked in)'}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-red-600 hover:text-red-700"
                  onClick={() => setCancelBookingConfirm(true)}
                >
                  Cancel Booking
                </Button>
              </div>
            ) : event.displayStatus === 'SoldOut' ? (
              waitlistPos ? (
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground">
                    You&apos;re #{waitlistPos.position} on the waitlist
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => leaveWaitlist.mutate()}
                    disabled={leaveWaitlist.isPending}
                  >
                    Leave Waitlist
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => joinWaitlist.mutate()}
                  disabled={joinWaitlist.isPending}
                >
                  {joinWaitlist.isPending ? 'Joining…' : 'Join Waitlist'}
                </Button>
              )
            ) : event.displayStatus === 'Cancelled' ? (
              <Button disabled variant="outline">
                Event Cancelled
              </Button>
            ) : isBookable ? (
              <Button
                onClick={() => createBooking.mutate(eventId)}
                disabled={createBooking.isPending}
              >
                {createBooking.isPending
                  ? 'Booking…'
                  : `Book Now${event.price > 0 ? ` · ${formatCurrency(event.price)}` : ' · Free'}`}
              </Button>
            ) : null}
          </div>
        )}
        </div>{/* end p-6 */}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="about">
        <TabsList className="mb-4">
          <TabsTrigger value="about">About</TabsTrigger>
          <TabsTrigger value="announcements">
            Announcements{' '}
            {announcements.length > 0 && `(${announcements.length})`}
          </TabsTrigger>
          <TabsTrigger value="reviews">
            Reviews {reviews.length > 0 && `(${reviews.length})`}
          </TabsTrigger>
        </TabsList>

        {/* About */}
        <TabsContent
          value="about"
          className="rounded-xl border border-border bg-card p-6"
        >
          <div className="mb-6 prose prose-sm dark:prose-invert max-w-none
            prose-headings:text-foreground prose-headings:font-semibold
            prose-p:text-foreground prose-p:leading-relaxed
            prose-strong:text-foreground prose-em:text-foreground
            prose-code:rounded prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:text-foreground prose-code:before:content-none prose-code:after:content-none
            prose-pre:bg-muted prose-pre:text-foreground
            prose-ul:text-foreground prose-ol:text-foreground prose-li:text-foreground
            prose-a:text-indigo-600 prose-a:no-underline hover:prose-a:underline
            prose-blockquote:border-border prose-blockquote:text-muted-foreground
            prose-hr:border-border
          ">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{event.description}</ReactMarkdown>
          </div>
          {event.tags.length > 0 && (
            <div className="mb-6 flex flex-wrap gap-2">
              {event.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-600"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Location & Map */}
          <div className="border-t border-border pt-6">
            <h2 className="mb-4 text-xl font-bold text-foreground">Location</h2>

            {/* Venue name + address */}
            {(() => {
              const commaIdx = event.location.indexOf(',')
              const venueName =
                commaIdx !== -1
                  ? event.location.slice(0, commaIdx).trim()
                  : event.location
              const address =
                commaIdx !== -1
                  ? event.location.slice(commaIdx + 1).trim()
                  : null
              return (
                <div className="mb-4">
                  <p className="font-semibold text-foreground">{venueName}</p>
                  {address && (
                    <p className="text-sm text-muted-foreground whitespace-pre-line">
                      {address.replace(/,\s*/g, '\n')}
                    </p>
                  )}
                </div>
              )
            })()}

            {/* Embedded map */}
            <div className="mb-6 overflow-hidden rounded-xl border border-border">
              <iframe
                title="Event location on Google Maps"
                src={`https://maps.google.com/maps?q=${encodeURIComponent(event.location)}&output=embed`}
                className="h-72 w-full"
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>

            {/* Transport options */}
            <div className="border-t border-border pt-5">
              <h3 className="mb-4 text-base font-bold text-foreground">
                How would you like to get there?
              </h3>
              <ul className="space-y-3">
                {(
                  [
                    { label: 'Driving',          mode: 'driving',   Icon: Car        },
                    { label: 'Public transport', mode: 'transit',   Icon: Bus        },
                    { label: 'Cycling',          mode: 'bicycling', Icon: Bike       },
                    { label: 'Walking',          mode: 'walking',   Icon: Footprints },
                  ] as const
                ).map(({ label, mode, Icon }) => (
                  <li key={mode}>
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(event.location)}&travelmode=${mode}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 text-sm text-indigo-600 hover:text-indigo-800 hover:underline"
                    >
                      <Icon className="h-5 w-5 shrink-0" />
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </TabsContent>

        {/* Announcements */}
        <TabsContent value="announcements" className="space-y-4">
          {canManage && (
            <div className="rounded-xl border border-border bg-card p-5">
              <h3 className="mb-3 text-sm font-semibold">Post Announcement</h3>
              <form
                onSubmit={announcementForm.handleSubmit((d) =>
                  postAnnouncement.mutate(d, {
                    onSuccess: () => announcementForm.reset(),
                  })
                )}
                className="space-y-3"
              >
                <Input
                  placeholder="Title"
                  {...announcementForm.register('title')}
                />
                <Textarea
                  placeholder="Message…"
                  rows={3}
                  {...announcementForm.register('message')}
                />
                <Button
                  type="submit"
                  size="sm"
                  disabled={postAnnouncement.isPending}
                >
                  <Send className="mr-1.5 h-3.5 w-3.5" />
                  Post
                </Button>
              </form>
            </div>
          )}
          {announcements.length === 0 ? (
            <div className="rounded-xl border border-border bg-card px-6 py-10 text-center text-sm text-muted-foreground">
              No announcements yet.
            </div>
          ) : (
            announcements.map((a) => (
              <div
                key={a.id}
                className="rounded-xl border border-slate-200 bg-white p-5"
              >
                <div className="mb-1 flex items-start justify-between">
                  <h4 className="font-semibold text-foreground">{a.title}</h4>
                  <span className="text-xs text-muted-foreground">
                    {formatRelative(a.createdAt)}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{a.message}</p>
              </div>
            ))
          )}
        </TabsContent>

        {/* Reviews */}
        <TabsContent value="reviews" className="space-y-4">
          {canReview && (
            <div className="rounded-xl border border-border bg-card p-5">
              <h3 className="mb-3 text-sm font-semibold">Write a Review</h3>
              <form
                onSubmit={reviewForm.handleSubmit((d) =>
                  createReview.mutate(d, {
                    onSuccess: () => reviewForm.reset({ rating: 5, comment: '' }),
                  })
                )}
                className="space-y-3"
              >
                <div className="flex items-center gap-3">
                  <Label className="text-sm">Rating</Label>
                  <StarRating
                    value={reviewForm.watch('rating')}
                    onChange={(v) => reviewForm.setValue('rating', v)}
                  />
                </div>
                <Textarea
                  placeholder="Share your experience…"
                  rows={3}
                  {...reviewForm.register('comment')}
                />
                {reviewForm.formState.errors.comment && (
                  <p className="text-xs text-red-500">
                    {reviewForm.formState.errors.comment.message}
                  </p>
                )}
                <Button
                  type="submit"
                  size="sm"
                  disabled={createReview.isPending}
                >
                  Submit Review
                </Button>
              </form>
            </div>
          )}
          {reviews.length === 0 ? (
            <div className="rounded-xl border border-border bg-card px-6 py-10 text-center text-sm text-muted-foreground">
              No reviews yet. Be the first!
            </div>
          ) : (
            reviews.map((review) => (
              <div
                key={review.id}
                className={`rounded-xl border p-5 ${
                  review.isPinned
                    ? 'border-indigo-200 bg-indigo-50/30 dark:border-indigo-800 dark:bg-indigo-950/20'
                    : 'border-border bg-card'
                }`}
              >
                <div className="mb-2 flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-muted text-xs">
                        {getInitials(review.userName)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">{review.userName}</p>
                      <div className="flex items-center gap-0.5">
                        {[...Array(5)].map((_, i) => (
                          <span
                            key={i}
                            className={
                              i < review.rating
                                ? 'text-amber-400'
                                : 'text-slate-200 dark:text-zinc-700'
                            }
                          >
                            ★
                          </span>
                        ))}
                      </div>
                    </div>
                    {review.isPinned && (
                      <span className="ml-2 flex items-center gap-1 rounded-full bg-indigo-100 px-2 py-0.5 text-xs text-indigo-600">
                        <Pin className="h-3 w-3" /> Pinned
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-muted-foreground">
                      {formatRelative(review.createdAt)}
                    </span>
                    {canManage && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 px-2 text-xs"
                        onClick={() => pinReview.mutate(review.id)}
                      >
                        {review.isPinned ? 'Unpin' : 'Pin'}
                      </Button>
                    )}
                    {(user?.userId === review.userId || canManage) && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 px-2 text-xs text-red-500"
                        onClick={() => deleteReview.mutate(review.id)}
                      >
                        Delete
                      </Button>
                    )}
                  </div>
                </div>

                <p className="mb-3 text-sm text-foreground">{review.comment}</p>

                <div className="mb-3 flex items-center gap-3 text-xs text-muted-foreground">
                  <button
                    onClick={() =>
                      user &&
                      voteReview.mutate({ reviewId: review.id, isLike: true })
                    }
                    className="flex items-center gap-1 hover:text-emerald-600"
                  >
                    👍 {review.likes}
                  </button>
                  <button
                    onClick={() =>
                      user &&
                      voteReview.mutate({ reviewId: review.id, isLike: false })
                    }
                    className="flex items-center gap-1 hover:text-red-500"
                  >
                    👎 {review.dislikes}
                  </button>
                  {isOwner && (
                    <button
                      onClick={() =>
                        setReplyTarget(
                          replyTarget === review.id ? null : review.id
                        )
                      }
                      className="hover:text-indigo-600"
                    >
                      Reply
                    </button>
                  )}
                </div>

                {review.replies.length > 0 && (
                  <div className="ml-4 space-y-2 border-l-2 border-border pl-4">
                    {review.replies.map((reply) => (
                      <div key={reply.id}>
                        <span className="text-xs font-medium text-foreground">
                          {reply.userName}
                        </span>
                        <span className="ml-2 text-xs text-muted-foreground">
                          {formatRelative(reply.createdAt)}
                        </span>
                        <p className="text-xs text-muted-foreground">{reply.comment}</p>
                      </div>
                    ))}
                  </div>
                )}

                {replyTarget === review.id && (
                  <div className="mt-2 flex gap-2">
                    <Input
                      placeholder="Write a reply…"
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      className="text-sm"
                    />
                    <Button
                      size="sm"
                      disabled={!replyText.trim()}
                      onClick={() => {
                        replyToReview.mutate(
                          { reviewId: review.id, comment: replyText },
                          {
                            onSuccess: () => {
                              setReplyTarget(null)
                              setReplyText('')
                            },
                          }
                        )
                      }}
                    >
                      Send
                    </Button>
                  </div>
                )}
              </div>
            ))
          )}
        </TabsContent>
      </Tabs>

      <Separator className="my-6" />

      {/* Dialogs */}
      <ConfirmDialog
        open={cancelBookingConfirm}
        onOpenChange={setCancelBookingConfirm}
        title="Cancel Booking"
        description="Are you sure you want to cancel your booking? This may not be possible within 7 days of the event."
        confirmLabel="Cancel Booking"
        onConfirm={() =>
          myBooking &&
          cancelBooking.mutate(myBooking.id, {
            onSettled: () => setCancelBookingConfirm(false),
          })
        }
        loading={cancelBooking.isPending}
      />

      <ConfirmDialog
        open={cancelEventConfirm}
        onOpenChange={setCancelEventConfirm}
        title="Cancel Event"
        description="This will cancel the event and notify all attendees. This cannot be undone."
        confirmLabel="Cancel Event"
        onConfirm={() =>
          cancelEvent.mutate(eventId, {
            onSettled: () => setCancelEventConfirm(false),
          })
        }
        loading={cancelEvent.isPending}
      />

      <ConfirmDialog
        open={deleteConfirm}
        onOpenChange={setDeleteConfirm}
        title="Delete Event"
        description="This will permanently delete the event and all associated data."
        confirmLabel="Delete"
        onConfirm={() =>
          deleteEvent.mutate(eventId, {
            onSuccess: () => navigate('/'),
            onSettled: () => setDeleteConfirm(false),
          })
        }
        loading={deleteEvent.isPending}
      />

      <Dialog open={postponeOpen} onOpenChange={setPostponeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Postpone Event</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={postponeForm.handleSubmit((d) =>
              postponeEvent.mutate(
                {
                  newStartDate: new Date(d.newStartDate).toISOString(),
                  newEndDate: new Date(d.newEndDate).toISOString(),
                },
                { onSuccess: () => setPostponeOpen(false) }
              )
            )}
            className="space-y-4 py-2"
          >
            <div className="space-y-1.5">
              <Label>New Start Date</Label>
              <Input
                type="datetime-local"
                {...postponeForm.register('newStartDate')}
              />
            </div>
            <div className="space-y-1.5">
              <Label>New End Date</Label>
              <Input
                type="datetime-local"
                {...postponeForm.register('newEndDate')}
              />
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                type="button"
                onClick={() => setPostponeOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={postponeEvent.isPending}>
                {postponeEvent.isPending ? 'Postponing…' : 'Confirm'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

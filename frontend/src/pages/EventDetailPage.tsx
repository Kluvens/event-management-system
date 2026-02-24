import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
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
} from '@/api/events'
import { useMineBookings, useCreateBooking, useCancelBooking } from '@/api/bookings'
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

export function EventDetailPage() {
  const { id } = useParams<{ id: string }>()
  const eventId = parseInt(id ?? '0')
  const navigate = useNavigate()
  const { user, token, isAdmin } = useAuthStore()

  const { data: event, isPending, error } = useEvent(eventId)
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
        <p className="text-slate-500">Event not found.</p>
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
    !!token
  const hasEnded = new Date(event.endDate) < new Date()
  const canReview =
    !!myBooking && hasEnded && !reviews.find((r) => r.userId === user?.userId)

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8">
      <button
        onClick={() => navigate(-1)}
        className="mb-6 flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      {/* Header card */}
      <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
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

        <h1 className="mb-4 text-2xl font-bold text-slate-900 sm:text-3xl">
          {event.title}
        </h1>

        <div className="mb-5 grid gap-2.5 sm:grid-cols-2">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Calendar className="h-4 w-4 shrink-0 text-indigo-500" />
            <span>{formatDateRange(event.startDate, event.endDate)}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <MapPin className="h-4 w-4 shrink-0 text-indigo-500" />
            <span>{event.location}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <DollarSign className="h-4 w-4 shrink-0 text-indigo-500" />
            <span className="font-medium">{formatCurrency(event.price)}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-600">
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
        <div className="mb-5 flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-4 py-3">
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
              <p className="text-xs text-slate-500">Organizer</p>
            </div>
          </Link>
          {token && user?.userId !== event.createdById && (
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

        {/* Booking action */}
        {!canManage && (
          <div className="flex flex-wrap gap-3">
            {!token ? (
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
              <Button disabled>Sold Out</Button>
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
          className="rounded-xl border border-slate-200 bg-white p-6"
        >
          <p className="mb-6 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
            {event.description}
          </p>
          {event.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
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
        </TabsContent>

        {/* Announcements */}
        <TabsContent value="announcements" className="space-y-4">
          {canManage && (
            <div className="rounded-xl border border-slate-200 bg-white p-5">
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
            <div className="rounded-xl border border-slate-200 bg-white px-6 py-10 text-center text-sm text-slate-500">
              No announcements yet.
            </div>
          ) : (
            announcements.map((a) => (
              <div
                key={a.id}
                className="rounded-xl border border-slate-200 bg-white p-5"
              >
                <div className="mb-1 flex items-start justify-between">
                  <h4 className="font-semibold text-slate-900">{a.title}</h4>
                  <span className="text-xs text-slate-400">
                    {formatRelative(a.createdAt)}
                  </span>
                </div>
                <p className="text-sm text-slate-600">{a.message}</p>
              </div>
            ))
          )}
        </TabsContent>

        {/* Reviews */}
        <TabsContent value="reviews" className="space-y-4">
          {canReview && (
            <div className="rounded-xl border border-slate-200 bg-white p-5">
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
                  <Input
                    type="number"
                    min={1}
                    max={5}
                    className="w-20"
                    {...reviewForm.register('rating')}
                  />
                  <span className="text-sm text-slate-500">/ 5</span>
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
            <div className="rounded-xl border border-slate-200 bg-white px-6 py-10 text-center text-sm text-slate-500">
              No reviews yet. Be the first!
            </div>
          ) : (
            reviews.map((review) => (
              <div
                key={review.id}
                className={`rounded-xl border bg-white p-5 ${
                  review.isPinned
                    ? 'border-indigo-200 bg-indigo-50/30'
                    : 'border-slate-200'
                }`}
              >
                <div className="mb-2 flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-slate-100 text-xs">
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
                                : 'text-slate-200'
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
                    <span className="text-xs text-slate-400">
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

                <p className="mb-3 text-sm text-slate-700">{review.comment}</p>

                <div className="mb-3 flex items-center gap-3 text-xs text-slate-500">
                  <button
                    onClick={() =>
                      token &&
                      voteReview.mutate({ reviewId: review.id, isLike: true })
                    }
                    className="flex items-center gap-1 hover:text-emerald-600"
                  >
                    👍 {review.likes}
                  </button>
                  <button
                    onClick={() =>
                      token &&
                      voteReview.mutate({ reviewId: review.id, isLike: false })
                    }
                    className="flex items-center gap-1 hover:text-red-500"
                  >
                    👎 {review.dislikes}
                  </button>
                  {token && (
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
                  <div className="ml-4 space-y-2 border-l-2 border-slate-100 pl-4">
                    {review.replies.map((reply) => (
                      <div key={reply.id}>
                        <span className="text-xs font-medium text-slate-700">
                          {reply.userName}
                        </span>
                        <span className="ml-2 text-xs text-slate-400">
                          {formatRelative(reply.createdAt)}
                        </span>
                        <p className="text-xs text-slate-600">{reply.comment}</p>
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

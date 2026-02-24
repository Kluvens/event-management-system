import { useParams, useNavigate, Link } from 'react-router-dom'
import { Globe, Twitter, Instagram, Users, Calendar, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { StatusBadge } from '@/components/StatusBadge'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { useOrganizerProfile } from '@/api/organizers'
import { useFollowHost, useUnfollowHost, useSubscriptions } from '@/api/subscriptions'
import { useAuthStore } from '@/stores/authStore'
import { formatDate, getInitials } from '@/lib/utils'

export function OrganizerProfilePage() {
  const { id } = useParams<{ id: string }>()
  const organizerId = parseInt(id ?? '0')
  const navigate = useNavigate()
  const { user, token } = useAuthStore()

  const { data: profile, isPending, error } = useOrganizerProfile(organizerId)
  const { data: subscriptions = [] } = useSubscriptions()
  const follow = useFollowHost()
  const unfollow = useUnfollowHost()

  const isFollowing = subscriptions.some((s) => s.hostId === organizerId)
  const isSelf = user?.userId === organizerId

  if (isPending) return <LoadingSpinner />
  if (error || !profile) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-16 text-center text-slate-500">
        Organizer not found.
      </div>
    )
  }

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <button
        onClick={() => navigate(-1)}
        className="mb-6 flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="bg-indigo-100 text-xl font-bold text-indigo-700">
                {getInitials(profile.name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-xl font-bold text-slate-900">{profile.name}</h1>
              <p className="text-sm text-slate-500">
                Member since {formatDate(profile.memberSince, 'MMMM yyyy')}
              </p>
              <div className="mt-1 flex items-center gap-1 text-sm text-slate-600">
                <Users className="h-4 w-4" />
                <span>{profile.followerCount.toLocaleString()} followers</span>
              </div>
            </div>
          </div>

          {token && !isSelf && (
            <Button
              variant={isFollowing ? 'outline' : 'default'}
              onClick={() =>
                isFollowing
                  ? unfollow.mutate(organizerId)
                  : follow.mutate(organizerId)
              }
              disabled={follow.isPending || unfollow.isPending}
            >
              {isFollowing ? 'Unfollow' : 'Follow'}
            </Button>
          )}
        </div>

        {profile.bio && (
          <>
            <Separator className="my-4" />
            <p className="text-sm leading-relaxed text-slate-700">{profile.bio}</p>
          </>
        )}

        {(profile.website || profile.twitterHandle || profile.instagramHandle) && (
          <div className="mt-4 flex flex-wrap gap-3">
            {profile.website && (
              <a
                href={profile.website}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-indigo-600"
              >
                <Globe className="h-3.5 w-3.5" />
                Website
              </a>
            )}
            {profile.twitterHandle && (
              <span className="flex items-center gap-1.5 text-xs text-slate-500">
                <Twitter className="h-3.5 w-3.5" />
                {profile.twitterHandle}
              </span>
            )}
            {profile.instagramHandle && (
              <span className="flex items-center gap-1.5 text-xs text-slate-500">
                <Instagram className="h-3.5 w-3.5" />
                {profile.instagramHandle}
              </span>
            )}
          </div>
        )}
      </div>

      <h2 className="mb-4 text-lg font-semibold text-slate-900">
        Events ({profile.events.length})
      </h2>

      {profile.events.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white py-12 text-center text-slate-500">
          No events yet.
        </div>
      ) : (
        <div className="space-y-3">
          {profile.events.map((ev) => (
            <Link
              key={ev.id}
              to={`/events/${ev.id}`}
              className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:border-indigo-200 hover:shadow-md"
            >
              <div>
                <p className="font-medium text-slate-900">{ev.title}</p>
                <div className="mt-1 flex items-center gap-3 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {formatDate(ev.startDate)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {ev.confirmedBookings}/{ev.capacity}
                  </span>
                </div>
              </div>
              <StatusBadge status={ev.displayStatus} />
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

import {
  Bell,
  CalendarCheck,
  Star,
  Megaphone,
  RefreshCw,
  XCircle,
  Clock,
  CheckCircle2,
  Ticket,
  Radio,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useNotifications, useUnreadCount, useMarkRead, useMarkAllRead } from '@/api/notifications'
import { useNavigate } from 'react-router-dom'
import type { NotificationType } from '@/types'

interface TypeMeta {
  icon: React.ElementType
  iconClass: string
  bgClass: string
}

const TYPE_META: Record<NotificationType, TypeMeta> = {
  BookingConfirmation: { icon: CheckCircle2,  iconClass: 'text-emerald-500', bgClass: 'bg-emerald-50 dark:bg-emerald-950/40' },
  EventReminder:       { icon: CalendarCheck, iconClass: 'text-amber-500',   bgClass: 'bg-amber-50 dark:bg-amber-950/40'     },
  ReviewReminder:      { icon: Star,          iconClass: 'text-yellow-500',  bgClass: 'bg-yellow-50 dark:bg-yellow-950/40'   },
  EventUpdate:         { icon: RefreshCw,     iconClass: 'text-blue-500',    bgClass: 'bg-blue-50 dark:bg-blue-950/40'       },
  Announcement:        { icon: Megaphone,     iconClass: 'text-orange-500',  bgClass: 'bg-orange-50 dark:bg-orange-950/40'   },
  EventCancelled:      { icon: XCircle,       iconClass: 'text-red-500',     bgClass: 'bg-red-50 dark:bg-red-950/40'         },
  EventPostponed:      { icon: Clock,         iconClass: 'text-purple-500',  bgClass: 'bg-purple-50 dark:bg-purple-950/40'   },
  WaitlistPromotion:   { icon: Ticket,        iconClass: 'text-teal-500',    bgClass: 'bg-teal-50 dark:bg-teal-950/40'       },
  SystemAnnouncement:  { icon: Radio,         iconClass: 'text-rose-500',    bgClass: 'bg-rose-50 dark:bg-rose-950/40'       },
  General:             { icon: Bell,          iconClass: 'text-slate-500',   bgClass: 'bg-slate-50 dark:bg-slate-800/40'     },
}

export function NotificationBell({ transparent = false }: { transparent?: boolean }) {
  const navigate = useNavigate()
  const { data: notifications = [] } = useNotifications()
  const { data: unreadData } = useUnreadCount()
  const markRead = useMarkRead()
  const markAllRead = useMarkAllRead()

  const unread = unreadData?.count ?? 0

  function handleClick(id: number, eventId: number | null) {
    markRead.mutate(id)
    if (eventId) navigate(`/events/${eventId}`)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={`relative ${transparent ? 'text-white/80 hover:text-white hover:bg-white/10' : ''}`}
        >
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-96 p-0">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-amber-500" />
            <p className="text-sm font-bold">Notifications</p>
            {unread > 0 && (
              <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-950/50 dark:text-amber-400">
                {unread} new
              </span>
            )}
          </div>
          {unread > 0 && (
            <button
              onClick={() => markAllRead.mutate()}
              className="text-xs font-medium text-amber-600 hover:text-amber-700 hover:underline"
            >
              Mark all read
            </button>
          )}
        </div>

        {/* List */}
        <div className="max-h-[420px] overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
              <Bell className="h-8 w-8 text-muted-foreground/30" />
              <p className="text-sm font-medium text-muted-foreground">No notifications yet</p>
              <p className="text-xs text-muted-foreground/60">
                We'll let you know when something happens.
              </p>
            </div>
          ) : (
            notifications.slice(0, 10).map((n, i) => {
              const meta = TYPE_META[n.type] ?? TYPE_META.General
              const Icon = meta.icon
              return (
                <div key={n.id}>
                  {i > 0 && <DropdownMenuSeparator className="my-0" />}
                  <button
                    onClick={() => handleClick(n.id, n.eventId)}
                    className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50 ${
                      !n.isRead ? 'bg-amber-50/60 dark:bg-amber-950/10' : ''
                    }`}
                  >
                    {/* Type icon */}
                    <div
                      className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${meta.bgClass}`}
                    >
                      <Icon className={`h-4 w-4 ${meta.iconClass}`} />
                    </div>

                    {/* Content */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p
                          className={`text-sm leading-snug ${
                            !n.isRead
                              ? 'font-semibold text-foreground'
                              : 'font-medium text-foreground/80'
                          }`}
                        >
                          {n.title}
                        </p>
                        {!n.isRead && (
                          <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-amber-500" />
                        )}
                      </div>
                      <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                        {n.message}
                      </p>
                      <p className="mt-1 text-[11px] text-muted-foreground/60">
                        {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                  </button>
                </div>
              )
            })
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

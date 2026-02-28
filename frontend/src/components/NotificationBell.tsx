import { Bell } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useNotifications, useUnreadCount, useMarkRead, useMarkAllRead } from '@/api/notifications'
import { useNavigate } from 'react-router-dom'

export function NotificationBell() {
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
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between px-3 py-2">
          <p className="text-sm font-semibold">Notifications</p>
          {unread > 0 && (
            <button
              onClick={() => markAllRead.mutate()}
              className="text-xs text-amber-600 hover:underline"
            >
              Mark all read
            </button>
          )}
        </div>
        <DropdownMenuSeparator />
        {notifications.length === 0 ? (
          <div className="px-3 py-4 text-center text-sm text-slate-500">No notifications</div>
        ) : (
          notifications.slice(0, 8).map((n) => (
            <DropdownMenuItem
              key={n.id}
              className={`flex flex-col items-start gap-0.5 px-3 py-2 ${!n.isRead ? 'bg-amber-50' : ''}`}
              onClick={() => handleClick(n.id, n.eventId)}
            >
              <span className="text-sm font-medium leading-tight">{n.title}</span>
              <span className="line-clamp-2 text-xs text-slate-500">{n.message}</span>
              <span className="text-xs text-slate-400">
                {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
              </span>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

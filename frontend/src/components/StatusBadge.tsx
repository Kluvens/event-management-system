import { cn, STATUS_CONFIG } from '@/lib/utils'
import type { EventStatus } from '@/types'

interface Props {
  status: EventStatus
  className?: string
  showDot?: boolean
}

export function StatusBadge({ status, className, showDot }: Props) {
  const config = STATUS_CONFIG[status]
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium',
        config.className,
        className
      )}
    >
      {showDot && status === 'Live' && (
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
        </span>
      )}
      {config.label}
    </span>
  )
}

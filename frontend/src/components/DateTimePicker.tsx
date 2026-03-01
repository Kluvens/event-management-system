import { useState } from 'react'
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  isToday,
} from 'date-fns'
import { ChevronLeft, ChevronRight, CalendarDays, Clock } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface Props {
  value: string // "YYYY-MM-DDTHH:mm" or empty string
  onChange: (value: string) => void
  id?: string
  placeholder?: string
}

const DAY_NAMES = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']

function toLocalDateStr(date: Date, h: number, m: number) {
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  const hh = String(h).padStart(2, '0')
  const min = String(m).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`
}

export function DateTimePicker({ value, onChange, id, placeholder = 'Pick a date & time' }: Props) {
  const parsed = value ? new Date(value) : null
  const [viewDate, setViewDate] = useState<Date>(parsed ?? new Date())
  const [open, setOpen] = useState(false)

  const hourNum = parsed ? parsed.getHours() : 0
  const minNum = parsed ? parsed.getMinutes() : 0

  function handleDayClick(day: Date) {
    onChange(toLocalDateStr(day, hourNum, minNum))
  }

  function handleHourChange(raw: string) {
    const h = Math.max(0, Math.min(23, parseInt(raw) || 0))
    const base = parsed ?? new Date()
    onChange(toLocalDateStr(base, h, minNum))
  }

  function handleMinuteChange(raw: string) {
    const m = Math.max(0, Math.min(59, parseInt(raw) || 0))
    const base = parsed ?? new Date()
    onChange(toLocalDateStr(base, hourNum, m))
  }

  const monthStart = startOfMonth(viewDate)
  const monthEnd = endOfMonth(viewDate)
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })

  const days: Date[] = []
  let cur = calStart
  while (cur <= calEnd) {
    days.push(cur)
    cur = addDays(cur, 1)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          id={id}
          type="button"
          className={cn(
            'flex h-9 w-full items-center gap-2 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors',
            'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
            'hover:border-amber-400',
            !parsed && 'text-muted-foreground',
          )}
        >
          <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="flex-1 text-left">
            {parsed ? format(parsed, "d MMM yyyy, h:mm a") : placeholder}
          </span>
        </button>
      </PopoverTrigger>

      <PopoverContent className="w-auto p-0" align="start">
        {/* Month navigation */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <button
            type="button"
            onClick={() => setViewDate(subMonths(viewDate, 1))}
            className="rounded p-1 transition-colors hover:bg-muted"
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm font-semibold">{format(viewDate, 'MMMM yyyy')}</span>
          <button
            type="button"
            onClick={() => setViewDate(addMonths(viewDate, 1))}
            className="rounded p-1 transition-colors hover:bg-muted"
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Calendar grid */}
        <div className="p-3">
          <div className="mb-1 grid grid-cols-7">
            {DAY_NAMES.map((d) => (
              <div
                key={d}
                className="flex h-8 w-9 items-center justify-center text-xs font-medium text-muted-foreground"
              >
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {days.map((day, i) => {
              const inMonth = isSameMonth(day, viewDate)
              const isSelected = parsed ? isSameDay(day, parsed) : false
              const todayDay = isToday(day)
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleDayClick(day)}
                  className={cn(
                    'flex h-9 w-9 items-center justify-center rounded-md text-sm transition-colors',
                    !inMonth && 'text-muted-foreground opacity-40',
                    inMonth && !isSelected && 'hover:bg-amber-100 hover:text-amber-700 dark:hover:bg-amber-950/40 dark:hover:text-amber-400',
                    todayDay && !isSelected && 'border border-amber-400 font-semibold',
                    isSelected && 'bg-amber-500 text-white hover:bg-amber-600',
                  )}
                >
                  {format(day, 'd')}
                </button>
              )
            })}
          </div>
        </div>

        {/* Time picker */}
        <div className="flex items-center gap-3 border-t border-border px-4 py-3">
          <Clock className="h-4 w-4 shrink-0 text-muted-foreground" />
          <div className="flex items-center gap-1">
            <input
              type="number"
              min={0}
              max={23}
              value={String(hourNum).padStart(2, '0')}
              onChange={(e) => handleHourChange(e.target.value)}
              className="w-12 rounded border border-input bg-transparent px-2 py-1 text-center text-sm focus:outline-none focus:ring-1 focus:ring-ring [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
            <span className="font-semibold text-muted-foreground">:</span>
            <input
              type="number"
              min={0}
              max={59}
              value={String(minNum).padStart(2, '0')}
              onChange={(e) => handleMinuteChange(e.target.value)}
              className="w-12 rounded border border-input bg-transparent px-2 py-1 text-center text-sm focus:outline-none focus:ring-1 focus:ring-ring [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
          </div>
          <span className="text-xs text-muted-foreground">HH : MM (24h)</span>
          <Button size="sm" className="ml-auto" onClick={() => setOpen(false)}>
            Done
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}

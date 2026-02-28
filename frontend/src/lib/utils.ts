import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { format, formatRelative as dfRelative, parseISO } from 'date-fns'
import type { EventStatus } from '@/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(dateStr: string, fmt = 'MMM d, yyyy'): string {
  try {
    return format(parseISO(dateStr), fmt)
  } catch {
    return dateStr
  }
}

export function formatDateTime(dateStr: string): string {
  try {
    return format(parseISO(dateStr), 'MMM d, yyyy h:mm a')
  } catch {
    return dateStr
  }
}

export function formatRelative(dateStr: string): string {
  try {
    return dfRelative(parseISO(dateStr), new Date())
  } catch {
    return dateStr
  }
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(amount)
}

export function formatDateRange(start: string, end: string): string {
  try {
    const s = parseISO(start)
    const e = parseISO(end)
    const sameDay = format(s, 'yyyy-MM-dd') === format(e, 'yyyy-MM-dd')
    if (sameDay) {
      return `${format(s, 'MMM d, yyyy')} · ${format(s, 'h:mm a')} – ${format(e, 'h:mm a')}`
    }
    return `${format(s, 'MMM d')} – ${format(e, 'MMM d, yyyy')}`
  } catch {
    return start
  }
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export const STATUS_CONFIG: Record<EventStatus, { label: string; className: string }> = {
  Draft:     { label: 'Draft',     className: 'border-slate-200 bg-slate-50 text-slate-600' },
  Published: { label: 'Published', className: 'border-amber-200 bg-amber-50 text-amber-700' },
  Live:      { label: 'Live',      className: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
  SoldOut:   { label: 'Sold Out',  className: 'border-amber-200 bg-amber-50 text-amber-700' },
  Completed: { label: 'Completed', className: 'border-slate-200 bg-slate-100 text-slate-600' },
  Cancelled: { label: 'Cancelled', className: 'border-red-200 bg-red-50 text-red-600' },
  Postponed: { label: 'Postponed', className: 'border-orange-200 bg-orange-50 text-orange-700' },
}

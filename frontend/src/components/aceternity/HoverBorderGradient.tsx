import { useState } from 'react'
import { cn } from '@/lib/utils'

interface HoverBorderGradientProps {
  children: React.ReactNode
  className?: string
  containerClassName?: string
}

export function HoverBorderGradient({
  children,
  className,
  containerClassName,
}: HoverBorderGradientProps) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={cn('relative rounded-xl p-[1px] transition-all duration-200', containerClassName)}
      style={{
        background: hovered
          ? 'linear-gradient(135deg, hsl(238,82%,58%), hsl(280,82%,60%), hsl(238,82%,58%))'
          : 'hsl(214,32%,91%)',
        boxShadow: hovered
          ? '0 4px 24px 0 rgba(99,102,241,0.12)'
          : '0 1px 3px 0 rgba(0,0,0,0.06)',
      }}
    >
      <div className={cn('relative h-full rounded-xl bg-white', className)}>
        {children}
      </div>
    </div>
  )
}

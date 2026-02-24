import { cn } from '@/lib/utils'

export function BackgroundBeams({ className }: { className?: string }) {
  return (
    <div className={cn('absolute inset-0 overflow-hidden', className)}>
      <svg
        className="absolute inset-0 h-full w-full"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <radialGradient id="beam-rg" cx="50%" cy="0%" r="70%">
            <stop
              offset="0%"
              stopColor="hsl(238,82%,58%)"
              stopOpacity="0.15"
            />
            <stop offset="100%" stopColor="transparent" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#beam-rg)" />
        {[...Array(6)].map((_, i) => (
          <line
            key={i}
            x1={`${10 + i * 16}%`}
            y1="0%"
            x2={`${5 + i * 18}%`}
            y2="100%"
            stroke="hsl(238,82%,58%)"
            strokeOpacity={0.04 + i * 0.01}
            strokeWidth="1"
          />
        ))}
        {[...Array(4)].map((_, i) => (
          <line
            key={`r${i}`}
            x1={`${60 + i * 10}%`}
            y1="0%"
            x2={`${65 + i * 8}%`}
            y2="100%"
            stroke="hsl(238,82%,58%)"
            strokeOpacity={0.03 + i * 0.01}
            strokeWidth="1"
          />
        ))}
      </svg>
    </div>
  )
}

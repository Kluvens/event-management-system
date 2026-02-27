import { useState } from 'react'

interface StarRatingProps {
  value: number
  onChange: (rating: number) => void
  max?: number
}

export function StarRating({ value, onChange, max = 5 }: StarRatingProps) {
  const [hovered, setHovered] = useState(0)
  const active = hovered || value

  return (
    <div className="flex gap-0.5">
      {Array.from({ length: max }, (_, i) => i + 1).map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          className="text-2xl leading-none transition-colors focus:outline-none"
          aria-label={`${star} star${star !== 1 ? 's' : ''}`}
        >
          <span className={star <= active ? 'text-amber-400' : 'text-slate-200 dark:text-zinc-700'}>
            ★
          </span>
        </button>
      ))}
    </div>
  )
}

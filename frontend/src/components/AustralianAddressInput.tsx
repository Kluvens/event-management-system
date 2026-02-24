import { useState, useEffect, useRef } from 'react'
import { MapPin, Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/input'

interface Suggestion {
  placeId: number
  displayName: string
}

interface Props {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  id?: string
}

async function searchAustralianAddresses(query: string): Promise<Suggestion[]> {
  const url =
    `https://nominatim.openstreetmap.org/search` +
    `?format=json&countrycodes=au&addressdetails=1&limit=6` +
    `&q=${encodeURIComponent(query)}`

  const res = await fetch(url, {
    headers: { 'User-Agent': 'EventManagementApp/1.0' },
  })

  if (!res.ok) return []

  const data: Array<{ place_id: number; display_name: string }> = await res.json()

  return data.map((item) => ({
    placeId: item.place_id,
    // Trim ", Australia" suffix — it's redundant in an AU-only search
    displayName: item.display_name.replace(/,\s*Australia$/, ''),
  }))
}

export function AustralianAddressInput({ value, onChange, placeholder, id }: Props) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const q = e.target.value
    onChange(q)

    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (q.trim().length < 3) {
      setSuggestions([])
      setOpen(false)
      return
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const results = await searchAustralianAddresses(q)
        setSuggestions(results)
        setOpen(results.length > 0)
      } finally {
        setLoading(false)
      }
    }, 350)
  }

  function handleSelect(suggestion: Suggestion) {
    onChange(suggestion.displayName)
    setSuggestions([])
    setOpen(false)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') setOpen(false)
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          id={id}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder ?? 'Start typing an Australian address…'}
          autoComplete="off"
          className="pl-9 pr-8"
        />
        {loading && (
          <Loader2 className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-slate-400" />
        )}
      </div>

      {open && suggestions.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full overflow-hidden rounded-md border border-slate-200 bg-white shadow-lg">
          {suggestions.map((s) => (
            <li key={s.placeId}>
              <button
                type="button"
                className="flex w-full items-start gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50"
                onMouseDown={(e) => {
                  // Use mousedown so blur fires after selection
                  e.preventDefault()
                  handleSelect(s)
                }}
              >
                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                <span className="line-clamp-2 text-slate-700">{s.displayName}</span>
              </button>
            </li>
          ))}
          <li className="border-t border-slate-100 px-3 py-1.5">
            <span className="text-xs text-slate-400">© OpenStreetMap contributors</span>
          </li>
        </ul>
      )}
    </div>
  )
}

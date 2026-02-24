import { useState, useEffect } from 'react'
import { Search, SlidersHorizontal, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { useCategories, useTags } from '@/api/tagsCategories'
import { useDebounce } from '@/hooks/useDebounce'
import type { EventFilters } from '@/types'

interface Props {
  filters: EventFilters
  onChange: (filters: EventFilters) => void
}

export function EventFilters({ filters, onChange }: Props) {
  const { data: categories = [] } = useCategories()
  const { data: tags = [] } = useTags()
  const [search, setSearch] = useState(filters.search ?? '')
  const debouncedSearch = useDebounce(search, 400)

  useEffect(() => {
    onChange({ ...filters, search: debouncedSearch || undefined })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch])

  const selectedTagIds = filters.tagIds ?? []
  const hasActiveFilters =
    !!filters.categoryId ||
    selectedTagIds.length > 0 ||
    !!filters.from ||
    !!filters.to

  function toggleTag(id: number) {
    const next = selectedTagIds.includes(id)
      ? selectedTagIds.filter((t) => t !== id)
      : [...selectedTagIds, id]
    onChange({ ...filters, tagIds: next.length ? next : undefined })
  }

  function clearAll() {
    setSearch('')
    onChange({})
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Search */}
      <div className="relative min-w-[220px] flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          placeholder="Search events…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Category */}
      <Select
        value={filters.categoryId?.toString() ?? 'all'}
        onValueChange={(v) =>
          onChange({
            ...filters,
            categoryId: v === 'all' ? undefined : parseInt(v),
          })
        }
      >
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="Category" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Categories</SelectItem>
          {categories.map((c) => (
            <SelectItem key={c.id} value={c.id.toString()}>
              {c.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Tags */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1.5">
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Tags
            {selectedTagIds.length > 0 && (
              <span className="ml-1 rounded-full bg-indigo-100 px-1.5 py-0.5 text-xs font-medium text-indigo-700">
                {selectedTagIds.length}
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-52 p-3">
          <p className="mb-2 text-xs font-semibold uppercase text-slate-500">
            Tags
          </p>
          <div className="max-h-52 space-y-2 overflow-y-auto">
            {tags.map((tag) => (
              <div key={tag.id} className="flex items-center gap-2">
                <Checkbox
                  id={`tag-${tag.id}`}
                  checked={selectedTagIds.includes(tag.id)}
                  onCheckedChange={() => toggleTag(tag.id)}
                />
                <Label
                  htmlFor={`tag-${tag.id}`}
                  className="cursor-pointer text-sm font-normal"
                >
                  {tag.name}
                </Label>
              </div>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      {/* Sort */}
      <Select
        value={filters.sortBy ?? 'date'}
        onValueChange={(v) =>
          onChange({ ...filters, sortBy: v as EventFilters['sortBy'] })
        }
      >
        <SelectTrigger className="w-[140px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="date">Sort: Date</SelectItem>
          <SelectItem value="popularity">Sort: Popular</SelectItem>
          <SelectItem value="price">Sort: Price</SelectItem>
        </SelectContent>
      </Select>

      {/* Date from */}
      <Input
        type="date"
        value={filters.from ? filters.from.substring(0, 10) : ''}
        onChange={(e) =>
          onChange({
            ...filters,
            from: e.target.value
              ? e.target.value + 'T00:00:00Z'
              : undefined,
          })
        }
        className="w-[140px]"
      />

      {/* Date to */}
      <Input
        type="date"
        value={filters.to ? filters.to.substring(0, 10) : ''}
        onChange={(e) =>
          onChange({
            ...filters,
            to: e.target.value ? e.target.value + 'T23:59:59Z' : undefined,
          })
        }
        className="w-[140px]"
      />

      {/* Clear */}
      {(hasActiveFilters || search) && (
        <Button variant="ghost" size="sm" onClick={clearAll} className="gap-1">
          <X className="h-3.5 w-3.5" />
          Clear
        </Button>
      )}
    </div>
  )
}

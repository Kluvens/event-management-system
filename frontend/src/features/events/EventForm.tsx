import { useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { useCategories, useTags } from '@/api/tagsCategories'
import type { CreateEventRequest, Event } from '@/types'

const schema = z
  .object({
    title: z.string().min(3, 'Title must be at least 3 characters'),
    description: z.string().min(10, 'Description must be at least 10 characters'),
    location: z.string().min(2, 'Location is required'),
    startDate: z.string().min(1, 'Start date is required'),
    endDate: z.string().min(1, 'End date is required'),
    capacity: z.coerce.number().int().min(1, 'Capacity must be at least 1'),
    price: z.coerce.number().min(0, 'Price must be 0 or more'),
    isPublic: z.boolean(),
    categoryId: z.coerce.number().min(1, 'Select a category'),
    tagIds: z.array(z.number()),
  })
  .refine((d) => new Date(d.endDate) > new Date(d.startDate), {
    message: 'End date must be after start date',
    path: ['endDate'],
  })

type FormData = z.infer<typeof schema>

function toInputDateTime(iso: string) {
  return iso.substring(0, 16)
}

interface Props {
  defaultValues?: Event
  onSubmit: (data: CreateEventRequest) => void
  isLoading?: boolean
  submitLabel?: string
}

export function EventForm({
  defaultValues,
  onSubmit,
  isLoading,
  submitLabel = 'Save',
}: Props) {
  const { data: categories = [] } = useCategories()
  const { data: tags = [] } = useTags()

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: defaultValues?.title ?? '',
      description: defaultValues?.description ?? '',
      location: defaultValues?.location ?? '',
      startDate: defaultValues ? toInputDateTime(defaultValues.startDate) : '',
      endDate: defaultValues ? toInputDateTime(defaultValues.endDate) : '',
      capacity: defaultValues?.capacity ?? 100,
      price: defaultValues?.price ?? 0,
      isPublic: defaultValues?.isPublic ?? true,
      categoryId: defaultValues?.categoryId ?? 0,
      tagIds: [],
    },
  })

  // Populate tagIds once tags are loaded (edit mode)
  useEffect(() => {
    if (defaultValues && tags.length > 0) {
      const ids = tags
        .filter((t) => defaultValues.tags.includes(t.name))
        .map((t) => t.id)
      setValue('tagIds', ids)
    }
  }, [tags, defaultValues, setValue])

  const watchedTagIds = watch('tagIds') ?? []

  function handleTagToggle(id: number) {
    setValue(
      'tagIds',
      watchedTagIds.includes(id)
        ? watchedTagIds.filter((t) => t !== id)
        : [...watchedTagIds, id]
    )
  }

  function submit(data: FormData) {
    onSubmit({
      ...data,
      startDate: new Date(data.startDate).toISOString(),
      endDate: new Date(data.endDate).toISOString(),
    })
  }

  const err = 'text-xs text-red-500 mt-1'
  const lbl = 'text-sm font-medium text-slate-700'

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-6">
      {/* Title */}
      <div className="space-y-1.5">
        <Label htmlFor="title" className={lbl}>
          Event Title
        </Label>
        <Input
          id="title"
          placeholder="Tech Conference 2026"
          {...register('title')}
        />
        {errors.title && <p className={err}>{errors.title.message}</p>}
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <Label htmlFor="description" className={lbl}>
          Description
        </Label>
        <Textarea
          id="description"
          placeholder="Describe your event…"
          rows={4}
          {...register('description')}
        />
        {errors.description && (
          <p className={err}>{errors.description.message}</p>
        )}
      </div>

      {/* Location */}
      <div className="space-y-1.5">
        <Label htmlFor="location" className={lbl}>
          Location
        </Label>
        <Input
          id="location"
          placeholder="Sydney Convention Centre"
          {...register('location')}
        />
        {errors.location && <p className={err}>{errors.location.message}</p>}
      </div>

      {/* Dates */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="startDate" className={lbl}>
            Start Date &amp; Time
          </Label>
          <Input
            id="startDate"
            type="datetime-local"
            {...register('startDate')}
          />
          {errors.startDate && (
            <p className={err}>{errors.startDate.message}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="endDate" className={lbl}>
            End Date &amp; Time
          </Label>
          <Input
            id="endDate"
            type="datetime-local"
            {...register('endDate')}
          />
          {errors.endDate && <p className={err}>{errors.endDate.message}</p>}
        </div>
      </div>

      {/* Capacity & Price */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="capacity" className={lbl}>
            Capacity
          </Label>
          <Input
            id="capacity"
            type="number"
            min={1}
            {...register('capacity')}
          />
          {errors.capacity && <p className={err}>{errors.capacity.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="price" className={lbl}>
            Price (AUD, 0 = Free)
          </Label>
          <Input
            id="price"
            type="number"
            min={0}
            step={0.01}
            {...register('price')}
          />
          {errors.price && <p className={err}>{errors.price.message}</p>}
        </div>
      </div>

      {/* Category */}
      <div className="space-y-1.5">
        <Label className={lbl}>Category</Label>
        <Controller
          control={control}
          name="categoryId"
          render={({ field }) => (
            <Select
              value={field.value?.toString()}
              onValueChange={(v) => field.onChange(parseInt(v))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id.toString()}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {errors.categoryId && (
          <p className={err}>{errors.categoryId.message}</p>
        )}
      </div>

      {/* Tags */}
      <div className="space-y-2">
        <Label className={lbl}>Tags</Label>
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <label
              key={tag.id}
              className="flex cursor-pointer items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1 text-sm transition-colors hover:border-indigo-300 has-[:checked]:border-indigo-400 has-[:checked]:bg-indigo-50 has-[:checked]:text-indigo-700"
            >
              <Checkbox
                checked={watchedTagIds.includes(tag.id)}
                onCheckedChange={() => handleTagToggle(tag.id)}
                className="h-3.5 w-3.5"
              />
              {tag.name}
            </label>
          ))}
        </div>
      </div>

      {/* Visibility */}
      <div className="flex items-center justify-between rounded-lg border border-slate-200 p-4">
        <div>
          <p className="text-sm font-medium text-slate-700">Public Event</p>
          <p className="text-xs text-slate-500">
            Visible to everyone on the platform
          </p>
        </div>
        <Controller
          control={control}
          name="isPublic"
          render={({ field }) => (
            <Switch
              checked={field.value}
              onCheckedChange={field.onChange}
            />
          )}
        />
      </div>

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? 'Saving…' : submitLabel}
      </Button>
    </form>
  )
}
